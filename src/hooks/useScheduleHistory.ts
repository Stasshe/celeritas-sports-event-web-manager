import { useEffect, useRef, useState } from 'react';
import { LeagueScheduleSettings, ScheduleSettings, Sport, TimeSlot } from '../types';
import { generateSchedule } from '../utils/scheduleGenerator';

const historyKey = (sportId: string) => `scheduleHistory_${sportId}`;

const loadHistory = (sportId: string): TimeSlot[][] | null => {
  const saved = localStorage.getItem(historyKey(sportId));
  if (!saved) return null;
  try {
    return JSON.parse(saved) as TimeSlot[][];
  } catch {
    return null;
  }
};

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
  const [history, setHistory] = useState<TimeSlot[][]>(() => {
    const saved = loadHistory(sport.id);
    return saved ?? [sport.scheduleSettings?.timeSlots || []];
  });
  const [historyIndex, setHistoryIndex] = useState<number>(() => {
    const saved = loadHistory(sport.id);
    return saved ? saved.length - 1 : 0;
  });
  const [error, setError] = useState<string | null>(null);

  // スポーツ切り替え時のみローカルstateを再初期化
  useEffect(() => {
    if (sportIdRef.current === sport.id) return;
    sportIdRef.current = sport.id;
    const saved = loadHistory(sport.id);
    const initialSlots = sport.scheduleSettings?.timeSlots || [];
    setTimeSlots(saved ? saved[saved.length - 1] : initialSlots);
    setHistory(saved ?? [initialSlots]);
    setHistoryIndex(saved ? saved.length - 1 : 0);
    setError(null);
  }, [sport.id, sport.scheduleSettings]);

  useEffect(() => {
    if (history.length === 0) return;
    localStorage.setItem(historyKey(sport.id), JSON.stringify(history));
  }, [history, sport.id]);

  const pushHistory = (slots: TimeSlot[]) => {
    const truncated = history.slice(0, historyIndex + 1);
    setHistory([...truncated, slots]);
    setHistoryIndex(truncated.length);
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
