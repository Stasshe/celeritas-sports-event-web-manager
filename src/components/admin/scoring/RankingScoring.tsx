import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Chip,
  Alert,
  Card,
  CardContent,
  useTheme,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { Sport, Team, RankingEntry } from '../../../types';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';

interface RankingScoringProps {
  sport: Sport;
  onUpdate: (updatedSport: Sport) => void;
  readOnly?: boolean;
}

const RankingScoring: React.FC<RankingScoringProps> = ({ sport, onUpdate, readOnly = false }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  
  const [teams, setTeams] = useState<Team[]>([]);
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState<'add' | 'edit'>('add');
  const [selectedEntry, setSelectedEntry] = useState<RankingEntry | null>(null);
  const [criteriaName, setCriteriaName] = useState(sport.rankingSettings?.criteriaName || 'スコア');
  const [isAscending, setIsAscending] = useState(sport.rankingSettings?.isAscending || false);

  // 名簿データからクラスをチームとして生成する
  const generateTeamsFromRoster = useCallback(() => {
    if (!sport.roster) return [];

    const generatedTeams: Team[] = [];
    
    // 各学年のクラスを処理
    Object.entries(sport.roster).forEach(([gradeKey, gradeData]) => {
      if (!gradeData) return;
      
      // 各クラスをチームとして追加
      Object.entries(gradeData).forEach(([className, members]) => {
        // グレード名を取得（例: grade1 → 1年）
        const gradeNumber = gradeKey.replace('grade', '');
        const gradeName = t(`roster.grade${gradeNumber}`);
        
        // チームIDをクラス名と学年から生成
        const teamId = `${gradeKey}_${className}`;
        const teamName = `${gradeName}${className}`;
        
        generatedTeams.push({
          id: teamId,
          name: teamName,
          members: Array.isArray(members) ? members : []
        });
      });
    });
    
    return generatedTeams;
  }, [sport.roster, t]);

  // 初期ランキングデータとチームデータをロード
  useEffect(() => {
    if (sport && sport.type === 'ranking') {
      // スポーツデータからランキングを取得
      const rankings = Array.isArray(sport.rankings) ? sport.rankings : [];
      setRankings(rankings);
      
      // ランキング設定を取得
      if (sport.rankingSettings) {
        setCriteriaName(sport.rankingSettings.criteriaName || 'スコア');
        setIsAscending(sport.rankingSettings.isAscending || false);
      }
      
      // 名簿からチームを生成
      const generatedTeams = generateTeamsFromRoster();
      setTeams(generatedTeams);
    }
  }, [sport, generateTeamsFromRoster]);

  // ランキングのソート関数
  const sortRankings = useCallback((entries: RankingEntry[]) => {
    return [...entries].sort((a, b) => {
      // まずランク順にソート
      if (a.rank !== b.rank) {
        return a.rank - b.rank;
      }
      
      // ランクが同じ場合はスコアでソート
      if ((a.score !== undefined && b.score !== undefined) && (a.score && b.score)) {
        return isAscending 
          ? a.score - b.score  // 小さい方が上位（タイムなど）
          : b.score - a.score; // 大きい方が上位（得点など）
      }
      
      return 0;
    });
  }, [isAscending]);

  // チーム名を取得
  const getTeamName = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    return team ? team.name : t('ranking.unknownTeam');
  };

  // Firebase用に undefined を null に変換する関数
  const sanitizeRankingsForFirebase = useCallback((rankings: RankingEntry[]): RankingEntry[] => {
    return rankings.map(entry => ({
      ...entry,
      // undefined は Firebase で許可されていないため null に変換
      score: entry.score === undefined ? null : entry.score
    }));
  }, []);

  // ランキングエントリを追加/編集する
  const handleSaveEntry = () => {
    if (!selectedEntry) return;
    
    // Firebase向けに値を調整（selectedEntryのscoreがundefinedならnullに）
    const sanitizedEntry: RankingEntry = {
      ...selectedEntry,
      score: selectedEntry.score === undefined ? null : selectedEntry.score
    };
    
    if (editMode === 'add') {
      // 新規追加
      const newRankings = [...rankings, sanitizedEntry];
      setRankings(sortRankings(newRankings));
      
      // スポーツデータを更新
      onUpdate({
        ...sport,
        rankings: sanitizeRankingsForFirebase(newRankings),
        rankingSettings: {
          ...sport.rankingSettings,
          criteriaName,
          isAscending
        }
      });
    } else {
      // 既存エントリの更新
      const newRankings = rankings.map(entry => 
        entry.id === sanitizedEntry.id ? sanitizedEntry : entry
      );
      setRankings(sortRankings(newRankings));
      
      // スポーツデータを更新
      onUpdate({
        ...sport,
        rankings: sanitizeRankingsForFirebase(newRankings),
        rankingSettings: {
          ...sport.rankingSettings,
          criteriaName,
          isAscending
        }
      });
    }
    
    setDialogOpen(false);
    setSelectedEntry(null);
  };

  // ランキングエントリを削除
  const handleDeleteEntry = (id: string) => {
    const newRankings = rankings.filter(entry => entry.id !== id);
    setRankings(newRankings);
    
    // スポーツデータを更新
    onUpdate({
      ...sport,
      rankings: sanitizeRankingsForFirebase(newRankings)
    });
  };

  // 設定を保存
  const handleSaveSettings = () => {
    // 設定を更新し、必要に応じてランキングを再ソート
    onUpdate({
      ...sport,
      rankings: sanitizeRankingsForFirebase(rankings),
      rankingSettings: {
        criteriaName,
        isAscending
      }
    });
    
    setSettingsDialogOpen(false);
  };

  // ドラッグ&ドロップでランキングを並べ替え
  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const items = Array.from(rankings);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    // ランク番号を更新
    const updatedItems = items.map((item, index) => ({
      ...item,
      rank: index + 1
    }));
    
    setRankings(updatedItems);
    
    // スポーツデータを更新
    onUpdate({
      ...sport,
      rankings: sanitizeRankingsForFirebase(updatedItems)
    });
  };

  // 名簿からすべてのチームを一括追加
  const handleAddAllTeams = () => {
    if (!teams || teams.length === 0) return;
    
    // すでにランキングに含まれているチームを除外
    const existingTeamIds = new Set(rankings.map(r => r.teamId));
    const newTeams = teams.filter(team => !existingTeamIds.has(team.id));
    
    if (newTeams.length === 0) return;
    
    // 新しいエントリを作成
    const newEntries: RankingEntry[] = newTeams.map((team, index) => ({
      id: uuidv4(),
      teamId: team.id,
      rank: rankings.length + index + 1,
      score: null, // undefinedではなくnullを使用
      notes: ''
    }));
    
    const updatedRankings = [...rankings, ...newEntries];
    setRankings(sortRankings(updatedRankings));
    
    // スポーツデータを更新
    onUpdate({
      ...sport,
      rankings: sanitizeRankingsForFirebase(updatedRankings)
    });
  };

  return (
    <Box>
      {/* 設定部分 */}
      {!readOnly && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">{t('ranking.settings')}</Typography>
            <Button 
              variant="outlined" 
              color="primary" 
              onClick={() => setSettingsDialogOpen(true)}
            >
              {t('ranking.editSettings')}
            </Button>
          </Box>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body1">
                {t('ranking.criteriaName')}: <strong>{criteriaName}</strong>
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body1">
                {t('ranking.sortOrder')}: <strong>
                  {isAscending ? t('ranking.ascending') : t('ranking.descending')}
                </strong>
              </Typography>
            </Grid>
          </Grid>
          
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditMode('add');
                setSelectedEntry({
                  id: uuidv4(),
                  teamId: '',
                  rank: rankings.length + 1,
                  score: undefined,
                  notes: ''
                });
                setDialogOpen(true);
              }}
            >
              {t('ranking.addEntry')}
            </Button>
            
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<RefreshIcon />}
              onClick={handleAddAllTeams}
              disabled={teams.length === 0}
            >
              {t('ranking.addAllTeams')}
            </Button>
          </Box>
        </Paper>
      )}
      
      {/* ランキング一覧 */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          {t('ranking.title')}
        </Typography>
        
        {rankings.length > 0 ? (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="rankings">
              {(provided) => (
                <TableContainer ref={provided.innerRef} {...provided.droppableProps}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        {!readOnly && (
                          <TableCell width="5%"></TableCell>
                        )}
                        <TableCell width="10%">{t('ranking.rank')}</TableCell>
                        <TableCell width="40%">{t('ranking.team')}</TableCell>
                        <TableCell width="20%" align="right">
                          {criteriaName}
                          <Tooltip title={
                            isAscending 
                              ? t('ranking.ascendingTooltip')
                              : t('ranking.descendingTooltip')
                          }>
                            <IconButton size="small">
                              {isAscending ? <ArrowUpIcon fontSize="small" /> : <ArrowDownIcon fontSize="small" />}
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                        <TableCell width="15%">{t('ranking.notes')}</TableCell>
                        {!readOnly && (
                          <TableCell width="10%" align="right">{t('ranking.actions')}</TableCell>
                        )}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rankings.map((entry, index) => (
                        <Draggable
                          key={entry.id}
                          draggableId={entry.id}
                          index={index}
                          isDragDisabled={readOnly}
                        >
                          {(provided) => (
                            <TableRow
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              hover
                            >
                              {!readOnly && (
                                <TableCell {...provided.dragHandleProps}>
                                  <IconButton size="small" disabled>
                                    <svg width="18" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"></path>
                                    </svg>
                                  </IconButton>
                                </TableCell>
                              )}
                              <TableCell>
                                <Chip 
                                  label={entry.rank} 
                                  color={entry.rank <= 3 ? 'primary' : 'default'} 
                                  size="small"
                                />
                              </TableCell>
                              <TableCell>{getTeamName(entry.teamId)}</TableCell>
                              <TableCell align="right">
                                {entry.score !== undefined ? entry.score : '-'}
                              </TableCell>
                              <TableCell>
                                {entry.notes || ''}
                              </TableCell>
                              {!readOnly && (
                                <TableCell align="right">
                                  <IconButton
                                    size="small"
                                    color="primary"
                                    onClick={() => {
                                      setEditMode('edit');
                                      setSelectedEntry(entry);
                                      setDialogOpen(true);
                                    }}
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => handleDeleteEntry(entry.id)}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </TableCell>
                              )}
                            </TableRow>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Droppable>
          </DragDropContext>
        ) : (
          <Alert severity="info" sx={{ mt: 2 }}>
            {t('ranking.noEntries')}
          </Alert>
        )}
      </Paper>
      
      {/* エントリ追加/編集ダイアログ */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editMode === 'add' ? t('ranking.addEntry') : t('ranking.editEntry')}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>{t('ranking.team')}</InputLabel>
                <Select
                  value={selectedEntry?.teamId || ''}
                  onChange={(e) => setSelectedEntry(prev => 
                    prev ? { ...prev, teamId: e.target.value as string } : null
                  )}
                >
                  {teams.map(team => (
                    <MenuItem key={team.id} value={team.id}>{team.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('ranking.rank')}
                type="number"
                value={selectedEntry?.rank || 1}
                onChange={(e) => setSelectedEntry(prev => 
                  prev ? { ...prev, rank: parseInt(e.target.value) || 1 } : null
                )}
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={criteriaName}
                type="number"
                value={selectedEntry?.score !== undefined ? selectedEntry.score : ''}
                onChange={(e) => {
                  const value = e.target.value.trim();
                  setSelectedEntry(prev => 
                    prev ? { 
                      ...prev, 
                      score: value === '' ? undefined : Number(value)
                    } : null
                  );
                }}
                placeholder={t('ranking.optional')}
                helperText={
                  isAscending 
                    ? t('ranking.ascendingHelp') 
                    : t('ranking.descendingHelp')
                }
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('ranking.notes')}
                multiline
                rows={2}
                value={selectedEntry?.notes || ''}
                onChange={(e) => setSelectedEntry(prev => 
                  prev ? { ...prev, notes: e.target.value } : null
                )}
                placeholder={t('ranking.notesPlaceholder')}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleSaveEntry}
            disabled={!selectedEntry?.teamId}
          >
            {t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* 設定ダイアログ */}
      <Dialog
        open={settingsDialogOpen}
        onClose={() => setSettingsDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {t('ranking.rankingSettings')}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('ranking.criteriaName')}
                value={criteriaName}
                onChange={(e) => setCriteriaName(e.target.value)}
                helperText={t('ranking.criteriaNameHelp')}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body2" gutterBottom>
                {t('ranking.sortOrder')}
              </Typography>
              <ToggleButtonGroup
                value={isAscending ? 'asc' : 'desc'}
                exclusive
                onChange={(e, value) => {
                  if (value) setIsAscending(value === 'asc');
                }}
                fullWidth
              >
                <ToggleButton value="asc">
                  <ArrowUpIcon sx={{ mr: 1 }} />
                  {t('ranking.ascending')}
                </ToggleButton>
                <ToggleButton value="desc">
                  <ArrowDownIcon sx={{ mr: 1 }} />
                  {t('ranking.descending')}
                </ToggleButton>
              </ToggleButtonGroup>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                {isAscending 
                  ? t('ranking.ascendingDescription')
                  : t('ranking.descendingDescription')
                }
              </Typography>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsDialogOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleSaveSettings}
          >
            {t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RankingScoring;
