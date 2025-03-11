import React, { useMemo } from 'react';
import { Box, Typography, Paper, useTheme } from '@mui/material';
import { SingleEliminationBracket, SVGViewer, TournamentMatchState } from '@g-loot/react-tournament-brackets';
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

    const maxRound = Math.max(...sport.matches.map(m => m.round));
    
    const getMatchState = (status: string): TournamentMatchState => {
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
      <Box sx={{ minWidth: 800, height: Math.max(400, sport.matches.length * 40) }}>
        <SingleEliminationBracket
          matches={matches}
          matchComponent={({ match, onMatchClick, onPartyClick, onMouseEnter, onMouseLeave, ...props }) => (
            <CustomMatch
              match={match}
              onMatchClick={onMatchClick}
              onPartyClick={onPartyClick}
              onMouseEnter={onMouseEnter}
              onMouseLeave={onMouseLeave}
              {...props}
            />
          )}
          svgWrapper={({ children, ...props }) => (
            <SVGViewer 
              width={Math.max(800, matches.length * 200)} 
              height={Math.max(400, matches.length * 40)}
              {...props}
            >
              {children}
            </SVGViewer>
          )}
          options={{
            style: {
              roundHeader: {
                backgroundColor: theme.palette.primary.main,
                color: theme.palette.primary.contrastText,
                fontWeight: 'bold' as const
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
      </Box>
    </Paper>
  );
};

// カスタムマッチコンポーネント名を変更
const CustomMatch = ({ match, onMatchClick, onPartyClick, onMouseEnter, onMouseLeave, topParty, bottomParty, ...props }: any) => {
  const theme = useTheme();
  return (
    <foreignObject
      x={props.x}
      y={props.y}
      width={props.width}
      height={props.height}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={() => onMatchClick && onMatchClick(match)}
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
        
        {/* 上側チーム */}
        <Box
          sx={{
            p: 0.5,
            display: 'flex',
            justifyContent: 'space-between',
            backgroundColor: topParty.isWinner ? theme.palette.success.light : 'transparent',
            '&:hover': { backgroundColor: theme.palette.action.hover }
          }}
          onClick={() => onPartyClick && onPartyClick(topParty)}
        >
          <Typography variant="body2" noWrap sx={{ maxWidth: '70%', fontWeight: topParty.isWinner ? 'bold' : 'normal' }}>
            {topParty.name}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            {topParty.score !== null ? topParty.score : '-'}
          </Typography>
        </Box>
        
        {/* 下側チーム */}
        <Box
          sx={{
            p: 0.5,
            display: 'flex',
            justifyContent: 'space-between',
            backgroundColor: bottomParty.isWinner ? theme.palette.success.light : 'transparent',
            '&:hover': { backgroundColor: theme.palette.action.hover }
          }}
          onClick={() => onPartyClick && onPartyClick(bottomParty)}
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
  );
};

export default TournamentBracket;
