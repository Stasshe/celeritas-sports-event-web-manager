import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Event, Sport, Match, Team } from '../../types';
import { exportTournament } from './TournamentExporter';
import { exportRoundRobin } from './RoundRobinExporter';
import { exportLeague } from './LeagueExporter';
import { exportRanking } from './RankingExporter';

interface ExportOptions {
  includeOverallWinners?: boolean;
  includeIndividualEvents?: boolean;
  eventIds?: string[];
  sportIds?: string[];
  fileName?: string;
}

// カスタムエラークラスを定義
export class ExportError extends Error {
  constructor(
    public code: string,
    message: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'ExportError';
  }
}

// エラーコード定数
export const ERROR_CODES = {
  NO_DATA: 'NO_DATA',
  NO_EVENTS_SELECTED: 'NO_EVENTS_SELECTED', 
  NO_SPORTS_SELECTED: 'NO_SPORTS_SELECTED',
  INVALID_FILE_NAME: 'INVALID_FILE_NAME',
  WORKBOOK_CREATION_FAILED: 'WORKBOOK_CREATION_FAILED',
  DATA_PROCESSING_FAILED: 'DATA_PROCESSING_FAILED',
  FILE_GENERATION_FAILED: 'FILE_GENERATION_FAILED',
  DOWNLOAD_FAILED: 'DOWNLOAD_FAILED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  UNKNOWN: 'UNKNOWN'
} as const;

// ファイル名のバリデーション関数
const validateFileName = (fileName: string): boolean => {
  // 英数字、ハイフン、アンダースコア、日本語文字のみ許可
  const validPattern = /^[a-zA-Z0-9\-_\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\s]+$/;
  return validPattern.test(fileName) && fileName.length > 0 && fileName.length <= 255;
};

/**
 * Main export manager for generating Excel files with competition results
 */
