const LEGACY_SCHEDULE_HISTORY_PREFIX = 'scheduleHistory_';

export const removeLegacyScheduleHistory = (storage: Storage = localStorage): void => {
  try {
    const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index));
    keys.forEach(key => {
      if (key?.startsWith(LEGACY_SCHEDULE_HISTORY_PREFIX)) {
        storage.removeItem(key);
      }
    });
  } catch (error) {
    console.error('Failed to remove obsolete schedule history', error);
  }
};
