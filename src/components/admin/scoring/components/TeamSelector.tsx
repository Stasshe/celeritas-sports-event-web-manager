import React from 'react';
import {
  FormControl,
  Select,
  MenuItem,
  ListSubheader,
  Box,
  Chip,
  Typography
} from '@mui/material';
import { Team } from '../../../../types';
import { useTranslation } from 'react-i18next';
import { useTheme, alpha } from '@mui/material/styles';

interface TeamSelectorProps {
  selectedTeamId: string;
  teams: Team[];
  rosters: Record<string, string[]>;
  onChange: (teamId: string) => void;
}

const TeamSelector: React.FC<TeamSelectorProps> = ({
  selectedTeamId,
  teams,
  rosters,
  onChange
}) => {
  const { t } = useTranslation();
  const theme = useTheme();

  // クラスごとにチームをグループ化
  const groupedTeams = teams.reduce((acc, team) => {
    const className = team.name.split('-')[1] || 'その他';
    if (!acc[className]) {
      acc[className] = [];
    }
    acc[className].push(team);
    return acc;
  }, {} as Record<string, Team[]>);

  return (
    <FormControl fullWidth>
      <Select
        value={selectedTeamId}
        onChange={(e) => onChange(e.target.value)}
        displayEmpty
        renderValue={(selected) => {
          if (!selected) {
            return <em>{t('tournament.selectTeam')}</em>;
          }
          const team = teams.find(t => t.id === selected);
          return team ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: team.color || theme.palette.primary.main
                }}
              />
              <Typography>{team.name}</Typography>
            </Box>
          ) : selected;
        }}
      >
        <MenuItem value="">
          <em>{t('tournament.selectTeam')}</em>
        </MenuItem>
        {Object.entries(groupedTeams).map(([className, classTeams]) => [
          <ListSubheader key={`header-${className}`}>
            {className}
          </ListSubheader>,
          ...classTeams.map(team => (
            <MenuItem 
              key={team.id} 
              value={team.id}
              sx={{
                '&:hover': {
                  backgroundColor: alpha(team.color || theme.palette.primary.main, 0.1)
                }
              }}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: team.color || theme.palette.primary.main
                    }}
                  />
                  <Typography>{team.name}</Typography>
                </Box>
                {rosters[team.id] && (
                  <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                    {rosters[team.id].map((member, idx) => (
                      <Chip
                        key={idx}
                        label={member}
                        size="small"
                        variant="outlined"
                        sx={{ maxWidth: 120 }}
                      />
                    ))}
                  </Box>
                )}
              </Box>
            </MenuItem>
          ))
        ])}
      </Select>
    </FormControl>
  );
};

export default TeamSelector;