export const exportToExcel = async (
  events: Record<string, Event>,
  sports: Record<string, Sport>,
  options: ExportOptions = {}
): Promise<void> => {
  try {
    // データの存在チェック
    if (!events || Object.keys(events).length === 0) {
      throw new ExportError(ERROR_CODES.NO_DATA, 'No events data available');
    }

    if (!sports || Object.keys(sports).length === 0) {
      throw new ExportError(ERROR_CODES.NO_DATA, 'No sports data available');
    }

    // オプションのバリデーション
    if (options.eventIds && options.eventIds.length === 0) {
      throw new ExportError(ERROR_CODES.NO_EVENTS_SELECTED, 'No events selected for export');
    }

    if (options.sportIds && options.sportIds.length === 0) {
      throw new ExportError(ERROR_CODES.NO_SPORTS_SELECTED, 'No sports selected for export');
    }

    // ファイル名のバリデーション
    const fileName = options.fileName || 'sports-results.xlsx';
    const baseFileName = fileName.replace(/\.xlsx$/, '');
    if (!validateFileName(baseFileName)) {
      throw new ExportError(ERROR_CODES.INVALID_FILE_NAME, 'Invalid file name format');
    }

    // Initialize workbook
    let workbook: ExcelJS.Workbook;
    try {
      workbook = new ExcelJS.Workbook();
      workbook.creator = 'Sports Event Manager';
      workbook.created = new Date();
    } catch (error) {
      throw new ExportError(
        ERROR_CODES.WORKBOOK_CREATION_FAILED, 
        'Failed to create Excel workbook',
        error as Error
      );
    }
    
    try {
      // Add overall winners sheet if requested
      if (options.includeOverallWinners) {
        const overallSheet = workbook.addWorksheet('Overall Winners');
        addOverallWinnersSheet(overallSheet, events, sports);
      }
      
      // Add individual event sheets
      if (options.includeIndividualEvents) {
        const filteredSports = options.sportIds 
          ? Object.values(sports).filter(sport => options.sportIds?.includes(sport.id))
          : Object.values(sports);
          
        // イベントIDフィルターが指定されている場合はそれも考慮
        const finalFilteredSports = options.eventIds
          ? filteredSports.filter(sport => options.eventIds?.includes(sport.eventId))
          : filteredSports;

        if (finalFilteredSports.length === 0) {
          throw new ExportError(ERROR_CODES.NO_DATA, 'No sports data matches the selected filters');
        }
          
        // Group sports by event
        const sportsByEvent: Record<string, Sport[]> = {};
        finalFilteredSports.forEach(sport => {
          if (!sportsByEvent[sport.eventId]) {
            sportsByEvent[sport.eventId] = [];
          }
          sportsByEvent[sport.eventId].push(sport);
        });
        
        // Create sheets for each event and its sports
        for (const [eventId, eventSports] of Object.entries(sportsByEvent)) {
          const event = events[eventId];
          if (!event) continue;
          
          // Add event information sheet
          const eventSheet = workbook.addWorksheet(`Event - ${event.name}`);
          addEventInfoSheet(eventSheet, event, eventSports);
          
          // Add sheets for each sport based on its type
          for (const sport of eventSports) {
            const sportSheet = workbook.addWorksheet(`${event.name} - ${sport.name}`);
            
            // Use the appropriate exporter based on sport type
            switch (sport.type) {
              case 'tournament':
                await exportTournament(sportSheet, sport);
                break;
              case 'roundRobin':
                await exportRoundRobin(sportSheet, sport);
                break;
              case 'league':
                await exportLeague(sportSheet, sport);
                break;
              case 'ranking':
                await exportRanking(sportSheet, sport);
                break;
              default:
                addGenericSportSheet(sportSheet, sport);
            }
          }
        }
      }
    } catch (error) {
      throw new ExportError(
        ERROR_CODES.DATA_PROCESSING_FAILED,
        'Failed to process data for export',
        error as Error
      );
    }
    
    // Generate Excel file
    let buffer: ArrayBuffer;
    try {
      buffer = await workbook.xlsx.writeBuffer();
    } catch (error) {
      throw new ExportError(
        ERROR_CODES.FILE_GENERATION_FAILED,
        'Failed to generate Excel file',
        error as Error
      );
    }

    // Download file
    try {
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, fileName);
    } catch (error) {
      const err = error as Error;
      if (err.name === 'SecurityError' || err.message.includes('permission')) {
        throw new ExportError(
          ERROR_CODES.PERMISSION_DENIED,
          'Permission denied to save file',
          err
        );
      } else if (err.message.includes('network') || err.message.includes('Network')) {
        throw new ExportError(
          ERROR_CODES.NETWORK_ERROR,
          'Network error during download',
          err
        );
      } else {
        throw new ExportError(
          ERROR_CODES.DOWNLOAD_FAILED,
          'Failed to download file',
          err
        );
      }
    }
    
    return;
  } catch (error) {
    // ExportErrorの場合はそのまま再throw
    if (error instanceof ExportError) {
      throw error;
    }
    
    // その他のエラーは汎用エラーとして扱う
    console.error('Export to Excel failed:', error);
    throw new ExportError(
      ERROR_CODES.UNKNOWN,
      'An unexpected error occurred during export',
      error as Error
    );
  }
};

// Helper functions for creating specific sheets

const addOverallWinnersSheet = (
  sheet: ExcelJS.Worksheet, 
  events: Record<string, Event>,
  sports: Record<string, Sport>
) => {
  // Set up headers
  sheet.columns = [
    { header: 'Event', key: 'event', width: 25 },
    { header: 'Sport', key: 'sport', width: 25 },
    { header: 'First Place', key: 'firstPlace', width: 25 },
    { header: 'Second Place', key: 'secondPlace', width: 25 },
    { header: 'Third Place', key: 'thirdPlace', width: 20 }
  ];
  
  // Style the header row
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD3D3D3' }
  };
  
  // Add winner data for each sport
  const sportsList = Object.values(sports);
  let rowIndex = 2;
  
  for (const sport of sportsList) {
    const event = events[sport.eventId];
    if (!event) continue;
    
    const winners = getWinners(sport);
    
    sheet.addRow({
      event: event.name,
      sport: sport.name,
      firstPlace: winners.first?.name || '-',
      secondPlace: winners.second?.name || '-',
      thirdPlace: winners.third?.name || '-'
    });
    
    // Style the row
    const row = sheet.getRow(rowIndex);
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
    
    rowIndex++;
  }
  
  // Auto filter
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: 5 }
  };
};

