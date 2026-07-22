import { describe, expect, it } from 'vitest';
import { removeLegacyScheduleHistory } from './storage';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe('removeLegacyScheduleHistory', () => {
  it('removes persisted schedule histories without deleting other preferences', () => {
    const storage = new MemoryStorage();
    storage.setItem('themeMode', 'dark');
    storage.setItem('scheduleHistory_sport-1', 'large history');
    storage.setItem('scheduleHistory_sport-2', 'large history');

    removeLegacyScheduleHistory(storage);

    expect(storage.getItem('themeMode')).toBe('dark');
    expect(storage.getItem('scheduleHistory_sport-1')).toBeNull();
    expect(storage.getItem('scheduleHistory_sport-2')).toBeNull();
  });
});
