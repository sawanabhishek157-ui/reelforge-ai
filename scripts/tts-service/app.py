"""ReelForge local TTS microservice.

Run:
  cd scripts/tts-service && uv run uvicorn app:app --port 8100

POST /tts  { engine, text, speaker?, description?, ref_audio?, ref_text? } -> audio/wav
GET  /health -> { ok, device, engines }
"""
from __future__ import annotations

import io
import os
from pathlib import Path

# Load HF_TOKEN from the project-root .env (gitignored) so the gated
# ai4bharat/indic-parler-tts model can be downloaded. Token is never logged.
_env = Path(__file__).resolve().parents[2] / ".env"
if _env.exists() and not os.environ.get("HF_TOKEN"):
    for _line in _env.read_text().splitlines():
        _line = _line.strip()
        if _line.startswith("HF_TOKEN=") and "=" in _line:
            os.environ["HF_TOKEN"] = _line.split("=", 1)[1].strip().strip("\"'")
            break

import soundfile as sf
from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel

import engines

app = FastAPI(title="ReelForge TTS")


class TTSRequest(BaseModel):
    engine: str = "parler"
    text: str
    speaker: str | None = None
    description: str | None = None
    ref_audio: str | None = None
    ref_text: str | None = None
    # svara fields
    emotion: str | None = None        # one of: happy sad anger fear disgust surprise neutral formal chat clear
    language_id: str | None = None    # BCP-47 style for chatterbox ("hi"), or language name for svara ("Hindi")
    # chatterbox fields
    exaggeration: float | None = None  # 0.0-1.0; controls prosody expressiveness (default 0.5)
    # kokoro field
    speed: float | None = None         # kokoro playback rate (1.0 = normal; <1 slower, >1 faster)


@app.get("/health")
def health() -> dict:
    return {"ok": True, "device": engines.DEVICE, "engines": engines.available()}


@app.post("/unload")
def unload() -> dict:
    """Free all resident models (frees MPS memory before loading another engine)."""
    engines.unload()
    return {"ok": True}


@app.post("/tts")
def tts(req: TTSRequest) -> Response:
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="empty text")
    try:
        wav, sr = engines.synthesize(req.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:  # surface engine/runtime errors to the caller
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {e}")
    buf = io.BytesIO()
    sf.write(buf, wav, sr, format="WAV")
    return Response(content=buf.getvalue(), media_type="audio/wav")
