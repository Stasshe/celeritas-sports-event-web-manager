import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { createTheme, ThemeProvider, alpha } from '@mui/material/styles';
import { PaletteMode } from '@mui/material';

type ThemeContextType = {
  mode: PaletteMode;
  toggleColorMode: () => void;
  alpha: (color: string, opacity: number) => string;
};

const ThemeContext = createContext<ThemeContextType | null>(null);

export const useThemeContext = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
};

type CustomThemeProviderProps = {
  children: ReactNode;
};

export const CustomThemeProvider = ({ children }: CustomThemeProviderProps) => {
  // ローカルストレージから初期モードを取得、または'light'をデフォルトとして設定
  const [mode, setMode] = useState<PaletteMode>(() => {
    const savedMode = localStorage.getItem('themeMode');
    return (savedMode as PaletteMode) || 'light';
  });

  // モードが変更されたらローカルストレージに保存
  useEffect(() => {
    localStorage.setItem('themeMode', mode);
  }, [mode]);

  // alpha関数のラッパー
  const alphaWrapper = (color: string, opacity: number): string => {
    return alpha(color, opacity);
  };

  const colorMode = {
    mode,
    toggleColorMode: () => {
      setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
    },
    alpha: alphaWrapper
  };

  // モダンで近未来的なテーマ
  const theme = createTheme({
    palette: {
      mode,
      primary: {
        main: '#3a7bd5', // より鮮やかなブルー
        light: '#6fa8dc',
        dark: '#0d47a1',
      },
      secondary: {
        main: '#00bcd4', // ティール/シアン
        light: '#4dd0e1',
        dark: '#0097a7',
      },
      background: {
        default: mode === 'light' ? '#f5f7fa' : '#121212',
        paper: mode === 'light' ? '#ffffff' : '#1e1e1e',
      },
      error: {
        main: '#f44336',
      },
      warning: {
        main: '#ff9800',
      },
      info: {
        main: '#03a9f4',
      },
      success: {
        main: '#4caf50',
      },
      text: {
        primary: mode === 'light' ? 'rgba(0, 0, 0, 0.87)' : 'rgba(255, 255, 255, 0.87)',
        secondary: mode === 'light' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.6)',
      },
    },
    typography: {
      fontFamily: '"Roboto", "Noto Sans JP", sans-serif',
      h1: { fontWeight: 500 },
      h2: { fontWeight: 500 },
      h3: { fontWeight: 500 },
      h4: { fontWeight: 500 },
      h5: { fontWeight: 500 },
      h6: { fontWeight: 500 },
    },
    shape: {
      borderRadius: 8, // 少し丸みを持たせる
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: `
          @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700&family=Roboto:wght@300;400;500;700&display=swap');
          :root {
            --app-height: 100%;
          }
          html, body {
            height: 100%;
            width: 100%;
            margin: 0;
          }
          body {
            background-color: ${mode === 'light' ? '#f5f7fa' : '#121212'};
            color: ${mode === 'light' ? 'rgba(0, 0, 0, 0.87)' : 'rgba(255, 255, 255, 0.87)'};
          }
        `,
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none', // ボタンのテキストを大文字にしない
            borderRadius: '8px',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: '12px',
            boxShadow: mode === 'light' 
              ? '0 4px 12px 0 rgba(0,0,0,0.05)'
              : '0 4px 12px 0 rgba(0,0,0,0.2)',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: '12px',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: mode === 'light' 
              ? 'linear-gradient(45deg, #3a7bd5, #6fa8dc)'
              : 'linear-gradient(45deg, #1a237e, #283593)',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            borderRight: 'none',
          },
        },
      },
    },
  });

  return (
    <ThemeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
};
