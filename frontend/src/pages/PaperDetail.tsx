import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, ChevronDown, Users, Check, Loader2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { ChatMessage } from '../components/Chat/ChatMessage';
import { ChatInput } from '../components/Chat/ChatInput';
import { UpdatesPanel } from '../components/Updates/UpdatesPanel';
import { ChatMessage as ChatMessageType } from '../types';
import toast from 'react-hot-toast';
import { backendApi } from '../services/backendApi';

export function PaperDetail() {
  const { paperId } = useParams<{ paperId: string }>();
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [showPaperSelector, setShowPaperSelector] = useState(false);
  const [multiPaperMode, setMultiPaperMode] = useState(false);
  const [currentPaperId, setCurrentPaperId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [expandedPaperId, setExpandedPaperId] = useState<string | null>(null);
  const chatAbortRef = useRef<AbortController | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const paper = state.papers.find(p => p.paper_id === paperId);
  const selectedPapers = state.papers.filter(p => state.selectedPaperIds.includes(p.paper_id));

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (paper && paperId !== currentPaperId) {
      chatAbortRef.current?.abort();
      setMessages([]);
      setCurrentPaperId(paperId || null);
      dispatch({ type: 'SET_CURRENT_PAPER', payload: paper });
      dispatch({ type: 'SET_SELECTED_PAPER', payload: paperId || null });
    }
  }, [paper, paperId, currentPaperId, dispatch]);

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
      if (paper) {
        dispatch({ type: 'TOGGLE_PAPER_SELECTION', payload: paper.paper_id });
      }
    }
  };

  const handleSendMessage = async (messageContent: string) => {
    if (isSending) return;
    const userMessage: ChatMessageType = {
      id: Date.now().toString(),
      type: 'user',
      content: messageContent,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);

    chatAbortRef.current?.abort();
    const controller = new AbortController();
    chatAbortRef.current = controller;

    const thinkingMessage: ChatMessageType = {
      id: (Date.now() + 1).toString(),
      type: 'assistant',
      content: 'Thinking…',
      timestamp: new Date()
    };

    setIsSending(true);
    setMessages(prev => [...prev, thinkingMessage]);

    try {
      const mode = multiPaperMode ? 'multi' : 'single';
      const res = await backendApi.chat(
        {
          question: messageContent,
          mode,
          paper_id: mode === 'single' ? paper?.paper_id : undefined,
          paper_ids: mode === 'multi' ? selectedPapers.map(p => p.paper_id) : undefined
        },
        controller.signal
      );

      setMessages(prev => prev.map(m =>
        m.id === thinkingMessage.id
          ? { ...m, content: '', answer: res.answer }
          : m
      ));
    } catch (err: unknown) {
      const e = err as { name?: string; message?: string };
      if (e?.name === 'AbortError') return;
      setMessages(prev => prev.map(m =>
        m.id === thinkingMessage.id
          ? { ...m, content: 'Failed to get response. Please try again.' }
          : m
      ));
      toast.error(e?.message || 'Chat request failed');
    } finally {
      setIsSending(false);
    }
  };

  if (!paper) {
    return (
      <div className="min-h-screen bg-[#F6F7FB] flex items-center justify-center">
        <div className="text-center">
          <FileText size={48} className="mx-auto text-gray-400 mb-4" />
          <h2 className="text-2xl font-semibold text-[#222222] mb-2">Paper not found</h2>
          <button
            onClick={() => navigate('/')}
            className="mt-4 text-[#1F3A93] hover:text-[#1ABC9C] font-medium"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] bg-[#F6F7FB] overflow-hidden">
      <div className="w-full px-8 py-4 h-full">
        <div className="flex gap-4 h-full">
          {/* Left Panel - Paper Selection */}
          <div className="w-[260px] flex-shrink-0 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-xl shadow-lg p-5 h-fit"
            >
              {/* Multi-Paper Mode Toggle */}
              {state.papers.length > 1 && (
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
              )}

              {/* Paper Selector Dropdown */}
              {state.papers.length > 1 && (
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
                              <div className="text-xs text-gray-500">{p.pages} pages</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Selected/Active Papers — clickable with expandable abstract */}
              <div className="space-y-1">
                <div className="text-xs text-gray-500 mb-2">
                  {multiPaperMode ? 'Selected Papers' : 'Active Paper'}
                </div>
                {(multiPaperMode ? selectedPapers : [paper]).map((p) => (
                  <div key={p.paper_id}>
                    <button
                      onClick={() => setExpandedPaperId(expandedPaperId === p.paper_id ? null : p.paper_id)}
                      className={`w-full text-left p-2.5 rounded-lg transition-colors flex items-center gap-2 ${
                        expandedPaperId === p.paper_id
                          ? 'bg-[#EEF6F4] text-[#1ABC9C]'
                          : 'bg-gray-50 hover:bg-gray-100 text-[#222222]'
                      }`}
                    >
                      <FileText size={14} className="flex-shrink-0" />
                      <span className="text-xs font-medium truncate flex-1">{p.title}</span>
                      <ChevronDown
                        size={12}
                        className={`flex-shrink-0 transition-transform ${expandedPaperId === p.paper_id ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {expandedPaperId === p.paper_id && p.abstract && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="bg-gray-50 rounded-b-lg px-3 py-2 text-[11px] text-gray-600 leading-relaxed border-t border-gray-100"
                      >
                        <div className="font-medium text-gray-500 mb-1">Abstract:</div>
                        {p.abstract}
                      </motion.div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Center Panel - Chat */}
          <div className="flex-1 min-w-0">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-lg h-full flex flex-col"
            >
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 mt-12">
                    <FileText size={32} className="mx-auto mb-3 opacity-50" />
                    <p className="text-lg font-medium mb-2">
                      {multiPaperMode 
                        ? `Ask about ${selectedPapers.length} selected paper${selectedPapers.length !== 1 ? 's' : ''}`
                        : 'Ask a question about this paper'
                      }
                    </p>
                    <p className="text-sm text-gray-400">
                      e.g. "What are the key findings?" or "Summarize the methodology"
                    </p>
                  </div>
                ) : (
                  <>
                    {messages.map((message) => (
                      <ChatMessage key={message.id} message={message} />
                    ))}
                    <div ref={chatEndRef} />
                  </>
                )}
              </div>
              <div className="p-6 border-t border-gray-200">
                <ChatInput 
                  onSendMessage={handleSendMessage}
                  placeholder={
                    multiPaperMode 
                      ? `Ask about ${selectedPapers.length} paper${selectedPapers.length !== 1 ? 's' : ''}…`
                      : 'Ask a question about this paper…'
                  }
                />
                {isSending && (
                  <div className="flex items-center justify-center mt-2 text-sm text-gray-500">
                    <Loader2 size={16} className="animate-spin mr-2" />
                    Analyzing paper sections…
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Right Panel - Paper Tools & Report */}
          <div className="w-[375px] flex-shrink-0">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="h-full"
            >
              <UpdatesPanel
                paper={paper}
                selectedPapers={selectedPapers}
                multiPaperMode={multiPaperMode}
              />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}