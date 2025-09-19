import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, ChevronDown, Users, Check } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { ChatMessage } from '../components/Chat/ChatMessage';
import { ChatInput } from '../components/Chat/ChatInput';
import { UpdatesPanel } from '../components/Updates/UpdatesPanel';
import { mockRetrievalAnswer, mockSynthesisAnswer, mockNews } from '../data/mockData';
import { ChatMessage as ChatMessageType } from '../types';
import toast from 'react-hot-toast';

export function PaperDetail() {
  const { paperId } = useParams<{ paperId: string }>();
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [showPaperSelector, setShowPaperSelector] = useState(false);
  const [multiPaperMode, setMultiPaperMode] = useState(false);

  const paper = state.papers.find(p => p.paper_id === paperId);
  const selectedPapers = state.papers.filter(p => state.selectedPaperIds.includes(p.paper_id));

  useEffect(() => {
    if (paper) {
      dispatch({ type: 'SET_CURRENT_PAPER', payload: paper });
      dispatch({ type: 'SET_SELECTED_PAPER', payload: paperId || null });
      // Clear chat messages when switching papers
      setMessages([]);
      dispatch({ type: 'CLEAR_CHAT_MESSAGES', payload: undefined });
    }
  }, [paper, paperId, dispatch]);

  // Close paper selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showPaperSelector) {
        const target = event.target as HTMLElement;
        if (!target.closest('.paper-selector')) {
          setShowPaperSelector(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPaperSelector]);

  // Updates polling simulation
  useEffect(() => {
    if (!paper || !paper.subscription_enabled) return;

    const interval = setInterval(() => {
      const existingUpdateIds = paper.updates?.map(u => u.id) || [];
      const newUpdates = mockNews.filter(news => 
        news.related_to.some(keyword => paper.keywords.includes(keyword)) &&
        !existingUpdateIds.includes(news.id)
      );

      if (newUpdates.length > 0) {
        const allUpdates = [...(paper.updates || []), ...newUpdates];
        dispatch({
          type: 'UPDATE_PAPER_UPDATES',
          payload: {
            paperId: paper.paper_id,
            updates: allUpdates
          }
        });
        toast.success('New update found!');
      }
    }, 15000); // Check every 15 seconds

    return () => clearInterval(interval);
  }, [paper, dispatch]);

  const handlePaperSelect = (selectedPaperId: string) => {
    if (multiPaperMode) {
      dispatch({ type: 'TOGGLE_PAPER_SELECTION', payload: selectedPaperId });
    } else {
      navigate(`/paper/${selectedPaperId}`);
      setShowPaperSelector(false);
    }
  };

  const toggleMultiPaperMode = () => {
    setMultiPaperMode(!multiPaperMode);
    dispatch({ type: 'SET_MULTI_PAPER_MODE', payload: !multiPaperMode });
    if (!multiPaperMode) {
      // When entering multi-paper mode, select current paper
      if (paper) {
        dispatch({ type: 'TOGGLE_PAPER_SELECTION', payload: paper.paper_id });
      }
    }
  };

  const handleSendMessage = (messageContent: string) => {
    const userMessage: ChatMessageType = {
      id: Date.now().toString(),
      type: 'user',
      content: messageContent,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);

    // Determine response type based on message content and mode
    let response;
    let shouldUseCredits = false;

    if (multiPaperMode) {
      // Multi-paper mode always uses synthesis for comparison
      response = {
        type: "synthesis" as const,
        answer: `Based on analysis of ${selectedPapers.length} selected papers: ${messageContent.toLowerCase().includes('compare') ? 'The papers show different approaches to the problem. Paper 1 focuses on recurrent architectures while Paper 2 emphasizes attention mechanisms.' : 'The selected papers provide complementary insights on this topic.'}`,
        citations: selectedPapers.map((p, index) => ({
          type: "paper" as const,
          paper_id: p.paper_id,
          page: index + 1,
          snippet: `From ${p.title}: ${p.abstract.substring(0, 100)}...`
        })),
        used_llm: true,
        credits_used: 3
      };
      shouldUseCredits = true;
    } else if (messageContent.toLowerCase().includes('accuracy') || 
               messageContent.toLowerCase().includes('abstract') ||
               messageContent.toLowerCase().includes('result')) {
      response = mockRetrievalAnswer;
    } else {
      response = mockSynthesisAnswer;
      shouldUseCredits = true;
    }

    // Simulate processing delay
    setTimeout(() => {
      const assistantMessage: ChatMessageType = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: '',
        timestamp: new Date(),
        answer: response
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (shouldUseCredits) {
        dispatch({ type: 'DEDUCT_CREDITS', payload: response.credits_used });
        dispatch({
          type: 'ADD_USAGE_ENTRY',
          payload: {
            timestamp: new Date().toLocaleString(),
            event: `Asked "${messageContent}"`,
            credits_used: response.credits_used,
            details: multiPaperMode ? 'Multi-paper Synthesis' : 'Synthesis'
          }
        });
        toast.success(`Synthesis completed — -${response.credits_used} credits`);
      } else {
        dispatch({
          type: 'ADD_USAGE_ENTRY',
          payload: {
            timestamp: new Date().toLocaleString(),
            event: `Asked "${messageContent}"`,
            credits_used: 0,
            details: 'Retrieval'
          }
        });
      }
    }, 1000);
  };

  if (!paper) {
    return (
      <div className="min-h-screen bg-[#F6F7FB] flex items-center justify-center">
        <div className="text-center">
          <FileText size={48} className="mx-auto text-gray-400 mb-4" />
          <h2 className="text-2xl font-semibold text-[#222222] mb-2">Paper not found</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F7FB]">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex gap-6 min-h-[calc(100vh-8rem)]">
          {/* Left Panel - Paper Metadata (25%) */}
          <div className="w-1/4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-xl shadow-lg p-6 h-fit"
            >
              {/* Multi-Paper Mode Toggle */}
              <div className="mb-4">
                <button
                  onClick={toggleMultiPaperMode}
                  className={`w-full flex items-center justify-center space-x-2 p-3 rounded-lg transition-colors ${
                    multiPaperMode 
                      ? 'bg-[#1ABC9C] text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Users size={16} />
                  <span className="text-sm font-medium">
                    {multiPaperMode ? 'Multi-Paper Mode' : 'Single Paper Mode'}
                  </span>
                </button>
              </div>

              {/* Paper Selector */}
              <div className="mb-4">
                <div className="relative paper-selector">
                  <button
                    onClick={() => setShowPaperSelector(!showPaperSelector)}
                    className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="text-left flex-1 min-w-0">
                      <div className="font-medium text-sm text-[#222222] truncate">
                        {multiPaperMode 
                          ? `${selectedPapers.length} paper${selectedPapers.length !== 1 ? 's' : ''} selected`
                          : paper?.title || 'Select a paper'
                        }
                      </div>
                      <div className="text-xs text-gray-500">
                        {state.papers.length} paper{state.papers.length !== 1 ? 's' : ''} uploaded
                      </div>
                    </div>
                    <ChevronDown size={16} className="text-gray-400" />
                  </button>
                  
                  {showPaperSelector && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                      {state.papers.map((p) => (
                        <button
                          key={p.paper_id}
                          onClick={() => handlePaperSelect(p.paper_id)}
                          className={`w-full text-left p-3 hover:bg-gray-50 transition-colors flex items-center space-x-2 ${
                            multiPaperMode && state.selectedPaperIds.includes(p.paper_id)
                              ? 'bg-[#EEF6F4] text-[#1ABC9C]'
                              : !multiPaperMode && p.paper_id === paper?.paper_id
                              ? 'bg-[#EEF6F4] text-[#1ABC9C]'
                              : ''
                          }`}
                        >
                          {multiPaperMode && (
                            <div className="flex-shrink-0">
                              {state.selectedPaperIds.includes(p.paper_id) ? (
                                <Check size={16} className="text-[#1ABC9C]" />
                              ) : (
                                <div className="w-4 h-4 border border-gray-300 rounded" />
                              )}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{p.title}</div>
                            <div className="text-xs text-gray-500">{p.authors.join(', ')}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Selected Papers Display */}
              {multiPaperMode && selectedPapers.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs text-gray-600 mb-2">Selected Papers:</div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {selectedPapers.map((p) => (
                      <div key={p.paper_id} className="text-xs bg-gray-50 p-2 rounded truncate">
                        {p.title}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <h2 className="text-xl font-semibold text-[#222222] mb-3">
                {paper.title}
              </h2>
              <p className="text-gray-600 text-sm mb-4">
                By: {paper.authors.join(', ')}
              </p>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Abstract:</p>
                <div className="bg-gray-50 p-3 rounded-lg text-xs text-gray-700 line-clamp-4">
                  {paper.abstract}
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={paper.subscription_enabled}
                    readOnly
                    className="w-4 h-4 text-[#1ABC9C] border-gray-300 rounded focus:ring-[#1ABC9C]"
                  />
                  <label className="text-gray-600">Subscription: ON</label>
                </div>
                <div className="text-xs text-gray-500">
                  Last checked: --
                </div>
              </div>
            </motion.div>
          </div>

          {/* Center Panel - Chat (60%) */}
          <div className="flex-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-lg h-full flex flex-col"
            >
              <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[500px]">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 mt-12">
                    <FileText size={32} className="mx-auto mb-3 opacity-50" />
                    <p>
                      {multiPaperMode 
                        ? `Ask a question about ${selectedPapers.length} selected paper${selectedPapers.length !== 1 ? 's' : ''} to get started`
                        : 'Ask a question about this paper to get started'
                      }
                    </p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <ChatMessage key={message.id} message={message} />
                  ))
                )}
              </div>
              <div className="p-6 border-t border-gray-200">
                <ChatInput 
                  onSendMessage={handleSendMessage}
                  placeholder={
                    multiPaperMode 
                      ? `Ask a question about ${selectedPapers.length} selected paper${selectedPapers.length !== 1 ? 's' : ''}... (e.g., "Compare the methods in these papers")`
                      : 'Ask a question about this paper… (e.g., "What is the abstract?")'
                  }
                />
              </div>
            </motion.div>
          </div>

          {/* Right Panel - Updates (15%) */}
          <div className="w-1/6">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="h-full"
            >
              <UpdatesPanel paper={paper} />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}