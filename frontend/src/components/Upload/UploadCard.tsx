import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, Check, Loader2 } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { backendApi } from '../../services/backendApi';
import { Paper } from '../../types';
import toast from 'react-hot-toast';

export function UploadCard() {
  const { dispatch } = useAppContext();
  const navigate = useNavigate();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploaded, setIsUploaded] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState('');
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
      const response = await backendApi.uploadPaper(file, false, controller.signal);
      const newPaper = response.paper;
      setLastUploadedPaper(newPaper);
      setIsUploaded(true);

      dispatch({ type: 'ADD_PAPER', payload: newPaper });
      toast.success(`Paper uploaded — ${newPaper.pages} pages extracted`);
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

  const handleOpenPaper = () => {
    if (lastUploadedPaper) {
      navigate(`/paper/${lastUploadedPaper.paper_id}`);
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
              {isUploading ? 'Processing with AI…' : isUploaded ? `Uploaded: ${fileName}` : 'Drag & drop PDF or click to upload'}
            </p>
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
                  Extracting text & analyzing…
                </span>
              ) : isUploaded ? 'Upload Completed ✓' : 'Upload research paper'}
            </button>
            
            {isUploaded && (
              <div className="flex gap-2">
                <button
                  onClick={handleOpenPaper}
                  className="flex-1 px-4 py-2 text-sm bg-[#1F3A93] text-white rounded-lg hover:bg-[#1a2f7a] transition-colors font-medium"
                >
                  Chat with Paper →
                </button>
                <button
                  onClick={() => {
                    setIsUploaded(false);
                    setFileName('');
                    setLastUploadedPaper(null);
                  }}
                  className="flex-1 px-4 py-2 text-sm text-[#1F3A93] border border-[#1F3A93] rounded-lg hover:bg-[#1F3A93] hover:text-white transition-colors"
                >
                  Upload Another
                </button>
              </div>
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
              <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                {lastUploadedPaper.abstract}
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                  {lastUploadedPaper.pages} pages
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}