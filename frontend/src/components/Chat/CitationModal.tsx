import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink } from 'lucide-react';
import { Citation } from '../../types';

interface CitationModalProps {
  citation: Citation;
  isOpen: boolean;
  onClose: () => void;
}

export function CitationModal({ citation, isOpen, onClose }: CitationModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-semibold text-[#222222]">
                {citation.type === 'paper' ? 'Paper Citation' : 'News Citation'}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              {citation.type === 'paper' && (
                <div className="text-sm text-gray-600">
                  Page {citation.page}
                </div>
              )}
              
              {citation.title && (
                <h4 className="font-medium text-[#222222]">
                  {citation.title}
                </h4>
              )}
              
              <p className="text-gray-700 leading-relaxed">
                {citation.snippet}
              </p>
              
              <div className="flex justify-end space-x-3 pt-4 border-t">
                {citation.type === 'paper' ? (
                  <button className="flex items-center space-x-2 text-[#1F3A93] hover:text-[#1ABC9C] transition-colors">
                    <ExternalLink size={16} />
                    <span>Go to page</span>
                  </button>
                ) : (
                  <button className="flex items-center space-x-2 text-[#1F3A93] hover:text-[#1ABC9C] transition-colors">
                    <ExternalLink size={16} />
                    <span>Read article</span>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}