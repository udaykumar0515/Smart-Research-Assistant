import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Bell, MessageCircle } from 'lucide-react';
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
          <p className={`text-gray-600 mb-3 ${compact ? 'text-xs' : 'text-sm'}`}>
            By: {paper.authors.join(', ')}
          </p>
          
          <div className="flex flex-wrap gap-2 text-xs mb-3">
            <span className={`px-3 py-1 rounded-full border ${
              paper.subscription_enabled 
                ? 'bg-[#EEF6F4] text-[#1ABC9C] border-[#1ABC9C]' 
                : 'bg-gray-100 text-gray-600 border-gray-300'
            }`}>
              Subscription: {paper.subscription_enabled ? 'ON' : 'OFF'}
            </span>
            <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full border border-gray-300">
              Pages: {paper.pages}
            </span>
          </div>

          {paper.updates_count > 0 && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center space-x-2 text-sm text-[#1ABC9C]"
            >
              <Bell size={16} className="animate-pulse" />
              <span className="font-medium bg-[#1ABC9C] text-white px-2 py-1 rounded-full">
                {paper.updates_count} new update{paper.updates_count !== 1 ? 's' : ''}
              </span>
            </motion.div>
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
            <span>Open Paper</span>
          </button>
        </div>
      )}
    </motion.div>
  );
}