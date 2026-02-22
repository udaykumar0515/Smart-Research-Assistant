import { motion } from 'framer-motion';
import { FileText, MessageCircle } from 'lucide-react';
import { Paper } from '../../types';

interface PaperCardProps {
  paper: Paper;
  isSelected?: boolean;
  selected?: boolean;
  compact?: boolean;
  onClick?: () => void;
  onChatClick?: () => void;
  showChatButton?: boolean;
}

export function PaperCard({ 
  paper, 
  isSelected = false, 
  selected = false,
  compact = false,
  onClick, 
  onChatClick, 
  showChatButton = false 
}: PaperCardProps) {
  return (
    <motion.div
      className={`bg-white rounded-xl shadow-lg p-5 border cursor-pointer transition-all ${
        selected || isSelected ? 'border-[#1ABC9C] shadow-xl' : 'border-gray-200 hover:border-[#1F3A93] hover:shadow-xl'
      } ${compact ? 'mb-4' : ''}`}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-start space-x-4" onClick={onClick}>
        <FileText className="text-[#1F3A93] mt-1 flex-shrink-0" size={compact ? 20 : 24} />
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold text-[#222222] mb-2 ${compact ? 'text-sm' : 'text-base'} truncate`}>
            {paper.title}
          </h3>
          
          <div className="flex flex-wrap gap-2 text-xs mb-2">
            <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full border border-gray-300">
              {paper.pages} pages
            </span>
          </div>

          {!compact && paper.abstract && (
            <p className="text-xs text-gray-500 line-clamp-2">
              {paper.abstract}
            </p>
          )}
        </div>
      </div>
      
      {showChatButton && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onChatClick?.();
            }}
            className="w-full bg-[#1F3A93] text-white px-4 py-2 rounded-lg hover:bg-[#1a2f7a] transition-colors flex items-center justify-center space-x-2 shadow-sm hover:shadow-md"
          >
            <MessageCircle size={16} />
            <span>Chat with Paper</span>
          </button>
        </div>
      )}
    </motion.div>
  );
}