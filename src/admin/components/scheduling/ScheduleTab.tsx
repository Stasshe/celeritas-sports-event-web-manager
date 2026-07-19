import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  TextField,
  Grid,
  Button,
  Divider,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  Alert,
  IconButton,
  Chip,
  ToggleButtonGroup,
  ToggleButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText
} from '@mui/material';
import { 
  Add as AddIcon, 
  Delete as DeleteIcon,
  Schedule as ScheduleIcon,
  SportsCricket as Court1Icon,
  SportsVolleyball as Court2Icon
} from '@mui/icons-material';
import { Sport, ScheduleSettings, TimeSlot, Match, LeagueScheduleSettings } from '../../../types';

import TimeSlotTable from './TimeSlotTable';
import { generateSchedule } from '../../../utils/scheduleGenerator';
import ManualScheduleEditor from './ManualScheduleEditor';
  

interface ScheduleTabProps {
  sport: Sport;
  onUpdate: (updatedSport: Sport) => void;
}

const ScheduleTab: React.FC<ScheduleTabProps> = ({ sport, onUpdate }) => {
  // 現在のスポーツIDを保持
  const sportIdRef = useRef(sport.id);

  const [hasLunchBreak, setHasLunchBreak] = useState<boolean>(
    !!sport.scheduleSettings?.lunchBreak
  );
  const [manualEditorOpen, setManualEditorOpen] = useState(false);

  // 初期設定値
  const defaultSettings: ScheduleSettings = {
    startTime: '09:00',
    endTime: '17:00',
    matchDuration: 20,
    breakDuration: 5,
    courtCount: 1, // デフォルトは1コート
    courtNames: {
      court1: '第1コート',
      court2: '第2コート'
    },
    lunchBreak: hasLunchBreak ? { startTime: '12:00', endTime: '13:00' } : undefined,
    breakTimes: []
  };

  // リーグ戦用のデフォルト拡張設定
  const defaultLeagueSettings: LeagueScheduleSettings = {
    ...defaultSettings,
    groupStageDuration: 10,
    playoffDuration: 10,
    breakBetweenStages: 5
  };

  // スケジュール設定のローカルステート
  const [scheduleSettings, setScheduleSettings] = useState<ScheduleSettings | LeagueScheduleSettings>(
    sport.scheduleSettings || 
    (sport.type === 'league' ? defaultLeagueSettings : defaultSettings)
  );

  // スケジュール履歴管理
  const LOCAL_STORAGE_KEY = `scheduleHistory_${sport.id}`;
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(
    sport.scheduleSettings?.timeSlots || []
  );
  const [history, setHistory] = useState<TimeSlot[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // 履歴をローカルストレージから読み込む
  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const parsed: TimeSlot[][] = JSON.parse(saved);
        setHistory(parsed);
        setHistoryIndex(parsed.length - 1);
        if (parsed.length > 0) {
          setTimeSlots(parsed[parsed.length - 1]);
        }
      } catch {}
    } else {
      // 初期履歴
      setHistory([sport.scheduleSettings?.timeSlots || []]);
      setHistoryIndex(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sport.id]);

  // 履歴が変わったらローカルストレージに保存
  useEffect(() => {
    if (history.length > 0) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(history));
    }
  }, [history, LOCAL_STORAGE_KEY]);

  // sport.idが変わった時だけローカルstateを初期化
  useEffect(() => {
    if (sportIdRef.current !== sport.id) {
      sportIdRef.current = sport.id;
      const newSettings = sport.scheduleSettings ||
        (sport.type === 'league' ? defaultLeagueSettings : defaultSettings);
      setScheduleSettings(newSettings);
      setHasLunchBreak(!!sport.scheduleSettings?.lunchBreak);
      setTimeSlots(sport.scheduleSettings?.timeSlots || []);
    }
  }, [sport.id]);

  // 手動エディタでスロットを更新し、onUpdateで保存
  const handleManualEditorChange = (slots: TimeSlot[]) => {
    setTimeSlots(slots);
    // 履歴に追加
    const newHistory = history.slice(0, historyIndex + 1);
    setHistory([...newHistory, slots]);
    setHistoryIndex(newHistory.length);
    // 手動編集も即保存
    const safeSettings = {
      ...scheduleSettings,
      lunchBreak: scheduleSettings.lunchBreak || null,
      breakTimes: scheduleSettings.breakTimes || [],
      timeSlots: slots
    };
    onUpdate({
      ...sport,
      scheduleSettings: safeSettings
    });
  };

  // 新しい休憩時間
  const [newBreakTime, setNewBreakTime] = useState<Omit<TimeSlot, 'type'>>({
    startTime: '11:00',
    endTime: '11:15',
    title: '休憩'
  });

  // スケジュール生成のエラー
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);

  // 入力変更のハンドラ
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const updatedSettings = {
      ...scheduleSettings,
      [name]: name === 'matchDuration' || name === 'breakDuration' || 
              name === 'groupStageDuration' || name === 'playoffDuration' || 
              name === 'breakBetweenStages' || name === 'blockToPlayoffBreak'
        ? parseInt(value) || 0
        : value
    };
    setScheduleSettings(updatedSettings);
    // ここで即onUpdate
    onUpdate({
      ...sport,
      scheduleSettings: {
        ...updatedSettings,
        timeSlots: timeSlots
      }
    });
  };

  // コート数変更のハンドラ
  const handleCourtCountChange = (
    event: React.MouseEvent<HTMLElement>,
    newCourtCount: 1 | 2 | null
  ) => {
    if (newCourtCount !== null) {
      const updatedSettings = {
        ...scheduleSettings,
        courtCount: newCourtCount
      };
      setScheduleSettings(updatedSettings);
      onUpdate({
        ...sport,
        scheduleSettings: {
          ...updatedSettings,
          timeSlots: timeSlots
        }
      });
    }
  };

  // コート名変更のハンドラ
  const handleCourtNameChange = (court: 'court1' | 'court2', value: string) => {
    const currentCourtNames = scheduleSettings.courtNames || { 
      court1: '第1コート', 
      court2: scheduleSettings.courtCount > 1 ? '第2コート' : undefined 
    };
    const updatedSettings = {
      ...scheduleSettings,
      courtNames: {
        ...currentCourtNames,
        [court]: value
      }
    };
    setScheduleSettings(updatedSettings);
    onUpdate({
      ...sport,
      scheduleSettings: {
        ...updatedSettings,
        timeSlots: timeSlots
      }
    });
  };

  // ランチ休憩の切り替え
  const handleLunchBreakToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setHasLunchBreak(checked);
    const updatedSettings = {
      ...scheduleSettings,
      lunchBreak: checked 
        ? { startTime: '12:00', endTime: '13:00' }
        : null
    };
    setScheduleSettings(updatedSettings);
    onUpdate({
      ...sport,
      scheduleSettings: {
        ...updatedSettings,
        timeSlots: timeSlots
      }
    });
  };

  // ランチ休憩時間の変更
  const handleLunchBreakChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const updatedSettings = {
      ...scheduleSettings,
      lunchBreak: {
        ...scheduleSettings.lunchBreak!,
        [name]: value
      }
    };
    setScheduleSettings(updatedSettings);
    onUpdate({
      ...sport,
      scheduleSettings: {
        ...updatedSettings,
        timeSlots: timeSlots
      }
    });
  };

  // 新しい休憩時間の入力変更
  const handleNewBreakTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewBreakTime(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // 休憩時間の追加
  const handleAddBreakTime = () => {
    const newBreak: TimeSlot = {
      ...newBreakTime,
      type: 'break'
    };
    const updatedBreakTimes = [...(scheduleSettings.breakTimes || []), newBreak];
    const updatedSettings = {
      ...scheduleSettings,
      breakTimes: updatedBreakTimes
    };
    setScheduleSettings(updatedSettings);
    setNewBreakTime({
      startTime: '11:00',
      endTime: '11:15',
      title: '休憩'
    });
    onUpdate({
      ...sport,
      scheduleSettings: {
        ...updatedSettings,
        timeSlots: timeSlots
      }
    });
  };

  // 休憩時間の削除
  const handleRemoveBreakTime = (index: number) => {
    const updatedBreakTimes = [...(scheduleSettings.breakTimes || [])];
    updatedBreakTimes.splice(index, 1);
    const updatedSettings = {
      ...scheduleSettings,
      breakTimes: updatedBreakTimes
    };
    setScheduleSettings(updatedSettings);
    onUpdate({
      ...sport,
      scheduleSettings: {
        ...updatedSettings,
        timeSlots: timeSlots
      }
    });
  };

  // スケジュールの生成
  const handleGenerateSchedule = () => {
    try {
      setScheduleError(null);
      const safeSettings = {
        ...scheduleSettings,
        lunchBreak: scheduleSettings.lunchBreak || null,
        breakTimes: scheduleSettings.breakTimes || []
      };
      const generatedTimeSlots = generateSchedule(sport, safeSettings);
      setTimeSlots(generatedTimeSlots);
      // 履歴に追加
      const newHistory = history.slice(0, historyIndex + 1);
      setHistory([...newHistory, generatedTimeSlots]);
      setHistoryIndex(newHistory.length);
      const updatedSport = {
        ...sport,
        scheduleSettings: {
          ...safeSettings,
          timeSlots: generatedTimeSlots
        }
      };
      onUpdate(updatedSport);
    } catch (error) {
      console.error('Schedule generation error:', error);
      setScheduleError(error instanceof Error ? error.message : '不明なエラーが発生しました');
    }
  };

  // ダイアログを開く
  const handleGenerateClick = () => {
    if (timeSlots.length > 0) {
      setOpenConfirmDialog(true);
    } else {
      handleGenerateSchedule();
    }
  };

  // ダイアログを閉じる
  const handleCloseDialog = () => {
    setOpenConfirmDialog(false);
  };

  // スケジュールの生成を確定
  const handleConfirmGenerate = () => {
    setOpenConfirmDialog(false);
    handleGenerateSchedule();
  };

  // 順番を維持してリスケ
  const handleRescheduleWithoutShuffle = () => {
    try {
      setScheduleError(null);
      const safeSettings = {
        ...scheduleSettings,
        lunchBreak: scheduleSettings.lunchBreak || null,
        breakTimes: scheduleSettings.breakTimes || [],
        timeSlots: scheduleSettings.timeSlots || []
      };
      const currentMatchOrder = timeSlots.flatMap(slot => {
        if (slot.type === 'match' && slot.matchId) return [slot.matchId];
        return [];
      });
      const generatedTimeSlots = generateSchedule(sport, safeSettings, false, currentMatchOrder);
      setTimeSlots(generatedTimeSlots);
      // 履歴に追加
      const newHistory = history.slice(0, historyIndex + 1);
      setHistory([...newHistory, generatedTimeSlots]);
      setHistoryIndex(newHistory.length);
      const updatedSettings = {
        ...safeSettings,
        timeSlots: generatedTimeSlots
      };
      const updatedSport = {
        ...sport,
        scheduleSettings: updatedSettings
      };
      onUpdate(updatedSport);
    } catch (error) {
      console.error('Schedule generation error:', error);
      setScheduleError(error instanceof Error ? error.message : '不明なエラーが発生しました');
    }
  };

  // スポーツタイプに応じた入力フォーム
  const renderSportTypeSpecificInputs = () => {
    if (sport.type === 'league') {
      const leagueSettings = scheduleSettings as LeagueScheduleSettings;
      return (
        <Grid container spacing={2} justifyContent="center">
          <Grid item xs={12} sm={8} md={6} sx={{ display: 'flex', justifyContent: 'center' }}>
            <TextField
              fullWidth
              label={"プレーオフの試合時間 (分)"}
              name="playoffDuration"
              type="number"
              value={leagueSettings.playoffDuration}
              onChange={handleInputChange}
              InputProps={{ inputProps: { min: 1 } }}
              margin="normal"
              sx={{ maxWidth: 400 }}
            />
          </Grid>
          <Grid item xs={12} sm={8} md={6} sx={{ display: 'flex', justifyContent: 'center' }}>
            <TextField
              fullWidth
              label={"ブロック→プレーオフ間休憩（分）"}
              name="blockToPlayoffBreak"
              type="number"
              value={leagueSettings.blockToPlayoffBreak ?? ''}
              onChange={handleInputChange}
              InputProps={{ inputProps: { min: 0 } }}
              margin="normal"
              sx={{ maxWidth: 400 }}
            />
          </Grid>
        </Grid>
      );
    }
    
    // ランキング形式の場合は開始・終了時間のみ表示
    if (sport.type === 'ranking') {
      return (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Typography variant="subtitle1" color="text.secondary" gutterBottom>
              {"ランキング情報"}
            </Typography>
            <Alert severity="info">
              {"ランキングスケジュール情報"}
            </Alert>
          </Grid>
        </Grid>
      );
    }
    
    // トーナメントと総当たり戦の場合
    if (sport.type === 'tournament' || sport.type === 'roundRobin') {
      return (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              {"試合数"}: {sport.matches?.length || 0}
            </Typography>
            {(!sport.matches || sport.matches.length === 0) && (
              <Alert severity="warning">
                {"試合がありません"}
              </Alert>
            )}
          </Grid>
        </Grid>
      );
    }
    
    return null;
  };

  // Undo/Redoハンドラ
  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setTimeSlots(history[historyIndex - 1]);
    }
  };
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setTimeSlots(history[historyIndex + 1]);
    }
  };

  // 履歴インデックスが変わったらtimeSlotsを同期
  useEffect(() => {
    if (historyIndex >= 0 && historyIndex < history.length) {
      setTimeSlots(history[historyIndex]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyIndex]);

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {"スケジュール"}
      </Typography>
      <Divider sx={{ mb: 3 }} />
      <Grid container spacing={3}>
        {/* 基本設定 */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="subtitle1" gutterBottom>
              {"基本設定"}
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={"開始時間"}
                  name="startTime"
                  type="time"
                  value={scheduleSettings.startTime}
                  onChange={handleInputChange}
                  InputLabelProps={{ shrink: true }}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={"終了時間"}
                  name="endTime"
                  type="time"
                  value={scheduleSettings.endTime}
                  onChange={handleInputChange}
                  InputLabelProps={{ shrink: true }}
                  margin="normal"
                />
              </Grid>
              
              {sport.type !== 'ranking' && (
                <>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label={"1試合の所要時間 (分)"}
                      name="matchDuration"
                      type="number"
                      value={scheduleSettings.matchDuration}
                      onChange={handleInputChange}
                      InputProps={{ inputProps: { min: 5 } }}
                      margin="normal"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label={"試合間の休憩時間 (分)"}
                      name="breakDuration"
                      type="number"
                      value={scheduleSettings.breakDuration}
                      onChange={handleInputChange}
                      InputProps={{ inputProps: { min: 0 } }}
                      margin="normal"
                    />
                  </Grid>
                </>
              )}
              
              {/* コート設定の追加 */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                  {"コート設定"}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Typography variant="body2" sx={{ mr: 2 }}>
                    {"コート数"}:
                  </Typography>
                  <ToggleButtonGroup
                    value={scheduleSettings.courtCount}
                    exclusive
                    onChange={handleCourtCountChange}
                    aria-label="court count"
                    size="small"
                  >
                    <ToggleButton value={1} aria-label="1 court">
                      <Court1Icon sx={{ mr: 1 }} />
                      1 {"コート"}
                    </ToggleButton>
                    <ToggleButton value={2} aria-label="2 courts">
                      <Court2Icon sx={{ mr: 1 }} />
                      2 {"コート"}
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={"コート1名"}
                  value={scheduleSettings.courtNames?.court1 || '第1コート'}
                  onChange={(e) => handleCourtNameChange('court1', e.target.value)}
                  margin="normal"
                />
              </Grid>
              
              {scheduleSettings.courtCount === 2 && (
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={"コート2名"}
                    value={scheduleSettings.courtNames?.court2 || '第2コート'}
                    onChange={(e) => handleCourtNameChange('court2', e.target.value)}
                    margin="normal"
                  />
                </Grid>
              )}
              
              {/* スポーツタイプ特有の入力 */}
              {renderSportTypeSpecificInputs()}
            </Grid>
          </Paper>
        </Grid>
        {/* 休憩設定 */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="subtitle1" gutterBottom>
              {"休憩設定"}
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <FormControlLabel
              control={
                <Switch
                  checked={hasLunchBreak}
                  onChange={handleLunchBreakToggle}
                />
              }
              label={"昼休みを含める"}
            />
            
            {hasLunchBreak && (
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={"昼休み開始時間"}
                    name="startTime"
                    type="time"
                    value={scheduleSettings.lunchBreak?.startTime || '12:00'}
                    onChange={handleLunchBreakChange}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={"昼休み終了時間"}
                    name="endTime"
                    type="time"
                    value={scheduleSettings.lunchBreak?.endTime || '13:00'}
                    onChange={handleLunchBreakChange}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>
            )}
            
            <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>
              {"追加の休憩"}
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label={"休憩開始時間"}
                  name="startTime"
                  type="time"
                  value={newBreakTime.startTime}
                  onChange={handleNewBreakTimeChange}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label={"休憩終了時間"}
                  name="endTime"
                  type="time"
                  value={newBreakTime.endTime}
                  onChange={handleNewBreakTimeChange}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  label={"休憩タイトル"}
                  name="title"
                  value={newBreakTime.title || ''}
                  onChange={handleNewBreakTimeChange}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={1}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleAddBreakTime}
                  sx={{ mt: 1 }}
                  fullWidth
                >
                  <AddIcon />
                </Button>
              </Grid>
            </Grid>
            
            {/* 既存の休憩時間リスト */}
            <Box sx={{ mt: 2 }}>
              {(scheduleSettings.breakTimes || []).map((breakTime, index) => (
                <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Chip 
                    label={`${breakTime.title || "休憩"}: ${breakTime.startTime} - ${breakTime.endTime}`}
                    onDelete={() => handleRemoveBreakTime(index)}
                    color="secondary"
                    variant="outlined"
                  />
                </Box>
              ))}
              {(scheduleSettings.breakTimes || []).length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  {"追加の休憩はありません"}
                </Typography>
              )}
            </Box>
          </Paper>
        </Grid>
        {/* アクション */}
        <Grid item xs={12}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between',
              mb: 3,
              gap: 2,
              '& > button': {
                width: { xs: '100%', sm: 'auto' }
              }
            }}
          >
            <Button
              variant="contained"
              color="primary"
              onClick={handleGenerateClick}
              startIcon={<ScheduleIcon />}
            >
              {"スケジュール生成"}
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              onClick={handleRescheduleWithoutShuffle}
              disabled={sport.matches?.length === 0}
            >
              順番を維持してリスケ
            </Button>
            {/* Undo/Redoボタン追加 */}
            <Button
              variant="outlined"
              color="inherit"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              startIcon={<span style={{fontSize: '1.5em'}}>↩︎</span>}
            >
              戻す
            </Button>
            <Button
              variant="outlined"
              color="inherit"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              startIcon={<span style={{fontSize: '1.5em'}}>↪︎</span>}
            >
              進める
            </Button>
            <Button
              variant="outlined"
              color="info"
              onClick={() => setManualEditorOpen(true)}
            >
              手動編集
            </Button>
          </Box>
          {scheduleError && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {scheduleError}
            </Alert>
          )}
        </Grid>
        {/* ...existing code... */}
        <ManualScheduleEditor
          open={manualEditorOpen}
          onClose={() => setManualEditorOpen(false)}
          timeSlots={timeSlots}
          onChange={handleManualEditorChange}
          courtNames={scheduleSettings.courtNames}
          teams={sport.teams}
        />
        {/* ...existing code... */}
        <Dialog
          open={openConfirmDialog}
          onClose={handleCloseDialog}
        >
          <DialogTitle>スケジュール再生成の確認</DialogTitle>
          <DialogContent>
            <DialogContentText>
              本当にスケジュールを再生成しますか？試合の順番はシャッフルされます。
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>
              {"キャンセル"}
            </Button>
            <Button onClick={handleConfirmGenerate} color="primary">
              確認
            </Button>
          </DialogActions>
        </Dialog>
        {/* ...existing code... */}
        <Grid item xs={12}>
          {timeSlots.length > 0 ? (
            <TimeSlotTable timeSlots={timeSlots} sport={sport} />
          ) : (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                {"スケジュールはまだ生成されていません"}
              </Typography>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default ScheduleTab;
