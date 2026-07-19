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

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {match && (
            match.round === maxRound && match.matchNumber === 1 
              ? "決勝"
              : match.matchNumber === 0 
              ? "3位決定戦"
              : `${match.round}-${match.matchNumber}回戦`
          )}
        </DialogTitle>
        <DialogContent dividers>
          <Alert severity="warning" sx={{ mb: 2 }}>
            {"チーム選択は試合結果の入力後に変更すると、トーナメントの整合性が損なわれる可能性があります"}
          </Alert>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  {"チーム1"}
                </Typography>
                
                {/* チーム表示エリア */}
                <Box 
                  sx={{ 
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    p: 2,
                    bgcolor: 'background.paper',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    minHeight: '60px'
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    {editingTeam === 'team1' ? (
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <TeamSelector
                          selectedTeamId={editedMatch.team1Id}
                          teams={sport.teams}
                          rosters={teamRosters}
                          onChange={(teamId) => handleTeamChange(teamId, 'team1')}
                          disabled={false}
                          compact={true}
                        />
                        <Button 
                          size="small" 
                          onClick={handleCancelEdit}
                          color="inherit"
                        >
                          {"キャンセル"}
                        </Button>
                      </Box>
                    ) : (
                      <Typography variant="h6" sx={{ fontWeight: 'medium' }}>
                        {sport.teams.find(t => t.id === editedMatch.team1Id)?.name || "未定"}
                      </Typography>
                    )}
                  </Box>
                  
                  {editingTeam !== 'team1' && (
                    <Tooltip title={editedMatch.round === 1 ? 'チームを編集' : '2回戦以降のチームは編集できません'}>
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => handleEditTeam('team1')}
                          disabled={editedMatch.round !== 1}
                          sx={{ 
                            opacity: editedMatch.round === 1 ? 1 : 0.3,
                            ml: 1
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  )}
                </Box>
                
                {/* 1stラウンド以外の説明テキスト */}
                {editedMatch.round !== 1 && (
                  <Typography 
                    variant="caption" 
                    color="info.main" 
                    sx={{ display: 'block', mt: 1, fontSize: '0.75rem' }}
                  >
                    1stラウンド以外でチームの選択はできません
                  </Typography>
                )}
              </Box>
              <TextField
                label={"スコア"}
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
                  {"チーム2"}
                </Typography>
                
                {/* チーム表示エリア */}
                <Box 
                  sx={{ 
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    p: 2,
                    bgcolor: 'background.paper',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    minHeight: '60px'
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    {editingTeam === 'team2' ? (
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <TeamSelector
                          selectedTeamId={editedMatch.team2Id}
                          teams={sport.teams}
                          rosters={teamRosters}
                          onChange={(teamId) => handleTeamChange(teamId, 'team2')}
                          disabled={false}
                          compact={true}
                          allowSeed
                        />
                        <Button 
                          size="small" 
                          onClick={handleCancelEdit}
                          color="inherit"
                        >
                          {"キャンセル"}
                        </Button>
                      </Box>
                    ) : (
                      <Typography variant="h6" sx={{ fontWeight: 'medium' }}>
                        {sport.teams.find(t => t.id === editedMatch.team2Id)?.name || "未定"}
                      </Typography>
                    )}
                  </Box>
                  
                  {editingTeam !== 'team2' && (
                    <Tooltip title={editedMatch.round === 1 ? 'チームを編集' : '2回戦以降のチームは編集できません'}>
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => handleEditTeam('team2')}
                          disabled={editedMatch.round !== 1}
                          sx={{ 
                            opacity: editedMatch.round === 1 ? 1 : 0.3,
                            ml: 1
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  )}
                </Box>
                
                {/* 1stラウンド以外の説明テキスト */}
                {editedMatch.round !== 1 && (
                  <Typography 
                    variant="caption" 
                    color="info.main" 
                    sx={{ display: 'block', mt: 1, fontSize: '0.75rem' }}
                  >
                    1stラウンド以外でチームの選択はできません
                  </Typography>
                )}
              </Box>
              <TextField
                label={"スコア"}
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
                label={"日付"}
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
                label={"メモ"}
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
