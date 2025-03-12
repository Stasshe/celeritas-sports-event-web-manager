import React, { useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  useTheme
} from '@mui/material';
import { Sport, Match } from '../../types';
import { useTranslation } from 'react-i18next';
import { SingleEliminationBracket, Participant } from '@g-loot/react-tournament-brackets';
import { useThemeContext } from '../../contexts/ThemeContext';
import { TournamentStructureHelper } from '../admin/scoring/components/TournamentStructureHelper';

interface TournamentViewProps {
  sport: Sport;
}

// matchComponentの型定義を追加
interface MatchComponentProps {
  match: {
    id: string;
    name: string;
    nextMatchId: string | null;
    tournamentRoundText: string;
    startTime: string;
    state: 'DONE' | 'PLAYING' | 'SCHEDULED';
    participants: Participant[];
  };
  onMatchClick?: () => void;
  onPartyClick?: (party: Participant) => void;
  topParty: Participant;
  bottomParty: Participant;
  x: number;
  y: number;
  width: number;
  height: number;
}

const TournamentView: React.FC<TournamentViewProps> = ({ sport }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { alpha } = useThemeContext();

  // SVG要素を大文字で定義
  const ForeignObject = 'foreignObject';

  // TournamentStructureHelperの戻り値の型を変換する関数を追加
  const convertMatchState = (status: 'scheduled' | 'inProgress' | 'completed'): 'DONE' | 'PLAYING' | 'SCHEDULED' => {
    switch (status) {
      case 'completed':
        return 'DONE';
      case 'inProgress':
        return 'PLAYING';
      case 'scheduled':
        return 'SCHEDULED';
      default:
        return 'SCHEDULED';
    }
  };

  // トーナメントデータの変換ロジックを更新
  const bracketMatches = React.useMemo(() => {
    if (!sport.teams || !sport.matches.length) return [];

    const maxRound = Math.max(...sport.matches.map(m => m.round));
    
    const getParticipantName = (teamId: string | null, match: Match, position: 'team1' | 'team2'): string => {
      if (!teamId) {
        // シード試合の空きポジションの場合
        const otherTeamId = position === 'team1' ? match.team2Id : match.team1Id;
        if (otherTeamId && TournamentStructureHelper.isNoTeam(otherTeamId, match, sport.matches)) {
          return t('tournament.seed');
        }
        return t('tournament.tbd');
      }
      return sport.teams.find(t => t.id === teamId)?.name || t('tournament.tbd');
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
          : `${t('tournament.round')}${match.round} - ${t('match.number', { number: match.matchNumber })}`,
        nextMatchId: match.matchNumber === 0 ? null :
          sport.matches.find(m =>
            m.round === match.round + 1 &&
            Math.ceil(match.matchNumber / 2) === m.matchNumber
          )?.id || null,
        tournamentRoundText: match.round.toString(),
        startTime: match.date || new Date().toISOString(),
        state: convertMatchState(TournamentStructureHelper.getMatchStatus(match)), // ここを修正
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
  }, [sport.matches, sport.teams, t]);

  // トーナメント表示のコンポーネント部分を修正
  const renderMatchComponent = useCallback(({
    match,
    onMatchClick,
    onPartyClick,
    topParty,
    bottomParty,
    ...props
  }: MatchComponentProps) => (
    <ForeignObject
      x={props.x - props.width / 2}
      y={props.y - props.height / 2}
      width={props.width}
      height={props.height}
    >
      // ...existing Box component from TournamentScoring...
    </ForeignObject>
  ), [theme, t]);

  return (
    <Paper sx={{ p: 2, overflowX: 'auto' }}>
      <Box 
        sx={{ 
          width: '100%',
          height: Math.max(500, sport.matches.length * 100),
          overflow: 'auto',
          '& svg': {
            width: '100% !important',
            height: '100% !important'
          }
        }}
      >
        {bracketMatches.length > 0 && (
          <SingleEliminationBracket
            matches={bracketMatches}
            matchComponent={renderMatchComponent}
            options={{
              style: {
                roundHeader: {
                  backgroundColor: theme.palette.primary.main,
                  color: theme.palette.primary.contrastText,
                  fontWeight: 'bold'
                },
                connectorColor: theme.palette.divider,
                connectorColorHighlight: theme.palette.primary.main,
                matchBackground: {
                  wonColor: theme.palette.success.light,
                  lostColor: theme.palette.grey[100]
                }
              }
            }}
          />
        )}
      </Box>
    </Paper>
  );
};

export default TournamentView;
