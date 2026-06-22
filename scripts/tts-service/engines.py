"""TTS engine adapters. Each engine lazy-loads on first use so the service
starts even when an engine's heavy deps aren't installed. Every adapter returns
(float32 mono waveform, sample_rate)."""
from __future__ import annotations

import importlib.util
from functools import lru_cache

import numpy as np

from translit import to_devanagari


def _device() -> str:
    import os

    override = os.environ.get("TTS_DEVICE")  # "cpu" | "mps" | "cuda"
    if override:
        return override
    try:
        import torch

        if torch.backends.mps.is_available():
            return "mps"
    except Exception:
        pass
    return "cpu"


DEVICE = _device()


def _installed(mod: str) -> bool:
    return importlib.util.find_spec(mod) is not None


def available() -> dict[str, bool]:
    return {
        "parler": _installed("parler_tts"),
        "kokoro": _installed("kokoro"),
        "indicf5": _installed("transformers") and _installed("indicf5"),
        "svara": _installed("snac") and _installed("transformers"),
        "chatterbox": _installed("chatterbox"),
    }


# --- Parler (ai4bharat/indic-parler-tts, falls back to parler-tts-mini-v1) ---
_PARLER_MODELS = [
    "ai4bharat/indic-parler-tts",   # preferred (gated — needs HF login)
    "parler-tts/parler-tts-mini-v1",  # public fallback
]


@lru_cache(maxsize=1)
def _parler():
    import os

    import torch
    from parler_tts import ParlerTTSForConditionalGeneration
    from transformers import AutoTokenizer

    # Allow env override; otherwise try gated model (if HF token present) then public fallback.
    model_id = os.environ.get("PARLER_MODEL")
    if not model_id:
        hf_token = os.environ.get("HF_TOKEN") or os.environ.get("HUGGING_FACE_HUB_TOKEN")
        if not hf_token:
            # Fall back to a cached `huggingface-cli login` token so the user
            # doesn't have to juggle env vars.
            try:
                from huggingface_hub import get_token

                hf_token = get_token()
            except Exception:
                hf_token = None
        for candidate in _PARLER_MODELS:
            try:
                from huggingface_hub import model_info as hf_model_info
                info = hf_model_info(candidate, token=hf_token)
                # Skip gated models unless we have a token.
                if info.gated and not hf_token:
                    continue
                model_id = candidate
                break
            except Exception:
                continue
    if not model_id:
        model_id = _PARLER_MODELS[-1]  # last resort: always-public fallback

    device = DEVICE
    model = ParlerTTSForConditionalGeneration.from_pretrained(model_id).to(device)
    desc_tok = AutoTokenizer.from_pretrained(model.config.text_encoder._name_or_path)
    prompt_tok = AutoTokenizer.from_pretrained(model_id)
    return model, desc_tok, prompt_tok, torch, device


def synth_parler(text: str, speaker: str | None, description: str | None) -> tuple[np.ndarray, int]:
    model, desc_tok, prompt_tok, torch, device = _parler()
    text = to_devanagari(text)
    desc = description or "A clear, natural voice in a quiet environment."
    if speaker and speaker.lower() not in desc.lower():
        desc = f"{speaker}'s voice. {desc}"
    d = desc_tok(desc, return_tensors="pt").to(device)
    p = prompt_tok(text, return_tensors="pt").to(device)
    with torch.no_grad():
        gen = model.generate(
            input_ids=d.input_ids,
            attention_mask=d.attention_mask,
            prompt_input_ids=p.input_ids,
            prompt_attention_mask=p.attention_mask,
        )
    wav = gen.cpu().to(torch.float32).numpy().squeeze()
    return wav, int(model.config.sampling_rate)


# --- Kokoro (hexgrad/Kokoro-82M, Hindi lang_code 'h') --------------------
@lru_cache(maxsize=1)
def _kokoro():
    from kokoro import KPipeline

    return KPipeline(lang_code="h")


def synth_kokoro(
    text: str, speaker: str | None, description: str | None, speed: float | None = None
) -> tuple[np.ndarray, int]:
    pipe = _kokoro()
    voice = speaker or "hf_alpha"
    rate = float(speed) if speed else 1.0
    chunks = [audio for _, _, audio in pipe(to_devanagari(text), voice=voice, speed=rate)]
    wav = np.concatenate([np.asarray(c, dtype=np.float32) for c in chunks])
    return wav, 24000


# --- IndicF5 (ai4bharat/IndicF5, zero-shot clone from reference) ----------
@lru_cache(maxsize=1)
def _indicf5():
    import torch
    from transformers import AutoModel

    model = AutoModel.from_pretrained("ai4bharat/IndicF5", trust_remote_code=True).to(DEVICE)
    return model, torch


