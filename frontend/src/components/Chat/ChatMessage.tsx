import React from 'react';
import { motion } from 'framer-motion';
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

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex justify-start mb-4"
    >
      <div className="bg-white border border-gray-200 rounded-xl p-4 max-w-lg shadow-sm">
        <p className="text-[#222222] mb-3 leading-relaxed text-sm">
          {message.answer?.answer}
        </p>
        
        {/* Method and credits line */}
        <div className="text-xs text-gray-500 mb-3 border-t border-gray-100 pt-2">
          Method: {message.answer?.type === 'retrieval' ? 'Retrieval' : 'Synthesis (LLM fallback)'} — {message.answer?.credits_used} credits.
        </div>
        
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
                      ? `Paper.pdf — p.${citation.page}` 
                      : `${citation.title} — example.com/news${index + 1}`
                    }
                  </span>
                  <span className="text-xs text-blue-600 cursor-pointer hover:underline">
                    (click to view snippet)
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