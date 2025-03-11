import React, { useState, memo, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';

import { Match, Sport, Team } from '../../../../types';
import { useTranslation } from 'react-i18next';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

interface TournamentBuilderProps {
  sport: Sport;
  onMatchesCreate: (matches: Match[], selectedTeams: Team[]) => void;
}

// メモ化されたドラッグ可能なチームアイテムコンポーネント
const DraggableTeamItem = memo(({ team, index }: { team: Team; index: number }) => {
  const { t } = useTranslation();
  return (
    <Draggable draggableId={team.id} index={index}>
      {(provided, snapshot) => (
        <ListItem
          ref={provided.innerRef}
          {...provided.draggableProps}
          sx={{
            bgcolor: snapshot.isDragging ? 'action.hover' : 'background.paper',
            '& .dragHandle': {
              visibility: snapshot.isDragging ? 'visible' : 'hidden',
            },
            '&:hover .dragHandle': {
              visibility: 'visible',
            }
          }}
        >
          <ListItemText 
            primary={team.name}
            secondary={`${t('tournament.members')}: ${team.members?.length || 0}`}
          />
        </ListItem>
      )}
    </Draggable>
  );
});

export const TournamentBuilder = memo(({ sport, onMatchesCreate }: TournamentBuilderProps) => {
  const { t } = useTranslation();
  const [selectedTeams, setSelectedTeams] = useState<Team[]>([]);

  // コンポーネントマウント時に名簿からチームを自動生成
  useEffect(() => {
    if (sport.roster) {
      const teams: Team[] = [];
      const grades = ['grade1', 'grade2', 'grade3'];
      
      // 全学年の名簿をループ
      grades.forEach(gradeKey => {
        const classes = sport.roster?.[gradeKey as keyof typeof sport.roster] || {};
        
        // 各クラスをチームとして追加
        Object.entries(classes).forEach(([className, members]) => {
          if (members && members.length > 0) {
            const teamId = `team_${gradeKey}_${className}`;
            teams.push({
              id: teamId,
              name: `${gradeKey}-${className}`,
              members: members
            });
          }
        });
      });

      // チームが見つかった場合のみ更新
      if (teams.length > 0) {
        setSelectedTeams(teams);
      }
    }
  }, [sport.roster]);

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const items = Array.from(selectedTeams);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setSelectedTeams(items);
  };

  const generateTournament = () => {
    if (!selectedTeams.length) return;

    const rounds = Math.ceil(Math.log2(selectedTeams.length));
    const matches: Match[] = [];
    let matchId = 1;

    // 1回戦のマッチを生成
    const firstRoundMatches = Math.pow(2, rounds - 1);
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
          round,
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

    onMatchesCreate(matches, selectedTeams);
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          {t('tournament.builder')}
        </Typography>

        {selectedTeams.length > 0 ? (
          <>
            <Box sx={{ mb: 2 }}>
              <Typography color="text.secondary" gutterBottom>
                {t('tournament.selectedTeams', { count: selectedTeams.length })}
              </Typography>
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="teams">
                  {(provided) => (
                    <List
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      sx={{ 
                        bgcolor: 'background.paper',
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                      }}
                    >
                      {selectedTeams.map((team, index) => (
                        <DraggableTeamItem
                          key={team.id}
                          team={team}
                          index={index}
                        />
                      ))}
                      {provided.placeholder}
                    </List>
                  )}
                </Droppable>
              </DragDropContext>
            </Box>

            <Button
              variant="contained"
              onClick={generateTournament}
              fullWidth
            >
              {t('tournament.generate')}
            </Button>
          </>
        ) : (
          <Typography color="text.secondary" align="center">
            {t('tournament.noRoster')}
          </Typography>
        )}
      </Paper>
    </Box>
  );
});

export default TournamentBuilder;