def synth_indicf5(text: str, ref_audio: str | None, ref_text: str | None) -> tuple[np.ndarray, int]:
    if not ref_audio or not ref_text:
        raise ValueError("indicf5 requires ref_audio + ref_text (it clones a reference voice)")
    model, torch = _indicf5()
    wav = model(to_devanagari(text), ref_audio_path=ref_audio, ref_text=ref_text)
    wav = np.asarray(wav, dtype=np.float32).squeeze()
    if wav.max() > 1.0:  # IndicF5 may return int-range floats
        wav = wav / 32768.0
    return wav, 24000


# --- Svara (kenpath/svara-tts-v1, Orpheus-style LLaMA + SNAC codec) ---------
# Prompt format: "Language (Gender): <text> <emotion_tag>"
# Emotion tags (append at end of text): <happy> <sad> <anger> <fear> <disgust>
#   <surprise> <neutral> <formal> <chat> <clear>
# Gender options: "Male" | "Female"
# Language options (used in prompt prefix): "Hindi", "Bengali", "Marathi", etc.
# No reference clip needed — speaker identity is controlled by Language+Gender prefix.

_SVARA_MODEL_ID = "kenpath/svara-tts-v1"
_SVARA_SR = 24_000

# Special token IDs (from the inference space — do not change)
_SVARA_START_TOKEN = 128259
_SVARA_LB_TOKEN = 128009
_SVARA_END_TOKEN = 128260
_SVARA_HEAD_TOKEN = 128257
_SVARA_EOS_TOKEN = 128258
_SVARA_CODE_OFFSET = 128266  # audio token offset


@lru_cache(maxsize=1)
def _svara():
    import torch
    from snac import SNAC
    from transformers import AutoModelForCausalLM, AutoTokenizer

    # MPS is ~20x faster than CPU for this 3B LLaMA model.
    # float16 is required on MPS (bfloat16 not supported on Apple Silicon MPS).
    device = DEVICE
    dtype = torch.float16 if device in ("mps", "cuda") else torch.float32

    snac = SNAC.from_pretrained("hubertsiuzdak/snac_24khz").to(device)
    tokenizer = AutoTokenizer.from_pretrained(_SVARA_MODEL_ID)
    model = AutoModelForCausalLM.from_pretrained(
        _SVARA_MODEL_ID, torch_dtype=dtype
    ).to(device)
    model.eval()
    return model, tokenizer, snac, torch, device


def _svara_build_prompt(
    tokenizer,
    text: str,
    language: str,
    gender: str,
    emotion: str | None,
    device: str,
):
    import torch

    # Normalise emotion tag
    valid_emotions = {"happy", "sad", "anger", "fear", "disgust", "surprise",
                      "neutral", "formal", "chat", "clear"}
    tail = ""
    if emotion and emotion.lower() in valid_emotions:
        tail = f" <{emotion.lower()}>"

    prompt = f"{language} ({gender}): {text.strip()}{tail}"
    input_ids = tokenizer(prompt, return_tensors="pt").input_ids

    start = torch.tensor([[_SVARA_START_TOKEN]], dtype=torch.int64)
    end = torch.tensor([[_SVARA_LB_TOKEN, _SVARA_END_TOKEN]], dtype=torch.int64)
    ids = torch.cat([start, input_ids, end], dim=1).to(device)
    mask = torch.ones_like(ids)
    return ids, mask


