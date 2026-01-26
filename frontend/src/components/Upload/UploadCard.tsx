import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Check, Loader2 } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { backendApi } from '../../services/backendApi';
import { Paper } from '../../types';
import toast from 'react-hot-toast';

export function UploadCard() {
  const { dispatch } = useAppContext();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploaded, setIsUploaded] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [createSubscription, setCreateSubscription] = useState(true);
  const [lastUploadedPaper, setLastUploadedPaper] = useState<Paper | null>(null);
  const uploadAbortRef = useRef<AbortController | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    uploadAbortRef.current?.abort();
    const controller = new AbortController();
    uploadAbortRef.current = controller;

    setFileName(file.name);
    setIsUploading(true);
    setIsUploaded(false);

    try {
      const response = await backendApi.uploadPaper(file, createSubscription, controller.signal);
      const newPaper = response.paper;
      setLastUploadedPaper(newPaper);
      setIsUploaded(true);

      dispatch({ type: 'ADD_PAPER', payload: newPaper });
      dispatch({
        type: 'ADD_USAGE_ENTRY',
        payload: {
          timestamp: new Date().toLocaleString(),
          event: 'Upload Paper',
          credits_used: 0,
          details: newPaper.title
        }
      });

      toast.success('Paper uploaded successfully');
    } catch (error: unknown) {
      const err = error as { name?: string; message?: string };
      if (err?.name === 'AbortError') return;
      toast.error(err?.message || 'Upload failed');
      setIsUploaded(false);
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadClick = () => {
    if (!isUploaded) {
      document.getElementById('file-input')?.click();
    }
  };

  return (
    <div className="space-y-6">
      <motion.div
        className={`bg-white border-2 border-dashed rounded-xl p-8 text-center transition-all shadow-lg ${
          isDragging
            ? 'border-[#1ABC9C] bg-[#F0FDFA]'
            : 'border-gray-300 hover:border-[#1ABC9C] hover:shadow-xl'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="space-y-6">
          <div className="flex justify-center">
            {isUploaded ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-[#1ABC9C]"
              >
                <Check size={48} />
              </motion.div>
            ) : (
              <div className="text-6xl">📄</div>
            )}
          </div>
          
          <div>
            <h3 className="text-2xl font-semibold text-[#222222] mb-2">
              Upload research paper
            </h3>
            <p className="text-gray-600 text-lg">
              {isUploaded ? `Uploaded: ${fileName}` : 'Drag & drop PDF or click to upload'}
            </p>
          </div>

          <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
            <input
              type="checkbox"
              id="subscription"
              checked={createSubscription}
              onChange={(e) => setCreateSubscription(e.target.checked)}
              className="w-5 h-5 text-[#1ABC9C] border-gray-300 rounded focus:ring-[#1ABC9C]"
            />
            <label htmlFor="subscription">Create subscription for updates</label>
          </div>

          <input
            id="file-input"
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="space-y-2">
            <button
              onClick={handleUploadClick}
              disabled={isUploaded || isUploading}
              className={`w-full px-6 py-3 rounded-lg font-medium shadow-sm transition-all ${
                isUploaded
                  ? 'bg-[#1ABC9C] text-white cursor-default'
                  : 'bg-[#1F3A93] text-white hover:bg-[#1a2f7a] hover:shadow-lg active:scale-95'
              }`}
            >
              {isUploading ? (
                <span className="inline-flex items-center justify-center w-full">
                  <Loader2 size={18} className="animate-spin mr-2" />
                  Uploading...
                </span>
              ) : isUploaded ? 'Upload Completed' : 'Upload research paper'}
            </button>
            
            {isUploaded && (
              <button
                onClick={() => {
                  setIsUploaded(false);
                  setFileName('');
                }}
                className="w-full px-4 py-2 text-sm text-[#1F3A93] border border-[#1F3A93] rounded-lg hover:bg-[#1F3A93] hover:text-white transition-colors"
              >
                Upload Another Paper
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {isUploaded && lastUploadedPaper && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-lg p-6 border border-gray-200"
        >
          <div className="flex items-start space-x-4">
            <FileText className="text-[#1F3A93] mt-1" size={24} />
            <div className="flex-1">
              <h4 className="font-semibold text-[#222222] mb-2">
                {lastUploadedPaper.title}
              </h4>
              <p className="text-gray-600 text-sm mb-3">
                By: {lastUploadedPaper.authors.join(', ')}
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="bg-[#EEF6F4] text-[#1ABC9C] px-3 py-1 rounded-full border border-[#1ABC9C]">
                  Subscription: {lastUploadedPaper.subscription_enabled ? 'ON' : 'OFF'}
                </span>
                <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                  Pages: {lastUploadedPaper.pages}
                </span>
                <span className="bg-[#1ABC9C] text-white px-3 py-1 rounded-full animate-pulse">
                  {lastUploadedPaper.updates_count} updates
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}