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
      
      // 試合未完了のブロックがある場合でも、少なくとも1つのブロックが完了していればトーナメント作成
      if (advancingTeamIds.length === 0) {
        return {
          success: false,
          message: t('tournament.needAtLeastTwoTeams') + ' ' + t('tournament.allBlocksMustBeCompleted'),
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
      
      // TBDチームを作成し、playoffTeamObjectsに追加
      for (let i = 0; i < expectedTeamsFromIncompleteBlocks; i++) {
        const tbdTeam: Team = {
          id: `tbd_${i}`,
          name: `TBD (${t('tournament.pendingCompletion')})`,
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
      
      // 4. シード戦の処理 (1回戦の片方のチームしかない場合)
      newPlayoffMatches.forEach(match => {
        // TBDチームのIDを特定
        const isTBDTeam1 = match.team1Id && match.team1Id.startsWith('tbd_');
        const isTBDTeam2 = match.team2Id && match.team2Id.startsWith('tbd_');
        
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
        // 準決勝戦を特定 - ラウンド2が準決勝
        const semifinalMatches = newPlayoffMatches.filter(m => m.round === 2);
        
        if (semifinalMatches.length >= 2) {
          // 3位決定戦の試合を生成
          const thirdPlaceMatch: Match = {
            id: `playoff_third_place_match`,
            team1Id: '', // 準決勝敗者が入る
            team2Id: '', // 準決勝敗者が入る
            team1Score: 0,
            team2Score: 0,
            round: 1, // 決勝と同じラウンド
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
    
    // 1. シード戦の処理 - まだ完了していないシード戦を自動的に処理
    newPlayoffMatches.forEach(match => {
      // 既に完了している試合はスキップ
      if (match.status === 'completed') return;
      
      // TBDチームが含まれる試合はスキップ
      const isTBDTeam1 = match.team1Id && match.team1Id.startsWith('tbd_');
      const isTBDTeam2 = match.team2Id && match.team2Id.startsWith('tbd_');
      if (isTBDTeam1 || isTBDTeam2) return;
      
      // シード戦かどうかを判定 (片方のチームしかない試合)
      const isSeedMatch = Boolean(match.team1Id && !match.team2Id) || Boolean(!match.team1Id && match.team2Id);
      
      if (isSeedMatch) {
        const winningTeamId = match.team1Id || match.team2Id;
        
        // シード戦は自動的に勝者を設定
        match.status = 'completed';
        match.team1Score = match.team1Id ? 1 : 0;
        match.team2Score = match.team2Id ? 1 : 0;
        match.winnerId = winningTeamId;
        
        // 次の試合を探して勝者を進出させる
        const nextRoundMatch = newPlayoffMatches.find(m => 
          m.round === match.round - 1 && Math.ceil(match.matchNumber / 2) === m.matchNumber
        );
        
        if (nextRoundMatch) {
          if (match.matchNumber % 2 !== 0) {
            nextRoundMatch.team1Id = winningTeamId;
          } else {
            nextRoundMatch.team2Id = winningTeamId;
          }
        }
      }
    });
    
    // 2. 勝者が既に決まっている試合からの進出処理
    newPlayoffMatches.forEach(match => {
      // TBDチームが含まれる試合はスキップ
      const isTBDTeam1 = match.team1Id && match.team1Id.startsWith('tbd_');
      const isTBDTeam2 = match.team2Id && match.team2Id.startsWith('tbd_');
      if (isTBDTeam1 || isTBDTeam2) return;
      
      // 完了して勝者が決まっている試合で、シード戦ではない試合
      if (match.status === 'completed' && match.winnerId && match.team1Id && match.team2Id) {
        const nextRoundMatch = newPlayoffMatches.find(m => 
          m.round === match.round - 1 && Math.ceil(match.matchNumber / 2) === m.matchNumber
        );
        
        // 次のラウンドがあり、進出先の位置が空いている場合のみ進出させる
        if (nextRoundMatch) {
          const position = match.matchNumber % 2 !== 0 ? 'team1Id' : 'team2Id';
          
          // 既に他の試合から進出してきた場合は上書きしない
          // また、TBDチームがある場合も上書きしない
          const isTBDNextTeam = nextRoundMatch[position] && nextRoundMatch[position].startsWith('tbd_');
          if (!nextRoundMatch[position] || (nextRoundMatch[position] && !isTBDNextTeam)) {
            nextRoundMatch[position] = match.winnerId;
          }
        }
      }
    });
    
    // 3. 3位決定戦の処理
    const semifinalMatches = newPlayoffMatches.filter(m => 
      m.round === 2 && m.winnerId && 
      !m.team1Id?.startsWith('tbd_') && !m.team2Id?.startsWith('tbd_') // TBDチームを含まない準決勝のみ
    );
    
    const thirdPlaceMatch = newPlayoffMatches.find(m => 
      m.matchNumber === 0 || m.id.includes('third_place')
    );
    
    if (semifinalMatches.length > 0 && thirdPlaceMatch) {
      const losers = semifinalMatches.map(match => {
        // TBDチームを含む試合からは敗者を取得しない
        if (match.team1Id?.startsWith('tbd_') || match.team2Id?.startsWith('tbd_')) {
          return null;
        }
        return match.team1Id === match.winnerId ? match.team2Id : match.team1Id;
      }).filter((id): id is string => Boolean(id)); // nullを除外して文字列型だけに絞り込む
      
      // 空いている位置にのみ敗者を配置
      if (!thirdPlaceMatch.team1Id && losers.length > 0) {
        thirdPlaceMatch.team1Id = losers[0];
      }
      
      if (!thirdPlaceMatch.team2Id && losers.length > 1) {
        thirdPlaceMatch.team2Id = losers[1];
      }
    }
    
    return newPlayoffMatches;
  }
}
