import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Divider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  SelectChangeEvent
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Engineering as SetupIcon
} from '@mui/icons-material';
import { Sport, Match, Team } from '../../../types';
import { useTranslation } from 'react-i18next';
import { useThemeContext } from '../../../contexts/ThemeContext';
import TeamManagement from '../TeamManagement';

interface TournamentScoringProps {
  sport: Sport;
  onUpdate: (sport: Sport) => void;
}

interface MatchNode {
  match: Match;
  nextMatchId?: string;
  round: number;
  position: number;
}

const TournamentScoring: React.FC<TournamentScoringProps> = ({ sport, onUpdate }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { alpha } = useThemeContext();
  
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [matches, setMatches] = useState<Match[]>(sport.matches || []);
  const [showTeamManagement, setShowTeamManagement] = useState(false);
  const [tournamentStructure, setTournamentStructure] = useState<MatchNode[][]>([]);
  const [setupDialogOpen, setSetupDialogOpen] = useState(false);
  const [setupConfig, setSetupConfig] = useState({
    teamCount: sport.teams?.length || 4,
    hasThirdPlace: sport.tournamentSettings?.hasThirdPlaceMatch || false
  });
  
  // 試合一覧が変更されたらスポーツデータを更新
  useEffect(() => {
    const updatedSport = { ...sport, matches };
    onUpdate(updatedSport);
  }, [matches]);
  
  // トーナメント構造を構築
  useEffect(() => {
    if (matches.length > 0) {
      buildTournamentStructure();
    }
  }, [matches]);

  // トーナメント構造を構築する関数
  const buildTournamentStructure = () => {
    // 最大のラウンドを特定
    const maxRound = Math.max(...matches.map(m => m.round), 1);
    
    // ラウンドごとに試合を整理
    const roundMatches: MatchNode[][] = Array(maxRound).fill(null).map(() => []);
    
    // 試合データをノードに変換してラウンドごとに格納
    matches.forEach(match => {
      roundMatches[match.round - 1].push({
        match,
        round: match.round,
        position: match.matchNumber
      });
    });
    
    // 各ラウンドの試合を位置でソート
    roundMatches.forEach(round => {
      round.sort((a, b) => a.position - b.position);
    });
    
    setTournamentStructure(roundMatches);
  };
  
  // 試合編集ダイアログを開く
  const handleEditMatch = (match: Match) => {
    setEditingMatch({ ...match });
  };
  
  // 試合編集をキャンセル
  const handleCancelEdit = () => {
    setEditingMatch(null);
  };
  
  // 試合データの保存
  const handleSaveMatch = () => {
    if (!editingMatch) return;
    
    const updatedMatches = matches.map(match => 
      match.id === editingMatch.id ? editingMatch : match
    );
    
    // 勝者が決まった場合、次のラウンドの対応する試合を更新
    if (editingMatch.team1Score !== editingMatch.team2Score) {
      const winnerId = editingMatch.team1Score > editingMatch.team2Score 
        ? editingMatch.team1Id 
        : editingMatch.team2Id;
      
      // 勝者を設定
      const matchWithWinner = { ...editingMatch, winnerId };
      
      // 更新するマッチのインデックスを探す
      const matchIndex = updatedMatches.findIndex(m => m.id === editingMatch.id);
      updatedMatches[matchIndex] = matchWithWinner;
      
      // 次のラウンドの対応する試合を探す
      const nextRound = editingMatch.round + 1;
      const matchesInNextRound = matches.filter(m => m.round === nextRound);
      
      // 現在の位置に基づいて、次のラウンドのどの位置に進むかを計算
      const nextPosition = Math.ceil(editingMatch.matchNumber / 2);
      const nextMatch = matchesInNextRound.find(m => m.matchNumber === nextPosition);
      
      if (nextMatch) {
        // 試合の位置（奇数か偶数か）に基づいて、team1かteam2に勝者を設定
        const isOdd = editingMatch.matchNumber % 2 === 1;
        const updatedNextMatch = {
          ...nextMatch,
          team1Id: isOdd ? winnerId : nextMatch.team1Id,
          team2Id: !isOdd ? winnerId : nextMatch.team2Id
        };
        
        // 次の試合を更新
        const nextMatchIndex = updatedMatches.findIndex(m => m.id === nextMatch.id);
        updatedMatches[nextMatchIndex] = updatedNextMatch;
      }
    }
    
    setMatches(updatedMatches);
    setEditingMatch(null);
  };
  
  // 試合結果の変更を処理
  const handleMatchChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }> | SelectChangeEvent<string>) => {
    const { name, value } = e.target;
    if (!name || !editingMatch) return;
    
    if (name === 'team1Score' || name === 'team2Score') {
      const numValue = parseInt(value as string) || 0;
      setEditingMatch(prev => prev ? { ...prev, [name]: numValue } : null);
    } else if (name === 'team1Id' || name === 'team2Id' || name === 'status') {
      setEditingMatch(prev => prev ? { ...prev, [name]: value as string } : null);
    } else {
      setEditingMatch(prev => prev ? { ...prev, [name]: value } : null);
    }
  };
  
  // トーナメントの自動セットアップ
  const handleSetupTournament = () => {
    const { teamCount, hasThirdPlace } = setupConfig;
    
    // 試合数と構造を計算
    const matchCount = teamCount - 1;
    const roundCount = Math.ceil(Math.log2(teamCount));
    
    // 新しい試合データを作成
    const newMatches: Match[] = [];
    
    // 最初のラウンドの試合数を計算
    const firstRoundMatches = Math.pow(2, Math.ceil(Math.log2(teamCount))) / 2;
    
    // 各ラウンドの試合を生成
    for (let round = 1; round <= roundCount; round++) {
      // 現在のラウンドの試合数を計算
      const matchesInRound = round === 1 
        ? firstRoundMatches 
        : Math.pow(2, roundCount - round);
      
      for (let i = 0; i < matchesInRound; i++) {
        newMatches.push({
          id: `match_r${round}_${i+1}_${Date.now()}`,
          team1Id: '',
          team2Id: '',
          team1Score: 0,
          team2Score: 0,
          round,
          matchNumber: i + 1,
          status: 'scheduled'
        });
      }
    }
    
    // 3位決定戦が必要な場合は追加
    if (hasThirdPlace) {
      newMatches.push({
        id: `match_third_place_${Date.now()}`,
        team1Id: '',
        team2Id: '',
        team1Score: 0,
        team2Score: 0,
        round: roundCount,
        matchNumber: 0, // 特別な位置として0を使用
        status: 'scheduled'
      });
    }
    
    // 既存の試合をクリアして新しい構造を設定
    setMatches(newMatches);
    
    // トーナメント設定を更新
    const updatedSport = { 
      ...sport, 
      matches: newMatches,
      tournamentSettings: {
        ...(sport.tournamentSettings || {}),
        hasThirdPlaceMatch: hasThirdPlace,
        hasRepechage: sport.tournamentSettings?.hasRepechage || false
      }
    };
    
    onUpdate(updatedSport);
    setSetupDialogOpen(false);
  };

  // チーム名を取得する関数
  const getTeamName = (teamId: string) => {
    const team = sport.teams?.find(team => team.id === teamId);
    return team ? team.name : t('tournament.tbd');
  };
  
  // チームリストを取得
  const getTeamOptions = () => {
    return sport.teams?.map(team => (
      <MenuItem key={team.id} value={team.id}>{team.name}</MenuItem>
    )) || [];
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h6">
            {t('tournament.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('tournament.description')}
          </Typography>
        </Box>
        <Box>
          <Button
            variant="outlined"
            startIcon={<SetupIcon />}
            onClick={() => setSetupDialogOpen(true)}
            sx={{ mr: 1 }}
          >
            {t('tournament.setup')}
          </Button>
          <Button
            variant="outlined"
            onClick={() => setShowTeamManagement(!showTeamManagement)}
          >
            {showTeamManagement 
              ? t('tournament.hideTeams') 
              : t('tournament.manageTeams')
            }
          </Button>
        </Box>
      </Box>
      
      {/* チーム管理セクション */}
      {showTeamManagement && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <TeamManagement sport={sport} onUpdate={onUpdate} />
        </Paper>
      )}
      
      {/* トーナメント表 */}
      <Box sx={{ overflowX: 'auto', mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, minWidth: tournamentStructure.length * 280 }}>
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
              {roundMatches.map((matchNode) => (
                <Card 
                  key={matchNode.match.id} 
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
                  <CardContent sx={{ position: 'relative' }}>
                    <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
                      <IconButton 
                        size="small" 
                        onClick={() => handleEditMatch(matchNode.match)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Box>
                    
                    <Typography variant="caption" color="text.secondary">
                      {t('match.number', { number: matchNode.match.matchNumber })}
                    </Typography>
                    
                    <Box sx={{ mt: 1 }}>
                      {/* チーム1 */}
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        p: 1,
                        backgroundColor: matchNode.match.winnerId === matchNode.match.team1Id 
                          ? alpha(theme.palette.success.light, 0.1)
                          : 'transparent',
                        borderRadius: 1
                      }}>
                        <Typography fontWeight={matchNode.match.winnerId === matchNode.match.team1Id ? 'bold' : 'normal'}>
                          {getTeamName(matchNode.match.team1Id)}
                        </Typography>
                        <Typography fontWeight="bold">
                          {matchNode.match.team1Score}
                        </Typography>
                      </Box>
                      
                      {/* チーム2 */}
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        p: 1,
                        mt: 1,
                        backgroundColor: matchNode.match.winnerId === matchNode.match.team2Id 
                          ? alpha(theme.palette.success.light, 0.1)
                          : 'transparent',
                        borderRadius: 1
                      }}>
                        <Typography fontWeight={matchNode.match.winnerId === matchNode.match.team2Id ? 'bold' : 'normal'}>
                          {getTeamName(matchNode.match.team2Id)}
                        </Typography>
                        <Typography fontWeight="bold">
                          {matchNode.match.team2Score}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
                      <Chip 
                        label={
                          matchNode.match.status === 'completed' 
                            ? t('match.completed') 
                            : matchNode.match.status === 'inProgress'
                            ? t('match.inProgress')
                            : t('match.scheduled')
                        }
                        size="small"
                        color={
                          matchNode.match.status === 'completed' 
                            ? 'success' 
                            : matchNode.match.status === 'inProgress'
                            ? 'warning'
                            : 'default'
                        }
                      />
                    </Box>
                  </CardContent>
                </Card>
              ))}
              
              {roundMatches.length === 0 && (
                <Paper sx={{ p: 2, textAlign: 'center', opacity: 0.7 }}>
                  <Typography variant="body2" color="text.secondary">
                    {t('tournament.noMatches')}
                  </Typography>
                </Paper>
              )}
            </Box>
          ))}
          
          {tournamentStructure.length === 0 && (
            <Paper sx={{ p: 3, width: '100%', textAlign: 'center' }}>
              <Typography paragraph>
                {t('tournament.noStructure')}
              </Typography>
              <Button
                variant="contained"
                onClick={() => setSetupDialogOpen(true)}
                startIcon={<SetupIcon />}
              >
                {t('tournament.createStructure')}
              </Button>
            </Paper>
          )}
        </Box>
      </Box>
      
      {/* 試合編集ダイアログ */}
      <Dialog 
        open={!!editingMatch} 
        onClose={handleCancelEdit}
        maxWidth="sm"
        fullWidth
      >
        {editingMatch && (
          <>
            <DialogTitle>
              {t('match.edit', { number: editingMatch.matchNumber, round: editingMatch.round })}
            </DialogTitle>
            <DialogContent dividers>
              <Typography variant="subtitle1" gutterBottom>
                {t('match.teams')}
              </Typography>
              
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>{t('match.team1')}</InputLabel>
                    <Select
                      name="team1Id"
                      value={editingMatch.team1Id || ''}
                      onChange={handleMatchChange}
                    >
                      <MenuItem value="">{t('tournament.tbd')}</MenuItem>
                      {getTeamOptions()}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>{t('match.team2')}</InputLabel>
                    <Select
                      name="team2Id"
                      value={editingMatch.team2Id || ''}
                      onChange={handleMatchChange}
                    >
                      <MenuItem value="">{t('tournament.tbd')}</MenuItem>
                      {getTeamOptions()}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
              
              <Typography variant="subtitle1" gutterBottom>
                {t('match.scores')}
              </Typography>
              
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="team1Score"
                    label={t('match.scoreFor', { team: getTeamName(editingMatch.team1Id) })}
                    type="number"
                    fullWidth
                    value={editingMatch.team1Score}
                    onChange={handleMatchChange}
                    InputProps={{ inputProps: { min: 0 } }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="team2Score"
                    label={t('match.scoreFor', { team: getTeamName(editingMatch.team2Id) })}
                    type="number"
                    fullWidth
                    value={editingMatch.team2Score}
                    onChange={handleMatchChange}
                    InputProps={{ inputProps: { min: 0 } }}
                  />
                </Grid>
              </Grid>
              
              <Typography variant="subtitle1" gutterBottom>
                {t('match.status')}
              </Typography>
              
              <FormControl fullWidth>
                <InputLabel>{t('match.status')}</InputLabel>
                <Select
                  name="status"
                  value={editingMatch.status}
                  onChange={handleMatchChange as (event: SelectChangeEvent<string>) => void}
                >
                  <MenuItem value="scheduled">{t('match.scheduled')}</MenuItem>
                  <MenuItem value="inProgress">{t('match.inProgress')}</MenuItem>
                  <MenuItem value="completed">{t('match.completed')}</MenuItem>
                </Select>
              </FormControl>
              
              <TextField
                name="notes"
                label={t('match.notes')}
                multiline
                rows={2}
                fullWidth
                margin="normal"
                value={editingMatch.notes || ''}
                onChange={handleMatchChange}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCancelEdit}>
                {t('common.cancel')}
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSaveMatch}
                startIcon={<SaveIcon />}
              >
                {t('common.save')}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
      
      {/* トーナメント設定ダイアログ */}
      <Dialog
        open={setupDialogOpen}
        onClose={() => setSetupDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          {t('tournament.setup')}
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" paragraph>
            {t('tournament.setupWarning')}
          </Typography>
          
          <FormControl fullWidth margin="normal">
            <InputLabel>{t('tournament.teamCount')}</InputLabel>
            <Select
              value={setupConfig.teamCount}
              onChange={(e) => setSetupConfig(prev => ({ ...prev, teamCount: Number(e.target.value) }))}
            >
              {[4, 8, 16, 32].map(count => (
                <MenuItem key={count} value={count}>{count}</MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl fullWidth margin="normal">
            <InputLabel>{t('tournament.hasThirdPlace')}</InputLabel>
            <Select
              value={setupConfig.hasThirdPlace ? "true" : "false"}
              onChange={(e: SelectChangeEvent) => setSetupConfig(prev => ({ ...prev, hasThirdPlace: e.target.value === 'true' }))}
            >
              <MenuItem value="true">{t('common.yes')}</MenuItem>
              <MenuItem value="false">{t('common.no')}</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSetupDialogOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSetupTournament}
          >
            {t('tournament.create')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TournamentScoring;
