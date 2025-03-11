import React from 'react';
import {
  Paper,
  List,
  ListItem,
  ListItemText,
  Typography,
  Box,
  IconButton,
  Tooltip,
  Chip
} from '@mui/material';
import {
  DragHandle as DragHandleIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { Team } from '../../../../types';
import { useTranslation } from 'react-i18next';

interface SeedOrderManagerProps {
  teams: Team[];
  onTeamsReorder: (newOrder: Team[]) => void;
}

const SeedOrderManager: React.FC<SeedOrderManagerProps> = ({ teams, onTeamsReorder }) => {
  const { t } = useTranslation();

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const items = Array.from(teams);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    onTeamsReorder(items);
  };

  const moveTeam = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === teams.length - 1)
    ) return;

    const newTeams = [...teams];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [newTeams[index], newTeams[newIndex]] = [newTeams[newIndex], newTeams[index]];
    onTeamsReorder(newTeams);
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        {t('tournament.seedOrder')}
      </Typography>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="seeds">
          {(provided) => (
            <List {...provided.droppableProps} ref={provided.innerRef}>
              {teams.map((team, index) => (
                <Draggable key={team.id} draggableId={team.id} index={index}>
                  {(provided) => (
                    <ListItem
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      sx={{
                        bgcolor: 'background.paper',
                        mb: 1,
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider'
                      }}
                    >
                      <Box {...provided.dragHandleProps} sx={{ mr: 2 }}>
                        <DragHandleIcon />
                      </Box>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip size="small" label={`#${index + 1}`} />
                            <Typography>{team.name}</Typography>
                          </Box>
                        }
                      />
                      <Box>
                        <Tooltip title={t('tournament.moveUp')}>
                          <IconButton
                            size="small"
                            onClick={() => moveTeam(index, 'up')}
                            disabled={index === 0}
                          >
                            <ArrowUpwardIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('tournament.moveDown')}>
                          <IconButton
                            size="small"
                            onClick={() => moveTeam(index, 'down')}
                            disabled={index === teams.length - 1}
                          >
                            <ArrowDownwardIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </ListItem>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </List>
          )}
        </Droppable>
      </DragDropContext>
    </Paper>
  );
};

export default SeedOrderManager;
