import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Button,
  CircularProgress,
  IconButton,
  Snackbar,
  Alert,
  Divider,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  Chip,
  useTheme
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  SportsSoccer as SportIcon,
  People as PeopleIcon,
  EmojiEvents as RulesIcon,
  MenuBook as ManualIcon,
  Settings as SettingsIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useDatabase } from '../../hooks/useDatabase';
import { Sport, Team, Event, Organizer } from '../../types';
import TournamentScoring from '../../components/admin/scoring/TournamentScoring';
import RoundRobinScoring from '../../components/admin/scoring/RoundRobinScoring';
import CustomScoring from '../../components/admin/scoring/CustomScoring';
import RosterEditor from '../../components/admin/RosterEditor';
import { useThemeContext } from '../../contexts/ThemeContext';
import AdminLayout from '../../components/layout/AdminLayout';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = (props) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`sport-tabpanel-${index}`}
      aria-labelledby={`sport-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const SportEditPage: React.FC = () => {
  const { sportId } = useParams<{ sportId?: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme();
  const { alpha } = useThemeContext();
  
  const { data: sport, loading: sportLoading, updateData: updateSport } = useDatabase<Sport>(`/sports/${sportId}`);
  const { data: events, loading: eventsLoading } = useDatabase<Record<string, Event>>('/events');
  
  const [activeTab, setActiveTab] = useState(0);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [localSport, setLocalSport] = useState<Sport | null>(null);
  const [autoSaveTimerId, setAutoSaveTimerId] = useState<NodeJS.Timeout | null>(null);
  const [newOrganizer, setNewOrganizer] = useState<Organizer>({
    id: `org_${Date.now()}`,
    name: '',
    role: 'member',
    grade: 2
  });

  // 初期データロード
  useEffect(() => {
    if (sport && !localSport) {
      setLocalSport(JSON.parse(JSON.stringify(sport)));
    }
  }, [sport]);

  // データ変更時の自動保存設定
  useEffect(() => {
    if (!localSport || !sport) return;

    // データが変更されている場合
    if (JSON.stringify(localSport) !== JSON.stringify(sport)) {
      // 既存のタイマーをクリア
      if (autoSaveTimerId) {
        clearTimeout(autoSaveTimerId);
      }
      
      // 新しいタイマーをセット（3秒後に自動保存）
      const timerId = setTimeout(handleSave, 3000);
      setAutoSaveTimerId(timerId);
    }

    return () => {
      if (autoSaveTimerId) {
        clearTimeout(autoSaveTimerId);
      }
    };
  }, [localSport]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleSave = async () => {
    if (!localSport) return;

    setSaveStatus('saving');
    try {
      await updateSport(localSport);
      setSaveStatus('saved');
      setShowSnackbar(true);
    } catch (error) {
      console.error('Error saving sport data:', error);
      setSaveStatus('error');
      setShowSnackbar(true);
    } finally {
      // 5秒後にステータスをリセット
      setTimeout(() => {
        setSaveStatus('idle');
      }, 5000);
    }
  };

  const handleSnackbarClose = () => {
    setShowSnackbar(false);
  };

  // スポーツデータの更新ハンドラ（子コンポーネントから呼ばれる）
  const handleSportUpdate = (updatedSport: Sport) => {
    setLocalSport(updatedSport);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    if (name && localSport) {
      setLocalSport(prev => prev ? { ...prev, [name]: value } : prev);
    }
  };

  const handleOrganizerChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    if (name) {
      setNewOrganizer(prev => ({ ...prev, [name]: value }));
    }
  };

  const addOrganizer = () => {
    if (newOrganizer.name && localSport) {
      setLocalSport(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          organizers: [...(prev.organizers || []), { ...newOrganizer, id: `org_${Date.now()}` }]
        };
      });
      
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
    if (localSport) {
      setLocalSport(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          organizers: (prev.organizers || []).filter(org => org.id !== id)
        };
      });
    }
  };

  // イベント名を取得する関数
  const getEventName = (eventId: string) => {
    return events && events[eventId] ? events[eventId].name : t('sport.unknownEvent');
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'leader':
        return t('sport.roleLeader');
      case 'member':
        return t('sport.roleMember');
      default:
        return role;
    }
  };

  // tournamentSettingsの型エラーを修正
  const handleSettingsChange = (key: string, value: boolean) => {
    setLocalSport(prev => {
      if (!prev) return prev;
      
      // tournamentSettingsが存在しない場合は作成
      const tournamentSettings = prev.tournamentSettings || { 
        hasThirdPlaceMatch: false, 
        hasRepechage: false 
      };
      
      return {
        ...prev,
        tournamentSettings: {
          ...tournamentSettings,
          [key]: value
        }
      };
    });
  };

  if (sportLoading || eventsLoading) {
    return (
      <AdminLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
          <CircularProgress />
        </Box>
      </AdminLayout>
    );
  }

  if (!sport || !localSport) {
    return (
      <AdminLayout>
        <Box sx={{ textAlign: 'center', my: 8 }}>
          <Typography variant="h5">
            {t('sport.notFound')}
          </Typography>
          <Button sx={{ mt: 2 }} variant="contained" onClick={() => navigate('/admin')}>
            {t('common.backToAdmin')}
          </Button>
        </Box>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Container maxWidth="xl">
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton onClick={() => navigate('/admin')} aria-label="back" sx={{ mr: 1 }}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h4" component="h1">
              {localSport.name}
            </Typography>
            <Chip 
              label={t(`sport.${localSport.type}`)} 
              color="primary" 
              size="small" 
              sx={{ ml: 2 }} 
            />
          </Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
          >
            {saveStatus === 'saving' ? t('common.saving') : t('common.save')}
          </Button>
        </Box>

        <Paper sx={{ mb: 4 }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="sport management tabs"
          >
            <Tab icon={<SportIcon />} label={t('sport.tabs.home')} />
            <Tab icon={<PeopleIcon />} label={t('sport.tabs.roster')} />
            <Tab icon={<RulesIcon />} label={t('sport.tabs.rules')} />
            <Tab icon={<ManualIcon />} label={t('sport.tabs.manual')} />
            <Tab icon={<SettingsIcon />} label={t('sport.tabs.settings')} />
          </Tabs>
        </Paper>

        {/* ホームタブ */}
        <TabPanel value={activeTab} index={0}>
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, mb: 4, height: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  {t('sport.details')}
                </Typography>
                <Divider sx={{ mb: 3 }} />
                
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      name="name"
                      label={t('sport.name')}
                      fullWidth
                      margin="normal"
                      value={localSport.name}
                      onChange={handleInputChange}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label={t('sport.event')}
                      fullWidth
                      margin="normal"
                      value={getEventName(localSport.eventId)}
                      InputProps={{ readOnly: true }}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      name="description"
                      label={t('sport.description')}
                      fullWidth
                      multiline
                      rows={3}
                      margin="normal"
                      value={localSport.description || ''}
                      onChange={handleInputChange}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, mb: 4, height: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  {t('sport.organizers')}
                </Typography>
                <Divider sx={{ mb: 3 }} />
                
                <Grid container spacing={2} sx={{ mb: 3 }} alignItems="flex-end">
                  <Grid item xs={12} sm={4}>
                    <TextField
                      name="name"
                      label={t('sport.organizerName')}
                      fullWidth
                      value={newOrganizer.name}
                      onChange={handleOrganizerChange}
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <FormControl fullWidth>
                      <InputLabel>{t('sport.role')}</InputLabel>
                      <Select
                        name="role"
                        value={newOrganizer.role}
                        onChange={handleOrganizerChange as any}
                      >
                        <MenuItem value="leader">{t('sport.roleLeader')}</MenuItem>
                        <MenuItem value="member">{t('sport.roleMember')}</MenuItem>
                        <MenuItem value="custom">{t('sport.roleCustom')}</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <FormControl fullWidth>
                      <InputLabel>{t('sport.grade')}</InputLabel>
                      <Select
                        name="grade"
                        value={newOrganizer.grade}
                        onChange={handleOrganizerChange as any}
                      >
                        <MenuItem value={1}>{t('sport.grade1')}</MenuItem>
                        <MenuItem value={2}>{t('sport.grade2')}</MenuItem>
                        <MenuItem value={3}>{t('sport.grade3')}</MenuItem>
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
                      {t('common.add')}
                    </Button>
                  </Grid>
                </Grid>
                
                {/* 担当者リスト */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {(localSport.organizers || []).map(org => (
                    <Chip
                      key={org.id}
                      label={`${org.name} (${getRoleLabel(org.role)}, ${org.grade}${t('sport.gradeUnit')})`}
                      onDelete={() => removeOrganizer(org.id)}
                      color={org.role === 'leader' ? 'primary' : 'default'}
                    />
                  ))}
                  {(!localSport.organizers || localSport.organizers.length === 0) && (
                    <Typography variant="body2" color="text.secondary">
                      {t('sport.noOrganizers')}
                    </Typography>
                  )}
                </Box>
              </Paper>
              
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  {t('sport.quickActions')}
                </Typography>
                <Divider sx={{ mb: 3 }} />
                
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={() => setActiveTab(1)}
                      startIcon={<PeopleIcon />}
                    >
                      {t('sport.manageRoster')}
                    </Button>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={() => navigate(`/admin/scoring/${sportId}`)}
                      startIcon={<SportIcon />}
                    >
                      {t('sport.manageScores')}
                    </Button>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>

        {/* 競技・名簿登録タブ */}
        <TabPanel value={activeTab} index={1}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              {t('sport.roster')}
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <RosterEditor 
              sport={localSport} 
              onUpdate={handleSportUpdate} 
            />
          </Paper>
        </TabPanel>

        {/* ルールタブ */}
        <TabPanel value={activeTab} index={2}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              {t('sport.tabs.rules')}
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <TextField
              name="rules"
              label={t('sport.rulesContent')}
              fullWidth
              multiline
              rows={12}
              value={localSport.rules || ''}
              onChange={handleInputChange}
              variant="outlined"
              placeholder={t('sport.rulesPlaceholder') || 'この競技のルールを入力してください...'}
            />
            
            <Box sx={{ mt: 3, color: 'text.secondary' }}>
              <Typography variant="caption">
                {t('sport.rulesHelp')}
              </Typography>
            </Box>
          </Paper>
        </TabPanel>

        {/* マニュアルタブ */}
        <TabPanel value={activeTab} index={3}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              {t('sport.tabs.manual')}
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <TextField
              name="manual"
              label={t('sport.manualContent')}
              fullWidth
              multiline
              rows={12}
              value={localSport.manual || ''}
              onChange={handleInputChange}
              variant="outlined"
              placeholder={t('sport.manualPlaceholder') || 'この競技の実施マニュアルを入力してください...'}
            />
            
            <Box sx={{ mt: 3, color: 'text.secondary' }}>
              <Typography variant="caption">
                {t('sport.manualHelp')}
              </Typography>
            </Box>
          </Paper>
        </TabPanel>

        {/* 設定タブ */}
        <TabPanel value={activeTab} index={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              {t('sport.tabs.settings')}
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            {localSport.type === 'tournament' && (
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>{t('tournament.hasThirdPlaceMatch')}</InputLabel>
                    <Select
                      value={localSport.tournamentSettings?.hasThirdPlaceMatch ? "true" : "false"}
                      onChange={(e) => handleSettingsChange('hasThirdPlaceMatch', e.target.value === 'true')}
                    >
                      <MenuItem value="true">{t('common.yes')}</MenuItem>
                      <MenuItem value="false">{t('common.no')}</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>{t('tournament.hasRepechage')}</InputLabel>
                    <Select
                      value={localSport.tournamentSettings?.hasRepechage ? "true" : "false"}
                      onChange={(e) => handleSettingsChange('hasRepechage', e.target.value === 'true')}
                    >
                      <MenuItem value="true">{t('common.yes')}</MenuItem>
                      <MenuItem value="false">{t('common.no')}</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            )}
            
            {localSport.type === 'roundRobin' && (
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label={t('roundRobin.winPoints')}
                    type="number"
                    fullWidth
                    value={localSport.roundRobinSettings?.winPoints || 3}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      setLocalSport(prev => {
                        if (!prev) return prev;
                        return {
                          ...prev,
                          roundRobinSettings: {
                            ...prev.roundRobinSettings || {
                              drawPoints: 1,
                              losePoints: 0,
                              considerLosePoints: false
                            },
                            winPoints: value
                          }
                        };
                      });
                    }}
                    InputProps={{ inputProps: { min: 0 } }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label={t('roundRobin.drawPoints')}
                    type="number"
                    fullWidth
                    value={localSport.roundRobinSettings?.drawPoints || 1}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      setLocalSport(prev => {
                        if (!prev) return prev;
                        return {
                          ...prev,
                          roundRobinSettings: {
                            ...prev.roundRobinSettings || {
                              winPoints: 3,
                              losePoints: 0,
                              considerLosePoints: false
                            },
                            drawPoints: value
                          }
                        };
                      });
                    }}
                    InputProps={{ inputProps: { min: 0 } }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label={t('roundRobin.losePoints')}
                    type="number"
                    fullWidth
                    value={localSport.roundRobinSettings?.losePoints || 0}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      setLocalSport(prev => {
                        if (!prev) return prev;
                        return {
                          ...prev,
                          roundRobinSettings: {
                            ...prev.roundRobinSettings || {
                              winPoints: 3,
                              drawPoints: 1,
                              considerLosePoints: false
                            },
                            losePoints: value
                          }
                        };
                      });
                    }}
                    InputProps={{ inputProps: { min: 0 } }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>{t('roundRobin.considerLosePoints')}</InputLabel>
                    <Select
                      value={localSport.roundRobinSettings?.considerLosePoints || false}
                      onChange={(e) => {
                        setLocalSport(prev => {
                          if (!prev) return prev;
                          return {
                            ...prev,
                            roundRobinSettings: {
                              ...prev.roundRobinSettings || {
                                winPoints: 3,
                                drawPoints: 1,
                                losePoints: 0
                              },
                              considerLosePoints: e.target.value === 'true'
                            }
                          };
                        });
                      }}
                    >
                      <MenuItem value="true">{t('common.yes')}</MenuItem>
                      <MenuItem value="false">{t('common.no')}</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            )}
            
            {localSport.type === 'custom' && (
              <Typography>
                {t('sport.customSettingsMessage')}
              </Typography>
            )}
          </Paper>
        </TabPanel>

        {/* 保存通知 */}
        <Snackbar 
          open={showSnackbar} 
          autoHideDuration={6000} 
          onClose={handleSnackbarClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert 
            onClose={handleSnackbarClose} 
            severity={saveStatus === 'saved' ? 'success' : 'error'}
            sx={{ width: '100%' }}
          >
            {saveStatus === 'saved' ? 
              t('sport.saveSuccess') : 
              t('sport.saveError')
            }
          </Alert>
        </Snackbar>
      </Container>
    </AdminLayout>
  );
};

export default SportEditPage;
