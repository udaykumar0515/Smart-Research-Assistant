import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { ChatMessage as ChatMessageType } from '../../types';
import { CitationChip } from './CitationChip';

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  if (message.type === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex justify-end mb-4"
      >
        <div className="bg-[#1F3A93] text-white px-4 py-3 rounded-2xl max-w-xs lg:max-w-md shadow-sm" style={{ borderBottomRightRadius: '4px' }}>
          <p className="text-sm">{message.content}</p>
        </div>
      </motion.div>
    );
  }

  const hasAnswer = Boolean(message.answer);

  const getHostname = (url?: string) => {
    if (!url) return '';
    try {
      return new URL(url).hostname;
    } catch {
      return '';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex justify-start mb-4"
    >
      <div className="bg-white border border-gray-200 rounded-xl p-4 max-w-lg shadow-sm">
        <div className="text-[#222222] mb-3 leading-relaxed text-sm prose prose-sm max-w-none prose-headings:text-[#1F3A93] prose-strong:text-[#222222]">
          {hasAnswer ? (
            <ReactMarkdown>{message.answer!.answer}</ReactMarkdown>
          ) : (
            <p>{message.content}</p>
          )}
        </div>

        {hasAnswer && (
          <div className="text-xs text-gray-400 mb-3 border-t border-gray-100 pt-2">
            {message.answer!.type === 'retrieval' ? '📄 From paper' : '🧠 AI-synthesized'}{message.answer!.used_llm ? ' · LLM' : ''}
          </div>
        )}
        
        {/* Sources section */}
        {message.answer?.citations && message.answer.citations.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-gray-600">Sources:</div>
            <div className="space-y-1">
              {message.answer.citations.map((citation, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <CitationChip citation={citation} />
                  <span className="text-xs text-gray-500">
                    {citation.type === 'paper'
                      ? `Paper — p.${citation.page ?? '-'}`
                      : `${citation.title ?? 'News'}${getHostname(citation.url) ? ` — ${getHostname(citation.url)}` : ''}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}