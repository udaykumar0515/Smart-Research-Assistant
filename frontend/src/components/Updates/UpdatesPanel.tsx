import { useState } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Loader2, FileText, Download, ChevronDown } from 'lucide-react';
import { Paper } from '../../types';
import { toast } from 'react-hot-toast';
import { backendApi } from '../../services/backendApi';

interface UpdatesPanelProps {
  paper: Paper;
  selectedPapers?: Paper[];
  multiPaperMode?: boolean;
}

export function UpdatesPanel({ paper, selectedPapers = [], multiPaperMode = false }: UpdatesPanelProps) {
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportMarkdown, setReportMarkdown] = useState<string | null>(null);
  const [reportPaperId, setReportPaperId] = useState<string>('all');
  const [showPaperDropdown, setShowPaperDropdown] = useState(false);

  const activePapers = multiPaperMode && selectedPapers.length > 0 ? selectedPapers : [paper];
  const totalPages = activePapers.reduce((sum, p) => sum + p.pages, 0);

  const handleGenerateReport = async () => {
    if (isGeneratingReport) return;
    setIsGeneratingReport(true);
    try {
      if (reportPaperId === 'all' && multiPaperMode) {
        // Generate reports for all selected papers and combine
        const parts: string[] = [];
        for (const p of activePapers) {
          const res = await backendApi.generateReport(p.paper_id);
          if (res.report_markdown) {
            parts.push(`## 📄 ${p.title}\n\n${res.report_markdown}`);
          }
        }
        if (parts.length > 0) {
          setReportMarkdown(parts.join('\n\n---\n\n'));
          toast.success('Combined report generated');
        } else {
          toast.error('No report content received');
        }
      } else {
        const targetId = reportPaperId === 'all' ? paper.paper_id : reportPaperId;
        const res = await backendApi.generateReport(targetId);
        if (res.report_markdown) {
          setReportMarkdown(res.report_markdown);
          toast.success('Report generated');
        } else {
          toast.error('No report content received');
        }
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error(e?.message || 'Failed to generate report');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!reportMarkdown) return;
    // Create a printable HTML document and trigger browser print-to-PDF
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups for PDF download');
      return;
    }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Research Report</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #222; line-height: 1.6; }
          h1 { color: #1F3A93; border-bottom: 2px solid #1ABC9C; padding-bottom: 8px; }
          h2 { color: #1F3A93; margin-top: 24px; }
          h3 { color: #333; }
          hr { border: none; border-top: 1px solid #ddd; margin: 24px 0; }
          p { margin: 8px 0; }
          ul, ol { padding-left: 24px; }
          strong { color: #1F3A93; }
          code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }
          blockquote { border-left: 3px solid #1ABC9C; padding-left: 12px; color: #555; margin: 12px 0; }
        </style>
      </head>
      <body>
        ${document.querySelector('.report-render-area')?.innerHTML || '<p>Report content</p>'}
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-5 h-fit">
      <h3 className="text-base font-semibold text-[#222222] mb-4">Paper Tools</h3>

      {/* Per-paper page counts */}
      <div className="space-y-2 mb-5">
        {activePapers.length > 1 ? (
          <>
            <div className="bg-[#1F3A93] bg-opacity-5 rounded-lg p-3 mb-2">
              <div className="text-xs text-gray-500 mb-1">Total Pages</div>
              <div className="font-bold text-lg text-[#1F3A93]">{totalPages}</div>
            </div>
            {activePapers.map((p) => (
              <div key={p.paper_id} className="flex items-center justify-between bg-[#F8F9FA] rounded-lg p-2.5">
                <span className="text-xs text-gray-700 truncate flex-1 mr-2" title={p.title}>{p.title}</span>
                <span className="text-xs font-semibold text-[#1F3A93] whitespace-nowrap">{p.pages} pg</span>
              </div>
            ))}
          </>
        ) : (
          <div className="bg-[#F8F9FA] rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">Pages</div>
            <div className="font-semibold text-[#222222]">{paper.pages}</div>
          </div>
        )}
      </div>

      {/* Report Paper Selector (multi-paper mode) */}
      {multiPaperMode && activePapers.length > 1 && (
        <div className="mb-3 relative">
          <button
            onClick={() => setShowPaperDropdown(!showPaperDropdown)}
            className="w-full flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-xs"
          >
            <span className="text-gray-700 truncate">
              {reportPaperId === 'all' ? 'All papers (combined)' : activePapers.find(p => p.paper_id === reportPaperId)?.title || 'Select'}
            </span>
            <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />
          </button>
          {showPaperDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 overflow-hidden">
              <button
                onClick={() => { setReportPaperId('all'); setShowPaperDropdown(false); }}
                className={`w-full text-left p-2 text-xs hover:bg-gray-50 ${reportPaperId === 'all' ? 'bg-[#EEF6F4] text-[#1ABC9C] font-medium' : ''}`}
              >
                📚 All papers (combined report)
              </button>
              {activePapers.map((p) => (
                <button
                  key={p.paper_id}
                  onClick={() => { setReportPaperId(p.paper_id); setShowPaperDropdown(false); }}
                  className={`w-full text-left p-2 text-xs hover:bg-gray-50 truncate ${reportPaperId === p.paper_id ? 'bg-[#EEF6F4] text-[#1ABC9C] font-medium' : ''}`}
                >
                  📄 {p.title}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Generate Report Button */}
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

      {/* Report Display */}
      {reportMarkdown && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-600">Report:</span>
            <button
              onClick={handleDownloadPdf}
              className="flex items-center gap-1 text-xs text-[#1F3A93] hover:text-[#1ABC9C] transition-colors"
              title="Download as PDF"
            >
              <Download size={13} />
              PDF
            </button>
          </div>
          <div className="report-render-area bg-[#F8F9FA] rounded-lg p-4 max-h-[60vh] overflow-y-auto prose prose-sm max-w-none prose-headings:text-[#1F3A93] prose-headings:text-sm prose-p:text-xs prose-p:text-gray-700 prose-li:text-xs prose-li:text-gray-700 prose-strong:text-[#222222]">
            <ReactMarkdown>{reportMarkdown}</ReactMarkdown>
          </div>
        </motion.div>
      )}
    </div>
  );
}