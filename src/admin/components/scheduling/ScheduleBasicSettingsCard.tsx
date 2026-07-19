import React from 'react';
import {
  Alert,
  Box,
  Checkbox,
  Divider,
  FormControlLabel,
  Paper,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from '@mui/material';
import {
  SportsCricket as Court1Icon,
  SportsVolleyball as Court2Icon
} from '@mui/icons-material';
import { LeagueScheduleSettings, ScheduleSettings, Sport } from '../../../types';
import { getMatchContext, getMatchupLabel } from '../../../utils/match';
import { ScheduleSettingsForm } from '../../../hooks/useScheduleSettingsForm';

interface ScheduleBasicSettingsCardProps {
  sport: Sport;
  settings: ScheduleSettings | LeagueScheduleSettings;
  form: ScheduleSettingsForm;
}

const ScheduleBasicSettingsCard: React.FC<ScheduleBasicSettingsCardProps> = ({ sport, settings, form }) => {
  const matches = sport.matches || [];
  const leagueSettings = settings as LeagueScheduleSettings;

  return (
    <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2.5 } }}>
      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        基本設定
      </Typography>
      <Divider sx={{ mb: 2 }} />

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
        <TextField
          fullWidth
          size="small"
          label="開始時間"
          type="time"
          value={settings.startTime}
          onChange={e => form.handleFieldChange('startTime', e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          fullWidth
          size="small"
          label="終了時間"
          type="time"
          value={settings.endTime}
          onChange={e => form.handleFieldChange('endTime', e.target.value)}
          InputLabelProps={{ shrink: true }}
        />

        {sport.type !== 'ranking' && (
          <>
            <TextField
              fullWidth
              size="small"
              label="1試合の所要時間 (分)"
              type="number"
              value={settings.matchDuration}
              onChange={e => form.handleFieldChange('matchDuration', e.target.value)}
              InputProps={{ inputProps: { min: 5 } }}
            />
            <TextField
              fullWidth
              size="small"
              label="試合間の休憩時間 (分)"
              type="number"
              value={settings.breakDuration}
              onChange={e => form.handleFieldChange('breakDuration', e.target.value)}
              InputProps={{ inputProps: { min: 0 } }}
            />
          </>
        )}

        {sport.type === 'league' && (
          <>
            <TextField
              fullWidth
              size="small"
              label="プレーオフの試合時間 (分)"
              type="number"
              value={leagueSettings.playoffDuration}
              onChange={e => form.handleFieldChange('playoffDuration', e.target.value)}
              InputProps={{ inputProps: { min: 1 } }}
            />
            <TextField
              fullWidth
              size="small"
              label="ブロック→プレーオフ間休憩（分）"
              type="number"
              value={leagueSettings.blockToPlayoffBreak ?? ''}
              onChange={e => form.handleFieldChange('blockToPlayoffBreak', e.target.value)}
              InputProps={{ inputProps: { min: 0 } }}
            />
          </>
        )}
      </Box>

      <FormControlLabel
        sx={{ mt: 1.5 }}
        control={
          <Switch
            checked={settings.allowEndTimeOverrun ?? false}
            onChange={e => form.handleAllowOverrunChange(e.target.checked)}
          />
        }
        label="終了時間を超えても全試合を生成"
      />

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle2" gutterBottom>
        コート設定
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'auto 1fr 1fr' }, gap: 2, alignItems: 'center' }}>
        <ToggleButtonGroup
          value={settings.courtCount}
          exclusive
          size="small"
          aria-label="court count"
          onChange={(_, value) => value !== null && form.handleCourtCountChange(value)}
        >
          <ToggleButton value={1} aria-label="1 court">
            <Court1Icon fontSize="small" sx={{ mr: 0.5 }} />
            1コート
          </ToggleButton>
          <ToggleButton value={2} aria-label="2 courts">
            <Court2Icon fontSize="small" sx={{ mr: 0.5 }} />
            2コート
          </ToggleButton>
        </ToggleButtonGroup>
        <TextField
          fullWidth
          size="small"
          label="コート1名"
          value={settings.courtNames?.court1 || '第1コート'}
          onChange={e => form.handleCourtNameChange('court1', e.target.value)}
        />
        {settings.courtCount === 2 && (
          <TextField
            fullWidth
            size="small"
            label="コート2名"
            value={settings.courtNames?.court2 || '第2コート'}
            onChange={e => form.handleCourtNameChange('court2', e.target.value)}
          />
        )}
      </Box>

      {sport.type === 'ranking' && (
        <Alert severity="info" sx={{ mt: 2 }}>
          ランキング形式は開始・終了時間の枠のみ使用します
        </Alert>
      )}

      {sport.type !== 'ranking' && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" gutterBottom>
            生成する試合（{matches.length}件）
          </Typography>
          {matches.length === 0 ? (
            <Alert severity="warning">試合がありません</Alert>
          ) : (
            <Box sx={{ maxHeight: 220, overflowY: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              {matches.map(match => {
                const included = !settings.excludedMatchIds?.includes(match.id);
                return (
                  <FormControlLabel
                    key={match.id}
                    sx={{ display: 'flex', m: 0, px: 1, py: 0.25, '&:hover': { bgcolor: 'action.hover' } }}
                    control={
                      <Checkbox
                        size="small"
                        checked={included}
                        onChange={e => form.handleMatchIncludedChange(match.id, e.target.checked)}
                      />
                    }
                    label={
                      <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
                        {getMatchContext(match, sport)}: {getMatchupLabel(match, sport)}
                      </Typography>
                    }
                  />
                );
              })}
            </Box>
          )}
        </>
      )}
    </Paper>
  );
};

export default ScheduleBasicSettingsCard;
