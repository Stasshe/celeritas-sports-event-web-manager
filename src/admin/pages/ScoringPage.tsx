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
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { getSportTypeLabel } from '../../utils/labels';
import { useDatabase } from '../../hooks/useDatabase';
import { Sport } from '../../types';
import TournamentScoring from '../../common/TournamentScoring';
import RoundRobinScoring from '../components/scoring/RoundRobinScoring';
import LeagueScoring from '../components/scoring/LeagueScoring';
import RankingScoring from '../components/scoring/RankingScoring';
import { useAdminLayout } from '../context/AdminLayoutContext';


const ScoringPage: React.FC = () => {
  const { sportId } = useParams<{ sportId: string }>();
  const navigate = useNavigate();
  const { data: sport, loading, updateData } = useDatabase<Sport>(`/sports/${sportId}`);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showSnackbar, setShowSnackbar] = useState(false);

  // スポーツデータのローカルコピー
  const [localSport, setLocalSport] = useState<Sport | null>(null);

  const updateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      isProcessingRef.current = false;
      pendingUpdateRef.current = null;
    };
  }, []);

  // 保存ハンドラを登録(グローバル保存ボタン/未保存インジケータと連動)
  useEffect(() => {
    registerSaveHandler(handleSave, `scoring_${sportId}`);

    return () => {
      unregisterSaveHandler(`scoring_${sportId}`);
    };
  }, [registerSaveHandler, unregisterSaveHandler, handleSave, sportId]);

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
          {"競技が見つかりません"}
        </Typography>
        <Button sx={{ mt: 2 }} variant="contained" onClick={() => navigate('/admin')}>
          {"管理画面に戻る"}
        </Button>
      </Box>
    );
  }

  return (
    <Container maxWidth={false} disableGutters>
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
        <IconButton onClick={() => navigate(`/admin/sports/${sportId}`)} aria-label="back" sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1">
          {localSport.name}のスコア管理
        </Typography>
      </Box>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          {getSportTypeLabel(localSport.type)} - {"スコアを更新"}
        </Typography>
        <Divider sx={{ my: 2 }} />

        {/* スポーツタイプに合わせたスコアリングコンポーネント */}
        {localSport.type === 'tournament' && (
          <TournamentScoring sport={localSport} onUpdate={handleSportUpdate} />
        )}
        {localSport.type === 'roundRobin' && (
          <RoundRobinScoring sport={localSport} onUpdate={handleSportUpdate} />
        )}
        {localSport.type === 'league' && (
          <LeagueScoring sport={localSport} onUpdate={handleSportUpdate} />
        )}
        {localSport.type === 'ranking' && (
          <RankingScoring sport={localSport} onUpdate={handleSportUpdate} />
        )}
      </Paper>

      {/* 保存状態通知 */}
      <Snackbar open={showSnackbar} autoHideDuration={4000} onClose={handleSnackbarClose}>
        <Alert 
          onClose={handleSnackbarClose} 
          severity={saveStatus === 'saved' ? 'success' : 'error'} 
          sx={{ width: '100%' }}
        >
          {saveStatus === 'saved' ? "保存しました" : "保存に失敗しました"}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ScoringPage;
