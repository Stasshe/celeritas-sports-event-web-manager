import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  CircularProgress
} from '@mui/material';
import { Sport, Event } from '../../../types/index';
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newSport, setNewSport] = useState<Partial<Sport>>(
    sport
      ? { ...sport }
      : {
          name: '',
          eventId,
          type: 'tournament',
          description: '',
          teams: [],
          matches: []
        }
  );

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
          teams: [],
          matches: []
        });
      }
    }
  }, [open, sport, eventId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    if (name) {
      setNewSport(prev => ({ ...prev, [name]: value }));
    }
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
        teams: newSport.teams || [],
        matches: newSport.matches || [],
        operationsNote: newSport.operationsNote || '',
        // 初期値を設定
        tournamentSettings: newSport.tournamentSettings || {
          hasThirdPlaceMatch: true,
          hasRepechage: false,
          consolation: {
            enabled: false,
            includeSecondRoundLosers: false,
            hasThirdPlaceMatch: false
          }
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

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      slotProps={{
        transition: {
          onExited: () => {
            // ダイアログが閉じられた後にステートをリセット
            if (!sport) {
              setNewSport({
                name: '',
                eventId,
                type: 'tournament',
                description: '',
                teams: [],
                matches: []
              });
            }
          }
        }
      }}
    >
      <DialogTitle>
        {sport ? "競技編集" : "競技作成"}
      </DialogTitle>
      <DialogContent dividers sx={{ pt: 2 }}>
        <Grid container spacing={1.5}>
          <Grid size={12}>
            <TextField
              name="name"
              label={"競技名"}
              size="small"
              fullWidth
              value={newSport.name || ''}
              onChange={handleInputChange}
              required
            />
          </Grid>

          <Grid size={12}>
            <FormControl fullWidth size="small" required>
              <InputLabel>{"タイプ"}</InputLabel>
              <Select
                name="type"
                label={"タイプ"}
                value={newSport.type || 'tournament'}
                onChange={handleInputChange as any}
                disabled={!!sport} // 既存競技の場合は変更不可
              >
                <MenuItem value="tournament">{"トーナメント"}</MenuItem>
                <MenuItem value="roundRobin">{"総当たり戦"}</MenuItem>
                <MenuItem value="league">{"リーグ"}</MenuItem>
                <MenuItem value="ranking">{"ランキング"}</MenuItem>
              </Select>
            </FormControl>
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
