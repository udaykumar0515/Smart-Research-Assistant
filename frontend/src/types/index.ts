export interface Paper {
  paper_id: string;
  title: string;
  authors: string[];
  abstract: string;
  pages: number;
  keywords: string[];
  subscription_enabled: boolean;
  updates_count: number;
  updates?: NewsItem[];
}

export interface Citation {
  type: 'paper' | 'news';
  paper_id?: string;
  page?: number;
  snippet: string;
  id?: string;
  title?: string;
}

export interface Answer {
  type: 'retrieval' | 'synthesis';
  answer: string;
  citations: Citation[];
  used_llm: boolean;
  credits_used: number;
}

export interface NewsItem {
  id: string;
  title: string;
  url: string;
  snippet: string;
  published_at: string;
  related_to: string[];
  summarized?: boolean;
  summary?: string;
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  answer?: Answer;
}

export interface UsageEntry {
  timestamp: string;
  event: string;
  credits_used: number;
  details: string;
}