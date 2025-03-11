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
import TournamentBracketDisplay from './components/TournamentBracketDisplay';
import MatchQuickEditDialog from './components/MatchQuickEditDialog';

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
      {/* チーム選択とトーナメント生成 */}
      <TournamentBuilder
        sport={sport}
        onMatchesCreate={(newMatches, selectedTeams) => {
          setMatches(newMatches);
          onUpdate({ 
            ...sport, 
            matches: newMatches,
            teams: selectedTeams
          });
        }}
      />
      
      {/* トーナメント表示 */}
      {matches.length > 0 && (
        <Box sx={{ my: 3 }}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                {t('tournament.bracket')}
              </Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={<ShuffleIcon />}
                onClick={() => {
                  const shuffledMatches = [...matches]
                    .filter(m => m.round === 1)
                    .sort(() => Math.random() - 0.5);
                  const otherMatches = matches.filter(m => m.round !== 1);
                  setMatches([...shuffledMatches, ...otherMatches]);
                }}
              >
                {t('tournament.shuffleFirstRound')}
              </Button>
            </Box>
            <TournamentBracketDisplay
              matches={bracketMatches}
              sport={sport}
              onMatchUpdate={handleMatchUpdate}
              isEditable={true}
            />
          </Paper>

          {/* マッチリスト表示（ラウンドごと） */}
          <Grid container spacing={2}>
            {roundMatches.map((roundMatchList, index) => (
              <Grid item xs={12} md={6} lg={4} key={index}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    {roundMatchList[0].matchNumber === 0 
                      ? t('tournament.thirdPlace')
                      : index === roundMatches.length - 1
                      ? t('tournament.final')
                      : t('tournament.round', { number: index + 1 })}
                  </Typography>
                  <Stack spacing={1}>
                    {roundMatchList.map(match => (
                      <Card 
                        key={match.id}
                        sx={{
                          '&:hover': {
                            boxShadow: 3,
                            cursor: 'pointer'
                          }
                        }}
                        onClick={() => handleEditMatch(match)}
                      >
                        <CardContent>
                          <MatchCard
                            match={match}
                            sport={sport}
                            showEdit={false}
                          />
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* クイック編集ダイアログ */}
      {selectedMatch && (
        <MatchQuickEditDialog
          open={matchDialogOpen}
          match={selectedMatch}
          sport={sport}
          onClose={() => setMatchDialogOpen(false)}
          onSave={handleMatchUpdate}
        />
      )}
    </Box>
  );
};

export default TournamentScoring;
