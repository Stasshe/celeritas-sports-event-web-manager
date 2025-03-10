import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert
} from '@mui/material';
import { Warning as WarningIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

interface DeleteConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  itemName: string;
  type: 'event' | 'sport';
}

const DeleteConfirmationDialog: React.FC<DeleteConfirmationDialogProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  itemName,
  type
}) => {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <WarningIcon color="error" />
        {title}
      </DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          {t(`admin.delete${type}Warning`)}
        </Alert>
        <Typography>
          {t('admin.deleteConfirmation', { name: itemName })}
        </Typography>
        <Box sx={{ mt: 2, bgcolor: 'error.main', color: 'error.contrastText', p: 2, borderRadius: 1 }}>
          <Typography variant="body2">
            {t('admin.deleteConfirmationDetails')}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={onConfirm}
        >
          {t('common.delete')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteConfirmationDialog;
