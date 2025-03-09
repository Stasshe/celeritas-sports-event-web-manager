import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Chip,
  Divider,
  CircularProgress,
  useTheme
} from '@mui/material';
import { Sport, Match, Team } from '../../types';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useThemeContext } from '../../contexts/ThemeContext';

interface TournamentViewProps {
  sport: Sport;
}

interface MatchNode {
  match: Match;
  team1?: Team;
  team2?: Team;
  nextMatchId?: string;
  prevMatch1Id?: string;
  prevMatch2Id?: string;
  round: number;
  position: number;
}

const MotionCard = motion(Card);

const TournamentView: React.FC<TournamentViewProps> = ({ sport }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { alpha } = useThemeContext();
  
  const [tournamentStructure, setTournamentStructure] = useState<MatchNode[][]>([]);
  const [loading, setLoading] = useState(true);

  // トーナメント構造を構築
  useEffect(() => {
    if (sport.matches && sport.teams) {
      buildTournamentStructure();
    }
  }, [sport]);

  // トーナメント構造を構築する関数
  const buildTournamentStructure = () => {
    setLoading(true);
    
    try {
      // 最大のラウンドを特定
      const maxRound = Math.max(...sport.matches.map(m => m.round), 1);
      
      // ラウンドごとにマッチを整理
      const roundMatches = Array.from({ length: maxRound }, () => [] as MatchNode[]);
      
      // まずマッチを基本情報でセット
      sport.matches.forEach(match => {
        const team1 = sport.teams.find(t => t.id === match.team1Id);
        const team2 = sport.teams.find(t => t.id === match.team2Id);
        
        // マッチノードを作成
        const node: MatchNode = {
          match,
          team1,
          team2,
          round: match.round,
          position: match.matchNumber
        };
        
        // ラウンドに追加
        if (match.round >= 1 && match.round <= maxRound) {
          roundMatches[match.round - 1].push(node);
        }
      });
      
      // 各ラウンドのマッチを試合番号でソート
      roundMatches.forEach(matches => {
        matches.sort((a, b) => a.position - b.position);
      });
      
      setTournamentStructure(roundMatches);
    } catch (error) {
      console.error('Error building tournament structure:', error);
    } finally {
      setLoading(false);
    }
  };

  // 試合の状態に応じた色を返す
  const getMatchStatusColor = (status: string): "default" | "primary" | "secondary" | "success" | "error" | "info" | "warning" => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'inProgress':
        return 'warning';
      default:
        return 'default';
    }
  };

  // 試合のステータスラベルを取得
  const getMatchStatusLabel = (status: string): string => {
    switch (status) {
      case 'completed':
        return t('match.completed');
      case 'inProgress':
        return t('match.inProgress');
      default:
        return t('match.scheduled');
    }
  };

  // チーム名を取得
  const getTeamName = (teamId?: string): string => {
    if (!teamId) return t('tournament.tbd');
    const team = sport.teams.find(t => t.id === teamId);
    return team ? team.name : t('tournament.unknown');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (tournamentStructure.length === 0 || sport.matches.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body1" color="text.secondary">
          {t('tournament.noMatches')}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Box sx={{ display: 'flex', gap: 2, minWidth: tournamentStructure.length * 250 }}>
        {/* 各ラウンド */}
        {tournamentStructure.map((roundMatches, roundIndex) => (
          <Box 
            key={roundIndex}
            sx={{ 
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              justifyContent: 'space-around',
              p: 1
            }}
          >
            <Typography variant="h6" sx={{ textAlign: 'center', mb: 2 }}>
              {roundIndex === tournamentStructure.length - 1 
                ? t('tournament.final') 
                : t('tournament.round', { round: roundIndex + 1 })}
            </Typography>
            
            {/* 各マッチカード */}
            {roundMatches.map((matchNode, matchIndex) => (
              <MotionCard
                key={matchNode.match.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: matchIndex * 0.1, duration: 0.3 }}
                elevation={2}
                sx={{
                  mb: 2,
                  border: '1px solid',
                  borderColor: theme.palette.divider,
                  borderLeft: `4px solid ${
                    matchNode.match.status === 'completed' 
                      ? theme.palette.success.main 
                      : matchNode.match.status === 'inProgress'
                      ? theme.palette.warning.main
                      : theme.palette.grey[300]
                  }`
                }}
              >
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      {t('match.number', { number: matchNode.match.matchNumber })}
                    </Typography>
                    <Chip
                      label={getMatchStatusLabel(matchNode.match.status)}
                      color={getMatchStatusColor(matchNode.match.status)}
                      size="small"
                    />
                  </Box>
                  
                  <Divider sx={{ my: 1 }} />
                  
                  {/* チーム1 */}
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    py: 1,
                    backgroundColor: matchNode.match.winnerId === matchNode.match.team1Id 
                      ? alpha(theme.palette.success.light, 0.1)
                      : 'transparent',
                    fontWeight: matchNode.match.winnerId === matchNode.match.team1Id 
                      ? 'bold'
                      : 'normal',
                    borderRadius: 1,
                    px: 1
                  }}>
                    <Typography variant="body2">
                      {getTeamName(matchNode.match.team1Id)}
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {matchNode.match.team1Score || '-'}
                    </Typography>
                  </Box>
                  
                  {/* チーム2 */}
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    py: 1,
                    mt: 1,
                    backgroundColor: matchNode.match.winnerId === matchNode.match.team2Id 
                      ? alpha(theme.palette.success.light, 0.1)
                      : 'transparent',
                    fontWeight: matchNode.match.winnerId === matchNode.match.team2Id 
                      ? 'bold'
                      : 'normal',
                    borderRadius: 1,
                    px: 1
                  }}>
                    <Typography variant="body2">
                      {getTeamName(matchNode.match.team2Id)}
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {matchNode.match.team2Score || '-'}
                    </Typography>
                  </Box>
                  
                  {/* 試合メモ（あれば） */}
                  {matchNode.match.notes && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      {matchNode.match.notes}
                    </Typography>
                  )}
                </CardContent>
              </MotionCard>
            ))}
            
            {/* ラウンドにマッチがない場合 */}
            {roundMatches.length === 0 && (
              <Paper sx={{ p: 2, textAlign: 'center', opacity: 0.7 }}>
                <Typography variant="body2" color="text.secondary">
                  {t('tournament.noMatchesInRound')}
                </Typography>
              </Paper>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default TournamentView;
