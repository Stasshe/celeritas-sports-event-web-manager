import * as ExcelJS from 'exceljs';
import { Sport, Match, Team } from '../../types';

/**
 * リーグ戦データをExcelワークシートにエクスポート
 */
export const exportLeague = async (
  sheet: ExcelJS.Worksheet,
  sport: Sport
): Promise<void> => {
  try {
    // タイトルと基本情報の設定
    sheet.mergeCells('A1:G1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `${sport.name} - リーグ戦`;
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center' };
    
    // 説明があれば追加
    if (sport.description) {
      sheet.mergeCells('A2:G2');
      const descCell = sheet.getCell('A2');
      descCell.value = sport.description;
      descCell.alignment = { horizontal: 'center' };
    }
    
    // 設定情報の追加
    sheet.mergeCells('A3:G3');
    const settingsCell = sheet.getCell('A3');
    settingsCell.value = `ブロック数: ${sport.leagueSettings.blockCount}, 進出チーム数: ${sport.leagueSettings.advancingTeams}, プレーオフ: ${sport.leagueSettings.hasPlayoff ? 'あり' : 'なし'}, 3位決定戦: ${sport.leagueSettings.hasThirdPlaceMatch ? 'あり' : 'なし'}`;
    settingsCell.alignment = { horizontal: 'center' };
    settingsCell.font = { italic: true };
    
    // 表の前にスペースを追加
    sheet.addRow(['']);
    let currentRow = 5;
    
    // チームをブロックごとにグループ化
    const teams = sport.teams && Array.isArray(sport.teams) ? sport.teams : [];
    const blocks: Record<string, Team[]> = {};
    
    // すべてのブロックIDを取得（マッチからも収集）
    const allBlockIds = new Set<string>();
    
    // チームからブロックIDを収集
    teams.forEach(team => {
      if (team.blockId) {
        allBlockIds.add(team.blockId);
      }
    });
    
    // マッチからもブロックIDを収集（リーグ戦ラウンドのみ）
    if (sport.matches && Array.isArray(sport.matches)) {
      sport.matches
        .filter(m => m.round <= 1) // リーグ戦ラウンドのみ
        .forEach(match => {
          if (match.blockId) {
            allBlockIds.add(match.blockId);
          }
        });
    }
    
    // ブロックIDがない場合はデフォルトブロックを使用
    if (allBlockIds.size === 0) {
      allBlockIds.add('default');
    }
    
    console.log("全ブロックID: ", Array.from(allBlockIds));
    
    // チームをブロックIDでグループ化（各ブロックに対応するチームを収集）
    teams.forEach(team => {
      const blockId = team.blockId || 'default';
      if (!blocks[blockId]) {
        blocks[blockId] = [];
      }
      blocks[blockId].push(team);
    });
    
    // マッチからチームのブロック所属を補完
    if (sport.matches && Array.isArray(sport.matches)) {
      sport.matches
        .filter(m => m.round <= 1 && m.blockId) // リーグ戦のブロック指定がある試合のみ
        .forEach(match => {
          if (!match.blockId) return;
          
          // チームがまだそのブロックに属していない場合、チームを追加
          const team1 = teams.find(t => t.id === match.team1Id);
          const team2 = teams.find(t => t.id === match.team2Id);
          
          if (team1 && !team1.blockId) {
            if (!blocks[match.blockId]) {
              blocks[match.blockId] = [];
            }
            if (!blocks[match.blockId].some(t => t.id === team1.id)) {
              blocks[match.blockId].push(team1);
            }
          }
          
          if (team2 && !team2.blockId) {
            if (!blocks[match.blockId]) {
              blocks[match.blockId] = [];
            }
            if (!blocks[match.blockId].some(t => t.id === team2.id)) {
              blocks[match.blockId].push(team2);
            }
          }
        });
    }

    // マッチをブロックごとにグループ化（リーグ戦のマッチのみ）
    const matches = sport.matches && Array.isArray(sport.matches) ? sport.matches : [];
    const matchesByBlock: Record<string, Match[]> = {};
    
    // まず全てのブロックIDに空の配列を初期化
    allBlockIds.forEach(blockId => {
      matchesByBlock[blockId] = [];
    });
    
    // リーグ戦マッチだけをブロックに割り当て (round <= 1)
    matches.filter(m => m.round <= 1).forEach(match => {
      // マッチにブロックIDがあるか確認
      const blockId = match.blockId || 'default';
      
      // matchesByBlockにブロックIDがなければ作成（念のため）
      if (!matchesByBlock[blockId]) {
        matchesByBlock[blockId] = [];
      }
      
      // マッチをブロックに追加
      matchesByBlock[blockId].push(match);
    });
    
    // デバッグ情報を出力
    console.log("Blocks:", Object.keys(blocks));
    console.log("MatchesByBlock:", Object.keys(matchesByBlock));
    Object.entries(matchesByBlock).forEach(([blockId, matches]) => {
      console.log(`Block ${blockId} matches:`, matches.length);
    });
    
    // 各ブロックの詳細をログ
    Object.entries(blocks).forEach(([blockId, blockTeams]) => {
      console.log(`Block ${blockId} teams:`, blockTeams.map(t => t.name).join(', '));
    });
    
    // 空のブロックを除去
    const validBlockIds = Array.from(allBlockIds).filter(blockId => 
      blocks[blockId]?.length > 0 && matchesByBlock[blockId]?.length > 0
    );
    
    // ブロックごとに表を作成（各ブロックが独立したセクションに）
    for (const blockId of validBlockIds) {
      // 対応するブロックのチームと試合が存在するか確認
      const blockTeams = blocks[blockId] || [];
      const blockMatches = matchesByBlock[blockId] || [];
      
      if (blockTeams.length === 0) {
        console.log(`Skipping block ${blockId} - no teams found`);
        continue; // チームがないブロックはスキップ
      }
      
      console.log(`Processing block ${blockId} with ${blockTeams.length} teams and ${blockMatches.length} matches`);
      
      // 各ブロックのヘッダー
      sheet.mergeCells(`A${currentRow}:H${currentRow}`);
      const blockHeaderCell = sheet.getCell(`A${currentRow}`);
      blockHeaderCell.value = `ブロック ${blockId}`;
      blockHeaderCell.font = { bold: true, size: 16 };
      blockHeaderCell.alignment = { horizontal: 'center' };
      blockHeaderCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFEEEEEE' }
      };
      currentRow += 2;
      
      // 1. ブロックごとの順位表作成
      currentRow = addBlockStandingsTable(sheet, sport, currentRow, blockId, blockTeams);
      
      // スペースを追加
      sheet.addRow(['']);
      currentRow += 2;
      
      // 2. ブロックごとの対戦表の作成
      currentRow = addBlockCrossTable(sheet, sport, currentRow, blockId, blockTeams, blockMatches);
      
      // スペースを追加
      sheet.addRow(['']);
      currentRow += 2;
      
      // 3. ブロックごとの試合結果表の作成
      currentRow = addBlockMatchesTable(sheet, sport, currentRow, blockId, blockMatches);
      
      // ブロック間の区切り
      sheet.addRow(['']);
      sheet.addRow(['']);
      currentRow += 3;
    }
    
    // 4. プレーオフ表の作成（該当する場合）
    if (sport.leagueSettings?.hasPlayoff && sport.matches && Array.isArray(sport.matches)) {
      // プレーオフマッチのみをフィルタリング（通常round > 1はプレーオフ）
      const playoffMatches = sport.matches.filter(m => m.round > 1);
      
      console.log(`Found ${playoffMatches.length} playoff matches`);
      
      if (playoffMatches.length > 0) {
        // プレーオフヘッダー
        sheet.mergeCells(`A${currentRow}:H${currentRow}`);
        const playoffHeaderCell = sheet.getCell(`A${currentRow}`);
        playoffHeaderCell.value = 'プレーオフステージ';
        playoffHeaderCell.font = { bold: true, size: 16 };
        playoffHeaderCell.alignment = { horizontal: 'center' };
        playoffHeaderCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFEEEEEE' }
        };
        currentRow += 2;
        
        // トーナメント形式でプレーオフを表示
        currentRow = addPlayoffBracket(sheet, sport, playoffMatches, currentRow);
        
        // スペースを追加
        sheet.addRow(['']);
        currentRow += 2;
        
        // 5. 最終順位表の作成
        currentRow = addFinalStandings(sheet, sport, playoffMatches, currentRow);
      }
    }
    
    // 列幅の設定
    sheet.getColumn(1).width = 25;
    sheet.getColumn(2).width = 10;
    sheet.getColumn(3).width = 10;
    sheet.getColumn(4).width = 10;
    sheet.getColumn(5).width = 10;
    sheet.getColumn(6).width = 12;
    sheet.getColumn(7).width = 12;
    sheet.getColumn(8).width = 12;
    
    return;
  } catch (error) {
    console.error('リーグ戦データのエクスポートエラー:', error);
    throw error;
  }
};

