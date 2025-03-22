import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  AppBar,
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
  Snackbar,
  Alert,
  CircularProgress,
  Chip,
  Tooltip,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
  Dashboard as DashboardIcon,
  Event as EventIcon,
  SportsSoccer as SportIcon,
  Settings as SettingsIcon,
  ExpandLess,
  ExpandMore,
  Add as AddIcon,
  Save as SaveIcon,
  Help as HelpIcon,
  Home as HomeIcon,
  AccountCircle,
  Scoreboard as ScoreboardIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useThemeContext } from '../../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useDatabase } from '../../hooks/useDatabase';
import { Event, Sport } from '../../types';
import { useAdminLayout } from '../../contexts/AdminLayoutContext';
import CreateEventDialog from '../admin/dialogs/CreateEventDialog';
import CreateSportDialog from '../admin/dialogs/CreateSportDialog';

// AdminLayout の props 型定義を明示的に追加
interface AdminLayoutProps {
  children: React.ReactNode;
}

// drawerWidthを変数として定義
const drawerWidth = 240;
const collapsedDrawerWidth = 72; // 収納時の幅を少し広げる

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { mode, toggleColorMode, alpha } = useThemeContext();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout } = useAuth();
  const { showSnackbar, savingStatus, setSavingStatus, save, hasUnsavedChanges, registerSaveHandler } = useAdminLayout(); // コンテキストから機能を取得
  
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  // メインコンテンツのローディング状態を管理
  const [contentLoading, setContentLoading] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  
  // ユーザーメニュー
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  
  // イベント展開状態
  const [expandedEventIds, setExpandedEventIds] = useState<string[]>([]);
  
  // データ取得
  const { data: events, loading: eventsLoading } = useDatabase<Record<string, Event>>('/events');
  const { data: sports, loading: sportsLoading } = useDatabase<Record<string, Sport>>('/sports');

  // 現在のパスに基づいて適切なイベントを展開
  useEffect(() => {
    if (events && sports) {
      if (location.pathname.includes('/admin/events/')) {
        const eventId = location.pathname.split('/').pop();
        if (eventId && events[eventId]) {
          setExpandedEventIds(prev => prev.includes(eventId) ? prev : [...prev, eventId]);
        }
      }
      
      if (location.pathname.includes('/admin/sports/')) {
        const sportId = location.pathname.split('/').pop();
        if (sportId && sports[sportId]) {
          const sport = sports[sportId];
          const eventId = sport.eventId;
          if (eventId && events[eventId]) {
            setExpandedEventIds(prev => prev.includes(eventId) ? prev : [...prev, eventId]);
          }
        }
      }
    }
  }, [location.pathname, events, sports]);
  
  // レイアウト全体の保存ハンドラを登録
  useEffect(() => {
    // このコンポーネント固有の保存処理（必要に応じて実装）
    const handleLayoutSave = async () => {
      console.log('レイアウト設定の保存');
      // 実際には何も保存しない
      return true;
    };
    
    registerSaveHandler(handleLayoutSave, 'layout');
    
    // クリーンアップ関数は不要（コンポーネントがアンマウントされないため）
  }, [registerSaveHandler]);
  
  // 手動保存
  const handleManualSave = async () => {
    // 新しい保存メカニズムを使用
    try {
      await save();
      setLastSaved(new Date());
    } catch (error) {
      console.error('Manual save error:', error);
    }
  };
  
  // モバイルビューの状態管理を追加
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [mobileOpen, setMobileOpen] = useState(false);

  // ドロワーの開閉ハンドラーを更新
  const handleDrawerToggle = () => {
    if (isMobile) {
      setMobileOpen(!mobileOpen);
    } else {
      setDrawerOpen(!drawerOpen);
      // アイコンのアニメーションのためにタイムアウトを設定
      setTimeout(() => {
        if (contentRef.current) {
          contentRef.current.style.transition = 'all 0.2s ease-out';
        }
      }, 0);
    }
  };

  const handleEventClick = (eventId: string) => {
    // 現在のパスがイベント編集ページで、かつ別のイベントを選択した場合
    if (location.pathname.includes('/admin/events/') && !location.pathname.includes(eventId)) {
      // 未保存の変更がある場合は確認
      if (hasUnsavedChanges) {
        const confirmNavigation = window.confirm(t('admin.unsavedChangesWarning'));
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
      if (hasUnsavedChanges) {
        const confirmNavigation = window.confirm(t('admin.unsavedChangesWarning'));
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
      
      // スクロール位置をトップに戻す
      if (contentRef.current) {
        contentRef.current.scrollTop = 0;
      }
      
      // ローディング状態を少し遅延させて解除（データ取得のための時間）
      setTimeout(() => {
        setContentLoading(false);
      }, 500);
    }
  };

  const handleCreateEvent = () => {
    setEventDialogOpen(true);
  };
  
  const handleCreateSport = (eventId: string) => {
    setSelectedEventId(eventId);
    setSportDialogOpen(true);
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
    showSnackbar(t('admin.eventCreated'), 'success');
  };

  const handleSportSuccess = (sportId: string) => {
    setSportDialogOpen(false);
    showSnackbar(t('admin.sportCreated'), 'success');
    navigate(`/admin/sports/${sportId}`);
  };

  // ドロワーの共通スタイル
  const drawerStyles = {
    width: drawerOpen ? drawerWidth : collapsedDrawerWidth,
    flexShrink: 0,
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
    '& .MuiDrawer-paper': {
      width: drawerOpen ? drawerWidth : collapsedDrawerWidth,
      transition: theme.transitions.create(['width', 'margin'], {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.enteringScreen,
      }),
      overflowX: 'hidden',
      borderRight: `1px solid ${theme.palette.divider}`,
      backgroundColor: theme.palette.background.paper,
      '&:hover': {
        width: !drawerOpen && !isMobile ? drawerWidth : undefined,
        '& .MuiListItemText-root': {
          display: !drawerOpen && !isMobile ? 'block' : undefined,
          opacity: !drawerOpen && !isMobile ? 1 : undefined,
        },
        '& .MuiListItemIcon-root': {
          minWidth: !drawerOpen && !isMobile ? 56 : undefined,
          justifyContent: !drawerOpen && !isMobile ? 'initial' : undefined,
        },
        '& .MuiListItemButton-root': {
          px: !drawerOpen && !isMobile ? 2 : undefined,
        }
      }
    },
    '& .MuiListItemText-root': {
      opacity: drawerOpen ? 1 : 0,
      transition: theme.transitions.create(['opacity', 'margin'], {
        duration: theme.transitions.duration.shorter,
      }),
      display: drawerOpen ? 'block' : 'none',
      whiteSpace: 'normal',
    },
    '& .MuiListItemIcon-root': {
      minWidth: drawerOpen ? 56 : collapsedDrawerWidth,
      justifyContent: drawerOpen ? 'initial' : 'center',
      transition: theme.transitions.create(['min-width', 'justify-content'], {
        duration: theme.transitions.duration.shorter,
      }),
    },
    '& .MuiListItemButton-root': {
      justifyContent: drawerOpen ? 'initial' : 'center',
      px: drawerOpen ? 2 : 1,
      py: 1.5,
      mx: !drawerOpen ? 1 : 0,
      borderRadius: !drawerOpen ? 1 : 0,
      '&:hover': {
        bgcolor: alpha(theme.palette.primary.main, 0.08),
      },
      '&.Mui-selected': {
        bgcolor: alpha(theme.palette.primary.main, 0.12),
        '&:hover': {
          bgcolor: alpha(theme.palette.primary.main, 0.16),
        }
      }
    },
    '& .MuiListItem-root': {
      display: 'block',
    },
    '& .MuiButtonBase-root': {
      transition: theme.transitions.create(['margin', 'padding'], {
        duration: theme.transitions.duration.shorter,
      }),
    },
  };

  // ドロワーの内容をコンポーネント化（関数をコンポーネント内に移動）
  const renderDrawerContent = () => (
    <>
      <Toolbar variant="dense" />
      <Divider />
      
      {/* ダッシュボードリンク */}
      <List>
        <ListItem disablePadding>
          <ListItemButton 
            selected={location.pathname === '/admin'}
            onClick={() => navigate('/admin')}
          >
            <ListItemIcon>
              <DashboardIcon />
            </ListItemIcon>
            <ListItemText primary={t('admin.dashboard')} />
          </ListItemButton>
        {/*
          <ListItem disablePadding>
            <ListItemButton 
              selected={location.pathname === '/admin/scoring-board'}
              onClick={() => navigate('/admin/scoring-board')}
            >
              <ListItemIcon>
                <ScoreboardIcon />
              </ListItemIcon>
              <ListItemText primary={t('admin.scoringBoard')} />
            </ListItemButton>
          </ListItem>*/}
        </ListItem>
      </List>
      
      <Divider />
      
      {/* イベントリスト */}
      <List
        subheader={
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, py: 1 }}>
            <Typography variant="subtitle2">
              {t('admin.events')}
            </Typography>
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={handleCreateEvent}
            >
              {t('admin.create')}
            </Button>
          </Box>
        }
      >
        {eventsLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <CircularProgress size={24} />
          </Box>
        ) : events && Object.values(events).length > 0 ? (
          Object.values(events).map((event) => (
            <React.Fragment key={event.id}>
              <ListItem disablePadding>
                <ListItemButton 
                  onClick={() => handleEventClick(event.id)}
                  selected={location.pathname === `/admin/events/${event.id}`}
                >
                  <ListItemIcon>
                    <EventIcon color={event.isActive ? "primary" : "inherit"} />
                  </ListItemIcon>
                  <ListItemText 
                    primary={event.name} 
                    secondary={new Date(event.date).toLocaleDateString()}
                  />
                  <IconButton
                    size="small"
                    onClick={(e) => handleEventToggle(event.id, e)}
                    sx={{ ml: 'auto' }}
                  >
                    {expandedEventIds.includes(event.id) ? <ExpandLess /> : <ExpandMore />}
                  </IconButton>
                </ListItemButton>
              </ListItem>
              
              {/* 競技リスト */}
              <Collapse in={expandedEventIds.includes(event.id)} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  <ListItem disablePadding>
                    <ListItemButton sx={{ pl: 4 }} onClick={() => handleCreateSport(event.id)}>
                      <ListItemIcon>
                        <AddIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={t('admin.createSport')}
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItemButton>
                  </ListItem>
                  
                  {getSportsByEventId(event.id).map((sport) => (
                    <ListItem disablePadding key={sport.id}>
                      <ListItemButton 
                        sx={{ pl: 4 }}
                        selected={location.pathname === `/admin/sports/${sport.id}`}
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
                  ))}
                  
                  {getSportsByEventId(event.id).length === 0 && (
                    <ListItem sx={{ pl: 4 }}>
                      <ListItemText 
                        secondary={t('admin.noSportsInEvent')}
                        secondaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  )}
                </List>
              </Collapse>
            </React.Fragment>
          ))
        ) : (
          <ListItem sx={{ pl: 2 }}>
            <ListItemText secondary={t('admin.noEvents')} />
          </ListItem>
        )}
      </List>
    </>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* トップツールバー（常時表示） */}
      <AppBar
        position="fixed"
        color="default"
        elevation={1}
        sx={{
          zIndex: theme.zIndex.drawer + 2,
          bgcolor: alpha(theme.palette.background.paper, 0.8),
          backdropFilter: 'blur(8px)',
          '& .MuiToolbar-root': {
            minHeight: 48, // ツールバーの高さを小さく
          }
        }}
      >
        <Toolbar variant="dense" sx={{ minHeight: 48 }}>
          {/* ハンバーガーメニューを追加 */}
          <IconButton
            edge="start"
            color="inherit"
            aria-label="menu"
            onClick={handleDrawerToggle}
            sx={{
              mr: 2,
              display: { lg: drawerOpen ? 'none' : 'block' },
              transition: theme.transitions.create(['transform', 'margin'], {
                duration: theme.transitions.duration.shorter,
              }),
              transform: drawerOpen ? 'rotate(180deg)' : 'none',
            }}
          >
            {isMobile ? <MenuIcon /> : drawerOpen ? <ChevronLeftIcon /> : <MenuIcon />}
          </IconButton>

          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {t('admin.title')}
          </Typography>
          
          {/* 保存状態表示 */}
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
            {hasUnsavedChanges && (
              <Chip 
                label={t('admin.unsavedChanges')} 
                color="warning" 
                size="small" 
                sx={{ mr: 1 }}
              />
            )}
            {savingStatus === 'saving' ? (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CircularProgress size={16} sx={{ mr: 1 }} />
                <Typography variant="body2">{t('admin.saving')}</Typography>
              </Box>
            ) : savingStatus === 'saved' ? (
              <Typography variant="body2" color="text.secondary">
                {lastSaved && t('admin.lastSaved', { time: lastSaved.toLocaleTimeString() })}
              </Typography>
            ) : savingStatus === 'error' ? (
              <Typography variant="body2" color="error">
                {t('admin.saveError')}
              </Typography>
            ) : null}
          </Box>
          
          {/* アクションボタン群 */}
          <Tooltip title={t('admin.home')}>
            <IconButton color="inherit" onClick={() => navigate('/')}>
              <HomeIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('admin.settings')}>
            <IconButton color="inherit" onClick={() => navigate('/admin/settings')}>
              <SettingsIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('admin.help')}>
            <IconButton color="inherit" onClick={() => navigate('/admin/help')}>
              <HelpIcon />
            </IconButton>
          </Tooltip>
          {/* ユーザーメニュー */}
          <IconButton
            size="large"
            edge="end"
            onClick={handleUserMenuOpen}
            color="inherit"
          >
            <Avatar 
              sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}
              alt={currentUser?.email || 'User'}
            >
              {currentUser?.email?.charAt(0).toUpperCase() || 'U'}
            </Avatar>
          </IconButton>
          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleUserMenuClose}
          >
            <MenuItem disabled>
              <Typography variant="body2">
                {currentUser?.email}
              </Typography>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              {t('auth.logout')}
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* モバイル用ドロワー */}
      <Box component="nav" sx={{ display: { xs: 'block', sm: 'none' } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            ...drawerStyles,
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              overflowX: 'hidden',
            },
          }}
        >
          {/* ドロワーの内容 */}
          {renderDrawerContent()}
        </Drawer>
      </Box>

      {/* デスクトップ用ドロワー */}
      <Box component="nav" sx={{ display: { xs: 'none', sm: 'block' } }}>
        <Drawer
          variant="permanent"
          open={drawerOpen}
          sx={drawerStyles}
        >
          {/* ドロワーの内容 */}
          {renderDrawerContent()}
        </Drawer>
      </Box>

      {/* メインコンテンツ */}
      <Box
        component="main"
        ref={contentRef}
        sx={{
          flexGrow: 1,
          p: 2, // パディングを小さく
          transition: theme.transitions.create('margin', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          height: '100%',
          overflow: 'auto',
          pt: { xs: 6, sm: 6 }, // 上部余白を小さく
          display: 'flex',
          flexDirection: 'column',
          position: 'relative', // ローディングオーバーレイのための相対位置設定
        }}
      >
        {/* コンテンツローディングオーバーレイ */}
        {contentLoading && (
          <Box sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: alpha(theme.palette.background.paper, 0.7),
            zIndex: 10,
            backdropFilter: 'blur(3px)',
          }}>
            <CircularProgress />
          </Box>
        )}
        
        {children}
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
