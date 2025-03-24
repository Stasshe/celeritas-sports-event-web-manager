import * as ExcelJS from 'exceljs';
import { Sport, Match, Team } from '../../types';
import { defaultRoundRobinSettings } from '../../types';

/**
 * 総当たり戦データをExcelワークシートにエクスポート
 */
export const exportRoundRobin = async (
  sheet: ExcelJS.Worksheet,
  sport: Sport
): Promise<void> => {
  try {
    // タイトルと基本情報の設定
    sheet.mergeCells('A1:G1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `${sport.name} - 総当たり戦`;
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
    const settings = { ...defaultRoundRobinSettings, ...sport.roundRobinSettings };
    sheet.mergeCells('A3:G3');
    const settingsCell = sheet.getCell('A3');
    settingsCell.value = `勝ち: ${settings.winPoints}点, 引き分け: ${settings.drawPoints}点, 負け: ${settings.losePoints}点`;
    settingsCell.alignment = { horizontal: 'center' };
    settingsCell.font = { italic: true };
    
    // 表の前にスペースを追加
    sheet.addRow(['']);
    let currentRow = 5;
    
    // 1. 順位表の作成
    currentRow = addStandingsTable(sheet, sport, currentRow, settings);
    
    // スペースを追加
    sheet.addRow(['']);
    currentRow += 2;
    
    // 2. 試合結果表の作成
    currentRow = addMatchResultsTable(sheet, sport, currentRow);
    
    // スペースを追加
    sheet.addRow(['']);
    currentRow += 2;
    
    // 3. 対戦表（相互対戦成績表）の作成
    currentRow = addCrossTable(sheet, sport, currentRow);
    
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
    console.error('総当たり戦データのエクスポートエラー:', error);
    throw error;
  }
};

/**
 * 順位表をワークシートに追加
 */
const addStandingsTable = (
  sheet: ExcelJS.Worksheet,
  sport: Sport,
  startRow: number,
  settings: any
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
  sport.teams.forEach(team => {
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
  
  // 完了した試合を処理して統計を更新
  if (sport.matches && Array.isArray(sport.matches)) {
    sport.matches.forEach(match => {
      if (match.status === 'completed') {
        // チーム1の統計更新
        if (teamStats[match.team1Id]) {
          teamStats[match.team1Id].played++;
          teamStats[match.team1Id].goalsFor += match.team1Score;
          teamStats[match.team1Id].goalsAgainst += match.team2Score;
          
          if (match.team1Score > match.team2Score) {
            teamStats[match.team1Id].won++;
            teamStats[match.team1Id].points += settings.winPoints;
          } else if (match.team1Score < match.team2Score) {
            teamStats[match.team1Id].lost++;
            if (settings.considerLosePoints) {
              teamStats[match.team1Id].points += settings.losePoints;
            }
          } else {
            // 引き分け
            teamStats[match.team1Id].drawn++;
            teamStats[match.team1Id].points += settings.drawPoints;
          }
        }
        
        // チーム2の統計更新
        if (teamStats[match.team2Id]) {
          teamStats[match.team2Id].played++;
          teamStats[match.team2Id].goalsFor += match.team2Score;
          teamStats[match.team2Id].goalsAgainst += match.team1Score;
          
          if (match.team2Score > match.team1Score) {
            teamStats[match.team2Id].won++;
            teamStats[match.team2Id].points += settings.winPoints;
          } else if (match.team2Score < match.team1Score) {
            teamStats[match.team2Id].lost++;
            if (settings.considerLosePoints) {
              teamStats[match.team2Id].points += settings.losePoints;
            }
          } else {
            // 引き分け
            teamStats[match.team2Id].drawn++;
            teamStats[match.team2Id].points += settings.drawPoints;
          }
        }
      }
    });
  }
  
  // チームを勝点、ゴール差などでソート
  const sortedTeams = [...sport.teams].sort((a, b) => {
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
    
    // 上位チームをハイライト
    if (index < 3) {
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: index === 0 ? 'FFFFD700' : index === 1 ? 'FFC0C0C0' : 'FFCD7F32' }
        };
      });
    }
    
    startRow++;
  });
  
  return startRow;
};

/**
 * 試合結果表をワークシートに追加
 */
