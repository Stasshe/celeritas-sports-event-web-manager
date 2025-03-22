import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  AlertTitle,
  Divider,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
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
  Add as AddIcon,
  Sync as SyncIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useDatabase } from '../../hooks/useDatabase';
import { Sport, Team, Event, Organizer } from '../../types';
import TournamentScoring from '../../components/admin/scoring/TournamentScoring';
import RoundRobinScoring from '../../components/admin/scoring/RoundRobinScoring';
//import CustomScoring from '../../components/admin/scoring/CustomScoring';
import RosterEditor from '../../components/admin/RosterEditor';
import { useThemeContext } from '../../contexts/ThemeContext';
import AdminLayout from '../../components/layout/AdminLayout';
import DeleteConfirmationDialog from '../../components/admin/dialogs/DeleteConfirmationDialog';
import { useAdminLayout } from '../../contexts/AdminLayoutContext';
import { useAuth } from '../../contexts/AuthContext';
import { TabContent } from '../../components/admin/TabContent';

// フィールドとタブの関連付けを定義
const fieldToTabMap: Record<keyof Sport, string> = {
  name: 'details',
  description: 'details',
  rules: 'rules',
  manual: 'manual',
  tournamentSettings: 'settings',
  roundRobinSettings: 'settings',
  organizers: 'roster',
  roster: 'roster',
  // ...他のフィールドも必要に応じて追加
};

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

// タブの状態を管理するインターフェース
interface TabState {
  isLoaded: boolean;
  isDirty: boolean;
  lastUpdated: number;
  loading: boolean;
  hasChanges: boolean;
}

interface TabStates {
  [key: string]: TabState;
}

