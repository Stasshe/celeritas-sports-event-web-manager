import { useState } from 'react';
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
  rowCount: number;
  moveTimes: boolean;
  setMoveTimes: (value: boolean) => void;
  updateField: (index: number, field: TimeSlotField, value: string) => void;
  addRow: () => void;
  removeRow: (index: number) => void;
  reorder: (fromIndex: number, toIndex: number) => void;
}

export const useManualScheduleRows = (
  timeSlots: TimeSlot[],
  onChange: (slots: TimeSlot[]) => void
): ManualScheduleRows => {
  const [moveTimes, setMoveTimes] = useState(false);

  const updateField = (index: number, field: TimeSlotField, value: string) => {
    const updated = timeSlots.map((slot, i) => (i === index ? { ...slot, [field]: value } : slot));
    onChange(updated);
  };

  const addRow = () => {
    onChange([...timeSlots, { ...emptySlot }]);
  };

  const removeRow = (index: number) => {
    onChange(timeSlots.filter((_, i) => i !== index));
  };

  const reorder = (fromIndex: number, toIndex: number) => {
    onChange(reorderTimeSlots(timeSlots, fromIndex, toIndex, moveTimes));
  };

  return { rowCount: timeSlots.length, moveTimes, setMoveTimes, updateField, addRow, removeRow, reorder };
};
