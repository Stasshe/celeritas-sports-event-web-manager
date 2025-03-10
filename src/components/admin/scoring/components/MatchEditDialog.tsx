import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography
} from '@mui/material';
import { SelectChangeEvent } from '@mui/material/Select';
import { Match, Sport } from '../../../../types';
import { useTranslation } from 'react-i18next';
import TeamSelector from './TeamSelector';

interface MatchEditDialogProps {
  open: boolean;
  match: Match | null;
  sport: Sport;
  teamRosters: Record<string, string[]>;
  onClose: () => void;
  onSave: (match: Match) => void;
}

const MatchEditDialog: React.FC<MatchEditDialogProps> = ({
  open,
  match,
  sport,
  teamRosters,
  onClose,
  onSave
}) => {
  const { t } = useTranslation();
  const [editedMatch, setEditedMatch] = useState<Match | null>(null);

  useEffect(() => {
    if (match) {
      setEditedMatch({ ...match });
    }
  }, [match]);

  if (!editedMatch) return null;

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setEditedMatch(prev => ({
      ...prev!,
      [name]: value
    }));
  };

  const handleScoreChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    team: 'team1' | 'team2'
  ) => {
    const score = parseInt(e.target.value) || 0;
    setEditedMatch(prev => ({
      ...prev!,
      [`${team}Score`]: score
    }));
  };

  const handleTeamChange = (teamId: string, position: 'team1' | 'team2') => {
    setEditedMatch(prev => ({
      ...prev!,
      [`${position}Id`]: teamId
    }));
  };

  const handleStatusChange = (e: SelectChangeEvent<'scheduled' | 'inProgress' | 'completed'>) => {
    const status = e.target.value as 'scheduled' | 'inProgress' | 'completed';
    setEditedMatch((prev: Match) => ({
      ...prev,
      status,
      // 勝者は prev を使用して計算
      winnerId: status === 'completed'
        ? (prev.team1Score > prev.team2Score ? prev.team1Id
           : prev.team2Score > prev.team1Score ? prev.team2Id
           : undefined)
        : undefined
    }));
  };

  const handleSave = () => {
    if (editedMatch) {
      onSave(editedMatch);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {editedMatch.id ? 
          t('match.editTitle', { number: editedMatch.matchNumber }) :
          t('match.newTitle')}
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              name="matchNumber"
              label={t('match.number')}
              type="number"
              fullWidth
              value={editedMatch.matchNumber}
              onChange={handleInputChange}
              inputProps={{ min: 0 }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>{t('match.status')}</InputLabel>
              <Select
                value={editedMatch.status}
                onChange={handleStatusChange}
                label={t('match.status')}
              >
                <MenuItem value="scheduled">{t('match.scheduled')}</MenuItem>
                <MenuItem value="inProgress">{t('match.inProgress')}</MenuItem>
                <MenuItem value="completed">{t('match.completed')}</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                {t('match.team1')}
              </Typography>
              <TeamSelector
                selectedTeamId={editedMatch.team1Id}
                teams={sport.teams}
                rosters={teamRosters}
                onChange={(teamId) => handleTeamChange(teamId, 'team1')}
              />
            </Box>
            <TextField
              label={t('match.score')}
              type="number"
              fullWidth
              value={editedMatch.team1Score}
              onChange={(e) => handleScoreChange(e, 'team1')}
              inputProps={{ min: 0 }}
            />
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                {t('match.team2')}
              </Typography>
              <TeamSelector
                selectedTeamId={editedMatch.team2Id}
                teams={sport.teams}
                rosters={teamRosters}
                onChange={(teamId) => handleTeamChange(teamId, 'team2')}
              />
            </Box>
            <TextField
              label={t('match.score')}
              type="number"
              fullWidth
              value={editedMatch.team2Score}
              onChange={(e) => handleScoreChange(e, 'team2')}
              inputProps={{ min: 0 }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              name="date"
              label={t('match.date')}
              type="date"
              fullWidth
              value={editedMatch.date || ''}
              onChange={handleInputChange}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              name="notes"
              label={t('match.notes')}
              multiline
              rows={2}
              fullWidth
              value={editedMatch.notes || ''}
              onChange={handleInputChange}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button variant="contained" color="primary" onClick={handleSave}>
          {t('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MatchEditDialog;
