import { useState, useCallback, type DragEvent } from 'react';
import { ProductCard } from './components/products/ProductCard';
import { ProductModal } from './components/products/ProductModal';
import { ChatWindow } from './components/chat/ChatWindow';
import { InputBar } from './components/chat/InputBar';
import { useChat } from './hooks/useChat';
import { useProducts } from './hooks/useProducts';
import { useImageSearch } from './hooks/useImageSearch';
import type { Product } from './types';

function App() {
  const [dragActive, setDragActive] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [stagedImage, setStagedImage] = useState<{ base64: string; mime: string; url: string } | null>(null);

  const { products, isLoading: isCatalogLoading, error: catalogError, refetch: refetchProducts } = useProducts();

  const {
    messages,
    isLoading: isChatLoading,
    isThrottled,
    sendMessage,
    ttsEnabled,
    setTtsEnabled,
    isSpeaking,
    stopSpeaking,
    savedSessions,
    startNewChat,
    loadSession,
  } = useChat();

  const {
    isUploading: isImageUploading,
    previewUrl: imagePreviewUrl,
    clearResults: clearImageResults
  } = useImageSearch();

  const handleImageSelect = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = (e.target?.result as string).split(',')[1];
      setStagedImage({
        base64,
        mime: file.type,
        url: URL.createObjectURL(file)
      });
    };
    reader.readAsDataURL(file);
  }, []);

  const handleSend = async (text: string) => {
    const imagePayload = stagedImage ? { base64: stagedImage.base64, mime: stagedImage.mime } : undefined;
    if (stagedImage) {
      URL.revokeObjectURL(stagedImage.url);
      setStagedImage(null);
    }
    await sendMessage(text, imagePayload, false);
  };

  const handleVoiceSend = async (text: string) => {
    await sendMessage(text, undefined, true);
  };

  const handleDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        handleImageSelect(file);
      }
    }
  };

  return (
    <div className="h-screen w-full flex overflow-hidden bg-[#faf8f5]">
      {/* SIDEBAR */}
      <aside className={`fixed md:relative z-40 h-full w-64 bg-gradient-to-b from-[#01696f] to-[#014d52] text-white flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        {/* Logo */}
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="white" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight">ShopBot</h1>
              <p className="text-[10px] text-white/60 font-medium">AI Commerce Assistant</p>
            </div>
          </div>
        </div>

        {/* New Chat Button */}
        <div className="p-4">
          <button
            id="new-chat-button"
            onClick={startNewChat}
            className="w-full py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-medium transition-colors flex items-center justify-center gap-2 border border-white/10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Chat
          </button>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto px-4">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-3 font-medium">Recent</p>

          {/* Active session indicator */}
          {messages.length > 0 && (
            <div className="bg-white/20 rounded-lg p-3 mb-2 border border-white/20">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                <p className="text-xs text-white truncate font-medium">
                  {messages.find(m => m.role === 'user')?.content || 'Current session'}
                </p>
              </div>
            </div>
          )}

          {/* Saved sessions */}
          {savedSessions.map(session => (
            <button
              key={session.id}
              id={`session-${session.id}`}
              onClick={() => loadSession(session.id)}
              className="w-full text-left bg-white/5 hover:bg-white/15 rounded-lg p-3 mb-2 transition-colors group"
            >
              <p className="text-xs text-white/70 truncate group-hover:text-white/90">
                {session.title}
              </p>
              <p className="text-[10px] text-white/30 mt-1">
                {session.messages.length} messages
              </p>
            </button>
          ))}
        </div>

        {/* Model badge */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-2 text-xs text-white/50">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            gemini-3.1-flash
          </div>
        </div>
      </aside>

      {/* Sidebar overlay on mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* TOP HEADER (mobile) */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shrink-0">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle sidebar" className="p-1.5 rounded-lg hover:bg-gray-100">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          <span className="font-bold text-gray-800 text-sm">ShopBot AI</span>
          <div className="w-8" /> {/* spacer */}
        </div>

        {/* LEFT PANEL - Product Grid */}
        <div className="w-full md:w-1/2 lg:w-3/5 border-r border-gray-200 flex flex-col bg-white overflow-hidden">
          <div className="p-4 border-b border-gray-100 shrink-0">
            <h2 className="text-lg font-bold text-gray-800">Product Catalog</h2>
            <p className="text-xs text-gray-500 mt-0.5">{products.length} items available</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 bg-[#faf8f5]">
            {isCatalogLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 content-start">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="animate-pulse bg-white border border-gray-200 rounded-xl p-4 flex flex-col h-[280px]">
                    <div className="h-24 bg-gray-200 rounded-lg w-24 mx-auto" />
                    <div className="mt-4 h-4 bg-gray-200 rounded w-3/4 mx-auto" />
                    <div className="mt-2 h-4 bg-gray-200 rounded w-1/2 mx-auto" />
                    <div className="mt-auto h-9 bg-gray-200 rounded-lg w-full" />
                  </div>
                ))}
              </div>
            ) : catalogError ? (
              <div className="flex flex-col items-center justify-center h-full">
                <p className="text-red-600 mb-4 font-semibold">{catalogError}</p>
                <button
                  onClick={refetchProducts}
                  className="px-4 py-2 bg-[#01696f] text-white rounded-lg hover:bg-[#014d52] font-medium transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 content-start">
                {products.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onViewDetails={setSelectedProduct}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL - Chat Interface */}
        <div
          className="w-full md:w-1/2 lg:w-2/5 flex flex-col bg-white relative z-20"
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {dragActive && (
            <div className="absolute inset-0 z-50 bg-[#01696f]/10 border-4 border-dashed border-[#01696f] rounded-lg flex items-center justify-center m-2 backdrop-blur-sm">
              <div className="text-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 mx-auto text-[#01696f] mb-2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <p className="text-lg font-bold text-[#01696f]">Drop image to search</p>
              </div>
            </div>
          )}

          {/* Chat header */}
          <div className="p-4 border-b border-gray-100 bg-white shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-green-500 rounded-full inline-block animate-pulse" />
              <h2 className="text-base font-bold text-gray-800">ShopBot AI</h2>
              <span className="text-[10px] bg-[#01696f]/10 text-[#01696f] px-2 py-0.5 rounded-full font-medium">gemini-3.1-flash</span>
            </div>
            <button
              onClick={() => {
                if (ttsEnabled && isSpeaking) {
                  stopSpeaking();
                }
                setTtsEnabled(!ttsEnabled);
              }}
              aria-label={ttsEnabled ? "Mute voice responses" : "Unmute voice responses"}
              className={`p-1.5 rounded-lg transition-colors ${ttsEnabled ? 'text-[#01696f] bg-[#01696f]/10 hover:bg-[#01696f]/20' : 'text-gray-400 hover:bg-gray-100'}`}
            >
              {ttsEnabled ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75l4.5 4.5m0-4.5l-4.5 4.5" />
                </svg>
              )}
            </button>
          </div>

          <ChatWindow
            messages={messages}
            isLoading={isChatLoading}
            onSendPrompt={handleSend}
            onProductClick={setSelectedProduct}
          />

          <div className="mt-auto z-10 sticky bottom-0">
            {isThrottled && (
              <div className="px-4 py-1.5 bg-amber-50 text-amber-700 text-xs font-medium text-center border-t border-amber-100">
                Please wait... rate limiting in effect.
              </div>
            )}
            <InputBar
              onSend={handleSend}
              onVoiceSend={handleVoiceSend}
              disabled={isChatLoading}
              ttsEnabled={ttsEnabled}
              onToggleTts={() => {
                if (ttsEnabled && isSpeaking) {
                  stopSpeaking();
                }
                setTtsEnabled(!ttsEnabled);
              }}
              onImageSelect={handleImageSelect}
              isImageUploading={isImageUploading}
              imagePreviewUrl={stagedImage?.url || imagePreviewUrl}
              onClearImage={() => {
                if (stagedImage) {
                  URL.revokeObjectURL(stagedImage.url);
                  setStagedImage(null);
                }
                clearImageResults();
              }}
            />
          </div>
        </div>
      </div>

      {/* Product Modal */}
      <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
    </div>
  );
}

export default App;
