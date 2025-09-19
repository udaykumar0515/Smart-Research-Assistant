import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export function Usage() {
  const { state, dispatch } = useAppContext();

  const handleBuyCredits = () => {
    dispatch({ type: 'SET_CREDITS', payload: state.credits + 10 });
    dispatch({
      type: 'ADD_USAGE_ENTRY',
      payload: {
        timestamp: new Date().toLocaleString(),
        event: 'Buy credits (mock)',
        credits_used: -10,
        details: 'Added 10 credits'
      }
    });
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
              className="bg-[#1ABC9C] text-white px-6 py-3 rounded-lg hover:bg-[#17a085] transition-colors flex items-center space-x-2 mx-auto shadow-sm hover:shadow-md"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Plus size={20} />
              <span>Buy credits</span>
            </motion.button>
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