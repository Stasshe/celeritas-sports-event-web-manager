import React, { createContext, useContext, useState } from 'react';

// AdminLayoutのコンテキスト型定義
interface AdminLayoutContextType {
  showSnackbar: (message: string, severity: 'success' | 'error' | 'info' | 'warning') => void;
  setSavingStatus: (status: 'idle' | 'saving' | 'saved' | 'error') => void;
  savingStatus: 'idle' | 'saving' | 'saved' | 'error';
}

// AdminLayoutコンテキストを作成
export const AdminLayoutContext = createContext<AdminLayoutContextType | undefined>(undefined);

// コンテキスト用フック
export const useAdminLayout = () => {
  const context = useContext(AdminLayoutContext);
  if (!context) {
    throw new Error('useAdminLayout must be used within an AdminLayoutProvider');
  }
  return context;
};

interface AdminLayoutProviderProps {
  children: React.ReactNode;
}

export const AdminLayoutProvider: React.FC<AdminLayoutProviderProps> = ({ children }) => {
  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  // スナックバーを表示する関数
  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info' | 'warning') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };

  const value = {
    showSnackbar,
    setSavingStatus,
    savingStatus
  };

  return (
    <AdminLayoutContext.Provider value={value}>
      {children}
    </AdminLayoutContext.Provider>
  );
};
