import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Switch,
  FormControlLabel,
  Chip,
  TextField,
  IconButton,
  Button,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Grid
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Info as InfoIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useDatabase } from '../../../hooks/useDatabase';
import { Sport } from '../../../types';

interface SportPointEditorProps {
  sport: Sport;
  onUpdate: (updatedSport: Sport) => void;
}

const SportPointEditor: React.FC<SportPointEditorProps> = ({ sport, onUpdate }) => {
  const { t } = useTranslation();
  const [pointSettings, setPointSettings] = useState(sport.pointSettings || {
    enabled: false,
    points: [5, 3, 1],
    weight: 1.0,
    customPointRule: ''
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<number[]>([]);
  const [newPoint, setNewPoint] = useState('');

  useEffect(() => {
    setPointSettings(sport.pointSettings || {
      enabled: false,
      points: [5, 3, 1],
      weight: 1.0,
      customPointRule: ''
    });
  }, [sport]);

  const handlePointsChange = () => {
    setDialogOpen(true);
    setCurrentPoints([...(pointSettings.points || [5, 3, 1])]);
  };

  const handleAddPoint = () => {
    const point = parseFloat(newPoint);
    if (!isNaN(point)) {
      setCurrentPoints([...currentPoints, point]);
      setNewPoint('');
    }
  };

  const handleRemovePoint = (index: number) => {
    const updatedPoints = [...currentPoints];
    updatedPoints.splice(index, 1);
    setCurrentPoints(updatedPoints);
  };

  const handleSavePoints = () => {
    setPointSettings({
      ...pointSettings,
      points: currentPoints
    });
    setDialogOpen(false);
  };

  const handleWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0.1) {
      setPointSettings({
        ...pointSettings,
        weight: Math.min(value, 10) // 最大10倍までに制限
      });
    }
  };

  const handleCustomRuleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPointSettings({
      ...pointSettings,
      customPointRule: e.target.value
    });
  };

  const handleEnableChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPointSettings({
      ...pointSettings,
      enabled: e.target.checked
    });
  };

  const saveSettings = () => {
    const updatedSport = {
      ...sport,
      pointSettings
    };
    onUpdate(updatedSport);
  };

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">{t('scoreboard.sportPointSettings')}</Typography>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={saveSettings}
          >
            {t('common.save')}
          </Button>
        </Box>
        <Divider sx={{ mb: 3 }} />

        <FormControlLabel
          control={
            <Switch
              checked={pointSettings.enabled}
              onChange={handleEnableChange}
            />
          }
          label={t('scoreboard.includeInOverallScore')}
        />

        {pointSettings.enabled && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              {t('scoreboard.pointDistribution')}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {(pointSettings.points || [5, 3, 1]).map((point, i) => (
                  <Chip
                    key={i}
                    label={`${i + 1}位: ${point}点`}
                    variant={i === 0 ? "filled" : "outlined"}
                    color={i === 0 ? "primary" : "default"}
                  />
                ))}
              </Box>
              <Button
                startIcon={<EditIcon />}
                onClick={handlePointsChange}
                sx={{ ml: 2 }}
              >
                {t('scoreboard.editPoints')}
              </Button>
            </Box>

            <Grid container spacing={2} sx={{ mt: 2 }}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle1" gutterBottom>
                  {t('scoreboard.weight')}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <TextField
                    type="number"
                    value={pointSettings.weight}
                    onChange={handleWeightChange}
                    inputProps={{
                      min: 0.1,
                      max: 10,
                      step: 0.1
                    }}
                    sx={{ width: 150 }}
                  />
                  <Tooltip title={t('scoreboard.weightDescription')}>
                    <IconButton size="small" sx={{ ml: 1 }}>
                      <InfoIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  {t('scoreboard.weightHelp')}
                </Typography>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle1" gutterBottom>
                  {t('scoreboard.customRule')}
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  value={pointSettings.customPointRule || ''}
                  onChange={handleCustomRuleChange}
                  placeholder={t('scoreboard.customRulePlaceholder')}
                />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  {t('scoreboard.customRuleHelp')}
                </Typography>
              </Grid>
            </Grid>
          </Box>
        )}
      </Paper>

      {/* ポイント編集ダイアログ */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('scoreboard.editPointDistribution')}</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" gutterBottom>
            {t('scoreboard.pointDistributionDescription')}
          </Typography>

          <TableContainer sx={{ mt: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('scoreboard.rank')}</TableCell>
                  <TableCell>{t('scoreboard.points')}</TableCell>
                  <TableCell align="right">{t('common.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {currentPoints.map((point, index) => (
                  <TableRow key={index}>
                    <TableCell>{index + 1}位</TableCell>
                    <TableCell>{point}点</TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleRemovePoint(index)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ display: 'flex', mt: 2 }}>
            <TextField
              label={t('scoreboard.pointValue')}
              type="number"
              value={newPoint}
              onChange={(e) => setNewPoint(e.target.value)}
              size="small"
              inputProps={{ min: 0, step: 0.5 }}
            />
            <Button
              startIcon={<AddIcon />}
              onClick={handleAddPoint}
              disabled={!newPoint}
              sx={{ ml: 1 }}
            >
              {t('common.add')}
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={handleSavePoints}
            disabled={currentPoints.length === 0}
          >
            {t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SportPointEditor;
