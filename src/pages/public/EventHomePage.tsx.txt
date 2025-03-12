import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Chip,
  Divider,
  Button,
  CircularProgress,
  useTheme,
  IconButton,
  Avatar
} from '@mui/material';
import {
  SportsSoccer as SportIcon,
  Event as EventIcon,
  ArrowForward as ArrowIcon,
  EmojiEvents as TournamentIcon,
  Repeat as RoundRobinIcon,
  ViewList as CustomIcon,
  People as OrganizerIcon,
  Share as ShareIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useDatabase } from '../../hooks/useDatabase';
import { Event, Sport, Organizer } from '../../types';
import { motion } from 'framer-motion';
import { useThemeContext } from '../../contexts/ThemeContext';

const MotionCard = motion(Card);
const MotionBox = motion(Box);

const EventHomePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme();
  const { alpha } = useThemeContext();
  
  const { data: events, loading: eventsLoading } = useDatabase<Record<string, Event>>('/events');
  const { data: sports, loading: sportsLoading } = useDatabase<Record<string, Sport>>('/sports');
  
  const [activeEvent, setActiveEvent] = useState<Event | null>(null);
  const [eventSports, setEventSports] = useState<Sport[]>([]);
  
  // アクティブイベントを探す
  useEffect(() => {
    if (events) {
      const active = Object.values(events).find(event => event.isActive);
      setActiveEvent(active || null);
    }
  }, [events]);
  
  // アクティブイベントの競技を絞り込む
  useEffect(() => {
    if (activeEvent && sports) {
      const filteredSports = Object.values(sports).filter(
        sport => sport.eventId === activeEvent.id
      );
      setEventSports(filteredSports);
    } else {
      setEventSports([]);
    }
  }, [activeEvent, sports]);
  
  const handleSportClick = (sportId: string) => {
    navigate(`/sports/${sportId}`);
  };
  
  const handleShareEvent = async () => {
    if (!activeEvent) return;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: activeEvent.name,
          text: activeEvent.description,
          url: window.location.href
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // シェア機能が利用できない場合はURLをコピー
      navigator.clipboard.writeText(window.location.href);
      // TODO: コピー成功通知を表示
    }
  };
  
  // 競技タイプに応じたアイコンを返す
  const getSportTypeIcon = (type: string) => {
    switch (type) {
      case 'tournament':
        return <TournamentIcon />;
      case 'roundRobin':
        return <RoundRobinIcon />;
      case 'custom':
        return <CustomIcon />;
      default:
        return <SportIcon />;
    }
  };
  
  // 競技タイプに応じた色を返す
  const getSportTypeColor = (type: string): "primary" | "secondary" | "default" => {
    switch (type) {
      case 'tournament':
        return 'primary';
      case 'roundRobin':
        return 'secondary';
      default:
        return 'default';
    }
  };
  
  // 日付をフォーマット
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    });
  };
  
  // リーダーの情報を抽出
  const getEventLeaders = (organizers: Organizer[]) => {
    return organizers.filter(org => org.role === 'leader');
  };

  if (eventsLoading || sportsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!activeEvent) {
    return (
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <MotionBox
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Typography variant="h4" gutterBottom>
            {t('home.noActiveEvent')}
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            {t('home.noActiveEventDescription')}
          </Typography>
        </MotionBox>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      {/* イベントヘッダー */}
      <Box
        sx={{
          mb: 6,
          pb: 2,
          borderBottom: `1px solid ${theme.palette.divider}`,
          position: 'relative'
        }}
      >
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={8}>
            <MotionBox
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Typography
                variant="h3"
                component="h1"
                gutterBottom
                sx={{ 
                  fontWeight: 'bold',
                  backgroundImage: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  backgroundClip: 'text',
                  color: 'transparent',
                  WebkitBackgroundClip: 'text',
                  display: { xs: 'block', sm: 'inline-block' }
                }}
              >
                {activeEvent.name}
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                <Chip 
                  icon={<EventIcon />} 
                  label={formatDate(activeEvent.date)}
                  color="primary"
                  variant="outlined"
                  size="small"
                />
                
                {activeEvent.alternativeDate && (
                  <Chip 
                    label={`${t('event.alternativeDate')}: ${formatDate(activeEvent.alternativeDate)}`}
                    size="small"
                    color="default"
                  />
                )}
                
                <Chip 
                  icon={<SportIcon />} 
                  label={t('home.sportCount', { count: eventSports.length })}
                  size="small"
                />
              </Box>
              
              {activeEvent.description && (
                <Typography variant="body1" paragraph>
                  {activeEvent.description}
                </Typography>
              )}
            </MotionBox>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <MotionBox
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <Paper elevation={2} sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="subtitle1" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                  <OrganizerIcon sx={{ mr: 1, fontSize: '0.9em' }} />
                  {t('event.organizers')}
                </Typography>
                
                {activeEvent.organizers && activeEvent.organizers.length > 0 ? (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {getEventLeaders(activeEvent.organizers).map((leader, index) => (
                      <Chip
                        key={leader.id}
                        label={`${leader.name} (${leader.grade}${t('event.gradeUnit')})`}
                        size="small"
                        color="primary"
                      />
                    ))}
                    {activeEvent.organizers
                      .filter(org => org.role !== 'leader')
                      .map((member, index) => (
                        <Chip
                          key={member.id}
                          label={`${member.name} (${member.grade}${t('event.gradeUnit')})`}
                          size="small"
                        />
                      ))
                    }
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    {t('event.noOrganizers')}
                  </Typography>
                )}
                
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    endIcon={<ShareIcon />}
                    onClick={handleShareEvent}
                    size="small"
                  >
                    {t('common.share')}
                  </Button>
                </Box>
              </Paper>
            </MotionBox>
          </Grid>
        </Grid>
      </Box>
      
      {/* 競技一覧 */}
      <Typography variant="h5" gutterBottom>
        {t('home.allSports')}
      </Typography>
      
      {eventSports.length > 0 ? (
        <Grid container spacing={3}>
          {eventSports.map((sport, index) => (
            <Grid item xs={12} sm={6} md={4} key={sport.id}>
              <MotionCard
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                elevation={3}
                sx={{ height: '100%' }}
              >
                <CardActionArea 
                  onClick={() => handleSportClick(sport.id)} 
                  sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Typography variant="h6" component="h2" gutterBottom>
                        {sport.name}
                      </Typography>
                      <Chip 
                        icon={getSportTypeIcon(sport.type)} 
                        label={t(`sport.${sport.type}`)}
                        size="small"
                        color={getSportTypeColor(sport.type)}
                        sx={{ mb: 1 }}
                      />
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {sport.description || t(`sport.${sport.type}Description`) || ''}
                    </Typography>
                    
                    <Divider sx={{ my: 1 }} />
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        {t('sport.teamCount', { count: sport.teams?.length || 0 })}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="body2">
                          {t('common.viewDetails')}
                        </Typography>
                        <ArrowIcon fontSize="small" sx={{ ml: 0.5 }} />
                      </Box>
                    </Box>
                  </CardContent>
                </CardActionArea>
              </MotionCard>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            {t('home.noSports')}
          </Typography>
        </Paper>
      )}
    </Container>
  );
};

export default EventHomePage;
