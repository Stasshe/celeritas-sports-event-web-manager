import React from 'react';
import {
  Box,
  Typography,
  Paper,
  useTheme
} from '@mui/material';
import { Sport, Match } from '../../types';
import { useTranslation } from 'react-i18next';
import { SingleEliminationBracket, SVGViewer } from '@g-loot/react-tournament-brackets';
import { useThemeContext } from '../../contexts/ThemeContext';

interface TournamentViewProps {
  sport: Sport;
}

type MatchState = 'DONE' | 'PLAYING' | 'SCHEDULED' | 'NO_SHOW' | 'WALK_OVER';

const getMatchState = (status: Match['status']): MatchState => {
  switch (status) {
    case 'completed':
      return 'DONE';
    case 'inProgress':
      return 'PLAYING';
    default:
      return 'SCHEDULED';
  }
};

const TournamentView: React.FC<TournamentViewProps> = ({ sport }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { alpha } = useThemeContext();

  const calculateDisplayName = (match: any, teamId: string, teams: any[]) => {
    if (!teamId) {
      const prevRoundMatches = sport.matches.filter(m => 
        m.round === match.round - 1 &&
        Math.ceil(m.matchNumber / 2) === match.matchNumber
      );
      if (prevRoundMatches.length > 0) {
        return t('tournament.winnerOf', { match: prevRoundMatches[0].matchNumber });
      }
      return t('tournament.tbd');
    }
    const team = teams.find(t => t.id === teamId);
    return team ? team.name : t('tournament.tbd');
  };

  // トーナメントデータの変換
  const bracketMatches = sport.matches.map(match => ({
    id: match.id,
    name: match.matchNumber === 0 
      ? t('tournament.thirdPlaceMatch')
      : `${t('tournament.round')} ${match.round}`,
    nextMatchId: sport.matches.find(m2 => 
      m2.round === match.round + 1 && 
      Math.ceil(match.matchNumber / 2) === m2.matchNumber
    )?.id || null,
    tournamentRoundText: `${t('tournament.round')} ${match.round}`,
    startTime: match.date || new Date().toISOString(),
    state: getMatchState(match.status),
    participants: [
      {
        id: match.team1Id || `seed-${match.round}-${match.matchNumber}-1`,
        name: calculateDisplayName(match, match.team1Id, sport.teams),
        score: match.team1Score,
        isWinner: match.winnerId === match.team1Id
      },
      {
        id: match.team2Id || `seed-${match.round}-${match.matchNumber}-2`,
        name: calculateDisplayName(match, match.team2Id, sport.teams),
        score: match.team2Score,
        isWinner: match.winnerId === match.team2Id
      }
    ]
  }));

  return (
    <Paper sx={{ p: 2, overflowX: 'auto' }}>
      <Box sx={{ height: Math.max(400, sport.matches.length * 50) }}>
        <SingleEliminationBracket
          matches={bracketMatches}
          options={{
            style: {
              roundHeader: {
                backgroundColor: theme.palette.primary.main,
                color: theme.palette.primary.contrastText
              },
              connectorColor: theme.palette.divider,
              connectorColorHighlight: theme.palette.primary.main
            }
          }}
          svgWrapper={({ children, ...props }) => (
            <SVGViewer
              width={900}
              height={Math.max(400, sport.matches.length * 50)}
              {...props}
            >
              {children}
            </SVGViewer>
          )}
        />
      </Box>
    </Paper>
  );
};

export default TournamentView;
