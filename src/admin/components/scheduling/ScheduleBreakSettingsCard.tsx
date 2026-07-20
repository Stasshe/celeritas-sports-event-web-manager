import React from 'react';
import {
  Box,
  Button,
  Chip,
  Divider,
  FormControlLabel,
  Switch,
  TextField,
  Typography
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { LeagueScheduleSettings, ScheduleSettings } from '../../../types';
import { ScheduleSettingsForm } from '../../../hooks/useScheduleSettingsForm';

interface ScheduleBreakSettingsCardProps {
  settings: ScheduleSettings | LeagueScheduleSettings;
  form: ScheduleSettingsForm;
}

const ScheduleBreakSettingsCard: React.FC<ScheduleBreakSettingsCardProps> = ({ settings, form }) => {
  return (
    <Box sx={{ p: { xs: 1.5, sm: 2 }, borderTop: '1px solid', borderColor: 'divider' }}>
      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        休憩設定
      </Typography>
      <Divider sx={{ mb: 2 }} />

      <FormControlLabel
        control={
          <Switch
            checked={form.hasLunchBreak}
            onChange={e => form.handleLunchBreakToggle(e.target.checked)}
          />
        }
        label="昼休みを含める"
      />

      {form.hasLunchBreak && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mt: 1.5 }}>
          <TextField
            fullWidth
            size="small"
            label="昼休み開始時間"
            type="time"
            value={settings.lunchBreak?.startTime || '12:00'}
            onChange={e => form.handleLunchBreakChange('startTime', e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            fullWidth
            size="small"
            label="昼休み終了時間"
            type="time"
            value={settings.lunchBreak?.endTime || '13:00'}
            onChange={e => form.handleLunchBreakChange('endTime', e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Box>
      )}

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle2" gutterBottom>
        追加の休憩
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          gap: 1.5,
          alignItems: 'flex-end'
        }}
      >
        <TextField
          fullWidth
          size="small"
          label="開始時間"
          type="time"
          value={form.newBreakTime.startTime}
          onChange={e => form.handleNewBreakTimeChange('startTime', e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          fullWidth
          size="small"
          label="終了時間"
          type="time"
          value={form.newBreakTime.endTime}
          onChange={e => form.handleNewBreakTimeChange('endTime', e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          fullWidth
          size="small"
          label="タイトル"
          value={form.newBreakTime.title || ''}
          onChange={e => form.handleNewBreakTimeChange('title', e.target.value)}
          sx={{ gridColumn: { sm: '1 / -1' } }}
        />
        <Button
          variant="contained"
          onClick={form.handleAddBreakTime}
          aria-label="休憩を追加"
          sx={{ height: 40, minHeight: { xs: 44, sm: 40 }, gridColumn: { sm: '1 / -1' } }}
        >
          <AddIcon fontSize="small" />
        </Button>
      </Box>

      <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {(settings.breakTimes || []).length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            追加の休憩はありません
          </Typography>
        ) : (
          (settings.breakTimes || []).map((breakTime, index) => (
            <Chip
              key={index}
              label={`${breakTime.title || '休憩'}: ${breakTime.startTime} - ${breakTime.endTime}`}
              onDelete={() => form.handleRemoveBreakTime(index)}
              color="secondary"
              variant="outlined"
            />
          ))
        )}
      </Box>
    </Box>
  );
};

export default ScheduleBreakSettingsCard;
