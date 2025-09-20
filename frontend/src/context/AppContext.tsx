import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { Paper, ChatMessage, UsageEntry, NewsItem } from '../types';
import { initialUsageEntries } from '../data/mockData';
import { creditsService } from '../services/creditsService';

interface AppState {
  credits: number;
  papers: Paper[];
  currentPaper: Paper | null;
  selectedPaperId: string | null;
  selectedPaperIds: string[];
  chatMessages: ChatMessage[];
  usageEntries: UsageEntry[];
  isProcessingCredits: boolean;
  lastTransactionId: string | null;
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  deductCredits: (amount: number, reason: string) => Promise<boolean>;
  purchaseCredits: (amount: number) => Promise<boolean>;
}

type AppAction =
  | { type: 'SET_CREDITS'; payload: number }
  | { type: 'DEDUCT_CREDITS'; payload: number }
  | { type: 'ADD_PAPER'; payload: Paper }
  | { type: 'SET_CURRENT_PAPER'; payload: Paper | null }
  | { type: 'SET_SELECTED_PAPER'; payload: string | null }
  | { type: 'TOGGLE_PAPER_SELECTION'; payload: string }
  | { type: 'SET_MULTI_PAPER_MODE'; payload: boolean }
  | { type: 'ADD_CHAT_MESSAGE'; payload: ChatMessage }
  | { type: 'CLEAR_CHAT_MESSAGES'; payload: void }
  | { type: 'ADD_USAGE_ENTRY'; payload: UsageEntry }
  | { type: 'UPDATE_PAPER_UPDATES'; payload: { paperId: string; updates: NewsItem[] } }
  | { type: 'MARK_UPDATE_SUMMARIZED'; payload: { paperId: string; updateId: string; summary: string } }
  | { type: 'SET_PROCESSING_CREDITS'; payload: boolean }
  | { type: 'SET_LAST_TRANSACTION_ID'; payload: string | null };

const initialState: AppState = {
  credits: parseInt(localStorage.getItem('smart-research-credits') || '18', 10),
  papers: [],
  currentPaper: null,
  selectedPaperId: null,
  selectedPaperIds: [],
  chatMessages: [],
  usageEntries: initialUsageEntries,
  isProcessingCredits: false,
  lastTransactionId: null
};

const AppContext = createContext<AppContextType | undefined>(undefined);

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_CREDITS':
      return { ...state, credits: action.payload };
    case 'DEDUCT_CREDITS':
      return { ...state, credits: Math.max(0, state.credits - action.payload) };
    case 'ADD_PAPER':
      return { ...state, papers: [...state.papers, action.payload] };
    case 'SET_CURRENT_PAPER':
      return { ...state, currentPaper: action.payload };
    case 'SET_SELECTED_PAPER':
      return { ...state, selectedPaperId: action.payload };
    case 'TOGGLE_PAPER_SELECTION':
      const paperId = action.payload;
      const isSelected = state.selectedPaperIds.includes(paperId);
      return {
        ...state,
        selectedPaperIds: isSelected
          ? state.selectedPaperIds.filter(id => id !== paperId)
          : [...state.selectedPaperIds, paperId]
      };
    case 'SET_MULTI_PAPER_MODE':
      return {
        ...state,
        selectedPaperIds: action.payload ? [] : state.selectedPaperIds,
        selectedPaperId: action.payload ? null : state.selectedPaperId
      };
    case 'ADD_CHAT_MESSAGE':
      return { ...state, chatMessages: [...state.chatMessages, action.payload] };
    case 'CLEAR_CHAT_MESSAGES':
      return { ...state, chatMessages: [] };
    case 'ADD_USAGE_ENTRY':
      return { ...state, usageEntries: [...state.usageEntries, action.payload] };
    case 'UPDATE_PAPER_UPDATES':
      return {
        ...state,
        papers: state.papers.map(paper =>
          paper.paper_id === action.payload.paperId
            ? { ...paper, updates: action.payload.updates, updates_count: action.payload.updates.length }
            : paper
        ),
        currentPaper: state.currentPaper?.paper_id === action.payload.paperId
          ? { ...state.currentPaper, updates: action.payload.updates, updates_count: action.payload.updates.length }
          : state.currentPaper
      };
    case 'MARK_UPDATE_SUMMARIZED':
      return {
        ...state,
        papers: state.papers.map(paper =>
          paper.paper_id === action.payload.paperId
            ? {
                ...paper,
                updates: paper.updates?.map(update =>
                  update.id === action.payload.updateId
                    ? { ...update, summarized: true, summary: action.payload.summary }
                    : update
                )
              }
            : paper
        ),
        currentPaper: state.currentPaper?.paper_id === action.payload.paperId
          ? {
              ...state.currentPaper,
              updates: state.currentPaper.updates?.map(update =>
                update.id === action.payload.updateId
                  ? { ...update, summarized: true, summary: action.payload.summary }
                  : update
              )
            }
          : state.currentPaper
      };
    case 'SET_PROCESSING_CREDITS':
      return { ...state, isProcessingCredits: action.payload };
    case 'SET_LAST_TRANSACTION_ID':
      return { ...state, lastTransactionId: action.payload };
    default:
      return state;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const deductCredits = async (amount: number, reason: string): Promise<boolean> => {
    try {
      dispatch({ type: 'SET_PROCESSING_CREDITS', payload: true });
      
      const response = await creditsService.deductCredits(amount, reason);
      
      if (response.success) {
        dispatch({ type: 'SET_CREDITS', payload: response.newBalance });
        dispatch({ type: 'SET_LAST_TRANSACTION_ID', payload: response.transactionId });
        creditsService.updateBalance(response.newBalance);
        return true;
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      console.error('Credits deduction failed:', error);
      return false;
    } finally {
      dispatch({ type: 'SET_PROCESSING_CREDITS', payload: false });
    }
  };

  const purchaseCredits = async (amount: number): Promise<boolean> => {
    try {
      dispatch({ type: 'SET_PROCESSING_CREDITS', payload: true });
      
      const response = await creditsService.purchaseCredits(amount);
      
      if (response.success) {
        dispatch({ type: 'SET_CREDITS', payload: response.newBalance });
        dispatch({ type: 'SET_LAST_TRANSACTION_ID', payload: response.transactionId });
        creditsService.updateBalance(response.newBalance);
        return true;
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      console.error('Credits purchase failed:', error);
      return false;
    } finally {
      dispatch({ type: 'SET_PROCESSING_CREDITS', payload: false });
    }
  };

  return (
    <AppContext.Provider value={{ state, dispatch, deductCredits, purchaseCredits }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}