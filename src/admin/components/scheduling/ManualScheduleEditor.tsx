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
  Typography,
  useMediaQuery,
  useTheme
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const rows = useManualScheduleRows(timeSlots, onChange);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const handleDrop = (targetIndex: number) => {
    if (dragIndex !== null) rows.reorder(dragIndex, targetIndex);
    setDragIndex(null);
    setDropIndex(null);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth fullScreen={isMobile}>
      <DialogTitle>スケジュール手動編集</DialogTitle>
      <DialogContent>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'stretch', sm: 'center' },
            justifyContent: 'space-between',
            gap: 1,
            mb: 2
          }}
        >
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
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
            {/* ヘッダー */}
            <Box
              sx={{
                display: { xs: 'none', sm: 'grid' },
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
                  draggable={!isMobile}
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
                    gridTemplateColumns: { xs: 'minmax(0, 1fr) 44px', sm: '32px 1fr 110px 110px 1fr 40px' },
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
                    sx={{ display: { xs: 'none', sm: 'block' }, color: 'text.disabled', cursor: 'grab' }}
                  />

                  <Box sx={{ gridColumn: { xs: '1 / -1', sm: 'auto' } }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'block', sm: 'none' }, mb: 0.5 }}>
                      時間
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)', alignItems: 'center', gap: 0.5 }}>
                    <TextField
                      type="time"
                      size="small"
                      value={slot.startTime}
                      onChange={e => rows.updateField(index, 'startTime', e.target.value)}
                      fullWidth
                    />
                    <Typography variant="body2" color="text.secondary">
                      ～
                    </Typography>
                    <TextField
                      type="time"
                      size="small"
                      value={slot.endTime}
                      onChange={e => rows.updateField(index, 'endTime', e.target.value)}
                      fullWidth
                    />
                    </Box>
                  </Box>

                  <Box sx={{ gridColumn: { xs: '1 / -1', sm: 'auto' } }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'block', sm: 'none' }, mb: 0.5 }}>
                      タイプ
                    </Typography>
                    <Select
                      fullWidth
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
                  </Box>

                  <Box sx={{ gridColumn: { xs: '1 / -1', sm: 'auto' } }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'block', sm: 'none' }, mb: 0.5 }}>
                      コート
                    </Typography>
                    <Select
                      fullWidth
                      size="small"
                      value={slot.courtId || 'court1'}
                      onChange={e => rows.updateField(index, 'courtId', e.target.value)}
                    >
                      <MenuItem value="court1">{courtNames?.court1 || '第1コート'}</MenuItem>
                      {courtNames?.court2 && <MenuItem value="court2">{courtNames.court2}</MenuItem>}
                    </Select>
                  </Box>

                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'block', sm: 'none' }, mb: 0.5 }}>
                      詳細
                    </Typography>
                    <TextField
                      fullWidth
                      size="small"
                      value={detail}
                      onChange={e => rows.updateField(index, 'matchDescription', e.target.value)}
                      placeholder="例: 1年A vs 2年B"
                      inputProps={{ maxLength: 100 }}
                      InputProps={{ readOnly: hasLinkedMatch }}
                    />
                  </Box>

                  <IconButton
                    onClick={() => rows.removeRow(index)}
                    aria-label="行を削除"
                    sx={{ minWidth: { xs: 44, sm: 40 }, minHeight: { xs: 44, sm: 40 }, alignSelf: 'end' }}
                  >
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
