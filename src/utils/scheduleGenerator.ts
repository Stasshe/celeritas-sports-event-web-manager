import { Sport, ScheduleSettings, TimeSlot, Match, LeagueScheduleSettings, Team } from '../types';

// 配列をランダムにシャッフルするヘルパー関数
const shuffleArray = <T>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

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

// 試合の説明テキストを生成する関数を修正
const getMatchDescription = (match: Match, sport: Sport): string => {
  const team1 = sport.teams.find(t => t.id === match.team1Id);
  const team2 = sport.teams.find(t => t.id === match.team2Id);
  
  // 不戦勝の場合は特別な表示
  if ((!match.team1Id || match.team1Id === '') && match.team2Id && match.team2Id !== '') {
    // Team1がいない場合はTeam2が不戦勝
    return `${team2?.name || '不明なチーム'} (不戦勝)`;
  } 
  if (match.team1Id && match.team1Id !== '' && (!match.team2Id || match.team2Id === '')) {
    // Team2がいない場合はTeam1が不戦勝
    return `${team1?.name || '不明なチーム'} (不戦勝)`;
  }
  
  // プレーオフの試合で、チームがまだ決まっていない場合
  if (!match.blockId) {
    // 前の試合情報から「〇〇の勝者」のように表示
    const team1Display = team1?.name || (match.team1Id ? '不明なチーム' : getPreviousMatchReference(match, 'team1', sport));
    const team2Display = team2?.name || (match.team2Id ? '不明なチーム' : getPreviousMatchReference(match, 'team2', sport));
    return `${team1Display} vs ${team2Display}`;
  }
  
  return `${team1?.name || '不明なチーム'} vs ${team2?.name || '不明なチーム'}`;
};

// 前の試合からの参照を生成する関数を修正
const getPreviousMatchReference = (match: Match, teamPosition: 'team1' | 'team2', sport: Sport): string => {
  // マッチの参照情報がある場合
  if (match.previousMatches && match.previousMatches.length > 0) {
    const prevMatchIndex = teamPosition === 'team1' ? 0 : 1;
    if (prevMatchIndex < match.previousMatches.length) {
      const prevMatchId = match.previousMatches[prevMatchIndex];
      const prevMatch = sport.matches?.find(m => m.id === prevMatchId);
      
      if (prevMatch) {
        // 前のラウンド名を推定
        const maxRounds = Math.max(...(sport.matches?.map(m => m.round) || [0]));
        let roundName = '';
        
        switch (prevMatch.round) {
          case maxRounds:
            roundName = '決勝';
            break;
          case maxRounds - 1:
            roundName = '準決勝';
            break;
          case maxRounds - 2:
            roundName = '準々決勝';
            break;
          default:
            roundName = `ラウンド${prevMatch.round}`;
        }
        
        return `${roundName}${prevMatch.matchNumber ? ` #${prevMatch.matchNumber}` : ''}の勝者`;
      }
    }
  }
  
  // previousMatchesがない場合、トーナメント構造から推測
  if (match.round > 1) {
    // 前のラウンドの試合番号を計算（従来のトーナメント構造に基づく）
    const prevRound = match.round - 1;
    const prevMatchNumber1 = match.matchNumber * 2 - 1;
    const prevMatchNumber2 = match.matchNumber * 2;
    
    // 該当するチームの前の試合を取得
    const prevMatchNumber = teamPosition === 'team1' ? prevMatchNumber1 : prevMatchNumber2;
    
    // 前のラウンド名を推定
    const maxRounds = Math.max(...(sport.matches?.map(m => m.round) || [0]));
    let roundName = '';
    
    switch (prevRound) {
      case maxRounds:
        roundName = '決勝';
        break;
      case maxRounds - 1:
        roundName = '準決勝';
        break;
      case maxRounds - 2:
        roundName = '準々決勝';
        break;
      default:
        roundName = `ラウンド${prevRound}`;
    }
    
    return `${roundName} #${prevMatchNumber}の勝者`;
  }
  
  // マッチ番号がある場合は使用
  if (match.matchNumber && match.round > 0) {
    return `試合#${match.matchNumber}の勝者`;
  }
  
  // 情報がない場合のデフォルト表示
  return '勝者未定';
};

// 試合がシード戦（不戦勝/スキップ対象）かどうかをチェックする関数を修正
const isSeededMatch = (match: Match): boolean => {
  // ラウンド1で片方のチームIDが空の場合はシード戦（不戦勝）
  if (match.round === 1) {
    return (!match.team1Id || match.team1Id === '') || 
           (!match.team2Id || match.team2Id === '');
  }
  
  // ラウンド1以外では両方のチームIDが空の場合のみスキップ
  return false;
}

