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

// シード戦かどうかを判定する関数
const isSeedMatch = (match: Match): boolean => {
  // 片方のチームだけが存在する場合はシード戦
  return (!!match.team1Id && !match.team2Id) || (!match.team1Id && !!match.team2Id) || 
         (match.team1Id?.includes('seed') || match.team2Id?.includes('seed') || 
          match.team1Id?.includes('tbd') || match.team2Id?.includes('tbd') ||
          match.team1Id?.includes('unknown') || match.team2Id?.includes('unknown'));
};

// 同じクラスのチームが同時に試合しないようにチェックする関数
const hasClassConflict = (
  match1: Match, 
  match2: Match, 
  teamClassMap: Record<string, string>
): boolean => {
  // クラス情報がない場合は競合なし
  if (!teamClassMap) return false;
  
  const team1Class = match1.team1Id ? teamClassMap[match1.team1Id] : null;
  const team2Class = match1.team2Id ? teamClassMap[match1.team2Id] : null;
  const team3Class = match2.team1Id ? teamClassMap[match2.team1Id] : null;
  const team4Class = match2.team2Id ? teamClassMap[match2.team2Id] : null;
  
  // クラスが設定されていない場合は競合なし
  if (!team1Class && !team2Class && !team3Class && !team4Class) return false;
  
  // チーム自体の重複をチェック
  if (
    (match1.team1Id && (match1.team1Id === match2.team1Id || match1.team1Id === match2.team2Id)) ||
    (match1.team2Id && (match1.team2Id === match2.team1Id || match1.team2Id === match2.team2Id))
  ) {
    return true;
  }
  
  // クラスの重複をチェック
  if (
    (team1Class && (team1Class === team3Class || team1Class === team4Class)) ||
    (team2Class && (team2Class === team3Class || team2Class === team4Class))
  ) {
    return true;
  }
  
  return false;
};

// 2会場のみサポートする設定インターフェース
interface DualVenueScheduleSettings extends ScheduleSettings {
  useMultiVenue?: boolean;
  venues?: Array<{
    id: 'main' | 'secondary';
    name: string;
  }>;
  teamClasses?: Record<string, string>;
}

// スケジュール生成関数の型定義を明確に
export const generateSchedule = (sport: Sport, settings: ScheduleSettings): TimeSlot[] => {
  const timeSlots: TimeSlot[] = [];
  
  // 2会場対応の設定としてキャスト
  const dualVenueSettings = settings as DualVenueScheduleSettings;
  
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
  
  // 会場の設定 - 1つか2つの会場のみサポート
  const useMultiVenue = dualVenueSettings.useMultiVenue || false;
  const venues = dualVenueSettings.venues || [{ id: 'main', name: 'メイン会場' }];
  
  // 複数会場を使用する場合は最大2つまでに制限
  const actualVenues = useMultiVenue ? venues.slice(0, 2) : [venues[0]];
  
  // スケジュールの生成ロジックを競技タイプごとに実装
  if (sport.type === 'ranking') {
    // ランキング形式は単純に開始時間と終了時間のみ
    return timeSlots;
  }
  
  if (sport.type === 'league') {
    if (useMultiVenue) {
      return generateDualVenueLeagueSchedule(sport, dualVenueSettings, timeSlots, actualVenues);
    }
    return generateLeagueSchedule(sport, settings as LeagueScheduleSettings, timeSlots);
  }
  
  // トーナメントまたは総当たり戦のスケジュール生成
  if (useMultiVenue) {
    return generateDualVenueMatchSchedule(sport, dualVenueSettings, timeSlots, actualVenues);
  }
  return generateMatchBasedSchedule(sport, settings, timeSlots);
};

