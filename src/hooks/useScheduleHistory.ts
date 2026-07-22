import { useEffect, useRef, useState } from 'react';
import { LeagueScheduleSettings, ScheduleSettings, Sport, TimeSlot } from '../types';
import { generateSchedule } from '../utils/scheduleGenerator';

const MAX_HISTORY_ENTRIES = 20;

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
  canUndo: boolean;
  canRedo: boolean;
  applyManualEdit: (slots: TimeSlot[]) => void;
  generate: () => void;
  rescheduleKeepOrder: () => void;
  undo: () => void;
  redo: () => void;
}

export const useScheduleHistory = ({ sport, settings, onUpdate }: UseScheduleHistoryArgs): ScheduleHistory => {
  const sportIdRef = useRef(sport.id);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(sport.scheduleSettings?.timeSlots || []);
  const [history, setHistory] = useState<TimeSlot[][]>([sport.scheduleSettings?.timeSlots || []]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // スポーツ切り替え時のみローカルstateを再初期化
  useEffect(() => {
    if (sportIdRef.current === sport.id) return;
    sportIdRef.current = sport.id;
    const initialSlots = sport.scheduleSettings?.timeSlots || [];
    setTimeSlots(initialSlots);
    setHistory([initialSlots]);
    setHistoryIndex(0);
    setError(null);
  }, [sport.id, sport.scheduleSettings]);

  const pushHistory = (slots: TimeSlot[]) => {
    const truncated = history.slice(0, historyIndex + 1);
    const nextHistory = [...truncated, slots].slice(-MAX_HISTORY_ENTRIES);
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
  };

  const applyManualEdit = (slots: TimeSlot[]) => {
    setTimeSlots(slots);
    pushHistory(slots);
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
      pushHistory(generated);
      onUpdate({
        ...sport,
        scheduleSettings: { ...safeSettings, timeSlots: generated }
      });
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : '不明なエラーが発生しました');
    }
  };

  const undo = () => {
    if (historyIndex <= 0) return;
    const nextIndex = historyIndex - 1;
    setHistoryIndex(nextIndex);
    setTimeSlots(history[nextIndex]);
  };

  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    const nextIndex = historyIndex + 1;
    setHistoryIndex(nextIndex);
    setTimeSlots(history[nextIndex]);
  };

  return {
    timeSlots,
    error,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    applyManualEdit,
    generate: () => runGeneration(true),
    rescheduleKeepOrder: () => runGeneration(false),
    undo,
    redo
  };
};
