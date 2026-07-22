import React, { memo, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Box,
  Typography,
  Paper,
  Button,
} from '@mui/material';
import { Match, Sport, Team } from '../types';
import { TournamentStructureHelper } from './TournamentStructureHelper';
import { createTournamentMatches } from './tournament';

interface TournamentBuilderProps {
  sport: Sport;
  onMatchesCreate: (matches: Match[], selectedTeams: Team[]) => void;
}

export const TournamentBuilder = memo(({ sport, onMatchesCreate }: TournamentBuilderProps) => {
  const navigate = useNavigate();
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

  return (
    <Box sx={{ mb: 3 }}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          {"トーナメント作成"}
        </Typography>

        {selectedTeams.length > 0 ? (
          <Button
            variant="contained"
            onClick={generateTournament}
            fullWidth
          >
            {"トーナメント表生成"}
          </Button>
        ) : (
          <Box sx={{ textAlign: 'center' }}>
            <Typography sx={{ color: "text.secondary" }}>
              {"名簿がありません"}
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate(`/admin/sports/${sport.id}?tab=roster`)}
              sx={{ mt: 2 }}
            >
              名簿を追加する
            </Button>
          </Box>
        )}
      </Paper>
    </Box>
  );
});

export default TournamentBuilder;
