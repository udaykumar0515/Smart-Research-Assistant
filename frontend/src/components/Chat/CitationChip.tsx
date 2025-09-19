import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Citation } from '../../types';
import { CitationModal } from './CitationModal';

interface CitationChipProps {
  citation: Citation;
}

export function CitationChip({ citation }: CitationChipProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const getChipText = () => {
    if (citation.type === 'paper') {
      return `Paper.pdf — p.${citation.page}`;
    } else {
      return `News: ${citation.title}`;
    }
  };

  return (
    <>
      <motion.button
        onClick={() => setIsModalOpen(true)}
        className="bg-[#EEF6F4] text-[#1ABC9C] px-3 py-1 rounded-full text-sm font-medium hover:bg-[#D4F1ED] transition-colors"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {getChipText()}
      </motion.button>
      
      <CitationModal
        citation={citation}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}