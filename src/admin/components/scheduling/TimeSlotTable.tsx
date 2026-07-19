import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Chip,
  Box
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { TimeSlot, Sport } from '../../../types';

interface TimeSlotTableProps {
  timeSlots: TimeSlot[];
  sport: Sport;
}

const TimeSlotTable: React.FC<TimeSlotTableProps> = ({ timeSlots, sport }) => {
  const { t } = useTranslation();
  
  // タイムスロットを時間順にソート
  const sortedTimeSlots = [...timeSlots].sort((a, b) => {
    return a.startTime.localeCompare(b.startTime);
  });
  
  // 各時間ごとにタイムスロットをグループ化
  const groupedTimeSlots: Record<string, TimeSlot[]> = {};
  sortedTimeSlots.forEach(slot => {
    const key = `${slot.startTime}-${slot.endTime}`;
    if (!groupedTimeSlots[key]) {
      groupedTimeSlots[key] = [];
    }
    groupedTimeSlots[key].push(slot);
  });
  
  // チーム名を取得する関数
  const getTeamName = (teamId?: string): string => {
    if (!teamId) return t('schedule.undetermined');
    const team = sport.teams.find(t => t.id === teamId);
    return team?.name || t('schedule.unknownTeam');
  };
  
  // 試合の説明を取得する関数
  const getMatchInfo = (slot: TimeSlot): React.ReactNode => {
    if (slot.type !== 'match') return null;
    
    // 対応する試合を探す
    const match = sport.matches?.find(m => m.id === slot.matchId);
    if (!match) return null;
    
    return (
      <Box>
        <Typography variant="body2" fontWeight="bold">
          {getTeamName(match.team1Id)} vs {getTeamName(match.team2Id)}
        </Typography>
        {slot.description && (
          <Typography variant="caption" color="text.secondary">
            {slot.description}
          </Typography>
        )}
      </Box>
    );
  };
  
  return (
    <TableContainer component={Paper}>
      <Table sx={{ minWidth: 650 }} size="small">
        <TableHead>
          <TableRow>
            <TableCell>{t('schedule.time')}</TableCell>
            <TableCell>{t('schedule.type')}</TableCell>
            <TableCell>{t('schedule.court')}</TableCell>
            <TableCell>{t('schedule.details')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {Object.entries(groupedTimeSlots).map(([timeKey, slots]) => (
            <React.Fragment key={timeKey}>
              {slots.map((slot, index) => (
                <TableRow key={`${timeKey}-${index}`} hover>
                  {index === 0 && (
                    <TableCell rowSpan={slots.length} sx={{ whiteSpace: 'nowrap' }}>
                      {`${slot.startTime} - ${slot.endTime}`}
                    </TableCell>
                  )}
                  <TableCell>
                    <Chip 
                      size="small"
                      label={t(`schedule.${slot.type}`)}
                      color={
                        slot.type === 'match' ? 'primary' :
                        slot.type === 'break' ? 'secondary' :
                        slot.type === 'lunch' ? 'warning' : 'default'
                      }
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    {slot.courtId && sport.scheduleSettings?.courtNames && (
                      sport.scheduleSettings.courtNames[slot.courtId]
                    )}
                  </TableCell>
                  <TableCell>
                    {slot.type === 'match' ? (
                      getMatchInfo(slot)
                    ) : (
                      <Typography variant="body2">
                        {slot.title || t(`schedule.${slot.type}`)}
                        {slot.description && (
                          <Typography variant="caption" display="block" color="text.secondary">
                            {slot.description}
                          </Typography>
                        )}
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default TimeSlotTable;
