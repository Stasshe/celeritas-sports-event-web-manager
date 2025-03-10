import React, { useMemo } from 'react';
import { Box, Typography, Paper, useTheme } from '@mui/material';
import { SingleEliminationBracket, SVGViewer } from '@g-loot/react-tournament-brackets';
import { Sport } from '../../types';
import { useTranslation } from 'react-i18next';

interface TournamentBracketProps {
  sport: Sport;
}

const TournamentBracket: React.FC<TournamentBracketProps> = ({ sport }) => {
  const { t } = useTranslation();
  const theme = useTheme();

  // トーナメントの試合データを階層的に構築
  const matches = useMemo(() => {
    if (!sport.matches || !sport.teams) return [];

    // チームマップを作成
    const teamMap = sport.teams.reduce((acc, team) => {
      acc[team.id] = team;
      return acc;
    }, {} as Record<string, any>);
    
    // ラウンドと位置でソートされたマッチのコピーを作成
    const sortedMatches = [...sport.matches].sort((a, b) => {
      if (a.round !== b.round) return a.round - b.round;
      return a.matchNumber - b.matchNumber;
    });
    
    // 次の試合IDを計算する関数
    const calculateNextMatchId = (match: any) => {
      if (match.round === Math.max(...sport.matches.map(m => m.round))) {
        return null; // 最終ラウンドには次の試合はない
      }
      
      const nextRound = match.round + 1;
      const nextPosition = Math.ceil(match.matchNumber / 2);
      const nextMatch = sortedMatches.find(m => m.round === nextRound && m.matchNumber === nextPosition);
      
      return nextMatch ? nextMatch.id : null;
    };

    // マッチを@g-loot/react-tournament-bracketsの形式に変換
    return sortedMatches.map(match => {
      // 特殊な試合（3位決定戦など）か判定
      const isSpecialMatch = match.matchNumber === 0;
      
      return {
        id: match.id,
        name: isSpecialMatch 
          ? t('tournament.thirdPlaceMatch') 
          : `${t('tournament.round')} ${match.round} - ${t('match.number', { number: match.matchNumber })}`,
        nextMatchId: calculateNextMatchId(match),
        tournamentRoundText: isSpecialMatch 
          ? t('tournament.thirdPlaceMatch') 
          : match.round === Math.max(...sport.matches.map(m => m.round)) && match.matchNumber === 1 
            ? t('tournament.final') 
            : `${t('tournament.round')} ${match.round}`,
        startTime: match.date || '',
        state: match.status === 'completed' 
          ? 'DONE' as const
          : match.status === 'inProgress' 
            ? 'PLAYING' as const
            : 'SCHEDULED' as const,
        participants: [
          {
            id: match.team1Id || `seed-${match.round}-${match.matchNumber}-1`,
            name: teamMap[match.team1Id]?.name || t('tournament.tbd'),
            status: null,
            score: match.team1Score,
            isWinner: match.winnerId === match.team1Id
          },
          {
            id: match.team2Id || `seed-${match.round}-${match.matchNumber}-2`,
            name: teamMap[match.team2Id]?.name || t('tournament.tbd'),
            status: null,
            score: match.team2Score,
            isWinner: match.winnerId === match.team2Id
          }
        ]
      };
    });
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
