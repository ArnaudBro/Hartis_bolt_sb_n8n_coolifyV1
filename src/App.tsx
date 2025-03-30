import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { FileText, BookTemplate, Settings, ClipboardList } from 'lucide-react';
import Navigation from './components/Navigation';
import NewReport from './pages/NewReport';
import Reports from './pages/Reports';
import ReportEditor from './pages/ReportEditor';
import Templates from './pages/Templates';
import CustomRules from './pages/CustomRules';
import Login from './pages/Login';
import { useAuthStore } from './stores/authStore';

function App() {
  const { session } = useAuthStore();

  if (!session) {
    return <Login />;
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Navigate to="/new-report" replace />} />
            <Route path="/new-report" element={<NewReport />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/reports/:id/edit" element={<ReportEditor />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/rules" element={<CustomRules />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;