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
  Card,
  CardContent,
  Avatar
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Schedule as ScheduleIcon,
  SportsSoccer as SportsIcon,
  Restaurant as LunchIcon,
  Coffee as BreakIcon,
  Place as PlaceIcon
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

  // タイムスロットを時間とコートでグループ化 - 必ず条件付きリターンの前に実行
  const groupedSlots = useMemo(() => {
    // スケジュール設定がない場合は空配列を返す
    if (!sport.scheduleSettings?.timeSlots || sport.scheduleSettings.timeSlots.length === 0) {
      return [];
    }
    
    const byTime: { [key: string]: { 
      startTime: string, 
      endTime: string, 
      slots: TimeSlot[] 
    }} = {};
    
    // 時間でグループ化
    sport.scheduleSettings.timeSlots.forEach(slot => {
      if (!byTime[slot.startTime]) {
        byTime[slot.startTime] = {
          startTime: slot.startTime,
          endTime: slot.endTime,
          slots: []
        };
      }
      byTime[slot.startTime].slots.push(slot);
    });
    
    // 時間順にソート
    return Object.values(byTime).sort((a, b) => 
      a.startTime.localeCompare(b.startTime)
    );
  }, [sport.scheduleSettings]);

  // スケジュール設定がない場合の条件を移動
  if (groupedSlots.length === 0) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        {t('schedule.noScheduleAvailable')}
      </Alert>
    );
  }

  // チーム名を取得する関数
  const getTeamName = (teamId: string): string => {
    const team = sport.teams?.find(t => t.id === teamId);
    return team ? team.name : t('schedule.unknownTeam');
  };

  // 試合情報を取得する関数
  const getMatchInfo = (matchId: string): Match | undefined => {
    return sport.matches?.find(m => m.id === matchId);
  };

  // コート名を取得する関数
  const getCourtName = (courtId?: 'court1' | 'court2'): string => {
    if (!courtId) return '';
    return sport.scheduleSettings?.courtNames?.[courtId] || 
           (courtId === 'court1' ? '第1コート' : '第2コート');
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

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
        <ScheduleIcon sx={{ mr: 1 }} />
        {t('schedule.timeline')}
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {t('schedule.timeRange')}: {sport.scheduleSettings?.startTime} - {sport.scheduleSettings?.endTime}
      </Typography>
      
      <Divider sx={{ my: 2 }} />
      
      {/* スケジュールタイムライン - コート情報を含む新しいデザイン */}
      <Box>
        {groupedSlots.map((timeGroup, idx) => (
          <Paper 
            key={`time-${idx}`} 
            elevation={1} 
            sx={{ 
              mb: 2, 
              overflow: 'hidden',
              border: '1px solid',
              borderColor: 'divider'
            }}
          >
            {/* 時間帯ヘッダー */}
            <Box 
              sx={{ 
                p: 1.5, 
                bgcolor: theme.palette.grey[100],
                borderBottom: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <Typography variant="subtitle1" fontWeight="bold">
                {timeGroup.startTime} - {timeGroup.endTime}
              </Typography>
              <Chip 
                label={`${timeGroup.slots.length} ${t('schedule.activities')}`} 
                size="small" 
                color="primary"
              />
            </Box>
            
            {/* 同時刻のアクティビティグリッド */}
            <Box sx={{ p: 2 }}>
              <Grid container spacing={2}>
                {timeGroup.slots.map((slot, slotIdx) => {
                  // 試合とその他（休憩など）で表示を分ける
                  if (slot.type === 'match' && slot.matchId) {
                    const match = getMatchInfo(slot.matchId);
                    if (!match) return null;
                    
                    // 試合カード
                    return (
                      <Grid item xs={12} md={slot.courtId ? 6 : 12} key={`slot-${slotIdx}`}>
                        <Card variant="outlined" sx={{ 
                          height: '100%',
                          borderLeft: `4px solid ${getTypeColor(slot.type)}`,
                          position: 'relative'
                        }}>
                          {/* コート情報をカードの上部に表示 */}
                          {slot.courtId && (
                            <Box sx={{
                              position: 'absolute',
                              top: 8,
                              right: 8,
                              zIndex: 1
                            }}>
                              <Chip
                                icon={<PlaceIcon />}
                                label={getCourtName(slot.courtId)}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            </Box>
                          )}
                          
                          <CardContent>
                            {/* 対戦カード */}
                            <Box sx={{ 
                              display: 'flex', 
                              justifyContent: 'center',
                              alignItems: 'center',
                              my: 1,
                              flexWrap: 'wrap',
                              gap: 1
                            }}>
                              <Typography 
                                variant="body1" 
                                fontWeight="bold"
                                sx={{ flexGrow: 1, textAlign: 'right' }}
                              >
                                {getTeamName(match.team1Id)}
                              </Typography>
                              
                              <Avatar sx={{ 
                                bgcolor: theme.palette.secondary.main,
                                color: theme.palette.primary.contrastText,
                                width: 36,
                                height: 36
                              }}>
                                VS
                              </Avatar>
                              
                              <Typography 
                                variant="body1" 
                                fontWeight="bold"
                                sx={{ flexGrow: 1 }}
                              >
                                {getTeamName(match.team2Id)}
                              </Typography>
                            </Box>
                            
                            {/* 試合状態や説明 */}
                            <Box sx={{ mt: 1 }}>
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
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  } else {
                    // 休憩や昼食などのカード
                    return (
                      <Grid item xs={12} key={`slot-${slotIdx}`}>
                        <Paper 
                          variant="outlined" 
                          sx={{ 
                            p: 1.5,
                            borderLeft: `4px solid ${getTypeColor(slot.type)}`,
                            bgcolor: `${getTypeColor(slot.type)}10`,
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          <Box sx={{ mr: 1.5 }}>
                            {getTypeIcon(slot.type)}
                          </Box>
                          <Box>
                            <Typography variant="body1" fontWeight="medium">
                              {slot.title || t(`schedule.${slot.type}`)}
                            </Typography>
                            {slot.description && (
                              <Typography variant="caption" color="text.secondary" display="block">
                                {slot.description}
                              </Typography>
                            )}
                          </Box>
                        </Paper>
                      </Grid>
                    );
                  }
                })}
              </Grid>
            </Box>
          </Paper>
        ))}
      </Box>
    </Box>
  );
};

export default ScheduleTimeline;
