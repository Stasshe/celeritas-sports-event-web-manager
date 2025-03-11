import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  useTheme
} from '@mui/material';
import { Sport, Match, MatchStatus } from '../../types';
import { useTranslation } from 'react-i18next';
import { SingleEliminationBracket, SVGViewer, TournamentMatchState } from '@g-loot/react-tournament-brackets';
import { useThemeContext } from '../../contexts/ThemeContext';

interface TournamentViewProps {
  sport: Sport;
}

const getMatchState = (status: MatchStatus): TournamentMatchState => {
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
  
  const bracketMatches = useMemo(() => {
    if (!sport.matches || !sport.teams) return [];
    
    const maxRound = Math.max(...sport.matches.map(m => m.round));
    
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
          : `${t('tournament.round')} ${match.round} - ${match.matchNumber}`,
        nextMatchId: match.matchNumber === 0 ? null :
          sport.matches.find(m =>
            m.round === match.round + 1 &&
            Math.ceil(match.matchNumber / 2) === m.matchNumber
          )?.id || null,
        tournamentRoundText: match.round.toString(),
        startTime: match.date || new Date().toISOString(),
        state: getMatchState(match.status),
        participants: [
          {
            id: match.team1Id || `seed-${match.round}-${match.matchNumber}-1`,
            name: match.team1Id 
              ? sport.teams.find(t => t.id === match.team1Id)?.name || t('tournament.tbd')
              : t('tournament.tbd'),
            score: match.team1Score,
            isWinner: Boolean(match.winnerId === match.team1Id),
            status: null
          },
          {
            id: match.team2Id || `seed-${match.round}-${match.matchNumber}-2`,
            name: match.team2Id
              ? sport.teams.find(t => t.id === match.team2Id)?.name || t('tournament.tbd')
              : t('tournament.tbd'),
            score: match.team2Score,
            isWinner: Boolean(match.winnerId === match.team2Id),
            status: null
          }
        ]
      }));
  }, [sport.matches, sport.teams, t]);

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ 
        height: Math.max(500, (sport.matches?.length || 0) * 100),
        overflowX: 'auto',
        overflowY: 'hidden'
      }}>
        {bracketMatches.length > 0 && (
          <SingleEliminationBracket
            matches={bracketMatches}
            matchComponent={({
              match,
              onMatchClick,
              onPartyClick,
              topParty,
              bottomParty,
              ...props
            }) => (
              <foreignObject
                x={props.x - props.width / 2}
                y={props.y - props.height / 2}
                width={props.width}
                height={props.height}
              >
                <Box
                  sx={{
                    width: '100%',
                    height: '100%',
                    border: '1px solid',
                    borderColor: theme.palette.divider,
                    borderRadius: 1,
                    overflow: 'hidden',
                    backgroundColor: theme.palette.background.paper,
                    boxShadow: 1
                  }}
                >
                  <Box sx={{ p: 0.5, backgroundColor: theme.palette.grey[100], borderBottom: `1px solid ${theme.palette.divider}` }}>
                    <Typography variant="caption" noWrap>
                      {match.name}
                    </Typography>
                  </Box>
                  
                  {/* チーム1 */}
                  <Box
                    sx={{
                      p: 0.5,
                      display: 'flex',
                      justifyContent: 'space-between',
                      backgroundColor: topParty.isWinner ? theme.palette.success.light : 'transparent',
                    }}
                  >
                    <Typography variant="body2" noWrap sx={{ maxWidth: '70%', fontWeight: topParty.isWinner ? 'bold' : 'normal' }}>
                      {topParty.name}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {topParty.score !== null ? topParty.score : '-'}
                    </Typography>
                  </Box>
                  
                  {/* チーム2 */}
                  <Box
                    sx={{
                      p: 0.5,
                      display: 'flex',
                      justifyContent: 'space-between',
                      backgroundColor: bottomParty.isWinner ? theme.palette.success.light : 'transparent',
                      borderTop: `1px solid ${theme.palette.divider}`
                    }}
                  >
                    <Typography variant="body2" noWrap sx={{ maxWidth: '70%', fontWeight: bottomParty.isWinner ? 'bold' : 'normal' }}>
                      {bottomParty.name}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {bottomParty.score !== null ? bottomParty.score : '-'}
                    </Typography>
                  </Box>
                </Box>
              </foreignObject>
            )}
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
            svgWrapper={({ children, ...props }) => (
              <SVGViewer
                width={Math.max(1200, bracketMatches.length * 250)}
                height={Math.max(500, bracketMatches.length * 100)}
                background={theme.palette.background.paper}
                SVGBackground={theme.palette.background.paper}
                {...props}
              >
                {children}
              </SVGViewer>
            )}
          />
        )}
      </Box>
    </Paper>
  );
};

export default TournamentView;
