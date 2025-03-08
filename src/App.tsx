import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CssBaseline } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import { CustomThemeProvider } from './contexts/ThemeContext';
import './i18n/i18n';

// Pages
import HomePage from './pages/HomePage';
import SportPage from './pages/SportPage';
import AdminPage from './pages/admin/AdminPage';
import ScoringPage from './pages/admin/ScoringPage';
import AdminHelpPage from './pages/admin/AdminHelpPage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';

// Components
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

function App() {
  return (
    <CustomThemeProvider>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/sport/:sportId" element={<SportPage />} />
              <Route path="/login" element={<LoginPage />} />
              
              {/* 管理者用ルート - 認証必須 */}
              <Route 
                path="/admin/*" 
                element={
                  <ProtectedRoute>
                    <Routes>
                      <Route path="/" element={<AdminPage />} />
                      <Route path="/scoring/:sportId" element={<ScoringPage />} />
                      <Route path="/help" element={<AdminHelpPage />} />
                    </Routes>
                  </ProtectedRoute>
                } 
              />
              
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Layout>
        </Router>
      </AuthProvider>
    </CustomThemeProvider>
  );
}

export default App;
