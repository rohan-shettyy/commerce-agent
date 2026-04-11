export type Product = {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  description: string;
  tags: string[];
  image_url: string;
  rating: number;
  in_stock: boolean;
  attributes: { color?: string; size?: string; material?: string };
};

export type Message = {
  id: string;
  role: 'user' | 'assistant' | 'error';
  content: string;
  image?: string; // Base64 data URI of the image sent by user
  products?: Product[];
  timestamp: Date;
  isVoiceLoading?: boolean; // True when waiting for TTS audio to prepare
};

export type ChatResponse = {
  session_id: string;
  reply: string;
  products: Product[];
  tool_calls_made: string[];
  latency_ms: number;
};

export type TranscriptResponse = {
  transcript: string;
  language: string;
  duration_ms: number;
};

export type ImageSearchResponse = {
  session_id: string;
  reply: string;
  products: Product[];
  similarity_scores: number[];
};

/** Represents a saved chat session for the sidebar history. */
export type ChatSession = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
};
