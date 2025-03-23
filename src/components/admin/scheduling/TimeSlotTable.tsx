import React, { useMemo } from 'react';
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
  Stack,
  Grid
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { TimeSlot, Sport, Match, Team } from '../../../types/index';

interface TimeSlotTableProps {
  timeSlots: TimeSlot[];
  sport: Sport;
}

// 同時開催試合をグループ化するための型
interface GroupedTimeSlot {
  startTime: string;
  endTime: string;
  slots: TimeSlot[];
}

const TimeSlotTable: React.FC<TimeSlotTableProps> = ({ timeSlots, sport }) => {
  const { t } = useTranslation();
  const theme = useTheme();

  // 同時開催される試合をグループ化
  const groupedTimeSlots = useMemo(() => {
    const groups: GroupedTimeSlot[] = [];
    const sortedSlots = [...timeSlots].sort((a, b) => 
      a.startTime.localeCompare(b.startTime) || a.endTime.localeCompare(b.endTime)
    );

    sortedSlots.forEach(slot => {
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
          slots: [slot]
        });
      }
    });

    return groups;
  }, [timeSlots]);

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

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell width="15%">{t('schedule.time')}</TableCell>
            <TableCell width="15%">{t('schedule.type')}</TableCell>
            <TableCell width="15%">{t('schedule.venue')}</TableCell>
            <TableCell>{t('schedule.details')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {groupedTimeSlots.map((group, groupIndex) => (
            <React.Fragment key={`group-${groupIndex}`}>
              {/* 時間枠のグループヘッダー - 同時開催の場合 */}
              {group.slots.length > 1 && (
                <TableRow>
                  <TableCell colSpan={4} sx={{ 
                    py: 1, 
                    backgroundColor: theme.palette.action.hover,
                    borderLeft: `4px solid ${theme.palette.primary.main}`
                  }}>
                    <Typography variant="subtitle2">
                      {group.startTime} - {group.endTime}
                      <Chip 
                        size="small" 
                        label={t('schedule.concurrent', { count: group.slots.length })} 
                        sx={{ ml: 1, backgroundColor: theme.palette.primary.light }} 
                      />
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              
              {/* 各タイムスロットを表示 */}
              {group.slots.map((slot, slotIndex) => {
                const match = slot.matchId ? getMatchInfo(slot.matchId) : undefined;
                const isMultiVenue = group.slots.length > 1;
                
                return (
                  <TableRow key={`slot-${groupIndex}-${slotIndex}`} sx={{ 
                    bgcolor: slot.type === 'break' || slot.type === 'lunch' 
                      ? `${getTypeColor(slot.type)}10` 
                      : isMultiVenue
                      ? `${getVenueColor(slot.venueId || 'default')}10`
                      : 'inherit',
                    '& > td': {
                      borderLeft: isMultiVenue && slot.type === 'match'
                        ? `4px solid ${getVenueColor(slot.venueId || 'default')}`
                        : 'none'
                    }
                  }}>
                    {/* 時間 - 同時開催でない場合のみ表示 */}
                    <TableCell>
                      {!isMultiVenue && (
                        <Typography variant="body2">
                          {slot.startTime} - {slot.endTime}
                        </Typography>
                      )}
                    </TableCell>
                    
                    {/* タイプ */}
                    <TableCell>
                      <Chip
                        label={getTypeLabel(slot.type)}
                        size="small"
                        sx={{ 
                          bgcolor: `${getTypeColor(slot.type)}30`,
                          color: getTypeColor(slot.type),
                          borderColor: getTypeColor(slot.type),
                          fontWeight: 'medium'
                        }}
                        variant="outlined"
                      />
                    </TableCell>
                    
                    {/* 会場 */}
                    <TableCell>
                      {slot.venueName ? (
                        <Chip
                          label={slot.venueName}
                          size="small"
                          sx={{ 
                            bgcolor: `${getVenueColor(slot.venueId || 'default')}30`,
                            color: theme.palette.text.primary,
                            borderColor: getVenueColor(slot.venueId || 'default')
                          }}
                          variant="outlined"
                        />
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          -
                        </Typography>
                      )}
                    </TableCell>
                    
                    {/* 詳細 */}
                    <TableCell>
                      {slot.type === 'match' && match ? (
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {getTeamName(match.team1Id)} vs {getTeamName(match.team2Id)}
                          </Typography>
                          {(match.location || slot.description) && (
                            <Typography variant="caption" color="text.secondary">
                              {match.location && `${t('schedule.location')}: ${match.location}`}
                              {match.location && slot.description && ' - '}
                              {slot.description}
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
              
              {/* グループ間のスペース */}
              {groupIndex < groupedTimeSlots.length - 1 && (
                <TableRow>
                  <TableCell colSpan={4} sx={{ p: 0.5 }} />
                </TableRow>
              )}
            </React.Fragment>
          ))}
          
          {groupedTimeSlots.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} align="center">
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
