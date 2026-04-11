/**
 * useProducts hook — manages the product catalog state and initial fetch.
 */
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import type { Product } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.get<Product[]>(`${API_BASE}/api/products`, { 
        timeout: 30000 
      });
      setProducts(response.data);
    } catch (err: unknown) {
      console.error('Failed to fetch products:', err);
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.detail || 'Failed to load catalog. Please check your connection.');
      } else {
        setError('An unexpected error occurred while loading products.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return { products, isLoading, error, refetch: fetchProducts };
}
