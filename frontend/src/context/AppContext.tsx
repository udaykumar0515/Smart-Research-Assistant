import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { Paper, ChatMessage, UsageEntry, NewsItem } from '../types';
import { initialUsageEntries } from '../data/mockData';

interface AppState {
  credits: number;
  papers: Paper[];
  currentPaper: Paper | null;
  selectedPaperId: string | null;
  selectedPaperIds: string[];
  chatMessages: ChatMessage[];
  usageEntries: UsageEntry[];
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
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
  | { type: 'MARK_UPDATE_SUMMARIZED'; payload: { paperId: string; updateId: string; summary: string } };

const initialState: AppState = {
  credits: 18,
  papers: [],
  currentPaper: null,
  selectedPaperId: null,
  selectedPaperIds: [],
  chatMessages: [],
  usageEntries: initialUsageEntries
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
    default:
      return state;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
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