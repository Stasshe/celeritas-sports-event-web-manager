import { useCallback, useState } from 'react';
import { TimeSlot } from '../types';
import { reorderTimeSlots } from '../utils/scheduleEditor';

const emptySlot: TimeSlot = {
  startTime: '',
  endTime: '',
  type: 'match',
  courtId: 'court1',
  matchDescription: ''
};

const MAX_HISTORY_ENTRIES = 20;

interface EditHistory {
  entries: TimeSlot[][];
  index: number;
}

export type TimeSlotField = keyof TimeSlot;

export interface ManualScheduleRows {
  timeSlots: TimeSlot[];
  rowCount: number;
  moveTimes: boolean;
  canUndo: boolean;
  canRedo: boolean;
  setMoveTimes: (value: boolean) => void;
  updateField: (index: number, field: TimeSlotField, value: string) => void;
  addRow: () => void;
  removeRow: (index: number) => void;
  reorder: (fromIndex: number, toIndex: number) => void;
  undo: () => void;
  redo: () => void;
}

export const useManualScheduleRows = (initialTimeSlots: TimeSlot[]): ManualScheduleRows => {
  const [history, setHistory] = useState<EditHistory>(() => ({
    entries: [initialTimeSlots.map(slot => ({ ...slot }))],
    index: 0
  }));
  const [moveTimes, setMoveTimes] = useState(false);
  const timeSlots = history.entries[history.index];

  const edit = useCallback((update: (current: TimeSlot[]) => TimeSlot[]) => {
    setHistory(current => {
      const nextSlots = update(current.entries[current.index]);
      const entries = [...current.entries.slice(0, current.index + 1), nextSlots]
        .slice(-MAX_HISTORY_ENTRIES);
      return { entries, index: entries.length - 1 };
    });
  }, []);

  const updateField = useCallback((index: number, field: TimeSlotField, value: string) => {
    edit(current => current.map((slot, slotIndex) => {
      if (slotIndex !== index) return slot;
      return { ...slot, [field]: value };
    }));
  }, [edit]);

  const addRow = useCallback(() => {
    edit(current => [...current, { ...emptySlot }]);
  }, [edit]);

  const removeRow = useCallback((index: number) => {
    edit(current => current.filter((_, slotIndex) => slotIndex !== index));
  }, [edit]);

  const reorder = useCallback((fromIndex: number, toIndex: number) => {
    edit(current => reorderTimeSlots(current, fromIndex, toIndex, moveTimes));
  }, [edit, moveTimes]);

  const undo = useCallback(() => {
    setHistory(current => {
      if (current.index === 0) return current;
      return { ...current, index: current.index - 1 };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory(current => {
      if (current.index === current.entries.length - 1) return current;
      return { ...current, index: current.index + 1 };
    });
  }, []);

  return {
    timeSlots,
    rowCount: timeSlots.length,
    moveTimes,
    canUndo: history.index > 0,
    canRedo: history.index < history.entries.length - 1,
    setMoveTimes,
    updateField,
    addRow,
    removeRow,
    reorder,
    undo,
    redo
  };
};
