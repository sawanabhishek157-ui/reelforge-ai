# ReelForge local TTS microservice

Free, local Hindi/Hinglish TTS so the reel pipeline doesn't pay per-character.
Exposes `POST /tts` (returns WAV) for four engines. Runs on Apple Silicon (MPS).

## Engines

| engine | model | tone control | notes |
|--------|-------|--------------|-------|
| `parler` | ai4bharat/indic-parler-tts | free-text voice **description** + named speakers | gated — needs `HF_TOKEN` (see below) |
| `kokoro` | hexgrad/Kokoro-82M (`lang_code='h'`) | none (use `speed` + phrase splicing for pacing) | fastest, most human; voices `hf_alpha/hf_beta/hm_omega/hm_psi` |
| `svara` | kenpath/svara-tts-v1 | inline emotion tags `<happy>`/`<sad>`/… | ungated; ~3B |
| `chatterbox` | ResembleAI/chatterbox (multilingual) | `exaggeration` 0–1 + clone from `ref_audio` | ungated |

Only one heavy model fits in the ~20GB MPS budget at a time — call `POST /unload`
between engines (the bake-off driver does this automatically).

## Setup

```bash
cd scripts/tts-service
uv sync                     # provisions Python 3.12 + installs deps from uv.lock
# Parler is gated: create a free HF read token at huggingface.co/settings/tokens,
# accept terms at huggingface.co/ai4bharat/indic-parler-tts, then add to the
# project-root .env:  HF_TOKEN=hf_...   (app.py loads it automatically)
uv run uvicorn app:app --port 8100
```

Known post-install fix: `chatterbox-tts` expects `perth.PerthImplicitWatermarker`,
absent in `perth` 1.0.0 — add a no-op shim if chatterbox import fails.

## API

```
GET  /health  -> { ok, device, engines }
POST /unload  -> frees all resident models (call between engines)
POST /tts     -> audio/wav
  { engine, text, speaker?, description?, ref_audio?, exaggeration?, emotion?, language_id?, speed? }
```

Feed **Devanagari** text (the romanizer is a no-op — `fairseq` is broken on Py3.12;
the pipeline emits Devanagari Hinglish from the script-writer instead).

Driver that generates the comparison page: `node scripts/voice-bakeoff.mjs`.
