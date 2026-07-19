import { describe, expect, it } from 'vitest';
import { Match, ScheduleSettings, Sport, Team, TimeSlot } from '../types';
import { createTournamentMatches } from '../common/tournament';
import { generateSchedule, timeToMinutes } from './scheduleGenerator';

const createTeams = (count: number): Team[] => {
  return Array.from({ length: count }, (_, index) => ({
    id: `team_${index + 1}`,
    name: `${index + 1}-A`
  }));
};

const createSport = (
  type: Sport['type'],
  teams: Team[],
  matches: Match[]
): Sport => ({
  id: 'sport',
  name: 'Sport',
  eventId: 'event',
  type,
  teams,
  matches,
  leagueSettings: {
    blockCount: 2,
    advancingTeams: 1,
    hasPlayoff: type === 'league',
    hasThirdPlaceMatch: true
  },
  lastEditedBy: undefined
});

const createSettings = (values: Partial<ScheduleSettings> = {}): ScheduleSettings => ({
  startTime: '09:00',
  endTime: '18:00',
  matchDuration: 20,
  breakDuration: 5,
  courtCount: 1,
  breakTimes: [],
  lunchBreak: null,
  ...values
});

const getMatchSlots = (slots: TimeSlot[]): TimeSlot[] => {
  return slots.filter(slot => slot.type === 'match');
};

const createRoundRobinMatches = (teams: Team[]): Match[] => {
  return [
    ['m1', teams[0].id, teams[1].id],
    ['m2', teams[2].id, teams[3].id],
    ['m3', teams[0].id, teams[2].id],
    ['m4', teams[1].id, teams[3].id]
  ].map(([id, team1Id, team2Id], index) => ({
    id,
    team1Id,
    team2Id,
    team1Score: 0,
    team2Score: 0,
    round: 1,
    matchNumber: index + 1,
    status: 'scheduled'
  }));
};

describe('generateSchedule tournament constraints', () => {
  it.each([3, 5, 6, 7])('never schedules first-round byes for %i teams', teamCount => {
    const teams = createTeams(teamCount);
    const matches = createTournamentMatches(teams, true);
    const sport = createSport('tournament', teams, matches);
    const seededMatchIds = matches.filter(match => {
      return match.round === 1 && Boolean(match.team1Id) !== Boolean(match.team2Id);
    }).map(match => match.id);

    const scheduledIds = getMatchSlots(generateSchedule(sport, createSettings()))
      .map(slot => slot.matchId);

    expect(scheduledIds).not.toEqual(expect.arrayContaining(seededMatchIds));
    expect(scheduledIds).toHaveLength(matches.length - seededMatchIds.length);
  });

  it('schedules the third-place match before the final on one court', () => {
    const teams = createTeams(8);
    const sport = createSport('tournament', teams, createTournamentMatches(teams, true));
    const matchSlots = getMatchSlots(generateSchedule(sport, createSettings()));
    const closingSlots = matchSlots.slice(-2);

    expect(closingSlots.map(slot => slot.matchId)).toEqual(['third_place_match', 'match_7']);
    expect(closingSlots[0].courtId).toBe('court1');
    expect(timeToMinutes(closingSlots[1].startTime)).toBe(
      timeToMinutes(closingSlots[0].endTime) + 5
    );
  });

  it('runs the third-place match and final simultaneously on two courts', () => {
    const teams = createTeams(8);
    const sport = createSport('tournament', teams, createTournamentMatches(teams, true));
    const slots = getMatchSlots(generateSchedule(sport, createSettings({ courtCount: 2 })));
    const finalSlot = slots.find(slot => slot.matchId === 'match_7');
    const thirdPlaceSlot = slots.find(slot => slot.matchId === 'third_place_match');

    expect(finalSlot?.startTime).toBe(thirdPlaceSlot?.startTime);
    expect(new Set([finalSlot?.courtId, thirdPlaceSlot?.courtId])).toEqual(
      new Set(['court1', 'court2'])
    );
  });

  it('does not schedule matches from a later round before an earlier round finishes', () => {
    const teams = createTeams(8);
    const matches = createTournamentMatches(teams, false);
    const sport = createSport('tournament', teams, matches);
    const slots = getMatchSlots(generateSchedule(sport, createSettings({ courtCount: 2 })));

    for (let round = 2; round <= 3; round++) {
      const previousIds = new Set(
        matches.filter(match => match.round === round - 1).map(match => match.id)
      );
      const currentIds = new Set(
        matches.filter(match => match.round === round).map(match => match.id)
      );
      const previousEnd = Math.max(
        ...slots.filter(slot => previousIds.has(slot.matchId || '')).map(slot => timeToMinutes(slot.endTime))
      );
      const currentStart = Math.min(
        ...slots.filter(slot => currentIds.has(slot.matchId || '')).map(slot => timeToMinutes(slot.startTime))
      );
      expect(currentStart).toBeGreaterThanOrEqual(previousEnd);
    }
  });
});

