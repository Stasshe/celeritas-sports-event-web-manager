import React, { useState, useEffect } from 'react';
// react-router-domのインポートを削除
// import { useParams, useNavigate } from 'react-router-dom';
import { useRouter } from 'next/router';
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
import { useDatabase } from '../../hooks/useDatabase';
import { Sport, Team, Match } from '../../types';
import TournamentScoring from '../admin/scoring/TournamentScoring';
import RoundRobinTable from '../sports/RoundRobinTable';


interface SportPageProps {
  sportId: string;
}

const SportPage: React.FC<SportPageProps> = ({ sportId }) => {
  const { t } = useTranslation();
  const router = useRouter(); // useNavigateの代わりにuseRouterを使用
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

  // navigateをrouter.pushに変更
  const navigateToHome = () => router.push('/');

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
        <Button sx={{ mt: 2 }} variant="contained" onClick={navigateToHome}>
          {t('common.backToHome')}
        </Button>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <IconButton onClick={navigateToHome} aria-label="back" sx={{ mb: 1 }}>
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
            <RoundRobinTable sport={sport} />
          </Box>
        )}
        
      </Box>
    </Container>
  );
};

export default SportPage;
