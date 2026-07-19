import { TimeSlot } from '../types';

export interface TimeBlock {
  key: string;
  startTime: string;
  endTime: string;
  byCourt: Partial<Record<'court1' | 'court2', TimeSlot>>;
  shared: TimeSlot[];
}

export const groupTimeSlotsByBlock = (timeSlots: TimeSlot[]): TimeBlock[] => {
  const blocks = new Map<string, TimeBlock>();
  [...timeSlots]
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
    .forEach(slot => {
      const key = `${slot.startTime}-${slot.endTime}`;
      if (!blocks.has(key)) {
        blocks.set(key, { key, startTime: slot.startTime, endTime: slot.endTime, byCourt: {}, shared: [] });
      }
      const block = blocks.get(key)!;
      if (slot.courtId) {
        block.byCourt[slot.courtId] = slot;
      } else {
        block.shared.push(slot);
      }
    });
  return [...blocks.values()];
};
