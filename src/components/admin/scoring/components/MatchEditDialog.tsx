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
    if (!editedMatch) return;
    const { name, value } = e.target;
    setEditedMatch(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        [name]: value
      };
    });
  };

  const handleScoreChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    team: 'team1' | 'team2'
  ) => {
    if (!editedMatch) return;
    const score = parseInt(e.target.value) || 0;
    setEditedMatch(prev => {
      if (!prev) return prev;
      
      return {
        ...prev,
        [`${team}Score`]: score
      };
    });
  };

  const handleTeamChange = (teamId: string, position: 'team1' | 'team2') => {
    if (!editedMatch) return;
    setEditedMatch(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        [`${position}Id`]: teamId
      };
    });
  };

  const handleStatusChange = (e: SelectChangeEvent<'scheduled' | 'inProgress' | 'completed'>) => {
    if (!editedMatch) return;
    
    const status = e.target.value as 'scheduled' | 'inProgress' | 'completed';
    setEditedMatch(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        status,
        // 勝者は現在の editedMatch を使用して計算
        winnerId: status === 'completed'
          ? (prev.team1Score > prev.team2Score ? prev.team1Id
             : prev.team2Score > prev.team1Score ? prev.team2Id
             : undefined)
          : undefined
      };
    });
  };

  const handleSave = () => {
    if (editedMatch) {
      onSave(editedMatch);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogContent dividers>
        <Grid container spacing={3}>
          

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
