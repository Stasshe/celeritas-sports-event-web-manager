import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIndicatorIcon
} from '@mui/icons-material';
import { Sport, TimeSlot } from '../../../types';
import { useManualScheduleRows } from '../../../hooks/useManualScheduleRows';
import { getTimeSlotLabel } from '../../../utils/match';

interface ManualScheduleEditorProps {
  open: boolean;
  onClose: () => void;
  timeSlots: TimeSlot[];
  onChange: (slots: TimeSlot[]) => void;
  courtNames?: { court1: string; court2?: string };
  sport: Sport;
}

const timeSlotTypes: { value: TimeSlot['type']; label: string }[] = [
  { value: 'match', label: '試合' },
  { value: 'break', label: '休憩' },
  { value: 'lunch', label: '昼休憩' },
  { value: 'preparation', label: '準備' },
  { value: 'cleanup', label: '片付け' }
];

const ManualScheduleEditor: React.FC<ManualScheduleEditorProps> = ({
  open,
  onClose,
  timeSlots,
  onChange,
  courtNames,
  sport
}) => {
  const rows = useManualScheduleRows(timeSlots, onChange);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const handleDrop = (targetIndex: number) => {
    if (dragIndex !== null) rows.reorder(dragIndex, targetIndex);
    setDragIndex(null);
    setDropIndex(null);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>スケジュール手動編集</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={rows.addRow}>
            行を追加
          </Button>
          <FormControlLabel
            control={
              <Switch
                checked={rows.moveTimes}
                onChange={e => rows.setMoveTimes(e.target.checked)}
              />
            }
            label="並べ替え時に時間も移動"
          />
        </Box>

        {timeSlots.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
            行がありません。「行を追加」から作成してください
          </Typography>
        ) : (
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            {/* ヘッダー */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '32px 1fr 110px 110px 1fr 40px',
                gap: 1,
                px: 1.5,
                py: 1,
                bgcolor: 'action.hover',
                fontSize: '0.75rem',
                color: 'text.secondary'
              }}
            >
              <span />
              <span>時間</span>
              <span>タイプ</span>
              <span>コート</span>
              <span>詳細</span>
              <span />
            </Box>
            <Divider />

            {timeSlots.map((slot, index) => {
              const hasLinkedMatch = slot.type === 'match'
                && Boolean(slot.matchId && sport.matches.some(match => match.id === slot.matchId));
              let detail = slot.matchDescription ?? slot.description ?? slot.title ?? '';
              if (hasLinkedMatch) detail = getTimeSlotLabel(slot, sport);

              return (
                <Box
                  key={index}
                  draggable
                  onDragStart={() => setDragIndex(index)}
                  onDragOver={e => {
                    e.preventDefault();
                    if (dropIndex !== index) setDropIndex(index);
                  }}
                  onDrop={() => handleDrop(index)}
                  onDragEnd={() => {
                    setDragIndex(null);
                    setDropIndex(null);
                  }}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '32px 1fr 110px 110px 1fr 40px',
                    gap: 1,
                    px: 1.5,
                    py: 1,
                    alignItems: 'center',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    bgcolor: dropIndex === index ? 'action.selected' : 'transparent',
                    opacity: dragIndex === index ? 0.4 : 1,
                    '&:last-of-type': { borderBottom: 'none' }
                  }}
                >
                  <DragIndicatorIcon
                    fontSize="small"
                    sx={{ color: 'text.disabled', cursor: 'grab' }}
                  />

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <TextField
                      type="time"
                      size="small"
                      value={slot.startTime}
                      onChange={e => rows.updateField(index, 'startTime', e.target.value)}
                      sx={{ minWidth: 100 }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      ～
                    </Typography>
                    <TextField
                      type="time"
                      size="small"
                      value={slot.endTime}
                      onChange={e => rows.updateField(index, 'endTime', e.target.value)}
                      sx={{ minWidth: 100 }}
                    />
                  </Box>

                  <Select
                    size="small"
                    value={slot.type}
                    onChange={e => rows.updateField(index, 'type', e.target.value)}
                  >
                    {timeSlotTypes.map(opt => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Select>

                  <Select
                    size="small"
                    value={slot.courtId || 'court1'}
                    onChange={e => rows.updateField(index, 'courtId', e.target.value)}
                  >
                    <MenuItem value="court1">{courtNames?.court1 || '第1コート'}</MenuItem>
                    {courtNames?.court2 && <MenuItem value="court2">{courtNames.court2}</MenuItem>}
                  </Select>

                  <TextField
                    size="small"
                    value={detail}
                    onChange={e => rows.updateField(index, 'matchDescription', e.target.value)}
                    placeholder="例: 1年A vs 2年B"
                    inputProps={{ maxLength: 100 }}
                    InputProps={{ readOnly: hasLinkedMatch }}
                  />

                  <IconButton size="small" onClick={() => rows.removeRow(index)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              );
            })}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          閉じる
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ManualScheduleEditor;
