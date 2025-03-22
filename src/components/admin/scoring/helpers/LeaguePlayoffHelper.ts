import { Match, Team, LeagueBlock } from '../../../../types';
import { TournamentStructureHelper } from '../components/TournamentStructureHelper';
import { TFunction } from 'i18next';
import { LeagueMatchHelper } from './LeagueMatchHelper';

interface PlayoffGenerationResult {
  success: boolean;
  message: string;
  matches: Match[];
}

export class LeaguePlayoffHelper {
  /**
   * プレーオフトーナメントを生成する
   */
  static generatePlayoffTournament(
    blocks: LeagueBlock[],
    teams: Team[],
    advancingTeams: number,
    hasThirdPlaceMatch: boolean,
    t: TFunction
  ): PlayoffGenerationResult {
    try {
      // 各ブロックの成績計算
      const blockStandings: Record<string, string[]> = {};
      
      blocks.forEach(block => {
        blockStandings[block.id] = LeagueMatchHelper.calculateBlockStandings(block);
      });
      
      // 各ブロックの上位チームを取得
      const advancingTeamIds: string[] = [];
      
      blocks.forEach(block => {
        const blockRanking = blockStandings[block.id] || [];
        for (let i = 0; i < Math.min(advancingTeams, blockRanking.length); i++) {
          advancingTeamIds.push(blockRanking[i]);
        }
      });
      
      if (advancingTeamIds.length < 2) {
        return {
          success: false,
          message: t('tournament.needAtLeastTwoTeams'),
          matches: []
        };
      }
      
      // 進出チームのチーム情報を取得
      const playoffTeamObjects = advancingTeamIds
        .map(id => teams.find(t => t.id === id))
        .filter(Boolean) as Team[];
      
      // 1. 試合構造を生成
      const matchStructure = TournamentStructureHelper.generateInitialMatches(playoffTeamObjects.length);
      
      // 2. チーム配置を計算
      const teamPlacements = TournamentStructureHelper.calculateTeamPlacements(playoffTeamObjects);
      
      // 3. 試合データを生成
      const newPlayoffMatches: Match[] = [];
      
      matchStructure.forEach((matchInfo, index) => {
        const { round, matchNumber } = matchInfo;
        
        // この試合に配置されるチームを探す
        const team1Placement = teamPlacements.find(p => 
          p.round === round && p.matchNumber === matchNumber && p.position === 'team1'
        );
        
        const team2Placement = teamPlacements.find(p => 
          p.round === round && p.matchNumber === matchNumber && p.position === 'team2'
        );
        
        // 新しい試合オブジェクトを作成
        const newMatch: Match = {
          id: `playoff_match_${round}_${matchNumber}`,
          team1Id: team1Placement?.teamId || '',
          team2Id: team2Placement?.teamId || '',
          team1Score: 0,
          team2Score: 0,
          round,
          matchNumber,
          status: 'scheduled',
          date: new Date().toISOString().split('T')[0],
          // blockIdは設定しない（プレーオフ試合の識別用）
        };
        
        newPlayoffMatches.push(newMatch);
      });
      
      // 4. 自動進出処理 (不戦勝)
      newPlayoffMatches.forEach(match => {
        if (match.round === 1) {
          // 1回戦でどちらかのチームだけいる場合は自動的に次の試合に進出
          if ((match.team1Id && !match.team2Id) || (!match.team1Id && match.team2Id)) {
            const winningTeamId = match.team1Id || match.team2Id;
            
            // 次の試合を探す
            const nextRoundMatch = newPlayoffMatches.find(m => 
              m.round === 2 && Math.ceil(match.matchNumber / 2) === m.matchNumber
            );
            
            if (nextRoundMatch) {
              // 奇数番号の試合は上側、偶数番号の試合は下側に進出
              if (match.matchNumber % 2 !== 0) {
                nextRoundMatch.team1Id = winningTeamId;
              } else {
                nextRoundMatch.team2Id = winningTeamId;
              }
            }
          }
        }
      });
      
      // 3位決定戦を追加
      if (hasThirdPlaceMatch && newPlayoffMatches.length > 0) {
        // 最終ラウンド（決勝戦）を特定
        const maxRound = Math.max(...newPlayoffMatches.map(m => m.round));
        
        // 準決勝戦を特定（最終ラウンドの1つ前）
        const semifinalMatches = newPlayoffMatches.filter(m => m.round === maxRound - 1);
        
        if (semifinalMatches.length >= 2) {
          // 3位決定戦の試合を生成 - IDを明確に識別できる形式に
          const thirdPlaceMatch: Match = {
            id: `playoff_third_place_match`,
            team1Id: '', // 準決勝敗者が入る
            team2Id: '', // 準決勝敗者が入る
            team1Score: 0,
            team2Score: 0,
            round: maxRound, // 決勝と同じラウンド
            matchNumber: 0, // 特別な番号として0を使用
            status: 'scheduled',
            date: new Date().toISOString().split('T')[0],
          };
          
          // 3位決定戦を追加
          newPlayoffMatches.push(thirdPlaceMatch);
        }
      }
      
      return {
        success: true,
        message: "Success",
        matches: newPlayoffMatches
      };
      
    } catch (error) {
      console.error("Error generating playoff tournament:", error);
      return {
        success: false,
        message: t('tournament.errorGenerating'),
        matches: []
      };
    }
  }
  
  /**
   * プレーオフ試合を更新し、3位決定戦の設定などを行う
   */
  static updatePlayoffMatches(matches: Match[]): Match[] {
    const newPlayoffMatches = [...matches];
    
    // 準決勝試合を検出して、敗者を3位決定戦に移動するロジックを追加
    const maxRound = Math.max(...newPlayoffMatches.map(m => m.round));
    const semifinalMatches = newPlayoffMatches.filter(m => 
      m.round === maxRound - 1 && m.winnerId // 勝者が確定している準決勝
    );
    
    // 3位決定戦を探す
    const thirdPlaceMatch = newPlayoffMatches.find(m => 
      m.matchNumber === 0 || m.id.includes('third_place')
    );
    
    // 準決勝と3位決定戦が存在する場合
    if (semifinalMatches.length > 0 && thirdPlaceMatch) {
      // 敗者を取得
      const losers = semifinalMatches.map(match => 
        match.team1Id === match.winnerId ? match.team2Id : match.team1Id
      ).filter(Boolean);
      
      // チーム1が空なら1つ目の敗者を設定
      if (!thirdPlaceMatch.team1Id && losers.length > 0) {
        thirdPlaceMatch.team1Id = losers[0];
      }
      
      // チーム2が空なら2つ目の敗者を設定
      if (!thirdPlaceMatch.team2Id && losers.length > 1) {
        thirdPlaceMatch.team2Id = losers[1];
      }
    }
    
    return newPlayoffMatches;
  }
}
