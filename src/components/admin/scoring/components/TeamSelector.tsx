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
  disabled?: boolean;
  compact?: boolean; // コンパクトモードを追加
}

const TeamSelector: React.FC<TeamSelectorProps> = ({
  selectedTeamId,
  teams,
  rosters,
  onChange,
  disabled = false,
  compact = false
}) => {
  const { t } = useTranslation();

  return (
    <Box sx={{ flex: compact ? 1 : 'auto' }}>
      <FormControl fullWidth>
        <Select
          value={selectedTeamId}
          onChange={(e) => onChange(e.target.value)}
          displayEmpty
          disabled={disabled}
          size={compact ? "small" : "medium"}
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
                {!compact && rosters[team.id] && (
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
      {disabled && !compact && (
        <Typography 
          variant="caption" 
          color="info.main" 
          sx={{ display: 'block', mt: 0.5 }}
        >
          1stラウンド以外でチームの選択はできません。
        </Typography>
      )}
    </Box>
  );
};

export default TeamSelector;