const SportEditPage: React.FC = () => {
  const { sportId } = useParams<{ sportId?: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme();
  const { alpha } = useThemeContext();
  const { setSavingStatus, showSnackbar: showAdminSnackbar } = useAdminLayout();
  const isProcessingRef = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { currentUser } = useAuth();
  
  const { data: sport, loading: sportLoading, updateData, removeData } = useDatabase<Sport>(`/sports/${sportId}`);
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
  const [initialLoading, setInitialLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false); // ダイアログの状態を追加

  // 各タブのローディング状態を個別管理
  const [tabLoadingStates, setTabLoadingStates] = useState({
    details: false,
    roster: false,
    rules: false,
    manual: false,
    settings: false
  });
  
  // 差分を管理
  const [differences, setDifferences] = useState<{
    [key: string]: {
      local: any;
      remote: any;
    }
  }>({});

  // 最後の同期時刻
  const [lastSynced, setLastSynced] = useState<Date>(new Date());

  // 最後の更新者の情報
  const [lastEditor, setLastEditor] = useState<string | null>(null);

  // 初期データロード
  useEffect(() => {
    if (sport && !localSport) {
      setLocalSport(JSON.parse(JSON.stringify(sport)));
    }
  }, [sport]);

  // sportIdが変更されたときにlocalSportをリセット
  useEffect(() => {
    setLocalSport(null);
    if (sport) {
      setLocalSport(JSON.parse(JSON.stringify(sport)));
    }
  }, [sportId, sport]);

  // スポーツIDが変更されたときだけinitialLoadingを使用
  useEffect(() => {
    if (sportId) {
      setInitialLoading(!sport);
    }
    
    // 初回ロード完了後はinitialLoadingをfalseに
    if (sport) {
      setInitialLoading(false);
    }
  }, [sportId, sport]);

  // handleSave関数を完全に書き換え
  const handleSave = useCallback(async () => {
    if (!localSport || isProcessingRef.current) return;

    isProcessingRef.current = true;
    setSavingStatus('saving');
    setUpdating(true); // ローディング画面を表示しないフラグ

    try {
      const result = await updateData(localSport);
      if (result) {
        setSavingStatus('saved');
      } else {
        setSavingStatus('error');
      }
    } catch (error) {
      console.error('Error saving sport:', error);
      setSavingStatus('error');
    } finally {
      isProcessingRef.current = false;
      setUpdating(false);
    }
  }, [localSport, updateData, setSavingStatus]);

  
  // データ変更時の自動保存設定を改善
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (localSport && sport && JSON.stringify(localSport) !== JSON.stringify(sport)) {
        handleSave();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [localSport, sport, handleSave]);

  // タブの状態管理を改善
  const [tabStates, setTabStates] = useState<TabStates>({
    details: { 
      isLoaded: true, 
      isDirty: false, 
      lastUpdated: 0,
      loading: false,
      hasChanges: false 
    },
    roster: { 
      isLoaded: true, 
      isDirty: false, 
      lastUpdated: 0,
      loading: false,
      hasChanges: false 
    },
    rules: { 
      isLoaded: true, 
      isDirty: false, 
      lastUpdated: 0,
      loading: false,
      hasChanges: false 
    },
    manual: { 
      isLoaded: true, 
      isDirty: false, 
      lastUpdated: 0,
      loading: false,
      hasChanges: false 
    },
    settings: { 
      isLoaded: true, 
      isDirty: false, 
      lastUpdated: 0,
      loading: false,
      hasChanges: false 
    }
  });

  // フィールドからタブ名を取得する関数
  const getTabNameForField = (field: keyof Sport): string => {
    return fieldToTabMap[field] || 'details';
  };

  // タブ切り替えの統合されたハンドラ
  const handleTabChange = useCallback(async (event: React.SyntheticEvent, newValue: number) => {
    // 現在のタブのデータに変更があれば保存
    if (localSport && sport && JSON.stringify(localSport) !== JSON.stringify(sport)) {
      await handleSave();
    }

    const tabName = ['details', 'roster', 'rules', 'manual', 'settings'][newValue];
    setActiveTab(newValue);

    if (!tabStates[tabName].isLoaded) {
      setTabStates(prev => ({
        ...prev,
        [tabName]: { ...prev[tabName], isLoaded: true }
      }));
    }
  }, [tabStates, localSport, sport, handleSave]);

  // 部分更新の統合されたハンドラを改善
  const handlePartialUpdate = useCallback(async (field: keyof Sport, value: any) => {
    if (!localSport || isProcessingRef.current) return;

    const tabName = getTabNameForField(field);
    
    // 楽観的UI更新（即時反映）
    const updatedSport: Sport = {
      ...localSport,
      [field]: value,
      lastEditedBy: currentUser?.email || undefined,
      lastEditedAt: new Date().toISOString()
    };
    
    // 即時にローカル状態を更新（UXのため）
    setLocalSport(updatedSport);

    try {
      // タブの状態を更新（ローディングなしで）
      setTabStates(prev => ({
        ...prev,
        [tabName]: {
          ...prev[tabName],
          isDirty: true,
          lastUpdated: Date.now()
        }
      }));

      // バックグラウンドで保存（ローディング表示なし）
      await updateData(updatedSport);

      // 更新成功後、タブの状態をクリア
      setTabStates(prev => ({
        ...prev,
        [tabName]: {
          ...prev[tabName],
          isDirty: false
        }
      }));

      showAdminSnackbar(t('sport.fieldUpdateSuccess'), 'success');
    } catch (error) {
      console.error(`Error updating ${field}:`, error);
      showAdminSnackbar(t('sport.fieldUpdateError'), 'error');
      
      // エラー時にローカル状態を元に戻す
      if (sport) {
        setLocalSport({
          ...localSport,
          [field]: sport[field]
        });
      }
      
      // エラー時にタブの状態を戻す
      setTabStates(prev => ({
        ...prev,
        [tabName]: {
          ...prev[tabName],
          isDirty: false
        }
      }));
    }
  }, [localSport, currentUser, updateData, showAdminSnackbar, t, sport]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      isProcessingRef.current = false;
    };
  }, []);

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
    if (!newOrganizer.name || !sport) return;
    
    // 有効なIDを持つ新しいオーガナイザーを作成
    const newOrganizerWithId = {
      ...newOrganizer,
      id: `org_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    };
    
    // スポーツのオーガナイザーリストを更新
    const updatedOrganizers = [...(sport.organizers || []), newOrganizerWithId];
    
    // スポーツオブジェクトを更新
    const updatedSport = {
      ...sport,
      organizers: updatedOrganizers
    };
    
    // 親コンポーネントに通知
    handleSportUpdate(updatedSport);
    
    // 該当タブの状態を更新
    const tabName = getTabNameForField('organizers');
    setTabStates(prev => ({
      ...prev,
      [tabName]: {
        ...prev[tabName],
        isDirty: true,
        hasChanges: true
      }
    }));
    
    // 新規オーガナイザー入力をリセット
    setNewOrganizer({
      id: `org_${Date.now()}`,
      name: '',
      role: 'member',
      grade: 2
    });
  };

  const removeOrganizer = (id: string) => {
    if (!sport) return;
    
    // 指定されたIDを持つオーガナイザーを除外
    const updatedOrganizers = (sport.organizers || []).filter(org => org.id !== id);
    
    // スポーツオブジェクトを更新
    const updatedSport = {
      ...sport,
      organizers: updatedOrganizers
    };
    
    // 親コンポーネントに通知
    handleSportUpdate(updatedSport);
    
    // 該当タブの状態を更新
    const tabName = getTabNameForField('organizers');
    setTabStates(prev => ({
      ...prev,
      [tabName]: {
        ...prev[tabName],
        isDirty: true,
        hasChanges: true
      }
    }));
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

  const handleRoundRobinSettingsUpdate = (
    key: keyof Required<Sport>['roundRobinSettings'], 
    value: number | boolean | 'points' | 'goalDifference' | 'goals'
  ) => {
    const defaultSettings: Required<Sport>['roundRobinSettings'] = {
      winPoints: 3,
      drawPoints: 1,
      losePoints: 0,
      considerLosePoints: false,
      rankingMethod: 'points',
      displayRankCount: 3
    };
  
    setLocalSport(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        roundRobinSettings: {
          ...defaultSettings,
          ...(prev.roundRobinSettings || {}),
          [key]: value
        }
      };
    });
  };

  const handleDelete = async () => {
    try {
      await removeData();
      setShowSnackbar(true);
      navigate('/admin');
    } catch (error) {
      setShowSnackbar(true);
    }
  };

  // データの差分を検出する関数
  const detectChanges = useCallback((local: Sport, remote: Sport) => {
    const diffs: typeof differences = {};
    
    // 基本フィールドの比較
    ['name', 'description', 'rules', 'manual'].forEach(field => {
      if (local[field] !== remote[field]) {
        diffs[field] = {
          local: local[field],
          remote: remote[field]
        };
      }
    });
    
    // 主催者リストの比較
    if (JSON.stringify(local.organizers) !== JSON.stringify(remote.organizers)) {
      diffs.organizers = {
        local: local.organizers,
        remote: remote.organizers
      };
    }
    
    // 設定の比較
    if (JSON.stringify(local.tournamentSettings) !== JSON.stringify(remote.tournamentSettings)) {
      diffs.tournamentSettings = {
        local: local.tournamentSettings,
        remote: remote.tournamentSettings
      };
    }
    
    setDifferences(diffs);
    return Object.keys(diffs).length > 0;
  }, []);

  // リモートデータの変更を監視
  useEffect(() => {
    if (sport && localSport && !isProcessingRef.current) {
      const hasChanges = detectChanges(localSport, sport);
      
      if (hasChanges && sport.lastEditedBy !== currentUser?.email) {
        setLastEditor(sport.lastEditedBy || 'unknown');
        showAdminSnackbar(
          t('sport.remoteChangesDetected'),
          'warning'
        );
      }
    }
  }, [sport, localSport, currentUser, showAdminSnackbar, t]);

  // リモートデータの変更を監視
  useEffect(() => {
    if (sport && localSport && !isProcessingRef.current) {
      const hasChanges = detectChanges(localSport, sport);
      
      if (hasChanges && sport.lastEditedBy !== currentUser?.email) {
        setLastEditor(sport.lastEditedBy || 'unknown');
        showAdminSnackbar(
          t('sport.remoteChangesDetected'),
          'warning'
        );
      }
    }
  }, [sport, localSport, currentUser, showAdminSnackbar, t]);

  // 全ての変更を同期する関数
  const handleSync = async () => {
    if (!sport || isProcessingRef.current) return;
    
    try {
      // ロード画面を表示せず更新中フラグだけ設定
      setUpdating(true);
      const updatedSport: Sport = {
        ...sport,
        lastEditedBy: currentUser?.email || undefined,
        lastEditedAt: new Date().toISOString()
      };
      
      await updateData(updatedSport);
      setLocalSport(updatedSport);
      setDifferences({});
      setLastSynced(new Date());
      showAdminSnackbar(t('sport.syncSuccess'), 'success');
      
    } catch (error) {
      console.error('Sync error:', error);
      showAdminSnackbar(t('sport.syncError'), 'error');
    } finally {
      setUpdating(false);
    }
  };

  // 差分表示コンポーネントの改善
  const DifferenceIndicator = ({ field }: { field: keyof Sport }) => {
    if (!differences[field]) return null;
    
    const tabName = getTabNameForField(field);
    const isDirty = tabStates[tabName].isDirty;
    
    // もし値がobjectの場合は文字列に変換する
    const renderValue = (value: any) =>
      typeof value === 'object' ? JSON.stringify(value) : value;
    
    // 保存後に差分表示を消すため、差分がなくなったらコンポーネントを表示しない
    if (JSON.stringify(differences[field].remote) === JSON.stringify(differences[field].local)) {
      return null;
    }
    
    return (
      <Box sx={{
        mt: 1,
        p: 1,
        bgcolor: isDirty ? 'warning.light' : 'background.default',
        borderRadius: 1,
        border: '1px solid',
        borderColor: isDirty ? 'warning.main' : 'divider',
        transition: 'all 0.3s ease'
      }}>
        <Typography variant="caption" display="block">
          {t('sport.remoteValue')}:
        </Typography>
        <Typography variant="body2">
          {renderValue(differences[field].remote)}
        </Typography>
        <Button
          size="small"
          startIcon={<SyncIcon />}
          onClick={() => handlePartialUpdate(field, differences[field].remote)}
          sx={{ mt: 1 }}
        >
          {t('sport.useRemoteValue')}
        </Button>
      </Box>
    );
  };

  // タブコンテンツのロード処理を修正 - 非同期処理を排除
  const loadTabContent = useCallback((tabName: string) => {
    if (tabStates[tabName].isLoaded) return;
    
    // ローディング表示なしでタブをロード済みに設定
    setTabStates(prev => ({
      ...prev,
      [tabName]: {
        ...prev[tabName],
        isLoaded: true,
        loading: false // 常にfalseに設定
      }
    }));
  }, [tabStates]);

  // 初回ロードのみの変更
  useEffect(() => {
    // 最初のロードのみtrueにして、データが取得できたらすぐfalseに
    if (sport) {
      setInitialLoading(false);
    } else {
      setInitialLoading(true);
    }
  }, [sport]);

  if (initialLoading) {
    return (
      <AdminLayout>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '80vh' 
        }}>
          <CircularProgress />
          <Typography variant="h6" sx={{ mt: 2 }}>
            {t('sport.loading')}
          </Typography>
        </Box>
      </AdminLayout>
    );
  }

  if (sportLoading || eventsLoading) {
    if (!updating) {
      return (
        <AdminLayout>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
            <CircularProgress />
          </Box>
        </AdminLayout>
      );
    }
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
      <Container maxWidth="lg">
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton onClick={() => navigate('/admin')} aria-label="back" sx={{ mr: 1 }}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h5" component="h1">
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

        <Paper sx={{ mb: 2 }}>
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
          <Box>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, mb: 4, height: '100%' }}>
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
                      <DifferenceIndicator field="name" />
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
                      <DifferenceIndicator field="description" />
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, mb: 4, height: '100%' }}>
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
                          <MenuItem value="custom">{t('sport.roleTeacher')}</MenuItem>
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
                  <DifferenceIndicator field="organizers" />
                </Paper>
                
                <Paper sx={{ p: 2 }}>
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
          </Box>
        </TabPanel>

        {/* 競技・名簿登録タブ */}
        <TabPanel value={activeTab} index={1}>
          <Paper sx={{ p: 3 }}>
            
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
            <DifferenceIndicator field="rules" />
            
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
            <DifferenceIndicator field="manual" />
            
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
                    value={localSport.roundRobinSettings?.winPoints ?? 3}
                    onChange={(e) => handleRoundRobinSettingsUpdate('winPoints', parseInt(e.target.value) || 0)}
                    InputProps={{ inputProps: { min: 0 } }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label={t('roundRobin.drawPoints')}
                    type="number"
                    fullWidth
                    value={localSport.roundRobinSettings?.drawPoints ?? 1}
                    onChange={(e) => handleRoundRobinSettingsUpdate('drawPoints', parseInt(e.target.value) || 0)}
                    InputProps={{ inputProps: { min: 0 } }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label={t('roundRobin.losePoints')}
                    type="number"
                    fullWidth
                    value={localSport.roundRobinSettings?.losePoints ?? 0}
                    onChange={(e) => handleRoundRobinSettingsUpdate('losePoints', parseInt(e.target.value) || 0)}
                    InputProps={{ inputProps: { min: 0 } }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>{t('roundRobin.considerLosePoints')}</InputLabel>
                    <Select
                      value={localSport.roundRobinSettings?.considerLosePoints ?? false}
                      onChange={(e) => handleRoundRobinSettingsUpdate('considerLosePoints', e.target.value === 'true')}
                    >
                      <MenuItem value="true">{t('common.yes')}</MenuItem>
                      <MenuItem value="false">{t('common.no')}</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>{t('roundRobin.rankingMethod')}</InputLabel>
                    <Select
                      value={localSport.roundRobinSettings?.rankingMethod || 'points'}
                      onChange={(e) => handleRoundRobinSettingsUpdate('rankingMethod', e.target.value as 'points' | 'goalDifference' | 'goals')}
                    >
                      <MenuItem value="points">{t('roundRobin.rankByPoints')}</MenuItem>
                      <MenuItem value="goalDifference">{t('roundRobin.rankByGoalDiff')}</MenuItem>
                      <MenuItem value="goals">{t('roundRobin.rankByGoals')}</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    label={t('roundRobin.displayRankCount')}
                    type="number"
                    fullWidth
                    value={localSport.roundRobinSettings?.displayRankCount || 3}
                    onChange={(e) => {
                      const value = Math.min(Math.max(parseInt(e.target.value) || 3, 3), 6);
                      setLocalSport(prev => ({
                        ...prev!,
                        roundRobinSettings: {
                          ...prev!.roundRobinSettings || {},
                          displayRankCount: value
                        }
                      }));
                    }}
                    InputProps={{ inputProps: { min: 3, max: 6 } }}
                  />
                </Grid>
              </Grid>
            )}


            <Box sx={{ mt: 4 }}>
              <Typography variant="h6" color="error" gutterBottom>
                {t('sport.dangerZone')}
              </Typography>
              <Divider sx={{ mb: 3 }} />
              
              <Box sx={{ bgcolor: alpha('#f44336', 0.05), p: 3, borderRadius: 1 }}>
                <Typography variant="subtitle1" gutterBottom>
                  {t('sport.deleteSport')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {t('sport.deleteSportWarning')}
                </Typography>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  {t('sport.deleteSportButton')}
                </Button>
              </Box>
            </Box>
          </Paper>
        </TabPanel>

        <DeleteConfirmationDialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          onConfirm={handleDelete}
          title={t('sport.deleteConfirmTitle')}
          itemName={localSport?.name || ''}
          type="sport"
        />

        {/* 最後の同期情報 */}
        {lastEditor && (
          <Typography 
            variant="caption" 
            sx={{ 
              position: 'fixed',
              bottom: 16,
              right: 16,
              bgcolor: 'background.paper',
              p: 1,
              borderRadius: 1,
              boxShadow: 1
            }}
          >
            {t('sport.lastSync')}: {lastSynced.toLocaleTimeString()}
          </Typography>
        )}
      </Container>
    </AdminLayout>
  );
};

export default SportEditPage;