// 2会場でのトーナメント/総当たり戦のスケジュール生成
const generateDualVenueMatchSchedule = (
  sport: Sport,
  settings: DualVenueScheduleSettings,
  initialTimeSlots: TimeSlot[],
  venues: Array<{ id: 'main' | 'secondary'; name: string }>
): TimeSlot[] => {
  const timeSlots = [...initialTimeSlots];
  let { matches } = sport;
  
  if (!matches || matches.length === 0) {
    throw new Error('No matches found for scheduling');
  }
  
  // シード戦を処理（シード戦はスキップする）
  const seedMatches = matches.filter(match => isSeedMatch(match));
  const normalMatches = matches.filter(match => !isSeedMatch(match));
  
  // シード戦は自動的に勝者が決まるものとして処理
  seedMatches.forEach(match => {
    const winnerId = match.team1Id || match.team2Id;
    if (!match.winnerId && winnerId) {
      // 自動的に勝者を設定
      match.winnerId = winnerId;
      match.team1Score = match.team1Id ? 1 : 0;
      match.team2Score = match.team2Id ? 1 : 0;
    }
  });
  
  // 開始時間と終了時間を分に変換
  const startMinutes = timeToMinutes(settings.startTime);
  const endMinutes = timeToMinutes(settings.endTime);
  
  // 2会場用の簡素化されたスケジューリング
  let currentMinutes = startMinutes;
  
  // ラウンド別に試合をグループ化
  const matchesByRound: Record<number, Match[]> = {};
  normalMatches.forEach(match => {
    const round = match.round || 1;
    if (!matchesByRound[round]) {
      matchesByRound[round] = [];
    }
    matchesByRound[round].push(match);
  });
  
  const roundNumbers = Object.keys(matchesByRound).map(Number).sort((a, b) => a - b);
  
  for (const round of roundNumbers) {
    const matchesInRound = matchesByRound[round];
    
    // 2会場で同時に進行できる場合
    const canRunConcurrently = venues.length > 1;
    
    // 同時開催できる試合数を計算
    const batchSize = canRunConcurrently ? 2 : 1;
    const numBatches = Math.ceil(matchesInRound.length / batchSize);
    
    for (let batchIndex = 0; batchIndex < numBatches; batchIndex++) {
      // 休憩とランチが被らないように調整
      while (
        overlapsWithLunch(currentMinutes, currentMinutes + settings.matchDuration, settings.lunchBreak) ||
        overlapsWithBreakTimes(currentMinutes, currentMinutes + settings.matchDuration, settings.breakTimes)
      ) {
        if (settings.lunchBreak && 
            currentMinutes >= timeToMinutes(settings.lunchBreak.startTime) && 
            currentMinutes < timeToMinutes(settings.lunchBreak.endTime)) {
          currentMinutes = timeToMinutes(settings.lunchBreak.endTime);
        } else if (settings.breakTimes) {
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
          currentMinutes += 5;
        }
        
        if (currentMinutes >= endMinutes) {
          throw new Error('Could not fit all matches into the schedule due to breaks');
        }
      }
      
      // このバッチの試合を取得
      const startIdx = batchIndex * batchSize;
      const endIdx = Math.min(startIdx + batchSize, matchesInRound.length);
      const batchMatches = matchesInRound.slice(startIdx, endIdx);
      
      // 各試合を会場に割り当て
      batchMatches.forEach((match, idx) => {
        const venue = idx < venues.length ? venues[idx] : venues[0];
        
        timeSlots.push({
          startTime: minutesToTime(currentMinutes),
          endTime: minutesToTime(currentMinutes + settings.matchDuration),
          type: 'match',
          matchId: match.id,
          venueId: venue.id,
          venueName: venue.name,
          description: `ラウンド ${match.round || 1} - ${venue.name}`
        });
      });
      
      // 次の時間枠に進む
      currentMinutes += settings.matchDuration + settings.breakDuration;
    }
    
    // ラウンド間の休憩（最終ラウンドを除く）
    if (round < Math.max(...roundNumbers)) {
      // ラウンド間の休憩を追加
      const roundBreakLength = 15; // ラウンド間の休憩時間（分）
      
      timeSlots.push({
        startTime: minutesToTime(currentMinutes),
        endTime: minutesToTime(currentMinutes + roundBreakLength),
        title: `ラウンド ${round} 終了`,
        type: 'break',
        description: `ラウンド ${round} と ${round + 1} の間の休憩`
      });
      
      currentMinutes += roundBreakLength;
    }
  }
  
  // 時間順にソート
  return timeSlots.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
};

