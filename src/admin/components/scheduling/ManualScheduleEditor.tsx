import React from 'react';
import {
  Box,
  Button,
  FormControlLabel,
  IconButton,
  MenuItem,
  Select,
  Switch,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import {
  Add as AddIcon,
  ArrowDownward as ArrowDownIcon,
  ArrowUpward as ArrowUpIcon,
  DeleteOutline as DeleteIcon,
  DragIndicator as DragIndicatorIcon
} from '@mui/icons-material';
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Sport, TimeSlot } from '../../../types';
import { ManualScheduleRows, useManualScheduleRows } from '../../../hooks/useManualScheduleRows';
import { getTimeSlotLabel } from '../../../utils/match';

interface ManualScheduleEditorProps {
  timeSlots: TimeSlot[];
  onChange: (slots: TimeSlot[]) => void;
  courtNames?: { court1: string; court2?: string };
  sport: Sport;
}

interface ScheduleRowProps {
  id: string;
  index: number;
  slot: TimeSlot;
  rows: ManualScheduleRows;
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

const FieldLabel: React.FC<React.PropsWithChildren> = ({ children }) => (
  <Typography
    variant="caption"
    color="text.secondary"
    sx={{ display: { xs: 'block', md: 'none' }, mb: 0.5, fontWeight: 600 }}
  >
    {children}
  </Typography>
);

const ScheduleRow: React.FC<ScheduleRowProps> = ({
  id,
  index,
  slot,
  rows,
  courtNames,
  sport
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const hasLinkedMatch = slot.type === 'match'
    && Boolean(slot.matchId && sport.matches.some(match => match.id === slot.matchId));
  let detail = slot.matchDescription ?? slot.description ?? slot.title ?? '';
  if (hasLinkedMatch) detail = getTimeSlotLabel(slot, sport);
  let rowBackground = 'background.paper';
  let rowOpacity = 1;
  let rowZIndex: number | 'auto' = 'auto';
  let handleCursor = 'grab';
  if (isDragging) {
    rowBackground = 'action.selected';
    rowOpacity = 0.75;
    rowZIndex = 1;
    handleCursor = 'grabbing';
  }

  return (
    <Box
      ref={setNodeRef}
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '44px minmax(0, 1fr) 132px',
          md: '44px minmax(176px, 0.9fr) 116px 116px minmax(180px, 1.4fr) 132px'
        },
        gap: { xs: 1, md: 1.25 },
        alignItems: 'center',
        px: { xs: 1, sm: 1.5 },
        py: { xs: 1.25, md: 1 },
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: rowBackground,
        opacity: rowOpacity,
        position: 'relative',
        zIndex: rowZIndex,
        transform: CSS.Transform.toString(transform),
        transition,
        '&:last-of-type': { borderBottom: 0 }
      }}
    >
      <Tooltip title="ドラッグして並べ替え">
        <IconButton
          aria-label={`${index + 1}行目を並べ替え`}
          {...attributes}
          {...listeners}
          sx={{
            width: 44,
            height: 44,
            color: 'text.secondary',
            cursor: handleCursor,
            touchAction: 'none'
          }}
        >
          <DragIndicatorIcon />
        </IconButton>
      </Tooltip>

