interface TeamPlacement {
  matchId: number;
  round: number;
  matchNumber: number;
  position: 'team1' | 'team2';  // 明示的なリテラル型の定義
  teamId: string;
}

export class TournamentStructureHelper {
  static calculateTotalRounds(teamCount: number): number {
    return Math.ceil(Math.log2(teamCount));
  }

  static calculateFirstRoundMatches(teamCount: number): number {
    const totalRounds = this.calculateTotalRounds(teamCount);
    const perfectBracketTeams = Math.pow(2, totalRounds);
    const firstRoundMatches = teamCount - (perfectBracketTeams / 2);
    return Math.max(0, firstRoundMatches);
  }

  static generateInitialMatches(teamCount: number): Array<{round: number, matchNumber: number}> {
    if (teamCount <= 0) return [];
    
    const matches: Array<{round: number, matchNumber: number}> = [];
    const totalRounds = this.calculateTotalRounds(teamCount);
    const perfectBracketSize = Math.pow(2, totalRounds);
    const firstRoundTeams = teamCount + (perfectBracketSize - teamCount);
    const firstRoundMatches = firstRoundTeams / 2;
    const byeTeams = perfectBracketSize - teamCount;
    
    // 1回戦の試合を生成
    for (let i = 1; i <= firstRoundMatches; i++) {
      matches.push({ round: 1, matchNumber: i });
    }

    // 2回戦以降の試合を生成
    for (let round = 2; round <= totalRounds; round++) {
      const matchesInRound = Math.pow(2, totalRounds - round);
      for (let i = 1; i <= matchesInRound; i++) {
        matches.push({ round, matchNumber: i });
      }
    }

    return matches;
  }

  static getNextMatchInfo(currentRound: number, currentMatchNumber: number): { round: number, matchNumber: number } {
    return {
      round: currentRound + 1,
      matchNumber: Math.ceil(currentMatchNumber / 2)
    };
  }

  static calculateTeamPlacements(teams: any[]): TeamPlacement[] {
    const placements: TeamPlacement[] = [];
    const totalTeams = teams.length;
    let matchId = 1;

    // トーナメントの基本構造を計算
    const totalRounds = this.calculateTotalRounds(totalTeams);
    const perfectBracketSize = Math.pow(2, totalRounds);
    const byeTeams = perfectBracketSize - totalTeams;
    
    // シード位置を計算（バイナリインデックス方式）
    const seedPositions: number[] = [];
    for (let i = 1; i <= perfectBracketSize; i++) {
      seedPositions.push(this.calculateSeedPosition(i, perfectBracketSize));
    }

    // チームを配置（シードポジションに基づく）
    let teamIndex = 0;
    let matchNumber = 1;
    let currentRound = 1;
    const usedPositions = new Set<number>();

    // チームを配置
    for (let pos of seedPositions) {
      if (teamIndex >= totalTeams) break;

      // この位置が既に使用されているか、またはバイポジションとして予約されているかをチェック
      if (!usedPositions.has(pos)) {
        const team = teams[teamIndex];
        const matchInRound = Math.ceil(pos / 2);
        const isUpperPosition = pos % 2 === 1;

        placements.push({
          matchId: matchInRound,
          round: 1,
          matchNumber: matchInRound,
          position: isUpperPosition ? 'team1' : 'team2',
          teamId: team.id
        });

        usedPositions.add(pos);
        teamIndex++;
      }
    }

    // 空きポジションを埋める
    seedPositions.forEach((pos, index) => {
      if (!usedPositions.has(pos)) {
        const matchInRound = Math.ceil(pos / 2);
        const isUpperPosition = pos % 2 === 1;

        placements.push({
          matchId: matchInRound,
          round: 1,
          matchNumber: matchInRound,
          position: isUpperPosition ? 'team1' : 'team2',
          teamId: ''
        });
      }
    });

    return placements;
  }

  // シードポジションを計算するヘルパーメソッド
  private static calculateSeedPosition(seed: number, totalPositions: number): number {
    if (totalPositions <= 1) return 1;
    
    if (seed <= totalPositions / 2) {
      return 2 * this.calculateSeedPosition(seed, totalPositions / 2) - 1;
    } else {
      return 2 * this.calculateSeedPosition(totalPositions + 1 - seed, totalPositions / 2);
    }
  }

