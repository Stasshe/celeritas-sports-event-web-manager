import * as ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import { Match, Sport, Team } from '../../types';
import { exportTournament } from './TournamentExporter';

const teams: Team[] = [
  { id: 'grade-class', name: 'grade3-3-6' },
  { id: 'letter-class', name: 'grade1-H' },
  { id: 'custom', name: 'grade4-M' }
];

const createMatch = (values: Partial<Match>): Match => ({
  id: 'match',
  team1Id: '',
  team2Id: '',
  team1Score: 0,
  team2Score: 0,
  round: 1,
  matchNumber: 1,
  status: 'scheduled',
  ...values
});

const createSport = (matches: Match[]): Sport => ({
  id: 'sport',
  name: 'Sport',
  eventId: 'event',
  type: 'tournament',
  teams,
  matches,
  tournamentSettings: {
    hasThirdPlaceMatch: false,
    hasRepechage: false
  },
  leagueSettings: {
    blockCount: 2,
    advancingTeams: 1,
    hasPlayoff: false,
    hasThirdPlaceMatch: false
  },
  lastEditedBy: undefined
});

const getCellValues = (sheet: ExcelJS.Worksheet): unknown[] => {
  const values: unknown[] = [];
  sheet.eachRow(row => {
    row.eachCell(cell => values.push(cell.value));
  });
  return values;
};

describe('exportTournament participant names', () => {
  it('uses the same class labels as tournament and schedule views', async () => {
    const semifinal = createMatch({
      id: 'semifinal',
      team1Id: 'grade-class',
      team2Id: 'letter-class'
    });
    const final = createMatch({
      id: 'final',
      round: 2,
      team1Source: { type: 'winner', matchId: 'semifinal' },
      team2Id: 'custom'
    });
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Tournament');

    await exportTournament(sheet, createSport([semifinal, final]));

    const values = getCellValues(sheet);
    expect(values).toContain('3-6');
    expect(values).toContain('H');
    expect(values).toContain('grade4-M');
    expect(values).toContain('準決勝 #1の勝者');
    expect(values).not.toContain('grade3-3-6');
    expect(values).not.toContain('grade1-H');
  });

  it('exports resolved winners and unknown team IDs without leaking IDs', async () => {
    const semifinal = createMatch({
      id: 'semifinal',
      team1Id: 'grade-class',
      team2Id: 'letter-class',
      winnerId: 'letter-class',
      status: 'completed'
    });
    const final = createMatch({
      id: 'final',
      round: 2,
      team1Source: { type: 'winner', matchId: 'semifinal' },
      team2Id: 'missing-team'
    });
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Tournament');

    await exportTournament(sheet, createSport([semifinal, final]));

    const values = getCellValues(sheet);
    expect(values).toContain('H');
    expect(values).toContain('不明なチーム');
    expect(values).not.toContain('missing-team');
  });
});
