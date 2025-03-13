import React, { useState, useEffect, useRef } from 'react';
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
import { Sport, Organizer, Event } from '../../../types/index';
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
  const { pushData, updateData } = useDatabase<Record<string, Sport>>('/sports');
  const { data: events, updateData: updateEvent } = useDatabase<Record<string, Event>>('/events');
  
  const isSubmittingRef = useRef(false);
  const submitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSportRef = useRef<Sport | null>(null);
  
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
    if (!newSport.name || !newSport.eventId || isSubmittingRef.current) return;
    
    // 既存のタイマーをクリア
    if (submitTimeoutRef.current) {
      clearTimeout(submitTimeoutRef.current);
    }

    try {
      isSubmittingRef.current = true;
      setIsSubmitting(true);

      const sportData: Omit<Sport, 'id'> = {
        name: newSport.name,
        eventId: newSport.eventId,
        type: newSport.type || 'tournament',
        description: newSport.description || '',
        organizers: newSport.organizers || [],
        teams: newSport.teams || [],
        matches: newSport.matches || [],
        rules: newSport.rules || '',
        manual: newSport.manual || '',
        // 初期値を設定
        tournamentSettings: newSport.tournamentSettings || {
          hasThirdPlaceMatch: true,
          hasRepechage: false
        },
        roundRobinSettings: newSport.roundRobinSettings || {
          winPoints: 3,
          drawPoints: 1,
          losePoints: 0,
          considerLosePoints: false
        },
        customLayout: newSport.customLayout || [],
        // 明示的に非nullのrosterオブジェクトを指定
        roster: newSport.roster || {
          grade1: {},
          grade2: {},
          grade3: {}
        }
      };

      // 新しい処理をキューに追加
      submitTimeoutRef.current = setTimeout(async () => {
        try {
          let sportId: string = '';
          
          if (sport && sport.id) {
            sportId = sport.id;
            await updateData({ [sport.id]: { ...sportData, id: sport.id } as Sport });
          } else {
            const newSportId = await pushData(sportData as any);
            if (newSportId && events && events[eventId]) {
              sportId = newSportId;
              const event = events[eventId];
              const updatedSports = [...(event.sports || [])];
              if (!updatedSports.includes(newSportId)) {
                updatedSports.push(newSportId);
                
                // イベントを更新
                await updateEvent({ 
                  [eventId]: {
                    ...event,
                    sports: updatedSports
                  }
                });
              }
            }
          }
          
          if (sportId) {
            onSuccess(sportId);
          }
        } catch (error) {
          console.error('Error saving sport:', error);
        } finally {
          isSubmittingRef.current = false;
          setIsSubmitting(false);
        }
      }, 100);

    } catch (error) {
      console.error('Error preparing sport data:', error);
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (submitTimeoutRef.current) {
        clearTimeout(submitTimeoutRef.current);
      }
      isSubmittingRef.current = false;
    };
  }, []);
  
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
    <Dialog 
      open={open} 
      onClose={onClose} 
      fullWidth 
      maxWidth="md"
      TransitionProps={{
        onExited: () => {
          // ダイアログが閉じられた後にステートをリセット
          if (!sport) {
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
        }
      }}
    >
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
