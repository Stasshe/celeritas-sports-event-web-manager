import { Sport, ScheduleSettings, TimeSlot, Match, LeagueScheduleSettings, Team } from '../types';

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

// ランチ休憩と重複するかチェックする関数
const overlapsWithLunch = (
  startMinutes: number,
  endMinutes: number,
  lunchBreak?: { startTime: string; endTime: string } | null
): boolean => {
  if (!lunchBreak) return false;
  
  const lunchStartMinutes = timeToMinutes(lunchBreak.startTime);
  const lunchEndMinutes = timeToMinutes(lunchBreak.endTime);
  
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

// 他の休憩時間と重複するかチェックする関数
const overlapsWithBreakTimes = (
  startMinutes: number,
  endMinutes: number,
  breakTimes?: TimeSlot[] | null
): boolean => {
  if (!breakTimes || breakTimes.length === 0) return false;
  
  return breakTimes.some(breakTime => {
    const breakStartMinutes = timeToMinutes(breakTime.startTime);
    const breakEndMinutes = timeToMinutes(breakTime.endTime);
    
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

// チームからクラス情報を抽出する関数
const getTeamInfoMap = (teams: Team[]): { [teamId: string]: { className?: string }} => {
  const teamInfoMap: { [teamId: string]: { className?: string }} = {};
  
  // 単純化のため、チーム名から学年とクラスを抽出
  // 例: "1-A", "3年B組", "2-C" などの形式を想定
  teams.forEach(team => {
    const className = extractClassName(team.name);
    teamInfoMap[team.id] = { className };
  });
  
  return teamInfoMap;
};

// チーム名からクラス名を抽出するヘルパー関数
const extractClassName = (teamName: string): string | undefined => {
  // 学年-クラス形式 (例: "1-A", "2-B"など)
  const gradeClassMatch = teamName.match(/^(\d+)[-年]([A-Za-z])/);
  if (gradeClassMatch) {
    return `${gradeClassMatch[1]}-${gradeClassMatch[2]}`;
  }
  
  // そのまま返す
  return teamName;
};

// 試合の説明テキストを生成する関数
const getMatchDescription = (match: Match, sport: Sport): string => {
  const team1 = sport.teams.find(t => t.id === match.team1Id);
  const team2 = sport.teams.find(t => t.id === match.team2Id);
  
  // プレーオフの試合で、チームがまだ決まっていない場合
  if (!match.blockId && (!team1 || !team2)) {
    const team1Display = team1?.name || (match.team1Id ? '不明なチーム' : '勝者未定');
    const team2Display = team2?.name || (match.team2Id ? '不明なチーム' : '勝者未定');
    return `${team1Display} vs ${team2Display}`;
  }
  
  return `${team1?.name || '不明なチーム'} vs ${team2?.name || '不明なチーム'}`;
};

// 同時進行に対応した新しいスケジュール生成関数
export const generateSchedule = (sport: Sport, settings: ScheduleSettings): TimeSlot[] => {
  const timeSlots: TimeSlot[] = [];
  
  // ランキング形式は特殊処理
  if (sport.type === 'ranking') {
    timeSlots.push({
      startTime: settings.startTime,
      endTime: settings.endTime,
      title: '競技時間',
      type: 'preparation',
      description: 'ランキング競技の時間枠'
    });
    return timeSlots;
  }
  
  // 重要な休憩時間をスケジュールに追加
  if (settings.lunchBreak) {
    timeSlots.push({
      startTime: settings.lunchBreak.startTime,
      endTime: settings.lunchBreak.endTime,
      title: 'ランチ休憩',
      type: 'lunch'
    });
  }
  
  // 追加の休憩時間をスケジュールに追加
  const breakTimes = settings.breakTimes || [];
  breakTimes.forEach(breakTime => {
    timeSlots.push({
      ...breakTime,
      type: 'break'
    });
  });
  
  // スポーツタイプに応じたスケジュール生成
  if (sport.type === 'league') {
    return generateLeagueScheduleWithCourts(sport, settings, timeSlots);
  } else {
    return generateMatchBasedScheduleWithCourts(sport, settings, timeSlots);
  }
};

// 複数コートに対応した試合ベースのスケジュール生成（トーナメント/総当たり戦）
const generateMatchBasedScheduleWithCourts = (
  sport: Sport,
  settings: ScheduleSettings,
  initialTimeSlots: TimeSlot[]
): TimeSlot[] => {
  const timeSlots = [...initialTimeSlots];
  const { matches } = sport;
  
  if (!matches || matches.length === 0) {
    throw new Error('スケジュール生成用の試合が見つかりません');
  }
  
  // 開始時間と終了時間
  const startMinutes = timeToMinutes(settings.startTime);
  const endMinutes = timeToMinutes(settings.endTime);
  
  // コート数と名前
  const courtCount = settings.courtCount || 1;
  const courtNames = settings.courtNames || {
    court1: '第1コート',
    court2: courtCount > 1 ? '第2コート' : undefined
  };
  
  // トーナメントの場合はラウンド数の低い順にソート
  let schedulableMatches: Match[] = [];
  if (sport.type === 'tournament') {
    schedulableMatches = [...matches].sort((a, b) => a.round - b.round);
  } else {
    schedulableMatches = [...matches];
  }
  
  // チーム情報マップ（クラス競合チェック用）
  const teamInfoMap = getTeamInfoMap(sport.teams || []);
  
  // 現在の時間
  let currentMinutes = startMinutes;
  
  // 使用中のチームIDを追跡
  let usedTeamIds: string[] = [];
  
  // すべての試合がスケジュールされるまでループ
  while (schedulableMatches.length > 0) {
    // この時間枠で利用可能なコート
    const availableCourts = courtCount === 1 ? ['court1'] : ['court1', 'court2'];
    
    // 休憩とランチが被らないように調整
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
        // 安全措置
        currentMinutes += 5;
      }
      
      // 終了時間チェック
      if (currentMinutes >= endMinutes) {
        throw new Error('休憩時間が多すぎてすべての試合をスケジュールできません');
      }
    }
    
    // この時間枠でスケジュールされた試合数
    let scheduledMatchesCount = 0;
    usedTeamIds = [];
    
    // 各コートについて処理
    for (const court of availableCourts) {
      if (schedulableMatches.length === 0) break;
      
      // この時間枠でスケジュール可能な試合を探す
      let matchIndex = -1;
      
      for (let i = 0; i < schedulableMatches.length; i++) {
        const match = schedulableMatches[i];
        
        // 既に使用されているチームがいるかチェック
        if (usedTeamIds.includes(match.team1Id) || usedTeamIds.includes(match.team2Id)) {
          continue;
        }
        
        // クラスの競合チェック
        const team1Class = teamInfoMap[match.team1Id]?.className;
        const team2Class = teamInfoMap[match.team2Id]?.className;
        let hasClassConflict = false;
        
        // すでにスケジュールされた試合のクラスと競合しないかチェック
        for (const usedTeamId of usedTeamIds) {
          const usedTeamClass = teamInfoMap[usedTeamId]?.className;
          if (usedTeamClass && (usedTeamClass === team1Class || usedTeamClass === team2Class)) {
            hasClassConflict = true;
            break;
          }
        }
        
        if (!hasClassConflict) {
          matchIndex = i;
          break;
        }
      }
      
      // スケジュール可能な試合がない場合はこのコートをスキップ
      if (matchIndex === -1) continue;
      
      // 試合をスケジュール
      const match = schedulableMatches.splice(matchIndex, 1)[0];
      
      // 使用中のチームを追加
      usedTeamIds.push(match.team1Id, match.team2Id);
      
      // タイムスロットを追加
      timeSlots.push({
        startTime: minutesToTime(currentMinutes),
        endTime: minutesToTime(currentMinutes + settings.matchDuration),
        type: 'match',
        matchId: match.id,
        courtId: court as 'court1' | 'court2',
        description: getMatchDescription(match, sport),
        matchDescription: getMatchDescription(match, sport)
      });
      
      scheduledMatchesCount++;
    }
    
    // 次の時間枠へ
    if (scheduledMatchesCount > 0) {
      currentMinutes += settings.matchDuration + settings.breakDuration;
    } else {
      // もし試合がスケジュールできなかった場合、時間を少し進める
      currentMinutes += 5;
    }
    
    // 終了時間チェック
    if (currentMinutes >= endMinutes && schedulableMatches.length > 0) {
      throw new Error('時間内にすべての試合をスケジュールできません');
    }
  }
  
  // 時間順にソート
  return timeSlots.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
};

// 複数コートに対応したリーグ戦のスケジュール生成
const generateLeagueScheduleWithCourts = (
  sport: Sport,
  settings: ScheduleSettings,
  initialTimeSlots: TimeSlot[]
): TimeSlot[] => {
  const timeSlots = [...initialTimeSlots];
  const { matches } = sport;
  
  if (!matches || matches.length === 0) {
    throw new Error('スケジュール生成用の試合が見つかりません');
  }
  
  // コート数と名前
  const courtCount = settings.courtCount || 1;
  const courtNames = settings.courtNames || {
    court1: '第1コート',
    court2: courtCount > 1 ? '第2コート' : undefined
  };
  
  // 開始時間と終了時間
  const startMinutes = timeToMinutes(settings.startTime);
  const endMinutes = timeToMinutes(settings.endTime);
  
  // チーム情報マップ（クラス競合チェック用）
  const teamInfoMap = getTeamInfoMap(sport.teams || []);
  
  // グループステージとプレーオフの試合を分ける
  const groupMatches = matches.filter(m => m.blockId !== undefined);
  const playoffMatches = matches.filter(m => m.blockId === undefined && m.round > 0);
  
  // 試合を各ブロックに分類
  const blockMatchesMap: { [blockId: string]: Match[] } = {};
  groupMatches.forEach(match => {
    if (!match.blockId) return;
    
    if (!blockMatchesMap[match.blockId]) {
      blockMatchesMap[match.blockId] = [];
    }
    blockMatchesMap[match.blockId].push(match);
  });
  
  // ブロックの試合を均等に取得するための配列
  const blockIds = Object.keys(blockMatchesMap);
  if (blockIds.length === 0) {
    throw new Error('グループステージの試合が見つかりません');
  }
  
  // ブロックごとの試合数を確認
  const blockMatchCounts: { [blockId: string]: number } = {};
  blockIds.forEach(blockId => {
    blockMatchCounts[blockId] = blockMatchesMap[blockId].length;
  });
  
  // 現在の時間
  let currentMinutes = startMinutes;
  
  // グループステージの試合をスケジュール
  const schedulableMatches: Match[] = [];
  let allBlocksFinished = false;
  
  // 各ブロックから均等に試合を取得
  while (!allBlocksFinished) {
    let anyMatchAdded = false;
    
    for (const blockId of blockIds) {
      if (blockMatchesMap[blockId].length > 0) {
        // 各ブロックから1試合ずつ取得
        schedulableMatches.push(blockMatchesMap[blockId].shift()!);
        anyMatchAdded = true;
      }
    }
    
    allBlocksFinished = !anyMatchAdded;
  }
  
  // 使用中のチームIDを追跡
  let usedTeamIds: string[] = [];
  
  // グループステージの試合をスケジュール
  while (schedulableMatches.length > 0) {
    // この時間枠で利用可能なコート
    const availableCourts = courtCount === 1 ? ['court1'] : ['court1', 'court2'];
    
    // 休憩とランチが被らないように調整
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
        // 安全措置
        currentMinutes += 5;
      }
      
      // 終了時間チェック
      if (currentMinutes >= endMinutes) {
        throw new Error('休憩時間が多すぎてすべての試合をスケジュールできません');
      }
    }
    
    // この時間枠でスケジュールされた試合数
    let scheduledMatchesCount = 0;
    usedTeamIds = [];
    
    // 各コートについて処理
    for (const court of availableCourts) {
      if (schedulableMatches.length === 0) break;
      
      // この時間枠でスケジュール可能な試合を探す
      let matchIndex = -1;
      
      for (let i = 0; i < schedulableMatches.length; i++) {
        const match = schedulableMatches[i];
        
        // 既に使用されているチームがいるかチェック
        if (usedTeamIds.includes(match.team1Id) || usedTeamIds.includes(match.team2Id)) {
          continue;
        }
        
        // クラスの競合チェック
        const team1Class = teamInfoMap[match.team1Id]?.className;
        const team2Class = teamInfoMap[match.team2Id]?.className;
        let hasClassConflict = false;
        
        // すでにスケジュールされた試合のクラスと競合しないかチェック
        for (const usedTeamId of usedTeamIds) {
          const usedTeamClass = teamInfoMap[usedTeamId]?.className;
          if (usedTeamClass && (usedTeamClass === team1Class || usedTeamClass === team2Class)) {
            hasClassConflict = true;
            break;
          }
        }
        
        if (!hasClassConflict) {
          matchIndex = i;
          break;
        }
      }
      
      // スケジュール可能な試合がない場合はこのコートをスキップ
      if (matchIndex === -1) continue;
      
      // 試合をスケジュール
      const match = schedulableMatches.splice(matchIndex, 1)[0];
      
      // 使用中のチームを追加
      usedTeamIds.push(match.team1Id, match.team2Id);
      
      // タイムスロットを追加
      timeSlots.push({
        startTime: minutesToTime(currentMinutes),
        endTime: minutesToTime(currentMinutes + settings.matchDuration),
        type: 'match',
        matchId: match.id,
        courtId: court as 'court1' | 'court2',
        description: `ブロック ${match.blockId}: ${getMatchDescription(match, sport)}`
      });
      
      scheduledMatchesCount++;
    }
    
    // 次の時間枠へ
    if (scheduledMatchesCount > 0) {
      currentMinutes += settings.matchDuration + settings.breakDuration;
    } else {
      // もし試合がスケジュールできなかった場合、時間を少し進める
      currentMinutes += 5;
    }
    
    // 終了時間チェック
    if (currentMinutes >= endMinutes && schedulableMatches.length > 0) {
      throw new Error('時間内にすべての試合をスケジュールできません');
    }
  }
  
  // プレーオフがある場合は追加
  if (playoffMatches.length > 0) {
    // ステージ間の休憩を追加
    const stageBreakDuration = 15; // 15分の休憩
    
    timeSlots.push({
      startTime: minutesToTime(currentMinutes),
      endTime: minutesToTime(currentMinutes + stageBreakDuration),
      title: 'ステージ間休憩',
      type: 'break',
      description: 'グループステージとプレーオフの間の休憩'
    });
    
    currentMinutes += stageBreakDuration;
    
    // ラウンド順にソート（決勝、準決勝など）
    const sortedPlayoffMatches = [...playoffMatches].sort((a, b) => a.round - b.round);
    
    // プレーオフの試合をスケジュール
    while (sortedPlayoffMatches.length > 0) {
      // この時間枠で利用可能なコート
      const availableCourts = courtCount === 1 ? ['court1'] : ['court1', 'court2'];
      
      // 休憩とランチが被らないように調整
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
          // 安全措置
          currentMinutes += 5;
        }
        
        // 終了時間チェック
        if (currentMinutes >= endMinutes) {
          throw new Error('休憩時間が多すぎてすべての試合をスケジュールできません');
        }
      }
      
      // この時間枠でスケジュールされた試合数
      let scheduledMatchesCount = 0;
      usedTeamIds = [];
      
      // 最初の試合のラウンド
      const currentRound = sortedPlayoffMatches[0].round;
      
      // 各コートについて処理
      for (const court of availableCourts) {
        if (sortedPlayoffMatches.length === 0) break;
        
        // 同じラウンドの試合のみスケジュール
        const sameRoundMatches = sortedPlayoffMatches.filter(m => m.round === currentRound);
        if (sameRoundMatches.length === 0) break;
        
        // この時間枠でスケジュール可能な試合を探す
        let matchIndex = -1;
        
        for (let i = 0; i < sameRoundMatches.length; i++) {
          const match = sameRoundMatches[i];
          
          // 既に使用されているチームがいるかチェック
          if (usedTeamIds.includes(match.team1Id) || usedTeamIds.includes(match.team2Id)) {
            continue;
          }
          
          // クラスの競合チェック
          const team1Class = teamInfoMap[match.team1Id]?.className;
          const team2Class = teamInfoMap[match.team2Id]?.className;
          let hasClassConflict = false;
          
          // すでにスケジュールされた試合のクラスと競合しないかチェック
          for (const usedTeamId of usedTeamIds) {
            const usedTeamClass = teamInfoMap[usedTeamId]?.className;
            if (usedTeamClass && (usedTeamClass === team1Class || usedTeamClass === team2Class)) {
              hasClassConflict = true;
              break;
            }
          }
          
          if (!hasClassConflict) {
            matchIndex = sortedPlayoffMatches.findIndex(m => m.id === match.id);
            break;
          }
        }
        
        // スケジュール可能な試合がない場合はこのコートをスキップ
        if (matchIndex === -1) continue;
        
        // 試合をスケジュール
        const match = sortedPlayoffMatches.splice(matchIndex, 1)[0];
        
        // 使用中のチームを追加
        usedTeamIds.push(match.team1Id, match.team2Id);
        
        // ラウンド名を取得 - このラウンド変換ロジックを修正
        let roundName = '';
        switch (match.round) {
          case 1:
            // ラウンド1は決勝または3位決定戦
            if (match.matchNumber === 0 || match.id.includes('third_place')) {
              roundName = '3位決定戦';
            } else {
              roundName = '決勝';
            }
            break;
          case 2:
            roundName = '準決勝';
            break;
          case 3:
            roundName = '準々決勝';
            break;
          default:
            roundName = `ラウンド${match.round}`;
        }
        
        // タイムスロットを追加
        timeSlots.push({
          startTime: minutesToTime(currentMinutes),
          endTime: minutesToTime(currentMinutes + settings.matchDuration),
          type: 'match',
          matchId: match.id,
          courtId: court as 'court1' | 'court2',
          description: `プレーオフ: ${roundName} ${match.matchNumber > 0 ? `(試合${match.matchNumber})` : ''}`,
          matchDescription: getMatchDescription(match, sport)
        });
        
        scheduledMatchesCount++;
      }
      
      // 次の時間枠へ
      if (scheduledMatchesCount > 0) {
        currentMinutes += settings.matchDuration + settings.breakDuration;
      } else {
        // もし試合がスケジュールできなかった場合、時間を少し進める
        currentMinutes += 5;
      }
      
      // 終了時間チェック
      if (currentMinutes >= endMinutes && sortedPlayoffMatches.length > 0) {
        throw new Error('時間内にすべての試合をスケジュールできません');
      }
    }
  }
  
  // 時間順にソート
  return timeSlots.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
};
