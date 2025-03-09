import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Divider,
  Typography,
  Box,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  CircularProgress,
  FormHelperText
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { Sport, Organizer, Event } from '../../../types';
import { useDatabase } from '../../../hooks/useDatabase';

interface CreateSportDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (sportId: string) => void;
  eventId: string;
  sport?: Sport; // 既存の競技（編集の場合）
}

const CreateSportDialog: React.FC<CreateSportDialogProps> = ({ 
  open, 
  onClose, 
  onSuccess, 
  eventId, 
  sport 
}) => {
  const { t } = useTranslation();
  const { pushData, updateData } = useDatabase<Sport>('/sports');
  const { updateData: updateEvent } = useDatabase<Event>('/events');
  const { data: events } = useDatabase<Record<string, Event>>('/events');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newSport, setNewSport] = useState<Partial<Sport> & { organizers: Organizer[] }>(
    sport 
      ? { ...sport } 
      : {
          name: '',
          eventId,
          type: 'tournament',
          description: '',
          organizers: [],
          teams: [],
          matches: []
        }
  );
  
  const [newOrganizer, setNewOrganizer] = useState<Organizer>({
    id: `org_${Date.now()}`,
    name: '',
    role: 'member',
    grade: 2
  });

  // ダイアログが開かれたときに初期値をセット
  useEffect(() => {
    if (open) {
      if (sport) {
        setNewSport({ ...sport });
      } else {
        setNewSport({
          name: '',
          eventId,
          type: 'tournament',
          description: '',
          organizers: [],
          teams: [],
          matches: []
        });
      }
      
      setNewOrganizer({
        id: `org_${Date.now()}`,
        name: '',
        role: 'member',
        grade: 2
      });
    }
  }, [open, sport, eventId]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    if (name) {
      setNewSport(prev => ({ ...prev, [name]: value }));
    }
  };
  
  const handleOrganizerChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    if (name) {
      setNewOrganizer(prev => ({ ...prev, [name]: value }));
    }
  };
  
  const addOrganizer = () => {
    if (newOrganizer.name) {
      setNewSport(prev => ({
        ...prev,
        organizers: [...(prev.organizers || []), { ...newOrganizer, id: `org_${Date.now()}` }]
      }));
      
      // リセット
      setNewOrganizer({
        id: `org_${Date.now()}`,
        name: '',
        role: 'member',
        grade: 2
      });
    }
  };
  
  const removeOrganizer = (id: string) => {
    setNewSport(prev => ({
      ...prev,
      organizers: (prev.organizers || []).filter(org => org.id !== id)
    }));
  };

  // 型定義エラーを修正
  const handleSubmit = async () => {
    if (!newSport.name || !newSport.eventId) return;
    
    try {
      setIsSubmitting(true);
      
      // 初期設定を追加
      const sportData = {
        name: newSport.name,
        eventId: newSport.eventId,
        type: newSport.type || 'tournament',
        description: newSport.description || '',
        organizers: newSport.organizers || [],
        teams: newSport.teams || [],
        matches: newSport.matches || [],
        rules: newSport.rules || '',
        manual: newSport.manual || ''
      };
      
      // 競技形式に合わせて初期設定を追加
      if (sportData.type === 'tournament') {
        sportData.tournamentSettings = newSport.tournamentSettings || {
          hasThirdPlaceMatch: true,
          hasRepechage: false
        };
      } else if (sportData.type === 'roundRobin') {
        sportData.roundRobinSettings = newSport.roundRobinSettings || {
          winPoints: 3,
          drawPoints: 1,
          losePoints: 0,
          considerLosePoints: false
        };
      } else if (sportData.type === 'custom') {
        // カスタム形式の場合は空のレイアウトを作成
        if (!newSport.customLayout) {
          const emptyLayout = Array(5).fill(0).map((_, rowIndex) => 
            Array(5).fill(0).map((_, colIndex) => ({
              id: `cell_${rowIndex}_${colIndex}_${Date.now()}`,
              rowIndex,
              colIndex,
              content: rowIndex === 0 || colIndex === 0 
                ? (rowIndex === 0 && colIndex === 0 ? sportData.name : `${rowIndex === 0 ? '列' : '行'}${rowIndex === 0 ? colIndex : rowIndex}`) 
                : '',
              type: (rowIndex === 0 || colIndex === 0 ? 'header' : 'data') as 'header' | 'data' | 'score' | 'result'
            }))
          );
          sportData.customLayout = emptyLayout;
        }
      }
      
      // 名簿データの初期化
      if (!sportData.roster) {
        sportData.roster = {
          grade1: {},
          grade2: {},
          grade3: {}
        };
      }
      
      if (sport && sport.id) {
        // 既存競技の更新
        await updateData({ [sport.id]: {...sportData, id: sport.id} });
        onSuccess(sport.id);
      } else {
        // 新規競技作成
        const newId = await pushData({...sportData});
        if (newId) {
          // イベントの競技リストを更新
          if (events && events[eventId]) {
            const event = events[eventId];
            const updatedSports = [...(event.sports || [])];
            if (!updatedSports.includes(newId)) {
              updatedSports.push(newId);
              
              // イベントを更新
              await updateEvent({ 
                [eventId]: {
                  ...event,
                  sports: updatedSports
                }
              });
            }
          }
          
          onSuccess(newId);
        }
      }
    } catch (error) {
      console.error('Error saving sport:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'leader':
        return t('sport.roleLeader');
      case 'member':
        return t('sport.roleMember');
      default:
        return role;
    }
  };
  
  const getTypeDescription = (type: string) => {
    switch (type) {
      case 'tournament':
        return t('sport.tournamentDescription');
      case 'roundRobin':
        return t('sport.roundRobinDescription');
      case 'custom':
        return t('sport.customDescription');
      default:
        return '';
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
        {sport ? t('sport.edit') : t('sport.create')}
      </DialogTitle>
      
      <DialogContent dividers>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              name="name"
              label={t('sport.name')}
              fullWidth
              margin="normal"
              value={newSport.name || ''}
              onChange={handleInputChange}
              required
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth margin="normal" required>
              <InputLabel>{t('sport.type')}</InputLabel>
              <Select
                name="type"
                value={newSport.type || 'tournament'}
                onChange={handleInputChange as any}
                disabled={!!sport} // 既存競技の場合は変更不可
              >
                <MenuItem value="tournament">{t('sport.tournament')}</MenuItem>
                <MenuItem value="roundRobin">{t('sport.roundRobin')}</MenuItem>
                <MenuItem value="custom">{t('sport.custom')}</MenuItem>
              </Select>
              <FormHelperText>
                {getTypeDescription(newSport.type || 'tournament')}
              </FormHelperText>
            </FormControl>
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              name="description"
              label={t('sport.description')}
              fullWidth
              multiline
              rows={3}
              margin="normal"
              value={newSport.description || ''}
              onChange={handleInputChange}
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              name="rules"
              label={t('sport.rules')}
              fullWidth
              multiline
              rows={2}
              margin="normal"
              value={newSport.rules || ''}
              onChange={handleInputChange}
              helperText={t('sport.rulesHelp')}
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              name="manual"
              label={t('sport.manual')}
              fullWidth
              multiline
              rows={2}
              margin="normal"
              value={newSport.manual || ''}
              onChange={handleInputChange}
              helperText={t('sport.manualHelp')}
            />
          </Grid>
        </Grid>
        
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            {t('sport.organizers')}
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          <Grid container spacing={2} alignItems="flex-end">
            <Grid item xs={12} sm={4}>
              <TextField
                name="name"
                label={t('sport.organizerName')}
                fullWidth
                value={newOrganizer.name}
                onChange={handleOrganizerChange}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth>
                <InputLabel>{t('sport.role')}</InputLabel>
                <Select
                  name="role"
                  value={newOrganizer.role}
                  onChange={handleOrganizerChange as any}
                >
                  <MenuItem value="leader">{t('sport.roleLeader')}</MenuItem>
                  <MenuItem value="member">{t('sport.roleMember')}</MenuItem>
                  <MenuItem value="custom">{t('sport.roleCustom')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth>
                <InputLabel>{t('sport.grade')}</InputLabel>
                <Select
                  name="grade"
                  value={newOrganizer.grade}
                  onChange={handleOrganizerChange as any}
                >
                  <MenuItem value={1}>{t('sport.grade1')}</MenuItem>
                  <MenuItem value={2}>{t('sport.grade2')}</MenuItem>
                  <MenuItem value={3}>{t('sport.grade3')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={2}>
              <Button
                variant="contained"
                color="primary"
                fullWidth
                startIcon={<AddIcon />}
                onClick={addOrganizer}
                disabled={!newOrganizer.name}
              >
                {t('common.add')}
              </Button>
            </Grid>
          </Grid>
          
          {/* 担当者リスト */}
          <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {(newSport.organizers || []).map(org => (
              <Chip
                key={org.id}
                label={`${org.name} (${getRoleLabel(org.role)}, ${org.grade}${t('sport.gradeUnit')})`}
                onDelete={() => removeOrganizer(org.id)}
                color={org.role === 'leader' ? 'primary' : 'default'}
              />
            ))}
            {(!newSport.organizers || newSport.organizers.length === 0) && (
              <Typography variant="body2" color="text.secondary">
                {t('sport.noOrganizers')}
              </Typography>
            )}
          </Box>
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting}>
          {t('common.cancel')}
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          color="primary"
          disabled={isSubmitting || !newSport.name || !newSport.eventId}
        >
          {isSubmitting ? (
            <CircularProgress size={24} color="inherit" />
          ) : sport ? (
            t('common.save')
          ) : (
            t('common.create')
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateSportDialog;
