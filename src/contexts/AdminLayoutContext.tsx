import React, { createContext, useContext, useRef, useCallback, useState, useEffect } from 'react';
import { Snackbar, Alert, Box, Typography, CircularProgress } from '@mui/material';
import { Save as SaveIcon, Warning as WarningIcon } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useThemeContext } from './ThemeContext';
interface AdminLayoutContextType {
  showSnackbar: (message: string, severity: 'success' | 'error' | 'info' | 'warning') => void;
  setSavingStatus: (status: 'idle' | 'saving' | 'saved' | 'error') => void;
  savingStatus: 'idle' | 'saving' | 'saved' | 'error';
}

const AdminLayoutContext = createContext<AdminLayoutContextType | null>(null);

export const AdminLayoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const savingStatusRef = useRef<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const snackbarTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasUnsavedChangesRef = useRef(false);
  const { alpha } = useThemeContext();
  // スナックバーの状態管理
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
    icon?: React.ReactNode;
    progress?: number;
  }>({
    open: false,
    message: '',
    severity: 'info',
    progress: 0,
  });

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // オンライン状態の監視を追加
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => {
      setIsOnline(false);
      updateSavingStatus('error');
      showSnackbar('オフライン状態です。インターネット接続を確認してください', 'error');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 未保存の変更がある場合の警告表示
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChangesRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const showSnackbar = useCallback((
    message: string, 
    severity: 'success' | 'error' | 'info' | 'warning',
    options?: {
      icon?: React.ReactNode;
      autoHideDuration?: number;
      progress?: boolean;
    }
  ) => {
    setSnackbar(prev => ({
      open: true,
      message,
      severity,
      icon: options?.icon,
      progress: options?.progress ? 0 : undefined,
    }));

    if (options?.progress) {
      const interval = setInterval(() => {
        setSnackbar(prev => ({
          ...prev,
          progress: prev.progress !== undefined ? Math.min(100, prev.progress + 2) : 0,
        }));
      }, 50);

      setTimeout(() => {
        clearInterval(interval);
        handleSnackbarClose();
      }, options.autoHideDuration || 3000);
    }
  }, []);

  const updateSavingStatus = useCallback((status: 'idle' | 'saving' | 'saved' | 'error') => {
    // オフライン時は保存を許可しない
    if (status === 'saving' && !isOnline) {
      showSnackbar('オフライン状態では保存できません', 'error', {
        icon: <WarningIcon />,
        autoHideDuration: 4000
      });
      setSavingStatus('error');
      return;
    }

    if (snackbarTimeoutRef.current) {
      clearTimeout(snackbarTimeoutRef.current);
    }

    savingStatusRef.current = status;
    setSavingStatus(status);
    hasUnsavedChangesRef.current = status === 'saving';
    setHasUnsavedChanges(status === 'saving');

    switch (status) {
      case 'saving':
        showSnackbar('保存中...', 'info', {
          icon: <CircularProgress size={20} />,
          progress: true,
          autoHideDuration: 3000
        });
        break;
      case 'saved':
        showSnackbar('変更が保存されました', 'success', {
          icon: <SaveIcon />,
          autoHideDuration: 2000
        });
        hasUnsavedChangesRef.current = false;
        setHasUnsavedChanges(false);
        break;
      case 'error':
        showSnackbar('保存に失敗しました', 'error', {
          icon: <WarningIcon />,
          autoHideDuration: 4000
        });
        break;
    }
  }, [isOnline, showSnackbar]);

  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const value = {
    showSnackbar,
    setSavingStatus: updateSavingStatus,
    savingStatus: savingStatusRef.current
  };

  return (
    <AdminLayoutContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {/* 未保存の変更がある場合の通知 */}
        {hasUnsavedChanges && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            style={{
              position: 'fixed',
              left: 24,
              bottom: 24,
              zIndex: 2000
            }}
          >
            <Box
              sx={{
                bgcolor: 'background.paper',
                borderRadius: 2,
                boxShadow: 4,
                p: 1.5,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                border: '1px solid',
                borderColor: 'divider',
                backdropFilter: 'blur(8px)',
                '&:hover': {
                  boxShadow: 6,
                }
              }}
            >
              <CircularProgress size={16} color="warning" />
              <Typography variant="body2" color="text.secondary">
                未保存の変更があります
              </Typography>
            </Box>
          </motion.div>
        )}

        {/* メインのスナックバー */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleSnackbarClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          sx={{ mb: hasUnsavedChanges ? 8 : 3, ml: 3 }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
          >
            <Alert 
              onClose={handleSnackbarClose} 
              severity={snackbar.severity}
              elevation={6}
              variant="filled"
              icon={snackbar.icon}
              sx={{
                minWidth: 300,
                boxShadow: theme => `0 8px 32px ${alpha(theme.palette.common.black, 0.15)}`,
                borderRadius: 2,
                '& .MuiAlert-message': {
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {snackbar.message}
                {snackbar.progress !== undefined && (
                  <Box
                    sx={{
                      height: 1,
                      bgcolor: 'rgba(255,255,255,0.2)',
                      borderRadius: 0.5,
                      overflow: 'hidden',
                      width: 50,
                      ml: 1
                    }}
                  >
                    <Box
                      sx={{
                        height: '100%',
                        width: `${snackbar.progress}%`,
                        bgcolor: 'rgba(255,255,255,0.8)',
                        transition: 'width 0.1s linear'
                      }}
                    />
                  </Box>
                )}
              </Box>
            </Alert>
          </motion.div>
        </Snackbar>
      </AnimatePresence>
    </AdminLayoutContext.Provider>
  );
};

export const useAdminLayout = () => {
  const context = useContext(AdminLayoutContext);
  if (!context) {
    throw new Error('useAdminLayout must be used within AdminLayoutProvider');
  }
  return context;
};
