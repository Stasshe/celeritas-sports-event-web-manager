import { Sport, Match, LeagueBlock } from '../types/index';
import { Participant } from '@g-loot/react-tournament-brackets';
import { TournamentStructureHelper } from './TournamentStructureHelper';

export const generateBracketMatches = (sport: Sport) => {
  if (!sport.teams || !sport.matches.length) return [];

  // リーグ戦の場合はプレーオフ用の試合だけを抽出
  const matchesToUse = sport.type === 'league'
    ? sport.matches.filter(m => !m.blockId) // プレーオフ試合はblockIdがない
    : sport.matches;
  
  if (matchesToUse.length === 0) return [];

  const maxRound = Math.max(...matchesToUse.map(m => m.round));
  
  const getParticipantName = (teamId: string | null, match: Match, position: 'team1' | 'team2'): string => {
    if (!teamId) {
      const otherTeamId = position === 'team1' ? match.team2Id : match.team1Id;
      if (otherTeamId && TournamentStructureHelper.isNoTeam(otherTeamId, match, matchesToUse)) {
        return "シード";
      }
      return "未定";
    }
    return sport.teams.find(t => t.id === teamId)?.name || "未定";
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

  return matchesToUse
    .sort((a, b) => {
      // 3位決定戦は最後にソート（matchNumber === 0）
      if (a.matchNumber === 0) return 1;
      if (b.matchNumber === 0) return -1;
      // それ以外は通常のソート
      if (a.round !== b.round) return a.round - b.round;
      return a.matchNumber - b.matchNumber;
    })
    .map(match => ({
      id: match.id,
      name: match.matchNumber === 0 || match.id.includes('third_place')
        ? "3位決定戦"
        : match.round === maxRound && match.matchNumber === 1
        ? "決勝"
        : `${match.round}-${match.matchNumber}回戦`,
      nextMatchId: match.matchNumber === 0 || match.id.includes('third_place') ? null :
        matchesToUse.find(m =>
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
          status: TournamentStructureHelper.isNoTeam(match.team1Id, match, matchesToUse) ? 'no-team' :
                 TournamentStructureHelper.isWaiting(match.team1Id, match, matchesToUse) ? 'waiting' : null
        } as Participant,
        {
          id: match.team2Id || `seed-${match.round}-${match.matchNumber}-2`,
          name: getParticipantName(match.team2Id, match, 'team2'),
          score: match.team2Score || undefined,
          isWinner: Boolean(match.winnerId === match.team2Id),
          status: TournamentStructureHelper.isNoTeam(match.team2Id, match, matchesToUse) ? 'no-team' :
                 TournamentStructureHelper.isWaiting(match.team2Id, match, matchesToUse) ? 'waiting' : null
        } as Participant
      ]
    }));
};
