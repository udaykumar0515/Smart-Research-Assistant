import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Send } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  placeholder?: string;
}

export function ChatInput({ onSendMessage, placeholder = 'Ask a question about this paper… (e.g., "What is the abstract?")' }: ChatInputProps) {
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex space-x-3">
      <div className="flex-1 relative">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-3 rounded-3xl border border-gray-300 focus:ring-2 focus:ring-[#1ABC9C] focus:border-transparent resize-none text-sm"
        />
      </div>
      <motion.button
        type="submit"
        disabled={!message.trim()}
        className="bg-[#1F3A93] text-white px-4 py-3 rounded-3xl hover:bg-[#1a2f7a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm hover:shadow-md"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Send size={20} />
      </motion.button>
    </form>
  );
}