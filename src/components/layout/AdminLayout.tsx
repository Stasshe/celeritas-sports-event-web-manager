import React, { useState, useEffect } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Collapse,
  Divider,
  Button,
  Snackbar,
  Alert,
  Tooltip,
  useTheme,
  Badge,
  Menu,
  MenuItem,
  Avatar,
  CircularProgress
} from '@mui/material';
import {
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Event as EventIcon,
  SportsSoccer as SportIcon,
  Settings as SettingsIcon,
  Dashboard as DashboardIcon,
  Help as HelpIcon,
  Add as AddIcon,
  Save as SaveIcon,
  Check as CheckIcon,
  Warning as WarningIcon,
  Person as PersonIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon
} from '@mui/icons-material';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useThemeContext } from '../../contexts/ThemeContext';
import { useDatabase } from '../../hooks/useDatabase';
import { Event, Sport } from '../../types';
import CreateEventDialog from '../admin/dialogs/CreateEventDialog';
import CreateSportDialog from '../admin/dialogs/CreateSportDialog';

const drawerWidth = 280;

// 型定義を明示的に追加
interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { mode, toggleColorMode, alpha } = useThemeContext();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout } = useAuth();
  
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // ユーザーメニュー
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  
  // イベント展開状態
  const [expandedEventIds, setExpandedEventIds] = useState<string[]>([]);
  
  // ダイアログ
  const [createEventDialog, setCreateEventDialog] = useState(false);
  const [createSportDialog, setCreateSportDialog] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  
  // データ取得
  const { data: events, loading: eventsLoading } = useDatabase<Record<string, Event>>('/events');
  const { data: sports, loading: sportsLoading } = useDatabase<Record<string, Sport>>('/sports');
  
  // 現在のパスに基づいてアクティブなメニューを設定
  useEffect(() => {
    if (location.pathname.includes('/admin/events/') && events) {
      const eventId = location.pathname.split('/').pop();
      if (eventId && events[eventId]) {
        setExpandedEventIds(prev => 
          prev.includes(eventId) ? prev : [...prev, eventId]
        );
      }
    }
  }, [location.pathname, events]);
  
  // 自動保存シミュレーション（実際の実装ではAPIレスポンスなどに基づいて更新される）
  const simulateAutoSave = () => {
    if (Math.random() > 0.8) {
      // エラーをシミュレート (20%の確率)
      setSavingStatus('error');
      setHasUnsavedChanges(true);
    } else {
      // 成功をシミュレート
      setSavingStatus('saved');
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
    }
  };
  
  // 手動保存
  const handleManualSave = () => {
    setSavingStatus('saving');
    
    // 保存処理のシミュレーション
    setTimeout(() => {
      simulateAutoSave();
    }, 800);
  };
  
  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };
  
  const handleEventClick = (eventId: string) => {
    if (expandedEventIds.includes(eventId)) {
      setExpandedEventIds(expandedEventIds.filter(id => id !== eventId));
    } else {
      setExpandedEventIds([...expandedEventIds, eventId]);
    }
    
    navigate(`/admin/events/${eventId}`);
  };
  
  const handleSportClick = (sportId: string) => {
    navigate(`/admin/sports/${sportId}`);
  };
  
  const handleCreateEvent = () => {
    setCreateEventDialog(true);
  };
  
  const handleCreateSport = (eventId: string) => {
    setSelectedEventId(eventId);
    setCreateSportDialog(true);
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

  // アクティブなイベントを取得
  const activeEvent = events ? Object.values(events).find(event => event.isActive) : null;
  
  // イベントごとの競技リストを取得
  const getSportsByEventId = (eventId: string) => {
    if (!sports) return [];
    return Object.values(sports).filter(sport => sport.eventId === eventId);
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* アプリバー */}
      <AppBar
        position="fixed"
        sx={{
          zIndex: theme.zIndex.drawer + 1,
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerToggle}
            edge="start"
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {t('admin.title')}
          </Typography>
          
          {/* 保存状態と保存ボタン */}
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
            {hasUnsavedChanges ? (
              <Tooltip title={t('admin.unsavedChanges')}>
                <Badge color="warning" variant="dot">
                  <WarningIcon color="warning" sx={{ mr: 1 }} />
                </Badge>
              </Tooltip>
            ) : (
              lastSaved && (
                <Tooltip title={`${t('admin.lastSaved')}: ${lastSaved.toLocaleTimeString()}`}>
                  <CheckIcon color="success" sx={{ mr: 1 }} />
                </Tooltip>
              )
            )}
            
            <Button
              variant="outlined"
              startIcon={savingStatus === 'saving' ? <CircularProgress size={16} /> : <SaveIcon />}
              onClick={handleManualSave}
              disabled={savingStatus === 'saving'}
              color="inherit"
              size="small"
              sx={{ borderColor: 'rgba(255,255,255,0.5)', color: 'white' }}
            >
              {savingStatus === 'saving' ? t('admin.saving') : t('admin.save')}
            </Button>
          </Box>
          
          {/* テーマ切り替えボタン */}
          <Tooltip title={mode === 'light' ? t('admin.darkMode') : t('admin.lightMode')}>
            <IconButton onClick={toggleColorMode} color="inherit">
              {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
            </IconButton>
          </Tooltip>
          
          {/* 設定ボタン */}
          <Tooltip title={t('admin.settings')}>
            <IconButton color="inherit" onClick={() => navigate('/admin/settings')}>
              <SettingsIcon />
            </IconButton>
          </Tooltip>
          
          {/* ユーザーアバター */}
          <IconButton
            onClick={handleUserMenuOpen}
            size="small"
            sx={{ ml: 1 }}
            aria-controls="menu-appbar"
            aria-haspopup="true"
          >
            <Avatar sx={{ width: 32, height: 32, bgcolor: theme.palette.primary.dark }}>
              <PersonIcon />
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
              <Typography variant="body2">{currentUser?.email}</Typography>
            </MenuItem>
            <Divider />
            <MenuItem onClick={() => {
              handleUserMenuClose();
              navigate('/admin/settings');
            }}>
              <ListItemIcon>
                <SettingsIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary={t('admin.settings')} />
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <SettingsIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary={t('auth.logout')} />
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      
      {/* サイドバー */}
      <Drawer
        variant="persistent"
        anchor="left"
        open={drawerOpen}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          whiteSpace: 'nowrap',
          boxSizing: 'border-box',
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            overflowX: 'hidden',
            transition: theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
          },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto' }}>
          <List>
            {/* ダッシュボード */}
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => navigate('/admin')}
                selected={location.pathname === '/admin'}
              >
                <ListItemIcon>
                  <DashboardIcon />
                </ListItemIcon>
                <ListItemText primary={t('admin.dashboard')} />
              </ListItemButton>
            </ListItem>
            
            {/* イベント一覧のヘッダー */}
            <ListItem
              sx={{ 
                bgcolor: theme.palette.background.default,
                mt: 1
              }}
            >
              <ListItemText 
                primary={<Typography variant="subtitle2" color="text.secondary">{t('admin.events')}</Typography>}
              />
              <Tooltip title={t('admin.createEvent')}>
                <IconButton edge="end" onClick={handleCreateEvent} size="small">
                  <AddIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </ListItem>
            
            {/* イベントリスト */}
            {eventsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                <CircularProgress size={24} />
              </Box>
            ) : events && Object.values(events).length > 0 ? (
              Object.values(events).map((event) => (
                <React.Fragment key={event.id}>
                  <ListItemButton
                    onClick={() => handleEventClick(event.id)}
                    selected={location.pathname === `/admin/events/${event.id}`}
                    sx={{ 
                      pl: 2,
                      bgcolor: event.isActive ? alpha(theme.palette.primary.main, 0.1) : 'transparent'
                    }}
                  >
                    <ListItemIcon>
                      <EventIcon color={event.isActive ? "primary" : "inherit"} />
                    </ListItemIcon>
                    <ListItemText primary={event.name} />
                    {expandedEventIds.includes(event.id) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </ListItemButton>
                  
                  {/* 展開時に表示される競技リスト */}
                  <Collapse in={expandedEventIds.includes(event.id)} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                      {sportsLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 1 }}>
                          <CircularProgress size={20} />
                        </Box>
                      ) : (
                        getSportsByEventId(event.id).map(sport => (
                          <ListItemButton
                            key={sport.id}
                            sx={{ pl: 4 }}
                            onClick={() => handleSportClick(sport.id)}
                            selected={location.pathname === `/admin/sports/${sport.id}`}
                          >
                            <ListItemIcon>
                              <SportIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText primary={sport.name} />
                          </ListItemButton>
                        ))
                      )}
                      
                      {/* 競技追加ボタン */}
                      <ListItemButton
                        sx={{ pl: 4 }}
                        onClick={() => handleCreateSport(event.id)}
                      >
                        <ListItemIcon>
                          <AddIcon fontSize="small" color="primary" />
                        </ListItemIcon>
                        <ListItemText 
                          primary={
                            <Typography variant="body2" color="primary">
                              {t('admin.addSport')}
                            </Typography>
                          }
                        />
                      </ListItemButton>
                    </List>
                  </Collapse>
                </React.Fragment>
              ))
            ) : (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  {t('admin.noEvents')}
                </Typography>
                <Button
                  startIcon={<AddIcon />}
                  onClick={handleCreateEvent}
                  size="small"
                  sx={{ mt: 1 }}
                >
                  {t('admin.createEvent')}
                </Button>
              </Box>
            )}
          </List>
          
          <Divider sx={{ my: 2 }} />
          
          {/* その他のメニュー */}
          <List>
            <ListItemButton onClick={() => navigate('/admin/settings')}>
              <ListItemIcon>
                <SettingsIcon />
              </ListItemIcon>
              <ListItemText primary={t('admin.settings')} />
            </ListItemButton>
            <ListItemButton onClick={() => navigate('/admin/help')}>
              <ListItemIcon>
                <HelpIcon />
              </ListItemIcon>
              <ListItemText primary={t('admin.help')} />
            </ListItemButton>
          </List>
        </Box>
      </Drawer>
      
      {/* メインコンテンツ */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: `calc(100% - ${drawerOpen ? drawerWidth : 0}px)`,
          ml: `${drawerOpen ? drawerWidth : 0}px`,
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          height: '100vh',
          overflow: 'auto',
          pt: { xs: 8, sm: 10 }
        }}
      >
        {children}
      </Box>
      
      {/* スナックバー */}
      <Snackbar
        open={savingStatus === 'saved' || savingStatus === 'error'}
        autoHideDuration={3000}
        onClose={() => setSavingStatus('idle')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          severity={savingStatus === 'saved' ? 'success' : 'error'}
          sx={{ width: '100%' }}
        >
          {savingStatus === 'saved' 
            ? t('admin.saveSuccess')
            : t('admin.saveError')
          }
        </Alert>
      </Snackbar>
      
      {/* ダイアログ */}
      <CreateEventDialog
        open={createEventDialog}
        onClose={() => setCreateEventDialog(false)}
        onSuccess={() => {
          setCreateEventDialog(false);
          setLastSaved(new Date());
        }}
      />
      
      <CreateSportDialog
        open={createSportDialog}
        onClose={() => setCreateSportDialog(false)}
        onSuccess={(sportId: string) => {
          setCreateSportDialog(false);
          setLastSaved(new Date());
          navigate(`/admin/sports/${sportId}`);
        }}
        eventId={selectedEventId}
      />
    </Box>
  );
};

export default AdminLayout;
