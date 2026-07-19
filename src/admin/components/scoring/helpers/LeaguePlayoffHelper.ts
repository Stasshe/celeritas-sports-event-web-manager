import { Match, Team, LeagueBlock } from '../../../../types';
import { TournamentStructureHelper } from '../../../../common/TournamentStructureHelper';
import { LeagueMatchHelper } from './LeagueMatchHelper';
import { resolveTournamentParticipants } from '../../../../common/tournament';

interface PlayoffGenerationResult {
  success: boolean;
  message: string;
  matches: Match[];
}

export class LeaguePlayoffHelper {
  /**
   * ブロック内の全試合が完了しているかどうかを確認
   */
  private static isBlockCompleted(block: LeagueBlock): boolean {
    return block.matches.every(match => match.status === 'completed');
  }

  /**
   * プレーオフトーナメントを生成する
   */
  static generatePlayoffTournament(
    blocks: LeagueBlock[],
    teams: Team[],
    advancingTeams: number,
    hasThirdPlaceMatch: boolean
  ): PlayoffGenerationResult {
    try {
      // 各ブロックの成績計算
      const blockStandings: Record<string, string[]> = {};
      
      blocks.forEach(block => {
        blockStandings[block.id] = LeagueMatchHelper.calculateBlockStandings(block);
      });
      
      // 各ブロックの上位チームを取得
      const advancingTeamIds: string[] = [];
      // 未完了ブロックの数を追跡
      const incompleteBlocks: LeagueBlock[] = [];
      
      blocks.forEach(block => {
        // ブロック内の全試合が完了しているかどうかをチェック
        if (this.isBlockCompleted(block)) {
          // 完了している場合は上位チームを追加
          const blockRanking = blockStandings[block.id] || [];
          for (let i = 0; i < Math.min(advancingTeams, blockRanking.length); i++) {
            advancingTeamIds.push(blockRanking[i]);
          }
        } else {
          // 未完了ブロックを記録
          incompleteBlocks.push(block);
        }
      });
      
      // 試合未完了のブロックがあっても、プレーオフ生成を許可する（全て未完了でもTBDで生成）
      // 進出チームが1つもいない場合でも、未完了ブロック数×進出枠分のTBDチームで生成する
      // ただし、進出チームも未完了ブロックも0の場合はエラー
      if (advancingTeamIds.length === 0 && incompleteBlocks.length === 0) {
        return {
          success: false,
          message: "最低2チーム必要です",
          matches: []
        };
      }
      
      // 進出チームが1チームのみの場合でも作成を許可（TBDとの対戦になる）
      const minTeamsRequired = 1;
      
      // 進出チームのチーム情報を取得
      const playoffTeamObjects = advancingTeamIds
        .map(id => teams.find(t => t.id === id))
        .filter(Boolean) as Team[];
        
      // 未完了ブロックに対応する仮想TBDチームを追加
      // 各未完了ブロックから進出する可能性のあるチーム数を計算
      const expectedTeamsFromIncompleteBlocks = incompleteBlocks.length * advancingTeams;
      const qualifierSources = incompleteBlocks.flatMap(block => {
        return Array.from({ length: advancingTeams }, (_, index) => ({
          id: `qualifier_${block.id}_${index + 1}`,
          blockId: block.id,
          rank: index + 1
        }));
      });
      
      // TBDチームを作成し、playoffTeamObjectsに追加
      for (let i = 0; i < expectedTeamsFromIncompleteBlocks; i++) {
        const qualifier = qualifierSources[i];
        const tbdTeam: Team = {
          id: qualifier.id,
          name: `ブロック${qualifier.blockId.replace(/^block_/, '')} ${qualifier.rank}位`,
          color: '#CCCCCC'
        } as Team;
        
        playoffTeamObjects.push(tbdTeam);
      }
      
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
        const team1Qualifier = qualifierSources.find(source => source.id === team1Placement?.teamId);
        const team2Qualifier = qualifierSources.find(source => source.id === team2Placement?.teamId);
        const newMatch: Match = {
          id: `playoff_match_${round}_${matchNumber}`,
          team1Id: team1Qualifier ? '' : team1Placement?.teamId || '',
          team2Id: team2Qualifier ? '' : team2Placement?.teamId || '',
          team1Score: 0,
          team2Score: 0,
          round,
          matchNumber,
          status: 'scheduled',
          date: new Date().toISOString().split('T')[0],
          // blockIdは設定しない（プレーオフ試合の識別用）
        };
        if (team1Qualifier) {
          newMatch.team1Source = {
            type: 'blockRank',
            blockId: team1Qualifier.blockId,
            rank: team1Qualifier.rank
          };
        }
        if (team2Qualifier) {
          newMatch.team2Source = {
            type: 'blockRank',
            blockId: team2Qualifier.blockId,
            rank: team2Qualifier.rank
          };
        }
        if (round > 1) {
          const firstPreviousId = `playoff_match_${round - 1}_${matchNumber * 2 - 1}`;
          const secondPreviousId = `playoff_match_${round - 1}_${matchNumber * 2}`;
          newMatch.previousMatches = [firstPreviousId, secondPreviousId];
          newMatch.team1Source = { type: 'winner', matchId: firstPreviousId };
          newMatch.team2Source = { type: 'winner', matchId: secondPreviousId };
        }
        
        newPlayoffMatches.push(newMatch);
      });
      
