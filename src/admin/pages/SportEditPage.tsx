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
  SportsSoccer as SportIcon,
  People as PeopleIcon,
  Notes as NotesIcon,
  Settings as SettingsIcon,
  Schedule as ScheduleIcon,  // 追加
  Sync as SyncIcon,
  Image as ImageIcon, // 画像アイコンを追加
  Leaderboard as LeaderboardIcon, // 追加
} from '@mui/icons-material';
import { getSportTypeLabel } from '../../utils/labels';
import { useDatabase } from '../../hooks/useDatabase';
import { Sport, Team, Event } from '../../types';
import TournamentScoring from '../../common/TournamentScoring';
import RoundRobinScoring from '../components/scoring/RoundRobinScoring';
//import CustomScoring from '../../components/admin/scoring/CustomScoring';
import RosterEditor from '../components/RosterEditor';
import { useThemeContext } from '../../contexts/ThemeContext';
import DeleteConfirmationDialog from '../components/dialogs/DeleteConfirmationDialog';
import { useAdminLayout } from '../context/AdminLayoutContext';
import { useAuth } from '../../contexts/AuthContext';
import { TabContent } from '../components/TabContent';
import ScheduleTab from '../components/scheduling/ScheduleTab';  // 追加


// フィールドとタブの関連付けを定義
const fieldToTabMap: Record<keyof Sport, string> = {
  name: 'details',
  description: 'details',
  operationsNote: 'note',
  tournamentSettings: 'settings',
  roundRobinSettings: 'settings',
  roster: 'roster',
  scheduleSettings: 'schedule',  // 追加
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
        <Box sx={{ pt: 1.5 }}>
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
  const navigate = useNavigate();
  const theme = useTheme();
  const { alpha } = useThemeContext();
  const { save, registerSaveHandler, unregisterSaveHandler, showSnackbar: showAdminSnackbar, setHasUnsavedChanges } = useAdminLayout();
  const isProcessingRef = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { currentUser } = useAuth();
  
  const { data: sport, loading: sportLoading, updateData, removeData } = useDatabase<Sport>(`/sports/${sportId}`);
  const { data: events, loading: eventsLoading } = useDatabase<Record<string, Event>>('/events');
  
  const [activeTab, setActiveTab] = useState(0);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [localSport, setLocalSport] = useState<Sport | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false); // ダイアログの状態を追加

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

  // sportIdが変更されたときにlocalSportをリセット - この部分を修正
  useEffect(() => {
    // sportIdが変更されたら、すべての状態をリセット
    setLocalSport(null);
    setActiveTab(0); // タブを最初のタブにリセット
    
    // タブの状態もリセット
    setTabStates({
      details: { 
        isLoaded: true, 
        isDirty: false, 
        lastUpdated: 0,
        loading: false,
        hasChanges: false 
      },
      roster: { 
        isLoaded: false, 
        isDirty: false, 
        lastUpdated: 0,
        loading: false,
        hasChanges: false 
      },
      schedule: {
        isLoaded: false, 
        isDirty: false, 
        lastUpdated: 0,
        loading: false,
        hasChanges: false 
      },
      note: { 
        isLoaded: false, 
        isDirty: false, 
        lastUpdated: 0,
        loading: false,
        hasChanges: false 
      },
      settings: { 
        isLoaded: false, 
        isDirty: false, 
        lastUpdated: 0,
        loading: false,
        hasChanges: false 
      }
    });
    
    // 差分状態もリセット
    setDifferences({});
    
    // sportがロードされたらlocalSportを設定
    if (sport) {
      setLocalSport(JSON.parse(JSON.stringify(sport)));
    }
  }, [sportId]);

  // sport変更時のlocalSport更新ロジックを修正
  useEffect(() => {
    // sportが変更され、かつlocalSportがnullか
    // または後続処理で使うときにsportIdが変わったことをチェック
    if (sport && (!localSport || localSport.id !== sport.id)) {
      setLocalSport(JSON.parse(JSON.stringify(sport)));
    }
  }, [sport, localSport]);

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

  // 実際の書き込み処理。AdminLayoutContextにscope登録し、保存の唯一の実行経路にする
  const handleSave = useCallback(async (): Promise<boolean> => {
    if (!localSport || isProcessingRef.current) return false;

    isProcessingRef.current = true;
    setUpdating(true); // ローディング画面を表示しないフラグ

    try {
      return await updateData(localSport);
    } catch (error) {
      console.error('Error saving sport:', error);
      return false;
    } finally {
      isProcessingRef.current = false;
      setUpdating(false);
    }
  }, [localSport, updateData]);

  useEffect(() => {
    registerSaveHandler(handleSave, `sport_${sportId}`);

    return () => {
      unregisterSaveHandler(`sport_${sportId}`);
    };
  }, [registerSaveHandler, unregisterSaveHandler, handleSave, sportId]);

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
    schedule: {  // 追加
      isLoaded: true, 
      isDirty: false, 
      lastUpdated: 0,
      loading: false,
      hasChanges: false 
    },
    note: { 
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

  // タブ切り替えハンドラ（保存は行わない。保存はデバウンス自動保存/保存ボタンに一本化）
  const handleTabChange = useCallback((event: React.SyntheticEvent, newValue: number) => {
    const tabName = ['details', 'schedule', 'roster', 'note', 'settings'][newValue];
    setActiveTab(newValue);

    if (!tabStates[tabName].isLoaded) {
      setTabStates(prev => ({
        ...prev,
        [tabName]: { ...prev[tabName], isLoaded: true }
      }));
    }
  }, [tabStates]);

  // デバウンス自動保存（全フィールド共通）
  const scheduleAutoSave = useCallback((tabName?: string) => {
    setHasUnsavedChanges(true);

    if (tabName) {
      setTabStates(prev => ({
        ...prev,
        [tabName]: { ...prev[tabName], isDirty: true, lastUpdated: Date.now() }
      }));
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(async () => {
      const success = await save(`sport_${sportId}`);
      if (success && tabName) {
        setTabStates(prev => ({
          ...prev,
          [tabName]: { ...prev[tabName], isDirty: false }
        }));
      }
    }, 800);
  }, [save, sportId, setHasUnsavedChanges]);

  // 単一フィールドの更新（楽観的UI更新 + デバウンス自動保存）
  const handlePartialUpdate = useCallback((field: keyof Sport, value: any) => {
    if (!localSport) return;

    setLocalSport({
      ...localSport,
      [field]: value,
      lastEditedBy: currentUser?.email || undefined,
      lastEditedAt: new Date().toISOString()
    });

    scheduleAutoSave(getTabNameForField(field));
  }, [localSport, currentUser, scheduleAutoSave]);

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

  // スポーツデータの更新ハンドラ（子コンポーネントから呼ばれる。デバウンス自動保存）
  const handleSportUpdate = useCallback((updatedSport: Sport) => {
    setLocalSport({
      ...updatedSport,
      lastEditedBy: currentUser?.email || undefined,
      lastEditedAt: new Date().toISOString()
    });
    scheduleAutoSave();
  }, [currentUser, scheduleAutoSave]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    if (name) {
      handlePartialUpdate(name as keyof Sport, value);
    }
  };

  // イベント名を取得する関数
  const getEventName = (eventId: string) => {
    return events && events[eventId] ? events[eventId].name : "不明なイベント";
  };

  const handleSettingsChange = (key: string, value: boolean) => {
    if (!localSport) return;
    const tournamentSettings = localSport.tournamentSettings || {
      hasThirdPlaceMatch: false,
      hasRepechage: false
    };
    handlePartialUpdate('tournamentSettings', { ...tournamentSettings, [key]: value });
  };

  const handleRoundRobinSettingsUpdate = (
    key: keyof Required<Sport>['roundRobinSettings'],
    value: number | boolean | 'points' | 'goalDifference' | 'goals'
  ) => {
    if (!localSport) return;
    const defaultSettings: Required<Sport>['roundRobinSettings'] = {
      winPoints: 3,
      drawPoints: 1,
      losePoints: 0,
      considerLosePoints: false,
      rankingMethod: 'points',
      displayRankCount: 3
    };
    handlePartialUpdate('roundRobinSettings', {
      ...defaultSettings,
      ...(localSport.roundRobinSettings || {}),
      [key]: value
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
    ['name', 'description', 'operationsNote'].forEach(field => {
      if (local[field] !== remote[field]) {
        diffs[field] = {
          local: local[field],
          remote: remote[field]
        };
      }
    });
    
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
      // 同じスポーツのデータを比較していることを確認
      if (sport.id === localSport.id) {
        const hasChanges = detectChanges(localSport, sport);
        
        if (hasChanges && sport.lastEditedBy !== currentUser?.email) {
          setLastEditor(sport.lastEditedBy || 'unknown');
          showAdminSnackbar(
            "リモートの変更を検出しました",
            'warning'
          );
        }
      }
    }
  }, [sport, localSport, currentUser, showAdminSnackbar, detectChanges]);

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
      showAdminSnackbar("同期成功", 'success');
      
    } catch (error) {
      console.error('Sync error:', error);
      showAdminSnackbar("同期エラー", 'error');
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
          {"リモートの値"}:
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
          {"リモートの値を使用"}
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
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '80vh' 
      }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          {"競技の編集ページを読み込み中..."}
        </Typography>
      </Box>
    );
  }

  if (sportLoading || eventsLoading) {
    if (!updating) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
          <CircularProgress />
        </Box>
      );
    }
  }

  if (!sport || !localSport) {
    return (
      <Box sx={{ textAlign: 'center', my: 8 }}>
        <Typography variant="h5">
          {"競技が見つかりません"}
        </Typography>
        <Button sx={{ mt: 2 }} variant="contained" onClick={() => navigate('/admin')}>
          {"管理画面に戻る"}
        </Button>
      </Box>
    );
  }

  // 設定タブ内に追加する写真選択コンポーネント
  const SportImageSelector: React.FC<{
    value: string;
    onChange: (value: string) => void;
  }> = ({ value, onChange }) => {
    const [images, setImages] = useState<string[]>([
      '/assets/dodge-ball.png',
      '/assets/female-badminton.jpeg',
      '/assets/female-basketball.jpeg',
      '/assets/female-track-relay.jpeg',
      '/assets/male-badminton.jpeg',
      '/assets/male-basketball.png',
      '/assets/male-track-relay.jpeg',
      '/assets/soccer.jpeg',
      '/assets/騎馬戦.jpeg',
      '/assets/female-valleyball.jpeg',
      '/assets/male-valleyball.jpeg',
      '/assets/soft-ball.jpeg'
    ]);

    const getFileName = (path: string) => {
      return path.split('/').pop() || path;
    };

    return (
      <Box sx={{ width: '100%' }}>
        <FormControl fullWidth>
          <InputLabel>{"カバー画像"}</InputLabel>
          <Select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ImageIcon />
                {getFileName(selected)}
              </Box>
            )}
          >
            <MenuItem value="">
              <em>{"なし"}</em>
            </MenuItem>
            {images.map((image) => (
              <MenuItem key={image} value={image}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    component="img"
                    src={image}
                    sx={{ width: 60, height: 40, objectFit: 'cover', borderRadius: 1 }}
                  />
                  {getFileName(image)}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    );
  };

  return (
    <Container maxWidth={false} disableGutters>
        <Box sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
          <IconButton onClick={() => navigate('/admin')} aria-label="back" sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" component="h1">
            {localSport.name}
          </Typography>
          <Chip
            label={getSportTypeLabel(localSport.type)}
            color="primary"
            size="small"
            sx={{ ml: 2 }}
          />
        </Box>

        <Paper elevation={0} square sx={{ mb: 1, bgcolor: 'transparent', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="sport management tabs"
          >
            <Tab icon={<SportIcon />} label={"ホーム"} />
            <Tab icon={<ScheduleIcon />} label={"スケジュール"} />  {/* 追加 */}
            <Tab icon={<PeopleIcon />} label={"名簿"} />
            <Tab icon={<NotesIcon />} label={"運営側メモ"} />
            <Tab icon={<SettingsIcon />} label={"設定"} />
          </Tabs>
        </Paper>

        {/* ホームタブ */}
        <TabPanel value={activeTab} index={0}>
          <Box>
            {/* スコア管理ボタン - 上部に移動 */}
            <Paper sx={{ p: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h6">
                  {"スコア管理"}
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => navigate(`/admin/scoring/${sportId}`)}
                  startIcon={<SportIcon />}
                  size="large"
                >
                  {"スコア管理"}
                </Button>
              </Box>
            </Paper>

            {/* 遅延時間入力欄を追加 */}
            <Paper sx={{ p: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="h6">
                  遅延時間
                </Typography>
                <TextField
                  type="number"
                  name="delayMinutes"
                  label="遅延時間（分）"
                  value={localSport.delayMinutes ?? 0}
                  onChange={e => {
                    const value = Math.max(0, parseInt(e.target.value) || 0);
                    handlePartialUpdate('delayMinutes', value);
                  }}
                  InputProps={{ inputProps: { min: 0 } }}
                  sx={{ width: 120 }}
                />
                <Typography variant="body2" color="text.secondary">
                  分
                </Typography>
              </Box>
              <Box sx={{ mt: 1 }}>
                <DifferenceIndicator field="delayMinutes" />
              </Box>
            </Paper>

            <Grid container spacing={2}>
              {/* 既存の詳細情報セクション */}
              <Grid item xs={12}>
                <Paper sx={{ p: 2, mb: 2, height: '100%' }}>
                  <Typography variant="h6" gutterBottom>
                    {"基本情報"}
                  </Typography>
                  <Divider sx={{ mb: 3 }} />
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        name="name"
                        label={"競技名"}
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
                        label={"この競技の行事"}
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
                        label={"説明"}
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
            </Grid>
          </Box>
        </TabPanel>

        {/* スケジュールタブ (新しく追加) */}
        <TabPanel value={activeTab} index={1}>
          <Paper sx={{ p: 3 }}>
            <ScheduleTab sport={localSport} onUpdate={handleSportUpdate} />
          </Paper>
        </TabPanel>

        {/* 競技・名簿登録タブ */}
        <TabPanel value={activeTab} index={2}>
          <Paper sx={{ p: 3 }}>
            
            <RosterEditor 
              sport={localSport} 
              onUpdate={handleSportUpdate} 
            />
          </Paper>
        </TabPanel>

        {/* 運営側メモタブ */}
        <TabPanel value={activeTab} index={3}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              {"運営側メモ"}
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <TextField
              name="operationsNote"
              label={"運営側メモ"}
              fullWidth
              multiline
              rows={12}
              value={localSport.operationsNote || ''}
              onChange={handleInputChange}
              variant="outlined"
              placeholder="運営に必要な情報を入力"
            />
            <DifferenceIndicator field="operationsNote" />
          </Paper>
        </TabPanel>

        {/* 設定タブ */}
        <TabPanel value={activeTab} index={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              {"設定"}
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            {/* 写真設定を追加 */}
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  {"表示設定"}
                </Typography>
                <SportImageSelector
                  value={localSport.coverImageUrl || ''}
                  onChange={(value) => handlePartialUpdate('coverImageUrl', value)}
                />
                {localSport.coverImageUrl && (
                  <Box sx={{ mt: 2, p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                    <Typography variant="caption" display="block" gutterBottom>
                      {"プレビュー"}:
                    </Typography>
                    <Box
                      component="img"
                      src={localSport.coverImageUrl}
                      alt={localSport.name}
                      sx={{
                        width: '100%',
                        height: 200,
                        objectFit: 'cover',
                        borderRadius: 1
                      }}
                    />
                  </Box>
                )}
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />
            
            {localSport.type === 'tournament' && (
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>{"3位決定戦あり"}</InputLabel>
                    <Select
                      value={localSport.tournamentSettings?.hasThirdPlaceMatch ? "true" : "false"}
                      onChange={(e) => handleSettingsChange('hasThirdPlaceMatch', e.target.value === 'true')}
                    >
                      <MenuItem value="true">{"はい"}</MenuItem>
                      <MenuItem value="false">{"いいえ"}</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>{"敗者復活戦あり"}</InputLabel>
                    <Select
                      value={localSport.tournamentSettings?.hasRepechage ? "true" : "false"}
                      onChange={(e) => handleSettingsChange('hasRepechage', e.target.value === 'true')}
                    >
                      <MenuItem value="true">{"はい"}</MenuItem>
                      <MenuItem value="false">{"いいえ"}</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            )}
            
            {localSport.type === 'roundRobin' && (
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label={"勝利ポイント"}
                    type="number"
                    fullWidth
                    value={localSport.roundRobinSettings?.winPoints ?? 3}
                    onChange={(e) => handleRoundRobinSettingsUpdate('winPoints', parseInt(e.target.value) || 0)}
                    InputProps={{ inputProps: { min: 0 } }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label={"引き分けポイント"}
                    type="number"
                    fullWidth
                    value={localSport.roundRobinSettings?.drawPoints ?? 1}
                    onChange={(e) => handleRoundRobinSettingsUpdate('drawPoints', parseInt(e.target.value) || 0)}
                    InputProps={{ inputProps: { min: 0 } }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label={"敗戦ポイント"}
                    type="number"
                    fullWidth
                    value={localSport.roundRobinSettings?.losePoints ?? 0}
                    onChange={(e) => handleRoundRobinSettingsUpdate('losePoints', parseInt(e.target.value) || 0)}
                    InputProps={{ inputProps: { min: 0 } }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>{"敗戦ポイントを考慮"}</InputLabel>
                    <Select
                      value={localSport.roundRobinSettings?.considerLosePoints ?? false}
                      onChange={(e) => handleRoundRobinSettingsUpdate('considerLosePoints', e.target.value === 'true')}
                    >
                      <MenuItem value="true">{"はい"}</MenuItem>
                      <MenuItem value="false">{"いいえ"}</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>{"順位決定方式"}</InputLabel>
                    <Select
                      value={localSport.roundRobinSettings?.rankingMethod || 'points'}
                      onChange={(e) => handleRoundRobinSettingsUpdate('rankingMethod', e.target.value as 'points' | 'goalDifference' | 'goals')}
                    >
                      <MenuItem value="points">{"勝ち点方式"}</MenuItem>
                      <MenuItem value="goalDifference">{"得失点差方式"}</MenuItem>
                      <MenuItem value="goals">{"得点方式"}</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    label={"表示順位数"}
                    type="number"
                    fullWidth
                    value={localSport.roundRobinSettings?.displayRankCount || 3}
                    onChange={(e) => {
                      const value = Math.min(Math.max(parseInt(e.target.value) || 3, 3), 6);
                      handleRoundRobinSettingsUpdate('displayRankCount', value);
                    }}
                    InputProps={{ inputProps: { min: 3, max: 6 } }}
                  />
                </Grid>
              </Grid>
            )}


            <Box sx={{ mt: 4 }}>
              <Typography variant="h6" color="error" gutterBottom>
                {"危険な操作"}
              </Typography>
              <Divider sx={{ mb: 3 }} />
              
              <Box sx={{ bgcolor: alpha('#f44336', 0.05), p: 3, borderRadius: 1 }}>
                <Typography variant="subtitle1" gutterBottom>
                  {"競技を削除"}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {"この操作は取り消せません"}
                </Typography>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  {"競技を完全に削除"}
                </Button>
              </Box>
            </Box>
          </Paper>
        </TabPanel>

        

        <DeleteConfirmationDialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          onConfirm={handleDelete}
          title={"競技の削除確認"}
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
            {"最終同期"}: {lastSynced.toLocaleTimeString()}
          </Typography>
        )}
    </Container>
  );
};

export default SportEditPage;
