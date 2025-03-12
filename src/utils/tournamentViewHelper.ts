import { Sport, Match } from '../types/index';
import { Participant } from '@g-loot/react-tournament-brackets';
import { TournamentStructureHelper } from '../components/admin/scoring/components/TournamentStructureHelper';

export const generateBracketMatches = (sport: Sport, t: (key: string) => string) => {
  if (!sport.teams || !sport.matches.length) return [];

  const maxRound = Math.max(...sport.matches.map(m => m.round));
  
  const getParticipantName = (teamId: string | null, match: Match, position: 'team1' | 'team2'): string => {
    if (!teamId) {
      const otherTeamId = position === 'team1' ? match.team2Id : match.team1Id;
      if (otherTeamId && TournamentStructureHelper.isNoTeam(otherTeamId, match, sport.matches)) {
        return t('tournament.seed');
      }
      return t('tournament.tbd');
    }
    return sport.teams.find(t => t.id === teamId)?.name || t('tournament.tbd');
  };

  // 明示的な型定義を追加
  const convertMatchState = (status: ReturnType<typeof TournamentStructureHelper.getMatchStatus>): 'DONE' | 'PLAYING' | 'SCHEDULED' => {
    switch (status) {
      case 'completed':
        return 'DONE';
      case 'inProgress':
        return 'PLAYING';
      default:
        return 'SCHEDULED';
    }
  };

  return sport.matches
    .sort((a, b) => {
      if (a.round !== b.round) return a.round - b.round;
      if (a.matchNumber === 0) return 1;
      if (b.matchNumber === 0) return -1;
      return a.matchNumber - b.matchNumber;
    })
    .map(match => ({
      id: match.id,
      name: match.matchNumber === 0
        ? t('tournament.thirdPlace')
        : match.round === maxRound && match.matchNumber === 1
        ? t('tournament.final')
        : `${t('tournament.round')}${match.round} - ${t('match.number'), { number: match.matchNumber }}`,
      nextMatchId: match.matchNumber === 0 ? null :
        sport.matches.find(m =>
          m.round === match.round + 1 &&
          Math.ceil(match.matchNumber / 2) === m.matchNumber
        )?.id || null,
      tournamentRoundText: match.round.toString(),
      startTime: match.date || new Date().toISOString(),
      state: convertMatchState(TournamentStructureHelper.getMatchStatus(match)),
      participants: [
        {
          id: match.team1Id || `seed-${match.round}-${match.matchNumber}-1`,
          name: getParticipantName(match.team1Id, match, 'team1'),
          score: match.team1Score || undefined,
          isWinner: Boolean(match.winnerId === match.team1Id),
          status: TournamentStructureHelper.isNoTeam(match.team1Id, match, sport.matches) ? 'no-team' :
                 TournamentStructureHelper.isWaiting(match.team1Id, match, sport.matches) ? 'waiting' : null
        } as Participant,
        {
          id: match.team2Id || `seed-${match.round}-${match.matchNumber}-2`,
          name: getParticipantName(match.team2Id, match, 'team2'),
          score: match.team2Score || undefined,
          isWinner: Boolean(match.winnerId === match.team2Id),
          status: TournamentStructureHelper.isNoTeam(match.team2Id, match, sport.matches) ? 'no-team' :
                 TournamentStructureHelper.isWaiting(match.team2Id, match, sport.matches) ? 'waiting' : null
        } as Participant
      ]
    }));
};
