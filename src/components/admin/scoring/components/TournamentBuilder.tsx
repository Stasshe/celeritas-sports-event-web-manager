import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Chip,
  Stack
} from '@mui/material';
import { Match, Sport, Team } from '../../../../types';
import { useTranslation } from 'react-i18next';

interface TournamentBuilderProps {
  sport: Sport;
  onMatchesCreate: (matches: Match[]) => void;
}

export const TournamentBuilder: React.FC<TournamentBuilderProps> = ({ sport, onMatchesCreate }) => {
  const { t } = useTranslation();
  const [teams, setTeams] = useState<Team[]>([]);

  useEffect(() => {
    if (sport.teams) {
      setTeams([...sport.teams]);
    }
  }, [sport.teams]);

  const generateTournament = () => {
    if (!teams.length) return;

    const rounds = Math.ceil(Math.log2(teams.length));
    const totalTeams = Math.pow(2, rounds);
    const matches: Match[] = [];
    let matchId = 1;

    // 1回戦のマッチを生成
    for (let i = 0; i < totalTeams / 2; i++) {
      const team1 = teams[i * 2];
      const team2 = teams[i * 2 + 1];

      matches.push({
        id: `match_${matchId}`,
        round: 1,
        matchNumber: i + 1,
        team1Id: team1?.id || '',
        team2Id: team2?.id || '',
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

    // 3位決定戦を追加（設定で有効な場合）
    if (sport.tournamentSettings?.hasThirdPlaceMatch) {
      matches.push({
        id: `match_${matchId}`,
        round: rounds,
        matchNumber: 0, // 3位決定戦は特別な番号として0を使用
        team1Id: '',
        team2Id: '',
        team1Score: 0,
        team2Score: 0,
        status: 'scheduled',
        date: new Date().toISOString().split('T')[0]
      });
    }

    onMatchesCreate(matches);
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          {t('tournament.builder')}
        </Typography>
        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
          <Button
            variant="contained"
            onClick={generateTournament}
            disabled={!teams.length}
          >
            {t('tournament.generate')}
          </Button>
        </Stack>
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {t('tournament.teamsCount', { count: teams.length })}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
            {teams.map(team => (
              <Chip key={team.id} label={team.name} />
            ))}
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default TournamentBuilder;
