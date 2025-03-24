import * as ExcelJS from 'exceljs';
import { Sport, Match, Team } from '../../types';

/**
 * Exports league data to an Excel worksheet
 */
export const exportLeague = async (
  sheet: ExcelJS.Worksheet,
  sport: Sport
): Promise<void> => {
  try {
    // Set up title and basic information
    sheet.mergeCells('A1:G1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `${sport.name} - League Competition`;
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
    sheet.mergeCells('A3:G3');
    const settingsCell = sheet.getCell('A3');
    settingsCell.value = `Blocks: ${sport.leagueSettings.blockCount}, Advancing Teams: ${sport.leagueSettings.advancingTeams}, Playoff: ${sport.leagueSettings.hasPlayoff ? 'Yes' : 'No'}, Third Place Match: ${sport.leagueSettings.hasThirdPlaceMatch ? 'Yes' : 'No'}`;
    settingsCell.alignment = { horizontal: 'center' };
    settingsCell.font = { italic: true };
    
    // Space before the tables
    sheet.addRow(['']);
    let currentRow = 5;
    
    // 1. Create block standings tables
    currentRow = addBlockStandingsTables(sheet, sport, currentRow);
    
    // Add spacing
    sheet.addRow(['']);
    currentRow += 2;
    
    // 2. Create match results table
    currentRow = addMatchResultsTable(sheet, sport, currentRow);
    
    // Add spacing
    sheet.addRow(['']);
    currentRow += 2;
    
    // 3. Create playoff matches table if applicable
    if (sport.leagueSettings?.hasPlayoff && sport.matches && Array.isArray(sport.matches)) {
      currentRow = addPlayoffMatches(sheet, sport, sport.matches.filter(m => m.round > 1), currentRow);
      
      // Add spacing
      sheet.addRow(['']);
      currentRow += 2;
      
      // 4. Add final standings after playoff
      currentRow = addFinalStandings(sheet, sport, sport.matches.filter(m => m.round > 1), currentRow);
    }
    
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
    console.error('Error exporting league data:', error);
    throw error;
  }
};

/**
 * Adds block standings tables to the worksheet
 */
const addBlockStandingsTables = (
  sheet: ExcelJS.Worksheet,
  sport: Sport,
  startRow: number
): number => {
  // Ensure teams array exists
  const teams = sport.teams && Array.isArray(sport.teams) ? sport.teams : [];
  
  // Group teams by block
  const blocks: Record<string, Team[]> = {};
  teams.forEach(team => {
    // Use optional chaining and nullish coalescing for blockId
    const blockId = team.blockId ?? 'default';
    if (!blocks[blockId]) {
      blocks[blockId] = [];
    }
    blocks[blockId].push(team);
  });
  
  // Add standings table for each block
  Object.entries(blocks).forEach(([blockId, teams]) => {
    // Add block header
    sheet.mergeCells(`A${startRow}:H${startRow}`);
    const headerCell = sheet.getCell(`A${startRow}`);
    headerCell.value = `Block ${blockId}`;
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
    teams.forEach(team => {
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
      if (match.status === 'completed' && match.blockId === blockId) {
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
          teamStats[match.team1Id].points += 3;
          
          teamStats[match.team2Id].lost++;
        } else if (match.team2Score > match.team1Score) {
          teamStats[match.team2Id].won++;
          teamStats[match.team2Id].points += 3;
          
          teamStats[match.team1Id].lost++;
        } else {
          // Draw
          teamStats[match.team1Id].drawn++;
          teamStats[match.team1Id].points++;
          
          teamStats[match.team2Id].drawn++;
          teamStats[match.team2Id].points++;
        }
      }
    });
    
    // Sort teams by points, goal difference, etc.
    const sortedTeams = [...teams].sort((a, b) => {
      // Compare points
      const pointsDiff = teamStats[b.id].points - teamStats[a.id].points;
      if (pointsDiff !== 0) return pointsDiff;
      
      // If points are equal, compare goal difference
      const aGoalDiff = teamStats[a.id].goalsFor - teamStats[a.id].goalsAgainst;
      const bGoalDiff = teamStats[b.id].goalsFor - teamStats[a.id].goalsAgainst;
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
    
    // Add spacing between blocks
    sheet.addRow(['']);
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
  const matches = [...sport.matches].sort((a, b) => a.matchNumber - b.matchNumber);
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
 * Adds playoff matches table to the worksheet
 */
const addPlayoffMatches = (
  sheet: ExcelJS.Worksheet,
  sport: Sport,
  playoffMatches: Match[],
  startRow: number
): number => {
  // Add column headers
  const matchesHeader = sheet.addRow([
    'Match #', 'Round', 'Team 1', 'Score', 'Team 2', 'Winner', 'Status'
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
  
  // Sort matches by round and match number
  const sortedMatches = [...playoffMatches].sort((a, b) => {
    if (a.round !== b.round) return a.round - b.round;
    return a.matchNumber - b.matchNumber;
  });
  
  // Add each match row
  sortedMatches.forEach(match => {
    const team1 = sport.teams.find(t => t.id === match.team1Id)?.name || 'TBD';
    const team2 = sport.teams.find(t => t.id === match.team2Id)?.name || 'TBD';
    const winner = match.winnerId 
      ? sport.teams.find(t => t.id === match.winnerId)?.name 
      : '-';
      
    // Determine round name for better readability
    let roundName = `Round ${match.round}`;
    const maxRound = Math.max(...sortedMatches.map(m => m.round));
    
    if (match.round === maxRound) {
      roundName = 'Final';
    } else if (match.round === maxRound - 1) {
      roundName = 'Semi-Finals';
    } else if (match.round === maxRound - 2) {
      roundName = 'Quarter-Finals';
    }
    
    // If this is the third place match
    if (match.round === maxRound && 
        match.matchNumber === Math.max(...sortedMatches.map(m => m.matchNumber))) {
      roundName = '3rd Place Match';
    }
    
    // Add the match row
    const row = sheet.addRow([
      match.matchNumber.toString(),
      roundName,
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
      cell.alignment = { horizontal: 'center' };
    });
    
    // Allow team names to align left
    row.getCell(3).alignment = { horizontal: 'left' };
    row.getCell(5).alignment = { horizontal: 'left' };
    
    // Highlight the winner if match is completed
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
    
    startRow++;
  });
  
  // Format columns for better readability
  sheet.getColumn(1).width = 10;
  sheet.getColumn(2).width = 15;
  sheet.getColumn(3).width = 25;
  sheet.getColumn(4).width = 15;
  sheet.getColumn(5).width = 25;
  sheet.getColumn(6).width = 20;
  sheet.getColumn(7).width = 15;
  
  return startRow;
};

/**
 * Adds final standings after playoff
 */
const addFinalStandings = (
  sheet: ExcelJS.Worksheet,
  sport: Sport,
  playoffMatches: Match[],
  startRow: number
): number => {
  // Add column headers
  const standingsHeader = sheet.addRow([
    'Position', 'Team', 'Notes'
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
  
  // Find final match
  const maxRound = Math.max(...playoffMatches.map(m => m.round));
  const finalMatches = playoffMatches.filter(m => 
    m.round === maxRound && 
    m.status === 'completed'
  );
  
  // Initialize final standings
  const finalStandings: { position: number; teamId: string; note: string }[] = [];
  
  // Process final and third place matches
  if (finalMatches.length > 0) {
    // Find the championship final
    const finalMatch = finalMatches.find(m => 
      !sport.leagueSettings.hasThirdPlaceMatch || 
      m.matchNumber !== Math.max(...playoffMatches.map(m => m.matchNumber))
    );
    
    // Find third place match if exists
    const thirdPlaceMatch = sport.leagueSettings.hasThirdPlaceMatch 
      ? finalMatches.find(m => m !== finalMatch) 
      : undefined;
    
    if (finalMatch?.winnerId) {
      // First place - winner of the final
      finalStandings.push({
        position: 1, 
        teamId: finalMatch.winnerId,
        note: 'Champion'
      });
      
      // Second place - loser of the final
      const secondPlaceTeamId = finalMatch.team1Id === finalMatch.winnerId 
        ? finalMatch.team2Id 
        : finalMatch.team1Id;
        
      finalStandings.push({
        position: 2, 
        teamId: secondPlaceTeamId,
        note: 'Runner-up'
      });
    }
    
    // Add third and fourth places if third place match exists
    if (thirdPlaceMatch?.winnerId) {
      // Third place - winner of third place match
      finalStandings.push({
        position: 3, 
        teamId: thirdPlaceMatch.winnerId,
        note: 'Third Place'
      });
      
      // Fourth place - loser of third place match
      const fourthPlaceTeamId = thirdPlaceMatch.team1Id === thirdPlaceMatch.winnerId 
        ? thirdPlaceMatch.team2Id 
        : thirdPlaceMatch.team1Id;
        
      finalStandings.push({
        position: 4, 
        teamId: fourthPlaceTeamId,
        note: 'Fourth Place'
      });
    }
  }
  
  // Add standings rows
  finalStandings.sort((a, b) => a.position - b.position);
  
  finalStandings.forEach((standing) => {
    const team = sport.teams.find(t => t.id === standing.teamId);
    if (!team) return;
    
    const row = sheet.addRow([
      standing.position.toString(),
      team.name,
      standing.note
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
    
    // Center position and notes
    row.getCell(1).alignment = { horizontal: 'center' };
    row.getCell(3).alignment = { horizontal: 'center' };
    
    // Add medal colors
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
  
  // Format columns
  sheet.getColumn(1).width = 10;
  sheet.getColumn(2).width = 25;
  sheet.getColumn(3).width = 20;
  
  return startRow;
};