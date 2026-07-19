import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Toolbar,
  Drawer,
  IconButton,
  Typography,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Button,
  Avatar,
  Menu,
  MenuItem,
  CircularProgress,
  Chip,
  Tooltip,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Menu as MenuIcon,
  Close as CloseIcon,
  Dashboard as DashboardIcon,
  Event as EventIcon,
  SportsSoccer as SportIcon,
  Settings as SettingsIcon,
  ExpandLess,
  ExpandMore,
  Add as AddIcon,
  Home as HomeIcon,
  FileDownload as ExportIcon,
  Backup as BackupIcon
} from '@mui/icons-material';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useThemeContext } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useDatabase } from '../../hooks/useDatabase';
import { Event, Sport } from '../../types';
import { useAdminLayout, useAdminSaveState } from '../context/AdminLayoutContext';
import CreateEventDialog from './dialogs/CreateEventDialog';
import CreateSportDialog from './dialogs/CreateSportDialog';

const drawerWidth = 256;
const headerHeight = 56;

const SaveStatus = () => {
  const { savingStatus, hasUnsavedChanges, lastSaved } = useAdminSaveState();

  return (
    <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', mr: 0.5 }}>
      {hasUnsavedChanges && <Chip label="未保存" color="warning" size="small" />}
      {savingStatus === 'saving' && <CircularProgress size={18} sx={{ ml: 1 }} />}
      {savingStatus === 'saved' && lastSaved && (
        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
          {lastSaved.toLocaleTimeString()} 保存
        </Typography>
      )}
      {savingStatus === 'error' && (
        <Typography variant="caption" color="error" sx={{ ml: 1 }}>
          保存失敗
        </Typography>
      )}
    </Box>
  );
};

