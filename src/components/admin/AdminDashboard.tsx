import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  useTheme
} from '@mui/material';
import {
  Event as EventIcon,
  SportsSoccer as SportIcon,
  Check as CheckIcon,
  Add as AddIcon,
  Error as ErrorIcon,
  Help as HelpIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useDatabase } from '../../hooks/useDatabase';
import { Event, Sport } from '../../types';
import { motion } from 'framer-motion';
import CreateEventDialog from './dialogs/CreateEventDialog';
import { useThemeContext } from '../../contexts/ThemeContext';

const MotionCard = motion(Card);
const MotionPaper = motion(Paper);

const AdminDashboard: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { alpha } = useThemeContext();
  const navigate = useNavigate();
  const { data: events, loading: eventsLoading, updateData: updateEvent } = useDatabase<Record<string, Event>>('/events');
  const { data: sports, loading: sportsLoading } = useDatabase<Record<string, Sport>>('/sports');
  
  const [activeEvent, setActiveEvent] = useState<Event | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  
  // アクティブなイベントを探す
  useEffect(() => {
    if (events) {
      const active = Object.values(events).find(event => event.isActive);
      setActiveEvent(active || null);
    }
  }, [events]);

  const handleSetActiveEvent = async (eventId: string) => {
    if (!events) return;
    
    try {
      // 全てのイベントを非アクティブにし、選択されたものだけアクティブに
      const updatedEvents = Object.entries(events).reduce((acc, [id, event]) => {
        acc[id] = {
          ...event,
          isActive: id === eventId
        };
        return acc;
      }, {} as Record<string, Event>);
      
      await updateEvent(updatedEvents);
      setLastSaved(new Date());
      setUnsavedChanges(false);
    } catch (error) {
      console.error('Error updating active event:', error);
      setUnsavedChanges(true);
    }
  };

  const handleOpenEventDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseEventDialog = () => {
    setOpenDialog(false);
  };
  
  const handleCreateEventSuccess = () => {
    setLastSaved(new Date());
    setUnsavedChanges(false);
  };

  const goToEventDetails = (eventId: string) => {
    navigate(`/admin/events/${eventId}`);
  };

  const goToHelp = () => {
    navigate('/admin/help');
  };

  // イベント別の競技数をカウント
  const getSportCountByEvent = (eventId: string) => {
    if (!sports) return 0;
    return Object.values(sports).filter(sport => sport.eventId === eventId).length;
  };

  if (eventsLoading || sportsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  const eventsList = events ? Object.values(events) : [];

  return (
    <Box sx={{ height: '100%' }}>
      <Typography variant="h5" gutterBottom>
        {t('admin.dashboard')}
      </Typography>

      <Grid container spacing={3}>
        {/* アクティブイベント情報 */}
        <Grid item xs={12} md={6}>
          <MotionCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            elevation={3}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CheckIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="h6">
                  {t('admin.activeEvent')}
                </Typography>
              </Box>
              
              {activeEvent ? (
                <Box>
                  <Typography variant="h5" gutterBottom>
                    {activeEvent.name}
                  </Typography>
                  <Typography variant="body1" color="text.secondary" gutterBottom>
                    {new Date(activeEvent.date).toLocaleDateString()}
                  </Typography>
                  <Typography variant="body2">
                    {activeEvent.description}
                  </Typography>
                  
                  <Box sx={{ mt: 2 }}>
                    <Chip 
                      icon={<SportIcon />} 
                      label={t('admin.sportCount', { count: getSportCountByEvent(activeEvent.id) })} 
                      color="primary" 
                      size="small"
                      sx={{ mr: 1 }}
                    />
                    <Chip 
                      icon={<EventIcon />} 
                      label={t('admin.active')}
                      color="success" 
                      size="small" 
                    />
                  </Box>
                </Box>
              ) : (
                <Alert severity="warning">
                  {t('admin.noActiveEvent')}
                </Alert>
              )}
            </CardContent>
            {activeEvent && (
              <CardActions>
                <Button 
                  size="small" 
                  color="primary" 
                  onClick={() => goToEventDetails(activeEvent.id)}
                >
                  {t('admin.manageEvent')}
                </Button>
              </CardActions>
            )}
          </MotionCard>
        </Grid>

        {/* クイックアクション */}
        <Grid item xs={12} md={6}>
          <MotionPaper
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.3 }}
            elevation={3}
            sx={{ p: 3, height: '100%' }}
          >
            <Typography variant="h6" gutterBottom>
              {t('admin.quickActions')}
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Button 
                  variant="contained" 
                  color="primary" 
                  fullWidth 
                  startIcon={<AddIcon />}
                  onClick={handleOpenEventDialog}
                >
                  {t('admin.createEvent')}
                </Button>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Button 
                  variant="outlined" 
                  color="secondary" 
                  fullWidth 
                  startIcon={<SportIcon />}
                  onClick={() => navigate('/admin/sports/new')}
                  disabled={!activeEvent}
                >
                  {t('admin.createSport')}
                </Button>
              </Grid>
              <Grid item xs={12}>
                <Button 
                  variant="outlined" 
                  color="info" 
                  fullWidth 
                  startIcon={<HelpIcon />}
                  onClick={goToHelp}
                >
                  {t('admin.viewHelp')}
                </Button>
              </Grid>
            </Grid>
          </MotionPaper>
        </Grid>

        {/* 行事一覧 */}
        <Grid item xs={12}>
          <MotionPaper
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            elevation={3}
            sx={{ p: 3 }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                {t('admin.eventList')}
              </Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={<AddIcon />}
                onClick={handleOpenEventDialog}
              >
                {t('admin.createEvent')}
              </Button>
            </Box>
            <Divider sx={{ mb: 2 }} />
            
            {eventsList.length > 0 ? (
              <List>
                {eventsList.map((event) => (
                  <ListItem
                    key={event.id}
                    secondaryAction={
                      <Box>
                        {event.isActive ? (
                          <Chip 
                            label={t('admin.active')} 
                            color="success" 
                            size="small" 
                          />
                        ) : (
                          <Button 
                            size="small" 
                            variant="outlined" 
                            onClick={() => handleSetActiveEvent(event.id)}
                          >
                            {t('admin.setActive')}
                          </Button>
                        )}
                        <IconButton 
                          edge="end" 
                          onClick={() => goToEventDetails(event.id)} 
                          sx={{ ml: 1 }}
                        >
                          <EventIcon />
                        </IconButton>
                      </Box>
                    }
                    sx={{ 
                      borderRadius: 1,
                      mb: 1,
                      bgcolor: event.isActive ? alpha(theme.palette.success.light, 0.1) : 'transparent',
                      '&:hover': {
                        bgcolor: event.isActive ? alpha(theme.palette.success.light, 0.2) : theme.palette.action.hover,
                      }
                    }}
                    onClick={() => goToEventDetails(event.id)}
                  >
                    <ListItemIcon>
                      <EventIcon color={event.isActive ? "success" : "inherit"} />
                    </ListItemIcon>
                    <ListItemText
                      primary={event.name}
                      secondary={`${new Date(event.date).toLocaleDateString()} - ${getSportCountByEvent(event.id)} ${t('admin.sports')}`}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Alert severity="info">
                {t('admin.noEvents')}
              </Alert>
            )}
          </MotionPaper>
        </Grid>
      </Grid>
      
      {/* 変更状態表示 */}
      <Box 
        sx={{ 
          position: 'fixed',
          bottom: 16,
          left: 16,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          bgcolor: unsavedChanges ? alpha(theme.palette.warning.light, 0.9) : alpha(theme.palette.success.light, 0.9),
          color: unsavedChanges ? theme.palette.warning.contrastText : theme.palette.success.contrastText,
          borderRadius: 2,
          p: 1,
          boxShadow: 3
        }}
      >
        {unsavedChanges ? (
          <ErrorIcon sx={{ mr: 1 }} />
        ) : (
          <CheckIcon sx={{ mr: 1 }} />
        )}
        <Typography variant="body2">
          {unsavedChanges 
            ? t('admin.unsavedChanges')
            : lastSaved 
              ? `${t('admin.lastSaved')}: ${lastSaved.toLocaleTimeString()}`
              : t('admin.allChangesSaved')
          }
        </Typography>
      </Box>
      
      {/* 行事作成ダイアログ */}
      <CreateEventDialog 
        open={openDialog} 
        onClose={handleCloseEventDialog}
        onSuccess={handleCreateEventSuccess}
      />
    </Box>
  );
};

export default AdminDashboard;