def _svara_parse(generated_ids):
    """Extract audio token IDs from the LLaMA output."""
    token_indices = (generated_ids == _SVARA_HEAD_TOKEN).nonzero(as_tuple=True)
    if len(token_indices[1]) > 0:
        cropped = generated_ids[:, token_indices[1][-1] + 1:]
    else:
        cropped = generated_ids
    row = cropped[0]
    row = row[row != _SVARA_EOS_TOKEN]
    row = row[: (row.size(0) // 7) * 7]
    return [int(t.item()) - _SVARA_CODE_OFFSET for t in row]


def _svara_decode(code_list: list[int], snac_model, device: str):
    """Convert SNAC codes back to a waveform."""
    import torch

    l1, l2, l3 = [], [], []
    for i in range(len(code_list) // 7):
        b = 7 * i
        l1.append(code_list[b + 0])
        l2.append(code_list[b + 1] - 4096)
        l3.append(code_list[b + 2] - 2 * 4096)
        l3.append(code_list[b + 3] - 3 * 4096)
        l2.append(code_list[b + 4] - 4 * 4096)
        l3.append(code_list[b + 5] - 5 * 4096)
        l3.append(code_list[b + 6] - 6 * 4096)
    codes = [torch.tensor(x, device=device).unsqueeze(0) for x in [l1, l2, l3]]
    with torch.inference_mode():
        audio = snac_model.decode(codes).detach().squeeze().cpu().numpy()
    return audio.astype(np.float32)


def synth_svara(
    text: str,
    speaker: str | None,
    emotion: str | None,
    language_id: str | None,
) -> tuple[np.ndarray, int]:
    model, tokenizer, snac, torch, device = _svara()

    # Parse gender from speaker ("male"/"female"), default female
    gender = "Male" if speaker and "male" in speaker.lower() else "Female"
    language = language_id or "Hindi"

    ids, mask = _svara_build_prompt(tokenizer, text, language, gender, emotion, device)

    # Rough estimate: ~30 audio tokens/word, 7 SNAC codes per audio token frame
    # For most sentences (5-20 words) 1200 tokens is sufficient; cap at 1400 to
    # avoid runaway generation on CPU which is extremely slow at 2048.
    word_count = max(1, len(text.split()))
    max_tokens = min(1400, max(600, word_count * 35))

    with torch.inference_mode():
        generated = model.generate(
            input_ids=ids,
            attention_mask=mask,
            max_new_tokens=max_tokens,
            do_sample=True,
            temperature=0.7,
            top_p=0.8,
            repetition_penalty=1.1,
            eos_token_id=_SVARA_EOS_TOKEN,
        )

    codes = _svara_parse(generated)
    if not codes:
        raise RuntimeError("svara: no audio tokens generated; try rephrasing or increasing temperature")
    wav = _svara_decode(codes, snac, device)
    return wav, _SVARA_SR


# --- Chatterbox (ResembleAI/chatterbox multilingual, MIT) -------------------
# Uses ChatterboxMultilingualTTS for Hindi (language_id="hi")
# Supports zero-shot voice cloning from ref_audio (absolute path to WAV/MP3)
# Emotion is controlled via exaggeration float (0.0-1.0, default 0.5)
# No emotion tags needed — exaggeration controls prosody expressiveness

@lru_cache(maxsize=1)
def _chatterbox():
    import torch
    from chatterbox.mtl_tts import ChatterboxMultilingualTTS

    # Try MPS first; fall back to CPU if it fails
    device = DEVICE
    try:
        model = ChatterboxMultilingualTTS.from_pretrained(device)
    except Exception:
        device = "cpu"
        model = ChatterboxMultilingualTTS.from_pretrained(device)
    return model, torch, device


def synth_chatterbox(
    text: str,
    ref_audio: str | None,
    exaggeration: float | None,
    language_id: str | None,
) -> tuple[np.ndarray, int]:
    model, torch, device = _chatterbox()

    lang = language_id or "hi"
    exag = float(exaggeration) if exaggeration is not None else 0.5
    exag = max(0.0, min(1.0, exag))  # clamp to valid range

    wav_tensor = model.generate(
        text=text,
        language_id=lang,
        audio_prompt_path=ref_audio,  # None = use default built-in voice
        exaggeration=exag,
    )
    # ChatterboxMultilingualTTS.generate returns a torch tensor on the model device
    wav = wav_tensor.squeeze().cpu().float().numpy()
    from chatterbox.models.s3gen import S3GEN_SR
    return wav, S3GEN_SR


def unload() -> None:
    """Free all loaded models. The Mac's ~20GB MPS budget can't hold parler +
    svara (3B) + chatterbox resident at once, so callers unload between engines
    (e.g. the bake-off) and production keeps only the chosen engine loaded."""
    import gc

    for loader in (_parler, _kokoro, _indicf5, _svara, _chatterbox):
        loader.cache_clear()
    gc.collect()
    try:
        import torch

        if torch.backends.mps.is_available():
            torch.mps.empty_cache()
    except Exception:
        pass


def synthesize(req: dict) -> tuple[np.ndarray, int]:
    engine = req.get("engine", "parler")
    text = req["text"]
    if engine == "parler":
        return synth_parler(text, req.get("speaker"), req.get("description"))
    if engine == "kokoro":
        return synth_kokoro(text, req.get("speaker"), req.get("description"), req.get("speed"))
    if engine == "indicf5":
        return synth_indicf5(text, req.get("ref_audio"), req.get("ref_text"))
    if engine == "svara":
        return synth_svara(
            text,
            req.get("speaker"),
            req.get("emotion"),
            req.get("language_id"),
        )
    if engine == "chatterbox":
        return synth_chatterbox(
            text,
            req.get("ref_audio"),
            req.get("exaggeration"),
            req.get("language_id"),
        )
    raise ValueError(f"unknown engine: {engine}")
