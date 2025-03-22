import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  AlertTitle,
  Divider,
  Chip,
  Button,
  IconButton,
  useTheme
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDatabase } from '../../hooks/useDatabase';
import { Event, Sport } from '../../types';
import TournamentScoring from '../../components/admin/scoring/TournamentScoring';
import RoundRobinScoring from '../../components/admin/scoring/RoundRobinScoring';
import LeagueScoring from '../../components/admin/scoring/LeagueScoring';
import RankingScoring from '../../components/admin/scoring/RankingScoring';
import { useAdminLayout } from '../../contexts/AdminLayoutContext';
import { 
  SportsSoccer as SportIcon, 
  Event as EventIcon,
  Settings as SettingsIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';

// タブパネルの型定義
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// タブパネルコンポーネント
const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`sport-tabpanel-${index}`}
      aria-labelledby={`sport-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const ScoringBoardPage: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const { registerSaveHandler, unregisterSaveHandler, save, showSnackbar, setHasUnsavedChanges } = useAdminLayout();
  
  // アクティブタブの状態
  const [activeTab, setActiveTab] = useState(0);
  
  // データ取得
  const { data: events, loading: eventsLoading } = useDatabase<Record<string, Event>>('/events');
  const { data: sports, loading: sportsLoading, updateData: updateSport } = useDatabase<Record<string, Sport>>('/sports');
  
  // ローカルでの変更を追跡する状態を追加
  const [localSports, setLocalSports] = useState<Sport[]>([]);
  const [modifiedSportIds, setModifiedSportIds] = useState<string[]>([]); // Set<string>の代わりに配列を使用
  
  // アクティブイベントとその競技を取得
  const activeEvent = useMemo(() => {
    if (!events) return null;
    return Object.values(events).find(event => event.isActive);
  }, [events]);
  
  // アクティブイベントの競技一覧
  const activeSports = useMemo(() => {
    if (!sports || !activeEvent) return [];
    return Object.values(sports)
      .filter(sport => sport.eventId === activeEvent.id)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [sports, activeEvent]);
  
  // スポーツデータが変更されたらローカル状態を更新
  useEffect(() => {
    if (sports && activeEvent) {
      const sportsList = Object.values(sports)
        .filter(sport => sport.eventId === activeEvent.id)
        .sort((a, b) => a.name.localeCompare(b.name));
      
      setLocalSports(sportsList);
    }
  }, [sports, activeEvent]);
  
  // タブ変更ハンドラー
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };
  
  // 競技更新ハンドラー - 大幅に改修
  const handleSportUpdate = useCallback(async (sportId: string, updatedSport: Sport) => {
    try {
      // ローカルの状態を更新
      setLocalSports(prev => 
        prev.map(sport => sport.id === sportId ? updatedSport : sport)
      );
      
      // 変更があったことをマーク
      setModifiedSportIds(prev => {
        if (!prev.includes(sportId)) {
          return [...prev, sportId]; // 配列に存在しない場合のみ追加
        }
        return prev;
      });
      
      // 未保存の変更があることを通知
      setHasUnsavedChanges(true);
      
      return true;
    } catch (error) {
      console.error('Failed to update sport:', error);
      return false;
    }
  }, [setHasUnsavedChanges]);
  
  // 保存ハンドラー登録 - 修正
  useEffect(() => {
    const handleSave = async () => {
      try {
        if (modifiedSportIds.length === 0) {
          return true; // 変更がない場合は成功扱い
        }
        
        // 変更された競技を保存
        for (const sportId of modifiedSportIds) {
          const sportToUpdate = localSports.find(s => s.id === sportId);
          if (sportToUpdate) {
            await updateSport(sportToUpdate);
          }
        }
        
        // 保存後にセットをクリア
        setModifiedSportIds([]);
        setHasUnsavedChanges(false);
        showSnackbar(t('admin.changesSaved'), 'success');
        
        return true;
      } catch (error) {
        console.error('Error saving sports:', error);
        showSnackbar(t('admin.saveError'), 'error');
        return false;
      }
    };
    
    registerSaveHandler(handleSave, 'scoringBoard');
    
    return () => {
      unregisterSaveHandler('scoringBoard');
    };
  }, [registerSaveHandler, unregisterSaveHandler, localSports, modifiedSportIds, updateSport, showSnackbar, t, setHasUnsavedChanges]);
  
  // ローディング中の表示
  if (eventsLoading || sportsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  // アクティブイベントがない場合
  if (!activeEvent) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Alert severity="info">
          <AlertTitle>{t('admin.noActiveEvent')}</AlertTitle>
          {t('admin.pleaseSetActiveEvent')}
        </Alert>
        <Button 
          variant="contained" 
          sx={{ mt: 3 }}
          onClick={() => navigate('/admin')}
          startIcon={<EventIcon />}
        >
          {t('admin.goToDashboard')}
        </Button>
      </Paper>
    );
  }
  
  // 競技がない場合
  if (activeSports.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Alert severity="info">
          <AlertTitle>{t('admin.noSportsInActiveEvent')}</AlertTitle>
          {t('admin.pleaseAddSports')}
        </Alert>
        <Button 
          variant="contained" 
          sx={{ mt: 3 }}
          onClick={() => navigate(`/admin/events/${activeEvent.id}`)}
          startIcon={<SportIcon />}
        >
          {t('admin.goToEventManagement')}
        </Button>
      </Paper>
    );
  }
  
  return (
    <Box>
      {/* ヘッダー */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton 
            sx={{ mr: 1 }} 
            onClick={() => navigate('/admin')}
            aria-label="back to dashboard"
          >
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h4">
              {t('admin.scoringBoard')}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              {activeEvent.name} - {new Date(activeEvent.date).toLocaleDateString()}
            </Typography>
          </Box>
        </Box>
        <Chip 
          icon={<EventIcon />} 
          label={t('event.active')} 
          color="success" 
          variant="outlined" 
        />
      </Box>
      
      {/* メインコンテンツ */}
      <Paper sx={{ mb: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
          >
            {activeSports.map((sport, index) => (
              <Tab 
                key={sport.id} 
                label={sport.name} 
                id={`sport-tab-${index}`}
                aria-controls={`sport-tabpanel-${index}`}
                icon={<SportIcon />}
                iconPosition="start"
              />
            ))}
          </Tabs>
        </Box>
        
        {/* タブパネル - 各競技のスコアリングを表示 */}
        {activeSports.map((sport, index) => (
          <TabPanel key={sport.id} value={activeTab} index={index}>
            <Box sx={{ p: { xs: 1, sm: 2 } }}>
              <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h5" gutterBottom>
                  {sport.name} - {t(`sports.${sport.type}`)}
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<SettingsIcon />}
                  onClick={() => navigate(`/admin/sports/${sport.id}`)}
                >
                  {t('admin.manageSport')}
                </Button>
              </Box>
              
              <Divider sx={{ mb: 3 }} />
              
              {/* スポーツタイプに合わせたスコアリングコンポーネント */}
              {sport.type === 'tournament' && (
                <TournamentScoring 
                  sport={sport} 
                  onUpdate={(updatedSport) => handleSportUpdate(sport.id, updatedSport)} 
                />
              )}
              {sport.type === 'roundRobin' && (
                <RoundRobinScoring 
                  sport={sport} 
                  onUpdate={(updatedSport) => handleSportUpdate(sport.id, updatedSport)}
                />
              )}
              {sport.type === 'league' && (
                <LeagueScoring 
                  sport={sport} 
                  onUpdate={(updatedSport) => handleSportUpdate(sport.id, updatedSport)}
                />
              )}
              {sport.type === 'ranking' && (
                <RankingScoring 
                  sport={sport} 
                  onUpdate={(updatedSport) => handleSportUpdate(sport.id, updatedSport)}
                />
              )}
            </Box>
          </TabPanel>
        ))}
      </Paper>
      
      {/* 説明文 */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          {t('admin.howToUse')}
        </Typography>
        <Typography paragraph>
          {t('admin.scoringBoardDescription')}
        </Typography>
        <Alert severity="info" sx={{ mt: 2 }}>
          {t('admin.autoSaveEnabled')}
        </Alert>
      </Paper>
    </Box>
  );
};

export default ScoringBoardPage;
