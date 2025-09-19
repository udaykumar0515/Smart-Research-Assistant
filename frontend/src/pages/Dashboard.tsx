import { useNavigate } from 'react-router-dom';
import { FileText, Upload } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { PaperCard } from '../components/Paper/PaperCard';

export function Dashboard() {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();

  const handleOpenPaper = (paperId: string) => {
    dispatch({ type: 'SET_SELECTED_PAPER', payload: paperId });
    navigate(`/paper/${paperId}`);
  };

  const handleChatWithPaper = (paperId: string) => {
    dispatch({ type: 'SET_SELECTED_PAPER', payload: paperId });
    navigate(`/paper/${paperId}`);
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
              Upload Paper
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
          <div className="w-80 bg-white rounded-xl shadow-lg p-6 h-fit">
            <h3 className="text-lg font-semibold text-[#222222] mb-4">Your Papers</h3>
            <div className="space-y-4">
            {state.papers.map((paper) => (
              <PaperCard
                key={paper.paper_id}
                paper={paper}
                onClick={() => handleOpenPaper(paper.paper_id)}
                onChatClick={() => handleChatWithPaper(paper.paper_id)}
                  showChatButton={false}
                  compact={true}
              />
            ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-semibold text-[#222222] mb-6">Dashboard</h2>
            <p className="text-gray-600 mb-8">Select a paper from the sidebar to view details and start chatting.</p>
            
            {state.papers.length > 0 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {state.papers.map((paper) => (
                    <PaperCard
                      key={paper.paper_id}
                      paper={paper}
                      onClick={() => handleOpenPaper(paper.paper_id)}
                      onChatClick={() => handleChatWithPaper(paper.paper_id)}
                      showChatButton={true}
                      selected={state.selectedPaperId === paper.paper_id}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}