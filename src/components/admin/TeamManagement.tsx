import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  Grid,
  Chip,
  CircularProgress,
  Tooltip,
  useTheme,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  ColorLens as ColorIcon,
  Group as TeamIcon
} from '@mui/icons-material';
import { Sport, Team } from '../../types';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { CompactPicker } from 'react-color';
import { useThemeContext } from '../../contexts/ThemeContext';

interface TeamManagementProps {
  sport: Sport;
  onUpdate: (sport: Sport) => void;
}

const MotionItem = motion(ListItem);

const TeamManagement: React.FC<TeamManagementProps> = ({ sport, onUpdate }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { alpha } = useThemeContext();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [editingTeam, setEditingTeam] = useState<Team>({
    id: '',
    name: '',
    color: '#3a7bd5',
    members: []
  });
  const [newMember, setNewMember] = useState('');

  // チームを追加/編集するダイアログを開く
  const handleOpenDialog = (team?: Team) => {
    if (team) {
      // 既存チーム編集
      setEditingTeam({ ...team });
      setSelectedTeam(team);
    } else {
      // 新規チーム作成
      setEditingTeam({
        id: `team_${Date.now()}`,
        name: '',
        color: '#3a7bd5',
        members: []
      });
      setSelectedTeam(null);
    }
    setDialogOpen(true);
  };

  // 削除確認ダイアログを開く
  const handleOpenDeleteDialog = (team: Team) => {
    setSelectedTeam(team);
    setDeleteDialogOpen(true);
  };

  // チーム情報の変更を処理
  const handleTeamChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    if (name) {
      setEditingTeam(prev => ({ ...prev, [name]: value }));
    }
  };

  // チームカラーの変更を処理
  const handleColorChange = (color: { hex: string }) => {
    setEditingTeam(prev => ({ ...prev, color: color.hex }));
  };

  // メンバーの追加
  const handleAddMember = () => {
    if (newMember.trim()) {
      setEditingTeam(prev => ({
        ...prev,
        members: [...(prev.members || []), newMember.trim()]
      }));
      setNewMember('');
    }
  };

  // メンバーの削除
  const handleRemoveMember = (index: number) => {
    setEditingTeam(prev => {
      const newMembers = [...(prev.members || [])];
      newMembers.splice(index, 1);
      return { ...prev, members: newMembers };
    });
  };

  // チームの保存
  const handleSaveTeam = () => {
    if (!editingTeam.name) return;

    const updatedSport = { ...sport };
    
    if (!updatedSport.teams) {
      updatedSport.teams = [];
    }

    if (selectedTeam) {
      // 既存チームの更新
      const teamIndex = updatedSport.teams.findIndex(t => t.id === selectedTeam.id);
      if (teamIndex >= 0) {
        updatedSport.teams[teamIndex] = editingTeam;
      }
    } else {
      // 新規チームの追加
      updatedSport.teams.push(editingTeam);
    }

    onUpdate(updatedSport);
    setDialogOpen(false);
  };

  // チームの削除
  const handleDeleteTeam = () => {
    if (!selectedTeam) return;

    const updatedSport = { ...sport };
    updatedSport.teams = updatedSport.teams.filter(team => team.id !== selectedTeam.id);
    
    // 関連する試合情報も更新（この試合にチームが含まれていた場合はnullに）
    if (updatedSport.matches) {
      updatedSport.matches = updatedSport.matches.map(match => {
        if (match.team1Id === selectedTeam.id) {
          match.team1Id = '';
          match.team1Score = 0;
        }
        if (match.team2Id === selectedTeam.id) {
          match.team2Id = '';
          match.team2Score = 0;
        }
        if (match.winnerId === selectedTeam.id) {
          match.winnerId = undefined;
        }
        return match;
      });
    }

    onUpdate(updatedSport);
    setDeleteDialogOpen(false);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          {t('sport.teams')}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          {t('sport.addTeam')}
        </Button>
      </Box>
      
      {sport.teams && sport.teams.length > 0 ? (
        <List>
          {sport.teams.map((team, index) => (
            <MotionItem
              key={team.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              divider
              secondaryAction={
                <Box>
                  <IconButton edge="end" onClick={() => handleOpenDialog(team)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton edge="end" color="error" onClick={() => handleOpenDeleteDialog(team)}>
                    <DeleteIcon />
                  </IconButton>
                </Box>
              }
              sx={{
                borderLeft: `4px solid ${team.color || theme.palette.primary.main}`,
                mb: 1,
                borderRadius: 1,
                '&:hover': {
                  bgcolor: alpha(theme.palette.action.hover, 0.1)
                }
              }}
            >
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <TeamIcon sx={{ mr: 1, color: team.color || 'inherit' }} />
                    <Typography variant="subtitle1">{team.name}</Typography>
                  </Box>
                }
                secondary={
                  <Box sx={{ mt: 0.5 }}>
                    {team.members && team.members.length > 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        {t('sport.memberCount', { count: team.members.length })}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        {t('sport.noMembers')}
                      </Typography>
                    )}
                  </Box>
                }
              />
            </MotionItem>
          ))}
        </List>
      ) : (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary" paragraph>
            {t('sport.noTeams')}
          </Typography>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            {t('sport.addTeam')}
          </Button>
        </Paper>
      )}
      
      {/* チーム追加/編集ダイアログ */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedTeam ? t('sport.editTeam') : t('sport.addTeam')}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={8}>
              <TextField
                name="name"
                label={t('sport.teamName')}
                fullWidth
                value={editingTeam.name}
                onChange={handleTeamChange}
                required
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => setIsColorPickerOpen(!isColorPickerOpen)}
                  startIcon={<ColorIcon style={{ color: editingTeam.color }} />}
                  sx={{ height: '40px' }}
                >
                  {t('sport.teamColor')}
                </Button>
              </Box>
            </Grid>
          </Grid>
          
          {isColorPickerOpen && (
            <Box sx={{ mt: 2, mb: 2 }}>
              <CompactPicker
                color={editingTeam.color}
                onChangeComplete={handleColorChange}
              />
            </Box>
          )}
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="subtitle1">
            {t('sport.teamMembers')}
          </Typography>
          <Box sx={{ display: 'flex', mt: 1 }}>
            <TextField
              label={t('sport.addMember')}
              fullWidth
              value={newMember}
              onChange={(e) => setNewMember(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddMember()}
            />
            <Button
              variant="contained"
              sx={{ ml: 1 }}
              onClick={handleAddMember}
              disabled={!newMember.trim()}
            >
              <AddIcon />
            </Button>
          </Box>
          
          <Box sx={{ mt: 2 }}>
            {editingTeam.members && editingTeam.members.length > 0 ? (
              <Grid container spacing={1}>
                {editingTeam.members.map((member, index) => (
                  <Grid item key={index}>
                    <Chip
                      label={member}
                      onDelete={() => handleRemoveMember(index)}
                    />
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                {t('sport.noMembers')}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSaveTeam}
            disabled={!editingTeam.name}
          >
            {t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* 削除確認ダイアログ */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>
          {t('sport.confirmDeleteTeam')}
        </DialogTitle>
        <DialogContent>
          <Typography>
            {t('sport.deleteTeamWarning', { name: selectedTeam?.name })}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteTeam}
          >
            {t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeamManagement;
