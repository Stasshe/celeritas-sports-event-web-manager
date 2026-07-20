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

export type TimeSlotField = keyof TimeSlot;

export interface ManualScheduleRows {
  timeSlots: TimeSlot[];
  rowCount: number;
  moveTimes: boolean;
  setMoveTimes: (value: boolean) => void;
  updateField: (index: number, field: TimeSlotField, value: string) => void;
  addRow: () => void;
  removeRow: (index: number) => void;
  reorder: (fromIndex: number, toIndex: number) => void;
}

export const useManualScheduleRows = (initialTimeSlots: TimeSlot[]): ManualScheduleRows => {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(() => (
    initialTimeSlots.map(slot => ({ ...slot }))
  ));
  const [moveTimes, setMoveTimes] = useState(false);

  const updateField = useCallback((index: number, field: TimeSlotField, value: string) => {
    setTimeSlots(current => current.map((slot, slotIndex) => {
      if (slotIndex !== index) return slot;
      return { ...slot, [field]: value };
    }));
  }, []);

  const addRow = useCallback(() => {
    setTimeSlots(current => [...current, { ...emptySlot }]);
  }, []);

  const removeRow = useCallback((index: number) => {
    setTimeSlots(current => current.filter((_, slotIndex) => slotIndex !== index));
  }, []);

  const reorder = useCallback((fromIndex: number, toIndex: number) => {
    setTimeSlots(current => reorderTimeSlots(current, fromIndex, toIndex, moveTimes));
  }, [moveTimes]);

  return {
    timeSlots,
    rowCount: timeSlots.length,
    moveTimes,
    setMoveTimes,
    updateField,
    addRow,
    removeRow,
    reorder
  };
};
