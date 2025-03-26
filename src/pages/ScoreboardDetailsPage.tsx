import React from 'react';
import {
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  Card,
  CardContent,
  Divider,
  IconButton,
  Tooltip,
  CircularProgress
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDatabase } from '../hooks/useDatabase';
import { Event, Sport } from '../types';

const ScoreboardDetailsPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: event, loading: eventLoading } = useDatabase<Event>(`/events/${eventId}`);
  const { data: allSports } = useDatabase<Record<string, Sport>>('/sports');
  
  if (eventLoading || !event) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // イベントに関連する競技を取得
  const eventSports = event.sports
    ?.map(sportId => allSports?.[sportId])
    .filter((sport): sport is Sport => sport !== undefined);

  // 各競技のポイント設定を表示するセクション
  const PointSettingsSection = () => (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        {t('scoreboard.pointSettings')}
      </Typography>
      <Divider sx={{ mb: 2 }} />
      
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('scoreboard.sportName')}</TableCell>
              <TableCell>{t('scoreboard.pointDistribution')}</TableCell>
              <TableCell>{t('scoreboard.weight')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {eventSports?.map(sport => {
              const settings = event.sportPointSettings?.[sport.id];
              if (!settings?.enabled) return null;
              
              return (
                <TableRow key={sport.id}>
                  <TableCell>{sport.name}</TableCell>
                  <TableCell>
                    {settings.points.map((point, index) => (
                      `${index + 1}位: ${point}点${index < settings.points.length - 1 ? ', ' : ''}`
                    ))}
                  </TableCell>
                  <TableCell>×{settings.weight}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );

  // 詳細なスコア表を表示するセクション
  const DetailedScoresSection = () => {
    if (!event.overallScores) return null;

    const scores = Object.entries(event.overallScores)
      .map(([teamId, totalPoints]) => ({
        teamId,
        totalPoints,
        sportPoints: {} as Record<string, number>
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints);

    return (
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          {t('scoreboard.detailedScores')}
        </Typography>
        <Divider sx={{ mb: 2 }} />
        
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('scoreboard.rank')}</TableCell>
                <TableCell>{t('scoreboard.team')}</TableCell>
                <TableCell align="right">{t('scoreboard.totalPoints')}</TableCell>
                {eventSports?.map(sport => (
                  <TableCell key={sport.id} align="right">{sport.name}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {scores.map((score, index) => (
                <TableRow key={score.teamId}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{score.teamId}</TableCell>
                  <TableCell align="right">{score.totalPoints}</TableCell>
                  {eventSports?.map(sport => (
                    <TableCell key={sport.id} align="right">
                      {score.sportPoints[sport.id] || '-'}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
        <IconButton
          onClick={() => navigate('/')}
          sx={{ mr: 2 }}
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1">
          {event.name} - {t('scoreboard.details')}
        </Typography>
      </Box>

      <PointSettingsSection />
      <DetailedScoresSection />
    </Container>
  );
};

export default ScoreboardDetailsPage;
