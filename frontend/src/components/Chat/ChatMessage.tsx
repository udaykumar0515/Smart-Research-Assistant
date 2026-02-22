import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { ChatMessage as ChatMessageType } from '../../types';

interface ChatMessageProps {
  message: ChatMessageType;
}

/**
 * Highlights paper title references like [Paper Title] or **[Paper Title]**
 * with a styled badge inside rendered markdown.
 */
function highlightPaperRefs(text: string, paperTitles: string[]): string {
  if (!paperTitles.length) return text;
  let result = text;
  for (const title of paperTitles) {
    // Match patterns like [title], **[title]**, **title**
    const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Replace **[Title]** or [Title] with a highlighted version
    result = result.replace(
      new RegExp(`\\*\\*\\[${escaped}\\]\\*\\*`, 'g'),
      `**📄 ${title}**`
    );
    result = result.replace(
      new RegExp(`\\[${escaped}\\]`, 'g'),
      `**📄 ${title}**`
    );
  }
  return result;
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

  // Collect paper titles from citations for highlighting
  const paperTitles = message.answer?.citations
    ?.filter(c => c.type === 'paper' && c.title)
    .map(c => c.title!) || [];

  // Process answer text to highlight paper references
  const processedAnswer = hasAnswer && message.answer!.answer
    ? highlightPaperRefs(message.answer!.answer, paperTitles)
    : message.content;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex justify-start mb-4"
    >
      <div className="bg-white border border-gray-200 rounded-xl p-4 max-w-2xl shadow-sm w-full">
        {/* Answer content with markdown rendering */}
        <div className="text-[#222222] mb-3 leading-relaxed text-sm prose prose-sm max-w-none prose-headings:text-[#1F3A93] prose-strong:text-[#1F3A93]">
          {hasAnswer ? (
            <ReactMarkdown>{processedAnswer}</ReactMarkdown>
          ) : (
            <p>{message.content}</p>
          )}
        </div>

        {/* Answer metadata + paper badges */}
        {hasAnswer && (
          <div className="border-t border-gray-100 pt-3 mt-2">
            <div className="flex items-center flex-wrap gap-2">
              {/* Answer type badge */}
              <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                {message.answer!.type === 'retrieval' ? '📄 From paper' : '🧠 AI-synthesized'}
                {message.answer!.used_llm && ' · LLM'}
              </span>

              {/* Paper citation badges (inline, no popup) */}
              {message.answer!.citations && message.answer!.citations.length > 0 && (
                <>
                  <span className="text-xs text-gray-400">|</span>
                  {message.answer!.citations
                    .filter(c => c.type === 'paper')
                    .map((citation, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 text-xs bg-[#EEF6F4] text-[#1ABC9C] px-2.5 py-1 rounded-full font-medium border border-[#1ABC9C] border-opacity-30"
                      >
                        📄 {citation.title || 'Paper'}
                      </span>
                    ))}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}