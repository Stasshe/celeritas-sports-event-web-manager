import * as ExcelJS from 'exceljs';
import { Sport, Match, Team } from '../../types';

/**
 * Excel ワークシートにトーナメントデータをエクスポート
 */
export const exportTournament = async (
  sheet: ExcelJS.Worksheet,
  sport: Sport
): Promise<void> => {
  try {
    // タイトルと基本情報の設定
    sheet.mergeCells('A1:G1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `${sport.name} - トーナメント`;
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center' };
    
    // トーナメントの説明を追加
    if (sport.description) {
      sheet.mergeCells('A2:G2');
      const descCell = sheet.getCell('A2');
      descCell.value = sport.description;
      descCell.alignment = { horizontal: 'center' };
    }
    
    // トーナメント設定を追加
    sheet.mergeCells('A3:G3');
    const settingsCell = sheet.getCell('A3');
    settingsCell.value = `3位決定戦: ${sport.tournamentSettings?.hasThirdPlaceMatch ? 'あり' : 'なし'}, 敗者復活: ${sport.tournamentSettings?.hasRepechage ? 'あり' : 'なし'}`;
    settingsCell.alignment = { horizontal: 'center' };
    settingsCell.font = { italic: true };
    
    // 表の前にスペースを追加
    sheet.addRow(['']);
    
    // matches配列が存在することを確認
    const matches = sport.matches && Array.isArray(sport.matches) ? sport.matches : [];
    
    // ラウンドごとにマッチを整理
    const matchesByRound: Record<number, Match[]> = {};
    matches.forEach(match => {
      if (!matchesByRound[match.round]) {
        matchesByRound[match.round] = [];
      }
      matchesByRound[match.round].push(match);
    });
    
    // 合計ラウンド数を取得
    const rounds = Object.keys(matchesByRound).map(Number).sort((a, b) => a - b);
    
    // シンプルなトーナメント構造の場合はビジュアル表現を使用
    if (rounds.length <= 4 && !sport.tournamentSettings?.hasRepechage) {
      await createImprovedVisualBracket(sheet, sport, matchesByRound, rounds);
    } else {
      // より複雑な場合はテーブル形式にフォールバック
      await createTournamentTable(sheet, sport, matchesByRound, rounds);
    }
    
    // 下部にチームリストを追加
    addTeamsList(sheet, sport);
    
    return;
  } catch (error) {
    console.error('トーナメントのエクスポートエラー:', error);
    throw error;
  }
};

/**
 * セルを使用した改良版のビジュアルブラケットを作成
 */
const createImprovedVisualBracket = async (
  sheet: ExcelJS.Worksheet,
  sport: Sport,
  matchesByRound: Record<number, Match[]>,
  rounds: number[]
): Promise<void> => {
  // ブラケットの開始行
  let startRow = 5;
  
  // レイアウトの計算
  const maxRound = Math.max(...rounds);
  
  // ラウンドヘッダーを追加
  const headerRow = sheet.getRow(startRow++);
  rounds.forEach((round, index) => {
    // 各ラウンドヘッダーの位置を調整（中央に配置）
    const col = index * 4 + 1;
    const headerCell = headerRow.getCell(col);
    
    // ラウンド名を決定（決勝、準決勝など）
    let roundName = `ラウンド ${round}`;
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
  
  // 最初のラウンドのチーム数に基づいて行数を計算
  const firstRoundMatches = matchesByRound[rounds[0]] || [];
  const totalTeams = firstRoundMatches.length * 2;
  
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
      
      // チーム名を取得
      const team1 = sport.teams.find(t => t.id === match.team1Id)?.name || 'TBD';
      const team2 = sport.teams.find(t => t.id === match.team2Id)?.name || 'TBD';
      
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
        scoreCell.value = 'vs';
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
          const verticalDirection = i % 2 === 0 ? 1 : -1; // 偶数インデックスは下へ、奇数は上へ
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
  if (sport.tournamentSettings?.hasThirdPlaceMatch) {
    const lastRow = sheet.rowCount + 5; // 十分なスペースを確保
    sheet.mergeCells(`A${lastRow}:C${lastRow}`);
    const headerCell = sheet.getCell(`A${lastRow}`);
    headerCell.value = '3位決定戦';
    headerCell.font = { bold: true };
    headerCell.alignment = { horizontal: 'center' };
    
    // 3位決定戦のマッチを探す
    const thirdPlaceMatch = sport.matches.find(m => 
      m.round === maxRound && 
      matchesByRound[maxRound] && 
      m !== matchesByRound[maxRound][0]
    );
    
    if (thirdPlaceMatch) {
      const team1 = sport.teams.find(t => t.id === thirdPlaceMatch.team1Id)?.name || 'TBD';
      const team2 = sport.teams.find(t => t.id === thirdPlaceMatch.team2Id)?.name || 'TBD';
      
      // チーム1情報
      const team1Cell = sheet.getCell(lastRow + 1, 1);
      team1Cell.value = team1;
      team1Cell.border = { left: { style: 'thin' }, top: { style: 'thin' }, bottom: { style: 'thin' } };
      team1Cell.alignment = { horizontal: 'center' };
      
      // スコア情報
      const scoreCell = sheet.getCell(lastRow + 2, 2);
      scoreCell.value = thirdPlaceMatch.status === 'completed' 
        ? `${thirdPlaceMatch.team1Score} - ${thirdPlaceMatch.team2Score}`
        : 'vs';
      scoreCell.alignment = { horizontal: 'center' };
      
      // チーム2情報
      const team2Cell = sheet.getCell(lastRow + 3, 1);
      team2Cell.value = team2;
      team2Cell.border = { left: { style: 'thin' }, top: { style: 'thin' }, bottom: { style: 'thin' } };
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
    }
  }
};

/**
 * トーナメントの簡易テーブル表現を作成
 */
const createTournamentTable = async (
  sheet: ExcelJS.Worksheet,
  sport: Sport,
  matchesByRound: Record<number, Match[]>,
  rounds: number[]
): Promise<void> => {
  // ヘッダーを追加
  const headerRow = sheet.addRow([
    'ラウンド', 'マッチ番号', 'チーム1', 'スコア', 'チーム2', '勝者', '状態'
  ]);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD3D3D3' }
  };
  
  // ヘッダー行のスタイル設定
  headerRow.eachCell((cell) => {
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });
  
  // 各マッチを追加
  for (const round of rounds) {
    const matches = matchesByRound[round] || [];
    
    for (const match of matches) {
      const team1 = sport.teams.find(t => t.id === match.team1Id)?.name || 'TBD';
      const team2 = sport.teams.find(t => t.id === match.team2Id)?.name || 'TBD';
      const winner = match.winnerId 
        ? sport.teams.find(t => t.id === match.winnerId)?.name 
        : '未定';
        
      // わかりやすいラウンド名を設定
      let roundName = `ラウンド ${round}`;
      const maxRound = Math.max(...rounds);
      
      if (round === maxRound) {
        roundName = '決勝';
      } else if (round === maxRound - 1) {
        roundName = '準決勝';
      } else if (round === maxRound - 2) {
        roundName = '準々決勝';
      }
      
      // 3位決定戦の場合
      if (sport.tournamentSettings?.hasThirdPlaceMatch && 
          round === maxRound && 
          match.matchNumber === Math.max(...sport.matches.map(m => m.matchNumber))) {
        roundName = '3位決定戦';
      }
      
      const row = sheet.addRow([
        roundName,
        match.matchNumber.toString(),
        team1,
        match.status === 'completed' ? `${match.team1Score} - ${match.team2Score}` : 'vs',
        team2,
        match.status === 'completed' ? winner : '-',
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
      });
      
      // マッチが完了している場合、勝者をハイライト
      if (match.status === 'completed') {
        const team1Cell = row.getCell(3);
        const team2Cell = row.getCell(5);
        
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
        }
      }
    }
  }
  
  // 列幅の設定
  sheet.getColumn(1).width = 12;
  sheet.getColumn(2).width = 10;
  sheet.getColumn(3).width = 25;
  sheet.getColumn(4).width = 15;
  sheet.getColumn(5).width = 25;
  sheet.getColumn(6).width = 20;
  sheet.getColumn(7).width = 15;
  
  // オートフィルタを追加
  sheet.autoFilter = {
    from: { row: 5, column: 1 },
    to: { row: 5, column: 7 }
  };
};

/**
 * シートの下部にチームリストを追加
 */
const addTeamsList = (
  sheet: ExcelJS.Worksheet,
  sport: Sport
): void => {
  // 最後の行を見つける
  let lastRow = sheet.rowCount + 2;
  
  // チームヘッダーを追加
  sheet.mergeCells(`A${lastRow}:C${lastRow}`);
  const headerCell = sheet.getCell(`A${lastRow}`);
  headerCell.value = 'チーム一覧';
  headerCell.font = { bold: true };
  headerCell.alignment = { horizontal: 'center' };
  
  // カラムヘッダーを追加
  const teamsHeaderRow = sheet.addRow(['チーム名', 'メンバー']);
  teamsHeaderRow.font = { bold: true };
  lastRow++;
  
  // 各チームを追加
  sport.teams.forEach(team => {
    sheet.addRow([
      team.name,
      team.members?.join(', ') || ''
    ]);
    lastRow++;
  });
};
