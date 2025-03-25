import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Switch,
  FormControlLabel,
  Grid,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Card,
  CardContent,
  Divider,
  Alert,
  Tooltip,
  CircularProgress,
  Slider
} from '@mui/material';
import {
  Save as SaveIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  MilitaryTech as TrophyIcon,
  EmojiEvents as MedalIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useDatabase } from '../../../hooks/useDatabase';
import { Event, Sport, OverallScoreEntry } from '../../../types';
import { alpha } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { useAdminLayout } from '../../../contexts/AdminLayoutContext';

interface OverallScoreTabProps {
  event: Event;
  onUpdate: (updatedEvent: Event) => void;
}

const OverallScoreTab: React.FC<OverallScoreTabProps> = ({ event, onUpdate }) => {
  const { t } = useTranslation();
  const { data: allSports } = useDatabase<Record<string, Sport>>('/sports');
  const navigate = useNavigate();
  const { showSnackbar } = useAdminLayout();
  
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [settings, setSettings] = useState({
    enabled: event.overallScoreboard?.enabled || false,
    displayScores: event.overallScoreboard?.displayScores ?? true,
    displayRank: event.overallScoreboard?.displayRank || 3,
    teamType: event.overallScoreboard?.teamType || 'class' as 'class' | 'grade' | 'custom',
    customTeams: event.overallScoreboard?.customTeams || []
  });
  const [newTeam, setNewTeam] = useState('');
  const [calculatedScores, setCalculatedScores] = useState<OverallScoreEntry[]>([]);
  
  // イベントに関連する競技のみをフィルタリング
  const eventSports = useMemo(() => {
    if (!allSports || !event.sports) return [];
    
    return event.sports
      .map(sportId => allSports[sportId])
      .filter(sport => sport !== undefined);
  }, [allSports, event.sports]);
  
  // スポーツのポイント設定をイベントから取得
  const getSportPointSettings = (sportId: string) => {
    if (!event.sportPointSettings) return null;
    return event.sportPointSettings[sportId];
  };
  
  // 各スポーツの有効なポイント設定を取得（イベント側の設定を優先）
  const getEffectivePointSettings = (sport: Sport) => {
    const eventSettings = getSportPointSettings(sport.id);
    if (eventSettings) return eventSettings;
    
    // イベントに設定がない場合はデフォルト値を返す
    return {
      enabled: false,
      points: [5, 3, 1],
      weight: 1.0
    };
  };
  
  // 初期設定
  useEffect(() => {
    if (event.overallScoreboard) {
      setSettings({
        enabled: event.overallScoreboard.enabled,
        displayScores: event.overallScoreboard.displayScores,
        displayRank: event.overallScoreboard.displayRank,
        teamType: event.overallScoreboard.teamType,
        customTeams: event.overallScoreboard.customTeams || []
      });
    }
    
    // 計算済みスコアがあれば読み込む
    if (event.overallScores) {
      loadCalculatedScores();
    }
  }, [event]);
  
  // チームリストを生成
  const teamList = useMemo(() => {
    switch (settings.teamType) {
      case 'class':
        // クラスリストの生成
        const classList: string[] = [];
        if (event.roster) {
          if (event.roster.grade1) {
            Object.keys(event.roster.grade1).forEach(cls => classList.push(cls));
          }
          if (event.roster.grade2) {
            Object.keys(event.roster.grade2).forEach(cls => classList.push(cls));
          }
          if (event.roster.grade3) {
            Object.keys(event.roster.grade3).forEach(cls => classList.push(cls));
          }
        }
        return classList.sort();
        
      case 'grade':
        // 学年リストの固定
        return ['1年', '2年', '3年'];
        
      case 'custom':
        // カスタムチーム
        return settings.customTeams;
        
      default:
        return [];
    }
  }, [settings.teamType, settings.customTeams, event.roster]);
  
  // 設定の保存
  const saveSettings = () => {
    setLoading(true);
    
    try {
      const updatedEvent = {
        ...event,
        overallScoreboard: settings
      };
      
      // onUpdate関数を呼び出して親コンポーネントに通知
      onUpdate(updatedEvent);
      
      // 成功メッセージ
      showSnackbar(t('scoreboard.settingsSaved'), 'success');
    } catch (error) {
      console.error('Error saving scoreboard settings:', error);
      showSnackbar(t('scoreboard.settingsError'), 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // カスタムチームの追加
  const addCustomTeam = () => {
    if (newTeam.trim() && !settings.customTeams.includes(newTeam.trim())) {
      const updatedTeams = [...settings.customTeams, newTeam.trim()];
      setSettings({
        ...settings,
        customTeams: updatedTeams
      });
      setNewTeam('');
    }
  };
  
  // カスタムチームの削除
  const removeCustomTeam = (team: string) => {
    const updatedTeams = settings.customTeams.filter(t => t !== team);
    setSettings({
      ...settings,
      customTeams: updatedTeams
    });
  };
  
  // 計算済みスコアの読み込み
  const loadCalculatedScores = () => {
    if (!event.overallScores) return;
    
    const entries: OverallScoreEntry[] = Object.entries(event.overallScores)
      .map(([teamId, points]) => ({
        teamId,
        teamName: teamId,
        totalPoints: points,
        rank: 0, // 後で計算
        sportPoints: {} // 詳細は保持されていない
      }));
    
    // ランク付け
    entries.sort((a, b) => b.totalPoints - a.totalPoints);
    entries.forEach((entry, index) => {
      entry.rank = index + 1;
    });
    
    setCalculatedScores(entries);
  };
  
  // 総合成績を計算
  const calculateOverallScores = () => {
    setCalculating(true);
    
    // 各チームの得点を集計するオブジェクト
    const teamScores: Record<string, {
      totalPoints: number,
      sportPoints: Record<string, number>
    }> = {};
    
    // チームリストの初期化
    teamList.forEach(team => {
      teamScores[team] = {
        totalPoints: 0,
        sportPoints: {}
      };
    });
    
    // 各競技の結果からポイントを集計
    eventSports.forEach(sport => {
      const pointSettings = getEffectivePointSettings(sport);
      if (!pointSettings.enabled) return;
      
      const points = pointSettings.points || [5, 3, 1];
      const weight = pointSettings.weight || 1.0;
      
      // 競技の結果からランキングを取得
      const rankings = getTeamRankingsForSport(sport, teamList);
      
      // ポイント割り当て
      rankings.forEach((teamId, index) => {
        if (index < points.length && teamScores[teamId]) {
          const earnedPoints = points[index] * weight;
          teamScores[teamId].sportPoints[sport.id] = earnedPoints;
          teamScores[teamId].totalPoints += earnedPoints;
        }
      });
    });
    
    // OverallScoreEntry の形式に変換
    const entries: OverallScoreEntry[] = Object.entries(teamScores)
      .map(([teamId, data]) => ({
        teamId,
        teamName: teamId,
        totalPoints: data.totalPoints,
        rank: 0, // 後で設定
        sportPoints: data.sportPoints
      }));
    
    // 合計点数でソートしてランク付け
    entries.sort((a, b) => b.totalPoints - a.totalPoints);
    entries.forEach((entry, index) => {
      entry.rank = index + 1;
    });
    
    setCalculatedScores(entries);
    
    // イベントに保存
    const overallScores: Record<string, number> = {};
    entries.forEach(entry => {
      overallScores[entry.teamId] = entry.totalPoints;
    });
    
    const updatedEvent = {
      ...event,
      overallScores
    };
    onUpdate(updatedEvent);
    
    setCalculating(false);
  };
  
  // 競技ごとのチームランキングを取得するサンプル関数
  // 実際のアプリでは、競技の結果から適切にランキングを生成する必要があります
  const getTeamRankingsForSport = (sport: Sport, teams: string[]): string[] => {
    const shuffled = [...teams].sort(() => 0.5 - Math.random());
    return shuffled;
  };
  
  // ポイント表示のフォーマット
  const formatPoints = (points: number) => {
    return Math.round(points * 10) / 10;
  };

  // 競技のポイント設定を更新する関数
  const handleSportPointUpdate = async (sportId: string, enabled: boolean, weight?: number, points?: number[]) => {
    if (!allSports || !allSports[sportId]) return;
    
    try {
      // 現在のイベントのスポーツポイント設定を取得
      const currentSportPointSettings = event.sportPointSettings || {};
      
      // 特定のスポーツの設定を更新
      const updatedPointSettings = {
        ...(currentSportPointSettings[sportId] || { points: [5, 3, 1], weight: 1.0 }),
        enabled: enabled,
        ...(weight !== undefined ? { weight } : {}),
        ...(points !== undefined ? { points } : {})
      };
      
      // 更新されたイベント全体
      const updatedEvent = {
        ...event,
        sportPointSettings: {
          ...currentSportPointSettings,
          [sportId]: updatedPointSettings
        }
      };
      
      // イベント全体を更新
      onUpdate(updatedEvent);
      
      // 成功したら再計算を促すメッセージを表示
      if (calculatedScores.length > 0) {
        showSnackbar(t('scoreboard.recalculatePrompt'), 'info');
      }
    } catch (error) {
      console.error('Error updating sport points:', error);
      showSnackbar(t('scoreboard.updatePointsError'), 'error');
    }
  };
  
  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          {t('scoreboard.settings')}
        </Typography>
        <Divider sx={{ mb: 2 }} />
        
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.enabled}
                  onChange={(e) => setSettings({
                    ...settings,
                    enabled: e.target.checked
                  })}
                />
              }
              label={t('scoreboard.enableOverallScoreboard')}
            />
          </Grid>
          
          {settings.enabled && (
            <>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.displayScores}
                      onChange={(e) => setSettings({
                        ...settings,
                        displayScores: e.target.checked
                      })}
                    />
                  }
                  label={t('scoreboard.displayDetailedScores')}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>
                  {t('scoreboard.displayRankCount')}
                </Typography>
                <Slider
                  value={settings.displayRank}
                  onChange={(_, value) => setSettings({
                    ...settings,
                    displayRank: value as number
                  })}
                  step={1}
                  marks
                  min={3}
                  max={10}
                  valueLabelDisplay="auto"
                />
              </Grid>
              
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>{t('scoreboard.teamType')}</InputLabel>
                  <Select
                    value={settings.teamType}
                    onChange={(e) => setSettings({
                      ...settings,
                      teamType: e.target.value as 'class' | 'grade' | 'custom'
                    })}
                    label={t('scoreboard.teamType')}
                  >
                    <MenuItem value="class">{t('scoreboard.teamTypeClass')}</MenuItem>
                    <MenuItem value="grade">{t('scoreboard.teamTypeGrade')}</MenuItem>
                    <MenuItem value="custom">{t('scoreboard.teamTypeCustom')}</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              {settings.teamType === 'custom' && (
                <Grid item xs={12}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      {t('scoreboard.customTeams')}
                    </Typography>
                    <Box sx={{ display: 'flex', mb: 2 }}>
                      <TextField
                        fullWidth
                        value={newTeam}
                        onChange={(e) => setNewTeam(e.target.value)}
                        label={t('scoreboard.newTeam')}
                        size="small"
                      />
                      <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={addCustomTeam}
                        disabled={!newTeam.trim()}
                        sx={{ ml: 1 }}
                      >
                        {t('common.add')}
                      </Button>
                    </Box>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {settings.customTeams.map((team) => (
                        <Chip
                          key={team}
                          label={team}
                          onDelete={() => removeCustomTeam(team)}
                        />
                      ))}
                      {settings.customTeams.length === 0 && (
                        <Typography variant="body2" color="text.secondary">
                          {t('scoreboard.noCustomTeams')}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Grid>
              )}
              
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<SaveIcon />}
                  onClick={saveSettings}
                  disabled={loading}
                >
                  {loading ? t('common.saving') : t('common.saveSettings')}
                </Button>
              </Grid>
            </>
          )}
        </Grid>
      </Paper>
      
      {settings.enabled && (
        <>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                {t('scoreboard.sportPointSettings')}
              </Typography>
              <Button
                variant="contained"
                onClick={calculateOverallScores}
                startIcon={<RefreshIcon />}
                disabled={calculating}
              >
                {calculating ? (
                  <CircularProgress size={24} />
                ) : (
                  t('scoreboard.calculateScores')
                )}
              </Button>
            </Box>
            <Divider sx={{ mb: 3 }} />
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('scoreboard.sportName')}</TableCell>
                    <TableCell>{t('scoreboard.includeInOverallScore')}</TableCell>
                    <TableCell>{t('scoreboard.pointDistribution')}</TableCell>
                    <TableCell>{t('scoreboard.weight')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {eventSports.map((sport) => {
                    const pointSettings = getEffectivePointSettings(sport);
                    return (
                      <TableRow key={sport.id}>
                        <TableCell>{sport.name}</TableCell>
                        <TableCell>
                          <Switch
                            checked={pointSettings.enabled || false}
                            onChange={(e) => {
                              handleSportPointUpdate(sport.id, e.target.checked);
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {(pointSettings.points || [5, 3, 1]).map((point, i) => (
                              <Chip
                                key={i}
                                icon={i === 0 ? <TrophyIcon color="primary" /> : (
                                  i === 1 ? <MedalIcon color="primary" /> : <MedalIcon />
                                )}
                                label={`${i + 1}位: ${point}点`}
                                variant={i === 0 ? "filled" : "outlined"}
                              />
                            ))}
                            <Tooltip title={t('scoreboard.editPointsHint')}>
                              <IconButton
                                size="small"
                                onClick={() => navigate(`/admin/sport/${sport.id}?tab=points`)}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', width: 150 }}>
                            <TextField
                              type="number"
                              size="small"
                              inputProps={{ 
                                min: 0.1, 
                                max: 3, 
                                step: 0.1 
                              }}
                              value={pointSettings.weight || 1.0}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value);
                                if (!isNaN(value)) {
                                  handleSportPointUpdate(sport.id, pointSettings.enabled, value);
                                }
                              }}
                              sx={{ width: 80 }}
                            />
                            <Tooltip title={t('scoreboard.weightHint')}>
                              <IconButton size="small">
                                <InfoIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  
                  {eventSports.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        {t('scoreboard.noSportsFound')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
          
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              {t('scoreboard.currentStandings')}
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            {calculatedScores.length > 0 ? (
              <>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 3 }}>
                  {calculatedScores.slice(0, 3).map((entry) => (
                    <Card 
                      key={entry.teamId} 
                      variant="outlined" 
                      sx={{ 
                        width: 200,
                        bgcolor: entry.rank === 1 ? 'gold' : (
                          entry.rank === 2 ? 'silver' : '#cd7f32'
                        ),
                        color: 'white',
                        textAlign: 'center'
                      }}
                    >
                      <CardContent>
                        <Typography variant="h2" component="div" gutterBottom>
                          {entry.rank}
                        </Typography>
                        <Typography variant="h6" component="div">
                          {entry.teamName}
                        </Typography>
                        <Typography variant="h5" component="div">
                          {formatPoints(entry.totalPoints)}点
                        </Typography>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
            
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('scoreboard.rank')}</TableCell>
                        <TableCell>{t('scoreboard.team')}</TableCell>
                        <TableCell align="right">{t('scoreboard.totalPoints')}</TableCell>
                        {settings.displayScores && eventSports.map(sport => (
                          <TableCell key={sport.id} align="right">{sport.name}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {calculatedScores.map((entry) => (
                        <TableRow 
                          key={entry.teamId}
                          sx={{ 
                            bgcolor: entry.rank <= 3 ? alpha(
                              entry.rank === 1 ? 'gold' : (
                                entry.rank === 2 ? 'silver' : '#cd7f32'
                              ), 0.1
                            ) : 'inherit'
                          }}
                        >
                          <TableCell>{entry.rank}</TableCell>
                          <TableCell>{entry.teamName}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                            {formatPoints(entry.totalPoints)}
                          </TableCell>
                          {settings.displayScores && eventSports.map(sport => (
                            <TableCell key={sport.id} align="right">
                              {entry.sportPoints[sport.id] 
                                ? formatPoints(entry.sportPoints[sport.id]) 
                                : '-'}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            ) : (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <Typography variant="body1" gutterBottom>
                  {t('scoreboard.noScoresCalculated')}
                </Typography>
                <Button
                  variant="contained"
                  onClick={calculateOverallScores}
                  startIcon={<RefreshIcon />}
                  sx={{ mt: 2 }}
                >
                  {t('scoreboard.calculateScores')}
                </Button>
              </Box>
            )}
          </Paper>
        </>
      )}
    </Box>
  );
};

export default OverallScoreTab;
