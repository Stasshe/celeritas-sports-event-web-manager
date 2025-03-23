import { Sport, ScheduleSettings, TimeSlot, Match, LeagueScheduleSettings } from '../types';

// 時間を分に変換するヘルパー関数
export const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

// 分を時間形式に変換するヘルパー関数
export const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

// 時間が範囲内かチェックするヘルパー関数
const isTimeInRange = (time: number, start: number, end: number): boolean => {
  return time >= start && time <= end;
};

// ランチ休憩と重複するかチェックする関数
const overlapsWithLunch = (
  startMinutes: number,
  endMinutes: number,
  lunchBreak?: { startTime: string; endTime: string } | null
): boolean => {
  if (!lunchBreak) return false;
  
  const lunchStartMinutes = timeToMinutes(lunchBreak.startTime);
  const lunchEndMinutes = timeToMinutes(lunchBreak.endTime);
  
  // 完全に包含される場合
  if (startMinutes <= lunchStartMinutes && endMinutes >= lunchEndMinutes) return true;
  
  // 部分的に重複する場合
  if (
    (startMinutes >= lunchStartMinutes && startMinutes < lunchEndMinutes) ||
    (endMinutes > lunchStartMinutes && endMinutes <= lunchEndMinutes) ||
    (startMinutes <= lunchStartMinutes && endMinutes >= lunchStartMinutes)
  ) {
    return true;
  }
  
  return false;
};

// 他の休憩時間と重複するかチェックする関数 - 型を修正
const overlapsWithBreakTimes = (
  startMinutes: number,
  endMinutes: number,
  breakTimes?: TimeSlot[] | null
): boolean => {
  if (!breakTimes || breakTimes.length === 0) return false;
  
  return breakTimes.some(breakTime => {
    const breakStartMinutes = timeToMinutes(breakTime.startTime);
    const breakEndMinutes = timeToMinutes(breakTime.endTime);
    
    // 完全に包含される場合
    if (startMinutes <= breakStartMinutes && endMinutes >= breakEndMinutes) return true;
    
    // 部分的に重複する場合
    if (
      (startMinutes >= breakStartMinutes && startMinutes < breakEndMinutes) ||
      (endMinutes > breakStartMinutes && endMinutes <= breakEndMinutes) ||
      (startMinutes <= breakStartMinutes && endMinutes >= breakStartMinutes)
    ) {
      return true;
    }
    
    return false;
  });
};

// スケジュールを生成する関数 - 型安全なnull/undefinedチェックを追加
export const generateSchedule = (sport: Sport, settings: ScheduleSettings): TimeSlot[] => {
  const timeSlots: TimeSlot[] = [];
  
  // 開始時間と終了時間を分に変換
  const startMinutes = timeToMinutes(settings.startTime);
  const endMinutes = timeToMinutes(settings.endTime);
  const totalMinutes = endMinutes - startMinutes;
  
  // 重要な休憩時間をスケジュールに追加
  if (settings.lunchBreak) {
    timeSlots.push({
      startTime: settings.lunchBreak.startTime,
      endTime: settings.lunchBreak.endTime,
      title: 'ランチ休憩',
      type: 'lunch'
    });
  }
  
  // 追加の休憩時間をスケジュールに追加 - 型を修正
  const breakTimes = settings.breakTimes || [];
  if (breakTimes.length > 0) {
    breakTimes.forEach(breakTime => {
      timeSlots.push({
        ...breakTime,
        type: 'break'
      });
    });
  }
  
  // スケジュールの生成ロジックを競技タイプごとに実装
  if (sport.type === 'ranking') {
    // ランキング形式は開始時間と終了時間の情報のみ
    // 必要に応じて全体時間のタイムスロットを追加
    timeSlots.push({
      startTime: settings.startTime,
      endTime: settings.endTime,
      title: '競技時間',
      type: 'preparation',
      description: 'ランキング競技の時間枠'
    });
    return timeSlots.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  }
  
  if (sport.type === 'league') {
    return generateLeagueSchedule(sport, settings as LeagueScheduleSettings, timeSlots);
  }
  
  // トーナメントまたは総当たり戦のスケジュール生成
  return generateMatchBasedSchedule(sport, settings, timeSlots);
};

