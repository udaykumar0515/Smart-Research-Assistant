import { Link } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';

export function Navbar() {
  const { state } = useAppContext();

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 fixed top-0 left-0 right-0 z-50">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <Link to="/" className="text-[#1F3A93] hover:text-[#1ABC9C] transition-colors">
          <span className="text-2xl font-semibold">Smart Research Assistant</span>
        </Link>
        
        <div className="flex items-center space-x-6">
          {state.papers.length > 0 && (
            <Link
              to="/dashboard"
              className="text-[#1F3A93] hover:text-[#1ABC9C] font-medium transition-colors text-sm"
            >
              Dashboard
            </Link>
          )}
          <div className="bg-[#EEF6F4] text-[#1ABC9C] px-4 py-2 rounded-full border border-[#1ABC9C] font-medium text-sm">
            {state.papers.length} Paper{state.papers.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
    </nav>
  );
}