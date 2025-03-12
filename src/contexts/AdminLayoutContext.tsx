import React, { createContext, useContext, useRef, useCallback, useState } from 'react';
import { Snackbar, Alert } from '@mui/material';

interface AdminLayoutContextType {
  showSnackbar: (message: string, severity: 'success' | 'error' | 'info' | 'warning') => void;
  setSavingStatus: (status: 'idle' | 'saving' | 'saved' | 'error') => void;
  savingStatus: 'idle' | 'saving' | 'saved' | 'error';
}

const AdminLayoutContext = createContext<AdminLayoutContextType | null>(null);

export const AdminLayoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const savingStatusRef = useRef<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const snackbarTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // スナックバーの状態管理を追加
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  const showSnackbar = useCallback((message: string, severity: 'success' | 'error' | 'info' | 'warning') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  }, []);

  const setSavingStatus = useCallback((status: 'idle' | 'saving' | 'saved' | 'error') => {
    if (snackbarTimeoutRef.current) {
      clearTimeout(snackbarTimeoutRef.current);
    }

    savingStatusRef.current = status;

    // 保存状態に応じてスナックバーを表示
    if (status === 'saved') {
      showSnackbar('変更が保存されました', 'success');
    } else if (status === 'error') {
      showSnackbar('保存に失敗しました', 'error');
    }

    if (status === 'saved' || status === 'error') {
      snackbarTimeoutRef.current = setTimeout(() => {
        savingStatusRef.current = 'idle';
      }, 3000);
    }
  }, [showSnackbar]);

  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const value = {
    showSnackbar,
    setSavingStatus,
    savingStatus: savingStatusRef.current
  };

  return (
    <AdminLayoutContext.Provider value={value}>
      {children}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleSnackbarClose} 
          severity={snackbar.severity}
          elevation={6}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
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