/**
 * 特定ブロックの順位表をワークシートに追加
 */
const addBlockStandingsTable = (
  sheet: ExcelJS.Worksheet,
  sport: Sport,
  startRow: number,
  blockId: string,
  blockTeams: Team[]
): number => {
  // ヘッダーを追加
  sheet.mergeCells(`A${startRow}:H${startRow}`);
  const headerCell = sheet.getCell(`A${startRow}`);
  headerCell.value = '順位表';
  headerCell.font = { bold: true, size: 14 };
  headerCell.alignment = { horizontal: 'center' };
  startRow++;
  
  // 列ヘッダーを追加
  const standingsHeader = sheet.addRow([
    'チーム', '試', '勝', '分', '負', '得点', '失点', '勝点'
  ]);
  standingsHeader.font = { bold: true };
  standingsHeader.eachCell((cell) => {
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
    cell.alignment = { horizontal: 'center' };
  });
  // チーム名は左寄せ
  standingsHeader.getCell(1).alignment = { horizontal: 'left' };
  startRow++;
  
  // 各チームの統計を計算
  const teamStats: Record<string, {
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
    points: number;
  }> = {};
  
  // 各チームの統計を初期化
  blockTeams.forEach(team => {
    teamStats[team.id] = {
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0
    };
  });
  
  // 試合結果を処理
  if (sport.matches && Array.isArray(sport.matches)) {
    sport.matches.forEach(match => {
      // このブロックの試合のみ処理（blockIdの厳密な比較）
      const matchBlockId = match.blockId || 'default';
      if (matchBlockId === blockId && match.team1Score !== undefined && match.team2Score !== undefined) {
        // チーム1の統計更新
        if (teamStats[match.team1Id]) {
          teamStats[match.team1Id].played++;
          teamStats[match.team1Id].goalsFor += match.team1Score;
          teamStats[match.team1Id].goalsAgainst += match.team2Score;
          
          if (match.team1Score > match.team2Score) {
            teamStats[match.team1Id].won++;
            teamStats[match.team1Id].points += 3;
          } else if (match.team1Score < match.team2Score) {
            teamStats[match.team1Id].lost++;
          } else {
            // 引き分け
            teamStats[match.team1Id].drawn++;
            teamStats[match.team1Id].points++;
          }
        }
        
        // チーム2の統計更新
        if (teamStats[match.team2Id]) {
          teamStats[match.team2Id].played++;
          teamStats[match.team2Id].goalsFor += match.team2Score;
          teamStats[match.team2Id].goalsAgainst += match.team1Score;
          
          if (match.team2Score > match.team1Score) {
            teamStats[match.team2Id].won++;
            teamStats[match.team2Id].points += 3;
          } else if (match.team2Score < match.team1Score) {
            teamStats[match.team2Id].lost++;
          } else {
            // 引き分け
            teamStats[match.team2Id].drawn++;
            teamStats[match.team2Id].points++;
          }
        }
      }
    });
  }
  
  // チームを勝点、ゴール差などでソート
  const sortedTeams = [...blockTeams].sort((a, b) => {
    // 勝点を比較
    const pointsDiff = teamStats[b.id].points - teamStats[a.id].points;
    if (pointsDiff !== 0) return pointsDiff;
    
    // 勝点が同じ場合、ゴール差を比較
    const aGoalDiff = teamStats[a.id].goalsFor - teamStats[a.id].goalsAgainst;
    const bGoalDiff = teamStats[b.id].goalsFor - teamStats[b.id].goalsAgainst;
    const goalDiff = bGoalDiff - aGoalDiff;
    if (goalDiff !== 0) return goalDiff;
    
    // ゴール差が同じ場合、得点数を比較
    const goalsScoredDiff = teamStats[b.id].goalsFor - teamStats[a.id].goalsFor;
    if (goalsScoredDiff !== 0) return goalsScoredDiff;
    
    // すべて同じ場合、アルファベット順でソート
    return a.name.localeCompare(b.name);
  });
  
  // チーム行を追加
  sortedTeams.forEach((team, index) => {
    const stats = teamStats[team.id];
    const row = sheet.addRow([
      team.name,
      stats.played.toString(),
      stats.won.toString(),
      stats.drawn.toString(),
      stats.lost.toString(),
      stats.goalsFor.toString(),
      stats.goalsAgainst.toString(),
      stats.points.toString()
    ]);
    
    // 行のスタイル設定
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      cell.alignment = { horizontal: 'center' };
    });
    // チーム名は左寄せ
    row.getCell(1).alignment = { horizontal: 'left' };
    
    // 上位チームをハイライト（進出チーム）
    if (index < sport.leagueSettings.advancingTeams) {
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFDDFFDD' }
        };
      });
    }
    
    startRow++;
  });
  
  return startRow;
};