// 試合ベースのスケジュール生成（トーナメント/総当たり戦）
const generateMatchBasedSchedule = (
  sport: Sport,
  settings: ScheduleSettings,
  initialTimeSlots: TimeSlot[]
): TimeSlot[] => {
  const timeSlots = [...initialTimeSlots];
  const { matches } = sport;
  
  if (!matches || matches.length === 0) {
    throw new Error('No matches found for scheduling');
  }
  
  // 開始時間と終了時間を分に変換
  const startMinutes = timeToMinutes(settings.startTime);
  const endMinutes = timeToMinutes(settings.endTime);
  
  // 必要な時間の計算
  const matchDurationWithBreak = settings.matchDuration + settings.breakDuration;
  const totalMatchTime = matchDurationWithBreak * matches.length - settings.breakDuration; // 最後の休憩は不要
  
  // 時間が足りるかチェック
  const availableMinutes = endMinutes - startMinutes;
  if (totalMatchTime > availableMinutes) {
    throw new Error(`Not enough time for all matches. Need ${totalMatchTime} minutes but only have ${availableMinutes} minutes.`);
  }
  
  // 試合をスケジュールに追加
  let currentMinutes = startMinutes;
  
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    
    // 休憩とランチが被らないように調整 - 型を修正
    while (
      overlapsWithLunch(currentMinutes, currentMinutes + settings.matchDuration, settings.lunchBreak) ||
      overlapsWithBreakTimes(currentMinutes, currentMinutes + settings.matchDuration, settings.breakTimes)
    ) {
      // 休憩が終わるまで時間をスキップ
      if (settings.lunchBreak && 
          currentMinutes >= timeToMinutes(settings.lunchBreak.startTime) && 
          currentMinutes < timeToMinutes(settings.lunchBreak.endTime)) {
        currentMinutes = timeToMinutes(settings.lunchBreak.endTime);
      } else if (settings.breakTimes) {
        // 他の休憩時間とも重複しないようにスキップ
        for (const breakTime of settings.breakTimes) {
          if (
            currentMinutes >= timeToMinutes(breakTime.startTime) && 
            currentMinutes < timeToMinutes(breakTime.endTime)
          ) {
            currentMinutes = timeToMinutes(breakTime.endTime);
            break;
          }
        }
      } else {
        // 安全措置：無限ループを防ぐ
        currentMinutes += 5;
      }
      
      // 終了時間を超えた場合はエラー
      if (currentMinutes >= endMinutes) {
        throw new Error('Could not fit all matches into the schedule due to breaks');
      }
    }
    
    // 試合を追加
    timeSlots.push({
      startTime: minutesToTime(currentMinutes),
      endTime: minutesToTime(currentMinutes + settings.matchDuration),
      type: 'match',
      matchId: match.id
    });
    
    // 次の時間に移動
    currentMinutes += settings.matchDuration;
    
    // 休憩を追加（最後の試合を除く）
    if (i < matches.length - 1) {
      currentMinutes += settings.breakDuration;
    }
    
    // 終了時間を超えた場合はエラー
    if (currentMinutes > endMinutes) {
      throw new Error('Schedule exceeds the end time');
    }
  }
  
  // 時間順にソート
  return timeSlots.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
};

