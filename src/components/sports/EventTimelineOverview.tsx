import React, { useState, useEffect, useMemo } from 'react';
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
  CircularProgress,
  Card,
  CardContent,
  Badge,
  Tooltip
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Schedule as ScheduleIcon,
  SportsSoccer as SportIcon,
  Event as EventIcon,
  Restaurant as LunchIcon,
  Coffee as BreakIcon,
  Place as PlaceIcon
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
  const [loading, setLoading] = useState(true);

  // スポーツ一覧データを処理
  const activeSports = useMemo(() => {
    // スケジュールがあるスポーツのみをフィルタリング
    const sportsWithSchedule = sports.filter(
      sport => sport.scheduleSettings?.timeSlots && sport.scheduleSettings.timeSlots.length > 0
    );
    
    // 開始時間順にソート
    return [...sportsWithSchedule].sort((a, b) => {
      const aStart = a.scheduleSettings?.startTime || '00:00';
      const bStart = b.scheduleSettings?.startTime || '00:00';
      return timeToMinutes(aStart) - timeToMinutes(bStart);
    });
  }, [sports]);

  // ローディング状態を管理
  useEffect(() => {
    setLoading(true);
    if (sports.length > 0) {
      setLoading(false);
    }
  }, [sports]);

  // アコーディオンの開閉を管理
  const handleChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  // 各競技の同時進行試合の数をカウント
  const getSimultaneousMatchCount = (sport: Sport): number => {
    if (!sport.scheduleSettings?.timeSlots) return 0;
    
    // タイムスロットを開始時間でグループ化
    const timeGroups: Record<string, TimeSlot[]> = {};
    sport.scheduleSettings.timeSlots.forEach(slot => {
      if (slot.type !== 'match') return;
      
      if (!timeGroups[slot.startTime]) {
        timeGroups[slot.startTime] = [];
      }
      timeGroups[slot.startTime].push(slot);
    });
    
    // 同時進行の最大数を計算
    let maxSimultaneous = 0;
    Object.values(timeGroups).forEach(slots => {
      maxSimultaneous = Math.max(maxSimultaneous, slots.length);
    });
    
    return maxSimultaneous;
  };

  // スポーツのタイムスロット分布を簡略表示するための関数
  const renderTimeDistribution = (sport: Sport) => {
    if (!sport.scheduleSettings?.timeSlots) return null;
    
    const timeSlots = sport.scheduleSettings.timeSlots;
    
    // 時間枠タイプごとのカウント
    const counts = {
      match: timeSlots.filter(slot => slot.type === 'match').length,
      break: timeSlots.filter(slot => slot.type === 'break').length,
      lunch: timeSlots.filter(slot => slot.type === 'lunch').length,
      other: timeSlots.filter(slot => !['match', 'break', 'lunch'].includes(slot.type)).length
    };
    
    // 同時進行数
    const simultaneousCount = getSimultaneousMatchCount(sport);
    const hasMultipleCourts = simultaneousCount > 1;

    return (
      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        {counts.match > 0 && (
          <Tooltip title={hasMultipleCourts ? t('schedule.hasSimultaneousMatches') : ''}>
            <Badge 
              badgeContent={hasMultipleCourts ? simultaneousCount : 0} 
              color="primary"
              overlap="circular"
              invisible={!hasMultipleCourts}
            >
              <Chip 
                icon={<SportIcon fontSize="small" />} 
                label={`${counts.match}${t('schedule.matchCount')}`} 
                size="small" 
                color="primary"
                variant="outlined"
              />
            </Badge>
          </Tooltip>
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
        {sport.scheduleSettings?.courtCount > 1 && (
          <Chip 
            icon={<PlaceIcon fontSize="small" />} 
            label={`${sport.scheduleSettings.courtCount}${t('schedule.courts')}`} 
            size="small" 
            color="info"
            variant="outlined"
          />
        )}
      </Box>
    );
  };

  // スポーツごとのスケジュールサマリーカード
  const renderSportScheduleSummary = (sport: Sport) => {
    if (!sport.scheduleSettings?.timeSlots || sport.scheduleSettings.timeSlots.length === 0) {
      return null;
    }

    // 試合時間枠を取得
    const matchSlots = sport.scheduleSettings.timeSlots.filter(slot => slot.type === 'match');
    if (matchSlots.length === 0) return null;

    // 最初と最後の試合時間を取得
    const firstMatch = matchSlots.reduce((earliest, slot) => 
      timeToMinutes(slot.startTime) < timeToMinutes(earliest.startTime) ? slot : earliest, matchSlots[0]);
    
    const lastMatch = matchSlots.reduce((latest, slot) => 
      timeToMinutes(slot.startTime) > timeToMinutes(latest.startTime) ? slot : latest, matchSlots[0]);

    return (
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
            {t('schedule.matchTimeRange')}
          </Typography>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center', 
            mb: 1
          }}>
            <Chip 
              label={`${t('schedule.firstMatch')}: ${firstMatch.startTime}`}
              size="small"
              color="primary"
              variant="outlined"
            />
            <Box sx={{ mx: 1, flexGrow: 1, textAlign: 'center' }}>→</Box>
            <Chip 
              label={`${t('schedule.lastMatch')}: ${lastMatch.startTime}`}
              size="small"
              color="primary"
              variant="outlined"
            />
          </Box>
          
          {/* コート情報 */}
          {sport.scheduleSettings.courtCount > 1 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {t('schedule.courtInfo')}:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                <Chip 
                  label={sport.scheduleSettings.courtNames?.court1 || t('schedule.court1')}
                  size="small"
                  variant="outlined"
                />
                <Chip 
                  label={sport.scheduleSettings.courtNames?.court2 || t('schedule.court2')}
                  size="small"
                  variant="outlined"
                />
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>
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
                {/* スケジュールサマリー */}
                {renderSportScheduleSummary(sport)}
                
                {/* 詳細スケジュール */}
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