/**
 * 特定ブロックの対戦表をワークシートに追加
 */
const addBlockCrossTable = (
  sheet: ExcelJS.Worksheet,
  sport: Sport,
  startRow: number,
  blockId: string,
  blockTeams: Team[],
  blockMatches: Match[]
): number => {
  // ヘッダーを追加
  sheet.mergeCells(`A${startRow}:${getColumnLetter(blockTeams.length + 1)}${startRow}`);
  const headerCell = sheet.getCell(`A${startRow}`);
  headerCell.value = '対戦表';
  headerCell.font = { bold: true, size: 14 };
  headerCell.alignment = { horizontal: 'center' };
  startRow++;
  
  // 左上の空セル
  const headerRow = sheet.getRow(startRow);
  headerRow.getCell(1).value = '';
  headerRow.getCell(1).border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };
  
  // 上部行にチーム名を追加
  blockTeams.forEach((team, index) => {
    const cell = headerRow.getCell(index + 2);
    cell.value = team.name;
    cell.font = { bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
    // 列幅を設定
    sheet.getColumn(index + 2).width = 15;
  });
  startRow++;
  
  // 対戦表のマトリックスを準備
  const matrix: Record<string, Record<string, string>> = {};
  
  blockTeams.forEach(team => {
    matrix[team.id] = {};
    blockTeams.forEach(opponent => {
      // 同じチームとの対戦は「-」
      matrix[team.id][opponent.id] = team.id === opponent.id ? '-' : '';
    });
  });
  
  // 試合結果をマトリックスに記入
  console.log(`Processing ${blockMatches.length} matches for block ${blockId}`);
  blockMatches.forEach(match => {
    console.log(`Match: ${match.id}, Team1: ${match.team1Id}, Team2: ${match.team2Id}, Score: ${match.team1Score}-${match.team2Score}, BlockId: ${match.blockId || 'not set'}`);
    
    // teamIdが実際にこのブロック内に存在するか確認
    const team1Exists = blockTeams.some(team => team.id === match.team1Id);
    const team2Exists = blockTeams.some(team => team.id === match.team2Id);
    
    if (!team1Exists || !team2Exists) {
      console.log(`Skipping match ${match.id} as teams are not in this block`);
      return;
    }
    
    if (match.team1Score !== undefined && match.team2Score !== undefined) {
      // チーム1から見た結果
      if (matrix[match.team1Id]) {
        matrix[match.team1Id][match.team2Id] = `${match.team1Score}-${match.team2Score}`;
      }
      // チーム2から見た結果
      if (matrix[match.team2Id]) {
        matrix[match.team2Id][match.team1Id] = `${match.team2Score}-${match.team1Score}`;
      }
    }
  });
  
  // チーム行を追加
  blockTeams.forEach((team, rowIndex) => {
    const row = sheet.addRow([team.name]);
    row.getCell(1).font = { bold: true };
    row.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
    row.getCell(1).border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
    
    // 各対戦相手との結果を追加
    blockTeams.forEach((opponent, colIndex) => {
      const cell = row.getCell(colIndex + 2);
      const result = matrix[team.id]?.[opponent.id] || '';
      cell.value = result;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      
      // 勝敗に応じたハイライト
      if (result !== '-' && result !== '') {
        // 「自チーム得点-相手チーム得点」を分解
        const [teamScore, opponentScore] = result.split('-').map(Number);
        
        if (teamScore > opponentScore) {
          // 勝利：緑色
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFDDFFDD' }
          };
          cell.font = { bold: true };
        } else if (teamScore < opponentScore) {
          // 敗北：薄赤色
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFDDDD' }
          };
        } else if (teamScore === opponentScore) {
          // 引き分け：薄青色
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFEEEEFF' }
          };
        }
      }
    });
    
    startRow++;
  });
  
  return startRow;
};

