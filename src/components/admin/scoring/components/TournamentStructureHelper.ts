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
    const perfectBracketTeams = Math.pow(2, totalRounds);
    const firstRoundMatchCount = Math.ceil(teamCount / 2);

    // First round matches
    for (let i = 1; i <= firstRoundMatchCount; i++) {
      matches.push({ round: 1, matchNumber: i });
    }

    // Remaining rounds
    for (let round = 2; round <= totalRounds; round++) {
      const matchesInRound = Math.ceil(firstRoundMatchCount / Math.pow(2, round - 1));
      for (let match = 1; match <= matchesInRound; match++) {
        matches.push({ round, matchNumber: match });
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
}
