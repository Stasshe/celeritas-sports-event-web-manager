interface TournamentMatch {
  id: string;
  round: number;
  matchNumber: number;
  teamIndexes: number[];
  isSeed: boolean;
  nextMatchNumber: number;
  nextMatchId?: string;
}

interface TournamentStructure {
  matches: TournamentMatch[];
  seedTeamIndex: number;
  firstRoundStartIndex: number;
  teamIndexMapping: number[];
}

export class TournamentStructureHelper {
  static createMatchStructure(teamCount: number): TournamentStructure {
    if (teamCount < 2) return { matches: [], seedTeamIndex: 0, firstRoundStartIndex: 0, teamIndexMapping: [] };

    const matches: TournamentMatch[] = [];
    let matchId = 1;

    // トーナメントの基本構造を計算
    const rounds = Math.ceil(Math.log2(teamCount));
    const fullBracketSize = Math.pow(2, rounds);
    const firstRoundTeamCount = teamCount - 1; // 1チームをシードとして確保
    const firstRoundMatchCount = Math.floor(firstRoundTeamCount / 2);
    const remainingTeams = firstRoundTeamCount % 2; // 1回戦後の余りチーム

    // 1回戦の試合を生成
    let currentTeamIndex = 1; // インデックス0はシードチーム用に予約
    for (let i = 0; i < firstRoundMatchCount; i++) {
      matches.push({
        id: `match_${matchId++}`,
        round: 1,
        matchNumber: i + 1,
        teamIndexes: [currentTeamIndex, currentTeamIndex + 1],
        isSeed: false,
        nextMatchNumber: Math.ceil((i + 1) / 2)
      });
      currentTeamIndex += 2;
    }

    // 2回戦の試合を生成
    const secondRoundMatchCount = Math.ceil((firstRoundMatchCount + remainingTeams + 1) / 2);
    let secondRoundTeamPlaced = false;

    for (let i = 0; i < secondRoundMatchCount; i++) {
      const isFirstMatch = i === 0;
      matches.push({
        id: `match_${matchId++}`,
        round: 2,
        matchNumber: i + 1,
        teamIndexes: isFirstMatch && !secondRoundTeamPlaced ? [0] : [], // シードチームを配置
        isSeed: isFirstMatch && !secondRoundTeamPlaced,
        nextMatchNumber: Math.ceil((i + 1) / 2)
      });
      if (isFirstMatch) secondRoundTeamPlaced = true;
    }

    // 3回戦以降の試合を生成
    for (let round = 3; round <= rounds; round++) {
      const matchesInRound = Math.pow(2, rounds - round);
      for (let i = 0; i < matchesInRound; i++) {
        matches.push({
          id: `match_${matchId++}`,
          round,
          matchNumber: i + 1,
          teamIndexes: [],
          isSeed: false,
          nextMatchNumber: Math.ceil((i + 1) / 2)
        });
      }
    }

    // マッチの接続関係を設定
    matches.forEach(match => {
      if (match.round < rounds) {
        match.nextMatchId = matches.find(m => 
          m.round === match.round + 1 && 
          m.matchNumber === match.nextMatchNumber
        )?.id;
      }
    });

    return {
      matches,
      seedTeamIndex: 0,
      firstRoundStartIndex: 1,
      teamIndexMapping: Array.from({ length: teamCount }, (_, i) => i)
    };
  }
}