      // 4. シード戦の処理 (1回戦の片方のチームしかない場合)
      newPlayoffMatches.forEach(match => {
        // TBDチームのIDを特定
        const isTBDTeam1 = match.team1Source?.type === 'blockRank';
        const isTBDTeam2 = match.team2Source?.type === 'blockRank';
        
        // TBDチームを含む試合はシード進行させない
        if (isTBDTeam1 || isTBDTeam2) {
          return;
        }
        
        if (match.round === 1 && ((match.team1Id && !match.team2Id) || (!match.team1Id && match.team2Id))) {
          const winningTeamId = match.team1Id || match.team2Id;
          const nextMatch = newPlayoffMatches.find(m =>
            m.round === 2 && Math.ceil(match.matchNumber / 2) === m.matchNumber
          );
          if (nextMatch) {
            if (match.matchNumber % 2 !== 0) {
              nextMatch.team1Id = winningTeamId;
            } else {
              nextMatch.team2Id = winningTeamId;
            }
          }
        }
      });
  
      
      // 3位決定戦を追加
      if (hasThirdPlaceMatch && newPlayoffMatches.length > 0 && playoffTeamObjects.length >= 4) {
        // 最大ラウンドを取得（決勝戦のラウンド）
        const maxRound = Math.max(...newPlayoffMatches.map(m => m.round));
        
        // 準決勝戦を特定 - 決勝の一つ前のラウンドが準決勝
        const semifinalRound = maxRound - 1;
        const semifinalMatches = newPlayoffMatches.filter(m => m.round === semifinalRound);
        
        // 準決勝戦が2試合以上ある場合のみ3位決定戦を生成
        if (semifinalMatches.length >= 2) {
          // 3位決定戦の試合を生成
          const thirdPlaceMatch: Match = {
            id: `playoff_third_place_match`,
            team1Id: '', // 準決勝敗者が入る（空文字列で初期化）
            team2Id: '', // 準決勝敗者が入る（空文字列で初期化）
            team1Score: 0,
            team2Score: 0,
            round: maxRound, // 決勝と同じラウンド
            matchNumber: 0, // 特別な番号として0を使用
            status: 'scheduled',
            date: new Date().toISOString().split('T')[0],
            previousMatches: semifinalMatches.slice(0, 2).map(match => match.id),
            team1Source: { type: 'loser', matchId: semifinalMatches[0].id },
            team2Source: { type: 'loser', matchId: semifinalMatches[1].id }
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
        message: "トーナメント生成エラー",
        matches: []
      };
    }
  }
  
  /**
   * プレーオフ試合を更新し、3位決定戦の設定などを行う
   */
  static updatePlayoffMatches(matches: Match[]): Match[] {
    const newPlayoffMatches = matches.map(match => ({ ...match }));
    
    // 1. シード戦の処理 - 1回戦の不戦勝のみを自動的に処理
    newPlayoffMatches.forEach(match => {
      // 既に完了している試合はスキップ
      if (match.status === 'completed') return;
      
      // TBDチームが含まれる試合はスキップ
      const isTBDTeam1 = match.team1Source?.type === 'blockRank' && !match.team1Id;
      const isTBDTeam2 = match.team2Source?.type === 'blockRank' && !match.team2Id;
      if (isTBDTeam1 || isTBDTeam2) return;
      
      // シード戦は1回戦でのみ発生し、片方のチームのみが存在する場合
      const isFirstRound = match.round === 1;
      const hasTeam1 = Boolean(match.team1Id || match.team1Source);
      const hasTeam2 = Boolean(match.team2Id || match.team2Source);
      const hasOnlyOneTeam = hasTeam1 !== hasTeam2;
      
      const isSeedMatch = isFirstRound && hasOnlyOneTeam;
      
      if (isSeedMatch) {
        const winningTeamId = match.team1Id || match.team2Id;
        
        // シード戦は自動的に勝者を設定
        match.status = 'completed';
        match.team1Score = match.team1Id ? 1 : 0;
        match.team2Score = match.team2Id ? 1 : 0;
        match.winnerId = winningTeamId;
        
      }
    });

    return resolveTournamentParticipants(newPlayoffMatches);
  }

  static resolveBlockRankSources(matches: Match[], blocks: LeagueBlock[]): Match[] {
    const standings = new Map<string, string[]>();
    blocks.forEach(block => {
      if (this.isBlockCompleted(block)) {
        standings.set(block.id, LeagueMatchHelper.calculateBlockStandings(block));
      } else {
        standings.set(block.id, []);
      }
    });

    return matches.map(match => {
      const updatedMatch = { ...match };
      if (match.team1Source?.type === 'blockRank') {
        updatedMatch.team1Id = standings.get(match.team1Source.blockId)?.[match.team1Source.rank - 1] || '';
      }
      if (match.team2Source?.type === 'blockRank') {
        updatedMatch.team2Id = standings.get(match.team2Source.blockId)?.[match.team2Source.rank - 1] || '';
      }
      return updatedMatch;
    });
  }
}