const addEventInfoSheet = (
  sheet: ExcelJS.Worksheet,
  event: Event,
  sports: Sport[]
) => {
  // Event header
  sheet.mergeCells('A1:E1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = event.name;
  titleCell.font = { size: 16, bold: true };
  titleCell.alignment = { horizontal: 'center' };
  
  // Event details
  sheet.addRow(['Date:', new Date(event.date).toLocaleDateString()]);
  sheet.addRow(['Description:', event.description]);
  
  // Add organizers
  sheet.addRow(['']);
  sheet.addRow(['Organizers:']);
  // Check if organizers array exists before iterating
  if (event.organizers && Array.isArray(event.organizers) && event.organizers.length > 0) {
    event.organizers.forEach(org => {
      sheet.addRow([org.name, org.role, `Grade: ${org.grade}`]);
    });
  } else {
    sheet.addRow(['No organizers assigned']);
  }
  
  // Sports list
  sheet.addRow(['']);
  sheet.addRow(['Sports:']);
  const headerRow = sheet.addRow(['Name', 'Type', 'Teams', 'Status']);
  headerRow.font = { bold: true };
  
  sports.forEach(sport => {
    // Add null check for matches array
    const matchesCompleted = sport.matches && Array.isArray(sport.matches) 
      ? sport.matches.filter(m => m.status === 'completed').length 
      : 0;
    const totalMatches = sport.matches && Array.isArray(sport.matches) 
      ? sport.matches.length 
      : 0;
    const status = totalMatches > 0 
      ? `${matchesCompleted}/${totalMatches} matches completed`
      : 'No matches';
      
    sheet.addRow([
      sport.name,
      sport.type,
      (sport.teams && Array.isArray(sport.teams) ? sport.teams.length : 0).toString(),
      status
    ]);
  });
  
  // Style the sheet
  sheet.getColumn(1).width = 15;
  sheet.getColumn(2).width = 25;
  sheet.getColumn(3).width = 15;
  sheet.getColumn(4).width = 25;
};

const addGenericSportSheet = (
  sheet: ExcelJS.Worksheet,
  sport: Sport
) => {
  // Add basic sport info
  sheet.mergeCells('A1:E1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = sport.name;
  titleCell.font = { size: 16, bold: true };
  titleCell.alignment = { horizontal: 'center' };
  
  sheet.addRow(['Type:', sport.type]);
  sheet.addRow(['Description:', sport.description || '']);
  
  // Add teams
  sheet.addRow(['']);
  sheet.addRow(['Teams:']);
  const teamsHeader = sheet.addRow(['Team Name', 'Members']);
  teamsHeader.font = { bold: true };
  
  sport.teams.forEach(team => {
    sheet.addRow([
      team.name,
      team.members?.join(', ') || ''
    ]);
  });
  
  // Add matches section only if matches array exists
  if (sport.matches && Array.isArray(sport.matches) && sport.matches.length > 0) {
    sheet.addRow(['']);
    sheet.addRow(['Matches:']);
    const matchesHeader = sheet.addRow([
      'Match #', 'Team 1', 'Team 2', 'Score', 'Winner', 'Status'
    ]);
    matchesHeader.font = { bold: true };
    
    sport.matches.forEach(match => {
      const team1 = sport.teams.find(t => t.id === match.team1Id)?.name || 'Unknown';
      const team2 = sport.teams.find(t => t.id === match.team2Id)?.name || 'Unknown';
      const winner = match.winnerId 
        ? sport.teams.find(t => t.id === match.winnerId)?.name 
        : 'None';
        
      sheet.addRow([
        match.matchNumber,
        team1,
        team2,
        `${match.team1Score} - ${match.team2Score}`,
        winner || '-',
        match.status
      ]);
    });
    
    // Format columns
    sheet.getColumn(1).width = 15;
    sheet.getColumn(2).width = 25;
    sheet.getColumn(3).width = 25;
    sheet.getColumn(4).width = 15;
    sheet.getColumn(5).width = 25;
    sheet.getColumn(6).width = 15;
  } else {
    // No matches section for ranking competitions
    sheet.addRow(['']);
    sheet.addRow(['Note: This competition type does not use matches']);
  }
};

// Helper function to determine winners for a sport
const getWinners = (sport: Sport): { 
  first?: Team; 
  second?: Team; 
  third?: Team 
} => {
  try {
    const result: { first?: Team; second?: Team; third?: Team } = {};
    
    // Ensure matches and teams exist
    if (!sport.matches || !Array.isArray(sport.matches) || !sport.teams || !Array.isArray(sport.teams)) {
      return result;
    }
    
    // For tournament and league formats
    if (['tournament', 'league'].includes(sport.type)) {
      // Find final match
      const finalMatches = sport.matches.filter(m => 
        m.round === Math.max(...sport.matches.map(match => match.round)) &&
        m.status === 'completed'
      );
      
      if (finalMatches.length > 0) {
        const finalMatch = finalMatches[0];
        if (finalMatch.winnerId) {
          result.first = sport.teams.find(t => t.id === finalMatch.winnerId);
          result.second = sport.teams.find(t => 
            t.id === (finalMatch.team1Id === finalMatch.winnerId ? finalMatch.team2Id : finalMatch.team1Id)
          );
        }
        
        // Find third place match if exists
        const thirdPlaceMatch = sport.matches.find(m => 
          m.matchNumber === sport.matches.length && 
          m.matchNumber !== finalMatch.matchNumber &&
          m.status === 'completed'
        );
        
        if (thirdPlaceMatch?.winnerId) {
          result.third = sport.teams.find(t => t.id === thirdPlaceMatch.winnerId);
        }
      }
    } 
    // For round-robin format
    else if (sport.type === 'roundRobin') {
      // Calculate points for each team
      const teamPoints: Record<string, number> = {};
      sport.teams.forEach(team => {
        teamPoints[team.id] = 0;
      });
      
      // Default points if not specified
      const winPoints = sport.roundRobinSettings?.winPoints || 3;
      const drawPoints = sport.roundRobinSettings?.drawPoints || 1;
      
      // Calculate points based on matches
      sport.matches.forEach(match => {
        if (match.status === 'completed') {
          if (match.team1Score > match.team2Score) {
            teamPoints[match.team1Id] = (teamPoints[match.team1Id] || 0) + winPoints;
          } else if (match.team2Score > match.team1Score) {
            teamPoints[match.team2Id] = (teamPoints[match.team2Id] || 0) + winPoints;
          } else {
            // Draw
            teamPoints[match.team1Id] = (teamPoints[match.team1Id] || 0) + drawPoints;
            teamPoints[match.team2Id] = (teamPoints[match.team2Id] || 0) + drawPoints;
          }
        }
      });
      
      // Sort teams by points
      const sortedTeams = [...sport.teams].sort((a, b) => 
        (teamPoints[b.id] || 0) - (teamPoints[a.id] || 0)
      );
      
      // Assign top three teams
      if (sortedTeams.length > 0) result.first = sortedTeams[0];
      if (sortedTeams.length > 1) result.second = sortedTeams[1];
      if (sortedTeams.length > 2) result.third = sortedTeams[2];
    }
    // For ranking format
    else if (sport.type === 'ranking') {
      // Assuming matches have ranking information or we use a different structure
      // This would need custom logic based on how ranking data is stored
    }
    
    return result;
  } catch (error) {
    console.error('Error determining winners:', error);
    return {};
  }
};
