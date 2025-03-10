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

  return (
    <FormControl fullWidth>
      <Select
        value={selectedTeamId}
        onChange={(e) => onChange(e.target.value)}
        displayEmpty
      >
        <MenuItem value="">
          <em>{t('tournament.selectTeam')}</em>
        </MenuItem>
        {teams.map(team => (
          <MenuItem key={team.id} value={team.id}>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography>
                {team.name}
              </Typography>
              {rosters[team.id] && (
                <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                  {rosters[team.id].slice(0, 3).map((member, idx) => (
                    <Chip
                      key={idx}
                      label={member}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                  {rosters[team.id].length > 3 && (
                    <Chip
                      label={`+${rosters[team.id].length - 3}`}
                      size="small"
                    />
                  )}
                </Box>
              )}
            </Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default TeamSelector;
