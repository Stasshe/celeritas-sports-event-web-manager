import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CssBaseline } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import { CustomThemeProvider } from './contexts/ThemeContext';
import { AdminLayoutProvider } from './contexts/AdminLayoutContext';
import './i18n/i18n';

// Pages
import HomePage from './pages/HomePage';
import SportPage from './pages/SportPage';
import AdminPage from './pages/admin/AdminPage';
import EventEditPage from './pages/admin/EventEditPage';
import SportEditPage from './pages/admin/SportEditPage';
import ScoringPage from './pages/admin/ScoringPage';
import AdminHelpPage from './pages/admin/AdminHelpPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';
import ExportPage from './pages/admin/ExportPage';
import BackupPage from './pages/admin/BackupPage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import ScoreboardDetailsPage from './pages/ScoreboardDetailsPage';
import ClassSchedulePage from './pages/ClassSchedulePage'; // 追加: クラススケジュールページ

// Components
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import { Box, CircularProgress } from '@mui/material';

function App() {
  return (
    <CustomThemeProvider>
      <CssBaseline />
      <AuthProvider>
        <AdminLayoutProvider>
          <Router>
            <Routes>
              <Route path="/" element={<Layout><HomePage /></Layout>} />
              <Route path="/sport/:sportId" element={<Layout><SportPage /></Layout>} />
              <Route path="/login" element={<Layout><LoginPage /></Layout>} />
              <Route path="/scoreboard/:eventId" element={<Layout><ScoreboardDetailsPage /></Layout>} />
              <Route path="/class-schedule" element={<Layout><ClassSchedulePage /></Layout>} /> {/* 追加: クラススケジュールルート */}
              
              {/* 管理者用ルートの修正 */}
              <Route path="/admin/*" element={
                <ProtectedRoute>
                  <Layout hideHeader={true}>
                    <React.Suspense fallback={
                      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                        <CircularProgress />
                      </Box>
                    }>
                      <Routes>
                        <Route path="/" element={<AdminPage />} />
                        <Route path="events/:eventId" element={<EventEditPage />} />
                        <Route path="sports/:sportId" element={<SportEditPage />} />
                        <Route path="scoring/:sportId" element={<ScoringPage />} />
                        <Route path="export" element={<ExportPage />} />
                        <Route path="backup" element={<BackupPage />} />
                        <Route path="settings" element={<AdminSettingsPage />} />
                        <Route path="help" element={<AdminHelpPage />} />
                        
                      </Routes>
                    </React.Suspense>
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="*" element={<Layout><NotFoundPage /></Layout>} />
            </Routes>
          </Router>
        </AdminLayoutProvider>
      </AuthProvider>
    </CustomThemeProvider>
  );
}

export default App;
