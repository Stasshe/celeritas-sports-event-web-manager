import * as ExcelJS from 'exceljs';
import { Sport, Match, Team } from '../../types';

/**
 * Exports tournament data to an Excel worksheet
 */
export const exportTournament = async (
  sheet: ExcelJS.Worksheet,
  sport: Sport
): Promise<void> => {
  try {
    // Set up title and basic information
    sheet.mergeCells('A1:G1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `${sport.name} - Tournament`;
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center' };
    
    // Add tournament description
    if (sport.description) {
      sheet.mergeCells('A2:G2');
      const descCell = sheet.getCell('A2');
      descCell.value = sport.description;
      descCell.alignment = { horizontal: 'center' };
    }
    
    // Add tournament settings
    sheet.mergeCells('A3:G3');
    const settingsCell = sheet.getCell('A3');
    settingsCell.value = `Third Place Match: ${sport.tournamentSettings?.hasThirdPlaceMatch ? 'Yes' : 'No'}, Repechage: ${sport.tournamentSettings?.hasRepechage ? 'Yes' : 'No'}`;
    settingsCell.alignment = { horizontal: 'center' };
    settingsCell.font = { italic: true };
    
    // Space before the bracket
    sheet.addRow(['']);
    
    // Organize matches by round
    const matchesByRound: Record<number, Match[]> = {};
    sport.matches.forEach(match => {
      if (!matchesByRound[match.round]) {
        matchesByRound[match.round] = [];
      }
      matchesByRound[match.round].push(match);
    });
    
    // Get total number of rounds
    const rounds = Object.keys(matchesByRound).map(Number).sort((a, b) => a - b);
    
    // If we have a simple tournament structure, use the visual bracket layout
    if (rounds.length <= 4 && !sport.tournamentSettings?.hasRepechage) {
      await createVisualBracket(sheet, sport, matchesByRound, rounds);
    } else {
      // Otherwise fall back to a simpler table format
      await createTournamentTable(sheet, sport, matchesByRound, rounds);
    }
    
    // Add list of teams at the bottom
    addTeamsList(sheet, sport);
    
    return;
  } catch (error) {
    console.error('Error exporting tournament:', error);
    throw error;
  }
};

/**
 * Creates a visual bracket representation (works best for simpler tournaments)
 */
const createVisualBracket = async (
  sheet: ExcelJS.Worksheet,
  sport: Sport,
  matchesByRound: Record<number, Match[]>,
  rounds: number[]
): Promise<void> => {
  // Starting row for the bracket
  let currentRow = 5;
  
  // Calculate the layout
  const maxRound = Math.max(...rounds);
  const totalCols = maxRound * 2 + 1;
  
  // Set column widths for better visibility
  for (let i = 1; i <= totalCols; i++) {
    sheet.getColumn(i).width = 15;
  }
  
  // Define cell styles
  const matchStyle = {
    border: {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    },
    alignment: { vertical: 'middle', horizontal: 'center' }
  };
  
  const winnerStyle = {
    font: { bold: true },
    fill: {
      type: 'pattern' as const,
      pattern: 'solid' as const,
      fgColor: { argb: 'FFDDFFDD' }
    }
  };
  
  // Adding round headers
  const roundRow = sheet.addRow([]);
  rounds.forEach((round, index) => {
    const cell = roundRow.getCell(index * 2 + 1);
    cell.value = `Round ${round}`;
    cell.font = { bold: true };
    cell.alignment = { horizontal: 'center' };
  });
  currentRow++;
  
  // Add empty row after headers
  sheet.addRow([]);
  currentRow++;
  
  // Start with the first round
  const firstRoundMatches = matchesByRound[rounds[0]] || [];
  let matchCount = firstRoundMatches.length;
  let rowsPerMatch = 2;
  
  // For each round
  for (let roundIndex = 0; roundIndex < rounds.length; roundIndex++) {
    const round = rounds[roundIndex];
    const matches = matchesByRound[round] || [];
    const col = roundIndex * 2 + 1;
    
    // Calculate spacing between matches for this round
    const totalRows = matchCount * rowsPerMatch;
    const rowSpacing = totalRows / matches.length;
    
    // Add each match for this round
    for (let matchIndex = 0; matchIndex < matches.length; matchIndex++) {
      const match = matches[matchIndex];
      const startRow = currentRow + matchIndex * rowSpacing;
      
      // Get team names
      const team1 = sport.teams.find(t => t.id === match.team1Id)?.name || 'TBD';
      const team2 = sport.teams.find(t => t.id === match.team2Id)?.name || 'TBD';
      
      // Set cells for team 1
      const team1Cell = sheet.getCell(startRow, col);
      team1Cell.value = `${team1} ${match.status === 'completed' ? `(${match.team1Score})` : ''}`;
      Object.assign(team1Cell, matchStyle);
      
      // If this is a completed match, highlight the winner
      if (match.status === 'completed') {
        if (match.team1Score > match.team2Score) {
          Object.assign(team1Cell, winnerStyle);
        }
      }
      
      // Set cells for team 2
      const team2Cell = sheet.getCell(startRow + 1, col);
      team2Cell.value = `${team2} ${match.status === 'completed' ? `(${match.team2Score})` : ''}`;
      Object.assign(team2Cell, matchStyle);
      
      // If this is a completed match, highlight the winner
      if (match.status === 'completed') {
        if (match.team2Score > match.team1Score) {
          Object.assign(team2Cell, winnerStyle);
        }
      }
      
      // Add connecting lines (if not the last round)
      if (roundIndex < rounds.length - 1) {
        // Vertical line from team1 to team2
        for (let r = startRow; r <= startRow + 1; r++) {
          const lineCell = sheet.getCell(r, col + 1);
          lineCell.border = {
            ...lineCell.border,
            right: { style: 'thin' }
          };
        }
        
        // Horizontal line to next match (if exists)
        if (matchIndex % 2 === 0 && matchIndex < matches.length - 1) {
          const nextMatchRow = startRow + rowSpacing / 2;
          const lineCell = sheet.getCell(nextMatchRow, col + 1);
          lineCell.border = {
            ...lineCell.border,
            bottom: { style: 'thin' }
          };
        }
      }
    }
    
    // Update variables for next round
    matchCount = Math.ceil(matchCount / 2);
  }
  
  // If there's a third place match, add it separately
  if (sport.tournamentSettings?.hasThirdPlaceMatch) {
    const thirdPlaceRow = currentRow + matchCount * rowsPerMatch + 2;
    sheet.mergeCells(`A${thirdPlaceRow}:C${thirdPlaceRow}`);
    const headerCell = sheet.getCell(`A${thirdPlaceRow}`);
    headerCell.value = 'Third Place Match';
    headerCell.font = { bold: true };
    headerCell.alignment = { horizontal: 'center' };
    
    // Find the third place match
    const thirdPlaceMatch = sport.matches.find(m => 
      m.round === maxRound && 
      m !== matchesByRound[maxRound][0]
    );
    
    if (thirdPlaceMatch) {
      const team1 = sport.teams.find(t => t.id === thirdPlaceMatch.team1Id)?.name || 'TBD';
      const team2 = sport.teams.find(t => t.id === thirdPlaceMatch.team2Id)?.name || 'TBD';
      
      // Add team info
      const team1Cell = sheet.getCell(thirdPlaceRow + 1, 1);
      team1Cell.value = team1;
      const scoreCell = sheet.getCell(thirdPlaceRow + 1, 2);
      scoreCell.value = thirdPlaceMatch.status === 'completed' 
        ? `${thirdPlaceMatch.team1Score} - ${thirdPlaceMatch.team2Score}`
        : 'vs';
      const team2Cell = sheet.getCell(thirdPlaceRow + 1, 3);
      team2Cell.value = team2;
      
      // Style cells
      [team1Cell, scoreCell, team2Cell].forEach(cell => {
        Object.assign(cell, matchStyle);
      });
      
      // Highlight winner if match is completed
      if (thirdPlaceMatch.status === 'completed') {
        if (thirdPlaceMatch.team1Score > thirdPlaceMatch.team2Score) {
          Object.assign(team1Cell, winnerStyle);
        } else if (thirdPlaceMatch.team2Score > thirdPlaceMatch.team1Score) {
          Object.assign(team2Cell, winnerStyle);
        }
      }
    }
  }
};

/**
 * Creates a simpler table representation of the tournament
 */
const createTournamentTable = async (
  sheet: ExcelJS.Worksheet,
  sport: Sport,
  matchesByRound: Record<number, Match[]>,
  rounds: number[]
): Promise<void> => {
  // Add header
  const headerRow = sheet.addRow([
    'Round', 'Match #', 'Team 1', 'Score', 'Team 2', 'Winner', 'Status'
  ]);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD3D3D3' }
  };
  
  // Style the header row
  headerRow.eachCell((cell) => {
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });
  
  // Add each match
  let rowIndex = headerRow.number + 1;
  for (const round of rounds) {
    const matches = matchesByRound[round] || [];
    
    for (const match of matches) {
      const team1 = sport.teams.find(t => t.id === match.team1Id)?.name || 'TBD';
      const team2 = sport.teams.find(t => t.id === match.team2Id)?.name || 'TBD';
      const winner = match.winnerId 
        ? sport.teams.find(t => t.id === match.winnerId)?.name 
        : 'None';
        
      const row = sheet.addRow([
        `Round ${round}`,
        match.matchNumber.toString(),
        team1,
        match.status === 'completed' ? `${match.team1Score} - ${match.team2Score}` : 'vs',
        team2,
        match.status === 'completed' ? winner : '-',
        match.status
      ]);
      
      // Style the row
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
      
      // If the match is completed, highlight the winner
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
      
      rowIndex++;
    }
  }
  
  // Format columns
  sheet.getColumn(1).width = 12;
  sheet.getColumn(2).width = 10;
  sheet.getColumn(3).width = 25;
  sheet.getColumn(4).width = 15;
  sheet.getColumn(5).width = 25;
  sheet.getColumn(6).width = 20;
  sheet.getColumn(7).width = 15;
  
  // Add auto filter
  sheet.autoFilter = {
    from: { row: 5, column: 1 },
    to: { row: 5, column: 7 }
  };
};

/**
 * Adds a list of teams at the bottom of the sheet
 */
const addTeamsList = (
  sheet: ExcelJS.Worksheet,
  sport: Sport
): void => {
  // Find the last row with content
  let lastRow = sheet.rowCount + 2;
  
  // Add teams header
  sheet.mergeCells(`A${lastRow}:C${lastRow}`);
  const headerCell = sheet.getCell(`A${lastRow}`);
  headerCell.value = 'Teams';
  headerCell.font = { bold: true };
  headerCell.alignment = { horizontal: 'center' };
  
  // Add column headers
  const teamsHeaderRow = sheet.addRow(['Team Name', 'Members']);
  teamsHeaderRow.font = { bold: true };
  lastRow++;
  
  // Add each team
  sport.teams.forEach(team => {
    sheet.addRow([
      team.name,
      team.members?.join(', ') || ''
    ]);
    lastRow++;
  });
};
