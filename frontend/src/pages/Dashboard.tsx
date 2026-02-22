import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Upload, Trash2, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAppContext } from '../context/AppContext';
import { PaperCard } from '../components/Paper/PaperCard';
import { backendApi } from '../services/backendApi';
import toast from 'react-hot-toast';

export function Dashboard() {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleOpenPaper = (paperId: string) => {
    dispatch({ type: 'SET_SELECTED_PAPER', payload: paperId });
    navigate(`/paper/${paperId}`);
  };

  const handleChatWithPaper = (paperId: string) => {
    dispatch({ type: 'SET_SELECTED_PAPER', payload: paperId });
    navigate(`/paper/${paperId}`);
  };

  const handleDeletePaper = async (paperId: string, title: string) => {
    if (deletingId) return;
    setDeletingId(paperId);
    try {
      await backendApi.deletePaper(paperId);
      dispatch({ type: 'REMOVE_PAPER', payload: paperId });
      toast.success(`Deleted "${title}"`);
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error(e?.message || 'Failed to delete paper');
    } finally {
      setDeletingId(null);
    }
  };

  if (state.papers.length === 0) {
    return (
      <div className="min-h-screen bg-[#F6F7FB] py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center">
            <FileText size={48} className="mx-auto text-gray-400 mb-4" />
            <h2 className="text-2xl font-semibold text-[#222222] mb-2">No papers uploaded</h2>
            <p className="text-gray-600 mb-6">Upload your first research paper to get started.</p>
            <button
              onClick={() => navigate('/')}
              className="bg-[#1F3A93] text-white px-6 py-3 rounded-md hover:bg-[#2F4BA3] transition-colors flex items-center space-x-2 mx-auto"
            >
              <Upload size={20} />
              <span>Upload Paper</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F7FB] py-6">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex gap-6 min-h-[calc(100vh-8rem)]">
          {/* Sidebar */}
          <div className="w-80 space-y-4">
            <div className="bg-white rounded-xl shadow-lg p-6 h-fit">
              <h3 className="text-lg font-semibold text-[#222222] mb-4">Your Papers</h3>
              <div className="space-y-3">
                {state.papers.map((paper) => (
                  <div key={paper.paper_id} className="relative group">
                    <PaperCard
                      paper={paper}
                      onClick={() => handleOpenPaper(paper.paper_id)}
                      onChatClick={() => handleChatWithPaper(paper.paper_id)}
                      showChatButton={false}
                      compact={true}
                    />
                    {/* Delete button overlay */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePaper(paper.paper_id, paper.title);
                      }}
                      disabled={deletingId === paper.paper_id}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-red-500 text-white p-1.5 rounded-lg hover:bg-red-600 transition-all disabled:opacity-50"
                      title="Delete paper"
                    >
                      {deletingId === paper.paper_id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Upload more button */}
            <button
              onClick={() => navigate('/')}
              className="w-full bg-[#1F3A93] text-white px-4 py-3 rounded-xl hover:bg-[#1a2f7a] transition-colors flex items-center justify-center space-x-2 shadow-lg font-medium"
            >
              <Upload size={18} />
              <span>Upload More Papers</span>
            </button>
          </div>

          {/* Main Content */}
          <div className="flex-1 bg-white rounded-xl shadow-lg p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-[#222222]">Dashboard</h2>
              <div className="text-sm text-gray-500">
                {state.papers.length} paper{state.papers.length !== 1 ? 's' : ''} uploaded
              </div>
            </div>
            <p className="text-gray-600 mb-8">Select a paper to view details and start chatting.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {state.papers.map((paper) => (
                <motion.div
                  key={paper.paper_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative group"
                >
                  <PaperCard
                    paper={paper}
                    onClick={() => handleOpenPaper(paper.paper_id)}
                    onChatClick={() => handleChatWithPaper(paper.paper_id)}
                    showChatButton={true}
                    selected={state.selectedPaperId === paper.paper_id}
                  />
                  {/* Delete button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePaper(paper.paper_id, paper.title);
                    }}
                    disabled={deletingId === paper.paper_id}
                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition-all disabled:opacity-50 shadow-md"
                    title="Delete paper"
                  >
                    {deletingId === paper.paper_id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}