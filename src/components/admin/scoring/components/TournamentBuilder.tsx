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
import { TournamentStructureHelper } from './TournamentStructureHelper';

interface TournamentBuilderProps {
  sport: Sport;
  onMatchesCreate: (matches: Match[], selectedTeams: Team[]) => void;
}

export const TournamentBuilder = memo(({ sport, onMatchesCreate }: TournamentBuilderProps) => {
  const { t } = useTranslation();
  const [selectedTeams, setSelectedTeams] = useState<Team[]>([]);

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
              name: `${gradeKey}-${className}`,
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
      if (!window.confirm(t('tournament.confirmReset'))) {
        return;
      }
    }

    const matches: Match[] = [];
    let matchId = 1;

    // 1回戦の試合を生成
    // 最初の試合（2チーム対戦）
    matches.push({
      id: `match_${matchId++}`,
      round: 1,
      matchNumber: 1,
      team1Id: selectedTeams[0].id,
      team2Id: selectedTeams[1].id,
      team1Score: 0,
      team2Score: 0,
      status: 'scheduled',
      date: new Date().toISOString().split('T')[0],
      winnerId: ''
    });

    // 残りのチームの1回戦試合（vs none）
    for (let i = 2; i < selectedTeams.length; i++) {
      matches.push({
        id: `match_${matchId++}`,
        round: 1,
        matchNumber: i,
        team1Id: selectedTeams[i].id,
        team2Id: '', // 空の対戦相手
        team1Score: 0,
        team2Score: 0,
        status: 'scheduled',
        date: new Date().toISOString().split('T')[0],
        winnerId: ''
      });
    }

    // 2回戦の試合を生成（2試合）
    matches.push({
      id: `match_${matchId++}`,
      round: 2,
      matchNumber: 1,
      team1Id: '',  // 1回戦の勝者が進出
      team2Id: selectedTeams[2].id,  // 3番目のチーム
      team1Score: 0,
      team2Score: 0,
      status: 'scheduled',
      date: new Date().toISOString().split('T')[0],
      winnerId: ''
    });

    matches.push({
      id: `match_${matchId++}`,
      round: 2,
      matchNumber: 2,
      team1Id: selectedTeams[3].id,  // 4番目のチーム
      team2Id: selectedTeams[4].id,  // 5番目のチーム
      team1Score: 0,
      team2Score: 0,
      status: 'scheduled',
      date: new Date().toISOString().split('T')[0],
      winnerId: ''
    });

    // 決勝戦
    matches.push({
      id: `match_${matchId++}`,
      round: 3,
      matchNumber: 1,
      team1Id: '',
      team2Id: '',
      team1Score: 0,
      team2Score: 0,
      status: 'scheduled',
      date: new Date().toISOString().split('T')[0],
      winnerId: ''
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
            <List sx={{ mb: 2 }}>
              {selectedTeams.map((team, index) => (
                <ListItem key={team.id}>
                  <ListItemText 
                    primary={team.name}
                    secondary={`${t('tournament.members')}: ${team.members?.length || 0}`}
                  />
                </ListItem>
              ))}
            </List>

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
