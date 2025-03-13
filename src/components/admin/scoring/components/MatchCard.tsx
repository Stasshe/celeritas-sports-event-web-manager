import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Chip,
  Tooltip,
  useTheme
} from '@mui/material';
import {
  Edit as EditIcon,
  SportsSoccer as MatchIcon
} from '@mui/icons-material';
import { Match, Sport } from '../../../../types';
import { useTranslation } from 'react-i18next';
import { useThemeContext } from '../../../../contexts/ThemeContext';

interface MatchCardProps {
  match: Match;
  sport: Sport;
  onEdit: () => void;
}

const MatchCard: React.FC<MatchCardProps> = ({ match, sport, onEdit }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { alpha } = useThemeContext();

  const getTeamName = (teamId: string) => {
    if (!teamId) return t('tournament.tbd');
    if (!sport?.teams) return teamId;
    
    const team = sport.teams.find(t => t.id === teamId);
    return team ? team.name : teamId;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return theme.palette.success.main;
      case 'inProgress':
        return theme.palette.warning.main;
      default:
        return theme.palette.grey[500];
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <MatchIcon sx={{ mr: 1, color: 'text.secondary' }} />
          <Typography variant="subtitle2">
            {t('match.number', { number: match.matchNumber })}
          </Typography>
        </Box>
        <Box>
          <Chip
            label={t(`match.${match.status}`)}
            size="small"
            sx={{
              backgroundColor: getStatusColor(match.status),
              color: 'white',
              mr: 1
            }}
          />
          <Tooltip title={t('match.edit')}>
            <IconButton size="small" onClick={onEdit}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 1,
        p: 1,
        bgcolor: 'background.default',
        borderRadius: 1
      }}>
        <TeamScore
          name={getTeamName(match.team1Id)}
          score={match.team1Score}
          isWinner={match.winnerId === match.team1Id}
        />
        <TeamScore
          name={getTeamName(match.team2Id)}
          score={match.team2Score}
          isWinner={match.winnerId === match.team2Id}
        />
      </Box>

      {match.date && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          {new Date(match.date).toLocaleDateString()}
        </Typography>
      )}
    </Box>
  );
};

const TeamScore: React.FC<{ name: string; score: number; isWinner: boolean }> = ({ 
  name, 
  score, 
  isWinner 
}) => {
  const { alpha } = useThemeContext();  // ここにも alpha を追加
  
  return (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'space-between',
      alignItems: 'center',
      p: 1,
      bgcolor: isWinner ? alpha('#4caf50', 0.1) : 'transparent',
      borderRadius: 1
    }}>
      <Typography variant="body2" sx={{ fontWeight: isWinner ? 'bold' : 'normal' }}>
        {name}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
        {score}
      </Typography>
    </Box>
  );
};

export default MatchCard;
