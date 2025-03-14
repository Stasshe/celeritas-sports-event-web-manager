import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { useAdminLayout } from '../../contexts/AdminLayoutContext';


const ScoringPage: React.FC = () => {
  const { sportId } = useParams<{ sportId: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: sport, loading, updateData } = useDatabase<Sport>(`/sports/${sportId}`);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // 変更を自動保存するためのタイマーID
  const [autoSaveTimerId, setAutoSaveTimerId] = useState<NodeJS.Timeout | null>(null);
  
  // スポーツデータのローカルコピー
  const [localSport, setLocalSport] = useState<Sport | null>(null);

  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdateRef = useRef<Sport | null>(null);
  const isProcessingRef = useRef(false);

  const { registerSaveHandler, unregisterSaveHandler, save, setHasUnsavedChanges } = useAdminLayout();

  const handleSportUpdate = useCallback(async (updatedSport: Sport) => {
    if (isProcessingRef.current) return;
    
    // 変更があることを通知
    setHasUnsavedChanges(true);

    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    pendingUpdateRef.current = updatedSport;
    setLocalSport(updatedSport);

    updateTimeoutRef.current = setTimeout(async () => {
      if (!pendingUpdateRef.current) return;
      
      // 自動保存を修正
      await save(`scoring_${sportId}`);
    }, 2000);
  }, [updateData, save, sportId, setHasUnsavedChanges]);

  useEffect(() => {
    if (sport && !localSport) {
      setLocalSport(JSON.parse(JSON.stringify(sport)));
    }
  }, [sport, localSport]);

  // スポーツデータが変更されたときの自動保存制御を改善
  useEffect(() => {
    if (!localSport || !sport || isProcessing) return;

    if (JSON.stringify(localSport) !== JSON.stringify(sport)) {
      if (autoSaveTimerId) {
        clearTimeout(autoSaveTimerId);
      }
      
      const timerId = setTimeout(() => {
        // ダイアログが開いていないことを確認してから自動保存
        const dialogs = document.querySelectorAll('[role="dialog"]');
        if (dialogs.length === 0) {
          handleSave();
        }
      }, 500);
      setAutoSaveTimerId(timerId);
    }

    return () => {
      if (autoSaveTimerId) {
        clearTimeout(autoSaveTimerId);
      }
    };
  }, [localSport, isProcessing]);

  const handleSave = async () => {
    if (!localSport || isProcessingRef.current) return false;

    try {
      isProcessingRef.current = true;
      setSaveStatus('saving');
      
      // ローカルの変更を保存
      const result = await updateData(localSport);
      
      if (result) {
        setSaveStatus('saved');
        setShowSnackbar(true);
        return true;
      } else {
        setSaveStatus('error');
        setShowSnackbar(true);
        return false;
      }
    } catch (error) {
      console.error('Save error:', error);
      setSaveStatus('error');
      setShowSnackbar(true);
      return false;
    } finally {
      isProcessingRef.current = false;
    }
  };

  const handleSnackbarClose = () => {
    setShowSnackbar(false);
  };

  

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      isProcessingRef.current = false;
      pendingUpdateRef.current = null;
    };
  }, [saveTimeout]);

  // 初期マウント時にSaveHandlerを登録
  useEffect(() => {
    // このページの保存ハンドラを登録
    const handleSave = async () => {
      if (!localSport || isProcessingRef.current) return false;
      
      try {
        isProcessingRef.current = true;
        setSaveStatus('saving');
        
        // ローカルの変更を保存
        const result = await updateData(localSport);
        
        if (result) {
          setSaveStatus('saved');
          setShowSnackbar(true);
          return true;
        } else {
          setSaveStatus('error');
          setShowSnackbar(true);
          return false;
        }
      } catch (error) {
        console.error('Save error:', error);
        setSaveStatus('error');
        setShowSnackbar(true);
        return false;
      } finally {
        isProcessingRef.current = false;
      }
    };
    
    // スコープ名を一意にして登録
    registerSaveHandler(handleSave, `scoring_${sportId}`);
    
    return () => {
      // アンマウント時に登録解除
      unregisterSaveHandler(`scoring_${sportId}`);
    };
  }, [registerSaveHandler, unregisterSaveHandler, localSport, updateData, sportId]);

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
