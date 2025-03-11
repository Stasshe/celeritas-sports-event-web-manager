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

  // 試合の状態を自動判定する
  static getMatchStatus(match: { team1Score: number; team2Score: number }): 'scheduled' | 'inProgress' | 'completed' {
    if (match.team1Score === 0 && match.team2Score === 0) return 'scheduled';
    if (match.team1Score > 0 || match.team2Score > 0) return 'completed';
    return 'inProgress';
  }

  // シードまたは不在チームを判定する
  static isNoTeam(matchId: string, teamId: string | null, matches: any[]): boolean {
    if (!teamId) return true;
    
    const match = matches.find(m => m.id === matchId);
    if (!match) return true;

    // 前のラウンドからの進出待ちの場合はシード/不在チームではない
    const previousMatch = matches.find(m => 
      m.round === match.round - 1 && 
      (m.team1Id === teamId || m.team2Id === teamId)
    );

    return !previousMatch && !teamId;
  }

  // 待機中の状態を判定する
  static isWaiting(matchId: string, teamId: string | null, matches: any[]): boolean {
    if (!teamId) return false;
    
    const match = matches.find(m => m.id === matchId);
    if (!match) return false;

    // 両方のチームが待機中の場合は待機中として扱わない
    const bothWaiting = match.team1Id && match.team2Id && matches.some(m => 
      m.round === match.round - 1 && 
      !m.winnerId && 
      (m.team1Id === match.team1Id || m.team2Id === match.team1Id) &&
      (m.team1Id === match.team2Id || m.team2Id === match.team2Id)
    );

    if (bothWaiting) return false;

    // 前の試合の勝者を待っている場合
    return matches.some(m => 
      m.round === match.round - 1 && 
      !m.winnerId && 
      (m.team1Id === teamId || m.team2Id === teamId)
    );
  }

  // トーナメントに得点が存在するかチェック
  static hasExistingScores(matches: any[]): boolean {
    return matches.some(match => 
      match.team1Score > 0 || match.team2Score > 0 || match.winnerId
    );
  }
}
