/**
 * useChat hook — manages chat messages, session history, rate limiting, and
 * Gemini-powered TTS.
 *
 * TTS is only triggered for voice-initiated messages. Audio is played through
 * an HTML Audio element so it can be paused instantly when the user mutes.
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import axios from 'axios';
import type { Message, ChatResponse, ChatSession } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/** Minimum milliseconds between requests (15 RPM → ~4s gap with safety margin) */
const MIN_REQUEST_GAP_MS = 4000;

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThrottled, setIsThrottled] = useState(false);
  const [savedSessions, setSavedSessions] = useState<ChatSession[]>([]);
  const lastRequestTime = useRef<number>(0);

  /** Holds the currently playing Audio element for instant mute support */
  const audioRef = useRef<HTMLAudioElement | null>(null);
  /** Holds the object URL so we can revoke it after playback */
  const audioUrlRef = useRef<string | null>(null);

  useEffect(() => {
    setSessionId(crypto.randomUUID());
  }, []);

  /** Immediately stop any playing TTS audio */
  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  /**
   * Call the backend Gemini TTS endpoint and play the returned WAV audio.
   * Only called for voice-initiated messages when TTS is enabled.
   * @param text The text to speak.
   * @param messageId The ID of the message to reveal once audio is ready.
   */
  const speakWithGemini = useCallback(async (text: string, messageId?: string) => {
    if (!ttsEnabled) {
      if (messageId) {
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isVoiceLoading: false } : m));
      }
      return;
    }

    // Stop any currently playing audio first
    stopSpeaking();

    try {
      const response = await axios.post(
        `${API_BASE}/api/voice/tts`,
        { text },
        { responseType: 'blob' }
      );

      const audioBlob = new Blob([response.data], { type: 'audio/wav' });
      const url = URL.createObjectURL(audioBlob);
      audioUrlRef.current = url;

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onplay = () => {
        setIsSpeaking(true);
        // Reveal text as soon as audio starts or is buffered
        if (messageId) {
          setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isVoiceLoading: false } : m));
        }
      };
      audio.onended = () => {
        setIsSpeaking(false);
        if (audioUrlRef.current) {
          URL.revokeObjectURL(audioUrlRef.current);
          audioUrlRef.current = null;
        }
        audioRef.current = null;
      };
      audio.onerror = () => {
        setIsSpeaking(false);
        audioRef.current = null;
      };

      await audio.play();
    } catch (err: unknown) {
      console.error('Gemini TTS error:', err);
      // TTS failure is non-critical — reveal text if needed
      if (messageId) {
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isVoiceLoading: false } : m));
      }
      setIsSpeaking(false);
    }
  }, [ttsEnabled, stopSpeaking]);

  /** Map HTTP errors to user-friendly messages */
  const getErrorMessage = (err: unknown): string => {
    if (!axios.isAxiosError(err)) {
      return 'An unexpected error occurred. Please try again.';
    }

    if (!err.response) {
      return 'Connection lost. Please check your internet connection.';
    }

    const status = err.response.status;
    if (status === 429) {
      return 'Too many requests. Please wait a moment and try again.';
    }
    if (status >= 500) {
      return 'Something went wrong on our end. Please try again.';
    }

    return err.response.data?.detail || 'An error occurred while sending your message.';
  };

  /**
   * Save the current chat to the session history and start a fresh session.
   * Only saves if there is at least one message in the current chat.
   */
  const startNewChat = useCallback(() => {
    // Stop any playing TTS audio
    stopSpeaking();

    // Save current session if it has messages
    if (messages.length > 0) {
      const firstUserMessage = messages.find(m => m.role === 'user');
      const title = firstUserMessage?.content?.substring(0, 80) || 'New conversation';

      const savedSession: ChatSession = {
        id: sessionId,
        title,
        messages: [...messages],
        createdAt: new Date(),
      };

      setSavedSessions(prev => [savedSession, ...prev]);
    }

    // Reset to fresh state
    setMessages([]);
    setSessionId(crypto.randomUUID());
    setError(null);
    setIsLoading(false);
  }, [messages, sessionId, stopSpeaking]);

  /**
   * Load a previously saved session, saving the current one first if needed.
   */
  const loadSession = useCallback((targetSessionId: string) => {
    const target = savedSessions.find(s => s.id === targetSessionId);
    if (!target) return;

    // Stop any playing TTS audio
    stopSpeaking();

    // Save current session if it has messages and isn't already the target
    if (messages.length > 0 && sessionId !== targetSessionId) {
      const firstUserMessage = messages.find(m => m.role === 'user');
      const title = firstUserMessage?.content?.substring(0, 80) || 'New conversation';

      const currentSession: ChatSession = {
        id: sessionId,
        title,
        messages: [...messages],
        createdAt: new Date(),
      };

      // Replace existing entry for current session or add new
      setSavedSessions(prev => {
        const filtered = prev.filter(s => s.id !== sessionId);
        return [currentSession, ...filtered];
      });
    }

    // Remove the target from saved (it's now the active session)
    setSavedSessions(prev => prev.filter(s => s.id !== targetSessionId));

    // Load it
    setMessages([...target.messages]);
    setSessionId(target.id);
    setError(null);
  }, [savedSessions, messages, sessionId, stopSpeaking]);

  /**
   * Send a chat message. When `isVoiceInput` is true, the assistant's
   * response will be spoken aloud using Gemini TTS.
   */
  const sendMessage = useCallback(async (
    text: string,
    image?: { base64: string; mime: string },
    isVoiceInput: boolean = false,
  ) => {
    if (!text.trim() && !image) return;

    // Rate limit guard: enforce minimum gap between requests
    const now = Date.now();
    const elapsed = now - lastRequestTime.current;
    if (elapsed < MIN_REQUEST_GAP_MS) {
      const waitMs = MIN_REQUEST_GAP_MS - elapsed;
      setIsThrottled(true);
      await new Promise(resolve => setTimeout(resolve, waitMs));
      setIsThrottled(false);
    }
    lastRequestTime.current = Date.now();

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      image: image ? `data:${image.mime};base64,${image.base64}` : undefined,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post<ChatResponse>(`${API_BASE}/api/chat`, {
        session_id: sessionId,
        message: text,
        image_base64: image?.base64,
        image_mime: image?.mime
      }, { timeout: 90000 });

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.data.reply,
        products: response.data.products,
        timestamp: new Date(),
        isVoiceLoading: isVoiceInput && ttsEnabled
      };

      setMessages(prev => [...prev, assistantMsg]);

      // Sequentially speak if the message originated from voice input
      if (isVoiceInput) {
        speakWithGemini(response.data.reply, assistantMsg.id);
      }
    } catch (err: unknown) {
      console.error('Chat error:', err);
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);

      const errorMsg: Message = {
        id: crypto.randomUUID(),
        role: 'error',
        content: errorMessage,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, ttsEnabled, speakWithGemini]);

  const addMessage = useCallback((msg: Message) => {
    setMessages(prev => [...prev, msg]);
  }, []);

  return {
    messages,
    isLoading,
    isThrottled,
    error,
    sendMessage,
    ttsEnabled,
    setTtsEnabled,
    isSpeaking,
    stopSpeaking,
    addMessage,
    sessionId,
    savedSessions,
    startNewChat,
    loadSession,
  };
}
