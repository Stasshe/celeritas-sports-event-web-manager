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

    return matches.map(match => ({
      id: match.id,
      name: match.matchNumber === 0 
        ? t('tournament.thirdPlace') 
        : `${t('tournament.round')} ${match.round} - ${match.matchNumber}`,
      nextMatchId: matches.find(m => 
        m.round === match.round + 1 && 
        Math.ceil(match.matchNumber / 2) === m.matchNumber
      )?.id || null,
      tournamentRoundText: match.round.toString(),
      startTime: match.date || new Date().toISOString(),
      state: match.status as 'DONE' | 'PLAYING' | 'SCHEDULED',
      participants: [
        {
          id: match.team1Id || 'tbd',
          name: match.team1Id 
            ? sport.teams.find(t => t.id === match.team1Id)?.name || t('tournament.tbd')
            : t('tournament.tbd'),
          score: match.team1Score,
          isWinner: Boolean(match.winnerId === match.team1Id)
        },
        {
          id: match.team2Id || 'tbd',
          name: match.team2Id
            ? sport.teams.find(t => t.id === match.team2Id)?.name || t('tournament.tbd')
            : t('tournament.tbd'),
          score: match.team2Score,
          isWinner: Boolean(match.winnerId === match.team2Id)
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
              height: Math.max(400, matches.length * 50),
              overflowX: 'auto'
            }}>
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
                    width={Math.max(900, matches.length * 100)}
                    height={Math.max(400, matches.length * 50)}
                    {...props}
                  >
                    {children}
                  </SVGViewer>
                )}
              />
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
