import React, { useMemo, useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  useTheme,
  useMediaQuery,
  Chip,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  CircularProgress,
  alpha,
  Divider
} from '@mui/material';
import {
  SportsSoccer as SportsIcon,
  Restaurant as LunchIcon,
  Coffee as BreakIcon,
  Schedule as ScheduleIcon,
  Place as PlaceIcon,
  AccessTime as TimeIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { timeToMinutes, minutesToTime } from '../../utils/scheduleGenerator';
import { Sport, TimeSlot, Event, Match } from '../../types';
import { useNavigate } from 'react-router-dom';

interface EventOverallTimelineProps {
  sports: Sport[];
  activeEvent?: Event | null;
}

interface TimelineEvent {
  sportId: string;
  sportName: string;
  timeSlot: TimeSlot;
  type: 'match' | 'break' | 'lunch' | 'preparation' | 'cleanup';
  startMinutes: number;
  endMinutes: number;
  matchInfo?: {
    matchId?: string;
    team1Id?: string;
    team1Name: string;
    team2Id?: string;
    team2Name: string;
    courtName?: string;
  };
}

// 時間の範囲を生成する関数（30分単位）
const generateTimeRanges = (startHour: number, endHour: number): string[] => {
  const timeRanges: string[] = [];
  for (let hour = startHour; hour <= endHour; hour++) {
    timeRanges.push(`${hour.toString().padStart(2, '0')}:00`);
    timeRanges.push(`${hour.toString().padStart(2, '0')}:30`);
  }
  return timeRanges;
};

const EventOverallTimeline: React.FC<EventOverallTimelineProps> = ({ sports, activeEvent }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));
  const [currentTime, setCurrentTime] = useState<number>(
    timeToMinutes(new Date().toTimeString().substring(0, 5))
  );
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [selectedSport, setSelectedSport] = useState<Sport | null>(null);

  // 1分ごとに現在時刻を更新
  useEffect(() => {
    const updateCurrentTime = () => {
      const now = new Date();
      const minutes = now.getHours() * 60 + now.getMinutes();
      setCurrentTime(minutes);
    };

    updateCurrentTime();
    const interval = setInterval(updateCurrentTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // 全スポーツのスケジュールデータを処理
  const { allEvents, timeRanges, minTime, maxTime } = useMemo(() => {
    // スケジュールがあるスポーツのみをフィルタリング
    const sportsWithSchedule = sports.filter(
      sport => sport.scheduleSettings?.timeSlots && sport.scheduleSettings.timeSlots.length > 0
    );

    // 時間の最小値と最大値を特定
    let minTimeMinutes = 24 * 60;
    let maxTimeMinutes = 0;

    const events: TimelineEvent[] = [];

    sportsWithSchedule.forEach(sport => {
      if (!sport.scheduleSettings?.timeSlots) return;

      // チーム名を取得する関数
      const getTeamName = (teamId?: string): string => {
        if (!teamId) return t('schedule.undetermined');
        const team = sport.teams.find(t => t.id === teamId);
        return team?.name || t('schedule.unknownTeam');
      };

      // コート名を取得する関数
      const getCourtName = (courtId?: 'court1' | 'court2'): string | undefined => {
        if (!courtId) return undefined;
        return sport.scheduleSettings?.courtNames?.[courtId] || 
              (courtId === 'court1' ? '第1コート' : '第2コート');
      };

      sport.scheduleSettings.timeSlots.forEach(slot => {
        const startMinutes = timeToMinutes(slot.startTime);
        const endMinutes = timeToMinutes(slot.endTime);
        
        // 時間の最小値と最大値を更新
        minTimeMinutes = Math.min(minTimeMinutes, startMinutes);
        maxTimeMinutes = Math.max(maxTimeMinutes, endMinutes);

        // マッチ情報を取得
        let matchInfo;
        if (slot.type === 'match' && slot.matchId) {
          const match = sport.matches?.find(m => m.id === slot.matchId);
          if (match) {
            matchInfo = {
              matchId: match.id,
              team1Id: match.team1Id,
              team1Name: getTeamName(match.team1Id),
              team2Id: match.team2Id,
              team2Name: getTeamName(match.team2Id),
              courtName: getCourtName(slot.courtId)
            };
          }
        }

        events.push({
          sportId: sport.id,
          sportName: sport.name,
          timeSlot: slot,
          type: slot.type,
          startMinutes,
          endMinutes,
          matchInfo
        });
      });
    });

    // 時間の範囲を30分単位で生成
    const startHour = Math.floor(minTimeMinutes / 60);
    const endHour = Math.ceil(maxTimeMinutes / 60);
    const timeRangeArray = generateTimeRanges(startHour, endHour);

    return {
      allEvents: events,
      timeRanges: timeRangeArray,
      minTime: minTimeMinutes,
      maxTime: maxTimeMinutes
    };
  }, [sports, t]);

  // スポーツごとにイベントをグループ化
  const sportGroupedEvents = useMemo(() => {
    const grouped: Record<string, TimelineEvent[]> = {};
    
    allEvents.forEach(event => {
      if (!grouped[event.sportId]) {
        grouped[event.sportId] = [];
      }
      grouped[event.sportId].push(event);
    });
    
    return grouped;
  }, [allEvents]);

  // イベントをクリックしたときの処理
  const handleEventClick = (event: TimelineEvent) => {
    setSelectedEvent(event);
    
    // 試合情報がある場合は試合データも取得
    if (event.matchInfo?.matchId) {
      const sport = sports.find(s => s.id === event.sportId);
      if (sport) {
        setSelectedSport(sport);
        const match = sport.matches?.find(m => m.id === event.matchInfo?.matchId);
        if (match) {
          setSelectedMatch(match);
        }
      }
    }
    
    setDialogOpen(true);
  };

  // ダイアログを閉じる
  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedEvent(null);
    setSelectedMatch(null);
    setSelectedSport(null);
  };

  // 試合詳細に移動
  const handleViewDetails = () => {
    if (selectedEvent) {
      navigate(`/sport/${selectedEvent.sportId}`);
      handleCloseDialog();
    }
  };

  // ローディング状態
  if (sports.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <CircularProgress />
      </Box>
    );
  }

  // スケジュールがある競技が存在しない場合
  if (Object.keys(sportGroupedEvents).length === 0) {
    return (
      <Alert severity="info" sx={{ my: 2 }}>
        {t('schedule.noSportsWithSchedule')}
      </Alert>
    );
  }

  // イベントタイプに基づいて色を返す
  const getEventColor = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'match': return theme.palette.primary.main;
      case 'break': return theme.palette.secondary.main;
      case 'lunch': return theme.palette.warning.main;
      case 'preparation': return theme.palette.info.main;
      case 'cleanup': return theme.palette.error.main;
      default: return theme.palette.text.secondary;
    }
  };

  // イベントタイプに応じたアイコンを取得
  const getTypeIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'match':
        return <SportsIcon fontSize="small" />;
      case 'break':
        return <BreakIcon fontSize="small" />;
      case 'lunch':
        return <LunchIcon fontSize="small" />;
      case 'preparation':
        return <ScheduleIcon fontSize="small" />;
      case 'cleanup':
        return <ScheduleIcon fontSize="small" />;
      default:
        return <ScheduleIcon fontSize="small" />;
    }
  };

  // タイムラインのピクセル/分の比率を計算
  const pixelPerMinute = isMobile ? 2 : isTablet ? 2.5 : 3;
  
  // 総合タイムラインのコンテンツ幅
  const totalTimelineWidth = (maxTime - minTime) * pixelPerMinute;

  // 現在時刻の位置を計算
  const currentTimePosition = currentTime >= minTime && currentTime <= maxTime
    ? (currentTime - minTime) * pixelPerMinute
    : -1;

  return (
    <Box sx={{ mt: 3 }}>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
          <ScheduleIcon sx={{ mr: 1 }} />
          {t('schedule.overallTimeline')}
        </Typography>
        
        <Box sx={{ mt: { xs: 1, sm: 0 } }}>
          {/* 現在時刻表示 */}
          {currentTimePosition > 0 && (
            <Chip 
              icon={<TimeIcon fontSize="small" />}
              label={`${t('schedule.currentTime')}: ${minutesToTime(currentTime)}`}
              size="small"
              color="primary"
              sx={{ mr: 1 }}
            />
          )}
        </Box>
      </Box>
      
      <Paper 
        elevation={2} 
        sx={{ 
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2
        }}
      >
        {/* 固定ヘッダーエリア - 競技名とタイムヘッダー */}
        <Box sx={{ 
          display: 'flex',
          borderBottom: '1px solid',
          borderColor: 'divider',
          position: 'sticky',
          top: 0,
          bgcolor: 'background.paper',
          zIndex: 10,
        }}>
          {/* 左側の競技名ヘッダーエリア */}
          <Box sx={{ 
            minWidth: isMobile ? 100 : 160, 
            p: 1.5,
            borderRight: '1px solid',
            borderColor: 'divider',
            bgcolor: theme.palette.grey[50],
            zIndex: 11,
            position: 'sticky',
            left: 0,
          }}>
            <Typography variant="subtitle2" align="center">
              {t('schedule.sports')}
            </Typography>
          </Box>

          {/* 時間ヘッダー - スクロール同期のためにコンテナで囲む */}
          <Box 
            sx={{ 
              position: 'relative',
              width: `calc(100% - ${isMobile ? 100 : 160}px)`,
              overflowX: 'auto',
              overflowY: 'hidden',
              '&::-webkit-scrollbar': { height: 8 },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: theme.palette.grey[300],
                borderRadius: 4
              }
            }}
            id="timeline-header-scroll"
            onScroll={(e) => {
              // スクロール位置を同期させる
              const contentScroll = document.getElementById('timeline-content-scroll');
              if (contentScroll) {
                contentScroll.scrollLeft = e.currentTarget.scrollLeft;
              }
            }}
          >
            <Box sx={{ 
              position: 'relative',
              width: `${totalTimelineWidth}px`,
              height: 40,
              display: 'flex',
              alignItems: 'center',
            }}>
              {/* 時間目盛り */}
              {timeRanges.map((time, index) => {
                const timeInMinutes = timeToMinutes(time);
                const position = (timeInMinutes - minTime) * pixelPerMinute;
                
                return (
                  <Typography 
                    key={`time-${index}`} 
                    variant="caption" 
                    sx={{ 
                      position: 'absolute',
                      left: `${position}px`,
                      transform: 'translateX(-50%)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {time}
                  </Typography>
                );
              })}
            </Box>
          </Box>
        </Box>
        
        {/* スケジュールのメインコンテンツエリア */}
        <Box sx={{ 
          display: 'flex',
          position: 'relative',
          maxHeight: '500px',
        }}>
          {/* 左側の競技名列 - 固定表示 */}
          <Box sx={{ 
            minWidth: isMobile ? 100 : 160,
            borderRight: '1px solid',
            borderColor: 'divider',
            position: 'sticky',
            left: 0,
            zIndex: 9,
            bgcolor: 'background.paper'
          }}>
            {Object.entries(sportGroupedEvents).map(([sportId, events]) => {
              const sport = sports.find(s => s.id === sportId);
              if (!sport) return null;
              
              return (
                <Box 
                  key={`sport-${sportId}`}
                  sx={{ 
                    p: 1.5,
                    height: 60,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.05)
                    }
                  }}
                  onClick={() => navigate(`/sport/${sportId}`)}
                >
                  <Tooltip title={t('schedule.clickToView')}>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontWeight: 'medium',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {sport.name}
                    </Typography>
                  </Tooltip>
                </Box>
              );
            })}
          </Box>
          
          {/* タイムラインコンテンツ - スクロール可能エリア */}
          <Box 
            sx={{ 
              position: 'relative',
              width: `calc(100% - ${isMobile ? 100 : 160}px)`,
              overflowX: 'auto',
              overflowY: 'auto',
              '&::-webkit-scrollbar': { height: 8, width: 8 },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: theme.palette.grey[300],
                borderRadius: 4
              }
            }}
            id="timeline-content-scroll"
            onScroll={(e) => {
              // 水平スクロール位置をヘッダーと同期
              const headerScroll = document.getElementById('timeline-header-scroll');
              if (headerScroll) {
                headerScroll.scrollLeft = e.currentTarget.scrollLeft;
              }
            }}
          >
            <Box sx={{ 
              width: `${totalTimelineWidth}px`,
              position: 'relative'
            }}>
              {/* 時間の区切り線 */}
              {timeRanges.map((time, index) => {
                const timeInMinutes = timeToMinutes(time);
                const position = (timeInMinutes - minTime) * pixelPerMinute;
                
                return (
                  <Box 
                    key={`line-${time}`}
                    sx={{
                      position: 'absolute',
                      left: `${position}px`,
                      top: 0,
                      bottom: 0,
                      height: '100%',
                      borderLeft: '1px dashed',
                      borderColor: 'divider',
                      zIndex: 1
                    }}
                  />
                );
              })}

              {/* 現在時刻の線 */}
              {currentTimePosition > 0 && (
                <Box 
                  sx={{
                    position: 'absolute',
                    left: `${currentTimePosition}px`,
                    top: 0,
                    bottom: 0,
                    height: '100%',
                    borderLeft: `2px solid ${theme.palette.error.main}`,
                    zIndex: 3,
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: -4,
                      width: 8,
                      height: 8,
                      bgcolor: theme.palette.error.main,
                      borderRadius: '50%'
                    }
                  }}
                />
              )}
              
              {/* スポーツごとの行 */}
              {Object.entries(sportGroupedEvents).map(([sportId, events], rowIndex) => (
                <Box 
                  key={`timeline-${sportId}`}
                  sx={{ 
                    height: 60,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    position: 'relative'
                  }}
                >
                  {/* イベント要素を配置 */}
                  {events.map((event, index) => {
                    const left = (event.startMinutes - minTime) * pixelPerMinute;
                    const width = (event.endMinutes - event.startMinutes) * pixelPerMinute;
                    const minWidth = 40;
                    const finalWidth = Math.max(width, minWidth);
                    
                    return (
                      <Box
                        key={`event-${sportId}-${index}`}
                        sx={{
                          position: 'absolute',
                          left: `${left}px`,
                          width: `${finalWidth}px`,
                          height: 40,
                          top: 10,
                          borderRadius: 1,
                          bgcolor: event.type === 'match' 
                            ? alpha(theme.palette.primary.main, 0.85) 
                            : alpha(getEventColor(event.type), 0.7),
                          border: '1px solid',
                          borderColor: getEventColor(event.type),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                          p: 0.5,
                          cursor: 'pointer',
                          color: event.type === 'match' ? '#fff' : 'text.primary',
                          '&:hover': {
                            boxShadow: 2,
                            filter: 'brightness(1.1)',
                            zIndex: 5
                          },
                          zIndex: event.type === 'match' ? 4 : 2
                        }}
                        onClick={() => handleEventClick(event)}
                      >
                        {/* 試合の場合はチーム情報を表示、それ以外はアイコンのみ */}
                        {event.type === 'match' && event.matchInfo ? (
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              textShadow: '0 0 2px rgba(0,0,0,0.7)',
                              fontWeight: 'medium',
                              textAlign: 'center',
                              width: '100%'
                            }}
                          >
                            {finalWidth > 120 
                              ? `${event.matchInfo.team1Name} vs ${event.matchInfo.team2Name}`
                              : `${event.matchInfo.team1Name.substring(0, 3)}.. vs ${event.matchInfo.team2Name.substring(0, 3)}..`
                            }
                          </Typography>
                        ) : (
                          // 試合以外はアイコンのみ表示
                          getTypeIcon(event.type)
                        )}
                      </Box>
                    );
                  })}
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Paper>
      
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        {t('schedule.timelineHint')}
      </Typography>

      {/* イベント詳細ダイアログ */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        {selectedEvent && (
          <>
            <DialogTitle sx={{ 
              bgcolor: alpha(getEventColor(selectedEvent.type), 0.1),
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <Box>
                <Typography variant="h6">
                  {selectedEvent.sportName}
                </Typography>
                <Typography variant="subtitle2" color="text.secondary">
                  {selectedEvent.timeSlot.startTime} - {selectedEvent.timeSlot.endTime}
                </Typography>
              </Box>
              <Chip 
                label={t(`schedule.${selectedEvent.type}`)}
                color={selectedEvent.type === 'match' ? 'primary' : 'default'}
                size="small"
              />
            </DialogTitle>

            <DialogContent sx={{ mt: 2 }}>
              {selectedEvent.type === 'match' && selectedEvent.matchInfo ? (
                <Box>
                  {/* 試合情報 */}
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    my: 2
                  }}>
                    <Typography variant="h6" align="right" sx={{ flex: 1 }}>
                      {selectedEvent.matchInfo.team1Name}
                    </Typography>
                    <Typography variant="h5" sx={{ mx: 2 }}>vs</Typography>
                    <Typography variant="h6" align="left" sx={{ flex: 1 }}>
                      {selectedEvent.matchInfo.team2Name}
                    </Typography>
                  </Box>

                  {/* 試合状態や詳細 */}
                  {selectedMatch && (
                    <Box sx={{ mt: 3 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        {t('schedule.matchDetails')}
                      </Typography>
                      <Divider sx={{ mb: 2 }} />

                      <Grid container spacing={2}>
                        {selectedMatch.status && (
                          <Grid item xs={12} sm={6}>
                            <Typography variant="body2" color="text.secondary">
                              {t('schedule.status')}
                            </Typography>
                            <Typography variant="body1">
                              {t(`match.${selectedMatch.status}`)}
                            </Typography>
                          </Grid>
                        )}

                        {selectedEvent.matchInfo.courtName && (
                          <Grid item xs={12} sm={6}>
                            <Typography variant="body2" color="text.secondary">
                              {t('schedule.location')}
                            </Typography>
                            <Typography variant="body1">
                              {selectedEvent.matchInfo.courtName}
                            </Typography>
                          </Grid>
                        )}

                        {/* round情報表示を削除 */}

                        {selectedMatch.blockId && (
                          <Grid item xs={12} sm={6}>
                            <Typography variant="body2" color="text.secondary">
                              {t('schedule.block')}
                            </Typography>
                            <Typography variant="body1">
                              {`${t('league.block')} ${selectedMatch.blockId.replace('block_', '')}`}
                            </Typography>
                          </Grid>
                        )}

                        {selectedMatch.notes && (
                          <Grid item xs={12}>
                            <Typography variant="body2" color="text.secondary">
                              {t('schedule.notes')}
                            </Typography>
                            <Typography variant="body1">
                              {selectedMatch.notes}
                            </Typography>
                          </Grid>
                        )}
                      </Grid>
                    </Box>
                  )}
                </Box>
              ) : (
                // 試合以外の時間枠
                <Box sx={{ py: 2 }}>
                  <Typography variant="h6">
                    {selectedEvent.timeSlot.title || t(`schedule.${selectedEvent.type}`)}
                  </Typography>
                  
                  {selectedEvent.timeSlot.description && (
                    <Typography variant="body1" sx={{ mt: 2 }}>
                      {selectedEvent.timeSlot.description}
                    </Typography>
                  )}
                </Box>
              )}
            </DialogContent>

            <DialogActions>
              <Button onClick={handleCloseDialog} color="inherit">
                {t('common.close')}
              </Button>
              <Button 
                onClick={handleViewDetails} 
                variant="contained" 
                color="primary"
              >
                {t('schedule.viewDetails')}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default EventOverallTimeline;
