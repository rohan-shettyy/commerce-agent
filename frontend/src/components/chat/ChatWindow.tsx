import React, { useEffect, useRef } from 'react';
import type { Message, Product } from '../../types';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';

interface ChatWindowProps {
  messages: Message[];
  isLoading: boolean;
  onSendPrompt?: (text: string) => void;
  onProductClick?: (product: Product) => void;
}

const SUGGESTED_PROMPTS = [
  "What can you help me with?",
  "Help me find an office chair",
  "Fragrances under $100"
];

export const ChatWindow: React.FC<ChatWindowProps> = ({ messages, isLoading, onSendPrompt, onProductClick }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto p-4 pb-0 bg-gradient-to-b from-gray-50/50 to-white/30" role="log" aria-live="polite" id="main-content">
      {messages.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center px-4">
          {/* ShopBot Icon */}
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#01696f] to-[#02888f] flex items-center justify-center mb-5 shadow-lg shadow-[#01696f]/20">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="white" className="w-10 h-10">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          </div>

          <h2 className="text-xl font-bold text-gray-800 mb-1">ShopBot</h2>
          <p className="text-sm text-gray-500 mb-8">Your AI shopping assistant</p>

          {/* Prompt chips */}
          <div className="flex flex-wrap justify-center gap-2.5 max-w-md">
            {SUGGESTED_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => onSendPrompt?.(prompt)}
                className="prompt-chip bg-white border border-[#01696f]/20 text-[#01696f] px-4 py-2 rounded-full text-sm font-medium hover:bg-[#01696f]/5 hover:border-[#01696f]/40 transition-all duration-200 cursor-pointer active:scale-95"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} onProductClick={onProductClick} />
          ))}
          {isLoading && <TypingIndicator />}
          <div ref={bottomRef} className="h-4" />
        </div>
      )}
    </div>
  );
};
