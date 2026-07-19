import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CssBaseline } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import { CustomThemeProvider } from './contexts/ThemeContext';
import { AdminLayoutProvider } from './admin/context/AdminLayoutContext';

// Pages
import HomePage from './general/pages/HomePage';
import SportPage from './general/pages/SportPage';
import AdminPage from './admin/pages/AdminPage';
import EventEditPage from './admin/pages/EventEditPage';
import SportEditPage from './admin/pages/SportEditPage';
import ScoringPage from './admin/pages/ScoringPage';
import AdminSettingsPage from './admin/pages/AdminSettingsPage';
import ExportPage from './admin/pages/ExportPage';
import BackupPage from './admin/pages/BackupPage';
import LoginPage from './general/pages/LoginPage';
import NotFoundPage from './general/pages/NotFoundPage';
import ScoreboardDetailsPage from './general/pages/ScoreboardDetailsPage';
import ClassSchedulePage from './general/pages/ClassSchedulePage'; // 追加: クラススケジュールページ

// Components
import ProtectedRoute from './admin/components/ProtectedRoute';
import PublicLayout from './general/components/PublicLayout';
import AdminLayout from './admin/components/AdminLayout';
import ErrorScreen from './ErrorScreen';
import { firebaseInitializationError } from './config/firebase';

function App() {
  if (firebaseInitializationError) {
    return <ErrorScreen error={firebaseInitializationError} />;
  }

  return (
    <CustomThemeProvider>
      <CssBaseline />
      <AuthProvider>
        <Router
          future={{
            v7_relativeSplatPath: true,
            v7_startTransition: true
          }}
        >
          <Routes>
            <Route element={<PublicLayout />}>
              <Route index element={<HomePage />} />
              <Route path="sport/:sportId" element={<SportPage />} />
              <Route path="login" element={<LoginPage />} />
              <Route path="scoreboard/:eventId" element={<ScoreboardDetailsPage />} />
              <Route path="class-schedule" element={<ClassSchedulePage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>

            <Route path="admin" element={<ProtectedRoute />}>
              <Route
                element={(
                  <AdminLayoutProvider>
                    <AdminLayout />
                  </AdminLayoutProvider>
                )}
              >
                <Route index element={<AdminPage />} />
                <Route path="events/:eventId" element={<EventEditPage />} />
                <Route path="sports/:sportId" element={<SportEditPage />} />
                <Route path="scoring/:sportId" element={<ScoringPage />} />
                <Route path="export" element={<ExportPage />} />
                <Route path="backup" element={<BackupPage />} />
                <Route path="settings" element={<AdminSettingsPage />} />
              </Route>
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </CustomThemeProvider>
  );
}

export default App;