      <Box sx={{ gridColumn: { xs: '2 / -1', md: 'auto' } }}>
        <FieldLabel>時間</FieldLabel>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)', alignItems: 'center', gap: 0.75 }}>
          <TextField
            type="time"
            size="small"
            value={slot.startTime}
            onChange={event => rows.updateField(index, 'startTime', event.target.value)}
            inputProps={{ 'aria-label': `${index + 1}行目の開始時間` }}
            fullWidth
          />
          <Typography variant="body2" color="text.secondary">–</Typography>
          <TextField
            type="time"
            size="small"
            value={slot.endTime}
            onChange={event => rows.updateField(index, 'endTime', event.target.value)}
            inputProps={{ 'aria-label': `${index + 1}行目の終了時間` }}
            fullWidth
          />
        </Box>
      </Box>

      <Box sx={{ gridColumn: { xs: '1 / span 2', md: 'auto' } }}>
        <FieldLabel>種別</FieldLabel>
        <Select
          fullWidth
          size="small"
          value={slot.type}
          onChange={event => rows.updateField(index, 'type', event.target.value)}
          inputProps={{ 'aria-label': `${index + 1}行目の種別` }}
        >
          {timeSlotTypes.map(option => (
            <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
          ))}
        </Select>
      </Box>

      <Box>
        <FieldLabel>コート</FieldLabel>
        <Select
          fullWidth
          size="small"
          value={slot.courtId || 'court1'}
          onChange={event => rows.updateField(index, 'courtId', event.target.value)}
          inputProps={{ 'aria-label': `${index + 1}行目のコート` }}
        >
          <MenuItem value="court1">{courtNames?.court1 || '第1コート'}</MenuItem>
          {courtNames?.court2 && <MenuItem value="court2">{courtNames.court2}</MenuItem>}
        </Select>
      </Box>

      <Box sx={{ minWidth: 0, gridColumn: { xs: '1 / -1', md: 'auto' } }}>
        <FieldLabel>内容</FieldLabel>
        <TextField
          fullWidth
          size="small"
          value={detail}
          onChange={event => rows.updateField(index, 'matchDescription', event.target.value)}
          placeholder="例: 1年A vs 2年B"
          inputProps={{ maxLength: 100, 'aria-label': `${index + 1}行目の内容` }}
          InputProps={{ readOnly: hasLinkedMatch }}
        />
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gridColumn: { xs: '1 / -1', md: 'auto' } }}>
        <Tooltip title="上へ移動">
          <span>
            <IconButton
              onClick={() => rows.reorder(index, index - 1)}
              disabled={index === 0}
              aria-label={`${index + 1}行目を上へ移動`}
              sx={{ width: 44, height: 44 }}
            >
              <ArrowUpIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="下へ移動">
          <span>
            <IconButton
              onClick={() => rows.reorder(index, index + 1)}
              disabled={index === rows.rowCount - 1}
              aria-label={`${index + 1}行目を下へ移動`}
              sx={{ width: 44, height: 44 }}
            >
              <ArrowDownIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="削除">
          <IconButton
            onClick={() => rows.removeRow(index)}
            aria-label={`${index + 1}行目を削除`}
            color="error"
            sx={{ width: 44, height: 44 }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};

const ManualScheduleEditor: React.FC<ManualScheduleEditorProps> = ({
  timeSlots,
  onChange,
  courtNames,
  sport
}) => {
  const rows = useManualScheduleRows(timeSlots, onChange);
  const itemIds = timeSlots.map((_, index) => `schedule-row-${index}`);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    if (!event.over || event.active.id === event.over.id) return;
    const fromIndex = itemIds.indexOf(String(event.active.id));
    const toIndex = itemIds.indexOf(String(event.over.id));
    rows.reorder(fromIndex, toIndex);
  };

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'center' },
          justifyContent: 'space-between',
          gap: 1.5,
          px: { xs: 1.5, sm: 2 },
          py: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'action.hover'
        }}
      >
        <Box>
          <Typography variant="subtitle1" fontWeight={700}>タイムラインを編集</Typography>
          <Typography variant="caption" color="text.secondary">
            ハンドルを長押しして移動。矢印でも順番を変更できます。
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
          <FormControlLabel
            sx={{ m: 0, mr: { sm: 1 } }}
            control={(
              <Switch
                checked={rows.moveTimes}
                onChange={event => rows.setMoveTimes(event.target.checked)}
              />
            )}
            label={<Typography variant="body2">時刻ごと移動</Typography>}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={rows.addRow}
            sx={{ minHeight: 44, flex: { xs: 1, sm: 'initial' } }}
          >
            行を追加
          </Button>
        </Box>
      </Box>

      {timeSlots.length === 0 && (
        <Box sx={{ px: 2, py: 7, textAlign: 'center' }}>
          <Typography variant="subtitle1" fontWeight={600}>編集する時間枠がありません</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            スケジュールを生成するか、行を追加してください。
          </Typography>
        </Box>
      )}

      {timeSlots.length > 0 && (
        <>
          <Box
            sx={{
              display: { xs: 'none', md: 'grid' },
              gridTemplateColumns: '44px minmax(176px, 0.9fr) 116px 116px minmax(180px, 1.4fr) 132px',
              gap: 1.25,
              px: 1.5,
              py: 1,
              borderBottom: '1px solid',
              borderColor: 'divider',
              color: 'text.secondary',
              fontSize: '0.75rem',
              fontWeight: 700
            }}
          >
            <span />
            <span>時間</span>
            <span>種別</span>
            <span>コート</span>
            <span>内容</span>
            <span>行操作</span>
          </Box>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
              {timeSlots.map((slot, index) => (
                <ScheduleRow
                  key={itemIds[index]}
                  id={itemIds[index]}
                  index={index}
                  slot={slot}
                  rows={rows}
                  courtNames={courtNames}
                  sport={sport}
                />
              ))}
            </SortableContext>
          </DndContext>
        </>
      )}
    </Box>
  );
};

export default ManualScheduleEditor;