// 試合が3位決定戦かどうかをチェックする関数を修正
const isThirdPlaceMatch = (match: Match): boolean => {
  // matchNumberが0の場合、またはIDに"third_place"が含まれる場合、
  // さらにIDに"playoff_third_place"が含まれる場合も3位決定戦とみなす
  return match.matchNumber === 0 || 
         (typeof match.id === 'string' && (
            match.id.includes('third_place') || 
            match.id.includes('3rd_place') ||
            match.id.includes('playoff_third')
         ));
};

// 試合が決勝戦かどうかをチェックする関数を追加
const isFinalMatch = (match: Match, maxRound: number): boolean => {
  // 最終ラウンドかつ3位決定戦ではない試合は決勝
  return match.round === maxRound && !isThirdPlaceMatch(match);
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
  
  // トーナメントの場合はラウンド数の低い順にソートしてからランダム化
  let schedulableMatches: Match[] = [];
  if (sport.type === 'tournament') {
    // ラウンド1のシード戦（不戦勝）のみ除外
    const nonSeededMatches = [...matches].filter(match => !isSeededMatch(match));
    
    // ラウンドごとにグループ化
    const roundGroups: { [round: number]: Match[] } = {};
    nonSeededMatches.forEach(match => {
      if (!roundGroups[match.round]) {
        roundGroups[match.round] = [];
      }
      roundGroups[match.round].push(match);
    });
    
    // 各ラウンド内でランダム化してから結合（ラウンド順は維持）
    const sortedRounds = Object.keys(roundGroups).map(Number).sort((a, b) => a - b);
    
    schedulableMatches = [];
    sortedRounds.forEach(round => {
      // 各ラウンド内の試合をランダムにシャッフル
      schedulableMatches.push(...shuffleArray(roundGroups[round]));
    });
  } else {
    // 総当たり戦の場合は全試合をランダムにシャッフル
    schedulableMatches = shuffleArray([...matches]);
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
    let safetyCounter = 0; // 無限ループ防止用のカウンター
    let adjustedTime = false;
    
    while (
      (overlapsWithLunch(currentMinutes, currentMinutes + settings.matchDuration, settings.lunchBreak) ||
      overlapsWithBreakTimes(currentMinutes, currentMinutes + settings.matchDuration, settings.breakTimes)) &&
      safetyCounter < 100 // 安全策として最大100回のループ制限
    ) {
      safetyCounter++;
      adjustedTime = false;
      
      // ランチ休憩との重複をチェック
      if (settings.lunchBreak && 
          currentMinutes < timeToMinutes(settings.lunchBreak.endTime) && 
          currentMinutes + settings.matchDuration > timeToMinutes(settings.lunchBreak.startTime)) {
        // ランチ休憩の終了時間にスキップ
        currentMinutes = timeToMinutes(settings.lunchBreak.endTime);
        adjustedTime = true;
        continue; // 時間が調整されたので、他の休憩も再チェック
      }
      
      // 他の休憩時間との重複をチェック
      if (settings.breakTimes) {
        for (const breakTime of settings.breakTimes) {
          const breakStartMinutes = timeToMinutes(breakTime.startTime);
          const breakEndMinutes = timeToMinutes(breakTime.endTime);
          
          if (currentMinutes < breakEndMinutes && 
              currentMinutes + settings.matchDuration > breakStartMinutes) {
            // この休憩の終了時間にスキップ
            currentMinutes = breakEndMinutes;
            adjustedTime = true;
            break; // 調整されたので、ループの先頭から再チェック
          }
        }
        
        if (adjustedTime) {
          continue; // 時間が調整されたので、再チェック
        }
      }
      
      // どの休憩時間にも該当しないが、まだ重複が解消されていない場合
      // 念のため少し時間を進める（5分）
      if (!adjustedTime) {
        currentMinutes += 5;
        adjustedTime = true;
      }
      
      // 終了時間チェック
      if (currentMinutes >= endMinutes) {
        throw new Error('休憩時間が多すぎるか、休憩時間設定に問題があります。スケジュールを生成できません。');
      }
    }
    
    // 無限ループに陥った場合
    if (safetyCounter >= 100) {
      throw new Error('休憩時間の調整中に問題が発生しました。休憩時間の設定を見直してください。');
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
  
  // ラウンド1のシード戦のみ除外（3位決定戦は除外しない）
  const schedulablePlayoffMatches = playoffMatches.filter(match => 
    !isSeededMatch(match) || isThirdPlaceMatch(match)
  );
  
  // 試合を各ブロックに分類
  const blockMatchesMap: { [blockId: string]: Match[] } = {};
  groupMatches.forEach(match => {
    if (!match.blockId) return;
    
    if (!blockMatchesMap[match.blockId]) {
      blockMatchesMap[match.blockId] = [];
    }
    blockMatchesMap[match.blockId].push(match);
  });
  
  // 各ブロック内の試合をランダム化
  Object.keys(blockMatchesMap).forEach(blockId => {
    blockMatchesMap[blockId] = shuffleArray(blockMatchesMap[blockId]);
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
    
    // ブロックの順序をランダム化して、取得順もランダムにする
    const shuffledBlockIds = shuffleArray([...blockIds]);
    
    for (const blockId of shuffledBlockIds) {
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
    let safetyCounter = 0; // 無限ループ防止用のカウンター
    let adjustedTime = false;
    
    while (
      (overlapsWithLunch(currentMinutes, currentMinutes + settings.matchDuration, settings.lunchBreak) ||
      overlapsWithBreakTimes(currentMinutes, currentMinutes + settings.matchDuration, settings.breakTimes)) &&
      safetyCounter < 100 // 安全策として最大100回のループ制限
    ) {
      safetyCounter++;
      adjustedTime = false;
      
      // ランチ休憩との重複をチェック
      if (settings.lunchBreak && 
          currentMinutes < timeToMinutes(settings.lunchBreak.endTime) && 
          currentMinutes + settings.matchDuration > timeToMinutes(settings.lunchBreak.startTime)) {
        // ランチ休憩の終了時間にスキップ
        currentMinutes = timeToMinutes(settings.lunchBreak.endTime);
        adjustedTime = true;
        continue; // 時間が調整されたので、他の休憩も再チェック
      }
      
      // 他の休憩時間との重複をチェック
      if (settings.breakTimes) {
        for (const breakTime of settings.breakTimes) {
          const breakStartMinutes = timeToMinutes(breakTime.startTime);
          const breakEndMinutes = timeToMinutes(breakTime.endTime);
          
          if (currentMinutes < breakEndMinutes && 
              currentMinutes + settings.matchDuration > breakStartMinutes) {
            // この休憩の終了時間にスキップ
            currentMinutes = breakEndMinutes;
            adjustedTime = true;
            break; // 調整されたので、ループの先頭から再チェック
          }
        }
        
        if (adjustedTime) {
          continue; // 時間が調整されたので、再チェック
        }
      }
      
      // どの休憩時間にも該当しないが、まだ重複が解消されていない場合
      // 念のため少し時間を進める（5分）
      if (!adjustedTime) {
        currentMinutes += 5;
        adjustedTime = true;
      }
      
      // 終了時間チェック
      if (currentMinutes >= endMinutes) {
        throw new Error('休憩時間が多すぎるか、休憩時間設定に問題があります。スケジュールを生成できません。');
      }
    }
    
    // 無限ループに陥った場合
    if (safetyCounter >= 100) {
      throw new Error('休憩時間の調整中に問題が発生しました。休憩時間の設定を見直してください。');
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
    
    // プレーオフの試合をラウンドごとにグループ化してからシャッフル
    const playoffRoundGroups: { [round: number]: Match[] } = {};
    let thirdPlaceMatch: Match | undefined;
    
    // 3位決定戦と他の試合を分離
    schedulablePlayoffMatches.forEach(match => {
      if (isThirdPlaceMatch(match)) {
        console.log("Found third place match:", match);
        thirdPlaceMatch = match;
      } else {
        if (!playoffRoundGroups[match.round]) {
          playoffRoundGroups[match.round] = [];
        }
        playoffRoundGroups[match.round].push(match);
      }
    });
    
    // 3位決定戦があるかログ出力
    console.log("Third place match found:", !!thirdPlaceMatch);
    
    // 各ラウンドの試合をシャッフル
    Object.keys(playoffRoundGroups).forEach(round => {
      playoffRoundGroups[Number(round)] = shuffleArray(playoffRoundGroups[Number(round)]);
    });
    
    // 最大ラウンド（決勝ラウンド）を特定
    const maxRound = Math.max(...Object.keys(playoffRoundGroups).map(Number));
    
    // 決勝戦を分離（コート数によって同時進行か連続かが決まるため）
    let finalMatch: Match | undefined;
    if (playoffRoundGroups[maxRound]) {
      const finalIndex = playoffRoundGroups[maxRound].findIndex(m => isFinalMatch(m, maxRound));
      if (finalIndex >= 0) {
        finalMatch = playoffRoundGroups[maxRound].splice(finalIndex, 1)[0];
      }
    }
    
    // ラウンド順にソートしつつ、各ラウンド内はシャッフルされた状態で結合
    const sortedPlayoffMatches: Match[] = [];
    Object.keys(playoffRoundGroups)
      .map(Number)
      .sort((a, b) => a - b)
      .forEach(round => {
        sortedPlayoffMatches.push(...playoffRoundGroups[round]);
      });
    
    // 使用中のチームIDを追跡
    let usedTeamIds: string[] = [];
    
    // プレーオフの試合をスケジュール
    while (sortedPlayoffMatches.length > 0) {
      // この時間枠で利用可能なコート
      const availableCourts = courtCount === 1 ? ['court1'] : ['court1', 'court2'];
      
      // 休憩とランチが被らないように調整
      let safetyCounter = 0; // 無限ループ防止用のカウンター
      let adjustedTime = false;
      
      while (
        (overlapsWithLunch(currentMinutes, currentMinutes + settings.matchDuration, settings.lunchBreak) ||
        overlapsWithBreakTimes(currentMinutes, currentMinutes + settings.matchDuration, settings.breakTimes)) &&
        safetyCounter < 100 // 安全策として最大100回のループ制限
      ) {
        safetyCounter++;
        adjustedTime = false;
        
        // ランチ休憩との重複をチェック
        if (settings.lunchBreak && 
            currentMinutes < timeToMinutes(settings.lunchBreak.endTime) && 
            currentMinutes + settings.matchDuration > timeToMinutes(settings.lunchBreak.startTime)) {
          // ランチ休憩の終了時間にスキップ
          currentMinutes = timeToMinutes(settings.lunchBreak.endTime);
          adjustedTime = true;
          continue; // 時間が調整されたので、他の休憩も再チェック
        }
        
        // 他の休憩時間との重複をチェック
        if (settings.breakTimes) {
          for (const breakTime of settings.breakTimes) {
            const breakStartMinutes = timeToMinutes(breakTime.startTime);
            const breakEndMinutes = timeToMinutes(breakTime.endTime);
            
            if (currentMinutes < breakEndMinutes && 
                currentMinutes + settings.matchDuration > breakStartMinutes) {
              // この休憩の終了時間にスキップ
              currentMinutes = breakEndMinutes;
              adjustedTime = true;
              break; // 調整されたので、ループの先頭から再チェック
            }
          }
          
          if (adjustedTime) {
            continue; // 時間が調整されたので、再チェック
          }
        }
        
        // どの休憩時間にも該当しないが、まだ重複が解消されていない場合
        // 念のため少し時間を進める（5分）
        if (!adjustedTime) {
          currentMinutes += 5;
          adjustedTime = true;
        }
        
        // 終了時間チェック
        if (currentMinutes >= endMinutes) {
          throw new Error('休憩時間が多すぎるか、休憩時間設定に問題があります。スケジュールを生成できません。');
        }
      }
      
      // 無限ループに陥った場合
      if (safetyCounter >= 100) {
        throw new Error('休憩時間の調整中に問題が発生しました。休憩時間の設定を見直してください。');
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
        const sameRoundMatches = sortedPlayoffMatches.filter(m => 
          // ラウンド1のシード戦のみスキップ
          m.round === currentRound && !isSeededMatch(m)
        );
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
        const maxRounds = Math.max(...playoffMatches.map(m => m.round));
        switch (match.round) {
          case maxRounds:
            roundName = '決勝';
            break;
          case maxRounds - 1:
            roundName = '準決勝';
            break;
          case maxRounds - 2:
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
    
    // 3位決定戦と決勝戦のスケジューリング - 条件をチェック
    console.log("Scheduling final matches:", { 
      hasThirdPlace: !!thirdPlaceMatch, 
      hasFinal: !!finalMatch,
      timeLeft: currentMinutes < endMinutes 
    });
    
    if ((thirdPlaceMatch || finalMatch) && currentMinutes < endMinutes) {
      // コート数によって処理を分ける
      if (courtCount === 2 && thirdPlaceMatch && finalMatch) {
        // 2コートの場合: 3位決定戦と決勝戦を同時に行う
        const availableCourts = ['court1', 'court2'];
        
        // 休憩とランチが被らないように調整
        currentMinutes = adjustTimeForBreaks(currentMinutes, settings);
        
        // 決勝はcourt1、3位決定戦はcourt2に配置
        timeSlots.push({
          startTime: minutesToTime(currentMinutes),
          endTime: minutesToTime(currentMinutes + settings.matchDuration),
          type: 'match',
          matchId: finalMatch.id,
          courtId: 'court1',
          description: `プレーオフ: 決勝`,
          matchDescription: getMatchDescription(finalMatch, sport)
        });
        
        timeSlots.push({
          startTime: minutesToTime(currentMinutes),
          endTime: minutesToTime(currentMinutes + settings.matchDuration),
          type: 'match',
          matchId: thirdPlaceMatch.id,
          courtId: 'court2',
          description: `プレーオフ: 3位決定戦`,
          matchDescription: getMatchDescription(thirdPlaceMatch, sport)
        });
        
        currentMinutes += settings.matchDuration + settings.breakDuration;
        
      } else {
        // 1コートの場合: 3位決定戦の後に決勝戦を行う
        if (thirdPlaceMatch) {
          // 休憩とランチが被らないように調整
          currentMinutes = adjustTimeForBreaks(currentMinutes, settings);
          
          timeSlots.push({
            startTime: minutesToTime(currentMinutes),
            endTime: minutesToTime(currentMinutes + settings.matchDuration),
            type: 'match',
            matchId: thirdPlaceMatch.id,
            courtId: 'court1',
            description: `プレーオフ: 3位決定戦`,
            matchDescription: getMatchDescription(thirdPlaceMatch, sport)
          });
          
          currentMinutes += settings.matchDuration + settings.breakDuration;
        }
        
        if (finalMatch) {
          // 休憩とランチが被らないように調整
          currentMinutes = adjustTimeForBreaks(currentMinutes, settings);
          
          timeSlots.push({
            startTime: minutesToTime(currentMinutes),
            endTime: minutesToTime(currentMinutes + settings.matchDuration),
            type: 'match',
            matchId: finalMatch.id,
            courtId: 'court1',
            description: `プレーオフ: 決勝`,
            matchDescription: getMatchDescription(finalMatch, sport)
          });
          
          currentMinutes += settings.matchDuration + settings.breakDuration;
        }
      }
    } else {
      // 3位決定戦や決勝がなかったか、時間がなかった場合
      console.log("Could not schedule final matches:", { 
        hasThirdPlace: !!thirdPlaceMatch, 
        hasFinal: !!finalMatch,
        timeLeft: currentMinutes < endMinutes 
      });
    }
    
    // 終了時間チェック
    if (currentMinutes > endMinutes) {
      throw new Error('時間内にすべての試合をスケジュールできません');
    }
  }
  
  // 時間順にソート
  return timeSlots.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
};

// 休憩時間と被らないように時間を調整するヘルパー関数を追加
function adjustTimeForBreaks(currentMinutes: number, settings: ScheduleSettings): number {
  let adjustedMinutes = currentMinutes;
  let safetyCounter = 0;
  let adjustedTime = false;
  
  while (
    (overlapsWithLunch(adjustedMinutes, adjustedMinutes + settings.matchDuration, settings.lunchBreak) ||
    overlapsWithBreakTimes(adjustedMinutes, adjustedMinutes + settings.matchDuration, settings.breakTimes)) &&
    safetyCounter < 100
  ) {
    safetyCounter++;
    adjustedTime = false;
    
    // ランチ休憩との重複をチェック
    if (settings.lunchBreak && 
        adjustedMinutes < timeToMinutes(settings.lunchBreak.endTime) && 
        adjustedMinutes + settings.matchDuration > timeToMinutes(settings.lunchBreak.startTime)) {
      adjustedMinutes = timeToMinutes(settings.lunchBreak.endTime);
      adjustedTime = true;
      continue;
    }
    
    // 他の休憩時間との重複をチェック
    if (settings.breakTimes) {
      for (const breakTime of settings.breakTimes) {
        const breakStartMinutes = timeToMinutes(breakTime.startTime);
        const breakEndMinutes = timeToMinutes(breakTime.endTime);
        
        if (adjustedMinutes < breakEndMinutes && 
            adjustedMinutes + settings.matchDuration > breakStartMinutes) {
          adjustedMinutes = breakEndMinutes;
          adjustedTime = true;
          break;
        }
      }
      
      if (adjustedTime) continue;
    }
    
    // どの休憩時間にも該当しないが、まだ重複が解消されていない場合
    if (!adjustedTime) {
      adjustedMinutes += 5;
      adjustedTime = true;
    }
  }
  
  // 無限ループ対策
  if (safetyCounter >= 100) {
    throw new Error('休憩時間の調整中に問題が発生しました。休憩時間の設定を見直してください。');
  }
  
  return adjustedMinutes;
}
