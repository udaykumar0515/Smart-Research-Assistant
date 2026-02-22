import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { Navbar } from './components/Layout/Navbar';
import { Toast } from './components/Common/Toast';
import { Landing } from './pages/Landing';
import { Dashboard } from './pages/Dashboard';
import { PaperDetail } from './pages/PaperDetail';

function App() {
  return (
    <AppProvider>
      <Router>
        <div className="min-h-screen bg-[#F6F7FB] pt-16">
          <Navbar />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/paper/:paperId" element={<PaperDetail />} />
          </Routes>
          <Toast />
        </div>
      </Router>
    </AppProvider>
  );
}

export default App;