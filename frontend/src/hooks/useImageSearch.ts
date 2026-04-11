import { useState } from 'react';
import axios from 'axios';
import type { Product, ImageSearchResponse } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export function useImageSearch() {
  const [isUploading, setIsUploading] = useState(false);
  const [results, setResults] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const searchByImage = async (file: File, sessionId: string): Promise<ImageSearchResponse | null> => {
    if (!file.type.startsWith('image/')) {
      setError("File must be an image");
      return null;
    }
    
    setIsUploading(true);
    setError(null);
    
    // 1. Create Preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    
    try {
      // 2. Client-side Resize for faster upload
      const resizedFile = await resizeImage(file, 512, 512);
      
      const form = new FormData();
      form.append('image', resizedFile);
      form.append('session_id', sessionId);
      
      const response = await axios.post<ImageSearchResponse>(`${API_BASE}/api/search/image`, form, {
        timeout: 90000
      });
      setResults(response.data.products);
      return response.data;
    } catch (err: unknown) {
      console.error('Image search failed:', err);
      let detail = 'Failed to search product image.';
      if (axios.isAxiosError(err)) {
        detail = err.response?.data?.detail || detail;
      }
      setError(detail);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const resizeImage = (file: File, maxWidth: number, maxHeight: number): Promise<File> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height *= maxWidth / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width *= maxHeight / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(new File([blob], file.name, { type: 'image/jpeg' }));
            } else {
              resolve(file); // Fallback to original
            }
          }, 'image/jpeg', 0.85);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const clearResults = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setResults([]);
    setError(null);
    setIsUploading(false);
  };

  return { isUploading, results, error, previewUrl, searchByImage, clearResults };
}
