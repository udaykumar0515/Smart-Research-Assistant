import { useState } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Loader2, FileText } from 'lucide-react';
import { Paper } from '../../types';
import { toast } from 'react-hot-toast';
import { backendApi } from '../../services/backendApi';

interface UpdatesPanelProps {
  paper: Paper;
}

export function UpdatesPanel({ paper }: UpdatesPanelProps) {
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportMarkdown, setReportMarkdown] = useState<string | null>(null);

  const handleGenerateReport = async () => {
    if (isGeneratingReport) return;
    setIsGeneratingReport(true);
    try {
      const res = await backendApi.generateReport(paper.paper_id);
      if (res.report_markdown) {
        setReportMarkdown(res.report_markdown);
        toast.success('Report generated');
      } else {
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
      <h3 className="text-lg font-semibold text-[#222222] mb-4">Paper Tools</h3>

      {/* Paper Info */}
      <div className="space-y-3 mb-6">
        <div className="bg-[#F8F9FA] rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-1">Pages</div>
          <div className="font-semibold text-[#222222]">{paper.pages}</div>
        </div>
      </div>

      {/* Generate Report */}
      <button
        onClick={handleGenerateReport}
        disabled={isGeneratingReport}
        className="w-full bg-[#1F3A93] text-white text-sm py-2.5 px-3 rounded-lg hover:bg-[#1a2f7a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
      >
        {isGeneratingReport ? (
          <>
            <Loader2 size={16} className="animate-spin mr-2" />
            Generating…
          </>
        ) : (
          <>
            <FileText size={16} className="mr-2" />
            Generate Report
          </>
        )}
      </button>

      {/* Report Display — properly rendered markdown */}
      {reportMarkdown && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4"
        >
          <div className="bg-[#F8F9FA] rounded-lg p-4 max-h-96 overflow-y-auto prose prose-sm max-w-none prose-headings:text-[#1F3A93] prose-headings:text-sm prose-p:text-xs prose-p:text-gray-700 prose-li:text-xs prose-li:text-gray-700 prose-strong:text-[#222222]">
            <ReactMarkdown>{reportMarkdown}</ReactMarkdown>
          </div>
        </motion.div>
      )}
    </div>
  );
}