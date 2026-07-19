import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Switch,
  Divider,
  Typography,
  Box,
  IconButton,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { Event, Organizer } from '../../../types/index';
import { useDatabase } from '../../../hooks/useDatabase';

interface CreateEventDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  event?: Event; // 既存のイベント（編集の場合）
}

const CreateEventDialog: React.FC<CreateEventDialogProps> = ({ open, onClose, onSuccess, event }) => {
  const { pushData, updateData, data: allEventsData } = useDatabase<Record<string, Event>>('/events');
  const isSubmittingRef = useRef(false);
  const submitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingEventRef = useRef<Event | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newEvent, setNewEvent] = useState<Partial<Event> & { organizers: Organizer[] }>(
    event 
      ? { ...event } 
      : {
          name: '',
          date: new Date().toISOString().split('T')[0],
          alternativeDate: '',
          description: '',
          isActive: false,
          organizers: [],
          sports: []
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
      if (event) {
        setNewEvent({ ...event });
      } else {
        setNewEvent({
          name: '',
          date: new Date().toISOString().split('T')[0],
          alternativeDate: '',
          description: '',
          isActive: false,
          organizers: [],
          sports: []
        });
      }
      
      setNewOrganizer({
        id: `org_${Date.now()}`,
        name: '',
        role: 'member',
        grade: 2
      });
    }
  }, [open, event]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    if (name) {
      setNewEvent(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSwitchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setNewEvent(prev => ({ ...prev, [name]: checked }));
  };
  
  const handleOrganizerChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    if (name) {
      setNewOrganizer(prev => ({ ...prev, [name]: value }));
    }
  };
  
  const addOrganizer = () => {
    if (newOrganizer.name) {
      setNewEvent(prev => ({
        ...prev,
        organizers: [...prev.organizers, { ...newOrganizer, id: `org_${Date.now()}` }]
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
    setNewEvent(prev => ({
      ...prev,
      organizers: prev.organizers.filter(org => org.id !== id)
    }));
  };

  // 送信処理の最適化
  const handleSubmit = async () => {
    if (!newEvent.name || isSubmittingRef.current) return;
    
    // 既存のタイマーをクリア
    if (submitTimeoutRef.current) {
      clearTimeout(submitTimeoutRef.current);
    }

    try {
      isSubmittingRef.current = true;
      setIsSubmitting(true);

      const eventData: Omit<Event, 'id'> = {
        name: newEvent.name,
        date: newEvent.date || new Date().toISOString().split('T')[0],
        alternativeDate: newEvent.alternativeDate,
        description: newEvent.description || '',
        isActive: newEvent.isActive || false,
        organizers: newEvent.organizers || [],
        sports: newEvent.sports || [],
        createdAt: new Date().toISOString() // 作成日時を追加
      };

      // 新しい処理をキューに追加
      submitTimeoutRef.current = setTimeout(async () => {
        try {
          if (event) {
            await updateData({ [event.id]: {...eventData, id: event.id} });
          } else {
            const newId = await pushData(eventData as any);
            if (eventData.isActive && newId && allEventsData) {
              // 新規イベントをアクティブにする場合、他のイベントを非アクティブに
              const updates: Record<string, Event> = {};
              
              Object.entries(allEventsData).forEach(([id, ev]) => {
                if (id !== newId && ev.isActive) {
                  updates[id] = { ...ev, isActive: false };
                }
              });
              
              if (Object.keys(updates).length > 0) {
                await updateData(updates);
              }
            }
          }
          onSuccess();
          onClose();
        } catch (error) {
          console.error('Error saving event:', error);
        } finally {
          isSubmittingRef.current = false;
          setIsSubmitting(false);
        }
      }, 100);

    } catch (error) {
      console.error('Error preparing event data:', error);
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

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      fullWidth 
      maxWidth="md"
      TransitionProps={{
        onExited: () => {
          // ダイアログが閉じられた後にステートをリセット
          if (!event) {
            setNewEvent({
              name: '',
              date: new Date().toISOString().split('T')[0],
              alternativeDate: '',
              description: '',
              isActive: false,
              organizers: [],
              sports: []
            });
          }
        }
      }}
    >
      <DialogTitle>
        {event ? "編集" : "イベント作成"}
      </DialogTitle>
      
      <DialogContent dividers>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              name="name"
              label={"イベント名"}
              fullWidth
              margin="normal"
              value={newEvent.name}
              onChange={handleInputChange}
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              name="date"
              label={"日付"}
              type="date"
              fullWidth
              margin="normal"
              value={newEvent.date}
              onChange={handleInputChange}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              name="alternativeDate"
              label={"予備日"}
              type="date"
              fullWidth
              margin="normal"
              value={newEvent.alternativeDate || ''}
              onChange={handleInputChange}
              InputLabelProps={{ shrink: true }}
              helperText={"予備日を設定できます"}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  name="isActive"
                  checked={newEvent.isActive}
                  onChange={handleSwitchChange}
                  color="primary"
                />
              }
              label={"アクティブに設定"}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              name="description"
              label={"説明"}
              fullWidth
              multiline
              rows={3}
              margin="normal"
              value={newEvent.description || ''}
              onChange={handleInputChange}
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
                  <MenuItem value="custom">{"カスタム"}</MenuItem>
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
            {newEvent.organizers.map(org => (
              <Chip
                key={org.id}
                label={`${org.name} (${getRoleLabel(org.role)}, ${org.grade}${"年"})`}
                onDelete={() => removeOrganizer(org.id)}
                color={org.role === 'leader' ? 'primary' : 'default'}
              />
            ))}
            {newEvent.organizers.length === 0 && (
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
          disabled={isSubmitting || !newEvent.name}
        >
          {isSubmitting ? (
            <CircularProgress size={24} color="inherit" />
          ) : event ? (
            "保存"
          ) : (
            "作成"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateEventDialog;
