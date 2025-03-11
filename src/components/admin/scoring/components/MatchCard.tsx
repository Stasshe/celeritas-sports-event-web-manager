import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Chip,
  useTheme,
  Tooltip
} from '@mui/material';
import {
  Edit as EditIcon,
  Sports as SportsIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { Match, Sport } from '../../../../types';
import { useTranslation } from 'react-i18next';

interface MatchCardProps {
  match: Match;
  sport: Sport;
  showEdit?: boolean;
  onEdit?: () => void;
}

const MatchCard: React.FC<MatchCardProps> = ({ match, sport, showEdit = true, onEdit }) => {
  const { t } = useTranslation();
  const theme = useTheme();

  const getTeamName = (teamId?: string) => {
    if (!teamId) return t('tournament.tbd');
    return sport.teams?.find(t => t.id === teamId)?.name || t('tournament.tbd');
  };

  const getStatusColor = () => {
    switch (match.status) {
      case 'completed':
        return theme.palette.success.main;
      case 'inProgress':
        return theme.palette.warning.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const getStatusIcon = () => {
    switch (match.status) {
      case 'completed':
        return <CheckCircleIcon fontSize="small" />;
      case 'inProgress':
        return <SportsIcon fontSize="small" />;
      default:
        return <ScheduleIcon fontSize="small" />;
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Chip
          icon={getStatusIcon()}
          label={t(`match.status.${match.status}`)}
          size="small"
          sx={{ 
            backgroundColor: `${getStatusColor()}20`,
            color: getStatusColor(),
            '& .MuiChip-icon': {
              color: 'inherit'
            }
          }}
        />
        {showEdit && (
          <IconButton size="small" onClick={onEdit}>
            <EditIcon fontSize="small" />
          </IconButton>
        )}
      </Box>

      {[
        { teamId: match.team1Id || '', score: match.team1Score, isWinner: match.winnerId === match.team1Id },
        { teamId: match.team2Id || '', score: match.team2Score, isWinner: match.winnerId === match.team2Id }
      ].map((team, index) => (
        <Box
          key={index}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 1,
            backgroundColor: team.isWinner ? theme.palette.success.light : 'transparent',
            borderRadius: 1,
            mb: index === 0 ? 1 : 0
          }}
        >
          <Typography
            sx={{
              fontWeight: team.isWinner ? 'bold' : 'normal',
              color: team.isWinner ? theme.palette.success.dark : 'text.primary'
            }}
          >
            {getTeamName(team.teamId)}
          </Typography>
          <Typography
            sx={{
              fontWeight: 'bold',
              color: team.isWinner ? theme.palette.success.dark : 'text.primary'
            }}
          >
            {team.score}
          </Typography>
        </Box>
      ))}

      {match.date && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          {new Date(match.date).toLocaleDateString()}
        </Typography>
      )}
    </Box>
  );
};

export default MatchCard;
