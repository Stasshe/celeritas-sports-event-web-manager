import React, { useState } from 'react';
import {
  Container,
  Box,
  Paper,
  Typography,
  Divider,
  Button,
  FormControlLabel,
  Switch,
  TextField,
  Grid
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router';
import { useThemeContext } from '../../contexts/ThemeContext';
import { useAdminLayout } from '../context/AdminLayoutContext';

const AdminSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { mode, toggleColorMode } = useThemeContext();
  const { showSnackbar, setSavingStatus } = useAdminLayout();

  const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState(true);
  const [autoSaveInterval, setAutoSaveInterval] = useState(30);

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
      showSnackbar("設定を保存しました", 'success');
    }, 800);
  };

  return (
    <Container maxWidth={false} disableGutters>
      <Box sx={{ mb: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/admin')}
          sx={{ mb: 1 }}
        >
          {"戻る"}
        </Button>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4" component="h1">
            {"設定"}
          </Typography>

          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSaveSettings}
          >
            {"保存"}
          </Button>
        </Box>
      </Box>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          {"外観"}
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <Grid container spacing={2} sx={{
          alignItems: "center"
        }}>
          <Grid
            size={{
              xs: 12,
              sm: 6
            }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {mode === 'dark' ?
                <DarkModeIcon sx={{ mr: 1 }} /> :
                <LightModeIcon sx={{ mr: 1 }} />
              }
              <Typography variant="body1">
                {"ダークモード"}
              </Typography>
            </Box>
          </Grid>
          <Grid
            size={{
              xs: 12,
              sm: 6
            }}>
            <FormControlLabel
              control={
                <Switch
                  checked={mode === 'dark'}
                  onChange={toggleColorMode}
                />
              }
              label={{ dark: '有効', light: '無効' }[mode]}
            />
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default AdminSettingsPage;
