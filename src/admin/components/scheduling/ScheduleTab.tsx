import React, { useRef, useState } from 'react';
import { Box, Divider, Paper, Typography } from '@mui/material';
import { Sport, TimeSlot } from '../../../types';
import { useScheduleSettingsForm } from '../../../hooks/useScheduleSettingsForm';
import { useScheduleHistory } from '../../../hooks/useScheduleHistory';
import ScheduleBasicSettingsCard from './ScheduleBasicSettingsCard';
import ScheduleBreakSettingsCard from './ScheduleBreakSettingsCard';
import ScheduleActionBar from './ScheduleActionBar';
import ManualScheduleEditor from './ManualScheduleEditor';
import TimeSlotTable from './TimeSlotTable';

interface ScheduleTabProps {
  sport: Sport;
  onUpdate: (updatedSport: Sport) => void;
}

const ScheduleTab: React.FC<ScheduleTabProps> = ({ sport, onUpdate }) => {
  const [manualEditorOpen, setManualEditorOpen] = useState(false);

  // settings側の即時保存が最新timeSlotsを含められるよう、レンダー毎に同期するref
  const timeSlotsRef = useRef<TimeSlot[]>(sport.scheduleSettings?.timeSlots || []);

  const form = useScheduleSettingsForm({ sport, getTimeSlots: () => timeSlotsRef.current, onUpdate });
  const history = useScheduleHistory({ sport, settings: form.settings, onUpdate });
  timeSlotsRef.current = history.timeSlots;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        スケジュール
      </Typography>
      <Divider sx={{ mb: 3 }} />

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: { xs: 2, lg: 3 } }}>
        <ScheduleBasicSettingsCard sport={sport} settings={form.settings} form={form} />
        <ScheduleBreakSettingsCard settings={form.settings} form={form} />
      </Box>

      <Box sx={{ mt: 3 }}>
        <ScheduleActionBar
          history={history}
          hasMatches={(sport.matches?.length || 0) > 0}
          onOpenManualEditor={() => setManualEditorOpen(true)}
        />
      </Box>

      <Box sx={{ mt: 3 }}>
        {history.timeSlots.length > 0 ? (
          <TimeSlotTable timeSlots={history.timeSlots} sport={sport} />
        ) : (
          <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              スケジュールはまだ生成されていません
            </Typography>
          </Paper>
        )}
      </Box>

      <ManualScheduleEditor
        open={manualEditorOpen}
        onClose={() => setManualEditorOpen(false)}
        timeSlots={history.timeSlots}
        onChange={history.applyManualEdit}
        courtNames={form.settings.courtNames}
        sport={sport}
      />
    </Box>
  );
};

export default ScheduleTab;
