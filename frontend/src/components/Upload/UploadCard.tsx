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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadInProgressRef = useRef(false);

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
    // Reset the file input so the same file can be re-selected if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileUpload = async (file: File) => {
    // Prevent duplicate uploads
    if (uploadInProgressRef.current) return;
    uploadInProgressRef.current = true;

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
      uploadInProgressRef.current = false;
    }
  };

  const handleUploadClick = () => {
    if (!isUploaded) {
      fileInputRef.current?.click();
    }
  };

  const handleOpenPaper = () => {
    if (lastUploadedPaper) {
      navigate(`/paper/${lastUploadedPaper.paper_id}`);
    }
  };

  const handleUploadAnother = () => {
    setIsUploaded(false);
    setFileName('');
    setLastUploadedPaper(null);
    fileInputRef.current?.click();
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
            <div className="bg-[#EEF6F4] rounded-full p-4">
              {isUploading ? (
                <Loader2 size={40} className="text-[#1ABC9C] animate-spin" />
              ) : isUploaded ? (
                <Check size={40} className="text-[#1ABC9C]" />
              ) : (
                <FileText size={40} className="text-[#1ABC9C]" />
              )}
            </div>
          </div>
          
          <div>
            {isUploading ? (
              <>
                <p className="text-lg font-medium text-[#222222]">Uploading & extracting…</p>
                <p className="text-sm text-gray-500 mt-1">{fileName}</p>
              </>
            ) : isUploaded && lastUploadedPaper ? (
              <>
                <p className="text-lg font-medium text-[#222222]">{lastUploadedPaper.title}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {lastUploadedPaper.pages} pages extracted
                  {lastUploadedPaper.abstract ? ` · ${lastUploadedPaper.abstract.slice(0, 80)}…` : ''}
                </p>
              </>
            ) : (
              <>
                <p className="text-lg font-medium text-[#222222]">Upload research paper</p>
                <p className="text-sm text-gray-500 mt-1">
                  Drag & drop a PDF here, or click to browse
                </p>
              </>
            )}
          </div>

          <div>
            {isUploaded ? (
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleOpenPaper}
                  className="bg-[#1F3A93] text-white px-5 py-2.5 rounded-lg hover:bg-[#1a2f7a] transition-colors text-sm font-medium"
                >
                  Chat with Paper →
                </button>
                <button
                  onClick={handleUploadAnother}
                  className="bg-gray-100 text-[#222222] px-5 py-2.5 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                >
                  Upload Another
                </button>
              </div>
            ) : (
              <button
                onClick={handleUploadClick}
                disabled={isUploading}
                className="bg-[#1F3A93] text-white px-6 py-2.5 rounded-lg hover:bg-[#1a2f7a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {isUploading ? 'Uploading…' : 'Select PDF'}
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            id="file-input"
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
      </motion.div>
    </div>
  );
}