/**
 * 特定ブロックの試合結果表をワークシートに追加
 */
const addBlockMatchesTable = (
  sheet: ExcelJS.Worksheet,
  sport: Sport,
  startRow: number,
  blockId: string,
  blockMatches: Match[]
): number => {
  // ヘッダーを追加
  sheet.mergeCells(`A${startRow}:F${startRow}`);
  const headerCell = sheet.getCell(`A${startRow}`);
  headerCell.value = '試合結果';
  headerCell.font = { bold: true, size: 14 };
  headerCell.alignment = { horizontal: 'center' };
  startRow++;
  
  // 列ヘッダーを追加
  const matchesHeader = sheet.addRow([
    '試合番号', 'チーム1', 'スコア', 'チーム2', '日付', '状態'
  ]);
  matchesHeader.font = { bold: true };
  matchesHeader.eachCell((cell) => {
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
    cell.alignment = { horizontal: 'center' };
  });
  startRow++;
  
  // ブロック内の試合をソート
  const sortedMatches = [...blockMatches].sort((a, b) => a.matchNumber - b.matchNumber);
  
  // 対象ブロックの試合がない場合のメッセージ
  if (sortedMatches.length === 0) {
    const row = sheet.addRow(['このブロックの試合情報はありません']);
    row.getCell(1).font = { italic: true };
    sheet.mergeCells(`A${startRow}:F${startRow}`);
    startRow++;
    return startRow;
  }
  
  // 試合行を追加
  sortedMatches.forEach(match => {
    // チーム名を取得
    const team1 = sport.teams.find(t => t.id === match.team1Id)?.name || match.team1Id;
    const team2 = sport.teams.find(t => t.id === match.team2Id)?.name || match.team2Id;
    
    // 日付をフォーマット
    const matchDate = match.date ? new Date(match.date).toLocaleDateString() : '-';
    
    // スコア表示（undefined/nullチェック）
    const scoreDisplay = (match.team1Score !== undefined && match.team2Score !== undefined) 
      ? `${match.team1Score} - ${match.team2Score}`
      : 'vs';
    
    // 試合行を追加
    const row = sheet.addRow([
      match.matchNumber.toString(),
      team1,
      scoreDisplay,
      team2,
      matchDate,
      match.status === 'completed' ? '完了' : match.status === 'inProgress' ? '進行中' : '予定'
    ]);
    
    // 行のスタイル設定
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      cell.alignment = { horizontal: 'center' };
    });
    
    // チーム名は左寄せ
    row.getCell(2).alignment = { horizontal: 'left' };
    row.getCell(4).alignment = { horizontal: 'left' };
    
    // 完了した試合は勝者をハイライト
    if (match.status === 'completed' && match.team1Score !== undefined && match.team2Score !== undefined) {
      const team1Cell = row.getCell(2);
      const team2Cell = row.getCell(4);
      
      if (match.team1Score > match.team2Score) {
        team1Cell.font = { bold: true };
        team1Cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFDDFFDD' }
        };
      } else if (match.team2Score > match.team1Score) {
        team2Cell.font = { bold: true };
        team2Cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFDDFFDD' }
        };
      } else {
        // 引き分けの場合は両方薄い色でハイライト
        team1Cell.fill = team2Cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFEEEEFF' }
        };
      }
    }
    
    startRow++;
  });
  
  return startRow;
};

