import React from 'react';
import ReactMarkdown from 'react-markdown';
import type { Message, Product } from '../../types';
import { ProductCard } from '../products/ProductCard';

interface MessageBubbleProps {
  message: Message;
  onProductClick?: (product: Product) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onProductClick }) => {
  const isUser = message.role === 'user';
  const isError = message.role === 'error';
  const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
      <div className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${
        isUser 
          ? 'bg-[#01696f] text-white rounded-tr-none' 
          : isError
            ? 'bg-red-50 text-red-700 border border-red-100 rounded-tl-none'
            : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
      }`}>
        <div className="flex flex-col gap-2">
          {/* User Image Attachment */}
          {message.image && (
            <div className="mb-2 max-w-full overflow-hidden rounded-lg border border-white/20">
              <img src={message.image} alt="User attachment" className="max-h-64 object-cover w-full" />
            </div>
          )}

          {/* Message Content */}
          {message.isVoiceLoading ? (
            <div className="flex items-center gap-2 py-1 italic text-gray-400 text-sm">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-[#01696f]/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 bg-[#01696f]/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 bg-[#01696f]/40 rounded-full animate-bounce" />
              </span>
              <span className="ml-1">ShopBot is preparing to speak...</span>
            </div>
          ) : (
            <div className={`text-sm leading-relaxed whitespace-pre-wrap ${isUser ? 'font-medium' : ''}`}>
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
          
          <div className={`text-[10px] mt-1.5 opacity-40 self-end font-medium ${isUser ? 'text-white' : 'text-gray-500'}`}>
            {timeString}
          </div>
        </div>

        {message.products && message.products.length > 0 && (
          <div className="mt-4 flex overflow-x-auto gap-4 pb-2 snap-x">
            {message.products.map(product => (
              <div key={product.id} className="snap-start shrink-0 w-[220px]">
                <ProductCard product={product} onViewDetails={onProductClick} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
