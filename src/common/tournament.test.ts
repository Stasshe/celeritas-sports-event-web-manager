import { describe, expect, it } from 'vitest';
import { Team } from '../types';
import {
  createConsolationMatches,
  createThirdPlaceMatch,
  createTournamentMatches,
  hasValidTournamentParticipants,
  resolveTournamentParticipants
} from './tournament';

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

describe('resolveTournamentParticipants', () => {
  it('maps each semifinal loser to the matching third-place source', () => {
    const matches = createTournamentMatches(createTeams(4), true);
    const semifinals = matches.filter(match => match.round === 1);
    semifinals[0].status = 'completed';
    semifinals[0].winnerId = semifinals[0].team2Id;
    semifinals[1].status = 'completed';
    semifinals[1].winnerId = semifinals[1].team1Id;

    const resolved = resolveTournamentParticipants(matches);
    const finalMatch = resolved.find(match => match.round === 2 && match.matchNumber === 1);
    const thirdPlaceMatch = resolved.find(match => match.matchNumber === 0);

    expect(finalMatch?.team1Id).toBe(semifinals[0].team2Id);
    expect(finalMatch?.team2Id).toBe(semifinals[1].team1Id);
    expect(thirdPlaceMatch?.team1Id).toBe(semifinals[0].team1Id);
    expect(thirdPlaceMatch?.team2Id).toBe(semifinals[1].team2Id);
  });

  it('replaces stale third-place participants after a semifinal result changes', () => {
    const matches = createTournamentMatches(createTeams(4), true);
    const semifinals = matches.filter(match => match.round === 1);
    semifinals[0].winnerId = semifinals[0].team1Id;
    semifinals[1].winnerId = semifinals[1].team1Id;
    const initiallyResolved = resolveTournamentParticipants(matches);
    const changedMatches = initiallyResolved.map(match => {
      if (match.id !== semifinals[0].id) return match;
      return { ...match, winnerId: match.team2Id };
    });

    const resolvedAgain = resolveTournamentParticipants(changedMatches);
    const thirdPlaceMatch = resolvedAgain.find(match => match.matchNumber === 0);

    expect(thirdPlaceMatch?.team1Id).toBe(semifinals[0].team1Id);
    expect(thirdPlaceMatch?.team2Id).toBe(semifinals[1].team2Id);
  });

  it('resolves a first-round bye into the correct next-round side', () => {
    const matches = createTournamentMatches(createTeams(5), false);
    const bye = matches.find(match => {
      return match.round === 1 && Boolean(match.team1Id) !== Boolean(match.team2Id);
    });

    const resolved = resolveTournamentParticipants(matches);
    const nextMatch = resolved.find(match => {
      return match.round === 2 && match.matchNumber === Math.ceil((bye?.matchNumber || 0) / 2);
    });
    const expectedTeamId = bye?.team1Id || bye?.team2Id;
    const actualTeamId = (bye?.matchNumber || 0) % 2 === 1
      ? nextMatch?.team1Id
      : nextMatch?.team2Id;

    expect(actualTeamId).toBe(expectedTeamId);
  });

  it('keeps a later-round winner unresolved until both participants are known', () => {
    const matches = createTournamentMatches(createTeams(16), false);
    const secondRoundMatch = matches.find(match => {
      return match.round === 2 && match.matchNumber === 3;
    });
    const nextRoundMatch = matches.find(match => {
      return match.round === 3 && match.matchNumber === 2;
    });
    if (!secondRoundMatch || !nextRoundMatch) throw new Error('Expected tournament matches');
    if (secondRoundMatch.team1Source?.type !== 'winner') {
      throw new Error('Expected a winner source');
    }
    const knownParticipantSourceId = secondRoundMatch.team1Source.matchId;
    const knownParticipantSource = matches.find(match => {
      return match.id === knownParticipantSourceId;
    });
    if (!knownParticipantSource) throw new Error('Expected a source match');

    knownParticipantSource.winnerId = knownParticipantSource.team1Id;
    secondRoundMatch.team2Id = '';
    secondRoundMatch.winnerId = '';
    nextRoundMatch.team1Id = knownParticipantSource.team1Id;

    const resolved = resolveTournamentParticipants(matches);
    const resolvedNextRound = resolved.find(match => match.id === nextRoundMatch.id);

    expect(resolvedNextRound?.team1Id).toBe('');
  });
});

