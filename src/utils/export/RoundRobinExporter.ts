import * as ExcelJS from 'exceljs';
import { Sport, Match, Team } from '../../types';
import { defaultRoundRobinSettings } from '../../types';

/**
 * Exports round-robin data to an Excel worksheet
 */
export const exportRoundRobin = async (
  sheet: ExcelJS.Worksheet,
  sport: Sport
): Promise<void> => {
  try {
    // Set up title and basic information
    sheet.mergeCells('A1:G1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `${sport.name} - Round Robin Competition`;
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center' };
    
    // Add description if available
    if (sport.description) {
      sheet.mergeCells('A2:G2');
      const descCell = sheet.getCell('A2');
      descCell.value = sport.description;
      descCell.alignment = { horizontal: 'center' };
    }
    
    // Add settings information
    const settings = { ...defaultRoundRobinSettings, ...sport.roundRobinSettings };
    sheet.mergeCells('A3:G3');
    const settingsCell = sheet.getCell('A3');
    settingsCell.value = `Win: ${settings.winPoints} pts, Draw: ${settings.drawPoints} pts, Loss: ${settings.losePoints} pts`;
    settingsCell.alignment = { horizontal: 'center' };
    settingsCell.font = { italic: true };
    
    // Space before the tables
    sheet.addRow(['']);
    let currentRow = 5;
    
    // 1. Create standings table
    currentRow = addStandingsTable(sheet, sport, currentRow, settings);
    
    // Add spacing
    sheet.addRow(['']);
    currentRow += 2;
    
    // 2. Create match results table
    currentRow = addMatchResultsTable(sheet, sport, currentRow);
    
    // Add spacing
    sheet.addRow(['']);
    currentRow += 2;
    
    // 3. Create cross-table (matrix of head-to-head results)
    currentRow = addCrossTable(sheet, sport, currentRow);
    
    // Set column widths
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
    console.error('Error exporting round robin data:', error);
    throw error;
  }
};

/**
 * Adds a standings table to the worksheet
 */
const addStandingsTable = (
  sheet: ExcelJS.Worksheet,
  sport: Sport,
  startRow: number,
  settings: any
): number => {
  // Add header
  sheet.mergeCells(`A${startRow}:H${startRow}`);
  const headerCell = sheet.getCell(`A${startRow}`);
  headerCell.value = 'Standings';
  headerCell.font = { bold: true, size: 14 };
  headerCell.alignment = { horizontal: 'center' };
  startRow++;
  
  // Add column headers
  const standingsHeader = sheet.addRow([
    'Team', 'P', 'W', 'D', 'L', 'GF', 'GA', 'Pts'
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
  // Allow team names to align left
  standingsHeader.getCell(1).alignment = { horizontal: 'left' };
  startRow++;
  
  // Calculate statistics for each team
  const teamStats: Record<string, {
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
    points: number;
  }> = {};
  
  // Initialize stats for each team
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
  
  // Process completed matches
  sport.matches.forEach(match => {
    if (match.status === 'completed') {
      // Update team 1 stats
      teamStats[match.team1Id].played++;
      teamStats[match.team1Id].goalsFor += match.team1Score;
      teamStats[match.team1Id].goalsAgainst += match.team2Score;
      
      // Update team 2 stats
      teamStats[match.team2Id].played++;
      teamStats[match.team2Id].goalsFor += match.team2Score;
      teamStats[match.team2Id].goalsAgainst += match.team1Score;
      
      // Update win/draw/loss stats
      if (match.team1Score > match.team2Score) {
        teamStats[match.team1Id].won++;
        teamStats[match.team1Id].points += settings.winPoints;
        
        teamStats[match.team2Id].lost++;
        if (settings.considerLosePoints) {
          teamStats[match.team2Id].points += settings.losePoints;
        }
      } else if (match.team2Score > match.team1Score) {
        teamStats[match.team2Id].won++;
        teamStats[match.team2Id].points += settings.winPoints;
        
        teamStats[match.team1Id].lost++;
        if (settings.considerLosePoints) {
          teamStats[match.team1Id].points += settings.losePoints;
        }
      } else {
        // Draw
        teamStats[match.team1Id].drawn++;
        teamStats[match.team1Id].points += settings.drawPoints;
        
        teamStats[match.team2Id].drawn++;
        teamStats[match.team2Id].points += settings.drawPoints;
      }
    }
  });
  
  // Sort teams by points, goal difference, etc.
  const sortedTeams = [...sport.teams].sort((a, b) => {
    // Compare points
    const pointsDiff = teamStats[b.id].points - teamStats[a.id].points;
    if (pointsDiff !== 0) return pointsDiff;
    
    // If points are equal, compare goal difference
    const aGoalDiff = teamStats[a.id].goalsFor - teamStats[a.id].goalsAgainst;
    const bGoalDiff = teamStats[b.id].goalsFor - teamStats[b.id].goalsAgainst;
    const goalDiff = bGoalDiff - aGoalDiff;
    if (goalDiff !== 0) return goalDiff;
    
    // If goal difference is equal, compare goals scored
    const goalsScoredDiff = teamStats[b.id].goalsFor - teamStats[a.id].goalsFor;
    if (goalsScoredDiff !== 0) return goalsScoredDiff;
    
    // If everything is equal, sort alphabetically
    return a.name.localeCompare(b.name);
  });
  
  // Add team rows
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
    
    // Style the row
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      cell.alignment = { horizontal: 'center' };
    });
    // Allow team names to align left
    row.getCell(1).alignment = { horizontal: 'left' };
    
    // Highlight top teams
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
 * Adds a match results table to the worksheet
 */
const addMatchResultsTable = (
  sheet: ExcelJS.Worksheet,
  sport: Sport,
  startRow: number
): number => {
  // Add header
  sheet.mergeCells(`A${startRow}:F${startRow}`);
  const headerCell = sheet.getCell(`A${startRow}`);
  headerCell.value = 'Match Results';
  headerCell.font = { bold: true, size: 14 };
  headerCell.alignment = { horizontal: 'center' };
  startRow++;
  
  // Add column headers
  const matchesHeader = sheet.addRow([
    'Match #', 'Team 1', 'Score', 'Team 2', 'Date', 'Status'
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
  
  // Group matches by round/matchday if possible
  const matches = sport.matches && Array.isArray(sport.matches) 
    ? [...sport.matches].sort((a, b) => a.matchNumber - b.matchNumber)
    : [];
  let currentMatchday = -1;
  
  matches.forEach(match => {
    // Check if this is a new matchday
    if (match.round !== currentMatchday) {
      currentMatchday = match.round;
      
      // Add matchday header
      sheet.mergeCells(`A${startRow}:F${startRow}`);
      const matchdayCell = sheet.getCell(`A${startRow}`);
      matchdayCell.value = `Matchday ${currentMatchday}`;
      matchdayCell.font = { italic: true };
      matchdayCell.alignment = { horizontal: 'center' };
      matchdayCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF0F0F0' }
      };
      startRow++;
    }
    
    // Get team names
    const team1 = sport.teams.find(t => t.id === match.team1Id)?.name || 'Unknown';
    const team2 = sport.teams.find(t => t.id === match.team2Id)?.name || 'Unknown';
    
    // Format date if available
    const matchDate = match.date ? new Date(match.date).toLocaleDateString() : '-';
    
    // Add match row
    const row = sheet.addRow([
      match.matchNumber.toString(),
      team1,
      match.status === 'completed' ? `${match.team1Score} - ${match.team2Score}` : 'vs',
      team2,
      matchDate,
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
      cell.alignment = { horizontal: 'center' };
    });
    
    // Allow team names to align left
    row.getCell(2).alignment = { horizontal: 'left' };
    row.getCell(4).alignment = { horizontal: 'left' };
    
    startRow++;
  });
  
  return startRow;
};

/**
 * Adds a cross-table (head-to-head matrix) to the worksheet
 */
const addCrossTable = (
  sheet: ExcelJS.Worksheet,
  sport: Sport,
  startRow: number
): number => {
  const teams = sport.teams;
  
  // Add header
  sheet.mergeCells(`A${startRow}:${getColumnLetter(teams.length + 1)}${startRow}`);
  const headerCell = sheet.getCell(`A${startRow}`);
  headerCell.value = 'Head-to-Head Results';
  headerCell.font = { bold: true, size: 14 };
  headerCell.alignment = { horizontal: 'center' };
  startRow++;
  
  // Add empty cell in top-left corner
  const headerRow = sheet.getRow(startRow);
  headerRow.getCell(1).value = '';
  headerRow.getCell(1).border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };
  
  // Add team names in the top row
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
    
    // Make the header row taller and rotate text for better readability
    headerRow.height = 100;
    cell.alignment = { 
      horizontal: 'center', 
      vertical: 'bottom', 
      textRotation: 90 
    };
  });
  startRow++;
  
  // Prepare the head-to-head results matrix
  const matrix: Record<string, Record<string, string>> = {};
  
  teams.forEach(team => {
    matrix[team.id] = {};
    teams.forEach(opponent => {
      matrix[team.id][opponent.id] = team.id === opponent.id ? '-' : '';
    });
  });
  
  // Fill the matrix with match results
  sport.matches.forEach(match => {
    if (match.status === 'completed') {
      matrix[match.team1Id][match.team2Id] = `${match.team1Score}-${match.team2Score}`;
      matrix[match.team2Id][match.team1Id] = `${match.team2Score}-${match.team1Score}`;
    }
  });
  
  // Add rows for each team
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
    
    // Add results against each opponent
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
      
      // Highlight winning results
      if (matrix[team.id][opponent.id] !== '-' && matrix[team.id][opponent.id] !== '') {
        const [teamScore, opponentScore] = matrix[team.id][opponent.id].split('-').map(Number);
        if (teamScore > opponentScore) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFDDFFDD' }
          };
        } else if (teamScore < opponentScore) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFDDDD' }
          };
        } else if (teamScore === opponentScore) {
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

// Helper function to convert column number to letter
const getColumnLetter = (column: number): string => {
  let letter = '';
  while (column > 0) {
    const remainder = (column - 1) % 26;
    letter = String.fromCharCode(65 + remainder) + letter;
    column = Math.floor((column - 1) / 26);
  }
  return letter;
};
