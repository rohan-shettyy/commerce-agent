import React, { useState, useEffect } from 'react';
import type { Product } from '../../types';

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({ product, onClose }) => {
  const [addedToCart, setAddedToCart] = useState(false);

  useEffect(() => {
    if (addedToCart) {
      const timer = setTimeout(() => setAddedToCart(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [addedToCart]);

  // Close on escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!product) return null;

  const stars = '★'.repeat(Math.round(product.rating)) + '☆'.repeat(5 - Math.round(product.rating));

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Product details: ${product.name}`}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-[fadeInScale_0.2s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header image */}
        <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 p-8 flex items-center justify-center rounded-t-2xl">
          <img 
            src={product.image_url} 
            alt={product.name} 
            className="w-48 h-48 object-cover rounded-xl shadow-md"
            width={192}
            height={192}
          />
          <button 
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-sm transition-colors"
            aria-label="Close modal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <p className="text-xs font-medium text-[#01696f] uppercase tracking-wider">{product.brand}</p>
              <h2 className="text-xl font-bold text-gray-900 mt-0.5">{product.name}</h2>
            </div>
            <span className="text-2xl font-bold text-gray-900 whitespace-nowrap">${product.price.toFixed(2)}</span>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <span className="text-yellow-500 text-sm">{stars}</span>
            <span className="text-xs text-gray-500">({product.rating.toFixed(1)})</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${product.in_stock ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
              {product.in_stock ? 'In Stock' : 'Out of Stock'}
            </span>
          </div>

          <p className="text-gray-600 text-sm leading-relaxed mb-4">{product.description}</p>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mb-6">
            {(product.tags || []).map(tag => (
              <span key={tag} className="inline-block bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full text-xs font-medium">
                {tag}
              </span>
            ))}
          </div>

          {/* Attributes */}
          {product.attributes && (
            <div className="flex gap-4 mb-6 text-xs text-gray-500">
              {product.attributes?.color && <span>Color: <strong className="text-gray-700">{product.attributes.color}</strong></span>}
              {product.attributes?.size && <span>Size: <strong className="text-gray-700">{product.attributes.size}</strong></span>}
              {product.attributes?.material && <span>Material: <strong className="text-gray-700">{product.attributes.material}</strong></span>}
            </div>
          )}

          {/* CTA */}
          <button
            onClick={() => setAddedToCart(true)}
            disabled={addedToCart}
            className={`w-full py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${
              addedToCart 
                ? 'bg-green-500 text-white scale-[1.02]' 
                : 'bg-[#01696f] hover:bg-[#014d52] text-white hover:shadow-lg active:scale-[0.98]'
            }`}
          >
            {addedToCart ? '✓ Added to Cart' : 'Add to Cart'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};
