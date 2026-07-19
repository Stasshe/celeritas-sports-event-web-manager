import React, { useMemo } from 'react';
import { Box, Chip, LinearProgress, Paper, Typography, alpha, useTheme } from '@mui/material';
import {
  AccessTime as TimeIcon,
  Place as PlaceIcon,
  CheckCircle as ConfirmedIcon,
  Help as PotentialIcon
} from '@mui/icons-material';
import { timeToMinutes } from '../../../utils/scheduleGenerator';
import { ClassScheduleEntry } from '../../../types';
import { useNavigate } from 'react-router-dom';

interface ClassScheduleTimelineProps {
  scheduleEntries: ClassScheduleEntry[];
  selectedClasses: string[];
}

interface DateGroup {
  date: string;
  formattedDate: string;
  timeGroups: { time: string; entries: ClassScheduleEntry[] }[];
}

const groupEntries = (entries: ClassScheduleEntry[]): DateGroup[] => {
  const byDate = new Map<string, ClassScheduleEntry[]>();
  entries.forEach(entry => {
    const dateKey = entry.date || '日付未定';
    if (!byDate.has(dateKey)) byDate.set(dateKey, []);
    byDate.get(dateKey)!.push(entry);
  });

  const groups: DateGroup[] = [...byDate.entries()].map(([dateKey, dateEntries]) => {
    const byTime = new Map<string, ClassScheduleEntry[]>();
    dateEntries.forEach(entry => {
      if (!byTime.has(entry.startTime)) byTime.set(entry.startTime, []);
      byTime.get(entry.startTime)!.push(entry);
    });

    const timeGroups = [...byTime.entries()]
      .sort(([a], [b]) => timeToMinutes(a) - timeToMinutes(b))
      .map(([time, timeEntries]) => ({
        time,
        entries: [...timeEntries].sort((a, b) => {
          if (a.status === 'potential' && b.status !== 'potential') return 1;
          if (a.status !== 'potential' && b.status === 'potential') return -1;
          return (b.certainty ?? 0) - (a.certainty ?? 0);
        })
      }));

    return {
      date: dateKey,
      formattedDate: dateKey !== '日付未定' ? new Date(dateKey).toLocaleDateString() : '日付未定',
      timeGroups
    };
  });

  return groups.sort((a, b) => {
    if (a.date === '日付未定') return 1;
    if (b.date === '日付未定') return -1;
    return a.date.localeCompare(b.date);
  });
};

const ClassScheduleTimeline: React.FC<ClassScheduleTimelineProps> = ({ scheduleEntries, selectedClasses }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const dateGroups = useMemo(() => groupEntries(scheduleEntries), [scheduleEntries]);

  if (scheduleEntries.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          スケジュールが見つかりません
        </Typography>
      </Paper>
    );
  }

  const isHighlighted = (teamId: string) => selectedClasses.includes(teamId);

  return (
    <Box>
      {dateGroups.map(dateGroup => (
        <Box key={dateGroup.date} sx={{ mb: 3 }}>
          <Typography
            variant="subtitle1"
            fontWeight={700}
            sx={{ px: 1.5, py: 0.75, mb: 1.5, bgcolor: 'primary.main', color: 'primary.contrastText', borderRadius: 1 }}
          >
            {dateGroup.formattedDate}
          </Typography>

          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
            {dateGroup.timeGroups.map((timeGroup, index) => (
              <Box
                key={timeGroup.time}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '90px 1fr' },
                  borderTop: index === 0 ? 'none' : '1px solid',
                  borderColor: 'divider'
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    p: 1,
                    bgcolor: alpha(theme.palette.primary.main, 0.06),
                    fontSize: '0.85rem',
                    fontWeight: 600
                  }}
                >
                  <TimeIcon fontSize="small" color="action" />
                  {timeGroup.time}
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  {timeGroup.entries.map((entry, i) => (
                    <Box
                      key={`${entry.sportId}-${entry.matchId}`}
                      onClick={() => navigate(`/sport/${entry.sportId}`)}
                      sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: 1,
                        p: 1,
                        cursor: 'pointer',
                        borderTop: i === 0 ? 'none' : '1px solid',
                        borderColor: 'divider',
                        borderLeft: '3px solid',
                        borderLeftColor: entry.status === 'potential' ? 'warning.main' : 'primary.main',
                        '&:hover': { bgcolor: 'action.hover' }
                      }}
                    >
                      <Chip size="small" label={entry.sportName} sx={{ fontWeight: 600 }} />

                      <Typography
                        variant="body2"
                        fontWeight={isHighlighted(entry.teams.team1Id) ? 700 : 400}
                        color={isHighlighted(entry.teams.team1Id) ? 'primary.main' : 'text.primary'}
                      >
                        {entry.teams.team1Name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        vs
                      </Typography>
                      <Typography
                        variant="body2"
                        fontWeight={isHighlighted(entry.teams.team2Id) ? 700 : 400}
                        color={isHighlighted(entry.teams.team2Id) ? 'primary.main' : 'text.primary'}
                      >
                        {entry.teams.team2Name}
                      </Typography>

                      <Box sx={{ flexGrow: 1 }} />

                      {entry.courtName && (
                        <Chip size="small" variant="outlined" icon={<PlaceIcon fontSize="small" />} label={entry.courtName} />
                      )}
                      <Chip size="small" variant="outlined" label={`${entry.startTime}-${entry.endTime}`} />

                      {entry.status === 'potential' ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 90 }}>
                          <Chip size="small" color="warning" variant="outlined" icon={<PotentialIcon fontSize="small" />} label="可能性" />
                          {entry.certainty !== undefined && (
                            <Box sx={{ flexGrow: 1, minWidth: 40 }}>
                              <LinearProgress
                                variant="determinate"
                                value={entry.certainty}
                                color="warning"
                                sx={{ height: 4, borderRadius: 2 }}
                              />
                            </Box>
                          )}
                        </Box>
                      ) : (
                        <Chip size="small" color="success" variant="outlined" icon={<ConfirmedIcon fontSize="small" />} label="確定" />
                      )}
                    </Box>
                  ))}
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );
};

export default ClassScheduleTimeline;
