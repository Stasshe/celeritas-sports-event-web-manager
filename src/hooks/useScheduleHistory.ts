import { useEffect, useRef, useState } from 'react';
import { LeagueScheduleSettings, ScheduleSettings, Sport, TimeSlot } from '../types';
import { generateSchedule } from '../utils/scheduleGenerator';

const buildSafeSettings = (settings: ScheduleSettings | LeagueScheduleSettings) => ({
  ...settings,
  lunchBreak: settings.lunchBreak || null,
  breakTimes: settings.breakTimes || []
});

interface UseScheduleHistoryArgs {
  sport: Sport;
  settings: ScheduleSettings | LeagueScheduleSettings;
  onUpdate: (sport: Sport) => void;
}

export interface ScheduleHistory {
  timeSlots: TimeSlot[];
  error: string | null;
  applyManualEdit: (slots: TimeSlot[]) => void;
  generate: () => void;
  rescheduleKeepOrder: () => void;
}

export const useScheduleHistory = ({ sport, settings, onUpdate }: UseScheduleHistoryArgs): ScheduleHistory => {
  const sportIdRef = useRef(sport.id);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(sport.scheduleSettings?.timeSlots || []);
  const [error, setError] = useState<string | null>(null);

  // スポーツ切り替え時のみローカルstateを再初期化
  useEffect(() => {
    if (sportIdRef.current === sport.id) return;
    sportIdRef.current = sport.id;
    const initialSlots = sport.scheduleSettings?.timeSlots || [];
    setTimeSlots(initialSlots);
    setError(null);
  }, [sport.id, sport.scheduleSettings]);

  const applyManualEdit = (slots: TimeSlot[]) => {
    setTimeSlots(slots);
    onUpdate({
      ...sport,
      scheduleSettings: { ...buildSafeSettings(settings), timeSlots: slots }
    });
  };

  const runGeneration = (shuffle: boolean) => {
    try {
      setError(null);
      const safeSettings = buildSafeSettings(settings);
      const matchOrder = shuffle
        ? []
        : timeSlots.flatMap(slot => (slot.type === 'match' && slot.matchId ? [slot.matchId] : []));
      const generated = generateSchedule(sport, safeSettings, shuffle, matchOrder);
      setTimeSlots(generated);
      onUpdate({
        ...sport,
        scheduleSettings: { ...safeSettings, timeSlots: generated }
      });
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : '不明なエラーが発生しました');
    }
  };

  return {
    timeSlots,
    error,
    applyManualEdit,
    generate: () => runGeneration(true),
    rescheduleKeepOrder: () => runGeneration(false)
  };
};
