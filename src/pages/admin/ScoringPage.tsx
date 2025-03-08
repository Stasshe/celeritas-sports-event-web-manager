import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Button, 
  CircularProgress, 
  IconButton,
  Snackbar,
  Alert,
  Divider
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, Save as SaveIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useDatabase } from '../../hooks/useDatabase';
import { Sport } from '../../types';
import TournamentScoring from '../../components/admin/scoring/TournamentScoring';
import RoundRobinScoring from '../../components/admin/scoring/RoundRobinScoring';
import CustomScoring from '../../components/admin/scoring/CustomScoring';

const ScoringPage: React.FC = () => {
  const { sportId } = useParams<{ sportId: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: sport, loading, updateData } = useDatabase<Sport>(`/sports/${sportId}`);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showSnackbar, setShowSnackbar] = useState(false);
  
  // 変更を自動保存するためのタイマーID
  const [autoSaveTimerId, setAutoSaveTimerId] = useState<NodeJS.Timeout | null>(null);
  
  // スポーツデータのローカルコピー
  const [localSport, setLocalSport] = useState<Sport | null>(null);

  useEffect(() => {
    if (sport && !localSport) {
      setLocalSport(JSON.parse(JSON.stringify(sport)));
    }
  }, [sport, localSport]);

  // スポーツデータが変更されたときに自動保存タイマーをセット
  useEffect(() => {
    if (!localSport || !sport) return;

    // データが同じでなければタイマーをセット
    if (JSON.stringify(localSport) !== JSON.stringify(sport)) {
      // 既存のタイマーをクリア
      if (autoSaveTimerId) {
        clearTimeout(autoSaveTimerId);
      }
      
      // 新しいタイマーをセット（3秒後に自動保存）
      const timerId = setTimeout(handleSave, 3000);
      setAutoSaveTimerId(timerId);
    }

    return () => {
      if (autoSaveTimerId) {
        clearTimeout(autoSaveTimerId);
      }
    };
  }, [localSport]);

  const handleSave = async () => {
    if (!localSport) return;

    setSaveStatus('saving');
    try {
      await updateData(localSport);
      setSaveStatus('saved');
      setShowSnackbar(true);
    } catch (error) {
      setSaveStatus('error');
      setShowSnackbar(true);
    } finally {
      // 5秒後にステータスをリセット
      setTimeout(() => {
        setSaveStatus('idle');
      }, 5000);
    }
  };

  const handleSnackbarClose = () => {
    setShowSnackbar(false);
  };

  // スポーツデータの更新ハンドラ（子コンポーネントから呼ばれる）
  const handleSportUpdate = (updatedSport: Sport) => {
    setLocalSport(updatedSport);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!sport || !localSport) {
    return (
      <Box sx={{ textAlign: 'center', my: 8 }}>
        <Typography variant="h5">
          {t('sports.notFound')}
        </Typography>
        <Button sx={{ mt: 2 }} variant="contained" onClick={() => navigate('/admin')}>
          {t('common.backToAdmin')}
        </Button>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton onClick={() => navigate('/admin')} aria-label="back" sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1">
            {t('scoring.title', { name: localSport.name })}
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={saveStatus === 'saving'}
        >
          {saveStatus === 'saving' ? t('common.saving') : t('common.save')}
        </Button>
      </Box>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          {t(`sports.${localSport.type}`)} - {t('scoring.updateScores')}
        </Typography>
        <Divider sx={{ my: 2 }} />

        {/* スポーツタイプに合わせたスコアリングコンポーネント */}
        {localSport.type === 'tournament' && (
          <TournamentScoring sport={localSport} onUpdate={handleSportUpdate} />
        )}
        {localSport.type === 'roundRobin' && (
          <RoundRobinScoring sport={localSport} onUpdate={handleSportUpdate} />
        )}
        {localSport.type === 'custom' && (
          <CustomScoring sport={localSport} onUpdate={handleSportUpdate} />
        )}
      </Paper>

      {/* 保存状態通知 */}
      <Snackbar open={showSnackbar} autoHideDuration={4000} onClose={handleSnackbarClose}>
        <Alert 
          onClose={handleSnackbarClose} 
          severity={saveStatus === 'saved' ? 'success' : 'error'} 
          sx={{ width: '100%' }}
        >
          {saveStatus === 'saved' ? t('common.savedSuccess') : t('common.savedError')}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ScoringPage;
