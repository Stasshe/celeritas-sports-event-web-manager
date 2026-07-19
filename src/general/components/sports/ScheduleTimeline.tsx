import React, { useMemo } from 'react';
import { Alert, Box, Chip, Typography, useMediaQuery, useTheme } from '@mui/material';
import { Schedule as ScheduleIcon, Place as PlaceIcon } from '@mui/icons-material';
import { getScheduleTypeLabel } from '../../../utils/labels';
import { Sport, TimeSlot } from '../../../types';
import { getMatchContext, getParticipantName } from '../../../utils/match';
import { groupTimeSlotsByBlock } from '../../../utils/timeSlotGrouping';

interface ScheduleTimelineProps {
  sport: Sport;
}

const typeColor: Record<TimeSlot['type'], 'primary' | 'secondary' | 'warning' | 'default'> = {
  match: 'primary',
  break: 'secondary',
  lunch: 'warning',
  preparation: 'default',
  cleanup: 'default'
};

const ScheduleTimeline: React.FC<ScheduleTimelineProps> = ({ sport }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const timeSlots = sport.scheduleSettings?.timeSlots || [];
  const courtCount = sport.scheduleSettings?.courtCount || 1;
  const courtNames = sport.scheduleSettings?.courtNames;
  const blocks = useMemo(() => groupTimeSlotsByBlock(timeSlots), [timeSlots]);

  if (blocks.length === 0) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        このスポーツにはスケジュールがありません
      </Alert>
    );
  }

  const courtColumns: Array<'court1' | 'court2'> = courtCount === 2 && !isMobile ? ['court1', 'court2'] : ['court1'];
  const showCourtColumn = courtColumns.length > 1;
  const gridTemplateColumns = `${isMobile ? 76 : 100}px repeat(${courtColumns.length}, 1fr)`;

  const getCourtName = (court: 'court1' | 'court2') =>
    courtNames?.[court] || (court === 'court1' ? '第1コート' : '第2コート');

  const renderSlot = (slot: TimeSlot, showCourtChip: boolean) => {
    const match = slot.type === 'match' && slot.matchId ? sport.matches?.find(m => m.id === slot.matchId) : undefined;

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
          <Chip size="small" variant="outlined" color={typeColor[slot.type]} label={getScheduleTypeLabel(slot.type)} />
          {showCourtChip && slot.courtId && (
            <Chip size="small" variant="outlined" icon={<PlaceIcon fontSize="small" />} label={getCourtName(slot.courtId)} />
          )}
        </Box>
        {match ? (
          <>
            <Typography variant="body1" fontWeight={700}>
              {getParticipantName(match, 'team1', sport)} <Typography component="span" variant="body2" color="text.secondary">vs</Typography> {getParticipantName(match, 'team2', sport)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {getMatchContext(match, sport)}
              {match.location ? ` ・ ${match.location}` : ''}
            </Typography>
          </>
        ) : (
          <Typography variant="body2">{slot.title || getScheduleTypeLabel(slot.type)}</Typography>
        )}
      </Box>
    );
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ScheduleIcon fontSize="small" />
        タイムライン
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        開催時間: {sport.scheduleSettings?.startTime} - {sport.scheduleSettings?.endTime}
      </Typography>

      <Box sx={{ mt: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
        {showCourtColumn && (
          <Box sx={{ display: 'grid', gridTemplateColumns, bgcolor: 'action.hover', fontSize: '0.8rem', fontWeight: 600 }}>
            <Box sx={{ p: 1 }}>時間</Box>
            {courtColumns.map(court => (
              <Box key={court} sx={{ p: 1, borderLeft: '1px solid', borderColor: 'divider' }}>
                {getCourtName(court)}
              </Box>
            ))}
          </Box>
        )}

        {blocks.map(block => {
          const hasCourtContent = courtColumns.some(court => block.byCourt[court]);
          return (
            <Box key={block.key} sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
              {block.shared.length > 0 && (
                <Box sx={{ display: 'grid', gridTemplateColumns: `${isMobile ? 76 : 100}px 1fr` }}>
                  <Box sx={{ p: 1, fontSize: '0.8rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>
                    {block.startTime}-{block.endTime}
                  </Box>
                  <Box sx={{ p: 1, borderLeft: '1px solid', borderColor: 'divider' }}>
                    {block.shared.map((slot, i) => (
                      <Box key={i}>{renderSlot(slot, false)}</Box>
                    ))}
                  </Box>
                </Box>
              )}
              {(hasCourtContent || block.shared.length === 0) && (
                <Box sx={{ display: 'grid', gridTemplateColumns }}>
                  <Box sx={{ p: 1, fontSize: '0.8rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>
                    {block.shared.length === 0 && `${block.startTime}-${block.endTime}`}
                  </Box>
                  {courtColumns.map(court => (
                    <Box key={court} sx={{ p: 1, borderLeft: '1px solid', borderColor: 'divider', minHeight: 44 }}>
                      {block.byCourt[court] ? (
                        renderSlot(block.byCourt[court]!, !showCourtColumn)
                      ) : (
                        <Typography variant="caption" color="text.disabled">-</Typography>
                      )}
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default ScheduleTimeline;
