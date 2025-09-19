import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAppContext } from '../context/AppContext';
import { UploadCard } from '../components/Upload/UploadCard';

export function Landing() {
  const navigate = useNavigate();
  const { state } = useAppContext();

  return (
    <div className="min-h-screen bg-[#F6F7FB] py-12">
      <div className="max-w-7xl mx-auto px-6">
        {/* Navigation Bar for uploaded papers */}
        {state.papers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="bg-[#1ABC9C] text-white px-3 py-1 rounded-full text-sm font-medium">
                    {state.papers.length} Paper{state.papers.length !== 1 ? 's' : ''}
                  </div>
                  <div className="text-gray-600">
                    Ready to chat with your research papers
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="bg-[#1F3A93] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#1a2f7a] transition-colors shadow-sm hover:shadow-md flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span>View Dashboard</span>
                  </button>
                  <button
                    onClick={() => navigate('/usage')}
                    className="text-[#1F3A93] hover:text-[#1a2f7a] font-medium transition-colors"
                  >
                    Usage
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center min-h-[calc(100vh-8rem)]">
          {/* Left Column - Hero Illustration */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="bg-gradient-to-br from-[#1F3A93] to-[#1ABC9C] rounded-2xl p-12 text-center max-w-md mx-auto">
              <div className="text-white space-y-6">
                <div className="w-32 h-32 bg-white bg-opacity-20 rounded-full mx-auto flex items-center justify-center">
                  <svg viewBox="0 0 100 100" className="w-16 h-16 fill-current">
                    <rect x="20" y="30" width="60" height="40" rx="4" fill="currentColor" opacity="0.8"/>
                    <circle cx="35" cy="45" r="8" fill="currentColor"/>
                    <rect x="50" y="40" width="25" height="3" fill="currentColor"/>
                    <rect x="50" y="47" width="20" height="3" fill="currentColor"/>
                    <path d="M70 20 L80 30 L70 40 Z" fill="currentColor"/>
                  </svg>
                </div>
                <p className="text-lg font-medium opacity-90">
                  Person at desk with laptop, stack of research papers and magnifying glass, chat bubble
                </p>
              </div>
            </div>
          </motion.div>

          {/* Right Column - Upload Card */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-md mx-auto lg:mx-0"
          >
            {state.papers.length > 0 && (
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-[#222222] mb-2">
                  Upload More Papers
                </h3>
                <p className="text-sm text-gray-600">
                  Add additional research papers to your collection
                </p>
              </div>
            )}
            <UploadCard />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
