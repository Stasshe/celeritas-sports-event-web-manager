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
  const [teamRosters, setTeamRosters] = useState<Record<string, string[]>>({});

  // トーナメント構造データの構築
  const tournamentData = useMemo(() => {
    const rounds: Match[][] = [];
    const maxRound = Math.max(...matches.map(m => m.round));
    
    for (let i = 1; i <= maxRound; i++) {
      rounds.push(matches.filter(m => m.round === i).sort((a, b) => a.matchNumber - b.matchNumber));
    }

    return rounds;
  }, [matches]);

  // 名簿データの初期化
  useEffect(() => {
    if (sport.roster) {
      const rosters: Record<string, string[]> = {};
      Object.keys(sport.roster).forEach(gradeKey => {
        const gradeData = sport.roster?.[gradeKey as keyof typeof sport.roster];
        if (gradeData) {
          Object.entries(gradeData).forEach(([className, students]) => {
            if (Array.isArray(students)) {
              students.forEach(student => {
                if (!rosters[className]) {
                  rosters[className] = [];
                }
                rosters[className].push(student);
              });
            }
          });
        }
      });
      setTeamRosters(rosters);
    }
  }, [sport.roster]);

  // 試合編集ダイアログを開く
  const handleEditMatch = (match: Match) => {
    setSelectedMatch(match);
    setMatchDialogOpen(true);
  };

  // 試合データの更新
  const handleMatchUpdate = (updatedMatch: Match) => {
    const updatedMatches = matches.map(m =>
      m.id === updatedMatch.id ? updatedMatch : m
    );
    setMatches(updatedMatches);
    onUpdate({ ...sport, matches: updatedMatches });
    setMatchDialogOpen(false);
  };

  // 新規試合の追加
  const handleAddMatch = (round: number) => {
    const newMatch: Match = {
      id: `match_${Date.now()}`,
      round,
      matchNumber: matches.filter(m => m.round === round).length + 1,
      team1Id: '',
      team2Id: '',
      team1Score: 0,
      team2Score: 0,
      status: 'scheduled',
      date: new Date().toISOString().split('T')[0],
    };
    setSelectedMatch(newMatch);
    setMatchDialogOpen(true);
  };

  // ドラッグ&ドロップの処理
  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const { source, destination } = result;
    const updatedMatches = [...matches];
    const [removed] = updatedMatches.splice(source.index, 1);
    updatedMatches.splice(destination.index, 0, removed);

    setMatches(updatedMatches);
    onUpdate({ ...sport, matches: updatedMatches });
  };

  // トーナメント表示用のデータ変換
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

  return (
    <Box>
      {/* トーナメント表示 */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ height: Math.max(400, matches.length * 50) }}>
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
                width={900}
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
      <DragDropContext onDragEnd={handleDragEnd}>
        <Grid container spacing={2}>
          {tournamentData.map((roundMatches, roundIndex) => (
            <Grid item xs={12} md={6} lg={4} key={roundIndex}>
              <Paper sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6">
                    {roundIndex === tournamentData.length - 1 ? 
                      t('tournament.final') : 
                      t('tournament.round', { number: roundIndex + 1 })}
                  </Typography>
                  <Button
                    startIcon={<AddIcon />}
                    onClick={() => handleAddMatch(roundIndex + 1)}
                    size="small"
                  >
                    {t('tournament.addMatch')}
                  </Button>
                </Box>

                <Droppable droppableId={`round-${roundIndex + 1}`}>
                  {(provided) => (
                    <Box ref={provided.innerRef} {...provided.droppableProps}>
                      {roundMatches.map((match, index) => (
                        <Draggable key={match.id} draggableId={match.id} index={index}>
                          {(provided) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              sx={{ mb: 1 }}
                            >
                              <CardContent>
                                {/* 試合の詳細表示と編集ボタン */}
                                <MatchCard
                                  match={match}
                                  sport={sport}
                                  onEdit={() => handleEditMatch(match)}
                                />
                              </CardContent>
                            </Card>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </Box>
                  )}
                </Droppable>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </DragDropContext>

      {/* 試合編集ダイアログ */}
      <MatchEditDialog
        open={matchDialogOpen}
        match={selectedMatch}
        sport={sport}
        teamRosters={teamRosters}
        onClose={() => setMatchDialogOpen(false)}
        onSave={handleMatchUpdate}
      />
    </Box>
  );
};

// ... 以下のコンポーネントも追加 ...
// MatchCard
// MatchEditDialog
// TeamSelector
// ScoreInput
