import { describe, expect, it } from 'vitest';
import { Match, Sport, Team } from '../types';
import { getMatchContext, getMatchupLabel, getParticipantName, getTeamDisplayName } from './match';

const teams: Team[] = [
  { id: 'a', name: 'grade3-3-6' },
  { id: 'b', name: '2-1' },
  { id: 'c', name: '1-4' },
  { id: 'd', name: '1-5' }
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

const createSport = (matches: Match[], type: Sport['type'] = 'tournament'): Sport => ({
  id: 'sport',
  name: 'Sport',
  eventId: 'event',
  type,
  teams,
  matches,
  leagueSettings: {
    blockCount: 2,
    advancingTeams: 1,
    hasPlayoff: true,
    hasThirdPlaceMatch: true
  },
  lastEditedBy: undefined
});

describe('match display resolution', () => {
  it.each([
    ['grade1-H', 'H'],
    ['grade3-3-6', '3-6'],
    ['grade4-M', 'grade4-M'],
    ['upgrade1-H', 'upgrade1-H'],
    ['', '']
  ])('formats the team name %j as %j', (name, expected) => {
    expect(getTeamDisplayName({ id: 'team', name })).toBe(expected);
  });

  it('hides internal grade prefixes from team names', () => {
    const match = createMatch({ team1Id: 'a', team2Id: 'b' });
    expect(getMatchupLabel(match, createSport([match]))).toBe('3-6 vs 2-1');
  });

  it('changes a winner reference to the actual team after completion', () => {
    const semifinal = createMatch({
      id: 'semi',
      team1Id: 'a',
      team2Id: 'b',
      winnerId: 'b',
      status: 'completed'
    });
    const final = createMatch({
      id: 'final',
      round: 2,
      team1Source: { type: 'winner', matchId: 'semi' }
    });
    const sport = createSport([semifinal, final]);

    expect(getParticipantName(final, 'team1', sport)).toBe('2-1');
  });

  it('changes a loser reference to the actual semifinal loser', () => {
    const semifinal = createMatch({
      id: 'semi',
      team1Id: 'c',
      team2Id: 'd',
      winnerId: 'd',
      status: 'completed'
    });
    const thirdPlace = createMatch({
      id: 'third_place_match',
      round: 2,
      matchNumber: 0,
      team1Source: { type: 'loser', matchId: 'semi' }
    });
    const sport = createSport([semifinal, thirdPlace]);

    expect(getParticipantName(thirdPlace, 'team1', sport)).toBe('1-4');
    expect(getMatchContext(thirdPlace, sport)).toBe('3位決定戦');
  });

  it('shows a block rank instead of a fake team ID', () => {
    const playoff = createMatch({
      team1Source: { type: 'blockRank', blockId: 'block_2', rank: 3 }
    });
    expect(getParticipantName(playoff, 'team1', createSport([playoff], 'league')))
      .toBe('ブロック2 3位');
  });
});
