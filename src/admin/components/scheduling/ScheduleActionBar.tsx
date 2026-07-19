import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  EditNote as EditNoteIcon
} from '@mui/icons-material';
import { ScheduleHistory } from '../../../hooks/useScheduleHistory';

interface ScheduleActionBarProps {
  history: ScheduleHistory;
  hasMatches: boolean;
  onOpenManualEditor: () => void;
}

const ScheduleActionBar: React.FC<ScheduleActionBarProps> = ({ history, hasMatches, onOpenManualEditor }) => {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleGenerateClick = () => {
    if (history.timeSlots.length > 0) {
      setConfirmOpen(true);
    } else {
      history.generate();
    }
  };

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1.5,
          '& > button': { flex: { xs: '1 1 100%', sm: '0 0 auto' } }
        }}
      >
        <Button variant="contained" startIcon={<ScheduleIcon />} onClick={handleGenerateClick}>
          スケジュール生成
        </Button>
        <Button
          variant="outlined"
          color="secondary"
          onClick={history.rescheduleKeepOrder}
          disabled={!hasMatches}
        >
          順番を維持してリスケ
        </Button>
        <Button
          variant="outlined"
          color="inherit"
          startIcon={<UndoIcon />}
          onClick={history.undo}
          disabled={!history.canUndo}
        >
          戻す
        </Button>
        <Button
          variant="outlined"
          color="inherit"
          startIcon={<RedoIcon />}
          onClick={history.redo}
          disabled={!history.canRedo}
        >
          進める
        </Button>
        <Button variant="outlined" color="info" startIcon={<EditNoteIcon />} onClick={onOpenManualEditor}>
          手動編集
        </Button>
      </Box>

      {history.error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {history.error}
        </Alert>
      )}

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>スケジュール再生成の確認</DialogTitle>
        <DialogContent>
          <DialogContentText>
            本当にスケジュールを再生成しますか？試合の順番はシャッフルされます。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>キャンセル</Button>
          <Button
            color="primary"
            onClick={() => {
              setConfirmOpen(false);
              history.generate();
            }}
          >
            確認
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ScheduleActionBar;
