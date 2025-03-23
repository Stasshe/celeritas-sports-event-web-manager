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
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormHelperText
} from '@mui/material';
import { 
  Add as AddIcon, 
  Delete as DeleteIcon,
  Schedule as ScheduleIcon,
  Place as PlaceIcon,
  Class as ClassIcon
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

  // 複数会場の設定 - 単純化
  const [useMultiVenue, setUseMultiVenue] = useState<boolean>(
    !!sport.scheduleSettings?.useMultiVenue
  );

  // 会場情報 - 固定2会場に簡素化
  const [venues, setVenues] = useState<Array<{id: 'main' | 'secondary'; name: string}>>(() => {
    if (sport.scheduleSettings?.venues && sport.scheduleSettings.venues.length > 0) {
      return sport.scheduleSettings.venues as Array<{id: 'main' | 'secondary'; name: string}>;
    }
    return [
      { id: 'main', name: 'メイン会場' },
      { id: 'secondary', name: 'サブ会場' }
    ];
  });

  // チームクラス情報
  const [teamClasses, setTeamClasses] = useState<Record<string, string>>(() => {
    return sport.scheduleSettings?.teamClasses || {};
  });

  // チームクラス編集用
  const [selectedTeam, setSelectedTeam] = useState<{id: string; name: string} | null>(null);
  const [teamClass, setTeamClass] = useState<string>('');
  const [classDialogOpen, setClassDialogOpen] = useState<boolean>(false);

  // 初期設定値
  const defaultSettings: ScheduleSettings = {
    startTime: '09:00',
    endTime: '17:00',
    matchDuration: 20,
    breakDuration: 5,
    lunchBreak: hasLunchBreak ? { startTime: '12:00', endTime: '13:00' } : undefined,
    breakTimes: [],
    timeSlots: [],
    venues: venues,
    teamClasses: teamClasses
  };

  // リーグ戦用のデフォルト拡張設定
  const defaultLeagueSettings: LeagueScheduleSettings = {
    ...defaultSettings,
    groupStageDuration: 15,
    playoffDuration: 20,
    breakBetweenStages: 30
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

  // 設定タブ
  const [settingsTab, setSettingsTab] = useState<number>(0);

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

  // 会場情報の変更
  const handleVenueChange = (index: number, field: 'id' | 'name', value: string) => {
    const updatedVenues = [...venues];
    updatedVenues[index] = {
      ...updatedVenues[index],
      [field]: value
    };
    
    setVenues(updatedVenues);
    setScheduleSettings(prev => ({
      ...prev,
      venues: updatedVenues
    }));
  };

  // チームクラスのダイアログを開く
  const handleOpenClassDialog = (team: {id: string; name: string}) => {
    setSelectedTeam(team);
    setTeamClass(teamClasses[team.id] || '');
    setClassDialogOpen(true);
  };

  // チームクラスを保存
  const handleSaveTeamClass = () => {
    if (!selectedTeam) return;
    
    const updatedClasses = { ...teamClasses };
    if (teamClass) {
      updatedClasses[selectedTeam.id] = teamClass;
    } else {
      delete updatedClasses[selectedTeam.id];
    }
    
    setTeamClasses(updatedClasses);
    setScheduleSettings(prev => ({
      ...prev,
      teamClasses: updatedClasses
    }));
    
    setClassDialogOpen(false);
  };

  // チームクラスをリセット
  const handleResetTeamClasses = () => {
    setTeamClasses({});
    setScheduleSettings(prev => ({
      ...prev,
      teamClasses: {}
    }));
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

  // スケジュールの生成 - 会場設定を更新
  const handleGenerateSchedule = () => {
    try {
      setScheduleError(null);
      
      // Firebase対応：undefinedをnullに変換
      const safeSettings: ScheduleSettings = {
        ...scheduleSettings,
        lunchBreak: scheduleSettings.lunchBreak || null,
        breakTimes: scheduleSettings.breakTimes || [],
        timeSlots: scheduleSettings.timeSlots || [],
        useMultiVenue: useMultiVenue,
        venues: useMultiVenue ? venues : [venues[0]], // 単一会場の場合はメイン会場のみ
        teamClasses: teamClasses
      };
      
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
    const safeSettings: ScheduleSettings = {
      ...scheduleSettings,
      lunchBreak: scheduleSettings.lunchBreak || null,
      breakTimes: scheduleSettings.breakTimes || [],
      timeSlots: timeSlots || [],
      venues: venues,
      teamClasses: teamClasses
    };
    
    const updatedSport = {
      ...sport,
      scheduleSettings: safeSettings
    };
    onUpdate(updatedSport);
  };

  // スポーツタイプに応じた入力フォーム
  const renderSportTypeSpecificInputs = () => {
    if (sport.type === 'league') {
      const leagueSettings = scheduleSettings as LeagueScheduleSettings;
      return (
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label={t('schedule.groupStageDuration')}
              name="groupStageDuration"
              type="number"
              value={leagueSettings.groupStageDuration}
              onChange={handleInputChange}
              InputProps={{ inputProps: { min: 5 } }}
              margin="normal"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label={t('schedule.playoffDuration')}
              name="playoffDuration"
              type="number"
              value={leagueSettings.playoffDuration}
              onChange={handleInputChange}
              InputProps={{ inputProps: { min: 5 } }}
              margin="normal"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label={t('schedule.breakBetweenStages')}
              name="breakBetweenStages"
              type="number"
              value={leagueSettings.breakBetweenStages}
              onChange={handleInputChange}
              InputProps={{ inputProps: { min: 0 } }}
              margin="normal"
            />
          </Grid>
        </Grid>
      );
    }
    
    // トーナメントと総当たり戦の場合
    if (sport.type === 'tournament' || sport.type === 'roundRobin') {
      const normalMatchCount = sport.matches?.filter(m => 
        !(m.team1Id?.includes('seed') || m.team2Id?.includes('seed') || 
          m.team1Id?.includes('tbd') || m.team2Id?.includes('tbd') ||
          m.team1Id?.includes('unknown') || m.team2Id?.includes('unknown') ||
          (!m.team1Id && m.team2Id) || (m.team1Id && !m.team2Id))
      ).length || 0;
      
      return (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              {t('schedule.matchCount')}: {normalMatchCount} / {sport.matches?.length || 0}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ※ シード戦は自動的にスキップされます
            </Typography>
          </Grid>
        </Grid>
      );
    }
    
    return null;
  };

  // 設定タブの切り替え
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSettingsTab(newValue);
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('schedule.title')}
      </Typography>
      <Divider sx={{ mb: 3 }} />
      
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={settingsTab}
          onChange={handleTabChange}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label={t('schedule.basicSettings')} />
          <Tab label={t('schedule.venueSettings')} icon={<PlaceIcon />} iconPosition="start" />
          <Tab label={t('schedule.teamClassSettings')} icon={<ClassIcon />} iconPosition="start" />
        </Tabs>
      </Paper>
      
      <Grid container spacing={3}>
        {/* 基本設定タブ */}
        {settingsTab === 0 && (
          <>
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
          </>
        )}
        
        {/* 会場設定タブ - 単純化された会場設定UI */}
        {settingsTab === 1 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  {t('schedule.venueSetup')}
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={useMultiVenue}
                      onChange={(e) => setUseMultiVenue(e.target.checked)}
                    />
                  }
                  label={t('schedule.useMultiVenue')}
                />
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {useMultiVenue 
                  ? t('schedule.multiVenueDescription') 
                  : t('schedule.singleVenueDescription')}
              </Typography>
              
              {useMultiVenue && (
                <Grid container spacing={2} sx={{ mt: 2 }}>
                  {venues.map((venue, index) => (
                    <Grid item xs={12} md={6} key={index}>
                      <Paper 
                        variant="outlined" 
                        sx={{ p: 2, mb: 2, borderColor: 'primary.light' }}
                      >
                        <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                          <PlaceIcon sx={{ mr: 1, color: 'primary.main' }} />
                          {index === 0 ? t('schedule.mainVenue') : t('schedule.secondaryVenue')}
                        </Typography>
                        
                        <TextField
                          fullWidth
                          label={t('schedule.venueName')}
                          value={venue.name}
                          onChange={(e) => {
                            const updatedVenues = [...venues];
                            updatedVenues[index] = {
                              ...updatedVenues[index],
                              name: e.target.value
                            };
                            setVenues(updatedVenues);
                            setScheduleSettings(prev => ({
                              ...prev,
                              venues: updatedVenues
                            }));
                          }}
                          margin="normal"
                          size="small"
                        />
                      </Paper>
                    </Grid>
                  ))}
                  
                  <Grid item xs={12}>
                    <Alert severity="info">
                      {t('schedule.multiVenueInfo')}
                    </Alert>
                  </Grid>
                </Grid>
              )}
            </Paper>
          </Grid>
        )}
        
        {/* チームクラス設定タブ */}
        {settingsTab === 2 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  {t('schedule.teamClassSetup')}
                </Typography>
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={handleResetTeamClasses}
                  size="small"
                >
                  {t('schedule.resetClasses')}
                </Button>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {t('schedule.teamClassDescription')}
              </Typography>
              
              <List>
                {sport.teams.map((team) => {
                  const hasClass = teamClasses[team.id] !== undefined;
                  return (
                    <ListItem 
                      key={team.id}
                      secondaryAction={
                        <Button 
                          variant="outlined" 
                          size="small"
                          onClick={() => handleOpenClassDialog(team)}
                        >
                          {hasClass ? t('schedule.edit') : t('schedule.assign')}
                        </Button>
                      }
                    >
                      <ListItemText 
                        primary={team.name} 
                        secondary={hasClass 
                          ? `${t('schedule.class')}: ${teamClasses[team.id]}`
                          : t('schedule.noClassAssigned')
                        }
                      />
                    </ListItem>
                  );
                })}
              </List>
              
              {sport.teams.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                  {t('schedule.noTeams')}
                </Typography>
              )}
            </Paper>
          </Grid>
        )}
        
        {/* アクション */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleGenerateSchedule}
              startIcon={<ScheduleIcon />}
            >
              {t('schedule.generateSchedule')}
            </Button>
            
            <Button
              variant="outlined"
              color="primary"
              onClick={handleSaveSchedule}
              disabled={timeSlots.length === 0}
            >
              {t('common.save')}
            </Button>
          </Box>
          
          {scheduleError && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {scheduleError}
            </Alert>
          )}
        </Grid>
        
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
      
      {/* チームクラス設定ダイアログ */}
      <Dialog 
        open={classDialogOpen} 
        onClose={() => setClassDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          {selectedTeam ? `${t('schedule.configureClass')} - ${selectedTeam.name}` : ''}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={t('schedule.className')}
            fullWidth
            value={teamClass}
            onChange={(e) => setTeamClass(e.target.value)}
            variant="outlined"
            helperText={t('schedule.classNameHelper')}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClassDialogOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSaveTeamClass} color="primary" variant="contained">
            {t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ScheduleTab;
