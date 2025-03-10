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
    const matches: Array<{round: number, matchNumber: number}> = [];
    const totalRounds = this.calculateTotalRounds(teamCount);
    const firstRoundMatches = this.calculateFirstRoundMatches(teamCount);

    // First round matches
    for (let i = 1; i <= firstRoundMatches; i++) {
      matches.push({ round: 1, matchNumber: i });
    }

    // Remaining rounds
    for (let round = 2; round <= totalRounds; round++) {
      const matchesInRound = Math.pow(2, totalRounds - round);
      for (let match = 1; match <= matchesInRound; match++) {
        matches.push({ round, matchNumber: match });
      }
    }

    // Add third place match if needed
    matches.push({ round: totalRounds, matchNumber: 0 }); // Special match number 0 for third place

    return matches;
  }

  static getNextMatchInfo(currentRound: number, currentMatchNumber: number): { round: number, matchNumber: number } {
    return {
      round: currentRound + 1,
      matchNumber: Math.ceil(currentMatchNumber / 2)
    };
  }
}
