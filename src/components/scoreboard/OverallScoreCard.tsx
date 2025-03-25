import React, { useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Divider,
  Avatar,
  Grid,
  Chip,
  useTheme,
  Paper
} from '@mui/material';
import {
  EmojiEvents as TrophyIcon,
  Leaderboard as LeaderboardIcon,
  LooksOne as OneIcon,
  LooksTwo as TwoIcon,
  Looks3 as ThreeIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { Event, Sport, OverallScoreEntry } from '../../types';
import { motion } from 'framer-motion';

interface OverallScoreCardProps {
  event: Event;
  sports?: Sport[];
}

const MotionCard = motion(Card);

const OverallScoreCard: React.FC<OverallScoreCardProps> = ({ event, sports = [] }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  
  // 総合成績データがあるかチェック
  const hasScoreData = useMemo(() => {
    return event.overallScoreboard?.enabled && event.overallScores && Object.keys(event.overallScores).length > 0;
  }, [event]);
  
  // 総合得点ランキングを計算
  const overallRanking = useMemo(() => {
    if (!hasScoreData) return [];
    
    const entries: OverallScoreEntry[] = Object.entries(event.overallScores || {})
      .map(([teamId, points]) => ({
        teamId,
        teamName: teamId,
        totalPoints: points,
        rank: 0,
        sportPoints: {}
      }));
    
    // ランク付け
    entries.sort((a, b) => b.totalPoints - a.totalPoints);
    entries.forEach((entry, index) => {
      entry.rank = index + 1;
    });
    
    // 表示制限数
    const displayCount = event.overallScoreboard?.displayRank || 3;
    return entries.slice(0, displayCount);
  }, [event, hasScoreData]);
  
  // ポイント表示のフォーマット
  const formatPoints = (points: number) => {
    return Math.round(points * 10) / 10;
  };
  
  if (!hasScoreData) {
    return null;
  }
  
  // ランク順に応じた色とアイコンを取得
  const getRankDisplay = (rank: number) => {
    switch (rank) {
      case 1:
        return {
          color: '#FFD700', // gold
          icon: <OneIcon fontSize="large" />,
          label: t('scoreboard.firstPlace')
        };
      case 2:
        return {
          color: '#C0C0C0', // silver
          icon: <TwoIcon fontSize="large" />,
          label: t('scoreboard.secondPlace')
        };
      case 3:
        return {
          color: '#CD7F32', // bronze
          icon: <ThreeIcon fontSize="large" />,
          label: t('scoreboard.thirdPlace')
        };
      default:
        return {
          color: theme.palette.grey[500],
          icon: null,
          label: `${rank}${t('scoreboard.placePostfix')}`
        };
    }
  };
  
  return (
    <MotionCard
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      sx={{ 
        width: '100%', 
        mb: 3,
        borderRadius: 2,
        overflow: 'hidden',
        boxShadow: 3
      }}
    >
      <CardHeader
        title={t('scoreboard.overallStandings')}
        subheader={event.name}
        avatar={<Avatar sx={{ bgcolor: theme.palette.primary.main }}><LeaderboardIcon /></Avatar>}
        sx={{ 
          bgcolor: theme.palette.primary.main,
          color: 'white',
          '& .MuiCardHeader-subheader': {
            color: 'rgba(255, 255, 255, 0.8)'
          }
        }}
      />
      
      <CardContent>
        <Grid container spacing={2}>
          {overallRanking.slice(0, 3).map((entry) => {
            const rankInfo = getRankDisplay(entry.rank);
            
            return (
              <Grid item xs={12} sm={4} key={entry.teamId}>
                <Paper
                  elevation={3}
                  sx={{
                    p: 2,
                    textAlign: 'center',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                    bgcolor: `${rankInfo.color}22`, // with transparency
                    border: `1px solid ${rankInfo.color}`
                  }}
                >
                  <Box
                    sx={{
                      position: 'absolute',
                      top: -10,
                      right: -10,
                      transform: 'rotate(45deg)',
                      width: 40,
                      height: 40,
                      bgcolor: rankInfo.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {rankInfo.icon}
                  </Box>
                  
                  <Typography 
                    variant="h5" 
                    component="div" 
                    gutterBottom
                    sx={{ 
                      color: theme.palette.text.primary,
                      fontWeight: 'bold'
                    }}
                  >
                    {entry.teamName}
                  </Typography>
                  
                  <Chip
                    icon={<TrophyIcon />}
                    label={`${formatPoints(entry.totalPoints)}${t('scoreboard.points')}`}
                    sx={{ 
                      fontSize: '1.2rem', 
                      py: 2, 
                      bgcolor: rankInfo.color,
                      color: '#fff',
                      '& .MuiChip-icon': {
                        color: '#fff'
                      }
                    }}
                  />
                  
                  <Box sx={{ color: 'text.secondary', fontSize: '0.875rem', mt: 1 }}>
                    {rankInfo.label}
                  </Box>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      </CardContent>
    </MotionCard>
  );
};

export default OverallScoreCard;
