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
  SelectChangeEvent
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  School as GradeIcon
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
  
  // 初期データロード
  useEffect(() => {
    if (event && !localEvent) {
      setLocalEvent(JSON.parse(JSON.stringify(event)));
    }
  }, [event]);
  
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
      const timerId = setTimeout(handleSave, 3000);
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
      <Container maxWidth="xl">
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton onClick={() => navigate('/admin')} aria-label="back" sx={{ mr: 1 }}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h4" component="h1">
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
        
        <Paper sx={{ mb: 4 }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="event management tabs"
          >
            <Tab label={t('event.tabs.details')} />
            <Tab label={t('event.tabs.organizers')} />
          </Tabs>
        </Paper>
        
        {/* 基本情報タブ */}
        <TabPanel value={activeTab} index={0}>
          <Paper sx={{ p: 3 }}>
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

          <Paper sx={{ p: 3, mt: 3, bgcolor: alpha('#f44336', 0.05) }}>
            <Typography variant="h6" color="error" gutterBottom>
              {t('event.dangerZone')}
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                {t('event.deleteEvent')}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t('event.deleteEventWarning')}
              </Typography>
              <Button
                variant="outlined"
                color="error"
                onClick={() => setDeleteDialogOpen(true)}
              >
                {t('event.deleteEventButton')}
              </Button>
            </Box>
          </Paper>
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
        
        {/* スナックバーは削除 - AdminLayoutのスナックバーを使用 */}
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
