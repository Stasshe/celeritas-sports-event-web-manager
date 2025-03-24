import * as ExcelJS from 'exceljs';
import { Sport, Team, RankingEntry } from '../../types';

/**
 * Exports ranking data to an Excel worksheet
 */
export const exportRanking = async (
  sheet: ExcelJS.Worksheet,
  sport: Sport
): Promise<void> => {
  try {
    // Set up title and basic information
    sheet.mergeCells('A1:E1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `${sport.name} - Ranking Competition`;
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center' };
    
    // Add description if available
    if (sport.description) {
      sheet.mergeCells('A2:E2');
      const descCell = sheet.getCell('A2');
      descCell.value = sport.description;
      descCell.alignment = { horizontal: 'center' };
    }
    
    // Add ranking settings information
    const settings = sport.rankingSettings || { criteriaName: 'Score', isAscending: false };
    sheet.mergeCells('A3:E3');
    const settingsCell = sheet.getCell('A3');
    settingsCell.value = `Ranking Criteria: ${settings.criteriaName}, ${settings.isAscending ? 'Lower is better' : 'Higher is better'}`;
    settingsCell.alignment = { horizontal: 'center' };
    settingsCell.font = { italic: true };
    
    // Space before the ranking table
    sheet.addRow(['']);
    
    // Add rankings
    addRankingTable(sheet, sport);
    
    // Add spacing
    sheet.addRow(['']);
    
    // Add team list with details
    addTeamDetailsList(sheet, sport);
    
    // Set column widths
    sheet.getColumn(1).width = 15;
    sheet.getColumn(2).width = 30;
    sheet.getColumn(3).width = 20;
    sheet.getColumn(4).width = 30;
    
    return;
  } catch (error) {
    console.error('Error exporting ranking data:', error);
    throw error;
  }
};

/**
 * Adds a ranking table to the worksheet
 */
const addRankingTable = (
  sheet: ExcelJS.Worksheet,
  sport: Sport
): void => {
  // Prepare rankings data
  const rankings: RankingEntry[] = [];
  
  // Check if we have dedicated ranking entries in the sport
  if (sport.rankings && Array.isArray(sport.rankings)) {
    rankings.push(...sport.rankings);
  } else {
    // Otherwise, generate from matches data
    const teamResults: Record<string, { score: number; wins: number }> = {};
    
    // Initialize results
    sport.teams.forEach(team => {
      teamResults[team.id] = { score: 0, wins: 0 };
    });
    
    // Calculate scores from matches
    sport.matches.forEach(match => {
      if (match.status === 'completed') {
        // For team 1
        teamResults[match.team1Id].score += match.team1Score;
        if (match.team1Score > match.team2Score) {
          teamResults[match.team1Id].wins += 1;
        }
        
        // For team 2
        teamResults[match.team2Id].score += match.team2Score;
        if (match.team2Score > match.team1Score) {
          teamResults[match.team2Id].wins += 1;
        }
      }
    });
    
    // Create ranking entries from team results
    Object.entries(teamResults).forEach(([teamId, result], index) => {
      rankings.push({
        id: `rank-${teamId}`,
        teamId,
        rank: index + 1, // Provisional rank
        score: result.score
      });
    });
    
    // Sort rankings based on score or wins
    const rankingSettings = sport.rankingSettings || { criteriaName: 'Score', isAscending: false };
    rankings.sort((a, b) => {
      if (rankingSettings.isAscending) {
        return (a.score || 0) - (b.score || 0);
      } else {
        return (b.score || 0) - (a.score || 0);
      }
    });
    
    // Reassign ranks after sorting
    rankings.forEach((entry, index) => {
      entry.rank = index + 1;
    });
  }
  
  // Add header for rankings table
  sheet.mergeCells('A5:D5');
  const headerCell = sheet.getCell('A5');
  headerCell.value = 'Final Rankings';
  headerCell.font = { bold: true, size: 14 };
  headerCell.alignment = { horizontal: 'center' };
  
  // Add column headers
  const rankingHeader = sheet.addRow([
    'Rank', 
    'Team', 
    sport.rankingSettings?.criteriaName || 'Score', 
    'Notes'
  ]);
  rankingHeader.font = { bold: true };
  rankingHeader.eachCell((cell) => {
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
    cell.alignment = { horizontal: 'center' };
  });
  
  // Add each ranking row
  rankings.forEach((ranking) => {
    const team = sport.teams.find(t => t.id === ranking.teamId);
    if (!team) return;
    
    const row = sheet.addRow([
      ranking.rank.toString(),
      team.name,
      ranking.score !== undefined && ranking.score !== null ? ranking.score.toString() : '-',
      ranking.notes || ''
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
    
    // Align cells
    row.getCell(1).alignment = { horizontal: 'center' };
    row.getCell(3).alignment = { horizontal: 'center' };
    
    // Highlight top rankings
    if (ranking.rank <= 3) {
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { 
            argb: ranking.rank === 1 
              ? 'FFFFD700' // Gold
              : ranking.rank === 2 
                ? 'FFC0C0C0' // Silver
                : 'FFCD7F32' // Bronze
          }
        };
      });
    }
  });
};

/**
 * Adds a detailed team list to the worksheet
 */
const addTeamDetailsList = (
  sheet: ExcelJS.Worksheet,
  sport: Sport
): void => {
  // Find the last row with content
  const lastRow = sheet.rowCount + 2;
  
  // Add team details header
  sheet.mergeCells(`A${lastRow}:D${lastRow}`);
  const headerCell = sheet.getCell(`A${lastRow}`);
  headerCell.value = 'Team Details';
  headerCell.font = { bold: true, size: 14 };
  headerCell.alignment = { horizontal: 'center' };
  
  // Add column headers
  const teamHeaderRow = sheet.addRow(['Team Name', 'Members', 'Additional Information']);
  teamHeaderRow.font = { bold: true };
  teamHeaderRow.eachCell((cell) => {
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
    cell.alignment = { horizontal: 'center' };
  });
  
  // Add each team with details
  sport.teams.forEach(team => {
    const row = sheet.addRow([
      team.name,
      team.members?.join(', ') || '',
      '' // Additional information (could be customized)
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
  });
  
  // Set column widths
  sheet.getColumn(1).width = 25;
  sheet.getColumn(2).width = 40;
  sheet.getColumn(3).width = 30;
};
