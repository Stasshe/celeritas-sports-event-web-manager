import { useEffect, useRef, useState } from 'react';
import { LeagueScheduleSettings, ScheduleSettings, Sport, TimeSlot } from '../types';

export const buildDefaultSettings = (
  sport: Sport,
  hasLunchBreak: boolean
): ScheduleSettings | LeagueScheduleSettings => {
  const base: ScheduleSettings = {
    startTime: '09:00',
    endTime: '17:00',
    matchDuration: 20,
    breakDuration: 5,
    courtCount: 1,
    courtNames: { court1: '第1コート', court2: '第2コート' },
    lunchBreak: hasLunchBreak ? { startTime: '12:00', endTime: '13:00' } : undefined,
    breakTimes: []
  };

  if (sport.type !== 'league') return base;

  const leagueDefaults: LeagueScheduleSettings = {
    ...base,
    groupStageDuration: 10,
    playoffDuration: 10,
    breakBetweenStages: 5
  };
  return leagueDefaults;
};

const numericFields = new Set([
  'matchDuration',
  'breakDuration',
  'groupStageDuration',
  'playoffDuration',
  'breakBetweenStages',
  'blockToPlayoffBreak'
]);

interface UseScheduleSettingsFormArgs {
  sport: Sport;
  getTimeSlots: () => TimeSlot[];
  onUpdate: (sport: Sport) => void;
}

export interface ScheduleSettingsForm {
  settings: ScheduleSettings | LeagueScheduleSettings;
  hasLunchBreak: boolean;
  newBreakTime: Omit<TimeSlot, 'type'>;
  resetForSport: (sport: Sport) => void;
  handleFieldChange: (name: string, value: string) => void;
  handleAllowOverrunChange: (checked: boolean) => void;
  handleCourtCountChange: (count: 1 | 2) => void;
  handleCourtNameChange: (court: 'court1' | 'court2', value: string) => void;
  handleMatchIncludedChange: (matchId: string, included: boolean) => void;
  handleLunchBreakToggle: (checked: boolean) => void;
  handleLunchBreakChange: (field: 'startTime' | 'endTime', value: string) => void;
  handleNewBreakTimeChange: (field: 'startTime' | 'endTime' | 'title', value: string) => void;
  handleAddBreakTime: () => void;
  handleRemoveBreakTime: (index: number) => void;
}

export const useScheduleSettingsForm = ({
  sport,
  getTimeSlots,
  onUpdate
}: UseScheduleSettingsFormArgs): ScheduleSettingsForm => {
  const [hasLunchBreak, setHasLunchBreak] = useState<boolean>(!!sport.scheduleSettings?.lunchBreak);
  const [settings, setSettings] = useState<ScheduleSettings | LeagueScheduleSettings>(
    sport.scheduleSettings || buildDefaultSettings(sport, hasLunchBreak)
  );
  const [newBreakTime, setNewBreakTime] = useState<Omit<TimeSlot, 'type'>>({
    startTime: '11:00',
    endTime: '11:15',
    title: '休憩'
  });

  const commit = (updatedSettings: ScheduleSettings | LeagueScheduleSettings) => {
    setSettings(updatedSettings);
    onUpdate({
      ...sport,
      scheduleSettings: {
        ...updatedSettings,
        lunchBreak: updatedSettings.lunchBreak || null,
        breakTimes: updatedSettings.breakTimes || [],
        timeSlots: getTimeSlots()
      }
    });
  };

  const resetForSport = (nextSport: Sport) => {
    const nextHasLunchBreak = !!nextSport.scheduleSettings?.lunchBreak;
    setHasLunchBreak(nextHasLunchBreak);
    setSettings(nextSport.scheduleSettings || buildDefaultSettings(nextSport, nextHasLunchBreak));
  };

  // スポーツ切り替え時のみ設定を再初期化（同一スポーツの再レンダーでは維持）
  const sportIdRef = useRef(sport.id);
  useEffect(() => {
    if (sportIdRef.current === sport.id) return;
    sportIdRef.current = sport.id;
    resetForSport(sport);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sport.id]);

  const handleFieldChange = (name: string, value: string) => {
    commit({
      ...settings,
      [name]: numericFields.has(name) ? parseInt(value) || 0 : value
    });
  };

  const handleAllowOverrunChange = (checked: boolean) => {
    commit({ ...settings, allowEndTimeOverrun: checked });
  };

  const handleCourtCountChange = (count: 1 | 2) => {
    commit({ ...settings, courtCount: count });
  };

  const handleCourtNameChange = (court: 'court1' | 'court2', value: string) => {
    const currentCourtNames = settings.courtNames || {
      court1: '第1コート',
      court2: settings.courtCount > 1 ? '第2コート' : undefined
    };
    commit({ ...settings, courtNames: { ...currentCourtNames, [court]: value } });
  };

  const handleMatchIncludedChange = (matchId: string, included: boolean) => {
    const excludedMatchIds = new Set(settings.excludedMatchIds || []);
    if (included) {
      excludedMatchIds.delete(matchId);
    } else {
      excludedMatchIds.add(matchId);
    }
    commit({ ...settings, excludedMatchIds: [...excludedMatchIds] });
  };

  const handleLunchBreakToggle = (checked: boolean) => {
    setHasLunchBreak(checked);
    commit({
      ...settings,
      lunchBreak: checked ? { startTime: '12:00', endTime: '13:00' } : null
    });
  };

  const handleLunchBreakChange = (field: 'startTime' | 'endTime', value: string) => {
    commit({
      ...settings,
      lunchBreak: { ...settings.lunchBreak!, [field]: value }
    });
  };

  const handleNewBreakTimeChange = (field: 'startTime' | 'endTime' | 'title', value: string) => {
    setNewBreakTime(prev => ({ ...prev, [field]: value }));
  };

  const handleAddBreakTime = () => {
    const newBreak: TimeSlot = { ...newBreakTime, type: 'break' };
    commit({ ...settings, breakTimes: [...(settings.breakTimes || []), newBreak] });
    setNewBreakTime({ startTime: '11:00', endTime: '11:15', title: '休憩' });
  };

  const handleRemoveBreakTime = (index: number) => {
    const updatedBreakTimes = [...(settings.breakTimes || [])];
    updatedBreakTimes.splice(index, 1);
    commit({ ...settings, breakTimes: updatedBreakTimes });
  };

  return {
    settings,
    hasLunchBreak,
    newBreakTime,
    resetForSport,
    handleFieldChange,
    handleAllowOverrunChange,
    handleCourtCountChange,
    handleCourtNameChange,
    handleMatchIncludedChange,
    handleLunchBreakToggle,
    handleLunchBreakChange,
    handleNewBreakTimeChange,
    handleAddBreakTime,
    handleRemoveBreakTime
  };
};
