import React, { useState, useEffect } from 'react';
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
import { useTranslation } from 'react-i18next';
import { Sport, ScheduleSettings, TimeSlot, Match, LeagueScheduleSettings } from '../../../types';
import TimeSlotTable from './TimeSlotTable';
import { generateSchedule } from '../../../utils/scheduleGenerator';

interface ScheduleTabProps {
  sport: Sport;
  onUpdate: (updatedSport: Sport) => void;
}

const ScheduleTab: React.FC<ScheduleTabProps> = ({ sport, onUpdate }) => {
  const { t } = useTranslation();
  const [hasLunchBreak, setHasLunchBreak] = useState<boolean>(
    !!sport.scheduleSettings?.lunchBreak
  );

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
    breakTimes: [],
    timeSlots: []
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

  // 新しい休憩時間
  const [newBreakTime, setNewBreakTime] = useState<Omit<TimeSlot, 'type'>>({
    startTime: '11:00',
    endTime: '11:15',
    title: '休憩'
  });

  // 生成されたタイムスロット
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(
    sport.scheduleSettings?.timeSlots || []
  );

  // スケジュール生成のエラー
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);

  // 入力変更のハンドラ
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setScheduleSettings(prev => ({
      ...prev,
      [name]: name === 'matchDuration' || name === 'breakDuration' || 
              name === 'groupStageDuration' || name === 'playoffDuration' || 
              name === 'breakBetweenStages'
        ? parseInt(value) || 0
        : value
    }));
  };

  // コート数変更のハンドラ
  const handleCourtCountChange = (
    event: React.MouseEvent<HTMLElement>,
    newCourtCount: 1 | 2 | null
  ) => {
    if (newCourtCount !== null) {
      setScheduleSettings(prev => ({
        ...prev,
        courtCount: newCourtCount
      }));
    }
  };

  // コート名変更のハンドラ
  const handleCourtNameChange = (court: 'court1' | 'court2', value: string) => {
    setScheduleSettings(prev => {
      // Ensure courtNames exists with defaults before updating
      const currentCourtNames = prev.courtNames || { 
        court1: '第1コート', 
        court2: prev.courtCount > 1 ? '第2コート' : undefined 
      };
      
      return {
        ...prev,
        courtNames: {
          ...currentCourtNames,
          [court]: value
        }
      };
    });
  };

  // ランチ休憩の切り替え
  const handleLunchBreakToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setHasLunchBreak(checked);
    setScheduleSettings(prev => ({
      ...prev,
      lunchBreak: checked 
        ? { startTime: '12:00', endTime: '13:00' }
        : null // undefinedではなくnullを使用
    }));
  };

  // ランチ休憩時間の変更
  const handleLunchBreakChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setScheduleSettings(prev => ({
      ...prev,
      lunchBreak: {
        ...prev.lunchBreak!,
        [name]: value
      }
    }));
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
    setScheduleSettings(prev => ({
      ...prev,
      breakTimes: updatedBreakTimes
    }));
    
    // 入力フィールドをリセット
    setNewBreakTime({
      startTime: '11:00',
      endTime: '11:15',
      title: '休憩'
    });
  };

  // 休憩時間の削除
  const handleRemoveBreakTime = (index: number) => {
    const updatedBreakTimes = [...(scheduleSettings.breakTimes || [])];
    updatedBreakTimes.splice(index, 1);
    setScheduleSettings(prev => ({
      ...prev,
      breakTimes: updatedBreakTimes
    }));
  };

  // スケジュールの生成
  const handleGenerateSchedule = () => {
    try {
      setScheduleError(null);
      
      // Firebase対応：undefinedをnullに変換
      const safeSettings = {
        ...scheduleSettings,
        lunchBreak: scheduleSettings.lunchBreak || null,
        breakTimes: scheduleSettings.breakTimes || [],
        timeSlots: scheduleSettings.timeSlots || []
      };
      
      // ランキング形式の場合は試合がなくてもスケジュールを生成可能
      const generatedTimeSlots = generateSchedule(sport, safeSettings);
      setTimeSlots(generatedTimeSlots);
      
      // スケジュール設定とタイムスロットを保存
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

  // スケジュールを保存
  const handleSaveSchedule = () => {
    // Firebase対応：undefinedをnullに変換
    const safeSettings = {
      ...scheduleSettings,
      lunchBreak: scheduleSettings.lunchBreak || null,
      breakTimes: scheduleSettings.breakTimes || [],
      timeSlots: timeSlots || []
    };
    
    const updatedSport = {
      ...sport,
      scheduleSettings: safeSettings
    };
    onUpdate(updatedSport);
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
      const generatedTimeSlots = generateSchedule(sport, safeSettings, false); // シャッフルしない
      setTimeSlots(generatedTimeSlots);
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
              label={t('schedule.playoffDuration')}
              name="playoffDuration"
              type="number"
              value={leagueSettings.playoffDuration}
              onChange={handleInputChange}
              InputProps={{ inputProps: { min: 1 } }}
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
              {t('schedule.rankingInfo')}
            </Typography>
            <Alert severity="info">
              {t('schedule.rankingScheduleInfo')}
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
              {t('schedule.matchCount')}: {sport.matches?.length || 0}
            </Typography>
            {(!sport.matches || sport.matches.length === 0) && (
              <Alert severity="warning">
                {t('schedule.noMatchesWarning')}
              </Alert>
            )}
          </Grid>
        </Grid>
      );
    }
    
    return null;
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('schedule.title')}
      </Typography>
      <Divider sx={{ mb: 3 }} />
      
      <Grid container spacing={3}>
        {/* 基本設定 */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="subtitle1" gutterBottom>
              {t('schedule.basicSettings')}
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={t('schedule.startTime')}
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
                  label={t('schedule.endTime')}
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
                      label={t('schedule.matchDuration')}
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
                      label={t('schedule.breakDuration')}
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
                  {t('schedule.courtSettings')}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Typography variant="body2" sx={{ mr: 2 }}>
                    {t('schedule.courtCount')}:
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
                      1 {t('schedule.court')}
                    </ToggleButton>
                    <ToggleButton value={2} aria-label="2 courts">
                      <Court2Icon sx={{ mr: 1 }} />
                      2 {t('schedule.courts')}
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={t('schedule.court1Name')}
                  value={scheduleSettings.courtNames?.court1 || '第1コート'}
                  onChange={(e) => handleCourtNameChange('court1', e.target.value)}
                  margin="normal"
                />
              </Grid>
              
              {scheduleSettings.courtCount === 2 && (
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t('schedule.court2Name')}
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
              {t('schedule.breakSettings')}
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <FormControlLabel
              control={
                <Switch
                  checked={hasLunchBreak}
                  onChange={handleLunchBreakToggle}
                />
              }
              label={t('schedule.includeLunchBreak')}
            />
            
            {hasLunchBreak && (
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t('schedule.lunchStartTime')}
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
                    label={t('schedule.lunchEndTime')}
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
              {t('schedule.additionalBreaks')}
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label={t('schedule.breakStartTime')}
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
                  label={t('schedule.breakEndTime')}
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
                  label={t('schedule.breakTitle')}
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
                    label={`${breakTime.title || t('schedule.break')}: ${breakTime.startTime} - ${breakTime.endTime}`}
                    onDelete={() => handleRemoveBreakTime(index)}
                    color="secondary"
                    variant="outlined"
                  />
                </Box>
              ))}
              {(scheduleSettings.breakTimes || []).length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  {t('schedule.noBreaks')}
                </Typography>
              )}
            </Box>
          </Paper>
        </Grid>
        
        {/* アクション */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, gap: 2 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleGenerateClick}
              startIcon={<ScheduleIcon />}
            >
              {t('schedule.generateSchedule')}
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              onClick={handleRescheduleWithoutShuffle}
              disabled={sport.matches?.length === 0}
            >
              順番を維持してリスケ
            </Button>
          </Box>
          
          {scheduleError && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {scheduleError}
            </Alert>
          )}
        </Grid>
        
        {/* 確認ダイアログ */}
        <Dialog
          open={openConfirmDialog}
          onClose={handleCloseDialog}
        >
          <DialogTitle>{t('schedule.confirmRegenerate')}</DialogTitle>
          <DialogContent>
            <DialogContentText>
              本当にスケジュールを再生成しますか？試合の順番はシャッフルされます。
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleConfirmGenerate} color="primary">
              {t('common.confirm')}
            </Button>
          </DialogActions>
        </Dialog>
        
        {/* スケジュール表示 */}
        <Grid item xs={12}>
          {timeSlots.length > 0 ? (
            <TimeSlotTable timeSlots={timeSlots} sport={sport} />
          ) : (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                {t('schedule.noScheduleGenerated')}
              </Typography>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default ScheduleTab;
