import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Divider,
  FormControl,
  FormControlLabel,
  FormGroup,
  Switch,
  Select,
  MenuItem,
  InputLabel,
  Grid,
  Alert,
  Snackbar,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  ListItemText
} from '@mui/material';
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Info as InfoIcon,
  Language as LanguageIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useThemeContext } from '../../contexts/ThemeContext';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const MotionPaper = motion(Paper);
const MotionCard = motion(Card);

interface AppSettings {
  autoSave: boolean;
  autoDarkMode: boolean;
  defaultLanguage: string;
  cacheData: boolean;
}

const SettingsPanel: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { mode, toggleColorMode } = useThemeContext();
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  
  // 設定の初期値をローカルストレージから取得
  const [settings, setSettings] = useState<AppSettings>(() => {
    const savedSettings = localStorage.getItem('appSettings');
    return savedSettings ? JSON.parse(savedSettings) : {
      autoSave: true,
      autoDarkMode: mode === 'dark',
      defaultLanguage: i18n.language || 'ja',
      cacheData: true
    };
  });
  
  const [snackbar, setSnackbar] = useState<{open: boolean, message: string, severity: 'success' | 'error' | 'info'}>({
    open: false,
    message: '',
    severity: 'success'
  });

  // 言語オプション
  const languageOptions = [
    { code: 'ja', name: '日本語' },
    { code: 'en', name: 'English' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' }
  ];

  // 初期化時にダークモード設定を適用
  useEffect(() => {
    if (settings.autoDarkMode && mode !== 'dark') {
      toggleColorMode();
    }
  }, []);
  
  // 言語設定が変更されたら適用
  useEffect(() => {
    if (settings.defaultLanguage !== i18n.language) {
      i18n.changeLanguage(settings.defaultLanguage);
    }
  }, [settings.defaultLanguage]);

  const handleSettingChange = (setting: keyof AppSettings, value: boolean | string) => {
    const newSettings = { ...settings, [setting]: value };
    setSettings(newSettings);
    
    // ダークモード設定が変更されたら即時反映
    if (setting === 'autoDarkMode' && ((value && mode !== 'dark') || (!value && mode === 'dark'))) {
      toggleColorMode();
    }

    // 言語設定が変更されたら即時反映
    if (setting === 'defaultLanguage' && typeof value === 'string') {
      i18n.changeLanguage(value);
    }
  };

  const handleSaveSettings = () => {
    // 設定をローカルストレージに保存
    localStorage.setItem('appSettings', JSON.stringify(settings));
    
    setSnackbar({
      open: true,
      message: t('settings.savedSuccess') || '設定が保存されました',
      severity: 'success'
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };
  
  const handleClearCache = () => {
    // キャッシュクリア処理
    localStorage.removeItem('cachedData');
    sessionStorage.clear();
    
    setSnackbar({
      open: true,
      message: t('settings.cacheCleared') || 'キャッシュがクリアされました',
      severity: 'info'
    });
  };

  const handleLogout = async () => {
    try {
      await logout();
      setSnackbar({
        open: true,
        message: t('settings.logoutSuccess') || 'ログアウトしました',
        severity: 'success'
      });
      // ログアウト後にログインページに戻る
      navigate('/login');
    } catch (error) {
      setSnackbar({
        open: true,
        message: t('settings.logoutError') || 'ログアウトに失敗しました',
        severity: 'error'
      });
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        {t('admin.settings') || '設定'}
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <MotionPaper
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            elevation={3}
            sx={{ p: 3, mb: 4 }}
          >
            <Typography variant="h6" gutterBottom>
              {t('settings.general') || '一般設定'}
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <FormGroup>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.autoSave}
                    onChange={(e) => handleSettingChange('autoSave', e.target.checked)}
                    color="primary"
                  />
                }
                label={t('settings.autoSave') || 'データの自動保存'}
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.autoDarkMode}
                    onChange={(e) => handleSettingChange('autoDarkMode', e.target.checked)}
                    color="primary"
                  />
                }
                label={t('settings.darkMode') || 'ダークモード'}
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.cacheData}
                    onChange={(e) => handleSettingChange('cacheData', e.target.checked)}
                    color="primary"
                  />
                }
                label={t('settings.cacheData') || 'データのキャッシュを有効にする'}
              />
            </FormGroup>

            <Box sx={{ mt: 3 }}>
              <FormControl fullWidth margin="normal">
                <InputLabel>{t('settings.defaultLanguage') || 'デフォルト言語'}</InputLabel>
                <Select
                  value={settings.defaultLanguage}
                  onChange={(e) => handleSettingChange('defaultLanguage', e.target.value)}
                  startAdornment={<LanguageIcon sx={{ mr: 1, color: 'action.active' }} />}
                >
                  {languageOptions.map((lang) => (
                    <MenuItem key={lang.code} value={lang.code}>
                      <ListItemText primary={lang.name} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
              <Button
                variant="outlined"
                color="warning"
                startIcon={<RefreshIcon />}
                onClick={handleClearCache}
              >
                {t('settings.clearCache') || 'キャッシュをクリア'}
              </Button>
              
              <Button
                variant="contained"
                color="primary"
                startIcon={<SaveIcon />}
                onClick={handleSaveSettings}
              >
                {t('common.save') || '保存'}
              </Button>
            </Box>
          </MotionPaper>

          <MotionPaper
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            elevation={3}
            sx={{ p: 3 }}
          >
            <Typography variant="h6" gutterBottom>
              {t('settings.account') || 'アカウント'}
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="body1">
                  {t('settings.loggedInAs') || 'ログイン中のアカウント'}:
                </Typography>
                <Typography variant="subtitle1" fontWeight="bold">
                  {currentUser?.email}
                </Typography>
              </Box>
              <Button
                variant="outlined"
                color="error"
                onClick={handleLogout}
              >
                {t('common.logout') || 'ログアウト'}
              </Button>
            </Box>
          </MotionPaper>
        </Grid>

        <Grid item xs={12} md={5}>
          <MotionCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            elevation={3}
            sx={{ mb: 4 }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <InfoIcon color="info" sx={{ mr: 1 }} />
                <Typography variant="h6">
                  {t('settings.about') || 'このアプリケーションについて'}
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body2" paragraph>
                {t('settings.appDescription') || 'このアプリケーションは学校のスポーツイベントを管理・表示するためのWebアプリです。'}
              </Typography>
              <Typography variant="body2" paragraph>
                {t('settings.technicalInfo') || '技術情報: React, TypeScript, Firebase, Material UI'}
              </Typography>
              <Typography variant="body2">
                バージョン: 1.0.0
              </Typography>
            </CardContent>
          </MotionCard>

          <MotionCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            elevation={3}
          >
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('settings.help') || 'ヘルプ'}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body2" paragraph>
                {t('settings.needHelp') || '管理パネルの使い方についてはヘルプページをご覧ください。'}
              </Typography>
              <Button
                variant="outlined"
                color="primary"
                fullWidth
                onClick={() => navigate('/admin/help')}
              >
                {t('admin.help') || 'ヘルプを表示'}
              </Button>
            </CardContent>
          </MotionCard>
        </Grid>
      </Grid>

      {/* スナックバー通知 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SettingsPanel;
