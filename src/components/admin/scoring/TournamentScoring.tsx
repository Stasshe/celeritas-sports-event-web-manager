import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  IconButton,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
  Stack,
  Card,
  CardContent,
  Tooltip,
  useTheme
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Shuffle as ShuffleIcon,
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { Sport, Match, Team } from '../../../types';
import { useTranslation } from 'react-i18next';
import { useThemeContext } from '../../../contexts/ThemeContext';
import { SingleEliminationBracket, SVGViewer } from '@g-loot/react-tournament-brackets';
import MatchCard from './components/MatchCard';
import MatchEditDialog from './components/MatchEditDialog';
import TournamentMatchPlacer from './components/TournamentMatchPlacer';
import TournamentBuilder from './components/TournamentBuilder';

interface TournamentScoringProps {
  sport: Sport;
  onUpdate: (updatedSport: Sport) => void;
}

const TournamentScoring: React.FC<TournamentScoringProps> = ({ sport, onUpdate }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { alpha } = useThemeContext();

  // 試合データの状態管理
  const [matches, setMatches] = useState<Match[]>(sport.matches || []);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [matchDialogOpen, setMatchDialogOpen] = useState(false);

  // トーナメント表示用のデータ
  const bracketMatches = useMemo(() => {
    if (!sport.teams || !matches.length) return [];

    // 最大ラウンド数を取得
    const maxRound = Math.max(...matches.map(m => m.round));
    
    const getMatchState = (status: string): 'DONE' | 'PLAYING' | 'SCHEDULED' => {
      switch (status) {
        case 'completed':
          return 'DONE';
        case 'inProgress':
          return 'PLAYING';
        default:
          return 'SCHEDULED';
      }
    };

    return matches
      .sort((a, b) => {
        // ラウンドとマッチナンバーでソート
        if (a.round !== b.round) return a.round - b.round;
        // 3位決定戦は最後に
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
          matches.find(m =>
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
  }, [matches, sport.teams, t]);

  // ラウンドごとの試合データを構築（修正）
  const roundMatches = useMemo(() => {
    if (!matches || matches.length === 0) {
      return [];
    }
    const regularMatches = matches.filter(m => m.matchNumber !== 0);
    const maxRound = Math.max(...regularMatches.map(m => m.round), 0);
    const rounds: Match[][] = [];
    
    // 各ラウンドの試合を格納
    for (let i = 1; i <= maxRound; i++) {
      const matchesInRound = regularMatches
        .filter(m => m.round === i)
        .sort((a, b) => a.matchNumber - b.matchNumber);
      if (matchesInRound.length > 0) {
        rounds.push(matchesInRound);
      }
    }
    // 3位決定戦があれば最後に追加
    const thirdPlaceMatch = matches.find(m => m.matchNumber === 0);
    if (thirdPlaceMatch) {
      rounds.push([thirdPlaceMatch]);
    }
    return rounds;
  }, [matches]);

  // 試合の編集
  const handleEditMatch = (match: Match) => {
    setSelectedMatch(match);
    setMatchDialogOpen(true);
  };

  // 試合の更新
  const handleMatchUpdate = (updatedMatch: Match) => {
    const newMatches = matches.map(m => 
      m.id === updatedMatch.id ? updatedMatch : m
    );
    setMatches(newMatches);
    onUpdate({ ...sport, matches: newMatches });
    setMatchDialogOpen(false);
  };

  return (
    <Box>
      <TournamentBuilder
        sport={sport}
        onMatchesCreate={(newMatches, selectedTeams) => {
          setMatches(newMatches);
          onUpdate({ 
            ...sport, 
            matches: newMatches,
            teams: selectedTeams  // 選択されたチーム情報を更新
          });
        }}
      />
      
      {matches.length > 0 ? (
        <>
          {/* トーナメント図の表示 */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Box sx={{ 
              height: Math.max(500, matches.length * 100),
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
                        
                        {/* 上側のチーム */}
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
                        
                        {/* 下側のチーム */}
                        <Box
                          sx={{
                            p: 0.5,
                            display: 'flex',
                            justifyContent: 'space-between',
                            backgroundColor: bottomParty.isWinner ? theme.palette.success.light : 'transparent',
                            borderTop: `1px solid ${theme.palette.divider}`,
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
                      width={Math.max(1200, matches.length * 250)}
                      height={Math.max(500, matches.length * 100)}
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

          {/* ラウンドごとの試合リスト */}
          <Grid container spacing={2}>
            {roundMatches.length > 0 ? (
              roundMatches.map((matches, roundIndex) => (
                <Grid item xs={12} md={6} lg={4} key={roundIndex}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      {matches[0]?.matchNumber === 0
                        ? t('tournament.thirdPlace')
                        : roundIndex === roundMatches.length - 2 && !matches.find(m => m.matchNumber === 0)
                        ? t('tournament.final')
                        : t('tournament.round', { number: roundIndex + 1 })}
                    </Typography>
                    <Stack spacing={1}>
                      {matches.map(match => (
                        <Card key={match.id}>
                          <CardContent>
                            <MatchCard
                              match={match}
                              sport={sport}
                              onEdit={() => handleEditMatch(match)}
                            />
                          </CardContent>
                        </Card>
                      ))}
                    </Stack>
                  </Paper>
                </Grid>
              ))
            ) : (
              <Grid item xs={12}>
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                  <Typography color="text.secondary">
                    {t('tournament.noMatches')}
                  </Typography>
                </Paper>
              </Grid>
            )}
          </Grid>
        </>
      ) : (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">
            {t('tournament.noMatches')}
          </Typography>
        </Paper>
      )}

      {/* 試合編集ダイアログ */}
      <MatchEditDialog
        open={matchDialogOpen}
        match={selectedMatch}
        sport={sport}
        onSave={handleMatchUpdate}
        teamRosters={sport.roster?.grade1 || {}}
        onClose={() => setMatchDialogOpen(false)}
      />
    </Box>
  );
};

export default TournamentScoring;
