import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Box, CircularProgress } from '@mui/material';
import Layout from '../Layout';
import ProtectedRoute from '../ProtectedRoute';
import { AdminLayoutProvider } from '../../contexts/AdminLayoutContext';
import AdminNavigation from './AdminNavigation';

interface AdminAppLayoutProps {
  children: React.ReactNode;
}

export default function AdminAppLayout({ children }: AdminAppLayoutProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // ページ遷移時のローディング状態を管理
  useEffect(() => {
    const handleStart = (url: string) => {
      if (url.startsWith('/admin')) {
        setLoading(true);
      }
    };
    const handleComplete = () => setLoading(false);

    router.events.on('routeChangeStart', handleStart);
    router.events.on('routeChangeComplete', handleComplete);
    router.events.on('routeChangeError', handleComplete);

    return () => {
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleComplete);
      router.events.off('routeChangeError', handleComplete);
    };
  }, [router]);

  return (
    <ProtectedRoute>
      <AdminLayoutProvider>
        <Layout hideHeader={true}>
          <Box sx={{ display: 'flex', height: '100vh' }}>
            <AdminNavigation />
            <Box component="main" sx={{ flexGrow: 1, p: 3, overflow: 'auto' }}>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <CircularProgress />
                </Box>
              ) : (
                children
              )}
            </Box>
          </Box>
        </Layout>
      </AdminLayoutProvider>
    </ProtectedRoute>
  );
}