// 2会場でのリーグ戦スケジュール生成
const generateDualVenueLeagueSchedule = (
  sport: Sport,
  settings: DualVenueScheduleSettings & { 
    groupStageDuration?: number, 
    playoffDuration?: number, 
    breakBetweenStages?: number 
  },
  initialTimeSlots: TimeSlot[],
  venues: Array<{ id: 'main' | 'secondary'; name: string }>
): TimeSlot[] => {
  // 簡素化された2会場対応のリーグスケジュール生成ロジック
  const timeSlots = [...initialTimeSlots];
  let { matches } = sport;
  
  if (!matches || matches.length === 0) {
    throw new Error('No matches found for scheduling');
  }
  
  // シード戦を処理（スキップする）
  const seedMatches = matches.filter(match => isSeedMatch(match));
  const normalMatches = matches.filter(match => !isSeedMatch(match));
  
  // シード戦は自動的に勝者を設定
  seedMatches.forEach(match => {
    const winnerId = match.team1Id || match.team2Id;
    if (!match.winnerId && winnerId) {
      match.winnerId = winnerId;
      match.team1Score = match.team1Id ? 1 : 0;
      match.team2Score = match.team2Id ? 1 : 0;
    }
  });
  
  // グループステージとプレーオフに分ける
  const groupMatches = normalMatches.filter(m => m.blockId !== undefined);
  const playoffMatches = normalMatches.filter(m => m.blockId === undefined && m.round > 0);
  
  // 開始時間と終了時間を分に変換
  const startMinutes = timeToMinutes(settings.startTime);
  const endMinutes = timeToMinutes(settings.endTime);
  
  // 2会場で同時に進行できる場合
  const canRunConcurrently = venues.length > 1;
  
  // リーグ戦特有の設定を取得
  const groupStageDuration = settings.groupStageDuration || 15;
  const playoffDuration = settings.playoffDuration || 20;
  const breakBetweenStages = settings.breakBetweenStages || 30;
  
  let currentMinutes = startMinutes;
  
  // グループステージの試合を処理
  if (groupMatches.length > 0) {
    // バッチサイズを決定
    const batchSize = canRunConcurrently ? 2 : 1;
    const numBatches = Math.ceil(groupMatches.length / batchSize);
    
    for (let batchIndex = 0; batchIndex < numBatches; batchIndex++) {
      // 休憩とランチが被らないように調整
      while (
        overlapsWithLunch(currentMinutes, currentMinutes + groupStageDuration, settings.lunchBreak) ||
        overlapsWithBreakTimes(currentMinutes, currentMinutes + groupStageDuration, settings.breakTimes)
      ) {
        if (settings.lunchBreak && 
            currentMinutes >= timeToMinutes(settings.lunchBreak.startTime) && 
            currentMinutes < timeToMinutes(settings.lunchBreak.endTime)) {
          currentMinutes = timeToMinutes(settings.lunchBreak.endTime);
        } else if (settings.breakTimes) {
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
          currentMinutes += 5;
        }
        
        if (currentMinutes >= endMinutes) {
          throw new Error('Could not fit all matches into the schedule due to breaks');
        }
      }
      
      // このバッチの試合を取得
      const startIdx = batchIndex * batchSize;
      const endIdx = Math.min(startIdx + batchSize, groupMatches.length);
      const batchMatches = groupMatches.slice(startIdx, endIdx);
      
      // 各試合を会場に割り当て
      batchMatches.forEach((match, idx) => {
        const venue = idx < venues.length ? venues[idx] : venues[0];
        
        timeSlots.push({
          startTime: minutesToTime(currentMinutes),
          endTime: minutesToTime(currentMinutes + groupStageDuration),
          type: 'match',
          matchId: match.id,
          venueId: venue.id,
          venueName: venue.name,
          description: `グループステージ: ${match.blockId} - ${venue.name}`
        });
      });
      
      // 次の時間枠に進む
      currentMinutes += groupStageDuration + settings.breakDuration;
    }
  }
  
  // プレーオフステージの前に休憩を入れる
  if (playoffMatches.length > 0 && groupMatches.length > 0) {
    timeSlots.push({
      startTime: minutesToTime(currentMinutes),
      endTime: minutesToTime(currentMinutes + breakBetweenStages),
      title: 'ステージ間休憩',
      type: 'break',
      description: 'グループステージとプレーオフの間の休憩'
    });
    
    currentMinutes += breakBetweenStages;
    
    // プレーオフをラウンドごとにグループ化
    const matchesByRound: Record<number, Match[]> = {};
    playoffMatches.forEach(match => {
      const round = match.round || 1;
      if (!matchesByRound[round]) {
        matchesByRound[round] = [];
      }
      matchesByRound[round].push(match);
    });
    
    // ラウンドごとに処理
    const roundNumbers = Object.keys(matchesByRound).map(Number).sort((a, b) => b - a); // 降順（決勝から開始）
    
    for (const round of roundNumbers) {
      const matchesInRound = matchesByRound[round];
      
      // バッチサイズを決定
      const batchSize = canRunConcurrently ? 2 : 1;
      const numBatches = Math.ceil(matchesInRound.length / batchSize);
      
      for (let batchIndex = 0; batchIndex < numBatches; batchIndex++) {
        // 休憩とランチが被らないように調整
        while (
          overlapsWithLunch(currentMinutes, currentMinutes + playoffDuration, settings.lunchBreak) ||
          overlapsWithBreakTimes(currentMinutes, currentMinutes + playoffDuration, settings.breakTimes)
        ) {
          if (settings.lunchBreak && 
              currentMinutes >= timeToMinutes(settings.lunchBreak.startTime) && 
              currentMinutes < timeToMinutes(settings.lunchBreak.endTime)) {
            currentMinutes = timeToMinutes(settings.lunchBreak.endTime);
          } else if (settings.breakTimes) {
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
            currentMinutes += 5;
          }
          
          if (currentMinutes >= endMinutes) {
            throw new Error('Could not fit all matches into the schedule due to breaks');
          }
        }
        
        // このバッチの試合を取得
        const startIdx = batchIndex * batchSize;
        const endIdx = Math.min(startIdx + batchSize, matchesInRound.length);
        const batchMatches = matchesInRound.slice(startIdx, endIdx);
        
        // ラウンド名を取得
        let roundName = '';
        switch (round) {
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
            roundName = `プレーオフ: ラウンド${round}`;
        }
        
        // 各試合を会場に割り当て
        batchMatches.forEach((match, idx) => {
          const venue = idx < venues.length ? venues[idx] : venues[0];
          
          timeSlots.push({
            startTime: minutesToTime(currentMinutes),
            endTime: minutesToTime(currentMinutes + playoffDuration),
            type: 'match',
            matchId: match.id,
            venueId: venue.id,
            venueName: venue.name,
            description: `${roundName} - ${venue.name}`
          });
        });
        
        // 次の時間枠に進む
        currentMinutes += playoffDuration + settings.breakDuration;
      }
    }
  }
  
  // 時間順にソート
  return timeSlots.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
};

