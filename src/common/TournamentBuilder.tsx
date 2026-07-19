import React, { useState, memo, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  List,
  ListItem,
  ListItemText,
  Collapse,
  Chip,
  IconButton,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon, ExpandLess as ExpandLessIcon } from '@mui/icons-material';
import { Match, Sport, Team } from '../types';
import { TournamentStructureHelper } from './TournamentStructureHelper';
import { createTournamentMatches } from './tournament';

interface TournamentBuilderProps {
  sport: Sport;
  onMatchesCreate: (matches: Match[], selectedTeams: Team[]) => void;
}

export const TournamentBuilder = memo(({ sport, onMatchesCreate }: TournamentBuilderProps) => {
  const [selectedTeams, setSelectedTeams] = useState<Team[]>([]);
  const [teamsExpanded, setTeamsExpanded] = useState(false);

  // 名簿からチームを自動生成
  useEffect(() => {
    if (sport.roster) {
      const teams: Team[] = [];
      const grades = ['grade1', 'grade2', 'grade3'];
      
      grades.forEach(gradeKey => {
        const classes = sport.roster?.[gradeKey as keyof typeof sport.roster] || {};
        
        Object.entries(classes).forEach(([className, members]) => {
          if (members && members.length > 0) {
            teams.push({
              id: `team_${gradeKey}_${className}`,
              name: className,
              members: members
            });
          }
        });
      });

      if (teams.length > 0) {
        setSelectedTeams(teams);
      }
    }
  }, [sport.roster]);

  const generateTournament = () => {
    if (!selectedTeams.length) return;

    // 既存の得点があるか確認
    if (sport.matches && TournamentStructureHelper.hasExistingScores(sport.matches)) {
      if (!window.confirm("トーナメント表をリセットしますか？")) {
        return;
      }
    }

    const matches = createTournamentMatches(
      selectedTeams,
      sport.tournamentSettings?.hasThirdPlaceMatch ?? false
    );

    onMatchesCreate(matches, selectedTeams);
  };

  const toggleTeamsExpanded = () => {
    setTeamsExpanded(!teamsExpanded);
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          {"トーナメント作成"}
        </Typography>

        {selectedTeams.length > 0 ? (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Chip 
                label={`${selectedTeams.length}チーム選択中`} 
                color="primary" 
                sx={{ mr: 1 }}
              />
              <IconButton size="small" onClick={toggleTeamsExpanded} aria-expanded={teamsExpanded}>
                {teamsExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Box>

            <Collapse in={teamsExpanded}>
              <List sx={{ mb: 2, maxHeight: 200, overflow: 'auto' }}>
                {selectedTeams.map((team, index) => (
                  <ListItem key={team.id}>
                    <ListItemText 
                      primary={team.name}
                      secondary={`${"参加者数"}: ${team.members?.length || 0}`}
                    />
                  </ListItem>
                ))}
              </List>
            </Collapse>

            <Button
              variant="contained"
              onClick={generateTournament}
              fullWidth
            >
              {"トーナメント表生成"}
            </Button>
          </>
        ) : (
          <Typography color="text.secondary" align="center">
            {"名簿がありません"}
          </Typography>
        )}
      </Paper>
    </Box>
  );
});

export default TournamentBuilder;
