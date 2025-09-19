import React from 'react';
import { motion } from 'framer-motion';
import { Bell, Clock, CheckCircle } from 'lucide-react';
import { Paper, NewsItem } from '../../types';
import { useAppContext } from '../../context/AppContext';
import { mockUpdateSummary } from '../../data/mockData';
import { toast } from 'react-hot-toast';

interface UpdatesPanelProps {
  paper: Paper;
}

export function UpdatesPanel({ paper }: UpdatesPanelProps) {
  const { dispatch } = useAppContext();

  const handleSummarizeUpdate = (update: NewsItem) => {
    // Deduct credits
    dispatch({ type: 'DEDUCT_CREDITS', payload: mockUpdateSummary.credits_used });
    
    // Add usage entry
    dispatch({
      type: 'ADD_USAGE_ENTRY',
      payload: {
        timestamp: new Date().toLocaleString(),
        event: 'Summarize update',
        credits_used: mockUpdateSummary.credits_used,
        details: update.title
      }
    });

    // Mark as summarized
    dispatch({
      type: 'MARK_UPDATE_SUMMARIZED',
      payload: {
        paperId: paper.paper_id,
        updateId: update.id,
        summary: mockUpdateSummary.summary
      }
    });

    // Show toast
    toast.success(`Update summarized — -${mockUpdateSummary.credits_used} credits`);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 h-fit">
      <h3 className="text-lg font-semibold text-[#222222] mb-4">Updates</h3>

      {!paper.updates || paper.updates.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          <Clock size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">No updates yet</p>
          <p className="text-xs mt-1">Checking for updates...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {paper.updates.map((update) => (
            <motion.div
              key={update.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#F8F9FA] rounded-lg p-3 border-l-4 border-[#1ABC9C]"
            >
              <h4 className="font-medium text-[#222222] text-sm mb-2">
                {update.title}
              </h4>
              <p className="text-gray-600 text-xs mb-2 line-clamp-2">
                {update.snippet}
              </p>
              <div className="text-xs text-gray-500 mb-2">
                {new Date(update.published_at).toLocaleDateString()}
              </div>

              {update.summarized ? (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-[#1ABC9C] text-sm">
                    <CheckCircle size={14} />
                    <span>Summarized ✓</span>
                  </div>
                  {update.summary && (
                    <div className="bg-[#EEF6F4] p-3 rounded text-xs text-[#222222]">
                      {update.summary}
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => handleSummarizeUpdate(update)}
                  className="w-full bg-[#1ABC9C] text-white text-xs py-2 px-3 rounded-lg hover:bg-[#17a085] transition-colors"
                >
                  Summarize update (2 credits)
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}

      <button
        disabled
        className="w-full mt-4 bg-gray-300 text-gray-500 text-sm py-2 px-3 rounded-lg cursor-not-allowed"
      >
        Generate report
      </button>
    </div>
  );
}