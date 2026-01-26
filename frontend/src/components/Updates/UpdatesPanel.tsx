import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, CheckCircle, Loader2, FileText } from 'lucide-react';
import { Paper, NewsItem } from '../../types';
import { useAppContext } from '../../context/AppContext';
import { toast } from 'react-hot-toast';
import { backendApi } from '../../services/backendApi';

interface UpdatesPanelProps {
  paper: Paper;
}

export function UpdatesPanel({ paper }: UpdatesPanelProps) {
  const { dispatch } = useAppContext();
  const [summarizingUpdateId, setSummarizingUpdateId] = useState<string | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const sortedUpdates = useMemo(() => {
    const updates = paper.updates ?? [];
    return updates.slice().sort((a, b) => {
      const ta = new Date(a.published_at).getTime();
      const tb = new Date(b.published_at).getTime();
      return tb - ta;
    });
  }, [paper.updates]);

  const handleSummarizeUpdate = async (update: NewsItem) => {
    if (summarizingUpdateId) return;
    setSummarizingUpdateId(update.id);

    try {
      const res = await backendApi.summarizeUpdate(paper.paper_id, update.id);
      const summary = res.summary;
      const creditsUsed = res.credits_used ?? 0;

      dispatch({
        type: 'MARK_UPDATE_SUMMARIZED',
        payload: {
          paperId: paper.paper_id,
          updateId: update.id,
          summary
        }
      });

      dispatch({
        type: 'ADD_USAGE_ENTRY',
        payload: {
          timestamp: new Date().toLocaleString(),
          event: 'Summarize update',
          credits_used: creditsUsed,
          details: update.title
        }
      });

      if (res.new_balance !== undefined) {
        dispatch({ type: 'SET_CREDITS', payload: res.new_balance });
        localStorage.setItem('smart-research-credits', res.new_balance.toString());
      }

      toast.success(creditsUsed > 0 ? `Update summarized — -${creditsUsed} credits` : 'Update summarized');
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error(e?.message || 'Failed to summarize update');
    } finally {
      setSummarizingUpdateId(null);
    }
  };

  const handleGenerateReport = async () => {
    if (isGeneratingReport) return;
    setIsGeneratingReport(true);
    try {
      const res = await backendApi.generateReport(paper.paper_id);
      if (res.report_url) {
        window.open(res.report_url, '_blank', 'noopener,noreferrer');
      }
      if (!res.report_url && res.report_markdown) {
        toast.success('Report generated');
      }
      if (!res.report_url && !res.report_markdown) {
        toast.success('Report request submitted');
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error(e?.message || 'Failed to generate report');
    } finally {
      setIsGeneratingReport(false);
    }
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
          {sortedUpdates.map((update) => (
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
                  disabled={summarizingUpdateId === update.id}
                  className="w-full bg-[#1ABC9C] text-white text-xs py-2 px-3 rounded-lg hover:bg-[#17a085] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {summarizingUpdateId === update.id ? (
                    <span className="inline-flex items-center justify-center w-full">
                      <Loader2 size={14} className="animate-spin mr-2" />
                      Summarizing...
                    </span>
                  ) : (
                    'Summarize update'
                  )}
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}

      <button
        onClick={handleGenerateReport}
        disabled={isGeneratingReport}
        className="w-full mt-4 bg-[#1F3A93] text-white text-sm py-2 px-3 rounded-lg hover:bg-[#1a2f7a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
      >
        {isGeneratingReport ? (
          <>
            <Loader2 size={16} className="animate-spin mr-2" />
            Generating...
          </>
        ) : (
          <>
            <FileText size={16} className="mr-2" />
            Generate report
          </>
        )}
      </button>
    </div>
  );
}