import { describe, expect, it } from 'vitest';
import { LeagueBlock, Match, Team } from '../../../../types';
import { LeaguePlayoffHelper } from './LeaguePlayoffHelper';

const teams: Team[] = [
  { id: 'a1', name: 'A1' },
  { id: 'a2', name: 'A2' },
  { id: 'b1', name: 'B1' },
  { id: 'b2', name: 'B2' }
];

const createGroupMatch = (
  id: string,
  team1Id: string,
  team2Id: string,
  blockId: string,
  completed: boolean
): Match => {
  if (completed) {
    return {
      id,
      team1Id,
      team2Id,
      team1Score: 2,
      team2Score: 0,
      winnerId: team1Id,
      round: 1,
      matchNumber: 1,
      blockId,
      status: 'completed'
    };
  }
  return {
    id,
    team1Id,
    team2Id,
    team1Score: 0,
    team2Score: 0,
    round: 1,
    matchNumber: 1,
    blockId,
    status: 'scheduled'
  };
};

const createBlocks = (completed: boolean): LeagueBlock[] => [
  {
    id: 'block_1',
    name: 'Block 1',
    teamIds: ['a1', 'a2'],
    matches: [createGroupMatch('group_a', 'a1', 'a2', 'block_1', completed)]
  },
  {
    id: 'block_2',
    name: 'Block 2',
    teamIds: ['b1', 'b2'],
    matches: [createGroupMatch('group_b', 'b1', 'b2', 'block_2', completed)]
  }
];

describe('LeaguePlayoffHelper.generatePlayoffTournament', () => {
  it('uses block-rank sources instead of fake team IDs before groups finish', () => {
    const result = LeaguePlayoffHelper.generatePlayoffTournament(
      createBlocks(false),
      teams,
      2,
      true
    );
    const firstRoundMatches = result.matches.filter(match => match.round === 1);

    expect(result.success).toBe(true);
    expect(firstRoundMatches).toHaveLength(2);
    firstRoundMatches.forEach(match => {
      expect(match.team1Id).toBe('');
      expect(match.team2Id).toBe('');
      expect(match.team1Source?.type).toBe('blockRank');
      expect(match.team2Source?.type).toBe('blockRank');
    });
    const hasFakeTeamId = result.matches
      .flatMap(match => [match.team1Id, match.team2Id])
      .some(teamId => teamId.startsWith('tbd_'));
    expect(hasFakeTeamId).toBe(false);
  });

  it('creates later rounds from winner sources and third place from loser sources', () => {
    const result = LeaguePlayoffHelper.generatePlayoffTournament(
      createBlocks(false),
      teams,
      2,
      true
    );
    const finalMatch = result.matches.find(match => match.round === 2 && match.matchNumber === 1);
    const thirdPlaceMatch = result.matches.find(match => match.matchNumber === 0);

    expect(finalMatch?.team1Source?.type).toBe('winner');
    expect(finalMatch?.team2Source?.type).toBe('winner');
    expect(thirdPlaceMatch?.team1Source?.type).toBe('loser');
    expect(thirdPlaceMatch?.team2Source?.type).toBe('loser');
    expect(thirdPlaceMatch?.previousMatches).toEqual(finalMatch?.previousMatches);
  });

  it('uses actual qualified teams after every group match is complete', () => {
    const result = LeaguePlayoffHelper.generatePlayoffTournament(
      createBlocks(true),
      teams,
      2,
      false
    );
    const firstRoundTeams = result.matches
      .filter(match => match.round === 1)
      .flatMap(match => [match.team1Id, match.team2Id]);

    expect(new Set(firstRoundTeams)).toEqual(new Set(teams.map(team => team.id)));
    expect(result.matches.some(match => match.team1Source?.type === 'blockRank')).toBe(false);
    expect(result.matches.some(match => match.team2Source?.type === 'blockRank')).toBe(false);
  });
});

describe('LeaguePlayoffHelper.resolveBlockRankSources', () => {
  const qualifierMatch: Match = {
    id: 'qualifier',
    team1Id: '',
    team2Id: '',
    team1Score: 0,
    team2Score: 0,
    round: 1,
    matchNumber: 1,
    status: 'scheduled',
    team1Source: { type: 'blockRank', blockId: 'block_1', rank: 1 },
    team2Source: { type: 'blockRank', blockId: 'block_2', rank: 2 }
  };

  it('keeps qualifiers unresolved while any match in their block is pending', () => {
    const [resolvedMatch] = LeaguePlayoffHelper.resolveBlockRankSources(
      [qualifierMatch],
      createBlocks(false)
    );
    expect(resolvedMatch.team1Id).toBe('');
    expect(resolvedMatch.team2Id).toBe('');
  });

  it('resolves the requested rank only after blocks complete', () => {
    const [resolvedMatch] = LeaguePlayoffHelper.resolveBlockRankSources(
      [qualifierMatch],
      createBlocks(true)
    );
    expect(resolvedMatch.team1Id).toBe('a1');
    expect(resolvedMatch.team2Id).toBe('b2');
  });
});
