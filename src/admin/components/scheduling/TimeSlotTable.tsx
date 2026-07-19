import React, { useMemo } from 'react';
import { Box, Chip, Typography } from '@mui/material';
import { getScheduleTypeLabel } from '../../../utils/labels';
import { Sport, TimeSlot } from '../../../types';
import { getMatchContext, getMatchupLabel, getTimeSlotLabel } from '../../../utils/match';
import { groupTimeSlotsByBlock } from '../../../utils/timeSlotGrouping';

interface TimeSlotTableProps {
  timeSlots: TimeSlot[];
  sport: Sport;
}

const typeColor: Record<TimeSlot['type'], 'primary' | 'secondary' | 'warning' | 'default'> = {
  match: 'primary',
  break: 'secondary',
  lunch: 'warning',
  preparation: 'default',
  cleanup: 'default'
};

const TimeSlotTable: React.FC<TimeSlotTableProps> = ({ timeSlots, sport }) => {
  const courtCount = sport.scheduleSettings?.courtCount || 1;
  const courtNames = sport.scheduleSettings?.courtNames;
  const blocks = useMemo(() => groupTimeSlotsByBlock(timeSlots), [timeSlots]);

  const renderSlotContent = (slot: TimeSlot) => {
    const match = slot.type === 'match' && slot.matchId
      ? sport.matches?.find(m => m.id === slot.matchId)
      : undefined;

    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
          <Chip size="small" variant="outlined" color={typeColor[slot.type]} label={getScheduleTypeLabel(slot.type)} />
        </Box>
        {match ? (
          <>
            <Typography variant="body2" fontWeight={600}>
              {getMatchupLabel(match, sport)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {getMatchContext(match, sport)}
            </Typography>
          </>
        ) : (
          <>
            <Typography variant="body2">{slot.title || getTimeSlotLabel(slot, sport) || getScheduleTypeLabel(slot.type)}</Typography>
            {slot.description && (
              <Typography variant="caption" color="text.secondary" display="block">
                {slot.description}
              </Typography>
            )}
          </>
        )}
      </Box>
    );
  };

  if (blocks.length === 0) return null;

  const courtColumns: Array<'court1' | 'court2'> = courtCount === 2 ? ['court1', 'court2'] : ['court1'];
  const gridTemplateColumns = `110px repeat(${courtColumns.length}, 1fr)`;

  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns,
          bgcolor: 'action.hover',
          fontSize: '0.8rem',
          fontWeight: 600
        }}
      >
        <Box sx={{ p: 1 }}>時間</Box>
        {courtColumns.map(court => (
          <Box key={court} sx={{ p: 1, borderLeft: '1px solid', borderColor: 'divider' }}>
            {courtNames?.[court] || (court === 'court1' ? '第1コート' : '第2コート')}
          </Box>
        ))}
      </Box>

      {blocks.map(block => (
        <Box key={block.key} sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
          {block.shared.length > 0 && (
            <Box sx={{ display: 'grid', gridTemplateColumns: '110px 1fr' }}>
              <Box sx={{ p: 1, fontSize: '0.8rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>
                {block.startTime} - {block.endTime}
              </Box>
              <Box sx={{ p: 1, borderLeft: '1px solid', borderColor: 'divider', display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {block.shared.map((slot, i) => (
                  <Box key={i}>{renderSlotContent(slot)}</Box>
                ))}
              </Box>
            </Box>
          )}
          {(courtColumns.some(court => block.byCourt[court]) || block.shared.length === 0) && (
            <Box sx={{ display: 'grid', gridTemplateColumns }}>
              <Box sx={{ p: 1, fontSize: '0.8rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>
                {block.shared.length === 0 && `${block.startTime} - ${block.endTime}`}
              </Box>
              {courtColumns.map(court => (
                <Box key={court} sx={{ p: 1, borderLeft: '1px solid', borderColor: 'divider', minHeight: 40 }}>
                  {block.byCourt[court] ? renderSlotContent(block.byCourt[court]!) : (
                    <Typography variant="caption" color="text.disabled">
                      -
                    </Typography>
                  )}
                </Box>
              ))}
            </Box>
          )}
        </Box>
      ))}
    </Box>
  );
};

export default TimeSlotTable;
