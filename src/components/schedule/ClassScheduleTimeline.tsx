import React, { useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  useTheme,
  Card,
  CardContent,
  Tooltip,
  alpha,
  Grid,
  Stack,
  Divider,
  Badge
} from '@mui/material';
import {
  SportsSoccer as SportIcon,
  Event as EventIcon,
  DateRange as DateIcon,
  AccessTime as TimeIcon,
  Place as PlaceIcon,
  HelpOutline as HelpIcon,
  CheckCircle as ConfirmedIcon,
  Help as PotentialIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { timeToMinutes } from '../../utils/scheduleGenerator';
import { ClassScheduleEntry } from '../../types';
import { useNavigate } from 'react-router-dom';

interface ClassScheduleTimelineProps {
  scheduleEntries: ClassScheduleEntry[];
  selectedClasses: string[];
}

// 時間を順序付けるためのユーティリティ関数
const getTimeValue = (entry: ClassScheduleEntry): number => {
  // 日付がある場合は日付も考慮する
  if (entry.date) {
    const dateValue = new Date(entry.date).getTime();
    return dateValue + timeToMinutes(entry.startTime);
  }
  return timeToMinutes(entry.startTime);
};

// 同じ時間帯をグループ化するためのキーを生成
const getTimeGroupKey = (entry: ClassScheduleEntry): string => {
  return `${entry.date || 'unknown'}-${entry.startTime}`;
};

const ClassScheduleTimeline: React.FC<ClassScheduleTimelineProps> = ({
  scheduleEntries,
  selectedClasses
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();

  // エントリを日付と時間でグループ化
  const groupedEntries = useMemo(() => {
    // 日付ごとにグループ化
    const byDate: Record<string, { 
      date: string, 
      entries: ClassScheduleEntry[] 
    }> = {};

    // 日付でのグループ化
    scheduleEntries.forEach(entry => {
      const dateKey = entry.date || t('classSchedule.undefinedDate');
      if (!byDate[dateKey]) {
        byDate[dateKey] = {
          date: entry.date || '',
          entries: []
        };
      }
      byDate[dateKey].entries.push(entry);
    });

    // 各日付内で時間別にグループ化して、時間順でソート
    const result = Object.entries(byDate).map(([dateKey, dateGroup]) => {
      // 同じ時間でグループ化
      const byTime: Record<string, ClassScheduleEntry[]> = {};
      dateGroup.entries.forEach(entry => {
        const timeKey = entry.startTime;
        if (!byTime[timeKey]) {
          byTime[timeKey] = [];
        }
        byTime[timeKey].push(entry);
      });

      // 時間順にソート
      const sortedTimes = Object.keys(byTime).sort((a, b) => {
        return timeToMinutes(a) - timeToMinutes(b);
      });

      return {
        date: dateKey,
        formattedDate: dateGroup.date ? new Date(dateGroup.date).toLocaleDateString() : t('classSchedule.undefinedDate'),
        timeSlots: sortedTimes.map(time => ({
          time,
          entries: byTime[time].sort((a, b) => {
            // 確定試合を優先して上に表示
            if (a.status === 'potential' && b.status !== 'potential') return 1;
            if (a.status !== 'potential' && b.status === 'potential') return -1;
            // 確度で比較（高い方を上に）
            if (a.certainty !== undefined && b.certainty !== undefined) {
              return b.certainty - a.certainty;
            }
            return 0;
          })
        }))
      };
    });

    // 日付順にソート
    return result.sort((a, b) => {
      if (a.date === t('classSchedule.undefinedDate')) return 1;
      if (b.date === t('classSchedule.undefinedDate')) return -1;
      return a.date.localeCompare(b.date);
    });
  }, [scheduleEntries, t]);

  // エントリがない場合
  if (scheduleEntries.length === 0) {
    return (
      <Paper 
        elevation={1} 
        sx={{ 
          p: 3, 
          textAlign: 'center',
          bgcolor: 'background.default'
        }}
      >
        <Typography variant="h6" color="text.secondary">
          {t('classSchedule.noSchedule')}
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      {/* 日付ごとのセクション */}
      {groupedEntries.map((dateGroup, dateIndex) => (
        <Box key={`date-${dateIndex}`} sx={{ mb: 3 }}>
          {/* 日付ヘッダー */}
          <Paper 
            elevation={2} 
            sx={{ 
              p: 1, 
              mb: 2, 
              display: 'flex',
              alignItems: 'center',
              bgcolor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText
            }}
          >
            <DateIcon sx={{ mr: 0.5 }} fontSize="small" />
            <Typography variant="subtitle1">
              {dateGroup.formattedDate}
            </Typography>
          </Paper>
          
          {/* 時間ごとのグループ */}
          <Stack spacing={1.5}>
            {dateGroup.timeSlots.map((timeSlot, timeIndex) => (
              <Paper
                key={`time-${timeIndex}`}
                elevation={1}
                sx={{ 
                  overflow: 'hidden',
                  borderRadius: 1
                }}
              >
                {/* 時間ヘッダー */}
                <Box 
                  sx={{ 
                    py: 0.5,
                    px: 1.5, 
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <TimeIcon sx={{ mr: 0.5, color: theme.palette.text.secondary }} fontSize="small" />
                  <Typography variant="body1" fontWeight="medium">
                    {timeSlot.time}
                  </Typography>
                </Box>
                
                {/* 同じ時間のスケジュールエントリー */}
                <Box sx={{ p: 1 }}>
                  <Grid container spacing={1}>
                    {timeSlot.entries.map((entry, entryIndex) => (
                      <Grid item xs={12} sm={12} md={6} lg={4} key={`entry-${entryIndex}`}>
                        <Card 
                          variant={entry.status === 'potential' ? 'outlined' : 'elevation'} 
                          elevation={entry.status === 'potential' ? 0 : 1}
                          sx={{ 
                            height: '100%',
                            cursor: 'pointer',
                            borderLeft: '3px solid',
                            borderColor: entry.status === 'potential' 
                              ? theme.palette.warning.main 
                              : theme.palette.primary.main,
                            transition: 'transform 0.1s',
                            '&:hover': {
                              transform: 'translateY(-1px)',
                              boxShadow: 2
                            }
                          }}
                          onClick={() => navigate(`/sport/${entry.sportId}`)}
                        >
                          <CardContent sx={{ p: { xs: 2, sm: 1.5 }, '&:last-child': { pb: { xs: 2, sm: 1.5 } } }}>
                            {/* ヘッダー行: スポーツ名と状態 */}
                            <Box sx={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center', 
                              mb: { xs: 1, sm: 0.5 }
                            }}>
                              <Typography 
                                variant="body1" 
                                fontWeight="bold" 
                                noWrap 
                                sx={{ 
                                  maxWidth: '70%',
                                  fontSize: { xs: '1rem', sm: '0.875rem' }
                                }}
                              >
                                {entry.sportName}
                              </Typography>
                              
                              {/* 確定/可能性の表示 */}
                              <Tooltip title={
                                entry.status === 'potential' 
                                  ? t('classSchedule.potentialMatch') 
                                  : t('classSchedule.confirmedMatch')
                              }>
                                <Chip
                                  icon={entry.status === 'potential' ? <PotentialIcon fontSize="small" /> : <ConfirmedIcon fontSize="small" />}
                                  label={t(`classSchedule.${entry.status === 'potential' ? 'potential' : 'confirmed'}`)}
                                  size="small"
                                  color={entry.status === 'potential' ? "warning" : "success"}
                                  variant="outlined"
                                  sx={{ 
                                    height: { xs: 24, sm: 20 }, 
                                    '& .MuiChip-label': { 
                                      px: 0.5, 
                                      fontSize: { xs: '0.8rem', sm: '0.7rem' } 
                                    } 
                                  }}
                                />
                              </Tooltip>
                            </Box>

                            {/* 確度バー（可能性の場合のみ） */}
                            {entry.status === 'potential' && entry.certainty !== undefined && (
                              <Box sx={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                mb: { xs: 1.2, sm: 0.7 },
                                gap: 0.5
                              }}>
                                <Typography variant="caption" sx={{ fontSize: { xs: '0.8rem', sm: '0.7rem' } }}>
                                  {t('classSchedule.certainty')}:
                                </Typography>
                                <Box 
                                  sx={{ 
                                    flexGrow: 1, 
                                    height: { xs: 6, sm: 4 }, 
                                    bgcolor: alpha(theme.palette.warning.main, 0.2),
                                    borderRadius: 0.5
                                  }}
                                >
                                  <Box 
                                    sx={{ 
                                      width: `${entry.certainty}%`, 
                                      height: '100%', 
                                      bgcolor: theme.palette.warning.main,
                                      borderRadius: 0.5
                                    }}
                                  />
                                </Box>
                                <Typography variant="caption" sx={{ 
                                  fontSize: { xs: '0.8rem', sm: '0.7rem' }, 
                                  minWidth: 24, 
                                  textAlign: 'right' 
                                }}>
                                  {entry.certainty}%
                                </Typography>
                              </Box>
                            )}
                            
                            <Divider sx={{ my: { xs: 1.2, sm: 0.7 } }} />
                            
                            {/* 対戦情報 */}
                            <Box sx={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'space-between',
                              gap: { xs: 1.5, sm: 1 },
                              mb: { xs: 1.2, sm: 0.7 }
                            }}>
                              <Typography 
                                variant="body1" 
                                fontWeight="bold" 
                                sx={{ 
                                  textAlign: 'right',
                                  flexBasis: '45%',
                                  color: selectedClasses.includes(entry.teams.team1Id) 
                                    ? theme.palette.primary.main 
                                    : 'inherit',
                                  fontSize: { xs: '1rem', sm: '0.875rem' }
                                }}
                              >
                                {entry.teams.team1Name}
                              </Typography>
                              <Typography 
                                variant="caption" 
                                sx={{ 
                                  flexShrink: 0,
                                  fontSize: { xs: '0.9rem', sm: '0.8rem' }
                                }}
                              >
                                vs
                              </Typography>
                              <Typography 
                                variant="body1" 
                                fontWeight="bold"
                                sx={{ 
                                  flexBasis: '45%',
                                  color: selectedClasses.includes(entry.teams.team2Id) 
                                    ? theme.palette.primary.main 
                                    : 'inherit',
                                  fontSize: { xs: '1rem', sm: '0.875rem' }
                                }}
                              >
                                {entry.teams.team2Name}
                              </Typography>
                            </Box>
                            
                            {/* 追加情報 */}
                            <Stack 
                              direction="row" 
                              spacing={0.5} 
                              flexWrap="wrap" 
                              useFlexGap 
                              sx={{ 
                                '& .MuiChip-root': { 
                                  height: { xs: 24, sm: 20 }, 
                                  '& .MuiChip-label': { 
                                    px: 0.5, 
                                    fontSize: { xs: '0.8rem', sm: '0.7rem' }
                                  },
                                  '& .MuiChip-icon': {
                                    fontSize: { xs: '0.85rem', sm: '0.75rem' },
                                    ml: 0.3,
                                    mr: '-0.05rem'
                                  }
                                }
                              }}
                            >
                              {entry.courtName && (
                                <Chip
                                  icon={<PlaceIcon fontSize="small" />}
                                  label={entry.courtName.replace(/コート|場|Court/gi, '')}
                                  size="small"
                                  variant="outlined"
                                />
                              )}
                              <Chip
                                icon={<TimeIcon fontSize="small" />}
                                label={`${entry.startTime}-${entry.endTime}`}
                                size="small"
                                variant="outlined"
                              />
                            </Stack>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </Paper>
            ))}
          </Stack>
        </Box>
      ))}
    </Box>
  );
};

export default ClassScheduleTimeline;
