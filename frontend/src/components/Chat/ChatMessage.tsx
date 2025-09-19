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
        
        {message.answer?.citations && message.answer.citations.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {message.answer.citations.map((citation, index) => (
              <CitationChip key={index} citation={citation} />
            ))}
          </div>
        )}
        
        {message.answer?.used_llm && (
          <div className="text-xs text-gray-500 italic">
            Synthesis produced — {message.answer.credits_used} credits
          </div>
        )}
      </div>
    </motion.div>
  );
}