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

// Reorder to an arbitrary target position (drag & drop). moveTimes=false keeps
// each row's time fixed to its position and only relocates the content.
export const reorderTimeSlots = (
  timeSlots: TimeSlot[],
  fromIndex: number,
  toIndex: number,
  moveTimes: boolean
): TimeSlot[] => {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return timeSlots;
  if (fromIndex >= timeSlots.length || toIndex >= timeSlots.length) return timeSlots;

  const updated = timeSlots.map(slot => ({ ...slot }));
  if (moveTimes) {
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    return updated;
  }

  const contents = updated.map(getSlotContent);
  const [movedContent] = contents.splice(fromIndex, 1);
  contents.splice(toIndex, 0, movedContent);
  return updated.map((slot, i) => ({ ...slot, ...contents[i] }));
};
