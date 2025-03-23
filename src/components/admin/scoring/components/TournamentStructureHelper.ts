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

  // シードまたは不在チームを判定する
  static isNoTeam(teamId: string | null, match: any, matches: any[]): boolean {
    if (!teamId) return true;

    // 1回戦の場合
    if (match.round === 1) {
      // シードポジションのチーム（対戦相手が空）は不戦勝として扱う
      const currentMatch = matches.find(m => m.id === match.id);
      return currentMatch && 
        ((currentMatch.team1Id === teamId && !currentMatch.team2Id) || 
         (currentMatch.team2Id === teamId && !currentMatch.team1Id));
    }

    // 2回戦以降の場合
    // 前のラウンドからの進出待ちではない（シード）場合のみtrue
    const previousMatch = matches.find(m => 
      m.round === match.round - 1 && 
      (m.team1Id === teamId || m.team2Id === teamId)
    );

    return Boolean(teamId && !previousMatch);
  }

  // 待機中の状態を判定する
  static isWaiting(teamId: string | null, match: any, matches: any[]): boolean {
    if (!teamId || match.round === 1) return false;

    // シードチームは待機状態にならない
    if (this.isNoTeam(teamId, match, matches)) return false;

    // 両チームが揃っている場合の特別処理
    if (match.team1Id && match.team2Id) {
      const team1IsWaiting = this.checkTeamIsWaiting(match.team1Id, match.round, matches);
      const team2IsWaiting = this.checkTeamIsWaiting(match.team2Id, match.round, matches);
      
      // 両チームとも前の試合からの勝者待ちの場合は通常の試合として扱う
      if (team1IsWaiting && team2IsWaiting) return false;
      
      // 片方のチームだけが待機中の場合は待機状態
      return teamId === match.team1Id ? team1IsWaiting : team2IsWaiting;
    }

    // 個別チームの待機状態をチェック
    return this.checkTeamIsWaiting(teamId, match.round, matches);
  }

  // チームが待機中かどうかをチェックするヘルパーメソッド
  private static checkTeamIsWaiting(teamId: string, round: number, matches: any[]): boolean {
    const previousMatch = matches.find(m => 
      m.round === round - 1 && 
      (m.team1Id === teamId || m.team2Id === teamId)
    );

    return Boolean(previousMatch && !previousMatch.winnerId);
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
  static getMatchStatus(match: { team1Score: number; team2Score: number }): 'scheduled' | 'inProgress' | 'completed' {
    if (match.team1Score === 0 && match.team2Score === 0) return 'scheduled';
    if (match.team1Score > 0 || match.team2Score > 0) return 'completed';
    return 'inProgress';
  }

  // トーナメントに得点が存在するかチェック
  static hasExistingScores(matches: any[]): boolean {
    return matches.some(match => 
      match.team1Score > 0 || match.team2Score > 0 || match.winnerId
    );
  }
}
