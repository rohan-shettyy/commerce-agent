import React, { useState, useEffect } from 'react';
import type { KeyboardEvent } from 'react';
import { VoiceButton } from '../voice/VoiceButton';
import { ImageUpload } from '../image/ImageUpload';

interface InputBarProps {
  onSend: (text: string) => void;
  onVoiceSend: (text: string) => void;
  disabled: boolean;
  ttsEnabled: boolean;
  onToggleTts: () => void;
  onImageSelect: (file: File) => void;
  isImageUploading: boolean;
  imagePreviewUrl: string | null;
  onClearImage: () => void;
}

export const InputBar: React.FC<InputBarProps> = ({ 
  onSend, 
  onVoiceSend,
  disabled, 
  onImageSelect,
  isImageUploading,
  imagePreviewUrl,
  onClearImage
}) => {
  const [text, setText] = useState('');
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleSend = () => {
    if (text.trim() && !disabled) {
      onSend(text);
      setText('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleVoiceTranscript = (transcript: string) => {
    setNotification(`🎙 Heard: ${transcript.substring(0, 40)}${transcript.length > 40 ? '...' : ''}`);
    onVoiceSend(transcript);
  };

  return (
    <div className="flex flex-col w-full bg-white border-t border-gray-200">
      {/* Inline Notification */}
      {notification && (
        <div className="px-4 py-1.5 bg-[#01696f]/5 text-[#01696f] text-xs font-medium animate-pulse">
          {notification}
        </div>
      )}

      <div className="flex items-end gap-2 p-3">
        <VoiceButton onTranscript={handleVoiceTranscript} />

        <ImageUpload
          onFileSelect={onImageSelect}
          isUploading={isImageUploading}
          previewUrl={imagePreviewUrl}
          onClear={onClearImage}
          disabled={disabled}
        />

        <div className="flex-1 min-w-0 bg-gray-50 rounded-xl border border-gray-200 focus-within:border-[#01696f] focus-within:ring-1 focus-within:ring-[#01696f]/30 transition-all flex items-end">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder="Ask me anything about our products..."
            className="w-full bg-transparent max-h-32 p-3 outline-none resize-none disabled:opacity-50 text-gray-800 text-sm"
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={disabled || !text.trim()}
            className="shrink-0 p-2 m-1 text-white bg-[#01696f] hover:bg-[#014d52] disabled:opacity-50 disabled:bg-gray-400 rounded-lg transition-colors active:scale-95"
            aria-label="Send Message"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
