import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Divider,
  CircularProgress,
  Chip,
  useTheme
} from '@mui/material';
import {
  Event as EventIcon,
  SportsSoccer as SportIcon,
  Settings as SettingsIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Help as HelpIcon
} from '@mui/icons-material';
import { getSportTypeDescription, getSportTypeLabel } from '../../utils/labels';
import { useNavigate } from 'react-router-dom';
import { useDatabase } from '../../hooks/useDatabase';
import { Event, Sport } from '../../types';
import { useThemeContext } from '../../contexts/ThemeContext';
import CreateEventDialog from '../components/dialogs/CreateEventDialog';
import CreateSportDialog from '../components/dialogs/CreateSportDialog';
import { useAdminLayout } from '../context/AdminLayoutContext';

const AdminPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { alpha } = useThemeContext();
  const { showSnackbar, registerSaveHandler, unregisterSaveHandler, save, setHasUnsavedChanges } = useAdminLayout();
  const { 
    data: events, 
    loading: eventsLoading, 
    updateData: updateEvents
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
      <Box sx={{ mb: 2 }}>
        <Typography variant="overline" color="primary.main" fontWeight={700}>
          Overview
        </Typography>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { xs: 'stretch', md: 'flex-end' },
            justifyContent: 'space-between',
            gap: 1.5,
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
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
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

      <Box component="section" sx={{ py: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 1 }}>
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
              p: { xs: 1.5, sm: 2 },
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', sm: 'center' },
              gap: 2,
              bgcolor: alpha(theme.palette.primary.main, 0.05),
              borderLeft: '4px solid',
              borderColor: 'primary.main',
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
      </Box>

      {selectedEvent && (
        <Box component="section" sx={{ pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'stretch', sm: 'center' },
              gap: 2,
              mb: 1,
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
          
          <Divider />

          {eventSports.length > 0 ? (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' },
                borderLeft: '1px solid',
                borderColor: 'divider',
              }}
            >
              {eventSports.map((sport) => (
                <Box
                  key={sport.id}
                  sx={{
                    minWidth: 0,
                    p: 1.5,
                    display: 'flex',
                    flexDirection: 'column',
                    borderRight: '1px solid',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, mb: 0.75 }}>
                    <Typography variant="h6" fontWeight={700}>{sport.name}</Typography>
                    <Chip
                      label={getSportTypeLabel(sport.type)}
                      color={sport.type === 'tournament' ? 'primary' : sport.type === 'roundRobin' ? 'secondary' : 'default'}
                      size="small"
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1, flexGrow: 1 }}>
                    {sport.description || getSportTypeDescription(sport.type)}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 4, mb: 0.5 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">チーム</Typography>
                      <Typography variant="body2">{sport.teams?.length || 0}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">試合数</Typography>
                      <Typography variant="body2">{sport.matches?.length || 0}</Typography>
                    </Box>
                  </Box>
                  <Button size="small" onClick={() => handleEditSport(sport.id)} sx={{ alignSelf: 'flex-start', px: 0 }}>
                    競技を管理
                  </Button>
                </Box>
              ))}
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', py: 3 }}>
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
          )}
          
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
        </Box>
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
