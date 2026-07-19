import { Match, MatchParticipantSource, Sport, Team, TimeSlot } from '../types';

export const getTeamDisplayName = (team: Team): string => {
  return team.name.replace(/^grade[1-3]-/, '');
};

export const isThirdPlaceMatch = (match: Match): boolean => {
  return match.matchNumber === 0 || match.id.includes('third_place');
};

export const getRoundName = (match: Match, sport: Sport): string => {
  if (isThirdPlaceMatch(match)) return '3位決定戦';

  const bracketMatches = sport.matches.filter(candidate => {
    if (candidate.blockId !== undefined) return false;
    return !isThirdPlaceMatch(candidate);
  });
  const maxRound = Math.max(...bracketMatches.map(candidate => candidate.round), match.round);

  if (match.round === maxRound) return '決勝';
  if (match.round === maxRound - 1) return '準決勝';
  if (match.round === maxRound - 2) return '準々決勝';
  return `ラウンド${match.round}`;
};

const getSourceLabel = (source: MatchParticipantSource, sport: Sport): string => {
  if (source.type === 'blockRank') {
    const blockNumber = source.blockId.replace(/^block_/, '');
    return `ブロック${blockNumber} ${source.rank}位`;
  }

  const previousMatch = sport.matches.find(match => match.id === source.matchId);
  if (!previousMatch) return '未定';

  const outcome = source.type === 'winner' ? '勝者' : '敗者';
  return `${getRoundName(previousMatch, sport)} #${previousMatch.matchNumber}の${outcome}`;
};

const resolveSourceTeamId = (
  source: MatchParticipantSource | undefined,
  sport: Sport
): string | undefined => {
  if (!source || source.type === 'blockRank') return undefined;

  const previousMatch = sport.matches.find(match => match.id === source.matchId);
  if (!previousMatch?.winnerId) return undefined;
  if (source.type === 'winner') return previousMatch.winnerId;
  if (previousMatch.team1Id === previousMatch.winnerId) return previousMatch.team2Id;
  return previousMatch.team1Id;
};

export const getParticipantName = (
  match: Match,
  position: 'team1' | 'team2',
  sport: Sport
): string => {
  const teamId = position === 'team1' ? match.team1Id : match.team2Id;
  const source = position === 'team1' ? match.team1Source : match.team2Source;
  const resolvedTeamId = teamId || resolveSourceTeamId(source, sport);

  if (resolvedTeamId) {
    const team = sport.teams.find(candidate => candidate.id === resolvedTeamId);
    if (team) return getTeamDisplayName(team);
    return '不明なチーム';
  }
  if (source) return getSourceLabel(source, sport);
  return '未定';
};

export const getMatchupLabel = (match: Match, sport: Sport): string => {
  const team1Name = getParticipantName(match, 'team1', sport);
  const team2Name = getParticipantName(match, 'team2', sport);
  return `${team1Name} vs ${team2Name}`;
};

export const getMatchContext = (match: Match, sport: Sport): string => {
  if (match.blockId !== undefined) {
    const blockNumber = match.blockId.replace(/^block_/, '');
    return `ブロック ${blockNumber}`;
  }
  if (sport.type === 'tournament' || sport.type === 'league') {
    return getRoundName(match, sport);
  }
  return `試合 ${match.matchNumber}`;
};

export const getTimeSlotLabel = (slot: TimeSlot, sport: Sport): string => {
  if (slot.type === 'match' && slot.matchId) {
    const match = sport.matches.find(candidate => candidate.id === slot.matchId);
    if (match) return getMatchupLabel(match, sport);
  }
  return slot.matchDescription || slot.description || slot.title || '';
};