// リーグ戦のスケジュール生成 - 型を修正
const generateLeagueSchedule = (
  sport: Sport,
  settings: LeagueScheduleSettings,
  initialTimeSlots: TimeSlot[]
): TimeSlot[] => {
  const timeSlots = [...initialTimeSlots];
  const { matches } = sport;
  
  if (!matches || matches.length === 0) {
    throw new Error('No matches found for scheduling');
  }
  
  // 開始時間と終了時間を分に変換
  const startMinutes = timeToMinutes(settings.startTime);
  const endMinutes = timeToMinutes(settings.endTime);
  
  // グループステージとプレーオフの試合を分ける
  const groupMatches = matches.filter(m => m.blockId !== undefined);
  const playoffMatches = matches.filter(m => m.blockId === undefined && m.round > 0);
  
  if (groupMatches.length === 0) {
    throw new Error('No group stage matches found');
  }
  
  // グループステージの時間計算
  const groupDurationWithBreak = settings.groupStageDuration + settings.breakDuration;
  const totalGroupTime = groupDurationWithBreak * groupMatches.length - settings.breakDuration; // 最後の休憩は不要
  
  // プレーオフの時間計算（存在する場合）
  let totalPlayoffTime = 0;
  if (playoffMatches.length > 0) {
    const playoffDurationWithBreak = settings.playoffDuration + settings.breakDuration;
    totalPlayoffTime = playoffDurationWithBreak * playoffMatches.length - settings.breakDuration + settings.breakBetweenStages;
  }
  
  // 時間が足りるかチェック
  const totalRequiredTime = totalGroupTime + totalPlayoffTime;
  const availableMinutes = endMinutes - startMinutes;
  
  if (totalRequiredTime > availableMinutes) {
    throw new Error(`Not enough time for all matches. Need ${totalRequiredTime} minutes but only have ${availableMinutes} minutes.`);
  }
  
  // グループステージの試合をスケジュールに追加
  let currentMinutes = startMinutes;
  
  for (let i = 0; i < groupMatches.length; i++) {
    const match = groupMatches[i];
    
    // 休憩とランチが被らないように調整 - 型を修正
    while (
      overlapsWithLunch(currentMinutes, currentMinutes + settings.groupStageDuration, settings.lunchBreak) ||
      overlapsWithBreakTimes(currentMinutes, currentMinutes + settings.groupStageDuration, settings.breakTimes || [])
    ) {
      // 休憩が終わるまで時間をスキップ
      if (settings.lunchBreak && 
          currentMinutes >= timeToMinutes(settings.lunchBreak.startTime) && 
          currentMinutes < timeToMinutes(settings.lunchBreak.endTime)) {
        currentMinutes = timeToMinutes(settings.lunchBreak.endTime);
      } else if (settings.breakTimes) {
        // 他の休憩時間とも重複しないようにスキップ
        for (const breakTime of settings.breakTimes) {
          if (
            currentMinutes >= timeToMinutes(breakTime.startTime) && 
            currentMinutes < timeToMinutes(breakTime.endTime)
          ) {
            currentMinutes = timeToMinutes(breakTime.endTime);
            break;
          }
        }
      } else {
        // 安全措置：無限ループを防ぐ
        currentMinutes += 5;
      }
      
      // 終了時間を超えた場合はエラー
      if (currentMinutes >= endMinutes) {
        throw new Error('Could not fit all matches into the schedule due to breaks');
      }
    }
    
    // 試合を追加
    timeSlots.push({
      startTime: minutesToTime(currentMinutes),
      endTime: minutesToTime(currentMinutes + settings.groupStageDuration),
      type: 'match',
      matchId: match.id,
      description: `グループステージ: ${match.blockId}`
    });
    
    // 次の時間に移動
    currentMinutes += settings.groupStageDuration;
    
    // 休憩を追加（最後の試合を除く）
    if (i < groupMatches.length - 1) {
      currentMinutes += settings.breakDuration;
    }
  }
  
  // グループステージとプレーオフの間の休憩
  if (playoffMatches.length > 0) {
    currentMinutes += settings.breakBetweenStages;
    
    // ステージ間の休憩を追加
    timeSlots.push({
      startTime: minutesToTime(currentMinutes - settings.breakBetweenStages),
      endTime: minutesToTime(currentMinutes),
      title: 'ステージ間休憩',
      type: 'break',
      description: 'グループステージとプレーオフの間の休憩'
    });
    
    // プレーオフの試合をスケジュールに追加
    for (let i = 0; i < playoffMatches.length; i++) {
      const match = playoffMatches[i];
      
      // 休憩とランチが被らないように調整 - 型を修正
      while (
        overlapsWithLunch(currentMinutes, currentMinutes + settings.playoffDuration, settings.lunchBreak) ||
        overlapsWithBreakTimes(currentMinutes, currentMinutes + settings.playoffDuration, settings.breakTimes || [])
      ) {
        // 休憩が終わるまで時間をスキップ
        if (settings.lunchBreak && 
            currentMinutes >= timeToMinutes(settings.lunchBreak.startTime) && 
            currentMinutes < timeToMinutes(settings.lunchBreak.endTime)) {
          currentMinutes = timeToMinutes(settings.lunchBreak.endTime);
        } else if (settings.breakTimes) {
          // 他の休憩時間とも重複しないようにスキップ
          for (const breakTime of settings.breakTimes) {
            if (
              currentMinutes >= timeToMinutes(breakTime.startTime) && 
              currentMinutes < timeToMinutes(breakTime.endTime)
            ) {
              currentMinutes = timeToMinutes(breakTime.endTime);
              break;
            }
          }
        } else {
          // 安全措置：無限ループを防ぐ
          currentMinutes += 5;
        }
        
        // 終了時間を超えた場合はエラー
        if (currentMinutes >= endMinutes) {
          throw new Error('Could not fit all matches into the schedule due to breaks');
        }
      }
      
      // ラウンド名を取得
      let roundName = '';
      switch (match.round) {
        case 1:
          roundName = 'プレーオフ: 決勝';
          break;
        case 2:
          roundName = 'プレーオフ: 準決勝';
          break;
        case 3:
          roundName = 'プレーオフ: 準々決勝';
          break;
        default:
          roundName = `プレーオフ: ラウンド${match.round}`;
      }
      
      // 試合を追加
      timeSlots.push({
        startTime: minutesToTime(currentMinutes),
        endTime: minutesToTime(currentMinutes + settings.playoffDuration),
        type: 'match',
        matchId: match.id,
        description: roundName
      });
      
      // 次の時間に移動
      currentMinutes += settings.playoffDuration;
      
      // 休憩を追加（最後の試合を除く）
      if (i < playoffMatches.length - 1) {
        currentMinutes += settings.breakDuration;
      }
    }
  }
  
  // 時間順にソート
  return timeSlots.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
};
