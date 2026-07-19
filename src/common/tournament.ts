import { Match, Team } from '../types';
import { TournamentStructureHelper } from './TournamentStructureHelper';

const getDate = (): string => new Date().toISOString().split('T')[0];

export const createThirdPlaceMatch = (
  matches: Match[],
  date: string = getDate()
): Match | undefined => {
  if (matches.length === 0) return undefined;

  const maxRound = Math.max(...matches.map(match => match.round));
  const semifinalMatches = matches.filter(match => match.round === maxRound - 1);
  if (semifinalMatches.length !== 2) return undefined;

  return {
    id: 'third_place_match',
    round: maxRound,
    matchNumber: 0,
    team1Id: '',
    team2Id: '',
    team1Score: 0,
    team2Score: 0,
    status: 'scheduled',
    date,
    previousMatches: semifinalMatches.map(match => match.id),
    team1Source: { type: 'loser', matchId: semifinalMatches[0].id },
    team2Source: { type: 'loser', matchId: semifinalMatches[1].id }
  };
};

export const createTournamentMatches = (
  teams: Team[],
  hasThirdPlaceMatch: boolean,
  date: string = getDate()
): Match[] => {
  const structure = TournamentStructureHelper.generateInitialMatches(teams.length);
  const placements = TournamentStructureHelper.calculateTeamPlacements(teams);
  const getMatchId = (round: number, matchNumber: number): string => {
    const index = structure.findIndex(match => {
      return match.round === round && match.matchNumber === matchNumber;
    });
    return `match_${index + 1}`;
  };

  const matches = structure.map((match, index): Match => {
    const matchPlacements = placements.filter(placement => {
      return placement.round === match.round && placement.matchNumber === match.matchNumber;
    });
    const team1Placement = matchPlacements.find(placement => placement.position === 'team1');
    const team2Placement = matchPlacements.find(placement => placement.position === 'team2');

    const createdMatch: Match = {
      id: `match_${index + 1}`,
      round: match.round,
      matchNumber: match.matchNumber,
      team1Id: team1Placement?.teamId || '',
      team2Id: team2Placement?.teamId || '',
      team1Score: 0,
      team2Score: 0,
      status: 'scheduled',
      date,
      winnerId: ''
    };

    if (match.round > 1) {
      const firstPreviousId = getMatchId(match.round - 1, match.matchNumber * 2 - 1);
      const secondPreviousId = getMatchId(match.round - 1, match.matchNumber * 2);
      createdMatch.previousMatches = [firstPreviousId, secondPreviousId];
      createdMatch.team1Source = { type: 'winner', matchId: firstPreviousId };
      createdMatch.team2Source = { type: 'winner', matchId: secondPreviousId };
    }
    return createdMatch;
  });

  matches.forEach(match => {
    if (match.round !== 1) return;
    const hasTeam1 = Boolean(match.team1Id);
    const hasTeam2 = Boolean(match.team2Id);
    if (hasTeam1 === hasTeam2) return;

    const nextMatch = matches.find(candidate => {
      return candidate.round === 2 && candidate.matchNumber === Math.ceil(match.matchNumber / 2);
    });
    if (!nextMatch) return;

    const winningTeamId = match.team1Id || match.team2Id;
    if (match.matchNumber % 2 !== 0) {
      nextMatch.team1Id = winningTeamId;
    } else {
      nextMatch.team2Id = winningTeamId;
    }
  });

  if (hasThirdPlaceMatch && teams.length >= 4) {
    const thirdPlaceMatch = createThirdPlaceMatch(matches, date);
    if (thirdPlaceMatch) matches.push(thirdPlaceMatch);
  }
  return matches;
};
