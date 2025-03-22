import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { PaletteMode, alpha as muiAlpha } from '@mui/material';

interface ThemeContextType {
  mode: PaletteMode;
  toggleColorMode: () => void;
  alpha: (color: string, opacity: number) => string;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'light',
  toggleColorMode: () => {},
  alpha: () => '', // デフォルト値として空文字列を返す関数を提供
});

interface CustomThemeProviderProps {
  children: ReactNode;
}

export const CustomThemeProvider: React.FC<CustomThemeProviderProps> = ({ children }) => {
  // デフォルトでlightモードを使用し、クライアントサイドでのみlocalStorageをチェック
  const [mode, setMode] = useState<PaletteMode>('light');

  // サーバーサイドレンダリング中はlocalStorageにアクセスしない
  useEffect(() => {
    // クライアント側での初期化のみ
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('themeMode') as PaletteMode | null;
      if (savedMode) {
        setMode(savedMode);
      }
    }
  }, []);

  const theme = React.useMemo(
    () =>
      createTheme({
        palette: {
          mode,
        },
      }),
    [mode],
  );

  // alpha関数をコンテキストで提供
  const alpha = (color: string, opacity: number) => {
    return muiAlpha(color, opacity);
  };

  const toggleColorMode = () => {
    setMode((prevMode) => {
      const newMode = prevMode === 'light' ? 'dark' : 'light';
      // localStorageはクライアントでのみ利用可能
      if (typeof window !== 'undefined') {
        localStorage.setItem('themeMode', newMode);
      }
      return newMode;
    });
  };

  const contextValue = {
    mode,
    toggleColorMode,
    alpha, // alpha関数をコンテキスト値に追加
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </ThemeContext.Provider>
  );
};

export const useThemeContext = () => useContext(ThemeContext);
