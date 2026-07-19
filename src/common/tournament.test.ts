import { describe, expect, it } from 'vitest';
import { Team } from '../types';
import { createThirdPlaceMatch, createTournamentMatches } from './tournament';

const createTeams = (count: number): Team[] => {
  return Array.from({ length: count }, (_, index) => ({
    id: `team_${index + 1}`,
    name: `${index + 1}-A`
  }));
};

describe('createTournamentMatches', () => {
  it.each([
    { teamCount: 1, rounds: 0, mainMatches: 0, byes: 0 },
    { teamCount: 2, rounds: 1, mainMatches: 1, byes: 0 },
    { teamCount: 3, rounds: 2, mainMatches: 3, byes: 1 },
    { teamCount: 4, rounds: 2, mainMatches: 3, byes: 0 },
    { teamCount: 5, rounds: 3, mainMatches: 7, byes: 3 },
    { teamCount: 8, rounds: 3, mainMatches: 7, byes: 0 }
  ])('creates a complete bracket for $teamCount teams', ({ teamCount, rounds, mainMatches, byes }) => {
    const matches = createTournamentMatches(createTeams(teamCount), false, '2026-07-19');
    const firstRoundMatches = matches.filter(match => match.round === 1);
    const seededMatches = firstRoundMatches.filter(match => {
      return Boolean(match.team1Id) !== Boolean(match.team2Id);
    });

    expect(matches).toHaveLength(mainMatches);
    expect(Math.max(0, ...matches.map(match => match.round))).toBe(rounds);
    expect(seededMatches).toHaveLength(byes);
    expect(new Set(matches.map(match => match.id)).size).toBe(matches.length);
  });

  it('places every team exactly once in the first round', () => {
    const teams = createTeams(5);
    const matches = createTournamentMatches(teams, false);
    const firstRoundTeamIds = matches
      .filter(match => match.round === 1)
      .flatMap(match => [match.team1Id, match.team2Id])
      .filter(Boolean);

    expect(firstRoundTeamIds).toHaveLength(teams.length);
    expect(new Set(firstRoundTeamIds)).toEqual(new Set(teams.map(team => team.id)));
  });

  it('advances each bye team to the correct side of round two', () => {
    const matches = createTournamentMatches(createTeams(5), false);
    const byeMatches = matches.filter(match => {
      return match.round === 1 && Boolean(match.team1Id) !== Boolean(match.team2Id);
    });

    byeMatches.forEach(match => {
      const nextMatch = matches.find(candidate => {
        return candidate.round === 2 && candidate.matchNumber === Math.ceil(match.matchNumber / 2);
      });
      const expectedTeamId = match.team1Id || match.team2Id;
      let actualTeamId = nextMatch?.team2Id;
      if (match.matchNumber % 2 === 1) actualTeamId = nextMatch?.team1Id;
      expect(actualTeamId).toBe(expectedTeamId);
    });
  });

  it('links every later participant to the correct previous match', () => {
    const matches = createTournamentMatches(createTeams(8), false);
    const laterMatches = matches.filter(match => match.round > 1);

    laterMatches.forEach(match => {
      const expectedPreviousMatches = [
        matches.find(candidate => {
          return candidate.round === match.round - 1 && candidate.matchNumber === match.matchNumber * 2 - 1;
        })?.id,
        matches.find(candidate => {
          return candidate.round === match.round - 1 && candidate.matchNumber === match.matchNumber * 2;
        })?.id
      ];
      expect(match.previousMatches).toEqual(expectedPreviousMatches);
      expect(match.team1Source).toEqual({ type: 'winner', matchId: expectedPreviousMatches[0] });
      expect(match.team2Source).toEqual({ type: 'winner', matchId: expectedPreviousMatches[1] });
    });
  });

  it('creates a third-place match from exactly the two semifinal losers', () => {
    const matches = createTournamentMatches(createTeams(8), true, '2026-07-19');
    const thirdPlaceMatch = matches.find(match => match.matchNumber === 0);
    const semifinalMatches = matches.filter(match => match.round === 2);

    expect(thirdPlaceMatch).toBeDefined();
    expect(thirdPlaceMatch?.round).toBe(3);
    expect(thirdPlaceMatch?.previousMatches).toEqual(semifinalMatches.map(match => match.id));
    expect(thirdPlaceMatch?.team1Source).toEqual({
      type: 'loser',
      matchId: semifinalMatches[0].id
    });
    expect(thirdPlaceMatch?.team2Source).toEqual({
      type: 'loser',
      matchId: semifinalMatches[1].id
    });
  });

  it('does not create a third-place match below four teams', () => {
    const matches = createTournamentMatches(createTeams(3), true);
    expect(matches.some(match => match.matchNumber === 0)).toBe(false);
  });
});

describe('createThirdPlaceMatch', () => {
  it('returns undefined when a bracket has no two-match semifinal', () => {
    const finalOnly = createTournamentMatches(createTeams(2), false);
    expect(createThirdPlaceMatch(finalOnly)).toBeUndefined();
  });
});
