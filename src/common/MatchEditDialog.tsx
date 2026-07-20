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
  Typography,
  DialogContentText,
  Alert,
  IconButton,
  Tooltip
} from '@mui/material';
import { Edit as EditIcon } from '@mui/icons-material';
import { SelectChangeEvent } from '@mui/material/Select';
import { Match, Sport } from '../types';
import TeamSelector from './TeamSelector';

interface MatchEditDialogProps {
  open: boolean;
  match: Match | null;
  sport: Sport;
  teamRosters: Record<string, string[]>;
  onClose: () => void;
  onSave: (match: Match) => void;
  disabled?: boolean; // disabledプロパティを追加
}

const MatchEditDialog: React.FC<MatchEditDialogProps> = ({
  open,
  match,
  sport,
  teamRosters,
  onClose,
  onSave,
  disabled = false // デフォルト値を設定
}) => {
  const [editedMatch, setEditedMatch] = useState<Match | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingTeamChange, setPendingTeamChange] = useState<{
    teamId: string;
    position: 'team1' | 'team2';
  } | null>(null);
  const [editingTeam, setEditingTeam] = useState<'team1' | 'team2' | null>(null);

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
    setPendingTeamChange({ teamId, position });
    setConfirmDialogOpen(true);
  };

  const handleEditTeam = (position: 'team1' | 'team2') => {
    if (editedMatch && editedMatch.round === 1) {
      setEditingTeam(position);
    }
  };

  const handleCancelEdit = () => {
    setEditingTeam(null);
  };

  const handleConfirmTeamChange = () => {
    if (!editedMatch || !pendingTeamChange) return;

    setEditedMatch(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        [`${pendingTeamChange.position}Id`]: pendingTeamChange.teamId
      };
    });

    setConfirmDialogOpen(false);
    setPendingTeamChange(null);
    setEditingTeam(null);
  };

  const handleCancelTeamChange = () => {
    setConfirmDialogOpen(false);
    setPendingTeamChange(null);
    setEditingTeam(null);
  };


  const handleSave = () => {
    if (editedMatch) {
      onSave(editedMatch);
    }
  };

  const maxRound = Math.max(...sport.matches.map(m => m.round));
  const getMatchTitle = (): string => {
    if (!match) return '';
    if (match.round === maxRound && match.matchNumber === 1) return '決勝';
    if (match.matchNumber !== 0) return `${match.round}-${match.matchNumber}回戦`;
    if (match.bracket === 'consolation') return '負け側3位決定戦';
    return 'メイン3位決定戦';
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {getMatchTitle()}
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 2 }}>
          <Alert severity="warning" sx={{ mb: 2 }}>
            {"チーム選択は試合結果の入力後に変更すると、トーナメントの整合性が損なわれる可能性があります"}
          </Alert>
          <Grid container spacing={2}>
            {(['team1', 'team2'] as const).map((position) => (
              <Grid
                key={position}
                size={{
                  xs: 12,
                  sm: 6
                }}>
                <Box
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    p: 1.5,
                    height: '100%',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle2" sx={{
                      color: "text.secondary"
                    }}>
                      {position === 'team1' ? "チーム1" : "チーム2"}
                    </Typography>
                    {editingTeam !== position && (
                      <Tooltip title={editedMatch.round === 1 ? 'チームを編集' : '2回戦以降のチームは編集できません'}>
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => handleEditTeam(position)}
                            disabled={editedMatch.round !== 1}
                            sx={{ opacity: editedMatch.round === 1 ? 1 : 0.3 }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}
                  </Box>

                  {editingTeam === position ? (
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1.5 }}>
                      <TeamSelector
                        selectedTeamId={editedMatch[`${position}Id`]}
                        teams={sport.teams}
                        rosters={teamRosters}
                        onChange={(teamId) => handleTeamChange(teamId, position)}
                        disabled={false}
                        compact={true}
                        allowSeed={position === 'team2'}
                      />
                      <Button size="small" onClick={handleCancelEdit} color="inherit">
                        {"キャンセル"}
                      </Button>
                    </Box>
                  ) : (
                    <Typography variant="h6" sx={{ fontWeight: 'medium', mb: 1.5 }} noWrap>
                      {sport.teams.find(t => t.id === editedMatch[`${position}Id`])?.name || "未定"}
                    </Typography>
                  )}

                  <TextField
                    label={"スコア"}
                    type="number"
                    size="small"
                    fullWidth
                    value={editedMatch[`${position}Score`]}
                    onChange={(e) => handleScoreChange(e, position)}
                    slotProps={{
                      htmlInput: { min: 0 }
                    }}
                  />

                  {editedMatch.round !== 1 && (
                    <Typography
                      variant="caption"
                      sx={{
                        color: "info.main",
                        display: 'block',
                        mt: 1
                      }}>
                      1stラウンド以外でチームの選択はできません
                    </Typography>
                  )}
                </Box>
              </Grid>
            ))}

            <Grid
              size={{
                xs: 12,
                sm: 6
              }}>
              <TextField
                name="date"
                label={"日付"}
                type="date"
                size="small"
                fullWidth
                value={editedMatch.date || ''}
                onChange={handleInputChange}
                slotProps={{
                  inputLabel: { shrink: true }
                }}
              />
            </Grid>

            <Grid size={12}>
              <TextField
                name="notes"
                label={"メモ"}
                multiline
                rows={2}
                size="small"
                fullWidth
                value={editedMatch.notes || ''}
                onChange={handleInputChange}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={disabled}>
            {"キャンセル"}
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSave}
            disabled={disabled}
          >
            {"保存"}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={confirmDialogOpen}
        onClose={handleCancelTeamChange}
      >
        <DialogTitle>{"チーム変更の確認"}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {"チームを変更しますか？トーナメントが壊れる可能性があります。壊れた場合は生成し直してください。"}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelTeamChange}>
            {"キャンセル"}
          </Button>
          <Button
            onClick={handleConfirmTeamChange}
            color="error"
            variant="contained"
          >
            {"変更する"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default MatchEditDialog;
