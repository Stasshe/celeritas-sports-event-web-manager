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

    // 試合構造を生成
    const initialMatches = TournamentStructureHelper.generateInitialMatches(selectedTeams.length);
    const placements = TournamentStructureHelper.calculateTeamPlacements(selectedTeams);

    // 試合データを生成
    const matches: Match[] = initialMatches.map((match, index) => {
      const matchPlacements = placements.filter(p => 
        p.round === match.round && p.matchNumber === match.matchNumber
      );

      const team1Placement = matchPlacements.find(p => p.position === 'team1');
      const team2Placement = matchPlacements.find(p => p.position === 'team2');
      
      return {
        id: `match_${index + 1}`,
        round: match.round,
        matchNumber: match.matchNumber,
        team1Id: team1Placement?.teamId || '',
        team2Id: team2Placement?.teamId || '',
        team1Score: 0,
        team2Score: 0,
        status: 'scheduled',
        date: new Date().toISOString().split('T')[0],
        winnerId: ''
      };
    });

    // 1回戦の不戦勝チームを自動的に次のラウンドに進出させる
    matches.forEach(match => {
      if (match.round === 1 && ((match.team1Id && !match.team2Id) || (!match.team1Id && match.team2Id))) {
        const winningTeamId = match.team1Id || match.team2Id;
        const nextMatch = matches.find(m =>
          m.round === 2 && Math.ceil(match.matchNumber / 2) === m.matchNumber
        );
        if (nextMatch) {
          if (match.matchNumber % 2 !== 0) {
            nextMatch.team1Id = winningTeamId;
          } else {
            nextMatch.team2Id = winningTeamId;
          }
        }
      }
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
