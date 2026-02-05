import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { DarkModeProvider, useDarkMode } from './context/DarkModeContext';
import { LanguageProvider } from './context/LanguageContext';
import { AppDataProvider } from './context/AppDataContext';
import { NavigationBlockerProvider } from './context/NavigationBlockerContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Projects from './pages/Projects';
import Invoices from './pages/Invoices';
import Clients from './pages/Clients';
import Settings from './pages/Settings';
import ProjectDetail from './pages/ProjectDetail';
import Dennik from './pages/Dennik';
import Login from './components/Login';

import './App.css';

function AppContent() {
  const { user, loading } = useAuth();
  const { darkMode } = useDarkMode();

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'
        }`}>
        <div className={`text-xl ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Loading...
        </div>
      </div>
    );
  }

  if (!user || recoveryMode) {
    return <Login />;
  }

  return (
    <AppDataProvider>
      <NavigationBlockerProvider>
        <Router>
          <div className="App">
            <Layout>
              <Routes>
                <Route path="/" element={<Navigate to="/projects" replace />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/projects/:id" element={<ProjectDetail />} />
                <Route path="/dennik" element={<Dennik />} />
                <Route path="/invoices" element={<Invoices />} />
                <Route path="/clients" element={<Clients />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </Layout>

          </div>
        </Router>
      </NavigationBlockerProvider>
    </AppDataProvider>
  );
}

function App() {
  return (
    <DarkModeProvider>
      <LanguageProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </LanguageProvider>
    </DarkModeProvider>
  );
}

export default App;