describe('generateSchedule court and time constraints', () => {
  it('never places the same team on both courts at once', () => {
    const teams = createTeams(4);
    const matches = createRoundRobinMatches(teams);
    const sport = createSport('roundRobin', teams, matches);
    const slots = getMatchSlots(generateSchedule(sport, createSettings({ courtCount: 2 }), false));
    const matchesById = new Map(matches.map(match => [match.id, match]));
    const slotsByTime = new Map<string, TimeSlot[]>();
    slots.forEach(slot => {
      const concurrentSlots = slotsByTime.get(slot.startTime) || [];
      concurrentSlots.push(slot);
      slotsByTime.set(slot.startTime, concurrentSlots);
    });

    slotsByTime.forEach(concurrentSlots => {
      const teamIds = concurrentSlots.flatMap(slot => {
        const match = matchesById.get(slot.matchId || '');
        if (!match) return [];
        return [match.team1Id, match.team2Id];
      });
      expect(new Set(teamIds).size).toBe(teamIds.length);
    });
  });

  it('moves a match past lunch when it would overlap the boundary', () => {
    const teams = createTeams(2);
    const matches = createRoundRobinMatches(createTeams(4)).slice(0, 1);
    matches[0].team1Id = teams[0].id;
    matches[0].team2Id = teams[1].id;
    const sport = createSport('roundRobin', teams, matches);
    const settings = createSettings({
      startTime: '11:50',
      lunchBreak: { startTime: '12:00', endTime: '13:00' }
    });

    const matchSlot = getMatchSlots(generateSchedule(sport, settings, false))[0];
    expect(matchSlot.startTime).toBe('13:00');
    expect(matchSlot.endTime).toBe('13:20');
  });

  it('allows a match to end exactly when lunch begins', () => {
    const teams = createTeams(4);
    const sport = createSport('roundRobin', teams, createRoundRobinMatches(teams).slice(0, 1));
    const settings = createSettings({
      startTime: '11:40',
      lunchBreak: { startTime: '12:00', endTime: '13:00' }
    });

    const matchSlot = getMatchSlots(generateSchedule(sport, settings, false))[0];
    expect(matchSlot.startTime).toBe('11:40');
    expect(matchSlot.endTime).toBe('12:00');
  });

  it('allows a match to start exactly when a custom break ends', () => {
    const teams = createTeams(4);
    const sport = createSport('roundRobin', teams, createRoundRobinMatches(teams).slice(0, 1));
    const settings = createSettings({
      startTime: '10:00',
      breakTimes: [{ startTime: '09:40', endTime: '10:00', type: 'break' }]
    });

    const matchSlot = getMatchSlots(generateSchedule(sport, settings, false))[0];
    expect(matchSlot.startTime).toBe('10:00');
  });

  it('uses the configured league durations for each stage', () => {
    const teams = createTeams(4);
    const groupMatch: Match = {
      ...createRoundRobinMatches(teams)[0],
      blockId: 'block_1'
    };
    const playoffMatch: Match = {
      ...createRoundRobinMatches(teams)[1],
      id: 'playoff_match_1_1',
      blockId: undefined
    };
    const sport = createSport('league', teams, [groupMatch, playoffMatch]);
    const settings = {
      ...createSettings(),
      groupStageDuration: 12,
      playoffDuration: 18,
      breakBetweenStages: 7
    };

    const slots = generateSchedule(sport, settings, false);
    const groupSlot = slots.find(slot => slot.matchId === groupMatch.id);
    const playoffSlot = slots.find(slot => slot.matchId === playoffMatch.id);

    expect(timeToMinutes(groupSlot!.endTime) - timeToMinutes(groupSlot!.startTime)).toBe(12);
    expect(timeToMinutes(playoffSlot!.endTime) - timeToMinutes(playoffSlot!.startTime)).toBe(18);
  });

  it('runs independent league blocks simultaneously on two courts', () => {
    const teams = createTeams(4);
    const baseMatches = createRoundRobinMatches(teams);
    const matches: Match[] = [
      { ...baseMatches[0], blockId: 'block_1' },
      { ...baseMatches[1], blockId: 'block_2' }
    ];
    const sport = createSport('league', teams, matches);
    const settings = {
      ...createSettings({ courtCount: 2 }),
      groupStageDuration: 12,
      playoffDuration: 18,
      breakBetweenStages: 7
    };

    const slots = getMatchSlots(generateSchedule(sport, settings, false));
    expect(slots.map(slot => slot.startTime)).toEqual(['09:00', '09:00']);
    expect(new Set(slots.map(slot => slot.courtId))).toEqual(new Set(['court1', 'court2']));
  });

  it('throws instead of silently dropping matches when time is insufficient', () => {
    const teams = createTeams(4);
    const sport = createSport('roundRobin', teams, createRoundRobinMatches(teams));
    const settings = createSettings({ startTime: '09:00', endTime: '09:30' });

    expect(() => generateSchedule(sport, settings, false)).toThrow(
      '時間内にすべての試合をスケジュールできません'
    );
  });

  it('preserves the existing match order while recalculating times', () => {
    const teams = createTeams(4);
    const matches = createRoundRobinMatches(teams);
    const sport = createSport('roundRobin', teams, matches);
    const requestedOrder = ['m3', 'm1', 'm4', 'm2'];

    const slots = generateSchedule(sport, createSettings(), false, requestedOrder);
    expect(getMatchSlots(slots).map(slot => slot.matchId)).toEqual(requestedOrder);
  });
});
