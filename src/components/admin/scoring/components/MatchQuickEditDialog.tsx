import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { Match, Sport, Team } from '../../../../types';
import { useTranslation } from 'react-i18next';

interface MatchQuickEditDialogProps {
  open: boolean;
  match: Match;
  sport: Sport;
  onClose: () => void;
  onSave: (match: Match) => void;
}

const MatchQuickEditDialog: React.FC<MatchQuickEditDialogProps> = ({
  open,
  match,
  sport,
  onClose,
  onSave
}) => {
  const { t } = useTranslation();
  const [editedMatch, setEditedMatch] = useState<Match>({ ...match });

  // matchの変更を検出して、編集中のマッチを更新
  useEffect(() => {
    setEditedMatch({ ...match });
  }, [match]);

  const getNextMatchId = () => {
    if (!sport.matches) return null;
    return sport.matches.find(m => 
      m.round === editedMatch.round + 1 && 
      Math.ceil(editedMatch.matchNumber / 2) === m.matchNumber
    )?.id;
  };

  // 次の試合の更新
  const updateNextMatch = (winnerId: string | null) => {
    const nextMatchId = getNextMatchId();
    if (!nextMatchId || !sport.matches) return;

    const nextMatch = sport.matches.find(m => m.id === nextMatchId);
    if (!nextMatch) return;

    // 勝者を次の試合に進出させる
    const isFirstTeam = editedMatch.matchNumber % 2 === 1;
    const updatedMatch: Match = {
      ...nextMatch,
      [isFirstTeam ? 'team1Id' : 'team2Id']: winnerId || undefined
    };

    onSave(updatedMatch);
  };

  const handleScoreChange = (team: 'team1' | 'team2', value: string) => {
    const score = parseInt(value) || 0;
    setEditedMatch(prev => ({
      ...prev,
      [`${team}Score`]: score
    }));
  };

  const handleTeamChange = (position: 'team1' | 'team2', teamId: string) => {
    setEditedMatch(prev => ({
      ...prev,
      [`${position}Id`]: teamId
    }));
  };

  const handleSave = () => {
    const winner = 
      editedMatch.team1Score > editedMatch.team2Score ? editedMatch.team1Id :
      editedMatch.team2Score > editedMatch.team1Score ? editedMatch.team2Id :
      undefined;

    const updatedMatch: Match = {
      ...editedMatch,
      winnerId: winner,
      status: winner ? 'completed' : editedMatch.status
    };

    onSave(updatedMatch);
    if (winner) {
      updateNextMatch(winner);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {t('tournament.quickEdit')}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {[
            { key: 'team1', score: editedMatch.team1Score, teamId: editedMatch.team1Id },
            { key: 'team2', score: editedMatch.team2Score, teamId: editedMatch.team2Id }
          ].map((team, index) => (
            <Box key={team.key} sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                {t(`tournament.${team.key}`)}:
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                <FormControl fullWidth>
                  <InputLabel>{t('tournament.selectTeam')}</InputLabel>
                  <Select
                    value={team.teamId || ''}
                    onChange={(e) => handleTeamChange(team.key as 'team1' | 'team2', e.target.value)}
                  >
                    <MenuItem value="">{t('tournament.tbd')}</MenuItem>
                    {sport.teams?.map((t) => (
                      <MenuItem key={t.id} value={t.id}>
                        {t.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  label={t('tournament.score')}
                  type="number"
                  value={team.score || ''}
                  onChange={(e) => handleScoreChange(team.key as 'team1' | 'team2', e.target.value)}
                  sx={{ width: 100 }}
                />
              </Box>
            </Box>
          ))}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          {t('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MatchQuickEditDialog;
