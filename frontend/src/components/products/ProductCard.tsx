import React from 'react';
import type { Product } from '../../types';

interface ProductCardProps {
  product: Product;
  onViewDetails?: (product: Product) => void;
  compact?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onViewDetails, compact }) => {
  const stars = '★'.repeat(Math.round(product.rating)) + '☆'.repeat(5 - Math.round(product.rating));

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && onViewDetails) {
      onViewDetails(product);
    }
  };

  return (
    <div 
      className={`border border-gray-200 rounded-xl flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-200 min-w-[200px] bg-white hover:border-[#01696f]/30 group cursor-pointer ${compact ? 'p-3' : 'p-4'}`}
      tabIndex={0}
      role="article"
      aria-label={`${product.name} by ${product.brand}, $${product.price.toFixed(2)}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onViewDetails?.(product);
      }}
      onKeyDown={handleKeyDown}
    >
      <img
        src={product.image_url}
        alt={product.name}
        loading="lazy"
        width={96}
        height={96}
        className={`object-cover mx-auto rounded-lg ${compact ? 'w-20 h-20' : 'w-24 h-24'}`}
      />
      <div className={`flex flex-col items-center ${compact ? 'mt-2' : 'mt-4'}`}>
        <h3 className="font-semibold text-center text-sm truncate w-full group-hover:text-[#01696f] transition-colors" title={product.name}>
          {product.name}
        </h3>
        <p className="text-gray-500 text-xs">{product.brand}</p>
        <p className="font-bold text-gray-900 mt-1.5 text-lg">${product.price.toFixed(2)}</p>
        <div className="text-yellow-500 text-xs mt-0.5">{stars}</div>
      </div>
      {onViewDetails && (
        <button 
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onViewDetails(product);
          }}
          className="mt-3 w-full bg-[#01696f] text-white rounded-lg py-2 text-sm font-medium hover:bg-[#014d52] transition-colors active:scale-[0.98]"
        >
          View Details
        </button>
      )}
    </div>
  );
};
