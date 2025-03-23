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
  useTheme
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
    const team = sport.teams.find(t => t.id === teamId);
    return team ? team.name : t('schedule.unknownTeam');
  };

  // 試合情報を取得する関数
  const getMatchInfo = (matchId: string): Match | undefined => {
    return sport.matches.find(m => m.id === matchId);
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

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell width="15%">{t('schedule.time')}</TableCell>
            <TableCell width="15%">{t('schedule.type')}</TableCell>
            <TableCell>{t('schedule.details')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {timeSlots.map((slot, index) => {
            const match = slot.matchId ? getMatchInfo(slot.matchId) : undefined;
            
            return (
              <TableRow key={index} sx={{ 
                bgcolor: slot.type === 'break' || slot.type === 'lunch' 
                  ? `${getTypeColor(slot.type)}10` 
                  : 'inherit'
              }}>
                <TableCell>
                  <Typography variant="body2">
                    {slot.startTime} - {slot.endTime}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={getTypeLabel(slot.type)}
                    size="small"
                    sx={{ 
                      bgcolor: `${getTypeColor(slot.type)}30`,
                      color: getTypeColor(slot.type),
                      borderColor: getTypeColor(slot.type)
                    }}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  {slot.type === 'match' && match ? (
                    <Box>
                      <Typography variant="body2">
                        {getTeamName(match.team1Id)} vs {getTeamName(match.team2Id)}
                      </Typography>
                      {match.location && (
                        <Typography variant="caption" color="text.secondary">
                          {t('schedule.location')}: {match.location}
                        </Typography>
                      )}
                    </Box>
                  ) : (
                    <Typography variant="body2">
                      {slot.title || getTypeLabel(slot.type)}
                      {slot.description && ` - ${slot.description}`}
                    </Typography>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
          
          {timeSlots.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} align="center">
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
