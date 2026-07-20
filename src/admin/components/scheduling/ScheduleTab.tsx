import React, { useRef, useState } from 'react';
import { Box, Button, Chip, Paper, Typography } from '@mui/material';
import {
  CalendarMonthOutlined as EmptyScheduleIcon,
  ExpandLess as ExpandLessIcon,
  Tune as TuneIcon
} from '@mui/icons-material';
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
  const hasInitialSchedule = (sport.scheduleSettings?.timeSlots?.length || 0) > 0;
  const [settingsOpen, setSettingsOpen] = useState(!hasInitialSchedule);
  const [editing, setEditing] = useState(false);
  const timeSlotsRef = useRef<TimeSlot[]>(sport.scheduleSettings?.timeSlots || []);

  const form = useScheduleSettingsForm({ sport, getTimeSlots: () => timeSlotsRef.current, onUpdate });
  const history = useScheduleHistory({ sport, settings: form.settings, onUpdate });
  timeSlotsRef.current = history.timeSlots;

  const courtCount = form.settings.courtCount || 1;
  let scheduleRange = '未生成';
  if (history.timeSlots.length > 0) {
    const startTimes = history.timeSlots.map(slot => slot.startTime).filter(Boolean).sort();
    const endTimes = history.timeSlots.map(slot => slot.endTime).filter(Boolean).sort();
    if (startTimes.length > 0 && endTimes.length > 0) {
      scheduleRange = `${startTimes[0]}–${endTimes[endTimes.length - 1]}`;
    }
  }

  let settingsButtonLabel = '生成条件を開く';
  let settingsButtonIcon: React.ReactNode;
  if (settingsOpen) settingsButtonLabel = '生成条件を閉じる';
  if (settingsOpen) settingsButtonIcon = <ExpandLessIcon />;
  let mobileSettingsDisplay = 'none';
  if (settingsOpen) mobileSettingsDisplay = 'block';

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          gap: 1.5,
          mb: 2
        }}
      >
        <Box>
          <Typography variant="h5" component="h2" fontWeight={700}>
            運営スケジュール
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            生成条件の調整から当日の並び替えまで、この画面で完結します。
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          <Chip size="small" label={`${history.timeSlots.length}枠`} />
          <Chip size="small" label={`${courtCount}コート`} />
          <Chip size="small" variant="outlined" label={scheduleRange} />
        </Box>
      </Box>

      <Button
        fullWidth
        variant="outlined"
        startIcon={<TuneIcon />}
        endIcon={settingsButtonIcon}
        onClick={() => setSettingsOpen(current => !current)}
        aria-expanded={settingsOpen}
        sx={{ display: { xs: 'flex', lg: 'none' }, minHeight: 48, mb: 1.5, justifyContent: 'flex-start' }}
      >
        {settingsButtonLabel}
      </Button>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: '340px minmax(0, 1fr)' },
          gap: 2,
          alignItems: 'start'
        }}
      >
        <Box
          sx={{
            display: { xs: mobileSettingsDisplay, lg: 'block' },
            position: { lg: 'sticky' },
            top: { lg: 16 }
          }}
        >
          <Paper variant="outlined" sx={{ overflow: 'hidden', containerType: 'inline-size' }}>
            <Box sx={{ px: 2, py: 1.5, bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle1" fontWeight={700}>生成条件</Typography>
              <Typography variant="caption" color="text.secondary">変更内容は自動保存されます</Typography>
            </Box>
            <ScheduleBasicSettingsCard sport={sport} settings={form.settings} form={form} />
            <ScheduleBreakSettingsCard settings={form.settings} form={form} />
          </Paper>
        </Box>

        <Paper variant="outlined" sx={{ minWidth: 0, overflow: 'hidden' }}>
          <ScheduleActionBar
            history={history}
            hasMatches={(sport.matches?.length || 0) > 0}
            editing={editing}
            onEditingChange={setEditing}
          />

          {editing && (
            <ManualScheduleEditor
              timeSlots={history.timeSlots}
              onChange={history.applyManualEdit}
              courtNames={form.settings.courtNames}
              sport={sport}
            />
          )}

          {!editing && history.timeSlots.length > 0 && (
            <TimeSlotTable timeSlots={history.timeSlots} sport={sport} />
          )}

          {!editing && history.timeSlots.length === 0 && (
            <Box sx={{ px: 2, py: { xs: 7, sm: 10 }, textAlign: 'center' }}>
              <EmptyScheduleIcon sx={{ width: 40, height: 40, color: 'text.disabled' }} />
              <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 1 }}>
                進行表はまだありません
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                生成条件を確認して「自動生成」を押してください。
              </Typography>
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
};

export default ScheduleTab;
