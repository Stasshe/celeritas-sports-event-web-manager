import dynamic from 'next/dynamic';
import { AppProps } from 'next/app';
import { CssBaseline } from '@mui/material';
import '../i18n/i18n';
import '../globals.css';

// クライアントサイドのみで動作するコンポーネント
const ClientOnly = dynamic(
  () => import('../components/ClientOnly'),
  { ssr: false }
);

// クライアントサイドのみで動作するAuthProvider
const AuthProvider = dynamic(
  () => import('../contexts/AuthContext').then(mod => mod.AuthProvider),
  { ssr: false }
);

// クライアントサイドのみで動作するThemeProvider
const CustomThemeProvider = dynamic(
  () => import('../contexts/ThemeContext').then(mod => mod.CustomThemeProvider),
  { ssr: false }
);

export default function MyApp({ Component, pageProps, router }: AppProps) {
  // 管理者ページかどうかをチェック
  const isAdminPage = router.pathname.startsWith('/admin');

  return (
    <ClientOnly>
      <CustomThemeProvider>
        <CssBaseline />
        <AuthProvider>
          <Component {...pageProps} />
        </AuthProvider>
      </CustomThemeProvider>
    </ClientOnly>
  );
}