describe('hasValidTournamentParticipants', () => {
  it('allows one known team in the first round for a bye', () => {
    const teams = createTeams(2);
    const match = createTournamentMatches(teams, false)[0];
    match.team2Id = '';

    expect(hasValidTournamentParticipants(match, teams)).toBe(true);
  });

  it('rejects an empty first-round match and an incomplete later match', () => {
    const teams = createTeams(2);
    const firstRound = createTournamentMatches(teams, false)[0];
    firstRound.team1Id = '';
    firstRound.team2Id = '';
    const laterMatch = { ...firstRound, round: 2, team1Id: teams[0].id };

    expect(hasValidTournamentParticipants(firstRound, teams)).toBe(false);
    expect(hasValidTournamentParticipants(laterMatch, teams)).toBe(false);
  });
});

describe('createConsolationMatches', () => {
  it('creates a bracket from every playable first-round loser', () => {
    const mainMatches = createTournamentMatches(createTeams(8), false);
    const consolationMatches = createConsolationMatches(mainMatches, false, '2026-07-19');
    const loserSources = consolationMatches.flatMap(match => {
      return [match.team1Source, match.team2Source].flatMap(source => {
        return source?.type === 'loser' ? [source] : [];
      });
    });

    expect(consolationMatches).toHaveLength(3);
    expect(loserSources).toHaveLength(4);
    expect(new Set(loserSources.map(source => source?.matchId))).toEqual(
      new Set(mainMatches.filter(match => match.round === 1).map(match => match.id))
    );
    expect(consolationMatches.every(match => match.bracket === 'consolation')).toBe(true);
  });

  it('adds second-round losers without fake team IDs', () => {
    const mainMatches = createTournamentMatches(createTeams(8), false);
    const consolationMatches = createConsolationMatches(mainMatches, true);
    const loserSources = consolationMatches.flatMap(match => {
      return [match.team1Source, match.team2Source].flatMap(source => {
        return source?.type === 'loser' ? [source] : [];
      });
    });

    expect(consolationMatches).toHaveLength(7);
    expect(loserSources).toHaveLength(6);
    expect(consolationMatches.flatMap(match => [match.team1Id, match.team2Id]).every(id => id === ''))
      .toBe(true);
  });

  it('excludes third-place participants from the consolation bracket', () => {
    const mainMatches = createTournamentMatches(createTeams(8), true);
    const consolationMatches = createConsolationMatches(mainMatches, true);
    const loserSourceIds = consolationMatches.flatMap(match => {
      return [match.team1Source, match.team2Source].flatMap(source => {
        if (source?.type === 'loser') return [source.matchId];
        return [];
      });
    });
    const semifinalIds = mainMatches
      .filter(match => match.round === 2 && match.matchNumber !== 0)
      .map(match => match.id);

    expect(consolationMatches).toHaveLength(3);
    semifinalIds.forEach(id => {
      expect(loserSourceIds).not.toContain(id);
    });
  });

  it('resolves semifinal losers into a two-team consolation final', () => {
    const mainMatches = createTournamentMatches(createTeams(4), false);
    mainMatches.filter(match => match.round === 1).forEach(match => {
      match.status = 'completed';
      match.winnerId = match.team1Id;
    });
    const consolationMatches = createConsolationMatches(mainMatches, false);

    const resolved = resolveTournamentParticipants([...mainMatches, ...consolationMatches]);
    const consolationFinal = resolved.find(match => match.bracket === 'consolation');

    expect(consolationFinal?.team1Id).toBe(mainMatches[0].team2Id);
    expect(consolationFinal?.team2Id).toBe(mainMatches[1].team2Id);
  });
});
