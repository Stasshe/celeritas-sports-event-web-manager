import { Team, Match, LeagueBlock } from '../../../../types/index';

export class LeagueMatchHelper {
  /**
   * チームをブロックに均等に分配し、各ブロック内で総当たり戦の試合を生成する
   */
  static distributeTeamsToBlocks(teams: Team[], blockCount = 3 ): LeagueBlock[] {
    if (teams.length === 0 || blockCount === 0) {
      return [];
    }
    
    // チームをシャッフル
    const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
    
    // 各ブロックに均等に分配
    const newBlocks: LeagueBlock[] = Array.from({ length: blockCount }, (_, i) => ({
      id: `block_${i + 1}`,
      name: `ブロック ${i + 1}`,
      teamIds: [],
      matches: []
    }));
    
    shuffledTeams.forEach((team, i) => {
      const blockIndex = i % blockCount;
      newBlocks[blockIndex].teamIds.push(team.id);
    });
    
    // 各ブロック内で総当たり戦の試合を生成
    newBlocks.forEach(block => {
      const blockTeams = block.teamIds
        .map(id => teams.find(t => t.id === id))
        .filter(Boolean) as Team[];
      
      block.matches = this.generateRoundRobinMatches(blockTeams, block.id);
    });
    
    return newBlocks;
  }
  
  /**
   * 指定されたチーム間で総当たり戦の試合を生成する
   */
  static generateRoundRobinMatches(teams: Team[], blockId: string): Match[] {
    const matches: Match[] = [];
    let matchNumber = 1;
    
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        matches.push({
          id: `match_${blockId}_${matchNumber}`,
          team1Id: teams[i].id,
          team2Id: teams[j].id,
          team1Score: 0,
          team2Score: 0,
          round: 1,
          matchNumber: matchNumber++,
          status: 'scheduled' as const,
          blockId
        });
      }
    }
    
    return matches;
  }
  
  /**
   * ブロック内の成績を計算して順位を返す
   */
  static calculateBlockStandings(block: LeagueBlock): string[] {
    // チーム成績の計算（勝ち点方式）
    const teamStats: Record<string, {
      teamId: string,
      points: number,
      goalDiff: number,
      goalsFor: number
    }> = {};
    
    // 全チームを初期化
    block.teamIds.forEach(teamId => {
      teamStats[teamId] = {
        teamId,
        points: 0,
        goalDiff: 0,
        goalsFor: 0
      };
    });
    
    // 試合結果から集計
    block.matches.forEach(match => {
      // 完了した試合のみ集計
      if (match.status !== 'completed') return;
      
      // チーム1の成績更新
      if (match.team1Id && teamStats[match.team1Id]) {
        const stat = teamStats[match.team1Id];
        if (match.team1Score > match.team2Score) {
          stat.points += 3; // 勝ち
        } else if (match.team1Score === match.team2Score) {
          stat.points += 1; // 引き分け
        }
        stat.goalsFor += match.team1Score;
        stat.goalDiff += match.team1Score - match.team2Score;
      }
      
      // チーム2の成績更新
      if (match.team2Id && teamStats[match.team2Id]) {
        const stat = teamStats[match.team2Id];
        if (match.team2Score > match.team1Score) {
          stat.points += 3; // 勝ち
        } else if (match.team1Score === match.team2Score) {
          stat.points += 1; // 引き分け
        }
        stat.goalsFor += match.team2Score;
        stat.goalDiff += match.team2Score - match.team1Score;
      }
    });
    
    // 順位でソート
    const sortedTeams = Object.values(teamStats).sort((a, b) => {
      if (a.points !== b.points) return b.points - a.points;
      if (a.goalDiff !== b.goalDiff) return b.goalDiff - a.goalDiff;
      return b.goalsFor - a.goalsFor;
    });
    
    return sortedTeams.map(stat => stat.teamId);
  }
}
