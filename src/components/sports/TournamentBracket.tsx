import React, { useMemo } from 'react';
import { Box, Typography, Paper, useTheme } from '@mui/material';
import { Bracket } from 'react-bracket';
import { Sport, Match, Team } from '../../types';
import { useTranslation } from 'react-i18next';

interface TournamentBracketProps {
  sport: Sport;
}

const TournamentBracket: React.FC<TournamentBracketProps> = ({ sport }) => {
  const { t } = useTranslation();
  const theme = useTheme();

  // トーナメントデータを構造化する
  const bracketData = useMemo(() => {
    if (!sport.matches || !sport.teams) {
      return {
        rounds: []
      };
    }

    // チームマップを作成
    const teamMap = sport.teams.reduce((acc, team) => {
      acc[team.id] = team;
      return acc;
    }, {} as Record<string, Team>);

    // マッチをラウンドごとに分類
    const matchesByRound = sport.matches.reduce((acc, match) => {
      if (!acc[match.round]) {
        acc[match.round] = [];
      }
      acc[match.round].push(match);
      return acc;
    }, {} as Record<number, Match[]>);

    // ラウンド数を取得
    const roundNumbers = Object.keys(matchesByRound).map(Number).sort((a, b) => a - b);

    // react-bracketに合わせたデータ形式に変換
    const rounds = roundNumbers.map(roundNumber => {
      return {
        title: `${t('tournament.round') || 'ラウンド'} ${roundNumber}`,
        seeds: matchesByRound[roundNumber].map(match => {
          const team1 = teamMap[match.team1Id] || { id: '', name: 'TBD' };
          const team2 = teamMap[match.team2Id] || { id: '', name: 'TBD' };
          
          return {
            id: match.id,
            date: match.date || '',
            teams: [
              { 
                id: team1.id, 
                name: team1.name,
                score: match.team1Score
              },
              {
                id: team2.id,
                name: team2.name,
                score: match.team2Score
              }
            ],
            // react-bracketではwinnerIdを直接サポートしていないため
            // 勝者情報をUIでハイライトするために使用
            winnerIdx: match.winnerId === team1.id ? 0 : 
                      match.winnerId === team2.id ? 1 : undefined
          };
        })
      };
    });

    return { rounds };
  }, [sport.matches, sport.teams, t]);

  // カスタムスタイル
  const customStyles = {
    roundHeader: {
      backgroundColor: theme.palette.primary.main,
      color: theme.palette.primary.contrastText,
      padding: '8px 16px',
      borderRadius: '4px 4px 0 0',
      fontWeight: 'bold'
    },
    connectorColor: theme.palette.divider,
    teamContainer: {
      backgroundColor: theme.palette.background.paper,
      boxShadow: theme.shadows[1],
      borderRadius: '4px',
      margin: '8px 0'
    },
    winningTeam: {
      backgroundColor: theme.palette.success.light
    },
    scoreContainer: {
      backgroundColor: theme.palette.action.hover,
      padding: '4px 8px',
      borderRadius: '4px',
      fontWeight: 'bold'
    }
  };

  if (!sport.matches || sport.matches.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', my: 4 }}>
        <Typography variant="h6" color="text.secondary">
          {t('tournament.noMatches') || '試合データがありません'}
        </Typography>
      </Box>
    );
  }

  return (
    <Paper sx={{ p: 2, overflowX: 'auto' }}>
      <Box sx={{ minWidth: 800 }}>
        <Bracket 
          rounds={bracketData.rounds}
          renderSeedComponent={(seed, roundIdx, seedIdx) => {
            // react-bracketではカスタムレンダラーが異なるので適応
            const teams = seed.teams || [];
            const winnerIdx = (seed as any).winnerIdx;
            
            return (
              <Box sx={{ 
                ...customStyles.teamContainer,
                minWidth: '180px',
                border: `1px solid ${theme.palette.divider}`,
                overflow: 'hidden'
              }}>
                {teams.map((team: any, idx: number) => (
                  <Box 
                    key={idx}
                    sx={{
                      display: 'flex', 
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderBottom: idx === 0 ? `1px solid ${theme.palette.divider}` : 'none',
                      ...(winnerIdx === idx ? customStyles.winningTeam : {})
                    }}
                  >
                    <Typography variant="body2" fontWeight={winnerIdx === idx ? 'bold' : 'normal'}>
                      {team.name}
                    </Typography>
                    <Box sx={customStyles.scoreContainer}>
                      {team.score !== undefined ? team.score : '-'}
                    </Box>
                  </Box>
                ))}
              </Box>
            );
          }}
          roundTitleComponent={(title, roundIdx) => (
            <Typography 
              variant="body1" 
              sx={customStyles.roundHeader}
            >
              {title}
            </Typography>
          )}
          // コネクターのスタイルを設定
          lineInfo={{
            color: customStyles.connectorColor,
            thickness: 2,
          }}
        />
      </Box>
    </Paper>
  );
};

export default TournamentBracket;
