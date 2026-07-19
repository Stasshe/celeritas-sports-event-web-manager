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
  const { pushData, updateData } = useDatabase<Record<string, Sport>>('/sports');
  const { data: events, updateData: updateEvent } = useDatabase<Record<string, Event>>('/events');
  
  const isSubmittingRef = useRef(false);
  const submitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
              const updatedEvent = {
                ...event,
                sports: [...(event.sports || []), newSportId]
              };
              
              // イベントの更新を個別に実行
              await updateEvent({
                [eventId]: updatedEvent
              });
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
        return "リーダー";
      case 'member':
        return "メンバー";
      default:
        return role;
    }
  };
  
  const getTypeDescription = (type: string) => {
    switch (type) {
      case 'tournament':
        return "トーナメント形式で試合を行います";
      case 'roundRobin':
        return "総当たり戦で試合を行います";
      case 'league':
        return "リーグ戦形式で試合を行います";
      case 'ranking':
        return "ランキング形式で順位を決定します";
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
        {sport ? "競技編集" : "競技作成"}
      </DialogTitle>
      
      <DialogContent dividers>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              name="name"
              label={"競技名"}
              fullWidth
              margin="normal"
              value={newSport.name || ''}
              onChange={handleInputChange}
              required
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth margin="normal" required>
              <InputLabel>{"タイプ"}</InputLabel>
              <Select
                name="type"
                value={newSport.type || 'tournament'}
                onChange={handleInputChange as any}
                disabled={!!sport} // 既存競技の場合は変更不可
              >
                <MenuItem value="tournament">{"トーナメント"}</MenuItem>
                <MenuItem value="roundRobin">{"総当たり戦"}</MenuItem>
                <MenuItem value="league">{"リーグ"}</MenuItem>
                <MenuItem value="ranking">{"ランキング"}</MenuItem>
              </Select>
              <FormHelperText>
                {getTypeDescription(newSport.type || 'tournament')}
              </FormHelperText>
            </FormControl>
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              name="description"
              label={"説明"}
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
              label={"ルール"}
              fullWidth
              multiline
              rows={2}
              margin="normal"
              value={newSport.rules || ''}
              onChange={handleInputChange}
              helperText={"競技のルールを記入してください"}
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              name="manual"
              label={"マニュアル"}
              fullWidth
              multiline
              rows={2}
              margin="normal"
              value={newSport.manual || ''}
              onChange={handleInputChange}
              helperText={"競技の進行マニュアルを記入してください"}
            />
          </Grid>
        </Grid>
        
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            {"担当者"}
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          <Grid container spacing={2} alignItems="flex-end">
            <Grid item xs={12} sm={4}>
              <TextField
                name="name"
                label={"担当者名"}
                fullWidth
                value={newOrganizer.name}
                onChange={handleOrganizerChange}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth>
                <InputLabel>{"役割"}</InputLabel>
                <Select
                  name="role"
                  value={newOrganizer.role}
                  onChange={handleOrganizerChange as any}
                >
                  <MenuItem value="leader">{"リーダー"}</MenuItem>
                  <MenuItem value="member">{"メンバー"}</MenuItem>
                  
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth>
                <InputLabel>{"学年"}</InputLabel>
                <Select
                  name="grade"
                  value={newOrganizer.grade}
                  onChange={handleOrganizerChange as any}
                >
                  <MenuItem value={1}>{"1年生"}</MenuItem>
                  <MenuItem value={2}>{"2年生"}</MenuItem>
                  <MenuItem value={3}>{"3年生"}</MenuItem>
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
                {"追加"}
              </Button>
            </Grid>
          </Grid>
          
          {/* 担当者リスト */}
          <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {(newSport.organizers || []).map(org => (
              <Chip
                key={org.id}
                label={`${org.name} (${getRoleLabel(org.role)}, ${org.grade}${"年"})`}
                onDelete={() => removeOrganizer(org.id)}
                color={org.role === 'leader' ? 'primary' : 'default'}
              />
            ))}
            {(!newSport.organizers || newSport.organizers.length === 0) && (
              <Typography variant="body2" color="text.secondary">
                {"担当者がいません"}
              </Typography>
            )}
          </Box>
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting}>
          {"キャンセル"}
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
            "保存"
          ) : (
            "作成"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateSportDialog;
