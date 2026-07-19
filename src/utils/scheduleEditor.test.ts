import { describe, expect, it } from 'vitest';
import { TimeSlot } from '../types';
import { moveTimeSlot } from './scheduleEditor';

const slots: TimeSlot[] = [
  {
    startTime: '09:00',
    endTime: '09:20',
    type: 'match',
    matchId: 'first',
    courtId: 'court1'
  },
  {
    startTime: '09:25',
    endTime: '09:45',
    type: 'match',
    matchId: 'second',
    courtId: 'court2'
  }
];

describe('moveTimeSlot', () => {
  it('moves content while preserving time positions', () => {
    const moved = moveTimeSlot(slots, 1, -1, false);

    expect(moved.map(slot => slot.matchId)).toEqual(['second', 'first']);
    expect(moved.map(slot => slot.startTime)).toEqual(['09:00', '09:25']);
    expect(moved[0].courtId).toBe('court2');
  });

  it('moves the complete row including its time', () => {
    const moved = moveTimeSlot(slots, 1, -1, true);

    expect(moved.map(slot => slot.matchId)).toEqual(['second', 'first']);
    expect(moved.map(slot => slot.startTime)).toEqual(['09:25', '09:00']);
  });

  it('leaves the list unchanged at a boundary', () => {
    expect(moveTimeSlot(slots, 0, -1, true)).toBe(slots);
  });
});
