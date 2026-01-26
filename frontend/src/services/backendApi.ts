import { apiForm, apiJson } from './apiClient';
import { Answer, NewsItem, Paper } from '../types';

export type UploadPaperResponse = {
  paper: Paper;
};

export type ChatRequest = {
  question: string;
  mode: 'single' | 'multi';
  paper_id?: string;
  paper_ids?: string[];
};

export type ChatResponse = {
  answer: Answer;
  credits?: {
    deducted: number;
    new_balance: number;
    transaction_id?: string;
  };
};

export type CreditsDeductRequest = {
  amount: number;
  reason: string;
};

export type CreditsPurchaseRequest = {
  amount: number;
};

export type CreditsResponse = {
  success: boolean;
  newBalance: number;
  transactionId?: string;
  message?: string;
};

export const backendApi = {
  uploadPaper: async (file: File, createSubscription: boolean, signal?: AbortSignal): Promise<UploadPaperResponse> => {
    const form = new FormData();
    form.append('file', file);
    form.append('create_subscription', String(createSubscription));
    return apiForm<UploadPaperResponse>('/papers/upload', form, { signal });
  },

  chat: async (req: ChatRequest, signal?: AbortSignal): Promise<ChatResponse> => {
    return apiJson<ChatResponse>('/chat', { method: 'POST', body: req, signal });
  },

  getPaperUpdates: async (paperId: string, signal?: AbortSignal): Promise<{ updates: NewsItem[] }> => {
    return apiJson<{ updates: NewsItem[] }>(`/papers/${encodeURIComponent(paperId)}/updates`, { signal });
  },

  summarizeUpdate: async (paperId: string, updateId: string, signal?: AbortSignal): Promise<{ summary: string; credits_used?: number; new_balance?: number }> => {
    return apiJson<{ summary: string; credits_used?: number; new_balance?: number }>(
      `/papers/${encodeURIComponent(paperId)}/updates/${encodeURIComponent(updateId)}/summarize`,
      { method: 'POST', body: {}, signal }
    );
  },

  generateReport: async (paperId: string, signal?: AbortSignal): Promise<{ report_url?: string; report_markdown?: string }> => {
    return apiJson<{ report_url?: string; report_markdown?: string }>(
      `/papers/${encodeURIComponent(paperId)}/report`,
      { method: 'POST', body: {}, signal }
    );
  },

  deductCredits: async (req: CreditsDeductRequest, signal?: AbortSignal): Promise<CreditsResponse> => {
    return apiJson<CreditsResponse>('/credits/deduct', { method: 'POST', body: req, signal });
  },

  purchaseCredits: async (req: CreditsPurchaseRequest, signal?: AbortSignal): Promise<CreditsResponse> => {
    return apiJson<CreditsResponse>('/credits/purchase', { method: 'POST', body: req, signal });
  }
};
