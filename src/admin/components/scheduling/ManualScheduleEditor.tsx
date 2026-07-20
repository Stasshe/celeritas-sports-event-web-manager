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
  Close as CancelIcon,
  DeleteOutlined as DeleteIcon,
  DragIndicator as DragIndicatorIcon,
  SaveOutlined as SaveIcon
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
import { TimeSlotField, useManualScheduleRows } from '../../../hooks/useManualScheduleRows';
import { getTimeSlotLabel } from '../../../utils/match';

interface ManualScheduleEditorProps {
  timeSlots: TimeSlot[];
  onSave: (slots: TimeSlot[]) => void;
  onCancel: () => void;
  courtNames?: { court1: string; court2?: string };
  sport: Sport;
}

interface ScheduleRowFieldsProps {
  index: number;
  slot: TimeSlot;
  rowCount: number;
  courtNames?: { court1: string; court2?: string };
  sport: Sport;
  onUpdateField: (index: number, field: TimeSlotField, value: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onRemove: (index: number) => void;
}

interface ScheduleRowProps extends ScheduleRowFieldsProps {
  id: string;
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
    sx={{
      color: "text.secondary",
      display: { xs: 'block', md: 'none' },
      mb: 0.5,
      fontWeight: 600
    }}>
    {children}
  </Typography>
);

const ScheduleRowFields = React.memo<ScheduleRowFieldsProps>(({
  index,
  slot,
  rowCount,
  courtNames,
  sport,
  onUpdateField,
  onReorder,
  onRemove
}) => {
  const hasLinkedMatch = slot.type === 'match'
    && Boolean(slot.matchId && sport.matches.some(match => match.id === slot.matchId));
  let detail = slot.matchDescription ?? slot.description ?? slot.title ?? '';
  if (hasLinkedMatch) detail = getTimeSlotLabel(slot, sport);

  return (
    <Box sx={{ display: 'contents' }}>
      <Box sx={{ gridColumn: { xs: '2 / -1', md: 'auto' } }}>
        <FieldLabel>時間</FieldLabel>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)', alignItems: 'center', gap: 0.75 }}>
          <TextField
            type="time"
            size="small"
            value={slot.startTime}
            onChange={event => onUpdateField(index, 'startTime', event.target.value)}
            fullWidth
            slotProps={{
              htmlInput: { 'aria-label': `${index + 1}行目の開始時間` }
            }}
          />
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>–</Typography>
          <TextField
            type="time"
            size="small"
            value={slot.endTime}
            onChange={event => onUpdateField(index, 'endTime', event.target.value)}
            fullWidth
            slotProps={{
              htmlInput: { 'aria-label': `${index + 1}行目の終了時間` }
            }}
          />
        </Box>
      </Box>
      <Box sx={{ gridColumn: { xs: '1 / span 2', md: 'auto' } }}>
        <FieldLabel>種別</FieldLabel>
        <Select
          fullWidth
          size="small"
          value={slot.type}
          onChange={event => onUpdateField(index, 'type', event.target.value)}
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
          onChange={event => onUpdateField(index, 'courtId', event.target.value)}
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
          onChange={event => onUpdateField(index, 'matchDescription', event.target.value)}
          placeholder="例: 1年A vs 2年B"
          slotProps={{
            input: { readOnly: hasLinkedMatch },
            htmlInput: { maxLength: 100, 'aria-label': `${index + 1}行目の内容` }
          }} />
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gridColumn: { xs: '1 / -1', md: 'auto' } }}>
        <Tooltip title="上へ移動">
          <span>
            <IconButton
              onClick={() => onReorder(index, index - 1)}
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
              onClick={() => onReorder(index, index + 1)}
              disabled={index === rowCount - 1}
              aria-label={`${index + 1}行目を下へ移動`}
              sx={{ width: 44, height: 44 }}
            >
              <ArrowDownIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="削除">
          <IconButton
            onClick={() => onRemove(index)}
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
});

ScheduleRowFields.displayName = 'ScheduleRowFields';

const ScheduleRow = React.memo<ScheduleRowProps>(({
  id,
  index,
  slot,
  rowCount,
  courtNames,
  sport,
  onUpdateField,
  onReorder,
  onRemove
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
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
        willChange: 'transform',
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
      <ScheduleRowFields
        index={index}
        slot={slot}
        rowCount={rowCount}
        courtNames={courtNames}
        sport={sport}
        onUpdateField={onUpdateField}
        onReorder={onReorder}
        onRemove={onRemove}
      />
    </Box>
  );
});

ScheduleRow.displayName = 'ScheduleRow';

const ManualScheduleEditor: React.FC<ManualScheduleEditorProps> = ({
  timeSlots,
  onSave,
  onCancel,
  courtNames,
  sport
}) => {
  const rows = useManualScheduleRows(timeSlots);
  const itemIds = React.useMemo(
    () => Array.from({ length: rows.rowCount }, (_, index) => `schedule-row-${index}`),
    [rows.rowCount]
  );
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = React.useCallback((event: DragEndEvent) => {
    if (!event.over || event.active.id === event.over.id) return;
    const fromIndex = itemIds.indexOf(String(event.active.id));
    const toIndex = itemIds.indexOf(String(event.over.id));
    rows.reorder(fromIndex, toIndex);
  }, [itemIds, rows.reorder]);

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
          <Typography variant="subtitle1" sx={{
            fontWeight: 700
          }}>タイムラインを編集</Typography>
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
            変更は保存するまで公開されません。ハンドルの長押しまたは矢印で移動できます。
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
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={rows.addRow}
            sx={{ minHeight: 44 }}
          >
            行を追加
          </Button>
          <Button
            variant="text"
            color="inherit"
            startIcon={<CancelIcon />}
            onClick={onCancel}
            sx={{ minHeight: 44 }}
          >
            キャンセル
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={() => onSave(rows.timeSlots)}
            sx={{ minHeight: 44 }}
          >
            保存
          </Button>
        </Box>
      </Box>
      {rows.timeSlots.length === 0 && (
        <Box sx={{ px: 2, py: 7, textAlign: 'center' }}>
          <Typography variant="subtitle1" sx={{
            fontWeight: 600
          }}>編集する時間枠がありません</Typography>
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              mt: 0.5
            }}>
            「行を追加」から時間枠を作成してください。
          </Typography>
        </Box>
      )}
      {rows.timeSlots.length > 0 && (
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
              {rows.timeSlots.map((slot, index) => (
                <ScheduleRow
                  key={itemIds[index]}
                  id={itemIds[index]}
                  index={index}
                  slot={slot}
                  rowCount={rows.rowCount}
                  courtNames={courtNames}
                  sport={sport}
                  onUpdateField={rows.updateField}
                  onReorder={rows.reorder}
                  onRemove={rows.removeRow}
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
