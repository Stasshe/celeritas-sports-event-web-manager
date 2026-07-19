import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Container, 
  Typography, 
  Box, 
  Paper,
  Button, 
  CircularProgress, 
  IconButton,
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
import { useAutoSave } from '../hooks/useAutoSave';


const ScoringPage: React.FC = () => {
  const { sportId } = useParams<{ sportId: string }>();
  const navigate = useNavigate();
  const { data: sport, loading, updateData } = useDatabase<Sport>(`/sports/${sportId}`);
  // スポーツデータのローカルコピー
  const [localSport, setLocalSport] = useState<Sport | null>(null);

  const handleSave = useCallback(async () => {
    if (!localSport) return false;
    return updateData(localSport);
  }, [localSport, updateData]);
  const autoSave = useAutoSave(`scoring_${sportId}`, handleSave);

  const handleSportUpdate = useCallback(async (updatedSport: Sport) => {
    setLocalSport(updatedSport);
    autoSave.schedule();
  }, [autoSave]);

  useEffect(() => {
    if (sport && !localSport) {
      setLocalSport(JSON.parse(JSON.stringify(sport)));
    }
  }, [sport, localSport]);

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
    </Container>
  );
};

export default ScoringPage;
