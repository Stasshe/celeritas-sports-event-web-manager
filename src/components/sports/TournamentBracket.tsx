import React, { useMemo } from 'react';
import { Box, Typography, Paper, useTheme } from '@mui/material';
import { SingleEliminationBracket } from '@g-loot/react-tournament-brackets';
import { Sport } from '../../types';
import { useTranslation } from 'react-i18next';

interface TournamentBracketProps {
  sport: Sport;
}

const TournamentBracket: React.FC<TournamentBracketProps> = ({ sport }) => {
  const { t } = useTranslation();
  const theme = useTheme();

  const matches = useMemo(() => {
    if (!sport.matches || !sport.teams) return [];

    // チームマップを作成
    const teamMap = sport.teams.reduce((acc, team) => {
      acc[team.id] = team;
      return acc;
    }, {} as Record<string, any>);

    return sport.matches.map(match => ({
      id: match.id,
      name: `Match ${match.matchNumber}`,
      nextMatchId: null, // TODO: トーナメント構造に基づいて設定
      tournamentRoundText: `${t('tournament.round')} ${match.round}`,
      startTime: match.date || '',
      state: match.status === 'completed' ? 'DONE' : 'SCHEDULED',
      participants: [
        {
          id: match.team1Id,
          name: teamMap[match.team1Id]?.name || 'TBD',
          score: match.team1Score,
          isWinner: match.winnerId === match.team1Id
        },
        {
          id: match.team2Id,
          name: teamMap[match.team2Id]?.name || 'TBD',
          score: match.team2Score,
          isWinner: match.winnerId === match.team2Id
        }
      ]
    }));
  }, [sport.matches, sport.teams, t]);

  if (!sport.matches || sport.matches.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', my: 4 }}>
        <Typography variant="h6" color="text.secondary">
          {t('tournament.noMatches')}
        </Typography>
      </Box>
    );
  }

  return (
    <Paper sx={{ p: 2, overflowX: 'auto' }}>
      <Box sx={{ minWidth: 800, minHeight: 400 }}>
        <SingleEliminationBracket
          matches={matches}
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
        />
      </Box>
    </Paper>
  );
};

export default TournamentBracket;
