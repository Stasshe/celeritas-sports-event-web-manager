import React, { useMemo, useCallback } from 'react';
import { Box, Typography, Paper, useTheme } from '@mui/material';
import { SingleEliminationBracket, Participant } from '@g-loot/react-tournament-brackets';
import { Sport } from '../../types';
import { useTranslation } from 'react-i18next';
import { TournamentStructureHelper } from '../admin/scoring/components/TournamentStructureHelper';
import { generateBracketMatches } from '../../utils/tournamentViewHelper';

interface TournamentBracketProps {
  sport: Sport;
}

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

const TournamentBracket: React.FC<TournamentBracketProps> = ({ sport }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const ForeignObject = 'foreignObject';

  // データ変換ロジックを共通化
  const bracketMatches = useMemo(() => generateBracketMatches(sport, t), [sport, t]);

  // トーナメント表示のコンポーネント - TournamentScoringと同じ
  const renderMatchComponent = useCallback(({
    match,
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
      <Box
        sx={{
          width: '100%',
          height: '100%',
          border: '1px solid',
          borderColor: theme.palette.divider,
          borderRadius: 1,
          overflow: 'hidden',
          backgroundColor: (topParty.status === 'no-team' && bottomParty.status === 'no-team') 
            ? theme.palette.grey[100] 
            : theme.palette.background.paper,
          boxShadow: 1
        }}
      >
        <Box sx={{ p: 0.5, backgroundColor: theme.palette.grey[100], borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="caption" noWrap>
            {match.name}
          </Typography>
        </Box>
        
        {/* 上側のチーム */}
        <Box
          sx={{
            p: 0.5,
            display: 'flex',
            justifyContent: 'space-between',
            backgroundColor: topParty.name === t('tournament.seed')
              ? theme.palette.text.disabled
              : topParty.name === t('tournament.tbd')
              ? 'inherit'
              : topParty.isWinner
              ? theme.palette.primary.light
              : 'inherit'
          }}
        >
          <Typography variant="body2" noWrap sx={{ 
            maxWidth: '70%', 
            fontWeight: topParty.isWinner ? 'bold' : 'normal',
            color: topParty.name === t('tournament.seed')
              ? theme.palette.text.disabled
              : topParty.name === t('tournament.tbd')
              ? theme.palette.warning.main
              : topParty.isWinner
              ? theme.palette.primary.main
              : 'inherit'
          }}>
            {topParty.name}
            {topParty.status === 'waiting' && ' (待機中)'}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            {topParty.score !== undefined ? topParty.score : '-'}
          </Typography>
        </Box>
        
        {/* 下側のチーム */}
        <Box
          sx={{
            p: 0.5,
            display: 'flex',
            justifyContent: 'space-between',
            backgroundColor: bottomParty.name === t('tournament.seed')
              ? theme.palette.text.disabled
              : bottomParty.name === t('tournament.tbd')
              ? 'inherit'
              : bottomParty.isWinner
              ? theme.palette.primary.light
              : 'inherit',
            borderTop: `1px solid ${theme.palette.divider}`
          }}
        >
          <Typography variant="body2" noWrap sx={{ 
            maxWidth: '70%', 
            fontWeight: bottomParty.isWinner ? 'bold' : 'normal',
            color: bottomParty.name === t('tournament.seed')
              ? theme.palette.text.disabled
              : bottomParty.name === t('tournament.tbd')
              ? theme.palette.warning.main
              : bottomParty.isWinner
              ? theme.palette.primary.main
              : 'inherit'
          }}>
            {bottomParty.name}
            {bottomParty.status === 'waiting' && ' (待機中)'}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            {bottomParty.score !== undefined ? bottomParty.score : '-'}
          </Typography>
        </Box>
      </Box>
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

export default TournamentBracket;
