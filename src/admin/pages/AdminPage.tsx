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
  Alert,
  useTheme
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
import { getSportTypeDescription, getSportTypeLabel } from '../../utils/labels';
import { useNavigate } from 'react-router-dom';
import { useDatabase } from '../../hooks/useDatabase';
import { Event, Sport } from '../../types';
import { useThemeContext } from '../../contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import CreateEventDialog from '../components/dialogs/CreateEventDialog';
import CreateSportDialog from '../components/dialogs/CreateSportDialog';
import { useAdminLayout } from '../context/AdminLayoutContext';

const MotionPaper = motion(Paper);
const MotionCard = motion(Card);

const AdminPage: React.FC = () => {
  const theme = useTheme();
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
    if (!events) return;
    
    try {
      // 型安全な更新オブジェクトを作成
      const updates: Record<string, Event> = Object.entries(events).reduce((acc, [id, event]) => {
        acc[id] = {
          ...event,
          isActive: id === eventId
        };
        return acc;
      }, {} as Record<string, Event>);
      
      // 楽観的UI更新
      setLocalEventState(prev => prev ? {
        ...prev,
        ...updates
      } : null);
      
      // バックエンド更新
      await updateEvents(updates);
      showSnackbar("アクティブイベントが更新されました", 'success');
      
    } catch (error) {
      // エラー時にローカル状態を元に戻す
      if (events) {
        setLocalEventState(events);
      }
      console.error('Error setting active event:', error);
      showSnackbar("エラーが発生しました", 'error');
    }
  }, [events, updateEvents, showSnackbar]);

  const handleCreateDialog = {
    event: () => {
      setCreateEventDialogOpen(true);
    },
    sport: (eventId: string) => {
      if (!events || !events[eventId]) return;
      setSelectedEventId(eventId);
      setCreateSportDialogOpen(true);
    }
  };

  // 元の重複した宣言を削除し、新しい関数を使用
  const handleOpenCreateEventDialog = handleCreateDialog.event;
  const handleOpenCreateSportDialog = handleCreateDialog.sport;

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
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // 選択されているイベント
  const selectedEvent = selectedEventId && localEventState ? localEventState[selectedEventId] : null;
  // 選択されているイベントの競技一覧
  const eventSports = selectedEventId ? getSportsForEvent(selectedEventId) : [];
  // アクティブなイベント
  const activeEvent = localEventState ? Object.values(localEventState).find(event => event.isActive) : null;

  return (
    <>
      <Box sx={{ mb: { xs: 3, md: 4 } }}>
        <Typography variant="overline" color="primary.main" fontWeight={700}>
          Overview
        </Typography>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { xs: 'stretch', md: 'flex-end' },
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Box>
            <Typography
              variant="h4"
              component="h1"
              fontWeight={700}
              sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem' } }}
            >
              ダッシュボード
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              開催中のイベントと競技をまとめて管理します。
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<HelpIcon />}
                onClick={handleGoToHelp}
              >
                {"ヘルプ"}
              </Button>
              <Button
                variant="outlined"
                startIcon={<SettingsIcon />}
                onClick={handleGoToSettings}
              >
                {"設定"}
              </Button>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={() => save('adminDashboard')}
              >
                {"変更を保存"}
              </Button>
          </Box>
        </Box>
      </Box>

      {/* アクティブイベント表示 */}
      <MotionPaper
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        elevation={0}
        sx={{ p: { xs: 2, sm: 3 }, mb: 3, border: '1px solid', borderColor: 'divider' }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 2 }}>
          <Box>
            <Typography variant="h6" fontWeight={700}>{"現在のイベント"}</Typography>
            <Typography variant="caption" color="text.secondary">公開画面に表示するイベント</Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<EventIcon />}
            onClick={handleOpenCreateEventDialog}
          >
            {"イベント作成"}
          </Button>
        </Box>
        
        {activeEvent ? (
          <Box
            sx={{
              p: { xs: 2, sm: 2.5 },
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', sm: 'center' },
              gap: 2,
              bgcolor: alpha(theme.palette.primary.main, 0.05),
              borderLeft: '4px solid',
              borderColor: 'primary.main',
              borderRadius: 2,
            }}
          >
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="h5" fontWeight={700}>{activeEvent.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {new Date(activeEvent.date).toLocaleDateString()}
                    {activeEvent.alternativeDate && ` (${"予備日"}: ${new Date(activeEvent.alternativeDate).toLocaleDateString()})`}
                  </Typography>
                  {activeEvent.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {activeEvent.description}
                    </Typography>
                  )}
                </Box>
                <Chip color="success" label={"アクティブ"} />
          </Box>
        ) : (
          <Box sx={{ textAlign: 'center', py: 3, bgcolor: alpha('#f5f5f5', 0.5) }}>
            <Typography color="text.secondary">
              {"アクティブなイベントがありません"}
            </Typography>
            <Button 
              variant="outlined" 
              startIcon={<EventIcon />}
              onClick={handleOpenCreateEventDialog}
              sx={{ mt: 2 }}
            >
              {"最初のイベントを作成"}
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
          elevation={0}
          sx={{ p: { xs: 2, sm: 3 }, mb: 3, border: '1px solid', borderColor: 'divider' }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'stretch', sm: 'center' },
              gap: 2,
              mb: 2,
            }}
          >
            <Box>
              <Typography variant="h6" fontWeight={700}>
                {selectedEvent.name} - {"競技管理"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                競技数: {eventSports.length}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              <Button 
                variant="outlined" 
                startIcon={<EditIcon />}
                onClick={() => navigate(`/admin/events/${selectedEvent.id}`)}
              >
                {"イベント編集"}
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenCreateSportDialog(selectedEvent.id)}
              >
                {"競技作成"}
              </Button>
            </Box>
          </Box>
          
          <Divider sx={{ mb: 2.5 }} />
          
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
                      elevation={0}
                      variant="outlined"
                      sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                    >
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                          <Typography variant="h6" fontWeight={700}>{sport.name}</Typography>
                          <Chip 
                            label={getSportTypeLabel(sport.type)} 
                            color={sport.type === 'tournament' ? 'primary' : sport.type === 'roundRobin' ? 'secondary' : 'default'}
                            size="small" 
                          />
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {sport.description || getSportTypeDescription(sport.type)}
                        </Typography>
                        
                        <Grid container spacing={1}>
                          <Grid item xs={6}>
                            <Typography variant="caption" display="block">{"チーム"}</Typography>
                            <Typography variant="body2">{sport.teams?.length || 0}</Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" display="block">{"試合数"}</Typography>
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
                          {"競技を管理"}
                        </Button>
                      </CardActions>
                    </MotionCard>
                  </Grid>
                ))
              ) : (
                <Grid item xs={12}>
                  <Box sx={{ textAlign: 'center', py: 4, bgcolor: alpha('#f5f5f5', 0.5) }}>
                    <Typography color="text.secondary" paragraph>
                      {"このイベントには競技がありません"}
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={() => handleOpenCreateSportDialog(selectedEvent.id)}
                    >
                      {"最初の競技を作成"}
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
                {"このイベントをアクティブにする"}
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
          showSnackbar("イベントが作成されました", 'success');
        }}
      />
      
      <CreateSportDialog
        open={createSportDialogOpen}
        onClose={() => setCreateSportDialogOpen(false)}
        onSuccess={(sportId: string) => {
          setCreateSportDialogOpen(false);
          showSnackbar("競技が作成されました", 'success');
          // 作成された競技の編集ページにリダイレクト
          navigate(`/admin/sports/${sportId}`);
        }}
        eventId={selectedEventId || ''}
      />
    </>
  );
};

export default AdminPage;
