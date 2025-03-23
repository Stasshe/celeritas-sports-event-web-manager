import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Divider,
  useMediaQuery,
  useTheme,
  Grid,
  Alert
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Schedule as ScheduleIcon,
  SportsSoccer as SportsIcon,
  Restaurant as LunchIcon,
  Coffee as BreakIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { Sport, TimeSlot, Match } from '../../types';

interface ScheduleTimelineProps {
  sport: Sport;
}

const ScheduleTimeline: React.FC<ScheduleTimelineProps> = ({ sport }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [expanded, setExpanded] = useState<string | false>(false);

  // アコーディオンの開閉を管理
  const handleChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  // スケジュール設定がない場合
  if (!sport.scheduleSettings || !sport.scheduleSettings.timeSlots || sport.scheduleSettings.timeSlots.length === 0) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        {t('schedule.noScheduleAvailable')}
      </Alert>
    );
  }

  // チーム名を取得する関数
  const getTeamName = (teamId: string): string => {
    const team = sport.teams.find(t => t.id === teamId);
    return team ? team.name : t('schedule.unknownTeam');
  };

  // 試合情報を取得する関数
  const getMatchInfo = (matchId: string): Match | undefined => {
    return sport.matches.find(m => m.id === matchId);
  };

  // 時間枠の種類に応じたアイコンを取得
  const getTypeIcon = (type: TimeSlot['type']) => {
    switch (type) {
      case 'match':
        return <SportsIcon />;
      case 'break':
        return <BreakIcon />;
      case 'lunch':
        return <LunchIcon />;
      default:
        return <ScheduleIcon />;
    }
  };

  // 時間枠の種類に応じた色を取得
  const getTypeColor = (type: TimeSlot['type']) => {
    switch (type) {
      case 'match':
        return theme.palette.primary.main;
      case 'break':
        return theme.palette.secondary.main;
      case 'lunch':
        return theme.palette.warning.main;
      case 'preparation':
        return theme.palette.info.main;
      case 'cleanup':
        return theme.palette.error.main;
      default:
        return theme.palette.text.secondary;
    }
  };

  // タイムスロットをグループ化（時間帯ごと）
  const groupSlotsByHour = () => {
    const grouped: { [key: string]: TimeSlot[] } = {};
    
    sport.scheduleSettings!.timeSlots!.forEach(slot => {
      const hour = slot.startTime.split(':')[0];
      if (!grouped[hour]) {
        grouped[hour] = [];
      }
      grouped[hour].push(slot);
    });
    
    return Object.entries(grouped).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
  };

  const groupedSlots = groupSlotsByHour();

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
        <ScheduleIcon sx={{ mr: 1 }} />
        {t('schedule.timeline')}
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {t('schedule.timeRange')}: {sport.scheduleSettings.startTime} - {sport.scheduleSettings.endTime}
      </Typography>
      
      <Divider sx={{ my: 2 }} />
      
      {/* スケジュールタイムライン（モバイル対応） */}
      <Box>
        {groupedSlots.map(([hour, slots]) => (
          <Accordion
            key={hour}
            expanded={expanded === `hour-${hour}`}
            onChange={handleChange(`hour-${hour}`)}
            sx={{ mb: 1 }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls={`hour-${hour}-content`}
              id={`hour-${hour}-header`}
              sx={{ bgcolor: theme.palette.action.hover }}
            >
              <Typography sx={{ fontWeight: 'bold' }}>
                {hour}:00 - {parseInt(hour) + 1}:00
                <Chip 
                  label={`${slots.length} ${t('schedule.events')}`} 
                  size="small" 
                  sx={{ ml: 1 }} 
                />
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              {slots.map((slot, index) => {
                const match = slot.matchId ? getMatchInfo(slot.matchId) : undefined;
                
                return (
                  <Box key={index} sx={{ mb: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} sm={3}>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontWeight: 'medium',
                            color: getTypeColor(slot.type)
                          }}
                        >
                          {slot.startTime} - {slot.endTime}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={9}>
                        <Paper 
                          elevation={1} 
                          sx={{ 
                            p: 1.5,
                            borderLeft: `4px solid ${getTypeColor(slot.type)}`,
                            display: 'flex',
                            alignItems: 'flex-start'
                          }}
                        >
                          <Box sx={{ mr: 1, mt: 0.5 }}>
                            {getTypeIcon(slot.type)}
                          </Box>
                          <Box>
                            {slot.type === 'match' && match ? (
                              <>
                                <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                                  {getTeamName(match.team1Id)} vs {getTeamName(match.team2Id)}
                                </Typography>
                                {match.location && (
                                  <Typography variant="body2" color="text.secondary">
                                    {t('schedule.location')}: {match.location}
                                  </Typography>
                                )}
                                {slot.description && (
                                  <Typography variant="caption" color="text.secondary" display="block">
                                    {slot.description}
                                  </Typography>
                                )}
                              </>
                            ) : (
                              <Typography variant="body1">
                                {slot.title || t(`schedule.${slot.type}`)}
                                {slot.description && (
                                  <Typography variant="caption" color="text.secondary" display="block">
                                    {slot.description}
                                  </Typography>
                                )}
                              </Typography>
                            )}
                          </Box>
                        </Paper>
                      </Grid>
                    </Grid>
                  </Box>
                );
              })}
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>
    </Box>
  );
};

export default ScheduleTimeline;
