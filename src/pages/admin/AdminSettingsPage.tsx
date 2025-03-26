import React, { useState } from 'react';
import {
  Container,
  Box,
  Paper,
  Typography,
  Divider,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  TextField,
  Grid
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  Translate as TranslateIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import { useThemeContext } from '../../contexts/ThemeContext';
import { useAdminLayout } from '../../contexts/AdminLayoutContext';

const AdminSettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { mode, toggleColorMode } = useThemeContext();
  const { showSnackbar, setSavingStatus } = useAdminLayout();
  
  const [language, setLanguage] = useState(i18n.language);
  const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState(true);
  const [autoSaveInterval, setAutoSaveInterval] = useState(30);
  
  const handleLanguageChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    const newLang = event.target.value as string;
    setLanguage(newLang);
    i18n.changeLanguage(newLang);
  };
  
  const handleAutoSaveChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setIsAutoSaveEnabled(event.target.checked);
  };
  
  const handleIntervalChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value);
    if (!isNaN(value) && value > 0) {
      setAutoSaveInterval(value);
    }
  };
  
  const handleSaveSettings = () => {
    setSavingStatus('saving');
    
    // 保存をシミュレート
    setTimeout(() => {
      setSavingStatus('saved');
      showSnackbar(t('settings.savedSuccessfully'), 'success');
    }, 800);
  };
  
  return (
    <Container maxWidth="md">
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/admin')}
          sx={{ mb: 2 }}
        >
          {t('common.back')}
        </Button>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4" component="h1">
            {t('admin.settings')}
          </Typography>
          
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSaveSettings}
          >
            {t('common.save')}
          </Button>
        </Box>
      </Box>
      
      <Paper sx={{ p: 4, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          {t('settings.appearance')}
        </Typography>
        <Divider sx={{ mb: 3 }} />
        
        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {mode === 'dark' ? 
                <DarkModeIcon sx={{ mr: 1 }} /> : 
                <LightModeIcon sx={{ mr: 1 }} />
              }
              <Typography variant="body1">
                {t('settings.darkMode')}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={mode === 'dark'}
                  onChange={toggleColorMode}
                />
              }
              label={t(mode === 'dark' ? 'settings.enabled' : 'settings.disabled')}
            />
          </Grid>
        </Grid>
      </Paper>
      
      <Paper sx={{ p: 4, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          {t('settings.language')}
        </Typography>
        <Divider sx={{ mb: 3 }} />
        
        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <TranslateIcon sx={{ mr: 1 }} />
              <Typography variant="body1">
                {t('settings.applicationLanguage')}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>{t('settings.selectLanguage')}</InputLabel>
              <Select
                value={language}
                onChange={handleLanguageChange as any}
                label={t('settings.selectLanguage')}
              >
                <MenuItem value="en">English</MenuItem>
                <MenuItem value="ja">日本語</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default AdminSettingsPage;
