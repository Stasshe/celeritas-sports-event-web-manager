import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Grid,
  CircularProgress,
  Tooltip,
  Snackbar,
  Alert,
  Chip,
  SelectChangeEvent
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  SportsSoccer as SportIcon,
  FileUpload as UploadIcon,
  ScoreboardOutlined as ScoreIcon
} from '@mui/icons-material';
import { useDatabase } from '../../hooks/useDatabase';
import { Event, Sport } from '../../types';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../config/firebase';
import { useNavigate } from 'react-router-dom';

const MotionPaper = motion(Paper);
const MotionListItem = motion(ListItem);

const SportManagement: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: sports, loading: sportsLoading, pushData: pushSport, updateData: updateSport, removeData: removeSport } = useDatabase<Record<string, Sport>>('/sports');
  const { data: events, loading: eventsLoading, updateData: updateEventData } = useDatabase<Record<string, Event>>('/events');
  
  const [openDialog, setOpenDialog] = useState(false);
  const [currentSport, setCurrentSport] = useState<Partial<Sport> | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [snackbar, setSnackbar] = useState<{open: boolean, message: string, severity: 'success' | 'error'}>({
    open: false,
    message: '',
    severity: 'success'
  });

  const handleOpenDialog = (sport?: Sport) => {
    if (sport) {
      setCurrentSport({ ...sport });
      setIsEditing(true);
      setImagePreview(sport.coverImageUrl || null);
    } else {
      setCurrentSport({
        name: '',
        eventId: '',
        type: 'tournament',
        description: '',
        teams: [],
        matches: []
      });
      setIsEditing(false);
      setImagePreview(null);
    }
    setImageFile(null);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCurrentSport(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => {
    const { name, value } = e.target;
    if (name) {
      setCurrentSport(prev => prev ? { ...prev, [name]: value } : prev);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCurrentSport(prev => ({
          ...prev,
          coverImageUrl: reader.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return currentSport?.coverImageUrl || null;

    try {
      setUploadingImage(true);
      const storageRef = ref(storage, `sport-covers/${Date.now()}-${imageFile.name}`);
      const snapshot = await uploadBytes(storageRef, imageFile);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (error) {
      console.error('Error uploading image:', error);
      setSnackbar({
        open: true,
        message: t('sports.uploadError') || '画像のアップロードに失敗しました',
        severity: 'error'
      });
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveSport = async () => {
    if (!currentSport?.name || !currentSport?.eventId) return;

    try {
      const coverImageUrl = await uploadImage();
      const sportData: Sport = {
        id: currentSport.id || '', // idを追加
        name: currentSport.name,
        eventId: currentSport.eventId,
        type: currentSport.type || 'tournament',
        description: currentSport.description || '',
        rules: currentSport.rules || undefined,
        teams: currentSport.teams || [],
        matches: currentSport.matches || [],
        coverImageUrl: coverImageUrl || undefined, // nullの代わりにundefinedを使用
        customLayout: currentSport.customLayout,
        organizers: currentSport.organizers || [] // organizersプロパティを追加
      };

      if (isEditing && currentSport.id) {
        await updateSport({ [currentSport.id]: sportData });
        
        // イベントの競技リストに追加（まだ追加されていない場合）
        if (events && events[currentSport.eventId]) {
          const event = events[currentSport.eventId];
          if (!event.sports.includes(currentSport.id)) {
            const updatedEvent = {
              ...event,
              sports: [...event.sports, currentSport.id]
            };
            await updateEventSports(currentSport.eventId, updatedEvent.sports);
          }
        }
        
        setSnackbar({
          open: true,
          message: t('sports.updateSuccess') || '競技が更新されました',
          severity: 'success'
        });
      } else {
        const newSportId = await pushSport(sportData);
        
        // イベントの競技リストに追加
        if (newSportId && events && events[currentSport.eventId]) {
          const event = events[currentSport.eventId];
          const updatedEvent = {
            ...event,
            sports: [...(event.sports || []), newSportId]
          };
          await updateEventSports(currentSport.eventId, updatedEvent.sports);
        }
        
        setSnackbar({
          open: true,
          message: t('sports.createSuccess') || '競技が作成されました',
          severity: 'success'
        });
      }
      handleCloseDialog();
    } catch (error) {
      setSnackbar({
        open: true,
        message: isEditing ? (t('sports.updateError') || '競技の更新に失敗しました') : (t('sports.createError') || '競技の作成に失敗しました'),
        severity: 'error'
      });
    }
  };

  const updateEventSports = async (eventId: string, sports: string[]) => {
    if (!updateEventData) return;
    
    try {
      const eventUpdate = {
        [eventId]: {
          sports
        }
      };
      await updateEventData(eventUpdate as unknown as Partial<Record<string, Event>>);
    } catch (error) {
      console.error('Error updating event sports:', error);
    }
  };

  const handleDeleteSport = async (sportId: string, eventId: string) => {
    try {
      await removeSport(`/${sportId}`);
      
      // イベントの競技リストから削除
      if (events && events[eventId]) {
        const event = events[eventId];
        const updatedSports = event.sports.filter(id => id !== sportId);
        await updateEventSports(eventId, updatedSports);
      }
      
      setSnackbar({
        open: true,
        message: t('sports.deleteSuccess') || '競技が削除されました',
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: t('sports.deleteError') || '競技の削除に失敗しました',
        severity: 'error'
      });
    }
  };

  const handleGoToScoring = (sportId: string) => {
    navigate(`/admin/scoring/${sportId}`);
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // イベント名を取得する関数
  const getEventName = (eventId: string) => {
    return events && events[eventId] ? events[eventId].name : '不明なイベント';
  };

  // 競技タイプに応じた色を取得する関数
  const getSportTypeColor = (type: string): "primary" | "secondary" | "default" => {
    switch (type) {
      case 'tournament':
        return 'primary';
      case 'roundRobin':
        return 'secondary';
      default:
        return 'default';
    }
  };

  if (sportsLoading || eventsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  const sportList = sports ? Object.values(sports) : [];
  const eventOptions = events ? Object.values(events) : [];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">{t('admin.sportManagement') || '競技管理'}</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          disabled={!eventOptions.length}
        >
          {t('admin.createSport') || '競技作成'}
        </Button>
      </Box>

      {!eventOptions.length ? (
        <Paper sx={{ p: 3, textAlign: 'center', mb: 4 }}>
          <Typography color="text.secondary">
            {t('sports.noEventsForSports') || '競技を作成するには、先にイベントを作成してください。'}
          </Typography>
        </Paper>
      ) : (
        <MotionPaper
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          elevation={3}
          sx={{ mb: 4 }}
        >
          {sportList.length > 0 ? (
            <List>
              {sportList.map((sport, index) => (
                <React.Fragment key={sport.id}>
                  <MotionListItem
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.1 }}
                    secondaryAction={
                      <Box>
                        <Tooltip title={t('sports.goToScoring') || 'スコア入力'}>
                          <IconButton 
                            edge="end" 
                            color="primary"
                            onClick={() => handleGoToScoring(sport.id)}
                          >
                            <ScoreIcon />
                          </IconButton>
                        </Tooltip>
                        <IconButton edge="end" onClick={() => handleOpenDialog(sport)}>
                          <EditIcon />
                        </IconButton>
                        <IconButton 
                          edge="end" 
                          color="error" 
                          onClick={() => handleDeleteSport(sport.id, sport.eventId)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    }
                  >
                    <ListItemAvatar>
                      <Avatar 
                        src={sport.coverImageUrl || undefined}
                        alt={sport.name}
                        variant="rounded"
                      >
                        <SportIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography component="span" variant="h6">
                            {sport.name}
                          </Typography>
                          <Chip 
                            label={t(`sports.${sport.type}`) || sport.type} 
                            color={getSportTypeColor(sport.type)}
                            size="small" 
                            sx={{ ml: 1 }} 
                          />
                        </Box>
                      }
                      secondary={
                        <>
                          <Typography component="span" variant="body2" color="text.primary">
                            {getEventName(sport.eventId)}
                          </Typography>
                          <Typography variant="body2">
                            {sport.description || t(`sports.${sport.type}Description`) || ''}
                          </Typography>
                        </>
                      }
                    />
                  </MotionListItem>
                  {index < sportList.length - 1 && <Divider variant="inset" component="li" />}
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">
                {t('sports.noSports') || '競技がありません'}
              </Typography>
            </Box>
          )}
        </MotionPaper>
      )}

      {/* 競技作成/編集ダイアログ */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {isEditing ? (t('admin.editSport') || '競技編集') : (t('admin.createSport') || '競技作成')}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={7}>
              <TextField
                name="name"
                label={t('sports.name') || '競技名'}
                value={currentSport?.name || ''}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
                required
              />
              
              <FormControl fullWidth margin="normal" required>
                <InputLabel>{t('sports.event') || 'イベント'}</InputLabel>
                <Select<string>
                  name="eventId"
                  value={currentSport?.eventId || ''}
                  onChange={handleInputChange as any}
                  disabled={isEditing}  // 既存競技のイベントは変更不可
                >
                  {eventOptions.map(event => (
                    <MenuItem key={event.id} value={event.id}>
                      {event.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl fullWidth margin="normal" required>
                <InputLabel>{t('sports.type') || '競技形式'}</InputLabel>
                <Select<"tournament" | "roundRobin" | "custom">
                  name="type"
                  value={currentSport?.type || 'tournament'}
                  onChange={handleInputChange as any}
                  disabled={isEditing}  // 既存競技の形式は変更不可
                >
                  <MenuItem value="tournament">{t('sports.tournament') || 'トーナメント'}</MenuItem>
                  <MenuItem value="roundRobin">{t('sports.roundRobin') || '総当たり戦'}</MenuItem>
                  <MenuItem value="custom">{t('sports.custom') || 'カスタム形式'}</MenuItem>
                </Select>
              </FormControl>
              
              <TextField
                name="description"
                label={t('sports.description') || '説明'}
                value={currentSport?.description || ''}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
                multiline
                rows={3}
              />
              
              <TextField
                name="rules"
                label={t('sports.rules') || 'ルール'}
                value={currentSport?.rules || ''}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12} sm={5}>
              <Typography variant="subtitle1" gutterBottom>
                {t('sports.coverImage') || 'カバー画像'}
              </Typography>
              <Box 
                sx={{
                  width: '100%',
                  height: 200,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  border: '1px dashed grey',
                  borderRadius: 1,
                  mb: 2,
                  backgroundImage: imagePreview ? `url(${imagePreview})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                {!imagePreview && (
                  <Typography color="text.secondary">
                    {t('sports.noImage') || '画像がありません'}
                  </Typography>
                )}
              </Box>
              <Button
                variant="outlined"
                component="label"
                startIcon={<UploadIcon />}
                fullWidth
              >
                {t('sports.uploadImage') || '画像をアップロード'}
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handleImageChange}
                />
              </Button>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1, textAlign: 'center' }}>
                {t('sports.imageRecommendation') || '推奨サイズ: 1200×600ピクセル'}
              </Typography>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>
            {t('common.cancel') || 'キャンセル'}
          </Button>
          <Button
            onClick={handleSaveSport}
            variant="contained"
            disabled={!currentSport?.name || !currentSport?.eventId || uploadingImage}
          >
            {uploadingImage ? (
              <CircularProgress size={24} />
            ) : isEditing ? (
              t('common.save') || '保存'
            ) : (
              t('common.create') || '作成'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* スナックバー通知 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SportManagement;
