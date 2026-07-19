import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  IconButton,
  Grid,
  CircularProgress,
  Divider,
  Tabs,
  Tab,
  Chip,
  Snackbar,
  Alert,
  FormControlLabel,
  Switch,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Avatar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Checkbox
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  School as GradeIcon,
  Class as ClassIcon,
  EmojiEvents as EmojiEventsIcon,
  Leaderboard as LeaderboardIcon
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useDatabase } from '../../hooks/useDatabase';
import { Event, Organizer } from '../../types';
import { motion } from 'framer-motion';
import { useThemeContext } from '../../contexts/ThemeContext';
import { useAdminLayout } from '../context/AdminLayoutContext';
import DeleteConfirmationDialog from '../components/dialogs/DeleteConfirmationDialog';
import RosterEditor from '../components/RosterEditor';
import OverallScoreTab from '../components/scoreboard/OverallScoreTab'; // 追加

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = (props) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`event-tabpanel-${index}`}
      aria-labelledby={`event-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 1.5 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const EventEditPage: React.FC = () => {
  const { eventId } = useParams<{ eventId?: string }>();
  const navigate = useNavigate();
  const { alpha } = useThemeContext();
  const { showSnackbar, setSavingStatus, save, setHasUnsavedChanges, registerSaveHandler, unregisterSaveHandler } = useAdminLayout(); // AdminLayoutコンテキストを使用

  const { data: event, loading: eventLoading, updateData: updateEvent, removeData } = useDatabase<Event>(`/events/${eventId}`);

  const [localEvent, setLocalEvent] = useState<Event | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [autoSaveTimerId, setAutoSaveTimerId] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // 新規担当者ための状態
  const [newOrganizer, setNewOrganizer] = useState<Organizer>({
    id: `org_${Date.now()}`,
    name: '',
    role: 'member',
    grade: 2
  });
  
  // クラステンプレートダイアログ用の状態
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [gradeParticipation, setGradeParticipation] = useState({
    grade1: true,
    grade2: true,
    grade3: false
  });
  const [classCount, setClassCount] = useState({
    grade1: 7,
    grade2: 7,
    grade3: 7
  });

  // eventIdが変更されたときにlocalEventをリセットする
  useEffect(() => {
    // eventIdが変更されたらlocalEventをnullにリセット
    setLocalEvent(null);
    
    // 自動保存タイマーをクリアする
    if (autoSaveTimerId) {
      clearTimeout(autoSaveTimerId);
    }
    
    // 保存状態をリセット
    setSavingStatus('idle');
  }, [eventId]);
  
  // 初期データロード
  useEffect(() => {
    if (event && !localEvent) {
      setLocalEvent(JSON.parse(JSON.stringify(event)));
      
      // gradeParticipationを設定
      if (event.gradeParticipation) {
        setGradeParticipation(event.gradeParticipation);
      }
    }
  }, [event, localEvent]);
  
  // データ変更時の自動保存設定
  useEffect(() => {
    if (!localEvent || !event) return;
    
    // データが変更されている場合
    if (JSON.stringify(localEvent) !== JSON.stringify(event)) {
      setHasUnsavedChanges(true);

      // 既存のタイマーをクリア
      if (autoSaveTimerId) {
        clearTimeout(autoSaveTimerId);
      }

      // 新しいタイマーをセット
      const timerId = setTimeout(() => {
        save(`event_${eventId}`);
      }, 1000); // 1秒後に保存

      setAutoSaveTimerId(timerId);
    }

    return () => {
      if (autoSaveTimerId) {
        clearTimeout(autoSaveTimerId);
      }
    };
  }, [localEvent]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => {
    const { name, value, checked } = e.target as HTMLInputElement;
    
    if (!localEvent) return;
    
    if (name === 'isActive') {
      setLocalEvent(prev => prev ? { ...prev, [name]: checked } : null);
    } else {
      setLocalEvent(prev => prev ? { ...prev, [name]: value } : null);
    }
  };

  // 実際の書き込み処理。AdminLayoutContextにscope登録し、保存の唯一の実行経路にする
  const handleSave = async (): Promise<boolean> => {
    if (!localEvent) return false;

    try {
      await updateEvent(localEvent);
      return true;
    } catch (error) {
      console.error('Error saving event data:', error);
      return false;
    }
  };

  useEffect(() => {
    registerSaveHandler(handleSave, `event_${eventId}`);

    return () => {
      unregisterSaveHandler(`event_${eventId}`);
    };
  }, [registerSaveHandler, unregisterSaveHandler, localEvent, eventId]);


  const handleOrganizerChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    if (name) {
      setNewOrganizer(prev => ({ ...prev, [name]: value }));
    }
  };
  
  const addOrganizer = () => {
    if (newOrganizer.name && localEvent) {
      setLocalEvent(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          organizers: [...(prev.organizers || []), { ...newOrganizer, id: `org_${Date.now()}` }]
        };
      });
      
      // リセット
      setNewOrganizer({
        id: `org_${Date.now()}`,
        name: '',
        role: 'member',
        grade: 2
      });
    }
  };
  
  const removeOrganizer = (id: string) => {
    if (localEvent) {
      setLocalEvent(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          organizers: (prev.organizers || []).filter(org => org.id !== id)
        };
      });
    }
  };
  
  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'leader':
        return "リーダー";
      case 'member':
        return "メンバー";
      default:
        return role;
    }
  };

  // クラステンプレートの生成処理
  const generateClassTemplate = () => {
    if (!localEvent) return;
    
    const newRoster: Event['roster'] = {
      grade1: {},
      grade2: {},
      grade3: {}
    };
    
    // 学年ごとにクラスを生成
    if (gradeParticipation.grade1) {
      for (let i = 1; i <= classCount.grade1; i++) {
        newRoster.grade1![`1-${i}`] = ['none']; // デフォルトの名簿を追加
      }
    }
    
    if (gradeParticipation.grade2) {
      for (let i = 1; i <= classCount.grade2; i++) {
        newRoster.grade2![`2-${i}`] = ['none']; // デフォルトの名簿を追加
      }
    }
    
    if (gradeParticipation.grade3) {
      for (let i = 1; i <= classCount.grade3; i++) {
        newRoster.grade3![`3-${i}`] = ['none']; // デフォルトの名簿を追加
      }
    }
    
    // 更新したイベントデータを設定
    const updatedEvent = {
      ...localEvent,
      roster: newRoster,
      gradeParticipation
    };
    
    setLocalEvent(updatedEvent);
    setTemplateDialogOpen(false);
    
    // 保存
    updateEvent(updatedEvent)
      .then(() => {
        showSnackbar("クラステンプレートを生成しました", 'success');
      })
      .catch(error => {
        console.error('Error generating class template:', error);
        showSnackbar("クラステンプレート生成エラー", 'error');
      });
  };

  const handleDelete = async () => {
    if (!localEvent) return;
    
    try {
      await removeData();
      showSnackbar("削除しました", 'success');
      navigate('/admin');
    } catch (error) {
      showSnackbar("削除に失敗しました", 'error');
    }
  };
  
  // ロスターの更新処理
  const handleRosterUpdate = (updatedRoster: Event['roster']) => {
    if (!localEvent) return;
    
    setLocalEvent(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        roster: updatedRoster
      };
    });
  };
  
  if (eventLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (!event || !localEvent) {
    return (
      <Box sx={{ textAlign: 'center', my: 8 }}>
        <Typography variant="h5">
          {"イベントが見つかりません"}
        </Typography>
        <Button sx={{ mt: 2 }} variant="contained" onClick={() => navigate('/admin')}>
          {"管理画面に戻る"}
        </Button>
      </Box>
    );
  }

  return (
    <Container maxWidth={false} disableGutters>
        <Box sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
          <IconButton onClick={() => navigate('/admin')} aria-label="back" sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" component="h1">
            {localEvent.name}
          </Typography>
          {localEvent.isActive && (
            <Chip
              label={"アクティブ"}
              color="success"
              size="small"
              sx={{ ml: 2 }}
            />
          )}
        </Box>
        
        <Paper elevation={0} square sx={{ mb: 1, bgcolor: 'transparent', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="event management tabs"
          >
            <Tab label={"基本情報"} />
            <Tab label={"担当者"} />
            <Tab label={"名簿"} />
            <Tab label={"スコアボード"} icon={<LeaderboardIcon />} iconPosition="start" /> {/* 追加 */}
            <Tab label={"設定"} />
          </Tabs>
        </Paper>
        
        {/* 基本情報タブ */}
        <TabPanel value={activeTab} index={0}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            {"詳細"}
          </Typography>
          <Divider sx={{ mb: 3 }} />
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
                    <TextField
                      name="name"
                      label={"イベント名"}
                      fullWidth
                      margin="normal"
                      value={localEvent.name}
                      onChange={handleInputChange}
                      InputLabelProps={{ shrink: true }}
                    />
                    
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          name="date"
                          label={"日付"}
                          type="date"
                          fullWidth
                          margin="normal"
                          value={localEvent.date || ''}
                          onChange={handleInputChange}
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          name="alternativeDate"
                          label={"予備日"}
                          type="date"
                          fullWidth
                          margin="normal"
                          value={localEvent.alternativeDate || ''}
                          onChange={handleInputChange}
                          InputLabelProps={{ shrink: true }}
                          helperText={"予備日を設定できます"}
                        />
                      </Grid>
                    </Grid>
                    
                    <TextField
                      name="description"
                      label={"説明"}
                      fullWidth
                      multiline
                      rows={4}
                      margin="normal"
                      value={localEvent.description || ''}
                      onChange={handleInputChange}
                      InputLabelProps={{ shrink: true }}
                    />
                    
                    <FormControlLabel
                      control={
                        <Switch
                          name="isActive"
                          checked={localEvent.isActive}
                          onChange={handleInputChange}
                          color="primary"
                        />
                      }
                      label={"アクティブに設定"}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>
                      {"統計"}
                    </Typography>
                    <Divider sx={{ mb: 3 }} />
                    
                    <Paper 
                      variant="outlined" 
                      sx={{ p: 2, mb: 3, bgcolor: alpha('#f5f5f5', 0.1) }}
                    >
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">
                            {"競技数"}
                          </Typography>
                          <Typography variant="h6">
                            {localEvent.sports ? localEvent.sports.length : 0}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">
                            {"担当者数"}
                          </Typography>
                          <Typography variant="h6">
                            {localEvent.organizers ? localEvent.organizers.length : 0}
                          </Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Typography variant="body2" color="text.secondary">
                            {"作成日時"}
                          </Typography>
                          <Typography variant="body1">
                            {/* createdAtがない場合は日時情報を表示しない */}
                            {localEvent.createdAt 
                              ? new Date(localEvent.createdAt).toLocaleString()
                              : '-'
                            }
                          </Typography>
                        </Grid>
                      </Grid>
                    </Paper>
                    
                    <Typography variant="subtitle2" gutterBottom>
                      {"競技の管理"}
                    </Typography>
                    <Button
                      variant="outlined"
                      fullWidth
                      onClick={() => navigate('/admin')}
                      startIcon={<ArrowBackIcon />}
                    >
                      {"競技管理に戻る"}
                    </Button>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>
        
        {/* 担当者タブ */}
        <TabPanel value={activeTab} index={1}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              {"担当者管理"}
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Grid container spacing={2} sx={{ mb: 3 }} alignItems="flex-end">
              <Grid item xs={12} sm={4}>
                <TextField
                  name="name"
                  label={"担当者名"}
                  fullWidth
                  value={newOrganizer.name}
                  onChange={handleOrganizerChange}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth>
                  <InputLabel>{"役割"}</InputLabel>
                  <Select
                    name="role"
                    value={newOrganizer.role}
                    onChange={handleOrganizerChange as any}
                  >
                    <MenuItem value="leader">{"リーダー"}</MenuItem>
                    <MenuItem value="member">{"メンバー"}</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth>
                  <InputLabel>{"学年"}</InputLabel>
                  <Select
                    name="grade"
                    value={newOrganizer.grade}
                    onChange={handleOrganizerChange as any}
                  >
                    <MenuItem value={1}>{"1年生"}</MenuItem>
                    <MenuItem value={2}>{"2年生"}</MenuItem>
                    <MenuItem value={3}>{"3年生"}</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={2}>
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  startIcon={<AddIcon />}
                  onClick={addOrganizer}
                  disabled={!newOrganizer.name}
                >
                  {"追加"}
                </Button>
              </Grid>
            </Grid>
            
            <Divider sx={{ mb: 3 }} />
            
            <Typography variant="subtitle1" gutterBottom>
              {"担当者一覧"}
            </Typography>
            
            <Paper variant="outlined" sx={{ mb: 2 }}>
              <List dense>
                {localEvent.organizers?.map((organizer) => (
                  <ListItem key={organizer.id} divider>
                    <ListItemIcon>
                      <Avatar sx={{ 
                        bgcolor: organizer.role === 'leader' 
                          ? 'primary.main' 
                          : 'grey.400',
                        width: 32,
                        height: 32
                      }}>
                        <PersonIcon />
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={organizer.name}
                      secondary={
                        <>
                          <Chip
                            size="small"
                            label={getRoleLabel(organizer.role)}
                            color={organizer.role === 'leader' ? 'primary' : 'default'}
                            sx={{ mr: 1, fontSize: '0.75rem' }}
                          />
                          <Chip
                            size="small"
                            icon={<GradeIcon sx={{ fontSize: '0.875rem !important' }} />}
                            label={`${organizer.grade}${"年"}`}
                            sx={{ fontSize: '0.75rem' }}
                          />
                        </>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton 
                        edge="end" 
                        aria-label="delete" 
                        size="small"
                        color="error"
                        onClick={() => removeOrganizer(organizer.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
                {(!localEvent.organizers || localEvent.organizers.length === 0) && (
                  <ListItem>
                    <ListItemText
                      primary={"担当者がいません"}
                      primaryTypographyProps={{ color: 'text.secondary', align: 'center' }}
                    />
                  </ListItem>
                )}
              </List>
            </Paper>
            
            <Box sx={{ mt: 2, color: 'text.secondary' }}>
              <Typography variant="caption">
                {"担当者はイベントの管理・運営を行うメンバーです"}
              </Typography>
            </Box>
          </Paper>
        </TabPanel>
        
        {/* 名簿タブ (新規追加) */}
        <TabPanel value={activeTab} index={2}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">
                {"クラス管理"}
              </Typography>
              <Button
                variant="contained"
                color="primary"
                startIcon={<ClassIcon />}
                onClick={() => setTemplateDialogOpen(true)}
              >
                {"クラステンプレートを生成"}
              </Button>
            </Box>
            <Divider sx={{ mb: 3 }} />
            
            {/* クラス編集コンポーネント */}
            {localEvent.roster ? (
              <RosterEditor 
                event={localEvent} 
                onUpdate={handleRosterUpdate} 
              />
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body1" gutterBottom>
                  {"クラスがまだありません"}
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<ClassIcon />}
                  onClick={() => setTemplateDialogOpen(true)}
                  sx={{ mt: 2 }}
                >
                  {"クラステンプレートを生成"}
                </Button>
              </Box>
            )}
          </Paper>
        </TabPanel>
        
        {/* 総合成績タブ (新規追加) */}
        <TabPanel value={activeTab} index={3}>
          <OverallScoreTab 
            event={localEvent} 
            onUpdate={(updatedEvent) => {
              try {
                // 更新する前に深いコピーを作成して、値が正しいことを確認
                const safeUpdatedEvent = JSON.parse(JSON.stringify(updatedEvent));
                
                // データの検証: overallScoreboardの構造を確認
                if (safeUpdatedEvent.overallScoreboard) {
                  // データの検証と安全確保
                  const scoreboardSettings = safeUpdatedEvent.overallScoreboard;
                  
                  // 各フィールドのデフォルト値を設定
                  scoreboardSettings.enabled = scoreboardSettings.enabled || false;
                  scoreboardSettings.displayScores = 
                    scoreboardSettings.displayScores !== undefined ? scoreboardSettings.displayScores : true;
                  scoreboardSettings.displayRank = scoreboardSettings.displayRank || 3;
                  scoreboardSettings.teamType = scoreboardSettings.teamType || 'class';
                  scoreboardSettings.customTeams = scoreboardSettings.customTeams || [];
                }
                
                // 更新されたイベントデータを設定
                setLocalEvent(safeUpdatedEvent);
                
                // 総合成績タブでの変更は重要なので即時保存を実行
                save(`event_${eventId}`);
              } catch (error) {
                console.error("データの更新または検証中にエラーが発生:", error);
                showSnackbar("データ検証エラー", 'error');
              }
            }} 
          />
        </TabPanel>
        
        {/* 設定タブ - インデックスを4に変更 */}
        <TabPanel value={activeTab} index={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom color="error">
              {"危険な操作"}
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Box sx={{ bgcolor: 'error.main', color: 'error.contrastText', p: 2, borderRadius: 1 }}>
              <Typography variant="subtitle1" gutterBottom>
                {"イベント削除"}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                {"イベント削除の警告"}
              </Typography>
              <Button
                variant="contained"
                color="error"
                onClick={() => setDeleteDialogOpen(true)}
                startIcon={<DeleteIcon />}
                sx={{ 
                  bgcolor: 'error.dark',
                  '&:hover': { bgcolor: 'error.dark' }
                }}
              >
                {"削除"}
              </Button>
            </Box>
          </Paper>
        </TabPanel>
        
        {/* クラステンプレート生成ダイアログ */}
        <Dialog open={templateDialogOpen} onClose={() => setTemplateDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{"クラステンプレートを生成"}</DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ mb: 3 }}>
              {"クラステンプレートの説明"}
            </DialogContentText>
            
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
              {"学年参加"}
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={gradeParticipation.grade1}
                    onChange={(e) => setGradeParticipation({
                      ...gradeParticipation,
                      grade1: e.target.checked
                    })}
                  />
                }
                label={"1年生"}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={gradeParticipation.grade2}
                    onChange={(e) => setGradeParticipation({
                      ...gradeParticipation,
                      grade2: e.target.checked
                    })}
                  />
                }
                label={"2年生"}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={gradeParticipation.grade3}
                    onChange={(e) => setGradeParticipation({
                      ...gradeParticipation,
                      grade3: e.target.checked
                    })}
                  />
                }
                label={"3年生"}
              />
            </Box>
            
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
              {"クラス数"}
            </Typography>
            
            <Grid container spacing={2}>
              {gradeParticipation.grade1 && (
                <Grid item xs={12} sm={4}>
                  <TextField
                    label={`${"1年生"}${"クラス数"}`}
                    type="number"
                    value={classCount.grade1}
                    onChange={(e) => setClassCount({
                      ...classCount,
                      grade1: parseInt(e.target.value) || 1
                    })}
                    InputProps={{ inputProps: { min: 1, max: 10 } }}
                    fullWidth
                  />
                </Grid>
              )}
              
              {gradeParticipation.grade2 && (
                <Grid item xs={12} sm={4}>
                  <TextField
                    label={`${"2年生"}${"クラス数"}`}
                    type="number"
                    value={classCount.grade2}
                    onChange={(e) => setClassCount({
                      ...classCount,
                      grade2: parseInt(e.target.value) || 1
                    })}
                    InputProps={{ inputProps: { min: 1, max: 10 } }}
                    fullWidth
                  />
                </Grid>
              )}
              
              {gradeParticipation.grade3 && (
                <Grid item xs={12} sm={4}>
                  <TextField
                    label={`${"3年生"}${"クラス数"}`}
                    type="number"
                    value={classCount.grade3}
                    onChange={(e) => setClassCount({
                      ...classCount,
                      grade3: parseInt(e.target.value) || 1
                    })}
                    InputProps={{ inputProps: { min: 1, max: 10 } }}
                    fullWidth
                  />
                </Grid>
              )}
            </Grid>
            
            <Box sx={{ mt: 3, color: 'text.secondary' }}>
              <Typography variant="caption">
                {"クラステンプレート警告"}
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setTemplateDialogOpen(false)}>
              {"キャンセル"}
            </Button>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={generateClassTemplate}
              disabled={
                !gradeParticipation.grade1 && 
                !gradeParticipation.grade2 && 
                !gradeParticipation.grade3
              }
            >
              {"生成"}
            </Button>
          </DialogActions>
        </Dialog>
        
        {/* 削除確認ダイアログ */}
        <DeleteConfirmationDialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          onConfirm={handleDelete}
          title={"イベントの削除"}
          itemName={localEvent?.name || ''}
          type="event"
        />
    </Container>
  );
};

export default EventEditPage;
