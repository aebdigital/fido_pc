import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { DarkModeProvider } from './context/DarkModeContext';
import { LanguageProvider } from './context/LanguageContext';
import { AppDataProvider } from './context/AppDataContext';
import { NavigationBlockerProvider } from './context/NavigationBlockerContext';
import Layout from './components/Layout';
import Projects from './pages/Projects';
import Invoices from './pages/Invoices';
import Clients from './pages/Clients';
import Settings from './pages/Settings';
import ProjectDetail from './pages/ProjectDetail';
import './App.css';

function App() {
  return (
    <DarkModeProvider>
      <LanguageProvider>
        <AppDataProvider>
          <NavigationBlockerProvider>
            <Router>
              <div className="App">
                <Layout>
                  <Routes>
                    <Route path="/" element={<Projects />} />
                    <Route path="/projects" element={<Projects />} />
                    <Route path="/projects/:id" element={<ProjectDetail />} />
                    <Route path="/invoices" element={<Invoices />} />
                    <Route path="/clients" element={<Clients />} />
                    <Route path="/settings" element={<Settings />} />
                  </Routes>
                </Layout>
              </div>
            </Router>
          </NavigationBlockerProvider>
        </AppDataProvider>
      </LanguageProvider>
    </DarkModeProvider>
  );
}

export default App;
