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

    // 試合構造を生成
    const initialMatches = TournamentStructureHelper.generateInitialMatches(selectedTeams.length);
    const placements = TournamentStructureHelper.calculateTeamPlacements(selectedTeams);
    const getMatchId = (round: number, matchNumber: number): string => {
      const index = initialMatches.findIndex(match => {
        return match.round === round && match.matchNumber === matchNumber;
      });
      return `match_${index + 1}`;
    };

    // 試合データを生成
    const matches: Match[] = initialMatches.map((match, index) => {
      const matchPlacements = placements.filter(p => 
        p.round === match.round && p.matchNumber === match.matchNumber
      );

      const team1Placement = matchPlacements.find(p => p.position === 'team1');
      const team2Placement = matchPlacements.find(p => p.position === 'team2');
      
      const createdMatch: Match = {
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
      if (match.round > 1) {
        const firstPreviousId = getMatchId(match.round - 1, match.matchNumber * 2 - 1);
        const secondPreviousId = getMatchId(match.round - 1, match.matchNumber * 2);
        createdMatch.previousMatches = [firstPreviousId, secondPreviousId];
        createdMatch.team1Source = { type: 'winner', matchId: firstPreviousId };
        createdMatch.team2Source = { type: 'winner', matchId: secondPreviousId };
      }
      return createdMatch;
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

    if (sport.tournamentSettings?.hasThirdPlaceMatch && selectedTeams.length >= 4) {
      const maxRound = TournamentStructureHelper.calculateTotalRounds(selectedTeams.length);
      const semifinalMatches = matches.filter(match => match.round === maxRound - 1);
      if (semifinalMatches.length === 2) {
        matches.push({
          id: 'third_place_match',
          round: maxRound,
          matchNumber: 0,
          team1Id: '',
          team2Id: '',
          team1Score: 0,
          team2Score: 0,
          status: 'scheduled',
          date: new Date().toISOString().split('T')[0],
          previousMatches: semifinalMatches.map(match => match.id),
          team1Source: { type: 'loser', matchId: semifinalMatches[0].id },
          team2Source: { type: 'loser', matchId: semifinalMatches[1].id }
        });
      }
    }

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
