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
  Grid,
  CircularProgress
} from '@mui/material';
import { Event } from '../../../types/index';
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newEvent, setNewEvent] = useState<Partial<Event>>(
    event 
      ? { ...event } 
      : {
          name: '',
          date: new Date().toISOString().split('T')[0],
          alternativeDate: '',
          description: '',
          isActive: false,
          sports: []
        }
  );
  
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
          sports: []
        });
      }
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
  
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
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
              sports: []
            });
          }
        }
      }}
    >
      <DialogTitle>
        {event ? "編集" : "イベント作成"}
      </DialogTitle>
      
      <DialogContent dividers sx={{ pt: 2 }}>
        <Grid container spacing={1.5}>
          <Grid item xs={12} sm={6}>
            <TextField
              name="name"
              label={"イベント名"}
              size="small"
              fullWidth
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
              size="small"
              fullWidth
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
              size="small"
              fullWidth
              value={newEvent.alternativeDate || ''}
              onChange={handleInputChange}
              InputLabelProps={{ shrink: true }}
              helperText={"予備日を設定できます"}
            />
          </Grid>
          <Grid item xs={12} sm={6} sx={{ display: 'flex', alignItems: 'center' }}>
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
              size="small"
              fullWidth
              multiline
              rows={3}
              value={newEvent.description || ''}
              onChange={handleInputChange}
            />
          </Grid>
        </Grid>
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
