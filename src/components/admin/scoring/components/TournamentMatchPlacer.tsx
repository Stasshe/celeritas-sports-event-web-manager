import React from 'react';
import { Box, Button } from '@mui/material';
import { Sport, Match } from '../../../../types';
import { useTranslation } from 'react-i18next';

interface TournamentMatchPlacerProps {
  sport: Sport;
  onMatchesUpdate: (matches: Match[]) => void;
}

const TournamentMatchPlacer: React.FC<TournamentMatchPlacerProps> = ({
  sport,
  onMatchesUpdate
}) => {
  const { t } = useTranslation();

  const handleShuffleTeams = () => {
    if (!sport.matches) return;
    
    // 1回戦の試合のみをシャッフル
    const firstRoundMatches = sport.matches.filter(m => m.round === 1);
    const otherMatches = sport.matches.filter(m => m.round !== 1);
    
    // チームをシャッフル
    const shuffledMatches = [...firstRoundMatches].sort(() => Math.random() - 0.5);
    
    onMatchesUpdate([...shuffledMatches, ...otherMatches]);
  };

  return (
    <Box>
      <Button variant="outlined" onClick={handleShuffleTeams}>
        {t('tournament.shuffleTeams')}
      </Button>
    </Box>
  );
};

export default TournamentMatchPlacer;
