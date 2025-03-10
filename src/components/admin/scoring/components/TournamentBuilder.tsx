import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Chip,
  Stack,
  FormControlLabel,
  Switch,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  IconButton,
} from '@mui/material';
import { 
  Delete as DeleteIcon,
  Edit as EditIcon,
  SwapVert as SwapVertIcon,
} from '@mui/icons-material';
import { Match, Sport, Team } from '../../../../types';
import { useTranslation } from 'react-i18next';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

interface TournamentBuilderProps {
  sport: Sport;
  onMatchesCreate: (matches: Match[], selectedTeams: Team[]) => void;  // 引数を追加
}

export const TournamentBuilder: React.FC<TournamentBuilderProps> = ({ sport, onMatchesCreate }) => {
  const { t } = useTranslation();
  const [selectedTeams, setSelectedTeams] = useState<Team[]>([]);
  const [hasThirdPlace, setHasThirdPlace] = useState(true);
  const [isTeamSelectionOpen, setIsTeamSelectionOpen] = useState(false);

  // 名簿データからチーム候補を生成
  const generateTeamCandidates = () => {
    const candidates: Team[] = [];
    const roster = sport.roster || {};
    
    Object.entries(roster).forEach(([grade, classes]) => {
      Object.entries(classes).forEach(([className, members]) => {
        const teamName = `${grade}-${className}`;
        candidates.push({
          id: `team_${teamName}`,
          name: teamName,
          members: members
        });
      });
    });
    return candidates;
  };

  const handleTeamSelect = (team: Team) => {
    if (!selectedTeams.find(t => t.id === team.id)) {
      setSelectedTeams([...selectedTeams, team]);
    }
  };

  const handleTeamRemove = (teamId: string) => {
    setSelectedTeams(selectedTeams.filter(t => t.id !== teamId));
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const items = Array.from(selectedTeams);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    setSelectedTeams(items);
  };

  const generateTournament = () => {
    if (!selectedTeams.length) return;

    // ラウンド数を計算（切り上げ）
    const rounds = Math.ceil(Math.log2(selectedTeams.length));
    const matches: Match[] = [];
    let matchId = 1;

    // 1回戦のマッチを生成（シード順を考慮）
    const firstRoundMatches = Math.pow(2, rounds - 1);
    const byes = Math.pow(2, rounds) - selectedTeams.length; // 不戦勝数

    for (let i = 0; i < firstRoundMatches; i++) {
      const team1Index = i * 2;
      const team2Index = i * 2 + 1;

      matches.push({
        id: `match_${matchId}`,
        round: 1,
        matchNumber: i + 1,
        team1Id: selectedTeams[team1Index]?.id || '',
        team2Id: team2Index < selectedTeams.length ? selectedTeams[team2Index].id : '',
        team1Score: 0,
        team2Score: 0,
        status: 'scheduled',
        date: new Date().toISOString().split('T')[0]
      });
      matchId++;
    }

    // 2回戦以降のマッチを生成
    for (let round = 2; round <= rounds; round++) {
      const matchesInRound = Math.pow(2, rounds - round);
      for (let i = 0; i < matchesInRound; i++) {
        matches.push({
          id: `match_${matchId}`,
          round: round,
          matchNumber: i + 1,
          team1Id: '',
          team2Id: '',
          team1Score: 0,
          team2Score: 0,
          status: 'scheduled',
          date: new Date().toISOString().split('T')[0]
        });
        matchId++;
      }
    }

    // 3位決定戦を追加
    if (hasThirdPlace) {
      matches.push({
        id: `match_${matchId}`,
        round: rounds,
        matchNumber: 0,
        team1Id: '',
        team2Id: '',
        team1Score: 0,
        team2Score: 0,
        status: 'scheduled',
        date: new Date().toISOString().split('T')[0]
      });
    }

    // onMatchesCreateに選択されたチーム情報も渡す
    onMatchesCreate(matches, selectedTeams);
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          {t('tournament.builder')}
        </Typography>

        {/* トーナメント設定 */}
        <Box sx={{ mb: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={hasThirdPlace}
                onChange={(e) => setHasThirdPlace(e.target.checked)}
              />
            }
            label={t('tournament.hasThirdPlace')}
          />
        </Box>

        {/* チーム選択と並び替え */}
        <Box sx={{ mb: 2 }}>
          <Button
            variant="outlined"
            onClick={() => setIsTeamSelectionOpen(true)}
            sx={{ mb: 2 }}
          >
            {t('tournament.selectTeams')}
          </Button>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="teams">
              {(provided) => (
                <List
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  sx={{ bgcolor: 'background.paper' }}
                >
                  {selectedTeams.map((team, index) => (
                    <Draggable key={team.id} draggableId={team.id} index={index}>
                      {(provided) => (
                        <ListItem
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          secondaryAction={
                            <IconButton 
                              edge="end" 
                              aria-label="delete"
                              onClick={() => handleTeamRemove(team.id)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          }
                        >
                          <SwapVertIcon sx={{ mr: 2, color: 'text.secondary' }} />
                          <ListItemText 
                            primary={team.name}
                            secondary={`${t('tournament.members')}: ${team.members?.length || 0}`}
                          />
                        </ListItem>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </List>
              )}
            </Droppable>
          </DragDropContext>
        </Box>

        {/* トーナメント生成ボタン */}
        <Button
          variant="contained"
          onClick={generateTournament}
          disabled={selectedTeams.length < 2}
          fullWidth
        >
          {t('tournament.generate')}
        </Button>
      </Paper>

      {/* チーム選択ダイアログ */}
      <Dialog 
        open={isTeamSelectionOpen} 
        onClose={() => setIsTeamSelectionOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{t('tournament.selectTeams')}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            {generateTeamCandidates().map((team) => (
              <Grid item xs={12} sm={6} key={team.id}>
                <Paper
                  sx={{
                    p: 2,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                  onClick={() => handleTeamSelect(team)}
                >
                  <Typography variant="subtitle1">{team.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('tournament.members')}: {team.members?.length || 0}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsTeamSelectionOpen(false)}>
            {t('common.close')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TournamentBuilder;
