import { CustomThemeProvider } from '../contexts/ThemeContext';
import { AuthProvider } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import HomePage from '../components/public/HomePage';
import { CssBaseline } from '@mui/material';
import '../i18n/i18n';

export default function Home() {
  return (
    <CustomThemeProvider>
      <CssBaseline />
      <AuthProvider>
        <Layout>
          <HomePage />
        </Layout>
      </AuthProvider>
    </CustomThemeProvider>
  );
}
