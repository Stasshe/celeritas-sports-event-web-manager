import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Grid,
  Divider,
  useTheme
} from '@mui/material';
import { Schedule as ScheduleIcon, Place as PlaceIcon } from '@mui/icons-material';
import { Sport, Event, TimeSlot } from '../../types';
import { useTranslation } from 'react-i18next';

interface EventTimelineOverviewProps {
  sports: Sport[];
  activeEvent: Event | null;
}

// 全競技の統合タイムスロット
interface CombinedTimeSlot extends TimeSlot {
  sportId: string;
  sportName: string;
}

const EventTimelineOverview: React.FC<EventTimelineOverviewProps> = ({ sports, activeEvent }) => {
  const { t } = useTranslation();
  const theme = useTheme();

  // 全競技のタイムスロットを結合して時間順にソート
  const combinedTimeSlots = useMemo(() => {
    const allSlots: CombinedTimeSlot[] = [];
    
    sports.forEach(sport => {
      if (sport.scheduleSettings?.timeSlots) {
        sport.scheduleSettings.timeSlots.forEach(slot => {
          allSlots.push({
            ...slot,
            sportId: sport.id,
            sportName: sport.name
          });
        });
      }
    });
    
    // 開始時間でソート
    return allSlots.sort((a, b) => {
      // 日付部分を無視して時間だけで比較
      const timeA = a.startTime;
      const timeB = b.startTime;
      return timeA.localeCompare(timeB);
    });
  }, [sports]);

  // 会場に応じた色を取得
  const getVenueColor = (venueId: 'main' | 'secondary' | undefined) => {
    if (!venueId || venueId === 'main') {
      return theme.palette.primary.main;
    }
    return theme.palette.secondary.main;
  };

  if (combinedTimeSlots.length === 0) {
    return (
      <Paper sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          {t('schedule.noScheduleAvailable')}
        </Typography>
      </Paper>
    );
  }

  // 時間枠ごとに同時開催イベントをグループ化
  const groupedByTime: Record<string, CombinedTimeSlot[]> = {};
  
  combinedTimeSlots.forEach(slot => {
    const timeKey = `${slot.startTime}-${slot.endTime}`;
    if (!groupedByTime[timeKey]) {
      groupedByTime[timeKey] = [];
    }
    groupedByTime[timeKey].push(slot);
  });

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
        <ScheduleIcon sx={{ mr: 1 }} />
        {t('schedule.eventTimeline')}
      </Typography>
      
      <Divider sx={{ my: 2 }} />
      
      {Object.entries(groupedByTime).map(([timeKey, slots], groupIndex) => {
        const [startTime, endTime] = timeKey.split('-');
        const isConcurrent = slots.length > 1;
        
        return (
          <Paper 
            key={timeKey} 
            sx={{ 
              p: 2, 
              mb: 2, 
              borderLeft: isConcurrent 
                ? `4px solid ${theme.palette.warning.main}` 
                : `4px solid ${getVenueColor(slots[0].venueId)}`
            }}
          >
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle1" fontWeight="medium">
                    {startTime} - {endTime}
                  </Typography>
                  
                  {isConcurrent && (
                    <Chip 
                      size="small" 
                      label={t('schedule.concurrent', { count: slots.length })} 
                      color="warning"
                      variant="outlined"
                    />
                  )}
                </Box>
              </Grid>
              
              {slots.map((slot, index) => (
                <Grid item xs={12} key={`${slot.sportId}-${index}`}>
                  <Box 
                    sx={{ 
                      p: 1.5, 
                      borderLeft: `4px solid ${theme.palette.info.main}`,
                      bgcolor: theme.palette.action.hover,
                      borderRadius: 1
                    }}
                  >
                    <Typography variant="body1" fontWeight="medium" gutterBottom>
                      {slot.sportName} - {slot.type === 'match' ? t('schedule.match') : slot.title || t(`schedule.${slot.type}`)}
                    </Typography>
                    
                    {slot.description && (
                      <Typography variant="body2" color="text.secondary">
                        {slot.description}
                      </Typography>
                    )}
                    
                    {slot.venueId && (
                      <Box sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
                        <PlaceIcon sx={{ fontSize: 16, mr: 0.5, color: getVenueColor(slot.venueId) }} />
                        <Typography variant="caption" color="text.secondary">
                          {slot.venueName || (slot.venueId === 'main' ? t('schedule.mainVenue') : t('schedule.secondaryVenue'))}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Paper>
        );
      })}
    </Box>
  );
};

export default EventTimelineOverview;
