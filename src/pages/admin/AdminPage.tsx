import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Card,
  CardContent,
  CardActions,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  CircularProgress,
  Chip,
  Tooltip,
  Snackbar,
  Alert
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Event as EventIcon,
  SportsSoccer as SportIcon,
  Settings as SettingsIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Info as InfoIcon,
  Help as HelpIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useDatabase } from '../../hooks/useDatabase';
import { Event, Sport } from '../../types';
import { useThemeContext } from '../../contexts/ThemeContext';
import AdminLayout from '../../components/layout/AdminLayout';
import { motion, AnimatePresence } from 'framer-motion';
import CreateEventDialog from '../../components/admin/dialogs/CreateEventDialog';
import CreateSportDialog from '../../components/admin/dialogs/CreateSportDialog';
import { useAdminLayout } from '../../contexts/AdminLayoutContext';

const MotionPaper = motion(Paper);
const MotionCard = motion(Card);

const AdminPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { alpha } = useThemeContext();
  const { showSnackbar, registerSaveHandler, unregisterSaveHandler, save, setHasUnsavedChanges } = useAdminLayout();
  const { 
    data: events, 
    loading: eventsLoading, 
    updateData: updateEvents,
    partialUpdate: partialUpdateEvents
  } = useDatabase<Record<string, Event>>('/events');
  
  const { 
    data: sports, 
    loading: sportsLoading 
  } = useDatabase<Record<string, Sport>>('/sports');
  
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [createEventDialogOpen, setCreateEventDialogOpen] = useState(false);
  const [createSportDialogOpen, setCreateSportDialogOpen] = useState(false);
  const [localEventState, setLocalEventState] = useState<Record<string, Event> | null>(null);
  
  // 変更されたイベントを追跡
  const modifiedEventsRef = useRef<Set<string>>(new Set());
  
  // localEventStateの初期化
  useEffect(() => {
    if (events && !localEventState) {
      setLocalEventState(events);
    }
  }, [events, localEventState]);
  
  // 最初にアクティブなイベントを選択
  useEffect(() => {
    if (events) {
      const activeEvent = Object.values(events).find(event => event.isActive);
      if (activeEvent) {
        setSelectedEventId(activeEvent.id);
      } else if (Object.keys(events).length > 0) {
        // アクティブなイベントがなければ最初のイベントを選択
        setSelectedEventId(Object.keys(events)[0]);
      }
    }
  }, [events]);

  // 保存ハンドラの登録
  useEffect(() => {
    const handleSave = async () => {
      try {
        if (modifiedEventsRef.current.size === 0) {
          return true; // 変更がなければ成功を返す
        }
        
        // 変更されたイベントのみを更新
        if (localEventState) {
          const updates: Record<string, Event> = {};
          modifiedEventsRef.current.forEach(eventId => {
            if (localEventState[eventId]) {
              updates[eventId] = localEventState[eventId];
            }
          });
          
          if (Object.keys(updates).length > 0) {
            await updateEvents(updates);
            modifiedEventsRef.current.clear();
          }
        }
        
        return true;
      } catch (error) {
        console.error('Error saving events:', error);
        return false;
      }
    };
    
    registerSaveHandler(handleSave, 'adminDashboard');
    
    return () => {
      unregisterSaveHandler('adminDashboard');
    };
  }, [registerSaveHandler, unregisterSaveHandler, localEventState, updateEvents]);

  // イベントを設定する関数（最適化版）
  const handleSetActiveEvent = useCallback(async (eventId: string) => {
    if (!localEventState) return;
    
    try {
      // 楽観的UIアップデート
      const updatedEvents = { ...localEventState };
      
      // すべてのイベントを非アクティブに
      Object.keys(updatedEvents).forEach(id => {
        updatedEvents[id] = {
          ...updatedEvents[id],
          isActive: id === eventId // 選択したイベントのみアクティブに
        };
        
        // 変更されたイベントを追跡
        modifiedEventsRef.current.add(id);
      });
      
      // ローカル状態を更新（即時反映）
      setLocalEventState(updatedEvents);
      
      // 変更があることを通知
      setHasUnsavedChanges(true);
      
      // 保存処理を実行
      await save();
      
      showSnackbar(t('admin.activeEventUpdated') || 'アクティブイベントが更新されました', 'success');
    } catch (error) {
      console.error('Error setting active event:', error);
      showSnackbar(t('admin.error') || 'エラーが発生しました', 'error');
    }
  }, [localEventState, save, setHasUnsavedChanges, showSnackbar, t]);

  // イベントの作成ダイアログを開く
  const handleOpenCreateEventDialog = () => {
    setCreateEventDialogOpen(true);
  };

  // 競技の作成ダイアログを開く
  const handleOpenCreateSportDialog = (eventId: string) => {
    setSelectedEventId(eventId);
    setCreateSportDialogOpen(true);
  };

  // 競技の編集ページに移動
  const handleEditSport = (sportId: string) => {
    navigate(`/admin/sports/${sportId}`);
  };

  // 設定ページに移動
  const handleGoToSettings = () => {
    navigate('/admin/settings');
  };

  // ヘルプページに移動
  const handleGoToHelp = () => {
    navigate('/admin/help');
  };

  // イベントごとの競技を取得
  const getSportsForEvent = (eventId: string): Sport[] => {
    if (!sports) return [];
    
    return Object.values(sports).filter(sport => sport.eventId === eventId);
  };

  // ローディング中の表示
  if ((eventsLoading && !localEventState) || sportsLoading) {
    return (
      <AdminLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress />
        </Box>
      </AdminLayout>
    );
  }

  // 選択されているイベント
  const selectedEvent = selectedEventId && localEventState ? localEventState[selectedEventId] : null;
  // 選択されているイベントの競技一覧
  const eventSports = selectedEventId ? getSportsForEvent(selectedEventId) : [];
  // アクティブなイベント
  const activeEvent = localEventState ? Object.values(localEventState).find(event => event.isActive) : null;

  return (
    <AdminLayout>
      {/* ダッシュボードヘッダー */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={2} alignItems="center" justifyContent="space-between">
          <Grid item>
            <Typography variant="h4" component="h1">
              <DashboardIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              {t('admin.dashboard')}
            </Typography>
          </Grid>
          <Grid item>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<HelpIcon />}
                onClick={handleGoToHelp}
              >
                {t('admin.help')}
              </Button>
              <Button
                variant="outlined"
                startIcon={<SettingsIcon />}
                onClick={handleGoToSettings}
              >
                {t('admin.settings')}
              </Button>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={() => save('adminDashboard')}
              >
                {t('admin.save')}
              </Button>
            </Box>
          </Grid>
        </Grid>
        
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {t('admin.dashboardDescription')}
        </Typography>
      </Box>

      {/* アクティブイベント表示 */}
      <MotionPaper
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        elevation={3}
        sx={{ p: 3, mb: 4 }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">{t('admin.activeEvent')}</Typography>
          <Button
            variant="outlined"
            startIcon={<EventIcon />}
            onClick={handleOpenCreateEventDialog}
          >
            {t('admin.createEvent')}
          </Button>
        </Box>
        
        {activeEvent ? (
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="h5">{activeEvent.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {new Date(activeEvent.date).toLocaleDateString()}
                    {activeEvent.alternativeDate && ` (${t('event.alternativeDate')}: ${new Date(activeEvent.alternativeDate).toLocaleDateString()})`}
                  </Typography>
                  {activeEvent.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {activeEvent.description}
                    </Typography>
                  )}
                </Box>
                <Chip color="success" label={t('event.active')} />
              </Box>
            </CardContent>
          </Card>
        ) : (
          <Box sx={{ textAlign: 'center', py: 3, bgcolor: alpha('#f5f5f5', 0.5) }}>
            <Typography color="text.secondary">
              {t('admin.noActiveEvent')}
            </Typography>
            <Button 
              variant="outlined" 
              startIcon={<EventIcon />}
              onClick={handleOpenCreateEventDialog}
              sx={{ mt: 2 }}
            >
              {t('admin.createFirstEvent')}
            </Button>
          </Box>
        )}
      </MotionPaper>

      {/* 選択されたイベントの競技一覧 */}
      {selectedEvent && (
        <MotionPaper
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          elevation={3}
          sx={{ p: 3, mb: 4 }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="h6">
                {selectedEvent.name} - {t('admin.sports')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('admin.sportsCount', { count: eventSports.length })}
              </Typography>
            </Box>
            <Box>
              <Button 
                variant="outlined" 
                startIcon={<EditIcon />}
                onClick={() => navigate(`/admin/events/${selectedEvent.id}`)}
                sx={{ mr: 1 }}
              >
                {t('admin.editEvent')}
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenCreateSportDialog(selectedEvent.id)}
              >
                {t('admin.createSport')}
              </Button>
            </Box>
          </Box>
          
          <Divider sx={{ mb: 3 }} />
          
          <Grid container spacing={2}>
            <AnimatePresence mode="sync">
              {eventSports.length > 0 ? (
                eventSports.map((sport, index) => (
                  <Grid item xs={12} sm={6} md={4} key={sport.id}>
                    <MotionCard
                      layoutId={`sport-card-${sport.id}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.3, delay: 0.1 * (index + 1) }}
                      elevation={2}
                      sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                    >
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="h6" noWrap>{sport.name}</Typography>
                          <Chip 
                            label={t(`sport.${sport.type}`)} 
                            color={sport.type === 'tournament' ? 'primary' : sport.type === 'roundRobin' ? 'secondary' : 'default'}
                            size="small" 
                          />
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {sport.description || t(`sport.${sport.type}Description`) || ''}
                        </Typography>
                        
                        <Grid container spacing={1}>
                          <Grid item xs={6}>
                            <Typography variant="caption" display="block">{t('sport.teams')}</Typography>
                            <Typography variant="body2">{sport.teams?.length || 0}</Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" display="block">{t('sport.matches')}</Typography>
                            <Typography variant="body2">{sport.matches?.length || 0}</Typography>
                          </Grid>
                        </Grid>
                      </CardContent>
                      <CardActions>
                        <Button 
                          size="small" 
                          onClick={() => handleEditSport(sport.id)}
                          fullWidth
                        >
                          {t('admin.manageSport')}
                        </Button>
                      </CardActions>
                    </MotionCard>
                  </Grid>
                ))
              ) : (
                <Grid item xs={12}>
                  <Box sx={{ textAlign: 'center', py: 4, bgcolor: alpha('#f5f5f5', 0.5) }}>
                    <Typography color="text.secondary" paragraph>
                      {t('admin.noSportsInEvent')}
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={() => handleOpenCreateSportDialog(selectedEvent.id)}
                    >
                      {t('admin.createFirstSport')}
                    </Button>
                  </Box>
                </Grid>
              )}
            </AnimatePresence>
          </Grid>
          
          {!selectedEvent.isActive && (
            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Button
                variant="contained"
                color="primary"
                onClick={() => handleSetActiveEvent(selectedEvent.id)}
                startIcon={<EventIcon />}
              >
                {t('admin.setEventActive')}
              </Button>
            </Box>
          )}
        </MotionPaper>
      )}

      {/* ダイアログコンポーネント */}
      <CreateEventDialog
        open={createEventDialogOpen}
        onClose={() => setCreateEventDialogOpen(false)}
        onSuccess={() => {
          setCreateEventDialogOpen(false);
          showSnackbar(t('admin.eventCreated') || 'イベントが作成されました', 'success');
        }}
      />
      
      <CreateSportDialog
        open={createSportDialogOpen}
        onClose={() => setCreateSportDialogOpen(false)}
        onSuccess={(sportId: string) => {
          setCreateSportDialogOpen(false);
          showSnackbar(t('admin.sportCreated') || '競技が作成されました', 'success');
          // 作成された競技の編集ページにリダイレクト
          navigate(`/admin/sports/${sportId}`);
        }}
        eventId={selectedEventId || ''}
      />
    </AdminLayout>
  );
};

export default AdminPage;
