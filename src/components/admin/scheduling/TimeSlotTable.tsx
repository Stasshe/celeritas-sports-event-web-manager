import React from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  Box,
  useTheme,
  Divider,
  Grid
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { TimeSlot, Sport, Match, Team } from '../../../types/index';

interface TimeSlotTableProps {
  timeSlots: TimeSlot[];
  sport: Sport;
}

const TimeSlotTable: React.FC<TimeSlotTableProps> = ({ timeSlots, sport }) => {
  const { t } = useTranslation();
  const theme = useTheme();

  // チーム名を取得する関数
  const getTeamName = (teamId: string): string => {
    const team = sport.teams?.find(t => t.id === teamId);
    return team ? team.name : t('schedule.unknownTeam');
  };

  // 試合情報を取得する関数
  const getMatchInfo = (matchId: string): Match | undefined => {
    return sport.matches?.find(m => m.id === matchId);
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

  // 時間枠の種類に応じたラベルを取得
  const getTypeLabel = (type: TimeSlot['type']) => {
    switch (type) {
      case 'match':
        return t('schedule.match');
      case 'break':
        return t('schedule.break');
      case 'lunch':
        return t('schedule.lunch');
      case 'preparation':
        return t('schedule.preparation');
      case 'cleanup':
        return t('schedule.cleanup');
      default:
        return type;
    }
  };

  // コート名を取得
  const getCourtName = (courtId?: 'court1' | 'court2'): string => {
    if (!courtId) return '';
    return sport.scheduleSettings?.courtNames?.[courtId] || 
           (courtId === 'court1' ? '第1コート' : '第2コート');
  };

  // 時間でグループ化して表示する
  const timeSlotsByTime: { [key: string]: TimeSlot[] } = {};
  timeSlots.forEach(slot => {
    if (!timeSlotsByTime[slot.startTime]) {
      timeSlotsByTime[slot.startTime] = [];
    }
    timeSlotsByTime[slot.startTime].push(slot);
  });

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell width="15%">{t('schedule.time')}</TableCell>
            <TableCell>{t('schedule.activities')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {Object.entries(timeSlotsByTime)
            .sort(([timeA], [timeB]) => timeA.localeCompare(timeB))
            .map(([time, slots]) => (
              <TableRow key={time}>
                <TableCell>
                  <Typography variant="body2" fontWeight="bold">
                    {slots[0].startTime} - {slots[0].endTime}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Grid container spacing={2}>
                    {slots.map((slot, idx) => (
                      <Grid item xs={12} md={slot.type === 'match' ? 6 : 12} key={idx}>
                        <Box 
                          sx={{ 
                            p: 1, 
                            borderLeft: `4px solid ${getTypeColor(slot.type)}`,
                            bgcolor: `${getTypeColor(slot.type)}10`,
                            borderRadius: 1,
                            mb: 1
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                            <Chip
                              label={getTypeLabel(slot.type)}
                              size="small"
                              sx={{ 
                                mr: 1,
                                bgcolor: `${getTypeColor(slot.type)}20`,
                                color: getTypeColor(slot.type),
                                borderColor: getTypeColor(slot.type)
                              }}
                              variant="outlined"
                            />
                            {slot.courtId && (
                              <Chip
                                label={getCourtName(slot.courtId)}
                                size="small"
                                variant="outlined"
                              />
                            )}
                          </Box>
                          
                          {slot.type === 'match' && slot.matchId ? (
                            (() => {
                              const match = getMatchInfo(slot.matchId);
                              return match ? (
                                <Box>
                                  <Typography variant="body2" fontWeight="medium">
                                    {getTeamName(match.team1Id)} vs {getTeamName(match.team2Id)}
                                  </Typography>
                                  {slot.description && (
                                    <Typography variant="caption" color="text.secondary">
                                      {slot.description}
                                    </Typography>
                                  )}
                                </Box>
                              ) : null;
                            })()
                          ) : (
                            <Typography variant="body2">
                              {slot.title || getTypeLabel(slot.type)}
                              {slot.description && ` - ${slot.description}`}
                            </Typography>
                          )}
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </TableCell>
              </TableRow>
            ))}
          
          {Object.keys(timeSlotsByTime).length === 0 && (
            <TableRow>
              <TableCell colSpan={2} align="center">
                {t('schedule.noTimeSlots')}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default TimeSlotTable;
