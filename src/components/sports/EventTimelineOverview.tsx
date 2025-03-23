import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Chip,
  Paper,
  Grid,
  useTheme,
  useMediaQuery,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Schedule as ScheduleIcon,
  SportsSoccer as SportIcon,
  Event as EventIcon,
  Restaurant as LunchIcon,
  Coffee as BreakIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { Sport, TimeSlot, Event } from '../../types';
import { useNavigate } from 'react-router-dom';
import { timeToMinutes } from '../../utils/scheduleGenerator';
import ScheduleTimeline from './ScheduleTimeline';

interface EventTimelineOverviewProps {
  sports: Sport[];
  activeEvent?: Event | null;
}

const EventTimelineOverview: React.FC<EventTimelineOverviewProps> = ({ sports, activeEvent }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [expanded, setExpanded] = useState<string | false>(false);
  const [activeSports, setActiveSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(true);

  // スポーツ一覧データを処理
  useEffect(() => {
    setLoading(true);
    
    const sportsWithSchedule = sports.filter(
      sport => sport.scheduleSettings?.timeSlots && sport.scheduleSettings.timeSlots.length > 0
    );
    
    // 開始時間順にソート
    const sortedSports = [...sportsWithSchedule].sort((a, b) => {
      const aStart = a.scheduleSettings?.startTime || '00:00';
      const bStart = b.scheduleSettings?.startTime || '00:00';
      return timeToMinutes(aStart) - timeToMinutes(bStart);
    });
    
    setActiveSports(sortedSports);
    setLoading(false);
  }, [sports]);

  // アコーディオンの開閉を管理
  const handleChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  // スポーツのタイムスロット分布を簡略表示するための関数
  const renderTimeDistribution = (sport: Sport) => {
    if (!sport.scheduleSettings?.timeSlots) return null;
    
    const timeSlots = sport.scheduleSettings.timeSlots;
    const startTime = sport.scheduleSettings.startTime;
    const endTime = sport.scheduleSettings.endTime;
    
    const totalDurationMinutes = timeToMinutes(endTime) - timeToMinutes(startTime);
    
    // 時間枠タイプごとのカウント
    const counts = {
      match: timeSlots.filter(slot => slot.type === 'match').length,
      break: timeSlots.filter(slot => slot.type === 'break').length,
      lunch: timeSlots.filter(slot => slot.type === 'lunch').length,
      other: timeSlots.filter(slot => !['match', 'break', 'lunch'].includes(slot.type)).length
    };

    return (
      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        {counts.match > 0 && (
          <Chip 
            icon={<SportIcon fontSize="small" />} 
            label={`${counts.match}${t('schedule.matchCount')}`} 
            size="small" 
            color="primary"
            variant="outlined"
          />
        )}
        {counts.break > 0 && (
          <Chip 
            icon={<BreakIcon fontSize="small" />} 
            label={`${counts.break}${t('schedule.breakCount')}`} 
            size="small" 
            color="secondary"
            variant="outlined"
          />
        )}
        {counts.lunch > 0 && (
          <Chip 
            icon={<LunchIcon fontSize="small" />} 
            label={t('schedule.lunch')} 
            size="small" 
            color="warning"
            variant="outlined"
          />
        )}
      </Box>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (activeSports.length === 0) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        {t('schedule.noSportsWithSchedule')}
      </Alert>
    );
  }

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h5" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
        <EventIcon sx={{ mr: 1 }} />
        {activeEvent?.name ? `${activeEvent.name} ${t('schedule.overview')}` : t('schedule.eventSchedule')}
      </Typography>
      
      <Typography variant="body2" color="text.secondary" paragraph>
        {t('schedule.clickToExpand')}
      </Typography>
      
      <Divider sx={{ mb: 3 }} />
      
      {/* スポーツ一覧とタイムライン */}
      <Box>
        {activeSports.map((sport) => (
          <Accordion
            key={sport.id}
            expanded={expanded === `sport-${sport.id}`}
            onChange={handleChange(`sport-${sport.id}`)}
            sx={{ 
              mb: 1,
              transition: 'all 0.2s ease',
              ':hover': {
                bgcolor: theme.palette.action.hover
              }
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls={`sport-${sport.id}-content`}
              id={`sport-${sport.id}-header`}
            >
              <Grid container alignItems="center" spacing={1}>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <SportIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                      {sport.name}
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={3}>
                  <Typography variant="body2" color="text.secondary">
                    {sport.scheduleSettings?.startTime} - {sport.scheduleSettings?.endTime}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={5}>
                  {renderTimeDistribution(sport)}
                </Grid>
              </Grid>
            </AccordionSummary>
            
            <AccordionDetails sx={{ p: isMobile ? 1 : 2 }}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <ScheduleTimeline sport={sport} />
                
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                  <Chip
                    label={t('schedule.viewDetails')}
                    color="primary" 
                    onClick={() => navigate(`/sport/${sport.id}`)}
                    clickable
                  />
                </Box>
              </Paper>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>
    </Box>
  );
};

export default EventTimelineOverview;
