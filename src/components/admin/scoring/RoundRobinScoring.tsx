import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  Select,
  MenuItem,
  Grid,
  Chip,
  InputLabel,
  useTheme
} from '@mui/material';
import { Sport, Match, Team } from '../../../types';
import { useTranslation } from 'react-i18next';
import RoundRobinTable from '../../sports/RoundRobinTable';
import { Replay as AddIcon, Info as InfoIcon } from '@mui/icons-material';

interface RoundRobinScoringProps {
  sport: Sport;
  onUpdate: (updatedSport: Sport) => void;
}

const RoundRobinScoring: React.FC<RoundRobinScoringProps> = ({ sport, onUpdate }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const [teams, setTeams] = useState<Team[]>(sport.teams || []);
  const [matches, setMatches] = useState<Match[]>(sport.matches || []);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [pendingTeams, setPendingTeams] = useState<Team[]>([]);
  const teamsRef = useRef<Team[]>(sport.teams || []);
  const matchesRef = useRef<Match[]>(sport.matches || []);

  // スポーツデータが更新されたときにローカルステートも更新
  useEffect(() => {
    teamsRef.current = sport.teams || [];
    matchesRef.current = sport.matches || [];
    setTeams(sport.teams || []);
    setMatches(sport.matches || []);
  }, [sport]);

  // rosterから全チームを自動生成する関数を改善
  const generateTeamsFromRoster = useCallback(() => {
    if (!sport.roster) return;

    const newTeams: Team[] = [];
    const existingTeams = new Set(teams.map(t => t.name));
    
    // 全学年のデータを処理
    const grades = ['grade1', 'grade2', 'grade3'] as const;
    
    grades.forEach(grade => {
      const gradeData = sport.roster?.[grade];
      if (!gradeData) return;

      // 各クラスをチームとして追加
      Object.entries(gradeData).forEach(([className, members]) => {
        if (!members || members.length === 0) return;

        const teamName = `${grade}-${className}`; // 例: "grade1-A"
        if (!existingTeams.has(teamName)) {
          newTeams.push({
            id: `team_${grade}_${className}_${Date.now()}`,
            name: teamName,
            members: members
          });
          existingTeams.add(teamName);
        }
      });
    });

    if (newTeams.length > 0) {
      // 新しいチームと既存のチームを結合
      const updatedTeams = [...teams, ...newTeams];
      setTeams(updatedTeams);
      
      // 新しいチーム間の試合を生成
      const generatedMatches = generateAllMatches(updatedTeams);
      const updatedMatches = [...matches, ...generatedMatches];
      setMatches(updatedMatches);
      
      // スポーツデータを更新
      onUpdate({
        ...sport,
        teams: updatedTeams,
        matches: updatedMatches
      });
    }
  }, [sport.roster, teams, matches, onUpdate]);

  // 全チーム間の試合を生成
  const generateAllMatches = (teamList: Team[]) => {
    const newMatches: Match[] = [];
    const existingPairs = new Set(
      matches.map(m => `${m.team1Id}-${m.team2Id}`)
    );

    teamList.forEach((team1, i) => {
      teamList.slice(i + 1).forEach(team2 => {
        // 既存の対戦がない場合のみ新しい試合を作成
        const pairKey = `${team1.id}-${team2.id}`;
        const reversePairKey = `${team2.id}-${team1.id}`;
        
        if (!existingPairs.has(pairKey) && !existingPairs.has(reversePairKey)) {
          newMatches.push({
            id: `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            team1Id: team1.id,
            team2Id: team2.id,
            team1Score: 0,
            team2Score: 0,
            round: 1,
            matchNumber: matches.length + newMatches.length + 1,
            status: 'scheduled'
          });
        }
      });
    });

    return newMatches;
  };

  // コンポーネントの先頭に追加
  useEffect(() => {
    if (teams.length === 0 && sport.roster) {
      generateTeamsFromRoster();
    }
  }, [sport.roster]);

  // 生成ボタンのハンドラー
  const handleGenerateClick = () => {
    if (!sport.roster) return;

    const newTeams: Team[] = [];
    const existingTeams = new Set(teams.map(t => t.name));
    
    // 全学年のデータを処理
    const grades = ['grade1', 'grade2', 'grade3'] as const;
    
    grades.forEach(grade => {
      const gradeData = sport.roster?.[grade];
      if (!gradeData) return;

      // 各クラスをチームとして追加
      Object.entries(gradeData).forEach(([className, members]) => {
        if (!members || members.length === 0) return;

        const teamName = `${grade}-${className}`;
        if (!existingTeams.has(teamName)) {
          newTeams.push({
            id: `team_${grade}_${className}_${Date.now()}`,
            name: teamName,
            members: members
          });
        }
      });
    });

    if (newTeams.length > 0) {
      setPendingTeams(newTeams);
      // 既存のスコアがある場合は確認ダイアログを表示
      if (matches.some(m => m.team1Score > 0 || m.team2Score > 0)) {
        setShowResetConfirm(true);
      } else {
        handleGenerateTeams(newTeams, false);
      }
    }
  };

  // チーム生成の実行
  const handleGenerateTeams = (newTeams: Team[], resetScores: boolean) => {
    const updatedTeams = [...teams, ...newTeams];
    let updatedMatches = [...matches];

    if (resetScores) {
      // 全試合のスコアをリセット
      updatedMatches = updatedMatches.map(match => ({
        ...match,
        team1Score: 0,
        team2Score: 0,
        status: 'scheduled',
        winnerId: undefined
      }));
    }

    // 新しいチーム間の試合を生成
    const generatedMatches = generateAllMatches(updatedTeams);
    updatedMatches = [...updatedMatches, ...generatedMatches];

    setTeams(updatedTeams);
    setMatches(updatedMatches);
    
    // スポーツデータを更新
    onUpdate({
      ...sport,
      teams: updatedTeams,
      matches: updatedMatches
    });

    // 状態をリセット
    setPendingTeams([]);
    setShowResetConfirm(false);
  };

  // 対戦表を作成
  const matchGrid = teams.reduce((acc, team1) => {
    acc[team1.id] = teams.reduce((innerAcc, team2) => {
      innerAcc[team2.id] = matches.find(
        match => 
          (match.team1Id === team1.id && match.team2Id === team2.id) || 
          (match.team1Id === team2.id && match.team2Id === team1.id)
      ) || null;
      return innerAcc;
    }, {} as Record<string, Match | null>);
    return acc;
  }, {} as Record<string, Record<string, Match | null>>);

  const handleOpenMatchDialog = (match: Match | null, team1Id: string, team2Id: string) => {
    if (match) {
      setSelectedMatch(match);
    } else {
      // 新しい試合を作成
      const newMatch: Match = {
        id: `match_${Date.now()}`,
        team1Id,
        team2Id,
        team1Score: 0,
        team2Score: 0,
        round: 1,
        matchNumber: matches.length + 1,
        status: 'scheduled',
      };
      setSelectedMatch(newMatch);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedMatch(null);
  };

  const handleScoreChange = (field: 'team1Score' | 'team2Score', value: string) => {
    if (selectedMatch) {
      const score = parseInt(value) || 0;
      setSelectedMatch({ ...selectedMatch, [field]: score });
    }
  };

  const handleStatusChange = (status: "scheduled" | "inProgress" | "completed") => {
    if (selectedMatch) {
      setSelectedMatch({ ...selectedMatch, status });
    }
  };

  const handleSaveMatch = async () => {
    if (selectedMatch) {
      try {
        // 勝者を自動判定
        let updatedMatch = { ...selectedMatch };
        
        if (updatedMatch.team1Score > updatedMatch.team2Score) {
          updatedMatch.winnerId = updatedMatch.team1Id;
        } else if (updatedMatch.team1Score < updatedMatch.team2Score) {
          updatedMatch.winnerId = updatedMatch.team2Id;
        } else {
          updatedMatch.winnerId = 'tie-error'; // 同点の場合は勝者なし（null を使用）
        }

        // マッチリストを更新
        const updatedMatches = matches.map(m => 
          m.id === updatedMatch.id ? updatedMatch : m
        );
        
        // スポーツデータを更新（エラーハンドリングを追加）
        await onUpdate({
          ...sport,
          matches: updatedMatches
        });

        setMatches(updatedMatches);
        handleCloseDialog();
      } catch (error) {
        console.error('Error saving match:', error);
        // エラー表示などの処理を追加
        return false;
      }
    }
  };

  // チーム名を取得する関数
  const getTeamName = (teamId: string) => {
    const team = teams.find(team => team.id === teamId);
    return team ? team.name : 'Unknown';
  };

  return (
    <Box>
      {/* 生成ボタンを追加 */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleGenerateClick}
        >
          {t('roundRobin.generateTeams')}
        </Button>
      </Box>

      <Typography variant="h6" gutterBottom>
        {t('roundRobin.matchTable') || '対戦表'}
        <p>
          <InfoIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 1 }} />
          {t('roundRobin.clickMatchToAddScore') || '対戦表の、それぞれの試合をクリックしてスコアを変更できます。'}
        </p>
      </Typography>
      
      <TableContainer component={Paper} sx={{ mb: 4, overflow: 'auto' }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ minWidth: 120, fontWeight: 'bold' }}>{t('roundRobin.team') || 'チーム'}</TableCell>
              {teams.map(team => (
                <TableCell 
                  key={team.id} 
                  align="center" 
                  sx={{ 
                    minWidth: 80,
                    bgcolor: theme.palette.primary.light,
                    color: theme.palette.primary.contrastText,
                    fontWeight: 'bold'
                  }}
                >
                  {team.name}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {teams.map(team1 => (
              <TableRow key={team1.id} hover>
                <TableCell component="th" scope="row" sx={{ fontWeight: 'bold', bgcolor: theme.palette.grey[100] }}>
                  {team1.name}
                </TableCell>
                {teams.map(team2 => {
                  const match = team1.id === team2.id ? null : matchGrid[team1.id]?.[team2.id];
                  
                  return (
                    <TableCell 
                      key={team2.id} 
                      align="center" 
                      onClick={team1.id !== team2.id ? () => handleOpenMatchDialog(match, team1.id, team2.id) : undefined}
                      sx={{
                        backgroundColor: team1.id === team2.id ? theme.palette.action.hover : 
                          match?.status === 'completed' ? theme.palette.success.light : 
                          match?.status === 'inProgress' ? theme.palette.info.light : 'inherit',
                        cursor: team1.id !== team2.id ? 'pointer' : 'default',
                        '&:hover': {
                          backgroundColor: team1.id !== team2.id ? theme.palette.action.hover : undefined
                        },
                        fontWeight: match ? 'bold' : 'normal'
                      }}
                    >
                      {team1.id === team2.id ? (
                        '-'
                      ) : match ? (
                        <Box>
                          <Typography variant="body2">
                            {match.team1Id === team1.id ? (
                              `${match.team1Score} - ${match.team2Score}`
                            ) : (
                              `${match.team2Score} - ${match.team1Score}`
                            )}
                          </Typography>
                          <Chip 
                            size="small" 
                            label={
                              match.status === 'completed' ? (t('match.completed') || '完了') : 
                              match.status === 'inProgress' ? (t('match.inProgress') || '進行中') : 
                              (t('match.scheduled') || '予定')
                            }
                            color={
                              match.status === 'completed' ? 'success' : 
                              match.status === 'inProgress' ? 'primary' : 
                              'default'
                            }
                            sx={{ mt: 0.5, fontSize: '0.6rem' }}
                          />
                        </Box>
                      ) : (
                        <Button 
                          variant="outlined" 
                          size="small"
                          color="primary"
                          sx={{ minWidth: 'auto', p: '2px 8px' }}
                        >
                          {t('roundRobin.addScore') || '記録'}
                        </Button>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 閲覧用テーブルの追加 */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          {t('roundRobin.currentStandings')}
        </Typography>
        <RoundRobinTable sport={sport} />
      </Box>
      
      {/* スコア入力ダイアログ */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {t('roundRobin.matchDetails') || '試合詳細'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3}>
            <Grid item xs={12} sx={{ mb: 2 }}>
              <Grid container alignItems="center" spacing={2}>
                <Grid item xs={5} sx={{ textAlign: 'center' }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {selectedMatch ? getTeamName(selectedMatch.team1Id) : ''}
                  </Typography>
                </Grid>
                <Grid item xs={2} sx={{ textAlign: 'center' }}>
                  <Typography variant="body1">VS</Typography>
                </Grid>
                <Grid item xs={5} sx={{ textAlign: 'center' }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {selectedMatch ? getTeamName(selectedMatch.team2Id) : ''}
                  </Typography>
                </Grid>
              </Grid>
            </Grid>

            <Grid item xs={12}>
              <Grid container spacing={2}>
                <Grid item xs={5}>
                  <TextField
                    fullWidth
                    label={t('roundRobin.score') || 'スコア'}
                    type="number"
                    value={selectedMatch?.team1Score || 0}
                    onChange={(e) => handleScoreChange('team1Score', e.target.value)}
                    inputProps={{ min: 0 }}
                    disabled={selectedMatch?.status === 'completed'}
                  />
                </Grid>
                <Grid item xs={2} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <Typography variant="h5">-</Typography>
                </Grid>
                <Grid item xs={5}>
                  <TextField
                    fullWidth
                    label={t('roundRobin.score') || 'スコア'}
                    type="number"
                    value={selectedMatch?.team2Score || 0}
                    onChange={(e) => handleScoreChange('team2Score', e.target.value)}
                    inputProps={{ min: 0 }}
                    disabled={selectedMatch?.status === 'completed'}
                  />
                </Grid>
              </Grid>
            </Grid>

            <Grid item xs={12} sx={{ mt: 2 }}>
              <FormControl fullWidth>
                <InputLabel>{t('roundRobin.status') || '状態'}</InputLabel>
                <Select
                  value={selectedMatch?.status || 'scheduled'}
                  onChange={(e) => handleStatusChange(e.target.value as "scheduled" | "inProgress" | "completed")}
                >
                  <MenuItem value="scheduled">{t('match.scheduled') || '予定'}</MenuItem>
                  <MenuItem value="inProgress">{t('match.inProgress') || '進行中'}</MenuItem>
                  <MenuItem value="completed">{t('match.completed') || '完了'}</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sx={{ mt: 1 }}>
              <TextField
                fullWidth
                label={t('roundRobin.notes') || 'メモ'}
                multiline
                rows={2}
                value={selectedMatch?.notes || ''}
                onChange={(e) => selectedMatch && setSelectedMatch({...selectedMatch, notes: e.target.value})}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>{t('common.cancel') || 'キャンセル'}</Button>
          <Button 
            onClick={handleSaveMatch} 
            variant="contained" 
            color="primary"
          >
            {t('common.save') || '保存'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 確認ダイアログ */}
      <Dialog
        open={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
      >
        <DialogTitle>
          {t('roundRobin.confirmReset')}
        </DialogTitle>
        <DialogContent>
          <Typography>
            {t('roundRobin.resetScoresConfirm')}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowResetConfirm(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={() => handleGenerateTeams(pendingTeams, false)}
            color="primary"
          >
            {t('roundRobin.keepScores')}
          </Button>
          <Button
            onClick={() => handleGenerateTeams(pendingTeams, true)}
            color="error"
            variant="contained"
          >
            {t('roundRobin.resetScores')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RoundRobinScoring;
