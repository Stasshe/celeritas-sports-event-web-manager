import { Match, MatchParticipantSource, Team } from '../types';
import { TournamentStructureHelper } from './TournamentStructureHelper';

const getDate = (): string => new Date().toISOString().split('T')[0];

const resolveSourceTeamId = (
  source: MatchParticipantSource,
  matchesById: Map<string, Match>
): string => {
  if (source.type === 'blockRank') return '';

  const previousMatch = matchesById.get(source.matchId);
  if (!previousMatch) return '';

  if (source.type === 'winner') {
    if (previousMatch.winnerId) return previousMatch.winnerId;
    const participants = [previousMatch.team1Id, previousMatch.team2Id].filter(Boolean);
    if (participants.length === 1) return participants[0];
    return '';
  }

  if (!previousMatch.winnerId) return '';
  if (previousMatch.team1Id === previousMatch.winnerId) return previousMatch.team2Id;
  if (previousMatch.team2Id === previousMatch.winnerId) return previousMatch.team1Id;
  return '';
};

export const resolveTournamentParticipants = (matches: Match[]): Match[] => {
  const resolvedMatches = matches.map(match => ({ ...match }));
  const matchesById = new Map(resolvedMatches.map(match => [match.id, match]));

  [...resolvedMatches]
    .sort((first, second) => first.round - second.round)
    .forEach(match => {
      if (match.team1Source?.type === 'winner' || match.team1Source?.type === 'loser') {
        match.team1Id = resolveSourceTeamId(match.team1Source, matchesById);
      }
      if (match.team2Source?.type === 'winner' || match.team2Source?.type === 'loser') {
        match.team2Id = resolveSourceTeamId(match.team2Source, matchesById);
      }
    });

  return resolvedMatches;
};

export const hasValidTournamentParticipants = (match: Match, teams: Team[]): boolean => {
  if (match.matchNumber === 0 || match.id.includes('third_place')) return true;
  const teamIds = new Set(teams.map(team => team.id));
  const hasTeam1 = teamIds.has(match.team1Id);
  const hasTeam2 = teamIds.has(match.team2Id);
  if (match.round === 1) return hasTeam1 || hasTeam2;
  return hasTeam1 && hasTeam2;
};

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

export const createConsolationMatches = (
  mainMatches: Match[],
  includeSecondRoundLosers: boolean,
  date: string = getDate()
): Match[] => {
  const sourceRounds = includeSecondRoundLosers ? new Set([1, 2]) : new Set([1]);
  const sources = mainMatches.filter(match => {
    if (match.bracket === 'consolation' || match.matchNumber === 0) return false;
    if (!sourceRounds.has(match.round)) return false;
    const hasTeam1 = Boolean(match.team1Id || match.team1Source);
    const hasTeam2 = Boolean(match.team2Id || match.team2Source);
    return hasTeam1 && hasTeam2;
  });
  if (sources.length < 2) return [];

  const placeholders: Team[] = sources.map((source, index) => ({
    id: `source_${index + 1}`,
    name: source.id
  }));
  const sourceByPlaceholderId = new Map(
    placeholders.map((placeholder, index) => [placeholder.id, sources[index]])
  );
  const structure = TournamentStructureHelper.generateInitialMatches(placeholders.length);
  const placements = TournamentStructureHelper.calculateTeamPlacements(placeholders);
  const getMatchId = (round: number, matchNumber: number): string => {
    const index = structure.findIndex(match => {
      return match.round === round && match.matchNumber === matchNumber;
    });
    return `consolation_match_${index + 1}`;
  };

  return structure.map((match, index): Match => {
    const createdMatch: Match = {
      id: `consolation_match_${index + 1}`,
      round: match.round,
      matchNumber: match.matchNumber,
      team1Id: '',
      team2Id: '',
      team1Score: 0,
      team2Score: 0,
      status: 'scheduled',
      date,
      bracket: 'consolation'
    };
    const matchPlacements = placements.filter(placement => {
      return placement.round === match.round && placement.matchNumber === match.matchNumber;
    });
    const assignSource = (position: 'team1' | 'team2') => {
      const placement = matchPlacements.find(candidate => candidate.position === position);
      const sourceMatch = placement
        ? sourceByPlaceholderId.get(placement.teamId)
        : undefined;
      if (sourceMatch) {
        createdMatch[`${position}Source`] = { type: 'loser', matchId: sourceMatch.id };
      }
    };

    if (match.round === 1) {
      assignSource('team1');
      assignSource('team2');
    } else {
      const firstPreviousId = getMatchId(match.round - 1, match.matchNumber * 2 - 1);
      const secondPreviousId = getMatchId(match.round - 1, match.matchNumber * 2);
      createdMatch.previousMatches = [firstPreviousId, secondPreviousId];
      createdMatch.team1Source = { type: 'winner', matchId: firstPreviousId };
      createdMatch.team2Source = { type: 'winner', matchId: secondPreviousId };
    }
    return createdMatch;
  });
};
