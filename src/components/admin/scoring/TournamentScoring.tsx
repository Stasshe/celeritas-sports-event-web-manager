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
    return matches.map(match => ({
      id: match.id,
      name: match.matchNumber === 0 ? t('tournament.thirdPlace') :
        `${t('tournament.round')} ${match.round} - ${match.matchNumber}`,
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
          name: sport.teams.find(t => t.id === match.team1Id)?.name || t('tournament.tbd'),
          score: match.team1Score,
          isWinner: match.winnerId === match.team1Id
        },
        {
          id: match.team2Id || 'tbd',
          name: sport.teams.find(t => t.id === match.team2Id)?.name || t('tournament.tbd'),
          score: match.team2Score,
          isWinner: match.winnerId === match.team2Id
        }
      ]
    }));
  }, [matches, sport.teams, t]);

  // ラウンドごとの試合データを構築
  const roundMatches = useMemo(() => {
    const rounds: Match[][] = [];
    const maxRound = Math.max(...matches.map(m => m.round), 0);
    
    for (let i = 1; i <= maxRound; i++) {
      rounds[i] = matches.filter(m => m.round === i)
        .sort((a, b) => a.matchNumber - b.matchNumber);
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
      {/* 自動配置コンポーネント */}
      <TournamentMatchPlacer
        sport={sport}
        onMatchesUpdate={(newMatches) => {
          setMatches(newMatches);
          onUpdate({ ...sport, matches: newMatches });
        }}
      />

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
        {roundMatches.map((matches, roundIndex) => (
          matches.length > 0 && (
            <Grid item xs={12} md={6} lg={4} key={roundIndex}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  {roundIndex === roundMatches.length - 1 && matches[0]?.matchNumber === 0
                    ? t('tournament.thirdPlace')
                    : t('tournament.round', { number: roundIndex })}
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
          )
        ))}
      </Grid>

      {/* 試合編集ダイアログ */}
      <MatchEditDialog
        open={matchDialogOpen}
        match={selectedMatch}
        sport={sport}
        teamRosters={sport.roster?.grade1 || {}}
        onClose={() => setMatchDialogOpen(false)}
        onSave={handleMatchUpdate}
      />
    </Box>
  );
};

export default TournamentScoring;
