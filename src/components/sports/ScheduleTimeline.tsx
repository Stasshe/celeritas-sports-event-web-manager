import React, { useState, useMemo } from 'react';
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
  Alert,
  Tabs,
  Tab,
  Stack,
  Avatar
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Schedule as ScheduleIcon,
  SportsSoccer as SportsIcon,
  Restaurant as LunchIcon,
  Coffee as BreakIcon,
  Place as PlaceIcon,
  ViewList as ListIcon,
  ViewColumn as ColumnIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { Sport, TimeSlot, Match } from '../../types';

interface ScheduleTimelineProps {
  sport: Sport;
}

// 同時開催試合をグループ化するための型
interface GroupedTimeSlot {
  startTime: string;
  endTime: string;
  slots: TimeSlot[];
  hour: string;
}

const ScheduleTimeline: React.FC<ScheduleTimelineProps> = ({ sport }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [expanded, setExpanded] = useState<string | false>(false);
  const [viewMode, setViewMode] = useState<'combined' | 'venue'>('combined');

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

  // 会場情報を取得
  const venues = useMemo(() => {
    const venueSet = new Set<string>();
    if (sport.scheduleSettings) {
      sport.scheduleSettings.timeSlots?.forEach(slot => {
        if (slot.venueId) {
          venueSet.add(slot.venueId);
        }
      });
    }
    return Array.from(venueSet);
  }, [sport.scheduleSettings.timeSlots]);

  // 同時開催試合をグループ化
  const groupedTimeSlots = useMemo(() => {
    const groups: GroupedTimeSlot[] = [];
    const sortedSlots = [...(sport.scheduleSettings?.timeSlots || [])].sort((a, b) => 
      a.startTime.localeCompare(b.startTime) || a.endTime.localeCompare(b.endTime)
    );

    sortedSlots.forEach(slot => {
      const hour = slot.startTime.split(':')[0];
      
      // 同じ開始・終了時間のグループを探す
      const existingGroup = groups.find(g => 
        g.startTime === slot.startTime && g.endTime === slot.endTime
      );

      if (existingGroup) {
        existingGroup.slots.push(slot);
      } else {
        groups.push({
          startTime: slot.startTime,
          endTime: slot.endTime,
          slots: [slot],
          hour
        });
      }
    });

    return groups;
  }, [sport.scheduleSettings?.timeSlots]);

  // 会場ごとにスロットをグループ化
  const venueTimeSlots = useMemo(() => {
    const venueSlots: Record<string, TimeSlot[]> = {};
    venues.forEach(venueId => {
      venueSlots[venueId] = sport.scheduleSettings?.timeSlots?.filter(slot => slot.venueId === venueId) || [];
    });
    
    // 会場未指定のスロット（休憩など）を全会場に追加
    const unassignedSlots = sport.scheduleSettings?.timeSlots?.filter(slot => !slot.venueId) || [];
    venues.forEach(venueId => {
      venueSlots[venueId] = [...venueSlots[venueId], ...unassignedSlots].sort((a, b) => 
        a.startTime.localeCompare(b.startTime)
      );
    });
    
    return venueSlots;
  }, [sport.scheduleSettings?.timeSlots, venues]);

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

  // 会場別の色を取得
  const getVenueColor = (venueId: string) => {
    const venueColors = [
      theme.palette.primary.light,
      theme.palette.secondary.light,
      theme.palette.success.light,
      theme.palette.warning.light,
      theme.palette.info.light,
    ];
    
    // 文字列からハッシュ値を生成
    const hash = venueId.split('').reduce((acc, char) => {
      return acc + char.charCodeAt(0);
    }, 0);
    
    return venueColors[hash % venueColors.length];
  };

  // タイムスロットをグループ化（時間帯ごと）
  const groupSlotsByHour = () => {
    const grouped: { [key: string]: GroupedTimeSlot[] } = {};
    
    groupedTimeSlots.forEach(group => {
      const hour = group.hour;
      if (!grouped[hour]) {
        grouped[hour] = [];
      }
      grouped[hour].push(group);
    });
    
    return Object.entries(grouped).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
  };

  const hourlyGroups = groupSlotsByHour();

  // 表示モードの切り替え
  const handleViewModeChange = (event: React.SyntheticEvent, newValue: 'combined' | 'venue') => {
    setViewMode(newValue);
  };

  // タイムスロットのレンダリング
  const renderTimeSlot = (slot: TimeSlot, isInGroup: boolean = false) => {
    const match = slot.matchId ? getMatchInfo(slot.matchId) : undefined;
    
    return (
      <Box 
        sx={{ 
          mb: 2,
          borderLeft: slot.venueId 
            ? `4px solid ${getVenueColor(slot.venueId)}`
            : 'none'
        }}
      >
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={isInGroup ? 1 : 3}>
            {!isInGroup && (
              <Typography 
                variant="body2" 
                sx={{ 
                  fontWeight: 'medium',
                  color: getTypeColor(slot.type)
                }}
              >
                {slot.startTime} - {slot.endTime}
              </Typography>
            )}
            {slot.venueId && (
              <Chip
                size="small"
                label={slot.venueName || slot.venueId}
                sx={{ 
                  bgcolor: `${getVenueColor(slot.venueId)}30`,
                  borderColor: getVenueColor(slot.venueId),
                  mt: isInGroup ? 0 : 1
                }}
                variant="outlined"
              />
            )}
          </Grid>
          <Grid item xs={12} sm={isInGroup ? 11 : 9}>
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
              <Box sx={{ flexGrow: 1 }}>
                {slot.type === 'match' && match ? (
                  <>
                    <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                      {getTeamName(match.team1Id)} vs {getTeamName(match.team2Id)}
                    </Typography>
                    {(match.location || slot.description) && (
                      <Typography variant="body2" color="text.secondary">
                        {match.location && `${t('schedule.location')}: ${match.location}`}
                        {match.location && slot.description && ' - '}
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
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
        <ScheduleIcon sx={{ mr: 1 }} />
        {t('schedule.timeline')}
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {t('schedule.timeRange')}: {sport.scheduleSettings?.startTime || '00:00'} - {sport.scheduleSettings?.endTime || '00:00'}
      </Typography>
      
      {/* 表示切替タブ - 会場が複数ある場合のみ表示 */}
      {venues.length > 1 && (
        <Paper sx={{ mt: 2, mb: 2 }}>
          <Tabs
            value={viewMode}
            onChange={handleViewModeChange}
            variant="fullWidth"
            indicatorColor="primary"
            textColor="primary"
          >
            <Tab 
              icon={<ListIcon />}
              iconPosition="start"
              label={t('schedule.combinedView')} 
              value="combined" 
            />
            <Tab 
              icon={<ColumnIcon />}
              iconPosition="start"
              label={t('schedule.venueView')} 
              value="venue" 
            />
          </Tabs>
        </Paper>
      )}
      
      <Divider sx={{ my: 2 }} />
      
      {/* 統合表示 */}
      {viewMode === 'combined' && (
        <Box>
          {hourlyGroups.map(([hour, groups]) => (
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
                    label={`${groups.length} ${t('schedule.events')}`} 
                    size="small" 
                    sx={{ ml: 1 }} 
                  />
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                {groups.map((group, groupIndex) => (
                  <Box key={groupIndex} sx={{ mb: 3 }}>
                    {/* 同時開催グループのヘッダー */}
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Typography variant="subtitle1" fontWeight="medium">
                        {group.startTime} - {group.endTime}
                      </Typography>
                      {group.slots.length > 1 && (
                        <Chip 
                          size="small" 
                          label={t('schedule.concurrent', { count: group.slots.length })} 
                          sx={{ ml: 1, bgcolor: theme.palette.primary.light, color: 'white' }} 
                        />
                      )}
                    </Box>
                    
                    {/* 同時開催の場合は特別な表示 */}
                    {group.slots.length > 1 ? (
                      <Paper sx={{ p: 2, bgcolor: theme.palette.grey[50] }}>
                        <Typography variant="subtitle2" gutterBottom color="text.secondary">
                          {t('schedule.simultaneousEvents')}:
                        </Typography>
                        {group.slots.map((slot, slotIndex) => (
                          <Box key={slotIndex} sx={{ mb: slotIndex < group.slots.length - 1 ? 2 : 0 }}>
                            {renderTimeSlot(slot, true)}
                            {slotIndex < group.slots.length - 1 && <Divider sx={{ my: 1 }} />}
                          </Box>
                        ))}
                      </Paper>
                    ) : (
                      // 単一イベントは通常表示
                      renderTimeSlot(group.slots[0])
                    )}
                  </Box>
                ))}
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}
      
      {/* 会場別表示 */}
      {viewMode === 'venue' && (
        <Box>
          {venues.map((venueId) => {
            const venueName = sport.scheduleSettings?.timeSlots?.find(s => s.venueId === venueId)?.venueName || venueId;
            const venueSlots = venueTimeSlots[venueId];
            
            return (
              <Accordion
                key={venueId}
                sx={{ mb: 1 }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  aria-controls={`venue-${venueId}-content`}
                  id={`venue-${venueId}-header`}
                  sx={{ 
                    bgcolor: `${getVenueColor(venueId)}20`,
                    borderLeft: `4px solid ${getVenueColor(venueId)}`
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <PlaceIcon sx={{ mr: 1, color: getVenueColor(venueId) }} />
                    <Typography sx={{ fontWeight: 'bold' }}>
                      {venueName}
                      <Chip 
                        label={`${venueSlots.filter(s => s.type === 'match').length} ${t('schedule.matches')}`} 
                        size="small" 
                        sx={{ ml: 1 }} 
                      />
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  {venueSlots.map((slot, index) => (
                    <Box key={index} sx={{ mb: 2 }}>
                      {renderTimeSlot(slot)}
                    </Box>
                  ))}
                  
                  {venueSlots.length === 0 && (
                    <Typography color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                      {t('schedule.noEventsAtVenue')}
                    </Typography>
                  )}
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Box>
      )}
    </Box>
  );
};

export default ScheduleTimeline;
