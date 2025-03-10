import React from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Grid,
  Chip,
  Stack,
} from '@mui/material';
import { Sport, Team, Match } from '../../../../types';
import { TournamentStructureHelper } from './TournamentStructureHelper';
import { useTranslation } from 'react-i18next';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

interface TournamentMatchPlacerProps {
  sport: Sport;
  onMatchesUpdate: (matches: Match[]) => void;
}

const TournamentMatchPlacer: React.FC<TournamentMatchPlacerProps> = ({
  sport,
  onMatchesUpdate
}) => {
  const { t } = useTranslation();

  const handleAutoPlace = () => {
    if (!sport.teams || sport.teams.length === 0) {
      return;
    }

    const teams = [...sport.teams];
    const shuffledTeams = teams.sort(() => Math.random() - 0.5);
    const structure = TournamentStructureHelper.generateInitialMatches(teams.length);
    
    const matches: Match[] = [];
    let teamIndex = 0;

    // 各ラウンドのマッチを生成
    structure.forEach((matchInfo, index) => {
      // 最初のラウンドのみチームを割り当て
      const match: Match = {
        id: `match_${Date.now()}_${index}`,
        round: matchInfo.round,
        matchNumber: matchInfo.matchNumber,
        team1Id: matchInfo.round === 1 ? shuffledTeams[teamIndex++]?.id || '' : '',
        team2Id: matchInfo.round === 1 ? shuffledTeams[teamIndex++]?.id || '' : '',
        team1Score: 0,
        team2Score: 0,
        status: 'scheduled',
        date: new Date().toISOString().split('T')[0],
      };
      matches.push(match);
    });

    onMatchesUpdate(matches);
  };

  return (
    <Box>
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Button
          variant="contained"
          onClick={handleAutoPlace}
        >
          {t('tournament.autoPlace')}
        </Button>
      </Stack>
    </Box>
  );
};

export default TournamentMatchPlacer;
