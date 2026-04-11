"""
Voice endpoints for speech-to-text (STT) and text-to-speech (TTS).

This module provides routes for transcribing audio using Gemini's native
multimodal understanding and generating audio from text using Gemini's
native audio generation.
"""

import asyncio
import io
import re
import time
import traceback
import wave
from typing import Dict, Any, Union

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from google import genai
from google.genai import types
from langdetect import detect
from pydantic import BaseModel

from backend.config import settings
from backend.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter()

# ---------------------------------------------------------------------------
# Constants & Models
# ---------------------------------------------------------------------------

# Module-level singleton client
client = genai.Client(api_key=settings.GEMINI_API_KEY)

# List of common hallucinated phrases produced by models when listening to static/silence
STT_GARBAGE_PHRASES = {
    "you", "thank you", "thanks for watching", "um", "uh", "subtitles by", "amara.org",
    "i'm", "it's", "the", "a", "of", "and", "to", "in", "is", "that", "it",
    "please subscribe", "like and subscribe", "youtube", "transcribed by", "i’ll", "i’ll",
    "okay", "bye", "hello", "hi", "goodbye", "good night", "good morning", "thanks"
}

# Maximum characters to synthesize for TTS to ensure low latency
MAX_TTS_CHARS = 250

class TTSRequest(BaseModel):
    """Request body for text-to-speech synthesis."""
    text: str


# ---------------------------------------------------------------------------
# Helper Functions
# ---------------------------------------------------------------------------

def _strip_markdown(text: str) -> str:
    """Remove common markdown formatting so the voice reads clean prose.

    Args:
        text: The source markdown text.

    Returns:
        Cleaned text string.
    """
    # Remove bold / italic / strikethrough markers
    cleaned = re.sub(r"(\*{1,3}|_{1,3}|~~)", "", text)
    # Remove markdown links, keep label
    cleaned = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", cleaned)
    # Remove heading hashes
    cleaned = re.sub(r"^#{1,6}\s+", "", cleaned, flags=re.MULTILINE)
    # Remove blockquote markers
    cleaned = re.sub(r"^>\s?", "", cleaned, flags=re.MULTILINE)
    # Remove inline code backticks
    cleaned = re.sub(r"`", "", cleaned)
    return cleaned.strip()


def _pcm_to_wav(pcm_data: bytes, channels: int = 1,
                rate: int = 24000, sample_width: int = 2) -> bytes:
    """Wrap raw PCM bytes in a WAV container.

    Args:
        pcm_data: Raw audio data in PCM format.
        channels: Number of audio channels (default 1).
        rate: Sample rate in Hz (default 24000).
        sample_width: Bytes per sample (default 2).

    Returns:
        WAV file bytes.
    """
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(channels)
        wf.setsampwidth(sample_width)
        wf.setframerate(rate)
        wf.writeframes(pcm_data)
    return buf.getvalue()


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post(
    "/transcribe",
    summary="Transcribe audio using Gemini native audio understanding",
    description="""Upload an audio file and receive a text transcription.
    Uses Gemini's multimodal capabilities for inline audio transcription.
    Supported formats: WebM, WAV, MP3, OGG, M4A. Max size: 20MB.
    """,
    response_description="Transcript text, detected language, and processing time",
    response_model=None,
    tags=["Voice"]
)
async def transcribe_voice(audio: UploadFile = File(...)) -> Union[Dict[str, Any], JSONResponse]:
    """Transcribes audio using Gemini's native audio understanding.

    Args:
        audio: The uploaded audio file.

    Returns:
        Dict containing transcript, detected language, and duration, or JSONResponse error.

    Raises:
        HTTPException: If file type is unsupported or file is too large.
    """
    # 1. Validation
    if not audio.content_type.startswith("audio/"):
        raise HTTPException(status_code=415, detail=f"Unsupported file type: {audio.content_type}")

    # Set 20MB limit
    MAX_SIZE = 20 * 1024 * 1024
    audio_bytes = await audio.read()
    if len(audio_bytes) > MAX_SIZE:
        raise HTTPException(status_code=413, detail="Audio file too large (max 20MB)")

    start_time = time.monotonic()

    try:
        # 2. Transcription via Gemini
        config = types.GenerateContentConfig(
            system_instruction=(
                "You are ShopBot's ears. Your specific task is to transcribe spoken user queries into English text. "
                "CRITICAL: If the audio consists ONLY of silence, background noise, static, breathing, or non-speech "
                "sounds, you MUST return exactly: [[NO_SPEECH]]. "
                "Do not try to guess or autocomplete what might have been said. If you are unsure, default to [[NO_SPEECH]]."
            )
        )
        
        prompt = "Convert this spoken shopping query into clean English text."
        
        response = await asyncio.to_thread(
            client.models.generate_content,
            model=settings.GEMINI_MODEL,
            contents=[
                types.Part.from_bytes(data=audio_bytes, mime_type=audio.content_type),
                prompt
            ],
            config=config
        )

        transcript = response.text.strip().lower() if response.text else ""

        # 3. Robust "No Speech" Detection
        is_garbage = transcript in STT_GARBAGE_PHRASES or len(transcript) < 2
        
        if "[[no_speech]]" in transcript or not transcript or is_garbage:
            logger.info(f"Filtered out low-intent or silent transcript: '{transcript}'")
            return JSONResponse(
                status_code=422,
                content={"detail": "NO_SPEECH_DETECTED"}
            )

        # 4. Language detection
        try:
            language = detect(transcript)
        except Exception:
            language = "unknown"

        duration_ms = (time.monotonic() - start_time) * 1000

        return {
            "transcript": transcript,
            "language": language,
            "duration_ms": duration_ms
        }

    except Exception as e:
        error_msg = str(e).lower()
        if "429" in error_msg or "resource_exhausted" in error_msg:
            return JSONResponse(
                status_code=429,
                content={"detail": "Rate limit reached. Please wait and try again."}
            )
        
        logger.error(f"STT Error: {traceback.format_exc()}")
        return JSONResponse(
            status_code=500,
            content={"detail": "An error occurred during transcription. Please try again."}
        )


