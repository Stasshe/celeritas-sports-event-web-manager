import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  CircularProgress,
  Button,
  Chip,
  Divider,
  IconButton,
  Grid
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useDatabase } from '../hooks/useDatabase';
import { Sport, Team, Match } from '../types';
import TournamentScoring from '../components/admin/scoring/TournamentScoring';
import RoundRobinTable from '../components/sports/RoundRobinTable';
import CustomLayout from '../components/sports/CustomLayout';


const SportPage: React.FC = () => {
  const { sportId } = useParams<{ sportId: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: sport, loading, updateData } = useDatabase<Sport>(`/sports/${sportId}`);

  const handleSportUpdate = async (updatedSport: Sport) => {
    try {
      await updateData(updatedSport);
      return true;
    } catch (error) {
      console.error('Error updating sport:', error);
      return false;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!sport) {
    return (
      <Box sx={{ textAlign: 'center', my: 8 }}>
        <Typography variant="h5">
          {t('sports.notFound')}
        </Typography>
        <Button sx={{ mt: 2 }} variant="contained" onClick={() => navigate('/')}>
          {t('common.backToHome')}
        </Button>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <IconButton onClick={() => navigate('/')} aria-label="back" sx={{ mb: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <Typography variant="h4" component="h1" gutterBottom>
              {sport.name}
            </Typography>
            <Chip 
              label={t(`sports.${sport.type}`)} 
              color="primary" 
              size="small" 
              sx={{ mr: 1 }} 
            />
          </Grid>
          {sport.coverImageUrl && (
            <Grid item xs={12} md={6}>
              <Box 
                component="img"
                src={sport.coverImageUrl}
                alt={sport.name}
                sx={{
                  width: '100%',
                  maxHeight: 200,
                  objectFit: 'contain',
                  borderRadius: 1
                }}
              />
            </Grid>
          )}
        </Grid>

        {sport.description && (
          <Typography variant="body1" color="text.secondary" paragraph sx={{ mt: 2 }}>
            {sport.description}
          </Typography>
        )}
        
        <Divider sx={{ my: 3 }} />
      </Box>
      
      <Box sx={{ mt: 4 }}>
        {/* 競技形式によってコンポーネントを切り替え */}
        {sport.type === 'tournament' && (
          <TournamentScoring 
            sport={sport} 
            onUpdate={handleSportUpdate}
            readOnly // 読み取り専用モードを追加
          />
        )}
        {sport.type === 'roundRobin' && (
          <Box>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
              {t('roundRobin.pointsSystem', {
                win: sport.roundRobinSettings?.winPoints || 3,
                draw: sport.roundRobinSettings?.drawPoints || 1,
                lose: sport.roundRobinSettings?.considerLosePoints ? sport.roundRobinSettings?.losePoints || 0 : 0
              })}
            </Typography>
            <RoundRobinTable sport={sport} />
          </Box>
        )}
        {sport.type === 'custom' && <CustomLayout sport={sport} />}
      </Box>
    </Container>
  );
};

export default SportPage;