/**
 * プレーオフブラケットをトーナメント形式でワークシートに追加
 */
const addPlayoffBracket = (
  sheet: ExcelJS.Worksheet,
  sport: Sport,
  playoffMatches: Match[],
  startRow: number
): number => {
  // ラウンドごとにマッチを整理
  const matchesByRound: Record<number, Match[]> = {};
  playoffMatches.forEach(match => {
    if (!matchesByRound[match.round]) {
      matchesByRound[match.round] = [];
    }
    matchesByRound[match.round].push(match);
  });
  
  // 合計ラウンド数を取得
  const rounds = Object.keys(matchesByRound).map(Number).sort((a, b) => a - b);
  
  // デバッグログ - プレーオフのマッチ情報を出力
  console.log('Playoff matches:', playoffMatches);
  
  // すべてのチーム情報をIDで索引付けして高速アクセスできるようにする
  const teamMap: Record<string, Team> = {};
  if (sport.teams && Array.isArray(sport.teams)) {
    sport.teams.forEach(team => {
      teamMap[team.id] = team;
    });
  }
  
  // デバッグ: チームIDリストを出力
  console.log('Available team IDs:', Object.keys(teamMap));
  
  // ラウンドヘッダーを追加
  const headerRow = sheet.getRow(startRow++);
  rounds.forEach((round, index) => {
    // 各ラウンドヘッダーの位置を調整（中央に配置）
    const col = index * 4 + 1;
    const headerCell = headerRow.getCell(col);
    
    // ラウンド名を決定（決勝、準決勝など）
    let roundName = `ラウンド ${round}`;
    const maxRound = Math.max(...rounds);
    
    if (round === maxRound) {
      roundName = '決勝';
    } else if (round === maxRound - 1) {
      roundName = '準決勝';
    } else if (round === maxRound - 2) {
      roundName = '準々決勝';
    }
    
    headerCell.value = roundName;
    headerCell.font = { bold: true };
    headerCell.alignment = { horizontal: 'center' };
    // ヘッダーセルを結合
    sheet.mergeCells(startRow - 1, col, startRow - 1, col + 2);
  });
  
  // ラウンド間にスペースを追加
  startRow++;
  
  // 各チームの行間隔の初期値を設定
  const initialRowsPerTeam = 3; // 各チームに割り当てる行数（余裕を持たせる）
  
  // 基本的なセルスタイル
  const matchStyle = {
    type: 'pattern' as const,
    pattern: 'solid' as const,
    fgColor: { argb: 'FFFFFFFF' }
  };
  
  const connectingLineStyle = {
    type: 'pattern' as const,
    pattern: 'solid' as const,
    fgColor: { argb: 'FFD0D0D0' }
  };
  
  const winnerStyle = {
    type: 'pattern' as const,
    pattern: 'solid' as const,
    fgColor: { argb: 'FFDDFFDD' }
  };
  
  // 各ラウンドごとのマッチ間隔を計算
  const spacingMultipliers: number[] = [];
  for (let i = 0; i < rounds.length; i++) {
    spacingMultipliers.push(Math.pow(2, i));
  }
  
  // すべてのラウンドにおけるマッチの位置を事前計算
  const matchPositions: Record<number, number[]> = {};
  
  rounds.forEach((round, roundIndex) => {
    const matches = matchesByRound[round] || [];
    matchPositions[round] = [];
    
    const spacing = spacingMultipliers[roundIndex] * initialRowsPerTeam * 2;
    
    for (let i = 0; i < matches.length; i++) {
      // 各マッチの中央行を計算
      const matchCenterRow = startRow + i * spacing + Math.floor(spacing / 2);
      matchPositions[round].push(matchCenterRow);
    }
  });
  
  // 各ラウンドを処理
  for (let roundIndex = 0; roundIndex < rounds.length; roundIndex++) {
    const round = rounds[roundIndex];
    const matches = matchesByRound[round] || [];
    const col = roundIndex * 4 + 1; // 列間隔を広げる
    
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const matchCenterRow = matchPositions[round][i];
      
      // チーム名を取得 - 修正: チームマップを使用して直接アクセス
      let team1 = 'TBD';
      let team2 = 'TBD';
      
      if (match.team1Id && teamMap[match.team1Id]) {
        team1 = teamMap[match.team1Id].name;
      } else if (match.team1Id) {
        team1 = `ID: ${match.team1Id}`;
        console.log(`Team with ID ${match.team1Id} not found in teams list`);
      }
      
      if (match.team2Id && teamMap[match.team2Id]) {
        team2 = teamMap[match.team2Id].name;
      } else if (match.team2Id) {
        team2 = `ID: ${match.team2Id}`;
        console.log(`Team with ID ${match.team2Id} not found in teams list`);
      }
      
      // デバッグログ - 各マッチのチーム情報を詳細表示
      console.log(`Match ${match.id}:`);
      console.log(`- Team1: ID=${match.team1Id}, Name=${team1}`);
      console.log(`- Team2: ID=${match.team2Id}, Name=${team2}`);
      
      // チーム1のセル
      const team1Cell = sheet.getCell(matchCenterRow - 1, col);
      team1Cell.value = team1;
      team1Cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      team1Cell.alignment = { vertical: 'middle', horizontal: 'center' };
      
      // チーム2のセル
      const team2Cell = sheet.getCell(matchCenterRow + 1, col);
      team2Cell.value = team2;
      team2Cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      team2Cell.alignment = { vertical: 'middle', horizontal: 'center' };
      
      // スコアセル（チーム間）
      const scoreCell = sheet.getCell(matchCenterRow, col);
      if (match.status === 'completed') {
        scoreCell.value = `${match.team1Score} - ${match.team2Score}`;
        // 勝者ハイライト
        if (match.team1Score > match.team2Score) {
          team1Cell.fill = winnerStyle;
          team1Cell.font = { bold: true };
        } else if (match.team2Score > match.team1Score) {
          team2Cell.fill = winnerStyle;
          team2Cell.font = { bold: true };
        }
      } else {
        // 修正: 試合状態に応じて表示を変更
        scoreCell.value = match.status === 'scheduled' ? 'vs' : '進行中';
      }
      scoreCell.alignment = { horizontal: 'center', vertical: 'middle' };
      scoreCell.border = {
        left: { style: 'thin' },
        right: { style: 'thin' }
      };
      
      // コネクション線を描画（次のラウンドへ）
      if (roundIndex < rounds.length - 1) {
        // 横線（次のラウンドへの接続）
        const hLineCell = sheet.getCell(matchCenterRow, col + 1);
        hLineCell.fill = connectingLineStyle;
        
        // このマッチが次のラウンドのどのマッチに接続するか計算
        const nextRoundMatchIndex = Math.floor(i / 2);
        
        if (nextRoundMatchIndex < matchPositions[rounds[roundIndex + 1]].length) {
          const nextMatchCenterRow = matchPositions[rounds[roundIndex + 1]][nextRoundMatchIndex];
          
          // 縦線の描画（上または下に伸ばす）
          const vStart = matchCenterRow;
          const vEnd = nextMatchCenterRow;
          
          // 縦線のための列（連結ポイント）
          const vCol = col + 2;
          
          // 縦線を描画
          if (vStart !== vEnd) {
            const minRow = Math.min(vStart, vEnd);
            const maxRow = Math.max(vStart, vEnd);
            
            // 縦線のセルを塗りつぶし
            for (let vRow = minRow; vRow <= maxRow; vRow++) {
              const vLineCell = sheet.getCell(vRow, vCol);
              vLineCell.fill = connectingLineStyle;
            }
          }
          
          // 水平接続（縦線から次のマッチへ）
          const finalConnectCell = sheet.getCell(nextMatchCenterRow, vCol + 1);
          finalConnectCell.fill = connectingLineStyle;
        }
      }
    }
  }
  
  // 列幅の設定
  const maxRound = Math.max(...rounds);
  for (let i = 1; i <= maxRound * 4; i++) {
    if (i % 4 === 2 || i % 4 === 3) {
      // 接続線用の列は細く
      sheet.getColumn(i).width = 3;
    } else {
      // 通常の列
      sheet.getColumn(i).width = 25;
    }
  }
  
  // 3位決定戦があれば追加
  if (sport.leagueSettings?.hasThirdPlaceMatch) {
    const thirdPlaceRow = Math.max(...Object.values(matchPositions).flat()) + 5;
    sheet.mergeCells(`A${thirdPlaceRow}:C${thirdPlaceRow}`);
    const headerCell = sheet.getCell(`A${thirdPlaceRow}`);
    headerCell.value = '3位決定戦';
    headerCell.font = { bold: true };
    headerCell.alignment = { horizontal: 'center' };
    
    // 3位決定戦のマッチを探す
    const maxRound = Math.max(...rounds);
    const thirdPlaceMatch = playoffMatches.find(m => 
      m.round === maxRound && 
      m !== matchesByRound[maxRound][0]
    );
    
    if (thirdPlaceMatch) {
      // チーム名を取得 - 同様にチームマップを使用
      let team1 = 'TBD';
      let team2 = 'TBD';
      
      if (thirdPlaceMatch.team1Id && teamMap[thirdPlaceMatch.team1Id]) {
        team1 = teamMap[thirdPlaceMatch.team1Id].name;
      } else if (thirdPlaceMatch.team1Id) {
        team1 = `ID: ${thirdPlaceMatch.team1Id}`;
      }
      
      if (thirdPlaceMatch.team2Id && teamMap[thirdPlaceMatch.team2Id]) {
        team2 = teamMap[thirdPlaceMatch.team2Id].name;
      } else if (thirdPlaceMatch.team2Id) {
        team2 = `ID: ${thirdPlaceMatch.team2Id}`;
      }
      
      // デバッグログ - 3位決定戦のチーム情報
      console.log(`Third place match:`);
      console.log(`- Team1: ID=${thirdPlaceMatch.team1Id}, Name=${team1}`);
      console.log(`- Team2: ID=${thirdPlaceMatch.team2Id}, Name=${team2}`);
      
      // チーム1情報
      const team1Cell = sheet.getCell(thirdPlaceRow + 1, 1);
      team1Cell.value = team1;
      team1Cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
      team1Cell.alignment = { horizontal: 'center' };
      
      // スコア情報
      const scoreCell = sheet.getCell(thirdPlaceRow + 2, 1);
      scoreCell.value = thirdPlaceMatch.status === 'completed' 
        ? `${thirdPlaceMatch.team1Score} - ${thirdPlaceMatch.team2Score}`
        : 'vs';
      scoreCell.alignment = { horizontal: 'center' };
      scoreCell.border = { left: { style: 'thin' }, right: { style: 'thin' } };
      
      // チーム2情報
      const team2Cell = sheet.getCell(thirdPlaceRow + 3, 1);
      team2Cell.value = team2;
      team2Cell.border = { bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
      team2Cell.alignment = { horizontal: 'center' };
      
      // 勝者をハイライト
      if (thirdPlaceMatch.status === 'completed') {
        if (thirdPlaceMatch.team1Score > thirdPlaceMatch.team2Score) {
          team1Cell.fill = winnerStyle;
          team1Cell.font = { bold: true };
        } else if (thirdPlaceMatch.team2Score > thirdPlaceMatch.team1Score) {
          team2Cell.fill = winnerStyle;
          team2Cell.font = { bold: true };
        }
      }
      
      startRow = thirdPlaceRow + 4;
    }
  }
  
  return Math.max(startRow, sheet.rowCount + 1);
};

