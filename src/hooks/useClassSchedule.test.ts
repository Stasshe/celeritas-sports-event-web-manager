import { describe, expect, it } from 'vitest';
import { createConsolationMatches, createTournamentMatches } from '../common/tournament';
import { Event, ScheduleSettings, Sport, Team } from '../types';
import { generateSchedule } from '../utils/scheduleGenerator';
import { buildClassSchedule } from './useClassSchedule';

const event: Event = {
  id: 'event',
  name: 'Event',
  date: '2026-07-19',
  description: '',
  isActive: true,
  sports: []
};

const settings: ScheduleSettings = {
  startTime: '09:00',
  endTime: '12:00',
  matchDuration: 20,
  breakDuration: 5,
  courtCount: 2,
  lunchBreak: null,
  breakTimes: []
};

const createTournament = (): Sport => {
  const teams: Team[] = ['A', 'B', 'C', 'D'].map(name => ({
    id: `team_${name}`,
    name
  }));
  const sport: Sport = {
    id: 'tournament',
    name: 'Tournament',
    eventId: event.id,
    type: 'tournament',
    teams,
    matches: createTournamentMatches(teams, true, event.date),
    leagueSettings: {
      blockCount: 0,
      advancingTeams: 0,
      hasPlayoff: false,
      hasThirdPlaceMatch: false
    },
    lastEditedBy: undefined
  };
  return {
    ...sport,
    scheduleSettings: {
      ...settings,
      timeSlots: generateSchedule(sport, settings, false)
    }
  };
};

describe('buildClassSchedule', () => {
  it('includes future tournament matches reachable by winner and loser sources', () => {
    const sport = createTournament();
    const entries = buildClassSchedule([sport], event, ['A']);
    const teamFirstRoundMatch = sport.matches.find(match => {
      return match.team1Id === 'team_A' || match.team2Id === 'team_A';
    });

    expect(entries.map(entry => entry.matchId)).toEqual(expect.arrayContaining([
      teamFirstRoundMatch!.id,
      'match_3',
      'third_place_match'
    ]));
    expect(entries.find(entry => entry.matchId === teamFirstRoundMatch!.id)?.status).not.toBe('potential');
    expect(entries.find(entry => entry.matchId === 'match_3')?.status).toBe('potential');
    expect(entries.find(entry => entry.matchId === 'third_place_match')?.status).toBe('potential');
  });

  it('includes possible consolation matches and its third-place match', () => {
    const teams: Team[] = Array.from({ length: 8 }, (_, index) => ({
      id: `team_${index + 1}`,
      name: `${index + 1}-A`
    }));
    const mainMatches = createTournamentMatches(teams, true, event.date);
    const consolationMatches = createConsolationMatches(mainMatches, true, true, event.date);
    const sport: Sport = {
      id: 'tournament-with-consolation',
      name: 'Tournament with consolation',
      eventId: event.id,
      type: 'tournament',
      teams,
      matches: [...mainMatches, ...consolationMatches],
      leagueSettings: {
        blockCount: 0,
        advancingTeams: 0,
        hasPlayoff: false,
        hasThirdPlaceMatch: false
      },
      lastEditedBy: undefined
    };
    sport.scheduleSettings = {
      ...settings,
      timeSlots: generateSchedule(sport, settings, false)
    };

    const entries = buildClassSchedule([sport], event, ['1-A']);
    const consolationEntries = entries.filter(entry => {
      return sport.matches.find(match => match.id === entry.matchId)?.bracket === 'consolation';
    });

    expect(consolationEntries.length).toBeGreaterThan(0);
    expect(consolationEntries.every(entry => entry.status === 'potential')).toBe(true);
    expect(consolationEntries.some(entry => {
      return entry.matchId === 'consolation_third_place_match';
    })).toBe(true);
  });

  it('does not include an unrelated first-round branch', () => {
    const sport = createTournament();
    const entries = buildClassSchedule([sport], event, ['A']);
    const unrelatedMatch = sport.matches.find(match => {
      return match.round === 1 && match.team1Id !== 'team_A' && match.team2Id !== 'team_A';
    });

    expect(entries.some(entry => entry.matchId === unrelatedMatch?.id)).toBe(false);
  });

  it('returns all scheduled matches when no class filter is selected', () => {
    const sport = createTournament();
    const entries = buildClassSchedule([sport], event, []);
    const scheduledMatchCount = sport.scheduleSettings?.timeSlots?.filter(slot => {
      return slot.type === 'match';
    }).length;

    expect(entries).toHaveLength(scheduledMatchCount || 0);
  });

  it('ignores non-tournament sports', () => {
    const sport = createTournament();
    sport.type = 'league';

    expect(buildClassSchedule([sport], event, ['A'])).toEqual([]);
  });

  it('ignores a broken participant source without creating a phantom entry', () => {
    const sport = createTournament();
    const finalMatch = sport.matches.find(match => match.id === 'match_3')!;
    finalMatch.team1Source = { type: 'winner', matchId: 'missing' };
    finalMatch.team2Source = { type: 'winner', matchId: 'missing' };
    finalMatch.team1Id = '';
    finalMatch.team2Id = '';

    const entries = buildClassSchedule([sport], event, ['A']);

    expect(entries.some(entry => entry.matchId === finalMatch.id)).toBe(false);
  });
});
