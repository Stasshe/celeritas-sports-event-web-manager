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
  Save as SaveIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  School as GradeIcon,
  Class as ClassIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useDatabase } from '../../hooks/useDatabase';
import { Event, Organizer } from '../../types';
import { motion } from 'framer-motion';
import AdminLayout from '../../components/layout/AdminLayout';
import { useThemeContext } from '../../contexts/ThemeContext';
import { useAdminLayout } from '../../contexts/AdminLayoutContext'; // 正しいパスに修正
import DeleteConfirmationDialog from '../../components/admin/dialogs/DeleteConfirmationDialog';
import RosterEditor from '../../components/admin/RosterEditor';

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
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const EventEditPage: React.FC = () => {
  const { eventId } = useParams<{ eventId?: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { alpha } = useThemeContext();
  const { showSnackbar, setSavingStatus } = useAdminLayout(); // AdminLayoutコンテキストを使用
  
  const { data: event, loading: eventLoading, updateData: updateEvent, removeData } = useDatabase<Event>(`/events/${eventId}`);
  
  const [localEvent, setLocalEvent] = useState<Event | null>(null);
  const [saveStatus, setSaveStatusLocal] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [activeTab, setActiveTab] = useState(0);
  const [autoSaveTimerId, setAutoSaveTimerId] = useState<NodeJS.Timeout | null>(null);
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
    setSaveStatusLocal('idle');
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
      // 既存のタイマーをクリア
      if (autoSaveTimerId) {
        clearTimeout(autoSaveTimerId);
      }
      
      // 新しいタイマーをセット（3秒後に自動保存）
      const timerId = setTimeout(handleSave, 300);
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

  const handleSave = async () => {
    if (!localEvent) return;
    
    setSavingStatus('saving');
    setSaveStatusLocal('saving');
    try {
      await updateEvent(localEvent);
      setSavingStatus('saved');
      setSaveStatusLocal('saved');
      showSnackbar(t('event.saveSuccess'), 'success');
    } catch (error) {
      console.error('Error saving event data:', error);
      setSavingStatus('error');
      setSaveStatusLocal('error');
      showSnackbar(t('event.saveError'), 'error');
    }
  };
  
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
        return t('event.roleLeader');
      case 'member':
        return t('event.roleMember');
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
        showSnackbar(t('event.classTemplateGenerated'), 'success');
      })
      .catch(error => {
        console.error('Error generating class template:', error);
        showSnackbar(t('event.classTemplateError'), 'error');
      });
  };

  const handleDelete = async () => {
    if (!localEvent) return;
    
    try {
      await removeData();
      showSnackbar(t('event.deleteSuccess'), 'success');
      navigate('/admin');
    } catch (error) {
      showSnackbar(t('event.deleteError'), 'error');
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
      <AdminLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
          <CircularProgress />
        </Box>
      </AdminLayout>
    );
  }
  
  if (!event || !localEvent) {
    return (
      <AdminLayout>
        <Box sx={{ textAlign: 'center', my: 8 }}>
          <Typography variant="h5">
            {t('event.notFound')}
          </Typography>
          <Button sx={{ mt: 2 }} variant="contained" onClick={() => navigate('/admin')}>
            {t('common.backToAdmin')}
          </Button>
        </Box>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Container maxWidth="lg">
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton onClick={() => navigate('/admin')} aria-label="back" sx={{ mr: 1 }}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h5" component="h1">
              {localEvent.name}
            </Typography>
            {localEvent.isActive && (
              <Chip 
                label={t('event.active')} 
                color="success" 
                size="small" 
                sx={{ ml: 2 }} 
              />
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
            >
              {saveStatus === 'saving' ? t('common.saving') : t('common.save')}
            </Button>
          </Box>
        </Box>
        
        <Paper sx={{ mb: 2 }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="event management tabs"
          >
            <Tab label={t('event.tabs.details')} />
            <Tab label={t('event.tabs.organizers')} />
            <Tab label={t('event.tabs.roster')} />
            <Tab label={t('event.tabs.settings')} />
          </Tabs>
        </Paper>
        
        {/* 基本情報タブ */}
        <TabPanel value={activeTab} index={0}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            {t('event.details')}
          </Typography>
          <Divider sx={{ mb: 3 }} />
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
                    <TextField
                      name="name"
                      label={t('event.name')}
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
                          label={t('event.date')}
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
                          label={t('event.alternativeDate')}
                          type="date"
                          fullWidth
                          margin="normal"
                          value={localEvent.alternativeDate || ''}
                          onChange={handleInputChange}
                          InputLabelProps={{ shrink: true }}
                          helperText={t('event.alternativeDateHelp')}
                        />
                      </Grid>
                    </Grid>
                    
                    <TextField
                      name="description"
                      label={t('event.description')}
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
                      label={t('event.setActive')}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>
                      {t('event.stats')}
                    </Typography>
                    <Divider sx={{ mb: 3 }} />
                    
                    <Paper 
                      variant="outlined" 
                      sx={{ p: 2, mb: 3, bgcolor: alpha('#f5f5f5', 0.1) }}
                    >
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">
                            {t('event.sportsCount')}
                          </Typography>
                          <Typography variant="h6">
                            {localEvent.sports ? localEvent.sports.length : 0}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">
                            {t('event.organizersCount')}
                          </Typography>
                          <Typography variant="h6">
                            {localEvent.organizers ? localEvent.organizers.length : 0}
                          </Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Typography variant="body2" color="text.secondary">
                            {t('event.created')}
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
                      {t('event.manageSports')}
                    </Typography>
                    <Button
                      variant="outlined"
                      fullWidth
                      onClick={() => navigate('/admin')}
                      startIcon={<ArrowBackIcon />}
                    >
                      {t('event.backToSportsManagement')}
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
              {t('event.manageOrganizers')}
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Grid container spacing={2} sx={{ mb: 3 }} alignItems="flex-end">
              <Grid item xs={12} sm={4}>
                <TextField
                  name="name"
                  label={t('event.organizerName')}
                  fullWidth
                  value={newOrganizer.name}
                  onChange={handleOrganizerChange}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth>
                  <InputLabel>{t('event.role')}</InputLabel>
                  <Select
                    name="role"
                    value={newOrganizer.role}
                    onChange={handleOrganizerChange as any}
                  >
                    <MenuItem value="leader">{t('event.roleLeader')}</MenuItem>
                    <MenuItem value="member">{t('event.roleMember')}</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth>
                  <InputLabel>{t('event.grade')}</InputLabel>
                  <Select
                    name="grade"
                    value={newOrganizer.grade}
                    onChange={handleOrganizerChange as any}
                  >
                    <MenuItem value={1}>{t('event.grade1')}</MenuItem>
                    <MenuItem value={2}>{t('event.grade2')}</MenuItem>
                    <MenuItem value={3}>{t('event.grade3')}</MenuItem>
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
                  {t('common.add')}
                </Button>
              </Grid>
            </Grid>
            
            <Divider sx={{ mb: 3 }} />
            
            <Typography variant="subtitle1" gutterBottom>
              {t('event.organizersList')}
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
                            label={`${organizer.grade}${t('event.gradeUnit')}`}
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
                      primary={t('event.noOrganizers')}
                      primaryTypographyProps={{ color: 'text.secondary', align: 'center' }}
                    />
                  </ListItem>
                )}
              </List>
            </Paper>
            
            <Box sx={{ mt: 2, color: 'text.secondary' }}>
              <Typography variant="caption">
                {t('event.organizersHelp')}
              </Typography>
            </Box>
          </Paper>
        </TabPanel>
        
        {/* 名簿タブ (新規追加) */}
        <TabPanel value={activeTab} index={2}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">
                {t('event.manageClasses')}
              </Typography>
              <Button
                variant="contained"
                color="primary"
                startIcon={<ClassIcon />}
                onClick={() => setTemplateDialogOpen(true)}
              >
                {t('event.generateClassTemplate')}
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
                  {t('event.noClassesYet')}
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<ClassIcon />}
                  onClick={() => setTemplateDialogOpen(true)}
                  sx={{ mt: 2 }}
                >
                  {t('event.generateClassTemplate')}
                </Button>
              </Box>
            )}
          </Paper>
        </TabPanel>
        
        {/* 設定タブ (新規追加) */}
        <TabPanel value={activeTab} index={3}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom color="error">
              {t('event.dangerZone')}
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Box sx={{ bgcolor: 'error.main', color: 'error.contrastText', p: 2, borderRadius: 1 }}>
              <Typography variant="subtitle1" gutterBottom>
                {t('event.deleteEvent')}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                {t('event.deleteEventWarning')}
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
                {t('common.delete')}
              </Button>
            </Box>
          </Paper>
        </TabPanel>
        
        {/* クラステンプレート生成ダイアログ */}
        <Dialog open={templateDialogOpen} onClose={() => setTemplateDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{t('event.generateClassTemplate')}</DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ mb: 3 }}>
              {t('event.classTemplateDescription')}
            </DialogContentText>
            
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
              {t('event.gradeParticipation')}
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
                label={t('event.grade1')}
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
                label={t('event.grade2')}
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
                label={t('event.grade3')}
              />
            </Box>
            
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
              {t('event.classCount')}
            </Typography>
            
            <Grid container spacing={2}>
              {gradeParticipation.grade1 && (
                <Grid item xs={12} sm={4}>
                  <TextField
                    label={`${t('event.grade1')}${t('event.classCount')}`}
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
                    label={`${t('event.grade2')}${t('event.classCount')}`}
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
                    label={`${t('event.grade3')}${t('event.classCount')}`}
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
                {t('event.classTemplateWarning')}
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setTemplateDialogOpen(false)}>
              {t('common.cancel')}
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
              {t('common.generate')}
            </Button>
          </DialogActions>
        </Dialog>
        
        {/* 削除確認ダイアログ */}
        <DeleteConfirmationDialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          onConfirm={handleDelete}
          title={t('event.deleteConfirmTitle')}
          itemName={localEvent?.name || ''}
          type="event"
        />
      </Container>
    </AdminLayout>
  );
};

export default EventEditPage;