async def generate_voice_bytes(text: str) -> bytes:
    """Core synthesis logic to convert text to WAV audio bytes.

    Args:
        text: The plain text to synthesize.

    Returns:
        WAV audio bytes.
    """
    if not text or not text.strip():
        raise ValueError("Text cannot be empty for synthesis")

    plain_text = _strip_markdown(text)[:MAX_TTS_CHARS]

    try:
        config = types.GenerateContentConfig(
            response_modalities=["audio"],
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(
                        voice_name="Kore",
                    )
                )
            ),
            safety_settings=[
                types.SafetySetting(category=cat, threshold="BLOCK_NONE")
                for cat in [
                    "HARM_CATEGORY_HARASSMENT",
                    "HARM_CATEGORY_HATE_SPEECH",
                    "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    "HARM_CATEGORY_DANGEROUS_CONTENT"
                ]
            ],
        )

        response = await asyncio.to_thread(
            client.models.generate_content,
            model=settings.GEMINI_TTS_MODEL,
            contents=[types.Part.from_text(text=plain_text)],
            config=config,
        )

        if not response.candidates:
            raise ValueError(f"No candidates returned from Gemini TTS. Response: {response}")

        candidate = response.candidates[0]
        audio_chunks = [
            part.inline_data.data for part in candidate.content.parts
            if part.inline_data and part.inline_data.data
        ]

        if not audio_chunks:
            # Log the text part if it returned text instead of audio for debugging
            text_parts = [p.text for p in candidate.content.parts if p.text]
            if text_parts:
                logger.error(f"Model returned text instead of audio: {text_parts[0]}")
            raise ValueError("Generated response contained no audio data")

        audio_data = b"".join(audio_chunks)
        return _pcm_to_wav(audio_data)

    except Exception as e:
        logger.error(f"Speech synthesis core error: {e}")
        raise


@router.post(
    "/tts",
    summary="Synthesize speech from text using Gemini TTS",
    description=(
        "Send a text string and receive WAV audio bytes. "
        "Uses Gemini's multimodal generate_content API with "
        "response_modalities=['audio'] for natural-sounding speech."
    ),
    response_description="WAV audio stream",
    tags=["Voice"],
)
async def text_to_speech(request: TTSRequest) -> StreamingResponse:
    """Generate speech audio from the supplied text via Gemini TTS.

    Args:
        request: The TTS request containing the text.

    Returns:
        A StreamingResponse containing WAV audio bytes.

    Raises:
        HTTPException: If text is empty or generation fails.
    """
    try:
        wav_bytes = await generate_voice_bytes(request.text)
        return StreamingResponse(
            io.BytesIO(wav_bytes),
            media_type="audio/wav",
            headers={"Content-Disposition": "inline; filename=tts.wav"},
        )

    except ValueError as ve:
        raise HTTPException(status_code=422, detail=str(ve))
    except Exception as e:
        error_msg = str(e).lower()
        if "429" in error_msg or "resource_exhausted" in error_msg:
            raise HTTPException(status_code=429, detail="Rate limit reached. Please wait and try again.")
        raise HTTPException(status_code=500, detail="Failed to generate speech. Please try again.")