// 試合ベースのスケジュール生成（トーナメント/総当たり戦）
const generateMatchBasedSchedule = (
  sport: Sport,
  settings: ScheduleSettings,
  initialTimeSlots: TimeSlot[]
): TimeSlot[] => {
  const timeSlots = [...initialTimeSlots];
  let { matches } = sport;
  
  if (!matches || matches.length === 0) {
    throw new Error('No matches found for scheduling');
  }
  
  // シード戦をフィルタリング
  const normalMatches = matches.filter(match => !isSeedMatch(match));
  
  // 開始時間と終了時間を分に変換
  const startMinutes = timeToMinutes(settings.startTime);
  const endMinutes = timeToMinutes(settings.endTime);
  
  // 必要な時間の計算
  const matchDurationWithBreak = settings.matchDuration + settings.breakDuration;
  const totalMatchTime = matchDurationWithBreak * normalMatches.length - settings.breakDuration; // 最後の休憩は不要
  
  // 時間が足りるかチェック
  const availableMinutes = endMinutes - startMinutes;
  if (totalMatchTime > availableMinutes) {
    throw new Error(`Not enough time for all matches. Need ${totalMatchTime} minutes but only have ${availableMinutes} minutes.`);
  }
  
  // 試合をスケジュールに追加
  let currentMinutes = startMinutes;
  
  for (let i = 0; i < normalMatches.length; i++) {
    const match = normalMatches[i];
    
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
      matchId: match.id,
      description: match.round ? `ラウンド ${match.round}` : undefined
    });
    
    // 次の時間に移動
    currentMinutes += settings.matchDuration;
    
    // 休憩を追加（最後の試合を除く）
    if (i < normalMatches.length - 1) {
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

// リーグ戦のスケジュール生成は正確な型定義で
const generateLeagueSchedule = (
  sport: Sport,
  settings: ScheduleSettings & { 
    groupStageDuration?: number, 
    playoffDuration?: number, 
    breakBetweenStages?: number 
  },
  initialTimeSlots: TimeSlot[]
): TimeSlot[] => {
  const timeSlots = [...initialTimeSlots];
  let { matches } = sport;
  
  if (!matches || matches.length === 0) {
    throw new Error('No matches found for scheduling');
  }
  
  // シード戦をフィルタリング
  const normalMatches = matches.filter(match => !isSeedMatch(match));
  
  // グループステージとプレーオフの試合を分ける
  const groupMatches = normalMatches.filter(m => m.blockId !== undefined);
  const playoffMatches = normalMatches.filter(m => m.blockId === undefined && m.round > 0);
  
  if (groupMatches.length === 0 && playoffMatches.length === 0) {
    throw new Error('No valid matches found after filtering seed matches');
  }
  
  // 開始時間と終了時間を分に変換
  const startMinutes = timeToMinutes(settings.startTime);
  const endMinutes = timeToMinutes(settings.endTime);
  
  // グループステージの時間計算
  const groupStageDuration = settings.groupStageDuration || 15;
  let totalGroupTime = 0;
  if (groupMatches.length > 0) {
    const groupDurationWithBreak = groupStageDuration + settings.breakDuration;
    totalGroupTime = groupDurationWithBreak * groupMatches.length - settings.breakDuration;
  }
  
  // プレーオフの時間計算（存在する場合）
  const playoffDuration = settings.playoffDuration || 20;
  let totalPlayoffTime = 0;
  if (playoffMatches.length > 0) {
    const playoffDurationWithBreak = playoffDuration + settings.breakDuration;
    totalPlayoffTime = playoffDurationWithBreak * playoffMatches.length - settings.breakDuration;
    
    // ステージ間の休憩があれば追加
    const breakBetweenStages = settings.breakBetweenStages || 30;
    if (groupMatches.length > 0) {
      totalPlayoffTime += breakBetweenStages;
    }
  }
  
  // 時間が足りるかチェック
  const totalRequiredTime = totalGroupTime + totalPlayoffTime;
  const availableMinutes = endMinutes - startMinutes;
  
  if (totalRequiredTime > availableMinutes) {
    throw new Error(`Not enough time for all matches. Need ${totalRequiredTime} minutes but only have ${availableMinutes} minutes.`);
  }
  
  let currentMinutes = startMinutes;
  
  // グループステージの試合をスケジュールに追加
  if (groupMatches.length > 0) {
    for (let i = 0; i < groupMatches.length; i++) {
      const match = groupMatches[i];
      
      // 休憩とランチが被らないように調整
      while (
        overlapsWithLunch(currentMinutes, currentMinutes + groupStageDuration, settings.lunchBreak) ||
        overlapsWithBreakTimes(currentMinutes, currentMinutes + groupStageDuration, settings.breakTimes)
      ) {
        if (settings.lunchBreak && 
            currentMinutes >= timeToMinutes(settings.lunchBreak.startTime) && 
            currentMinutes < timeToMinutes(settings.lunchBreak.endTime)) {
          currentMinutes = timeToMinutes(settings.lunchBreak.endTime);
        } else if (settings.breakTimes) {
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
          currentMinutes += 5;
        }
        
        if (currentMinutes >= endMinutes) {
          throw new Error('Could not fit all matches into the schedule due to breaks');
        }
      }
      
      // 試合を追加
      timeSlots.push({
        startTime: minutesToTime(currentMinutes),
        endTime: minutesToTime(currentMinutes + groupStageDuration),
        type: 'match',
        matchId: match.id,
        description: `グループステージ: ${match.blockId}`
      });
      
      // 次の時間に移動
      currentMinutes += groupStageDuration;
      
      // 休憩を追加（最後の試合を除く）
      if (i < groupMatches.length - 1) {
        currentMinutes += settings.breakDuration;
      }
    }
  }
  
  // グループステージとプレーオフの間の休憩
  if (groupMatches.length > 0 && playoffMatches.length > 0) {
    const breakBetweenStages = settings.breakBetweenStages || 30;
    currentMinutes += breakBetweenStages;
    
    // ステージ間の休憩を追加
    timeSlots.push({
      startTime: minutesToTime(currentMinutes - breakBetweenStages),
      endTime: minutesToTime(currentMinutes),
      title: 'ステージ間休憩',
      type: 'break',
      description: 'グループステージとプレーオフの間の休憩'
    });
  }
  
  // プレーオフの試合をスケジュールに追加
  if (playoffMatches.length > 0) {
    for (let i = 0; i < playoffMatches.length; i++) {
      const match = playoffMatches[i];
      
      // 休憩とランチが被らないように調整
      while (
        overlapsWithLunch(currentMinutes, currentMinutes + playoffDuration, settings.lunchBreak) ||
        overlapsWithBreakTimes(currentMinutes, currentMinutes + playoffDuration, settings.breakTimes)
      ) {
        if (settings.lunchBreak && 
            currentMinutes >= timeToMinutes(settings.lunchBreak.startTime) && 
            currentMinutes < timeToMinutes(settings.lunchBreak.endTime)) {
          currentMinutes = timeToMinutes(settings.lunchBreak.endTime);
        } else if (settings.breakTimes) {
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
          currentMinutes += 5;
        }
        
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
        endTime: minutesToTime(currentMinutes + playoffDuration),
        type: 'match',
        matchId: match.id,
        description: roundName
      });
      
      // 次の時間に移動
      currentMinutes += playoffDuration;
      
      // 休憩を追加（最後の試合を除く）
      if (i < playoffMatches.length - 1) {
        currentMinutes += settings.breakDuration;
      }
    }
  }
  
  // 時間順にソート
  return timeSlots.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
};
