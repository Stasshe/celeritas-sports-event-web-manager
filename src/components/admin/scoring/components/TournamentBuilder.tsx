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
import { TournamentStructureHelper } from './TournamentStructureHelper';

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
          {...provided.dragHandleProps} // ドラッグハンドルを追加
          sx={{
            bgcolor: snapshot.isDragging ? 'action.hover' : 'background.paper',
            cursor: 'move'
          }}
        >
          <ListItemText 
            primary={team.name}
            secondary={t('tournament.members', { count: team.members?.length || 0 })}
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
    if (sport.roster && (!sport.teams || sport.teams.length === 0)) {
      const teams: Team[] = [];
      const grades = ['grade1', 'grade2', 'grade3'];
      
      grades.forEach(gradeKey => {
        const classes = sport.roster?.[gradeKey as keyof typeof sport.roster] || {};
        
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

      if (teams.length > 0) {
        setSelectedTeams(teams);
      }
    } else if (sport.teams && sport.teams.length > 0) {
      setSelectedTeams(sport.teams);
    }
  }, [sport.roster, sport.teams]);

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const items = Array.from(selectedTeams);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setSelectedTeams(items);
  };

  const generateTournament = () => {
    if (!selectedTeams.length) return;
    
    const tournamentStructure = TournamentStructureHelper.createMatchStructure(selectedTeams.length);
    const matches: Match[] = tournamentStructure.matches.map((match) => {
      let team1Id = '', team2Id = '';
      
      if (match.isSeed) {
        // シードチームの配置
        team1Id = selectedTeams[match.teamIndexes[0]]?.id || '';
      } else if (match.round === 1) {
        // 1回戦のチーム配置
        team1Id = selectedTeams[match.teamIndexes[0]]?.id || '';
        team2Id = selectedTeams[match.teamIndexes[1]]?.id || '';
      }

      return {
        id: match.id,
        round: match.round,
        matchNumber: match.matchNumber,
        team1Id,
        team2Id,
        team1Score: 0,
        team2Score: 0,
        status: 'scheduled',
        winnerId: '',
        date: new Date().toISOString().split('T')[0],
        isSeed: match.isSeed
      };
    });

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
