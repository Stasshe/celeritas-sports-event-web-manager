import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Divider,
  Tab,
  Tabs,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Tooltip,
  Chip,
  Grid,
  Card,
  CardContent,
  CardActions,
  useTheme
} from '@mui/material';
import {
  Restore as RestoreIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  History as HistoryIcon,
  ArrowBack as ArrowBackIcon,
  Compare as CompareIcon,
  Backup as BackupIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useBackup, BackupType, BackupEntry } from '../../hooks/useBackup';
import { useAdminLayout } from '../../contexts/AdminLayoutContext';
import { motion } from 'framer-motion';
import { useThemeContext } from '../../contexts/ThemeContext';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';

const BackupPanel: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme();
  const { alpha } = useThemeContext();
  const { showSnackbar } = useAdminLayout();
  
  const [activeTab, setActiveTab] = useState<BackupType>('auto');
  const [selectedBackup, setSelectedBackup] = useState<string | null>(null);
  const [compareBackup, setCompareBackup] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [backupDescription, setBackupDescription] = useState('');
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<{ type: BackupType, id: string } | null>(null);
  const [diffDialogOpen, setDiffDialogOpen] = useState(false);
  const [diffData, setDiffData] = useState<{ events: any, sports: any } | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);
  
  const {
    autoBackups,
    manualBackups,
    loading,
    backupLoading,
    createBackup,
    restoreBackup,
    getBackupDiff
  } = useBackup();
  
  // 現在選択中のバックアップリスト
  const currentBackups = useMemo(() => {
    return activeTab === 'auto' ? autoBackups : manualBackups;
  }, [activeTab, autoBackups, manualBackups]);
  
  // バックアップの作成
  const handleCreateBackup = async () => {
    try {
      const result = await createBackup('manual', backupDescription);
      if (result) {
        showSnackbar(t('backup.createSuccess'), 'success');
        setCreateDialogOpen(false);
        setBackupDescription('');
      }
    } catch (error) {
      console.error('バックアップ作成エラー:', error);
      showSnackbar(t('backup.createError'), 'error');
    }
  };
  
  // バックアップの復元
  const handleOpenRestoreDialog = (type: BackupType, id: string) => {
    setRestoreTarget({ type, id });
    setRestoreDialogOpen(true);
  };
  
  const handleRestoreBackup = async () => {
    if (!restoreTarget) return;
    
    try {
      const success = await restoreBackup(restoreTarget.type, restoreTarget.id);
      if (success) {
        showSnackbar(t('backup.restoreSuccess'), 'success');
        setRestoreDialogOpen(false);
        setRestoreTarget(null);
      } else {
        showSnackbar(t('backup.restoreError'), 'error');
      }
    } catch (error) {
      console.error('バックアップ復元エラー:', error);
      showSnackbar(t('backup.restoreError'), 'error');
    }
  };
  
  // 差分の表示
  const handleShowDiff = async (type: BackupType, id: string, compareToId: string | 'current') => {
    try {
      setDiffLoading(true);
      setDiffDialogOpen(true);
      
      const compareTo = compareToId === 'current' 
        ? 'current' 
        : { type, id: compareToId };
      
      const diff = await getBackupDiff(type, id, compareTo);
      setDiffData(diff);
    } catch (error) {
      console.error('差分取得エラー:', error);
      showSnackbar(t('backup.diffError'), 'error');
    } finally {
      setDiffLoading(false);
    }
  };
  
  // 比較するバックアップを選択
  const handleSelectCompare = (id: string) => {
    if (id === selectedBackup) {
      // 自分自身との比較はできない
      return;
    }
    setCompareBackup(id);
  };
  
  // 差分表示ダイアログを閉じる際のリセット
  const handleCloseDiffDialog = () => {
    setDiffDialogOpen(false);
    setDiffData(null);
  };
  
  // タブ変更時に選択状態をリセット
  useEffect(() => {
    setSelectedBackup(null);
    setCompareBackup(null);
  }, [activeTab]);

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/admin')}
          sx={{ mb: 2 }}
        >
          {t('common.back')}
        </Button>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <BackupIcon sx={{ mr: 1, fontSize: 28 }} />
            <Typography variant="h4">
              {t('backup.title')}
            </Typography>
          </Box>
          
          <Button
            variant="contained"
            color="primary"
            startIcon={<SaveIcon />}
            onClick={() => setCreateDialogOpen(true)}
            disabled={backupLoading}
          >
            {t('backup.createNow')}
          </Button>
        </Box>
        
        <Paper sx={{ mb: 4 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
              <Tab label={t('backup.automatic')} value="auto" />
              <Tab label={t('backup.manual')} value="manual" />
            </Tabs>
          </Box>
          
          <Box sx={{ p: 3 }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : currentBackups.length > 0 ? (
              <>
                <Paper variant="outlined" sx={{ mb: 2, p: 2 }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle1">
                        {activeTab === 'auto' ? t('backup.autoDescription') : t('backup.manualDescription')}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6} sx={{ textAlign: 'right' }}>
                      {selectedBackup && (
                        <Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {t('backup.compareWith')}:
                          </Typography>
                          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                            <Button 
                              size="small"
                              variant={compareBackup === 'current' ? "contained" : "outlined"}
                              onClick={() => setCompareBackup('current')}
                            >
                              {t('backup.current')}
                            </Button>
                            {currentBackups.map((backup, index) => {
                              if (backup.id === selectedBackup) return null;
                              return (
                                <Button
                                  key={backup.id}
                                  size="small"
                                  variant={compareBackup === backup.id ? "contained" : "outlined"} 
                                  onClick={() => handleSelectCompare(backup.id)}
                                >
                                  {t('backup.version')} {currentBackups.length - index}
                                </Button>
                              );
                            })}
                          </Box>
                        </Box>
                      )}
                    </Grid>
                  </Grid>
                </Paper>
                
                <List sx={{ bgcolor: 'background.paper' }}>
                  {currentBackups.map((backup, index) => {
                    const isSelected = selectedBackup === backup.id;
                    const formattedDate = new Date(backup.timestamp).toLocaleString();
                    const timeAgo = formatDistanceToNow(new Date(backup.timestamp), { addSuffix: true, locale: ja });
                    
                    return (
                      <ListItem 
                        key={backup.id}
                        component={motion.div}
                        whileHover={{ backgroundColor: alpha(theme.palette.primary.main, 0.04) }}
                        selected={isSelected}
                        button
                        onClick={() => setSelectedBackup(isSelected ? null : backup.id)}
                        sx={{ 
                          mb: 1, 
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1,
                          bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.08) : 'background.paper'
                        }}
                      >
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Typography variant="subtitle1">
                                {t('backup.version')} {currentBackups.length - index}
                              </Typography>
                              <Chip 
                                size="small" 
                                label={timeAgo} 
                                color="primary" 
                                variant="outlined" 
                                sx={{ ml: 2 }} 
                              />
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" component="span">
                                {formattedDate}
                              </Typography>
                              {backup.description && (
                                <Typography variant="body2" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                                  "{backup.description}"
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                        <ListItemSecondaryAction>
                          <Box sx={{ display: 'flex' }}>
                            {selectedBackup === backup.id && compareBackup && (
                              <Tooltip title={t('backup.showDiff')}>
                                <IconButton
                                  edge="end"
                                  color="primary"
                                  onClick={() => handleShowDiff(
                                    activeTab, 
                                    backup.id, 
                                    compareBackup
                                  )}
                                >
                                  <CompareIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title={t('backup.restore')}>
                              <IconButton
                                edge="end"
                                color="warning"
                                onClick={() => handleOpenRestoreDialog(activeTab, backup.id)}
                              >
                                <RestoreIcon />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </ListItemSecondaryAction>
                      </ListItem>
                    );
                  })}
                </List>
              </>
            ) : (
              <Alert severity="info">
                {activeTab === 'auto' ? t('backup.noAutoBackups') : t('backup.noManualBackups')}
              </Alert>
            )}
          </Box>
        </Paper>
      </Box>
      
      {/* 手動バックアップ作成ダイアログ */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)}>
        <DialogTitle>{t('backup.createBackup')}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={t('backup.description')}
            type="text"
            fullWidth
            multiline
            rows={3}
            value={backupDescription}
            onChange={(e) => setBackupDescription(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button 
            onClick={handleCreateBackup}
            color="primary"
            variant="contained"
            disabled={backupLoading}
            startIcon={backupLoading ? <CircularProgress size={20} /> : <SaveIcon />}
          >
            {t('backup.create')}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* バックアップ復元確認ダイアログ */}
      <Dialog open={restoreDialogOpen} onClose={() => setRestoreDialogOpen(false)}>
        <DialogTitle>{t('backup.confirmRestore')}</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            {t('backup.restoreWarning')}
          </Alert>
          <Typography>
            {t('backup.restoreConfirmation')}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestoreDialogOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button 
            onClick={handleRestoreBackup}
            color="warning"
            variant="contained"
            disabled={backupLoading}
            startIcon={backupLoading ? <CircularProgress size={20} /> : <RestoreIcon />}
          >
            {t('backup.restore')}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* 差分表示ダイアログ */}
      <Dialog 
        open={diffDialogOpen} 
        onClose={handleCloseDiffDialog}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>{t('backup.diffTitle')}</DialogTitle>
        <DialogContent>
          {diffLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : diffData ? (
            <Box sx={{ mt: 2 }}>
              {/* イベントの差分 */}
              <Typography variant="h6" gutterBottom>
                {t('backup.eventChanges')}
              </Typography>
              {Object.keys(diffData.events).length > 0 ? (
                <Grid container spacing={2}>
                  {Object.entries(diffData.events).map(([key, value]: [string, any]) => (
                    <Grid item xs={12} key={key}>
                      <Card variant="outlined">
                        <CardContent sx={{ pb: 1 }}>
                          <Typography variant="subtitle1" gutterBottom>
                            {value.added ? (
                              <Chip size="small" label={t('backup.added')} color="success" sx={{ mr: 1 }} />
                            ) : value.removed ? (
                              <Chip size="small" label={t('backup.removed')} color="error" sx={{ mr: 1 }} />
                            ) : (
                              <Chip size="small" label={t('backup.modified')} color="primary" sx={{ mr: 1 }} />
                            )}
                            {value?.oldValue?.name || value?.newValue?.name || key}
                          </Typography>
                          
                          {value.changed && (
                            <Box sx={{ mt: 1 }}>
                              <Divider sx={{ mb: 2 }} />
                              <Grid container spacing={2}>
                                <Grid item xs={12} md={6}>
                                  <Typography variant="caption" color="text.secondary">
                                    {t('backup.oldValue')}:
                                  </Typography>
                                  <Paper
                                    variant="outlined"
                                    sx={{ p: 1, mt: 0.5, bgcolor: alpha(theme.palette.error.main, 0.05) }}
                                  >
                                    <pre style={{ margin: 0, overflow: 'auto' }}>
                                      {JSON.stringify(value.oldValue, null, 2)}
                                    </pre>
                                  </Paper>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                  <Typography variant="caption" color="text.secondary">
                                    {t('backup.newValue')}:
                                  </Typography>
                                  <Paper
                                    variant="outlined"
                                    sx={{ p: 1, mt: 0.5, bgcolor: alpha(theme.palette.success.main, 0.05) }}
                                  >
                                    <pre style={{ margin: 0, overflow: 'auto' }}>
                                      {JSON.stringify(value.newValue, null, 2)}
                                    </pre>
                                  </Paper>
                                </Grid>
                              </Grid>
                            </Box>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Alert severity="info">
                  {t('backup.noEventChanges')}
                </Alert>
              )}
              
              <Divider sx={{ my: 3 }} />
              
              {/* スポーツの差分 */}
              <Typography variant="h6" gutterBottom>
                {t('backup.sportChanges')}
              </Typography>
              {Object.keys(diffData.sports).length > 0 ? (
                <Grid container spacing={2}>
                  {Object.entries(diffData.sports).map(([key, value]: [string, any]) => (
                    <Grid item xs={12} key={key}>
                      <Card variant="outlined">
                        <CardContent sx={{ pb: 1 }}>
                          <Typography variant="subtitle1" gutterBottom>
                            {value.added ? (
                              <Chip size="small" label={t('backup.added')} color="success" sx={{ mr: 1 }} />
                            ) : value.removed ? (
                              <Chip size="small" label={t('backup.removed')} color="error" sx={{ mr: 1 }} />
                            ) : (
                              <Chip size="small" label={t('backup.modified')} color="primary" sx={{ mr: 1 }} />
                            )}
                            {value?.oldValue?.name || value?.newValue?.name || key}
                          </Typography>
                          
                          {value.changed && (
                            <Box sx={{ mt: 1 }}>
                              <Divider sx={{ mb: 2 }} />
                              <Grid container spacing={2}>
                                <Grid item xs={12} md={6}>
                                  <Typography variant="caption" color="text.secondary">
                                    {t('backup.oldValue')}:
                                  </Typography>
                                  <Paper
                                    variant="outlined"
                                    sx={{ p: 1, mt: 0.5, bgcolor: alpha(theme.palette.error.main, 0.05) }}
                                  >
                                    <pre style={{ margin: 0, overflow: 'auto' }}>
                                      {JSON.stringify(value.oldValue, null, 2)}
                                    </pre>
                                  </Paper>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                  <Typography variant="caption" color="text.secondary">
                                    {t('backup.newValue')}:
                                  </Typography>
                                  <Paper
                                    variant="outlined"
                                    sx={{ p: 1, mt: 0.5, bgcolor: alpha(theme.palette.success.main, 0.05) }}
                                  >
                                    <pre style={{ margin: 0, overflow: 'auto' }}>
                                      {JSON.stringify(value.newValue, null, 2)}
                                    </pre>
                                  </Paper>
                                </Grid>
                              </Grid>
                            </Box>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Alert severity="info">
                  {t('backup.noSportChanges')}
                </Alert>
              )}
            </Box>
          ) : (
            <Alert severity="warning">
              {t('backup.noDiffData')}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDiffDialog}>
            {t('common.close')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default BackupPanel;
