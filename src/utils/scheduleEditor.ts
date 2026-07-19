import { TimeSlot } from '../types';

const getSlotContent = (slot: TimeSlot): Omit<TimeSlot, 'startTime' | 'endTime'> => ({
  type: slot.type,
  courtId: slot.courtId,
  matchDescription: slot.matchDescription,
  description: slot.description,
  matchId: slot.matchId,
  title: slot.title
});

export const moveTimeSlot = (
  timeSlots: TimeSlot[],
  index: number,
  direction: -1 | 1,
  moveTimes: boolean
): TimeSlot[] => {
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= timeSlots.length) return timeSlots;

  const updated = timeSlots.map(slot => ({ ...slot }));
  if (moveTimes) {
    [updated[targetIndex], updated[index]] = [updated[index], updated[targetIndex]];
    return updated;
  }

  const currentContent = getSlotContent(updated[index]);
  const targetContent = getSlotContent(updated[targetIndex]);
  updated[index] = { ...updated[index], ...targetContent };
  updated[targetIndex] = { ...updated[targetIndex], ...currentContent };
  return updated;
};