const AdminLayout = () => {
  const theme = useTheme();
  const { alpha } = useThemeContext();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout } = useAuth();
  const { showSnackbar, setSavingStatus, hasUnsavedChanges: hasPendingChanges } = useAdminLayout();
  
  // メインコンテンツのローディング状態を管理
  const [contentLoading, setContentLoading] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  
  // ユーザーメニュー
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // モバイルビューの状態管理を追加
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  
  // イベント展開状態
  const [expandedEventIds, setExpandedEventIds] = useState<string[]>([]);
  
  // データ取得
  const { data: events, loading: eventsLoading } = useDatabase<Record<string, Event>>('/events');
  const { data: sports, loading: sportsLoading } = useDatabase<Record<string, Sport>>('/sports');

  // 現在のパスに基づいて適切なイベントを展開
  useEffect(() => {
    if (events && sports) {
      let eventIdsToExpand: string[] = [];
      
      // イベント詳細ページの場合
      if (location.pathname.includes('/admin/events/')) {
        const eventId = location.pathname.split('/').pop();
        if (eventId && events[eventId]) {
          eventIdsToExpand.push(eventId);
        }
      }
      
      // 競技詳細ページの場合
      if (location.pathname.includes('/admin/sports/')) {
        const sportId = location.pathname.split('/').pop();
        if (sportId && sports[sportId]) {
          const sport = sports[sportId];
          const eventId = sport.eventId;
          if (eventId && events[eventId]) {
            eventIdsToExpand.push(eventId);
          }
        }
      }
      
      // イベントが有効なものを特定し、その競技も展開
      if (!isMobile) {
        Object.values(events).forEach(event => {
          if (event.isActive) {
            eventIdsToExpand.push(event.id);
          }
        });
      }
      
      // 重複を排除して展開状態を更新
      setExpandedEventIds([...new Set(eventIdsToExpand)]);
    }
  }, [location.pathname, events, sports, isMobile]);
  
  const handleDrawerToggle = () => {
    setMobileOpen((open) => !open);
  };

  const handleEventClick = (eventId: string) => {
    // 現在のパスがイベント編集ページで、かつ別のイベントを選択した場合
    if (location.pathname.includes('/admin/events/') && !location.pathname.includes(eventId)) {
      // 未保存の変更がある場合は確認
      if (hasPendingChanges()) {
        const confirmNavigation = window.confirm("保存されていない変更があります。移動しますか？");
        if (!confirmNavigation) {
          return; // ナビゲーションをキャンセル
        }
        
        // 保存状態をリセット
        setSavingStatus('idle');
      }
    }
    
    // コンテンツ部分のローディングを表示
    setContentLoading(true);
    
    // URLを変更して、React Routerの通常のナビゲーションを使用
    navigate(`/admin/events/${eventId}`);
    setMobileOpen(false);
    
    // スクロール位置をトップに戻す
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
    
    // ローディング状態を少し遅延させて解除（データ取得のための時間）
    setTimeout(() => {
      setContentLoading(false);
    }, 500);
  };
  
  const handleEventToggle = (eventId: string, e: React.MouseEvent) => {
    // クリックイベントが親要素に伝播しないようにする
    e.stopPropagation();
    
    // イベントID展開のトグル処理のみ行う
    setExpandedEventIds(prev => 
      prev.includes(eventId) 
        ? prev.filter(id => id !== eventId) 
        : [...prev, eventId]
    );
  };
  
  const handleSportClick = (sportId: string) => {
    // 現在のパスと異なる場合のみナビゲーション
    if (location.pathname !== `/admin/sports/${sportId}`) {
      // 未保存の変更がある場合は確認
      if (hasPendingChanges()) {
        const confirmNavigation = window.confirm("保存されていない変更があります。移動しますか？");
        if (!confirmNavigation) {
          return; // ナビゲーションをキャンセル
        }
        
        // 保存状態をリセット
        setSavingStatus('idle');
      }
      
      // コンテンツ部分のローディングを表示
      setContentLoading(true);
      
      // React Routerのナビゲーションを使用
      navigate(`/admin/sports/${sportId}`);
      setMobileOpen(false);
      
      // スクロール位置をトップに戻す
      if (contentRef.current) {
        contentRef.current.scrollTop = 0;
      }
      
      // URLが変わった後で対象のイベントを展開する
      const sportObj = sports?.[sportId];
      if (sportObj && sportObj.eventId) {
        setExpandedEventIds(prev => 
          prev.includes(sportObj.eventId) ? prev : [...prev, sportObj.eventId]
        );
      }
      
      // ローディング状態を少し遅延させて解除（データ取得のための時間）
      setTimeout(() => {
        setContentLoading(false);
      }, 500);
    }
  };

  const handleCreateEvent = () => {
    setMobileOpen(false);
    setEventDialogOpen(true);
  };
  
  const handleCreateSport = (eventId: string) => {
    setMobileOpen(false);
    setSelectedEventId(eventId);
    setSportDialogOpen(true);
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setMobileOpen(false);
  };

  // ユーザーメニュー
  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleUserMenuClose = () => {
    setAnchorEl(null);
  };
  
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  // イベントごとの競技リストを取得
  const getSportsByEventId = (eventId: string) => {
    if (!sports) return [];
    return Object.values(sports).filter(sport => sport.eventId === eventId);
  };

  // ダイアログの状態
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [sportDialogOpen, setSportDialogOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string>('');

  // 成功時のハンドラー
  const handleEventSuccess = () => {
    setEventDialogOpen(false);
    showSnackbar("イベントが作成されました", 'success');
  };

  const handleSportSuccess = (sportId: string) => {
    setSportDialogOpen(false);
    showSnackbar("競技が作成されました", 'success');
    navigate(`/admin/sports/${sportId}`);
  };

  const renderDrawerContent = () => (
    <>
      <Toolbar
        sx={{
          minHeight: `${headerHeight}px !important`,
          px: 2,
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 1,
          bgcolor: 'background.paper',
        }}
      >
        <Typography
          variant="h6"
          fontWeight={800}
          color="primary.main"
        >
          CELERITAS
        </Typography>
        <IconButton
          aria-label="メニューを閉じる"
          onClick={handleDrawerToggle}
          size="small"
          sx={{ display: { md: 'none' } }}
        >
          <CloseIcon />
        </IconButton>
      </Toolbar>
      <Divider />
      
      {/* ダッシュボードリンク */}
      <List dense>
        <ListItem disablePadding>
          <ListItemButton 
            selected={location.pathname === '/admin'}
            onClick={() => handleNavigate('/admin')}
          >
            <ListItemIcon>
              <DashboardIcon />
            </ListItemIcon>
            <ListItemText primary={"ダッシュボード"} />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton
            selected={location.pathname === '/admin/settings'}
            onClick={() => handleNavigate('/admin/settings')}
          >
            <ListItemIcon>
              <SettingsIcon />
            </ListItemIcon>
            <ListItemText primary={"設定"} />
          </ListItemButton>
        </ListItem>
      </List>
      
      {/*エクスポートタブ */}
      <List dense>
        <ListItem disablePadding>
          <ListItemButton 
            selected={location.pathname === '/admin/export'}
            onClick={() => handleNavigate('/admin/export')}
          >
            <ListItemIcon>
              <ExportIcon />
            </ListItemIcon>
            <ListItemText primary={"データエクスポート"} />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton 
            selected={location.pathname === '/admin/backup'}
            onClick={() => handleNavigate('/admin/backup')}
          >
            <ListItemIcon>
              <BackupIcon />
            </ListItemIcon>
            <ListItemText primary={"バックアップ"} />
          </ListItemButton>
        </ListItem>
      </List>
      <Divider />
      
      {/* イベントリスト */}
      <List
        dense
        subheader={
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, py: 0.5 }}>
            <Typography variant="subtitle2" className="item-label">
              {"イベント管理"}
            </Typography>
            <Button
              size="small"
              onClick={handleCreateEvent}
              startIcon={<AddIcon />}
            >
              {"作成"}
            </Button>
          </Box>
        }
      >
        {eventsLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <CircularProgress size={24} />
          </Box>
        ) : events && Object.values(events).length > 0 ? (
          Object.values(events)
            // _versionキーを持つオブジェクトを除外
            .filter(event => event.id !== '_version')
            .map((event) => {
            // 現在のイベントまたはその下の競技が選択されているかどうかを確認
            const isCurrentPath = location.pathname === `/admin/events/${event.id}`;
            const hasSelectedSport = sports && 
              Object.values(sports).some(sport => 
                sport.eventId === event.id && location.pathname === `/admin/sports/${sport.id}`
              );
            const shouldExpand = expandedEventIds.includes(event.id) || isCurrentPath || hasSelectedSport;
            
            return (
              <React.Fragment key={event.id}>
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() => handleEventClick(event.id)}
                    selected={isCurrentPath}
                    sx={{ pr: 6 }}
                  >
                    <ListItemIcon>
                      <EventIcon color={event.isActive ? "primary" : "inherit"} />
                    </ListItemIcon>
                    <ListItemText 
                      primary={event.name} 
                      secondary={new Date(event.date).toLocaleDateString()}
                    />
                  </ListItemButton>
                  <IconButton
                    size="small"
                    aria-label={shouldExpand ? `${event.name}の競技を閉じる` : `${event.name}の競技を開く`}
                    onClick={(e) => handleEventToggle(event.id, e)}
                    sx={{ position: 'absolute', right: 14 }}
                  >
                    {shouldExpand ? <ExpandLess /> : <ExpandMore />}
                  </IconButton>
                </ListItem>
                
                {/* 競技リスト - 縮小時は自動展開しない */}
                <Collapse in={shouldExpand || false} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    <ListItem disablePadding>
                      <ListItemButton sx={{ pl: 4 }} onClick={() => handleCreateSport(event.id)}>
                        <ListItemIcon>
                          <AddIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText 
                          primary={"競技作成"}
                          primaryTypographyProps={{ variant: 'body2' }}
                        />
                      </ListItemButton>
                    </ListItem>
                    
                    {getSportsByEventId(event.id).map((sport) => {
                      const isSportSelected = location.pathname === `/admin/sports/${sport.id}`;
                      return (
                        <ListItem disablePadding key={sport.id}>
                          <ListItemButton 
                            sx={{ pl: 4 }}
                            selected={isSportSelected}
                            onClick={() => handleSportClick(sport.id)}
                          >
                            <ListItemIcon>
                              <SportIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText 
                              primary={sport.name}
                              primaryTypographyProps={{ variant: 'body2' }}
                            />
                          </ListItemButton>
                        </ListItem>
                      );
                    })}
                    
                    {getSportsByEventId(event.id).length === 0 && (
                      <ListItem sx={{ pl: 4 }}>
                        <ListItemText 
                          secondary={"このイベントには競技がありません"}
                          secondaryTypographyProps={{ variant: 'body2' }}
                          className="item-label"
                        />
                      </ListItem>
                    )}
                  </List>
                </Collapse>
              </React.Fragment>
            );
          })
        ) : (
          <ListItem sx={{ pl: 2 }}>
            <ListItemText secondary={"イベントがありません"} className="item-label" />
          </ListItem>
        )}
      </List>
    </>
  );

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: `${drawerWidth}px minmax(0, 1fr)` },
        height: '100dvh',
        overflow: 'hidden',
        bgcolor: 'background.default',
      }}
    >
      <Box
        component="aside"
        sx={{
          display: { xs: 'none', md: 'block' },
          height: '100dvh',
          overflowY: 'auto',
          bgcolor: 'background.paper',
          borderRight: `1px solid ${theme.palette.divider}`,
          '& .MuiList-root': { py: 0.5 },
          '& .MuiListItemButton-root': { mx: 0.75, borderRadius: 1.5, py: 0.625 },
          '& .MuiListItemIcon-root': { minWidth: 36 },
        }}
      >
        {renderDrawerContent()}
      </Box>

      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            borderRadius: 0,
            '& .MuiList-root': { py: 0.5 },
            '& .MuiListItemButton-root': { mx: 0.75, borderRadius: 1.5, py: 0.625 },
            '& .MuiListItemIcon-root': { minWidth: 36 },
          },
        }}
      >
        {renderDrawerContent()}
      </Drawer>

      <Box
        component="main"
        ref={contentRef}
        sx={{ minWidth: 0, height: '100dvh', overflowY: 'auto', position: 'relative' }}
      >
        <Box
          component="header"
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: theme.zIndex.appBar,
            height: headerHeight,
            px: { xs: 1, sm: 2 },
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            bgcolor: alpha(theme.palette.background.paper, 0.94),
            backdropFilter: 'blur(12px)',
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <IconButton
            color="inherit"
            aria-label="メニューを開く"
            onClick={handleDrawerToggle}
            sx={{ display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="subtitle1" fontWeight={700} noWrap sx={{ flexGrow: 1 }}>
            管理ワークスペース
          </Typography>

          <SaveStatus />

          <Tooltip title="公開画面に戻る">
            <IconButton color="inherit" onClick={() => navigate('/')}>
              <HomeIcon />
            </IconButton>
          </Tooltip>
          <IconButton
            onClick={handleUserMenuOpen}
            color="inherit"
            aria-label="アカウントメニュー"
          >
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 14 }}>
              {currentUser?.email?.charAt(0).toUpperCase() || 'U'}
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            open={Boolean(anchorEl)}
            onClose={handleUserMenuClose}
          >
            <MenuItem disabled>{currentUser?.email}</MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>ログアウト</MenuItem>
          </Menu>
        </Box>

        {contentLoading && (
          <Box
            sx={{
              position: 'absolute',
              inset: `${headerHeight}px 0 0`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: alpha(theme.palette.background.paper, 0.72),
              zIndex: theme.zIndex.appBar - 1,
              backdropFilter: 'blur(3px)',
            }}
          >
            <CircularProgress />
          </Box>
        )}

        <Box
          sx={{
            p: { xs: 1, sm: 1.25 },
            width: '100%',
            '& .MuiPaper-root': { boxShadow: 'none' },
            '& .MuiCard-root': { borderRadius: 0 },
          }}
        >
          <Outlet />
        </Box>
      </Box>

      {/* ダイアログの追加 */}
      <CreateEventDialog
        open={eventDialogOpen}
        onClose={() => setEventDialogOpen(false)}
        onSuccess={handleEventSuccess}
      />

      <CreateSportDialog
        open={sportDialogOpen}
        onClose={() => setSportDialogOpen(false)}
        onSuccess={handleSportSuccess}
        eventId={selectedEventId}
      />
    </Box>
  );
};

export default AdminLayout;
