import { motion } from 'framer-motion';
import { Plus, Loader2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useState } from 'react';
import toast from 'react-hot-toast';

export function Usage() {
  const { state, dispatch, purchaseCredits } = useAppContext();
  const [isPurchasing, setIsPurchasing] = useState(false);

  const handleBuyCredits = async () => {
    setIsPurchasing(true);
    try {
      const success = await purchaseCredits(10);
      if (success) {
        dispatch({
          type: 'ADD_USAGE_ENTRY',
          payload: {
            timestamp: new Date().toLocaleString(),
            event: 'Buy credits (mock)',
            credits_used: -10,
            details: 'Added 10 credits'
          }
        });
        toast.success('Successfully purchased 10 credits!');
      } else {
        toast.error('Failed to purchase credits. Please try again.');
      }
    } catch (error) {
      toast.error('An error occurred while purchasing credits.');
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F7FB] py-12">
      <div className="max-w-4xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Credits Balance */}
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="text-5xl font-bold text-[#1F3A93] mb-4">
              {state.credits}
            </div>
            <motion.button
              onClick={handleBuyCredits}
              disabled={isPurchasing || state.isProcessingCredits}
              className="bg-[#1ABC9C] text-white px-6 py-3 rounded-lg hover:bg-[#17a085] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2 mx-auto shadow-sm hover:shadow-md"
              whileHover={{ scale: isPurchasing ? 1 : 1.05 }}
              whileTap={{ scale: isPurchasing ? 1 : 0.95 }}
            >
              {isPurchasing ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Plus size={20} />
                  <span>Buy credits</span>
                </>
              )}
            </motion.button>
            {state.lastTransactionId && (
              <p className="text-xs text-gray-500 mt-2">
                Last transaction: {state.lastTransactionId}
              </p>
            )}
          </div>

          {/* Usage Table */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-[#222222]">Usage History</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#F8F9FA]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Event
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Credits used
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {state.usageEntries.slice().reverse().map((entry, index) => (
                    <motion.tr
                      key={index}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {entry.timestamp}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {entry.event}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={entry.credits_used > 0 ? 'text-red-600' : entry.credits_used < 0 ? 'text-green-600' : 'text-gray-900'}>
                          {entry.credits_used > 0 ? '-' : ''}{Math.abs(entry.credits_used)} credits
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {entry.details}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}