  // シードまたは不在チームを判定する - 修正版
  static isNoTeam(teamId: string | null, match: any, matches: any[]): boolean {
    // チームIDがない場合は空
    if (!teamId || teamId === '') return true;
    
    // 'seed'、'tbd'、'unknownTeam'などの特殊値を判定
    if (teamId === 'seed' || teamId === 'tbd' || teamId.includes('unknown')) return true;

    // 1回戦の場合
    if (match.round === 1) {
      // シードポジションのチーム（対戦相手が空）は不戦勝として扱う
      const currentMatch = matches.find(m => m.id === match.id);
      if (currentMatch) {
        const isUpperSideEmpty = currentMatch.team1Id === teamId && (!currentMatch.team2Id || currentMatch.team2Id === '');
        const isLowerSideEmpty = currentMatch.team2Id === teamId && (!currentMatch.team1Id || currentMatch.team1Id === '');
        return isUpperSideEmpty || isLowerSideEmpty;
      }
    }

    // 2回戦以降の場合
    // 前のラウンドからの進出待ちではない（シード）場合のみtrue
    const previousMatches = matches.filter(m => 
      m.round === match.round - 1 && 
      (m.team1Id === teamId || m.team2Id === teamId)
    );

    // 前の試合が見つからない場合はシードまたは不在チーム
    return previousMatches.length === 0;
  }

  // 待機中の状態を判定する - 修正版
  static isWaiting(teamId: string | null, match: any, matches: any[]): boolean {
    // チームIDがない、または特殊な値の場合は待機していない
    if (!teamId || teamId === '' || teamId === 'seed' || teamId === 'tbd' || 
        teamId.includes('unknown')) return false;
    
    // 1回戦は待機状態ではない
    if (match.round === 1) return false;

    // シードチームは待機状態にならない
    if (this.isNoTeam(teamId, match, matches)) return false;

    // 両チームが揃っているかチェック
    if (match.team1Id && match.team2Id) {
      // team1とteam2の待機状態を確認
      const team1Waiting = teamId === match.team1Id ? 
                          this.checkTeamIsWaiting(match.team1Id, match.round, matches) : false;
      const team2Waiting = teamId === match.team2Id ? 
                          this.checkTeamIsWaiting(match.team2Id, match.round, matches) : false;
      
      // 指定されたチームが待機中なら真
      return team1Waiting || team2Waiting;
    }

    // 指定チームの待機状態をチェック（前の試合の勝者が未定の場合）
    return this.checkTeamIsWaiting(teamId, match.round, matches);
  }

  // チームが待機中かどうかをチェックするヘルパーメソッド - 改善版
  private static checkTeamIsWaiting(teamId: string, round: number, matches: any[]): boolean {
    // 前のラウンドでのこのチームの試合を探す
    const previousMatches = matches.filter(m => 
      m.round === round - 1 && 
      (m.team1Id === teamId || m.team2Id === teamId)
    );

    // 前の試合がないなら待機状態ではない（シードの可能性）
    if (previousMatches.length === 0) return false;

    // 前の試合で勝者が決まっていない場合は待機中
    return previousMatches.some(match => !match.winnerId);
  }

  // 勝者を次の試合に自動的に進出させる
  static progressWinnerToNextMatch(match: any, matches: any[]): any[] {
    if (!match.winnerId) return matches;

    const nextMatch = matches.find(m =>
      m.round === match.round + 1 &&
      Math.ceil(match.matchNumber / 2) === m.matchNumber
    );

    if (!nextMatch) return matches;

    // 次の試合のどちらのポジションに進出するかを判定
    const isUpperPosition = match.matchNumber % 2 !== 0;
    const updatedMatches = matches.map(m => {
      if (m.id === nextMatch.id) {
        return {
          ...m,
          team1Id: isUpperPosition ? match.winnerId : m.team1Id,
          team2Id: isUpperPosition ? m.team2Id : match.winnerId
        };
      }
      return m;
    });

    return updatedMatches;
  }

