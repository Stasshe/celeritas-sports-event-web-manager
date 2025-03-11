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

  // トーナメントデータの変換
  const bracketMatches = sport.matches.map(m => ({
    id: m.id,
    name: m.matchNumber === 0 ? t('tournament.thirdPlace') :
      `${t('tournament.round')} ${m.round} - ${m.matchNumber}`,
    nextMatchId: sport.matches.find(m2 => 
      m2.round === m.round + 1 && 
      Math.ceil(m.matchNumber / 2) === m2.matchNumber
    )?.id || null,
    tournamentRoundText: m.round.toString(),
    startTime: m.date || new Date().toISOString(),
    state: getMatchState(m.status),
    participants: [
      {
        id: m.team1Id || 'tbd',
        name: sport.teams.find(t => t.id === m.team1Id)?.name || t('tournament.tbd'),
        score: m.team1Score,
        isWinner: m.winnerId === m.team1Id
      },
      {
        id: m.team2Id || 'tbd',
        name: sport.teams.find(t => t.id === m.team2Id)?.name || t('tournament.tbd'),
        score: m.team2Score,
        isWinner: m.winnerId === m.team2Id
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
