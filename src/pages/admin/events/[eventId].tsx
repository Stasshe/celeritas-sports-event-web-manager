import { CustomThemeProvider } from '../../../contexts/ThemeContext';
import { AuthProvider } from '../../../contexts/AuthContext';
import { AdminLayoutProvider } from '../../../contexts/AdminLayoutContext';
import Layout from '../../../components/Layout';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { CssBaseline } from '@mui/material';
import { useRouter } from 'next/router';
import EventEditPage from '../../../components/admin/EventEditPage';
import '../../../i18n/i18n';

export default function EventEdit() {
  const router = useRouter();
  const { eventId } = router.query;

  return eventId ? <EventEditPage eventId={eventId as string} /> : null;
}