  // 試合の状態を自動判定する
  static getMatchStatus(match: { team1Score: number; team2Score: number; type?: string }): 'scheduled' | 'inProgress' | 'completed' {
    if (match.team1Score === 0 && match.team2Score === 0) return 'scheduled';
    if (match.team1Score > 0 || match.team2Score > 0) return 'completed';
    return 'inProgress';
  }
  
  // トーナメント形式で同点をチェック（トーナメントでは同点は許可されない）
  static isTie(match: { team1Score: number; team2Score: number }): boolean {
    return match.team1Score === match.team2Score && (match.team1Score > 0 || match.team2Score > 0);
  }

  // トーナメントに得点が存在するかチェック
  static hasExistingScores(matches: any[]): boolean {
    return matches.some(match => 
      match.team1Score > 0 || match.team2Score > 0 || match.winnerId
    );
  }

  // 休憩時間をスケジュールに統合するメソッド
  static integrateBreaksToSchedule(matches: any[], breaks: any[]): any[] {
    if (!breaks || breaks.length === 0) return matches;

    // 休憩を含む新しい配列
    const updatedMatches = [...matches];

    // 各休憩を特殊な「試合」として追加
    breaks.forEach(breakItem => {
      // 休憩用の特殊IDを作成
      const breakId = `break_${breakItem.id || Date.now()}`;
      
      // 休憩を特殊な試合オブジェクトとして追加
      updatedMatches.push({
        id: breakId,
        type: 'break',  // 休憩の種類を識別するプロパティ
        title: breakItem.title || 'Break',  // 休憩の題名
        description: breakItem.description || '',  // 休憩の説明
        startTime: breakItem.startTime,  // 開始時間
        endTime: breakItem.endTime,  // 終了時間
        round: 0,  // 休憩はラウンドに属さない
        matchNumber: -1,  // 休憩は試合番号を持たない
        // 他のプロパティを追加
      });
    });

    return updatedMatches;
  }

  // スケジュールの時間重複をチェックするメソッド
  static checkScheduleOverlaps(schedule: any[]): { hasOverlap: boolean, overlappingItems: any[] } {
    const sortedSchedule = [...schedule].sort((a, b) => {
      const aStart = new Date(a.startTime).getTime();
      const bStart = new Date(b.startTime).getTime();
      return aStart - bStart;
    });

    const overlaps: any[] = [];

    for (let i = 0; i < sortedSchedule.length - 1; i++) {
      const current = sortedSchedule[i];
      const next = sortedSchedule[i + 1];
      
      const currentEnd = new Date(current.endTime || current.startTime).getTime();
      const nextStart = new Date(next.startTime).getTime();
      
      if (currentEnd > nextStart) {
        overlaps.push({ item1: current, item2: next });
      }
    }

    return {
      hasOverlap: overlaps.length > 0,
      overlappingItems: overlaps
    };
  }

  // 昼休憩をスケジュールに自動挿入するメソッド
  static insertLunchBreak(schedule: any[], lunchStartTime: string = '12:00', durationMinutes: number = 60): any[] {
    // 昼休憩が既にあるかチェック
    const hasLunchBreak = schedule.some(item => 
      item.type === 'break' && 
      (item.title?.includes('昼休憩') || item.title?.includes('lunch'))
    );

    // 既に昼休憩があれば何もしない
    if (hasLunchBreak) return schedule;

    // 昼休憩の開始時間を解析
    const [hours, minutes] = lunchStartTime.split(':').map(Number);
    const lunchStart = new Date();
    lunchStart.setHours(hours, minutes, 0, 0);
    
    // 終了時間を計算
    const lunchEnd = new Date(lunchStart);
    lunchEnd.setMinutes(lunchStart.getMinutes() + durationMinutes);
    
    // 昼休憩オブジェクトを作成
    const lunchBreak = {
      id: `lunch_break_${Date.now()}`,
      type: 'break',
      title: '昼休憩',
      description: 'Lunch Break',
      startTime: lunchStart.toISOString(),
      endTime: lunchEnd.toISOString(),
      round: 0,
      matchNumber: -1
    };
    
    // 昼休憩を追加したスケジュールを返す
    return [...schedule, lunchBreak];
  }
}
