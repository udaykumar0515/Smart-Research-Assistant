import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import ReactMarkdown from 'react-markdown';
import { Download, ArrowLeft } from 'lucide-react';

export function ReportPage() {
  const { paperId } = useParams<{ paperId: string }>();
  const navigate = useNavigate();
  const { state } = useAppContext();
  const [reportMarkdown, setReportMarkdown] = useState<string | null>(null);

  const paper = state.papers.find(p => p.paper_id === paperId);

  useEffect(() => {
    // Try to get report from sessionStorage (passed from UpdatesPanel)
    const stored = sessionStorage.getItem('report_markdown');
    if (stored) {
      setReportMarkdown(stored);
    }
  }, []);

  const handleDownloadPdf = () => {
    if (!reportMarkdown) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const renderedHtml = document.getElementById('report-content')?.innerHTML || '';
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Research Report${paper ? ` — ${paper.title}` : ''}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 48px; max-width: 820px; margin: 0 auto; color: #222; line-height: 1.7; font-size: 14px; }
          h1 { color: #1F3A93; font-size: 22px; border-bottom: 2px solid #1ABC9C; padding-bottom: 8px; margin-top: 32px; }
          h2 { color: #1F3A93; font-size: 18px; margin-top: 28px; }
          h3 { color: #333; font-size: 15px; margin-top: 20px; }
          hr { border: none; border-top: 1px solid #ddd; margin: 28px 0; }
          p { margin: 10px 0; }
          ul, ol { padding-left: 24px; }
          li { margin: 4px 0; }
          strong { color: #1F3A93; }
          code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }
          blockquote { border-left: 3px solid #1ABC9C; padding-left: 14px; color: #555; margin: 14px 0; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>${renderedHtml}</body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  if (!paper) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Paper not found</h2>
          <button onClick={() => navigate('/')} className="text-[#1F3A93] hover:text-[#1ABC9C]">← Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F7FB]">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-16 z-40">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/paper/${paperId}`)}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#1F3A93] transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Chat
          </button>
          <div className="h-5 w-px bg-gray-300" />
          <h1 className="text-lg font-semibold text-[#222222]">
            Report: {paper.title}
          </h1>
        </div>
        {reportMarkdown && (
          <button
            onClick={handleDownloadPdf}
            className="flex items-center gap-2 bg-[#1F3A93] text-white px-4 py-2 rounded-lg hover:bg-[#1a2f7a] transition-colors text-sm font-medium"
          >
            <Download size={16} />
            Download PDF
          </button>
        )}
      </div>

      {/* Report content */}
      <div className="max-w-4xl mx-auto px-8 py-8">
        {reportMarkdown ? (
          <div
            id="report-content"
            className="bg-white rounded-xl shadow-lg p-10 prose prose-lg max-w-none prose-headings:text-[#1F3A93] prose-strong:text-[#1F3A93] prose-p:text-gray-700 prose-li:text-gray-700 prose-p:leading-relaxed"
          >
            <ReactMarkdown>{reportMarkdown}</ReactMarkdown>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-10 text-center text-gray-500">
            <p>No report generated yet. Go back and generate a report first.</p>
          </div>
        )}
      </div>
    </div>
  );
}