/**
 * 最終順位表をワークシートに追加
 */
const addFinalStandings = (
  sheet: ExcelJS.Worksheet,
  sport: Sport,
  playoffMatches: Match[],
  startRow: number
): number => {
  // ヘッダーを追加
  sheet.mergeCells(`A${startRow}:C${startRow}`);
  const headerCell = sheet.getCell(`A${startRow}`);
  headerCell.value = '最終順位';
  headerCell.font = { bold: true, size: 14 };
  headerCell.alignment = { horizontal: 'center' };
  startRow++;
  
  // 列ヘッダーを追加
  const standingsHeader = sheet.addRow([
    '順位', 'チーム', '備考'
  ]);
  standingsHeader.font = { bold: true };
  standingsHeader.eachCell((cell) => {
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
    cell.alignment = { horizontal: 'center' };
  });
  startRow++;
  
  // 最終順位の初期化
  const standings: { position: number; teamId: string; note: string }[] = [];
  
  // チームマップを作成
  const teamMap: Record<string, Team> = {};
  if (sport.teams && Array.isArray(sport.teams)) {
    sport.teams.forEach(team => {
      teamMap[team.id] = team;
    });
  }
  
  // 最終ラウンドを特定
  const maxRound = Math.max(...playoffMatches.map(m => m.round));
  
  // 決勝戦と3位決定戦を探す
  const finalMatches = playoffMatches.filter(m => 
    m.round === maxRound && 
    m.status === 'completed'
  );
  
  // 決勝戦と3位決定戦の処理
  if (finalMatches.length > 0) {
    // 決勝戦を探す（通常は3位決定戦ではない方）
    const finalMatch = finalMatches.find(m => 
      !sport.leagueSettings.hasThirdPlaceMatch || 
      m.matchNumber !== Math.max(...playoffMatches.map(m => m.matchNumber))
    );
    
    // デバッグ情報を追加
    if (finalMatch) {
      console.log(`Final match: ${finalMatch.id}, Team1: ${finalMatch.team1Id}, Team2: ${finalMatch.team2Id}, Winner: ${finalMatch.winnerId}`);
    }
    
    // 3位決定戦を探す
    const thirdPlaceMatch = sport.leagueSettings.hasThirdPlaceMatch 
      ? finalMatches.find(m => m !== finalMatch) 
      : undefined;
    
    if (finalMatch?.winnerId) {
      // 1位：決勝戦の勝者
      standings.push({
        position: 1, 
        teamId: finalMatch.winnerId,
        note: '優勝'
      });
      
      // 2位：決勝戦の敗者
      const secondPlaceTeamId = finalMatch.team1Id === finalMatch.winnerId 
        ? finalMatch.team2Id 
        : finalMatch.team1Id;
        
      standings.push({
        position: 2, 
        teamId: secondPlaceTeamId,
        note: '準優勝'
      });
    }
    
    // 3位と4位の追加
    if (thirdPlaceMatch?.winnerId) {
      // 3位：3位決定戦の勝者
      standings.push({
        position: 3, 
        teamId: thirdPlaceMatch.winnerId,
        note: '3位'
      });
      
      // 4位：3位決定戦の敗者
      const fourthPlaceTeamId = thirdPlaceMatch.team1Id === thirdPlaceMatch.winnerId 
        ? thirdPlaceMatch.team2Id 
        : thirdPlaceMatch.team1Id;
        
      standings.push({
        position: 4, 
        teamId: fourthPlaceTeamId,
        note: '4位'
      });
    }
  }
  
  // 順位順に並べ替え
  standings.sort((a, b) => a.position - b.position);
  
  // 各順位の行を追加
  standings.forEach((standing) => {
    // チームマップから直接チームを取得
    const team = teamMap[standing.teamId];
    
    // デバッグ情報を追加
    console.log(`Standing position ${standing.position}: Team ID ${standing.teamId}, Found: ${team ? 'Yes' : 'No'}`);
    
    if (!team) {
      console.log(`Team with ID ${standing.teamId} not found in team map, keys: ${Object.keys(teamMap).join(', ')}`);
      return;
    }
    
    const row = sheet.addRow([
      standing.position.toString(),
      team.name,
      standing.note
    ]);
    
    // 行のスタイル設定
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
    
    // 位置と備考は中央寄せ
    row.getCell(1).alignment = { horizontal: 'center' };
    row.getCell(3).alignment = { horizontal: 'center' };
    
    // メダル色の設定
    if (standing.position <= 3) {
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { 
            argb: standing.position === 1 
              ? 'FFFFD700' // Gold
              : standing.position === 2 
                ? 'FFC0C0C0' // Silver
                : 'FFCD7F32' // Bronze
          }
        };
      });
    }
    
    startRow++;
  });
  
  // 列幅の設定
  sheet.getColumn(1).width = 10;
  sheet.getColumn(2).width = 25;
  sheet.getColumn(3).width = 20;
  
  return startRow;
};

/**
 * 数値から列名（A, B, C, ...）を取得するユーティリティ関数
 */
const getColumnLetter = (column: number): string => {
  let letter = '';
  while (column > 0) {
    const remainder = (column - 1) % 26;
    letter = String.fromCharCode(65 + remainder) + letter;
    column = Math.floor((column - 1) / 26);
  }
  return letter;
};