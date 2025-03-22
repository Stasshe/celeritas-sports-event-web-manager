import type { AppProps } from 'next/app';
import { CustomThemeProvider } from '../../contexts/ThemeContext';
import { AuthProvider } from '../../contexts/AuthContext';
import { CssBaseline } from '@mui/material';
import AdminAppLayout from '../../components/admin/AdminAppLayout';
import '../../i18n/i18n';

export default function AdminApp({ Component, pageProps }: AppProps) {
  return (
    <CustomThemeProvider>
      <CssBaseline />
      <AuthProvider>
        <AdminAppLayout>
          <Component {...pageProps} />
        </AdminAppLayout>
      </AuthProvider>
    </CustomThemeProvider>
  );
}