const addMatchResultsTable = (
  sheet: ExcelJS.Worksheet,
  sport: Sport,
  startRow: number
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
  
  // ラウンド/節ごとに試合をグループ化
  const matches = sport.matches && Array.isArray(sport.matches) 
    ? [...sport.matches].sort((a, b) => a.matchNumber - b.matchNumber)
    : [];
  let currentMatchday = -1;
  
  matches.forEach(match => {
    // 新しい節かどうかをチェック
    if (match.round !== currentMatchday) {
      currentMatchday = match.round;
      
      // 節ヘッダーを追加
      sheet.mergeCells(`A${startRow}:F${startRow}`);
      const matchdayCell = sheet.getCell(`A${startRow}`);
      matchdayCell.value = `第${currentMatchday}節`;
      matchdayCell.font = { italic: true };
      matchdayCell.alignment = { horizontal: 'center' };
      matchdayCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF0F0F0' }
      };
      startRow++;
    }
    
    // チーム名を取得
    const team1 = sport.teams.find(t => t.id === match.team1Id)?.name || '不明';
    const team2 = sport.teams.find(t => t.id === match.team2Id)?.name || '不明';
    
    // 日付をフォーマット
    const matchDate = match.date ? new Date(match.date).toLocaleDateString() : '-';
    
    // 試合行を追加
    const row = sheet.addRow([
      match.matchNumber.toString(),
      team1,
      match.status === 'completed' ? `${match.team1Score} - ${match.team2Score}` : 'vs',
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
    if (match.status === 'completed') {
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
      } else if (match.team1Score === match.team2Score) {
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
 * 対戦表（相互対戦成績表）をワークシートに追加
 */
const addCrossTable = (
  sheet: ExcelJS.Worksheet,
  sport: Sport,
  startRow: number
): number => {
  const teams = sport.teams;
  
  // ヘッダーを追加
  sheet.mergeCells(`A${startRow}:${getColumnLetter(teams.length + 1)}${startRow}`);
  const headerCell = sheet.getCell(`A${startRow}`);
  headerCell.value = '対戦成績表';
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
  teams.forEach((team, index) => {
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
    
    // ヘッダー行を高くして、テキストを回転（見やすくするため）
    headerRow.height = 100;
    cell.alignment = { 
      horizontal: 'center', 
      vertical: 'bottom', 
      textRotation: 90 
    };
  });
  startRow++;
  
  // 相互対戦結果表のマトリックスを準備
  const matrix: Record<string, Record<string, string>> = {};
  
  teams.forEach(team => {
    matrix[team.id] = {};
    teams.forEach(opponent => {
      // 同じチームとの対戦は「-」
      matrix[team.id][opponent.id] = team.id === opponent.id ? '-' : '';
    });
  });
  
  // 試合結果をマトリックスに記入
  if (sport.matches && Array.isArray(sport.matches)) {
    sport.matches.forEach(match => {
      if (match.status === 'completed') {
        // チーム1から見た結果：「自分のスコア-相手のスコア」
        matrix[match.team1Id][match.team2Id] = `${match.team1Score}-${match.team2Score}`;
        // チーム2から見た結果：「自分のスコア-相手のスコア」
        matrix[match.team2Id][match.team1Id] = `${match.team2Score}-${match.team1Score}`;
      }
    });
  }
  
  // 各チームの行を追加
  teams.forEach((team, rowIndex) => {
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
    teams.forEach((opponent, colIndex) => {
      const cell = row.getCell(colIndex + 2);
      cell.value = matrix[team.id][opponent.id];
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      
      // 勝敗に応じたハイライト
      if (matrix[team.id][opponent.id] !== '-' && matrix[team.id][opponent.id] !== '') {
        // スコアを「自チーム得点-相手チーム得点」から数値に分解
        const [teamScore, opponentScore] = matrix[team.id][opponent.id].split('-').map(Number);
        
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

// 列番号をアルファベットに変換するヘルパー関数
const getColumnLetter = (column: number): string => {
  let letter = '';
  while (column > 0) {
    const remainder = (column - 1) % 26;
    letter = String.fromCharCode(65 + remainder) + letter;
    column = Math.floor((column - 1) / 26);
  }
  return letter;
};
