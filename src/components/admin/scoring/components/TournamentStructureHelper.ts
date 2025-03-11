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
    
    // 1回戦のマッチを生成（最初の1試合 + 残りの単独試合）
    for (let i = 1; i <= teamCount - 1; i++) {
      matches.push({ round: 1, matchNumber: i });
    }

    // 2回戦のマッチを生成（2試合）
    matches.push({ round: 2, matchNumber: 1 }); // 1回戦勝者 vs 3番目のチーム
    matches.push({ round: 2, matchNumber: 2 }); // 4番目 vs 5番目のチーム

    // 決勝戦
    matches.push({ round: 3, matchNumber: 1 });

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

    // 1回戦の最初の試合（2チーム対戦）
    placements.push({
      matchId,
      round: 1,
      matchNumber: 1,
      position: 'team1',
      teamId: teams[0].id
    });
    placements.push({
      matchId,
      round: 1,
      matchNumber: 1,
      position: 'team2',
      teamId: teams[1].id
    });

    // 残りのチームを1回戦の別々の試合に配置（vs none）
    for (let i = 2; i < totalTeams; i++) {
      matchId++;
      placements.push({
        matchId,
        round: 1,
        matchNumber: i,
        position: 'team1',
        teamId: teams[i].id
      });
      placements.push({
        matchId,
        round: 1,
        matchNumber: i,
        position: 'team2',
        teamId: '' // 空の対戦相手
      });
    }

    return placements;
  }

  // シードまたは不在チームを判定する
  static isNoTeam(teamId: string | null, match: any, matches: any[]): boolean {
    if (!teamId) return true;

    // チームは存在するが、前のラウンドからの進出待ちではない場合はシード扱い
    const previousMatch = matches.find(m => 
      m.round === match.round - 1 && 
      (m.team1Id === teamId || m.team2Id === teamId)
    );

    // シード判定: チームはいるが前の試合がない場合
    return Boolean(teamId && !previousMatch);
  }

  // 待機中の状態を判定する
  static isWaiting(teamId: string | null, match: any, matches: any[]): boolean {
    if (!teamId) return false;

    // 両チームが揃っているか確認
    if (match.team1Id && match.team2Id) {
      const team1PrevMatch = matches.find(m => 
        m.round === match.round - 1 && 
        (m.team1Id === match.team1Id || m.team2Id === match.team1Id)
      );
      const team2PrevMatch = matches.find(m => 
        m.round === match.round - 1 && 
        (m.team1Id === match.team2Id || m.team2Id === match.team2Id)
      );

      // 両チームとも前の試合があり、どちらも完了していない場合
      if (team1PrevMatch && team2PrevMatch && 
          !team1PrevMatch.winnerId && !team2PrevMatch.winnerId) {
        return false; // 通常表示に切り替え
      }
    }

    // 前の試合の勝者を待っている場合
    const previousMatch = matches.find(m => 
      m.round === match.round - 1 && 
      (m.team1Id === teamId || m.team2Id === teamId) &&
      !m.winnerId
    );

    return Boolean(previousMatch);
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
