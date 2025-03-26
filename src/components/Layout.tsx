import React, { ReactNode } from 'react';
import { AppBar, Toolbar, Typography, IconButton, Box, Container, useTheme } from '@mui/material';
import { Brightness4, Brightness7, Translate } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useThemeContext } from '../contexts/ThemeContext';
import LanguageSelector from './LanguageSelector';
import { useNavigate } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
  hideHeader?: boolean; // AdminLayoutとの重複を避けるためのオプション
}

const Layout: React.FC<LayoutProps> = ({ children, hideHeader }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { mode, toggleColorMode } = useThemeContext();
  const navigate = useNavigate();
  
  return (
    <Box sx={{ 
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      height: '100dvh',
      
      }}>
      {!hideHeader && (
        <AppBar position="static">
          <Toolbar>
            <Typography 
              variant="h6" 
              component="div" 
              sx={{ flexGrow: 1, cursor: 'pointer' }} 
              onClick={() => navigate('/')}
            >
              {t('common.appName')}
            </Typography>
            
            <IconButton 
              size="large"
              color="inherit"
              aria-label="language selector"
            >
              <Translate />
              <LanguageSelector />
            </IconButton>
            
            <IconButton 
              size="large"
              color="inherit"
              onClick={toggleColorMode}
              aria-label="toggle dark mode"
            >
              {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
            </IconButton>
          </Toolbar>
        </AppBar>
      )}
      
      <Container component="main" sx={{ 
        flexGrow: 1, 
        py: 4,
        backgroundColor: theme.palette.background.default
      }}>
        {children}
      </Container>
      
      <Box component="footer" sx={{ 
        py: 3, 
        px: 2, 
        mt: 'auto',
        backgroundColor: theme.palette.background.paper
      }}>
        <Container maxWidth="sm">
          <Typography variant="body2" color="text.secondary" align="center">
            {`© Roughfts 2025 all rights reserved.`}
          </Typography>
        </Container>
      </Box>
    </Box>
  );
};

export default Layout;
