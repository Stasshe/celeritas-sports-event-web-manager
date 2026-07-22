import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Typography
} from '@mui/material';
import {
  EditNote as EditNoteIcon,
  Refresh as RefreshIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { ScheduleHistory } from '../../../hooks/useScheduleHistory';

interface ScheduleActionBarProps {
  history: ScheduleHistory;
  hasMatches: boolean;
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
}

const ScheduleActionBar: React.FC<ScheduleActionBarProps> = ({
  history,
  hasMatches,
  editing,
  onEditingChange
}) => {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleGenerateClick = () => {
    if (history.timeSlots.length > 0) {
      setConfirmOpen(true);
      return;
    }
    history.generate();
  };

  let heading = '当日の進行表';
  let description = `${history.timeSlots.length}件の時間枠`;
  if (editing) {
    heading = '進行表を編集中';
    description = '保存するまで変更は反映されません';
  }

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
          alignItems: { xs: 'stretch', lg: 'center' },
          justifyContent: 'space-between',
          gap: 1.5,
          px: { xs: 1.5, sm: 2 },
          py: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Box>
          <Typography variant="subtitle1" sx={{
            fontWeight: 700
          }}>{heading}</Typography>
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>{description}</Typography>
        </Box>

        {!editing && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
            <Button
              variant="contained"
              startIcon={<ScheduleIcon />}
              onClick={handleGenerateClick}
              sx={{ minHeight: 44, flex: { xs: '1 1 0', sm: '0 0 auto' }, order: 1 }}
            >
              自動生成
            </Button>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={history.rescheduleKeepOrder}
              disabled={!hasMatches}
              sx={{
                minHeight: 44,
                flex: { xs: '1 1 100%', sm: '0 0 auto' },
                order: { xs: 3, sm: 2 }
              }}
            >
              順番を保って再計算
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<EditNoteIcon />}
              onClick={() => onEditingChange(true)}
              sx={{
                minHeight: 44,
                flex: { xs: '1 1 0', sm: '0 0 auto' },
                order: { xs: 2, sm: 3 }
              }}
            >
              直接編集
            </Button>
          </Box>
        )}
      </Box>
      {history.error && (
        <Alert severity="error" sx={{ m: 1.5 }}>{history.error}</Alert>
      )}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>スケジュールを作り直しますか？</DialogTitle>
        <DialogContent>
          <DialogContentText>
            現在の時間枠を置き換え、試合順を組み直します。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>キャンセル</Button>
          <Button
            variant="contained"
            onClick={() => {
              setConfirmOpen(false);
              history.generate();
            }}
          >
            作り直す
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ScheduleActionBar;
