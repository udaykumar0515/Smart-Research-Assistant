import { Paper, Answer, NewsItem, UsageEntry } from '../types';

export const mockUploadResponse: Paper = {
  paper_id: "paper-001",
  title: "Efficient Recurrent Networks for Time Series",
  authors: ["A. Researcher", "B. Scientist"],
  abstract: "We propose a new recurrent architecture that improves sequence modeling performance on time series data. Our approach combines attention mechanisms with optimized recurrent units to achieve state-of-the-art results across multiple benchmarks.",
  pages: 6,
  keywords: ["recurrent", "time series", "optimization"],
  subscription_enabled: true,
  updates_count: 0,
  updates: []
};

export const mockRetrievalAnswer: Answer = {
  type: "retrieval",
  answer: "The authors report an average accuracy of 88.3% on dataset X.",
  citations: [{
    type: "paper",
    paper_id: "paper-001",
    page: 3,
    snippet: "We obtained an accuracy of 88.3% on dataset X using our proposed recurrent architecture with attention mechanisms..."
  }],
  used_llm: false,
  credits_used: 0
};

export const mockSynthesisAnswer: Answer = {
  type: "synthesis",
  answer: "No direct claim in the paper. A recent news piece reports a ~3% improvement using optimization Z [News:1].",
  citations: [{
    type: "news",
    id: "news1",
    title: "New optimization improves recurrent nets",
    snippet: "A team reports increase in accuracy of recurrent networks on dataset X by 3% using novel optimization techniques."
  }],
  used_llm: true,
  credits_used: 3
};

export const mockNews: NewsItem[] = [
  {
    id: "news1",
    title: "New optimization improves recurrent nets",
    url: "https://example.com/news1",
    snippet: "A team reports increase in accuracy of recurrent networks on dataset X by 3% using novel optimization techniques.",
    published_at: "2025-09-18T14:00:00Z",
    related_to: ["recurrent", "time series"]
  },
  {
    id: "news2",
    title: "Breakthrough in Time Series Analysis",
    url: "https://example.com/news2",
    snippet: "Researchers achieve new state-of-the-art performance on time series forecasting benchmarks.",
    published_at: "2025-09-19T10:30:00Z",
    related_to: ["time series", "optimization"]
  }
];

export const mockUpdateSummary = {
  summary: "New external work reports a 3% accuracy improvement on dataset X using optimization Z. This represents a significant advancement over the baseline method presented in your paper.",
  credits_used: 2
};

export const initialUsageEntries: UsageEntry[] = [
  {
    timestamp: "2025-09-18 10:00",
    event: "Upload Paper",
    credits_used: 0,
    details: "Efficient Recurrent Networks for Time Series"
  }
];