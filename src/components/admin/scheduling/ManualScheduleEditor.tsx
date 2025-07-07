import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Select,
  MenuItem,
  IconButton,
  Box
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { TimeSlot, Sport } from '../../../types';

interface ManualScheduleEditorProps {
  open: boolean;
  onClose: () => void;
  timeSlots: TimeSlot[];
  onChange: (slots: TimeSlot[]) => void;
  courtNames?: { court1: string; court2?: string };
  teams?: { id: string; name: string }[];
}

const timeSlotTypes = [
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
  teams
}) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editSlot, setEditSlot] = useState<Partial<TimeSlot>>({});

  // 新規追加用の空スロット
  const emptySlot: Partial<TimeSlot> = {
    startTime: '',
    endTime: '',
    type: 'match',
    courtId: 'court1',
    matchDescription: ''
  };

  // 編集開始
  const handleEdit = (idx: number) => {
    setEditingIndex(idx);
    setEditSlot({ ...timeSlots[idx] });
  };


  // 編集内容変更（TextField用）
  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditSlot(prev => ({ ...prev, [name!]: value }));
  };

  // 編集内容変更（Select用）
  const handleEditSelectChange = (e: import('@mui/material').SelectChangeEvent<string>) => {
    const { name, value } = e.target;
    setEditSlot(prev => ({ ...prev, [name!]: value }));
  };

  // 編集確定
  const handleEditSave = () => {
    if (editingIndex === null) return;
    const updated = [...timeSlots];
    updated[editingIndex] = { ...updated[editingIndex], ...editSlot } as TimeSlot;
    onChange(updated);
    setEditingIndex(null);
    setEditSlot({});
  };

  // 編集キャンセル
  const handleEditCancel = () => {
    setEditingIndex(null);
    setEditSlot({});
  };

  // 行削除
  const handleDelete = (idx: number) => {
    const updated = timeSlots.filter((_, i) => i !== idx);
    onChange(updated);
  };

  // 行追加
  const handleAdd = () => {
    onChange([...timeSlots, { ...emptySlot, startTime: '', endTime: '' } as TimeSlot]);
    setEditingIndex(timeSlots.length);
    setEditSlot(emptySlot);
  };

  // 行を上に詰める（時間帯は固定、内容のみ入れ替え）
  const handleRowMoveUp = (idx: number) => {
    if (idx === 0) return;
    const updated = [...timeSlots];
    const keys = [
      'type', 'courtId', 'matchDescription', 'description', 'matchId', 'title'
    ] as const;
    const prev = updated[idx - 1];
    const curr = updated[idx];
    keys.forEach(key => {
      const temp = prev[key];
      (prev as any)[key] = curr[key];
      (curr as any)[key] = temp;
    });
    onChange(updated);
  };

  // 行を下に詰める（時間帯は固定、内容のみ入れ替え）
  const handleRowMoveDown = (idx: number) => {
    if (idx === timeSlots.length - 1) return;
    const updated = [...timeSlots];
    const curr = updated[idx];
    const next = updated[idx + 1];
    const keys = [
      'type', 'courtId', 'matchDescription', 'description', 'matchId', 'title'
    ] as const;
    keys.forEach(key => {
      const temp = next[key];
      (next as any)[key] = curr[key];
      (curr as any)[key] = temp;
    });
    onChange(updated);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>スケジュール手動編集</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleAdd}>
            行を追加
          </Button>
        </Box>
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>時間</TableCell>
                <TableCell>タイプ</TableCell>
                <TableCell>コート</TableCell>
                <TableCell>詳細</TableCell>
                <TableCell>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {timeSlots.map((slot, idx) => (
                editingIndex === idx ? (
                  <TableRow key={idx}>
                    <TableCell sx={{ minWidth: 220 }}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <TextField
                          name="startTime"
                          type="time"
                          value={editSlot.startTime || ''}
                          onChange={handleEditChange}
                          size="small"
                          sx={{ minWidth: 110 }}
                        />
                        <span>～</span>
                        <TextField
                          name="endTime"
                          type="time"
                          value={editSlot.endTime || ''}
                          onChange={handleEditChange}
                          size="small"
                          sx={{ minWidth: 110 }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell sx={{ minWidth: 120 }}>
                      <Select
                        name="type"
                        value={editSlot.type || 'match'}
                        onChange={handleEditSelectChange}
                        size="small"
                        sx={{ minWidth: 110 }}
                      >
                        {timeSlotTypes.map(opt => (
                          <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                        ))}
                      </Select>
                    </TableCell>
                    <TableCell sx={{ minWidth: 120 }}>
                      <Select
                        name="courtId"
                        value={editSlot.courtId || 'court1'}
                        onChange={handleEditSelectChange}
                        size="small"
                        sx={{ minWidth: 110 }}
                      >
                        <MenuItem value="court1">{courtNames?.court1 || '第1コート'}</MenuItem>
                        {courtNames?.court2 && <MenuItem value="court2">{courtNames.court2}</MenuItem>}
                      </Select>
                    </TableCell>
                    <TableCell sx={{ minWidth: 200 }}>
                      <TextField
                        name="matchDescription"
                        value={editSlot.matchDescription || ''}
                        onChange={handleEditChange}
                        size="small"
                        sx={{ minWidth: 180 }}
                        placeholder="例: 1年A vs 2年B"
                      />
                    </TableCell>
                    <TableCell sx={{ minWidth: 160 }}>
                      <Button color="primary" onClick={handleEditSave} size="small" sx={{ mr: 1 }}>保存</Button>
                      <Button color="inherit" onClick={handleEditCancel} size="small">キャンセル</Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  <TableRow key={idx}>
                    <TableCell>{slot.startTime}～{slot.endTime}</TableCell>
                    <TableCell>{timeSlotTypes.find(t => t.value === slot.type)?.label || slot.type}</TableCell>
                    <TableCell>{slot.courtId === 'court2' ? (courtNames?.court2 || '第2コート') : (courtNames?.court1 || '第1コート')}</TableCell>
                    <TableCell>{slot.matchDescription || ''}</TableCell>
                    <TableCell>
                      <IconButton onClick={() => handleEdit(idx)} size="small"><EditIcon fontSize="small" /></IconButton>
                      <IconButton onClick={() => handleDelete(idx)} size="small"><DeleteIcon fontSize="small" /></IconButton>
                      <Button onClick={() => handleRowMoveUp(idx)} size="small" disabled={idx === 0}>↑</Button>
                      <Button onClick={() => handleRowMoveDown(idx)} size="small" disabled={idx === timeSlots.length - 1}>↓</Button>
                    </TableCell>
                  </TableRow>
                )
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
      <DialogActions>
        <Button
          variant="contained"
          color="primary"
          onClick={() => {
            if (editingIndex !== null) {
              handleEditSave();
            } else {
              onChange(timeSlots);
            }
          }}
        >
          保存
        </Button>
        <Button onClick={onClose}>閉じる</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ManualScheduleEditor;
