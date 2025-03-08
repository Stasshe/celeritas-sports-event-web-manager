import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  CardActions,
  TextField,
  Button,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
  Divider,
  Chip
} from '@mui/material';
import { Sport, Match, Team } from '../../../types';
import { useTranslation } from 'react-i18next';

interface TournamentScoringProps {
  sport: Sport;
  onUpdate: (updatedSport: Sport) => void;
}

const TournamentScoring: React.FC<TournamentScoringProps> = ({ sport, onUpdate }) => {
  const { t } = useTranslation();
  const [matches, setMatches] = useState<Match[]>(sport.matches || []);
  const [teams, setTeams] = useState<Team[]>(sport.teams || []);

  // スポーツデータが更新されたときにローカルステートも更新
  useEffect(() => {
    setMatches(sport.matches || []);
    setTeams(sport.teams || []);
  }, [sport]);

  // 試合結果を更新
  const handleScoreChange = (matchId: string, field: 'team1Score' | 'team2Score', value: string) => {
    const score = parseInt(value) || 0;
    
    const updatedMatches = matches.map(match => {
      if (match.id === matchId) {
        const updatedMatch = { ...match, [field]: score };
        // 勝者を自動判定
        if (field === 'team1Score' && score > match.team2Score) {
          updatedMatch.winnerId = match.team1Id;
        } else if (field === 'team2Score' && score > match.team1Score) {
          updatedMatch.winnerId = match.team2Id;
        } else if (match.team1Score === match.team2Score) {
          updatedMatch.winnerId = undefined; // 同点の場合は勝者なし
        }
        return updatedMatch;
      }
      return match;
    });
    
    setMatches(updatedMatches);
    updateSportData(updatedMatches);
  };

  // 試合ステータスを更新
  const handleStatusChange = (matchId: string, status: "scheduled" | "inProgress" | "completed") => {
    const updatedMatches = matches.map(match => {
      if (match.id === matchId) {
        return { ...match, status };
      }
      return match;
    });
    
    setMatches(updatedMatches);
    
    // 試合が完了した場合、次の試合の対戦相手を更新
    if (status === 'completed') {
      const completedMatch = updatedMatches.find(m => m.id === matchId);
      if (completedMatch && completedMatch.winnerId) {
        const winner = completedMatch.winnerId;
        const round = completedMatch.round;
        const nextRound = round + 1;
        
        // 次のラウンドの試合を探す
        const nextRoundMatches = updatedMatches.filter(m => m.round === nextRound);
        const matchNumber = completedMatch.matchNumber;
        
        // 次の試合の位置を計算（簡易的な計算方法、実際のトーナメント構造に応じて調整が必要）
        const nextMatchNumber = Math.floor(matchNumber / 2);
        const nextMatch = nextRoundMatches.find(m => m.matchNumber === nextMatchNumber);
        
        if (nextMatch) {
          // 勝者を次の試合に配置
          const isFirstTeam = matchNumber % 2 === 0;
          const updatedNextMatch = {
            ...nextMatch,
            [isFirstTeam ? 'team1Id' : 'team2Id']: winner
          };
          
          updatedMatches.forEach((match, index) => {
            if (match.id === nextMatch.id) {
              updatedMatches[index] = updatedNextMatch;
            }
          });
        }
      }
    }
    
    updateSportData(updatedMatches);
  };

  // 手動で勝者を設定
  const handleWinnerChange = (matchId: string, winnerId: string) => {
    const updatedMatches = matches.map(match => {
      if (match.id === matchId) {
        return { ...match, winnerId };
      }
      return match;
    });
    
    setMatches(updatedMatches);
    updateSportData(updatedMatches);
  };

  // スポーツデータの更新
  const updateSportData = (updatedMatches: Match[]) => {
    const updatedSport = {
      ...sport,
      matches: updatedMatches
    };
    onUpdate(updatedSport);
  };

  // チーム名を取得する関数
  const getTeamName = (teamId: string) => {
    const team = teams.find(team => team.id === teamId);
    return team ? team.name : 'TBD';
  };

  // ラウンド名を取得する関数
  const getRoundName = (roundNumber: number) => {
    const maxRound = Math.max(...matches.map(m => m.round));
    
    if (roundNumber === maxRound) {
      return t('tournament.final') || '決勝';
    } else if (roundNumber === maxRound - 1) {
      return t('tournament.semifinal') || '準決勝';
    } else if (roundNumber === maxRound - 2) {
      return t('tournament.quarterfinal') || '準々決勝';
    } else {
      return `${t('tournament.round') || 'ラウンド'} ${roundNumber}`;
    }
  };

  // ラウンドごとにマッチをグループ化
  const matchesByRound = matches.reduce((acc, match) => {
    if (!acc[match.round]) {
      acc[match.round] = [];
    }
    acc[match.round].push(match);
    return acc;
  }, {} as Record<number, Match[]>);

  // ラウンド番号を取得し、昇順にソート
  const roundNumbers = Object.keys(matchesByRound).map(Number).sort((a, b) => a - b);

  return (
    <Box>
      {roundNumbers.length === 0 ? (
        <Typography color="text.secondary" align="center">
          {t('tournament.noMatches') || '試合がまだ設定されていません'}
        </Typography>
      ) : (
        roundNumbers.map(roundNumber => (
          <Box key={roundNumber} sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              {getRoundName(roundNumber)}
            </Typography>
            <Grid container spacing={2}>
              {matchesByRound[roundNumber]
                .sort((a, b) => a.matchNumber - b.matchNumber)
                .map(match => (
                  <Grid item xs={12} sm={6} md={4} key={match.id}>
                    <Card elevation={3}>
                      <CardContent>
                        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="caption" color="text.secondary">
                            {t('tournament.match') || '試合'} #{match.matchNumber}
                          </Typography>
                          <Chip 
                            size="small" 
                            label={
                              match.status === 'completed' 
                                ? t('tournament.completed') || '完了' 
                                : match.status === 'inProgress'
                                  ? t('tournament.inProgress') || '進行中'
                                  : t('tournament.scheduled') || '予定'
                            }
                            color={
                              match.status === 'completed' 
                                ? 'success' 
                                : match.status === 'inProgress' 
                                  ? 'primary' 
                                  : 'default'
                            }
                          />
                        </Box>
                        
                        <Grid container spacing={2} alignItems="center">
                          {/* チーム1 */}
                          <Grid item xs={5}>
                            <Typography 
                              variant="body2" 
                              fontWeight={match.winnerId === match.team1Id ? 'bold' : 'normal'}
                              color={match.winnerId === match.team1Id ? 'success.main' : 'text.primary'}
                            >
                              {getTeamName(match.team1Id)}
                            </Typography>
                          </Grid>
                          
                          {/* スコア1 */}
                          <Grid item xs={2}>
                            <TextField
                              value={match.team1Score}
                              onChange={(e) => handleScoreChange(match.id, 'team1Score', e.target.value)}
                              size="small"
                              type="number"
                              inputProps={{ min: 0, style: { textAlign: 'center' } }}
                              disabled={match.status === 'completed'}
                            />
                          </Grid>
                          
                          <Grid item xs={12}>
                            <Divider sx={{ my: 1 }}>
                              <Typography variant="caption" color="text.secondary">VS</Typography>
                            </Divider>
                          </Grid>
                          
                          {/* チーム2 */}
                          <Grid item xs={5}>
                            <Typography 
                              variant="body2" 
                              fontWeight={match.winnerId === match.team2Id ? 'bold' : 'normal'}
                              color={match.winnerId === match.team2Id ? 'success.main' : 'text.primary'}
                            >
                              {getTeamName(match.team2Id)}
                            </Typography>
                          </Grid>
                          
                          {/* スコア2 */}
                          <Grid item xs={2}>
                            <TextField
                              value={match.team2Score}
                              onChange={(e) => handleScoreChange(match.id, 'team2Score', e.target.value)}
                              size="small"
                              type="number"
                              inputProps={{ min: 0, style: { textAlign: 'center' } }}
                              disabled={match.status === 'completed'}
                            />
                          </Grid>
                        </Grid>

                        {/* 勝者指定（同点の場合など） */}
                        {match.status !== 'completed' && match.team1Id !== '' && match.team2Id !== '' && (
                          <FormControl fullWidth margin="normal" size="small">
                            <InputLabel>{t('tournament.winner') || '勝者'}</InputLabel>
                            <Select
                              value={match.winnerId || ''}
                              onChange={(e) => handleWinnerChange(match.id, e.target.value as string)}
                              label={t('tournament.winner') || '勝者'}
                            >
                              <MenuItem value="">{t('tournament.selectWinner') || '勝者を選択'}</MenuItem>
                              <MenuItem value={match.team1Id}>{getTeamName(match.team1Id)}</MenuItem>
                              <MenuItem value={match.team2Id}>{getTeamName(match.team2Id)}</MenuItem>
                            </Select>
                            <FormHelperText>{t('tournament.winnerHelp') || '同点の場合は手動で勝者を指定'}</FormHelperText>
                          </FormControl>
                        )}
                      </CardContent>
                      
                      <CardActions sx={{ justifyContent: 'flex-end' }}>
                        <FormControl size="small">
                          <Select
                            value={match.status}
                            onChange={(e) => handleStatusChange(match.id, e.target.value as "scheduled" | "inProgress" | "completed")}
                            displayEmpty
                            variant="outlined"
                            size="small"
                          >
                            <MenuItem value="scheduled">{t('tournament.scheduled') || '予定'}</MenuItem>
                            <MenuItem value="inProgress">{t('tournament.inProgress') || '進行中'}</MenuItem>
                            <MenuItem value="completed">{t('tournament.completed') || '完了'}</MenuItem>
                          </Select>
                        </FormControl>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
            </Grid>
          </Box>
        ))
      )}
    </Box>
  );
};

export default TournamentScoring;
