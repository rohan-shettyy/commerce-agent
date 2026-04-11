import React from 'react';
import { useVoice } from '../../hooks/useVoice';

interface VoiceButtonProps {
  onTranscript: (text: string) => void;
}

export const VoiceButton: React.FC<VoiceButtonProps> = ({ onTranscript }) => {
  const { 
    isRecording, 
    isTranscribing, 
    error, 
    toggleRecording,
    clearError
  } = useVoice((text) => {
    onTranscript(text);
    clearError();
  });

  return (
    <div className="relative group">
      {/* Visual Error Tooltip */}
      {error && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[10px] py-1 px-2 rounded shadow-lg whitespace-nowrap z-50">
          {error}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-red-600" />
        </div>
      )}

      <button
        onClick={toggleRecording}
        disabled={isTranscribing}
        aria-label={isRecording ? "Stop recording" : isTranscribing ? "Transcribing..." : "Start voice input"}
        aria-pressed={isRecording}
        className={`relative shrink-0 p-2 rounded-full transition-all duration-300 min-h-[44px] min-w-[44px] flex items-center justify-center ${
          isRecording 
            ? 'bg-red-500 text-white' 
            : isTranscribing 
              ? 'bg-gray-100 text-gray-400' 
              : error 
                ? 'bg-red-50 text-red-400 border border-red-200' 
                : 'text-gray-400 hover:text-gray-500 hover:bg-gray-100'
        }`}
      >
        {/* Pulse effect when recording */}
        {isRecording && (
          <span className="absolute inset-0 rounded-full bg-red-500 animate-[pulse-ring_1.5s_infinite] opacity-50" />
        )}

        {isTranscribing ? (
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : isRecording ? (
          <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-6 h-6 z-10">
            <path fillRule="evenodd" d="M4.5 7.5a3 3 0 013-3h9a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9z" clipRule="evenodd" />
          </svg>
        ) : (
          <div className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 z-10">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
            {error && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full border-2 border-white" />
            )}
          </div>
        )}
      </button>

      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-\\[pulse-ring_1\\.5s_infinite\\] {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
};
