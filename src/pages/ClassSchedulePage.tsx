import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  Divider,
  Button,
  Link,
  Breadcrumbs,
  Stack,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Home as HomeIcon,
  Schedule as ScheduleIcon,
  ArrowBack as ArrowBackIcon,
  Share as ShareIcon,
  Print as PrintIcon,
  Refresh as RefreshIcon,
  StarBorder as FavoriteIcon,
  Help as HelpIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useDatabase } from '../hooks/useDatabase';
import { Event, Sport } from '../types';
import ClassSelector from '../components/schedule/ClassSelector';
import ClassScheduleTimeline from '../components/schedule/ClassScheduleTimeline';
import { useClassSchedule } from '../hooks/useClassSchedule';

const ClassSchedulePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // データ取得
  const { data: events, loading: eventsLoading } = useDatabase<Record<string, Event>>('/events');
  const { data: sports, loading: sportsLoading } = useDatabase<Record<string, Sport>>('/sports');
  
  // デバッグ情報の追加
  useEffect(() => {
    if (sports) {
      console.log("Loaded sports:", Object.values(sports).length);
      // スケジュールが設定されているスポーツの確認
      const sportsWithSchedule = Object.values(sports).filter(
        sport => sport.scheduleSettings?.timeSlots && sport.scheduleSettings.timeSlots.length > 0
      );
      console.log("Sports with schedule:", sportsWithSchedule.length);
      
      sportsWithSchedule.forEach(sport => {
        console.log(`${sport.name}: ${sport.scheduleSettings?.timeSlots?.length} time slots`);
      });
    }
  }, [sports]);
  
  // 状態管理
  const [activeEvent, setActiveEvent] = useState<Event | null>(null);
  const [activeSports, setActiveSports] = useState<Sport[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  
  // URLからクラス情報を取得（初期値設定用）
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const classParam = searchParams.get('classes');
    if (classParam) {
      setSelectedClasses(classParam.split(','));
    }
  }, []);
  
  // アクティブなイベントと関連競技を取得
  useEffect(() => {
    if (events && sports) {
      // アクティブなイベントを見つける
      const activeEventObj = Object.values(events).find(event => event.isActive);
      if (activeEventObj) {
        setActiveEvent(activeEventObj);
        
        // アクティブなイベントに関連する競技を設定
        const relatedSports = Object.values(sports).filter(
          sport => sport.eventId === activeEventObj.id
        );
        setActiveSports(relatedSports);
      }
    }
  }, [events, sports]);
  
  // クラス選択ハンドラー
  const handleClassSelect = (classId: string) => {
    if (classId === 'clear-all') {
      // 全クラス選択解除
      setSelectedClasses([]);
      updateUrlParam([]);
      return;
    }
    
    if (classId === 'select-all') {
      // 全クラス選択
      if (!activeEvent?.roster) return;
      
      const allClasses = [
        ...(activeEvent.roster.grade1 ? Object.keys(activeEvent.roster.grade1) : []),
        ...(activeEvent.roster.grade2 ? Object.keys(activeEvent.roster.grade2) : []),
        ...(activeEvent.roster.grade3 ? Object.keys(activeEvent.roster.grade3) : [])
      ];
      
      setSelectedClasses(allClasses);
      updateUrlParam(allClasses);
      return;
    }
    
    // 個別クラスの選択切り替え
    setSelectedClasses(prev => {
      const isSelected = prev.includes(classId);
      const newSelection = isSelected
        ? prev.filter(id => id !== classId)
        : [...prev, classId];
      
      updateUrlParam(newSelection);
      return newSelection;
    });
  };
  
  // URLクエリパラメータの更新
  const updateUrlParam = (classes: string[]) => {
    const url = new URL(window.location.href);
    if (classes.length > 0) {
      url.searchParams.set('classes', classes.join(','));
    } else {
      url.searchParams.delete('classes');
    }
    window.history.replaceState({}, '', url.toString());
  };
  
  // 選択されたクラスに関連するスケジュールを取得
  const scheduleEntries = useClassSchedule(activeSports, activeEvent, selectedClasses);
  
  // デバッグ情報の追加
  useEffect(() => {
    console.log("Active sports:", activeSports.length);
    console.log("Selected classes:", selectedClasses);
    console.log("Schedule entries:", scheduleEntries.length);
  }, [activeSports, selectedClasses, scheduleEntries]);
  
  // 共有機能
  const handleShare = async () => {
    try {
      const url = new URL(window.location.href);
      if (selectedClasses.length > 0) {
        url.searchParams.set('classes', selectedClasses.join(','));
      }
      
      if (navigator.share) {
        await navigator.share({
          title: t('classSchedule.shareTitle'),
          text: t('classSchedule.shareText'),
          url: url.toString()
        });
      } else {
        // クリップボードにコピー
        await navigator.clipboard.writeText(url.toString());
        alert(t('common.copiedToClipboard'));
      }
    } catch (error) {
      console.error('共有エラー:', error);
    }
  };
  
  // 印刷機能
  const handlePrint = () => {
    window.print();
  };
  
  if (eventsLoading || sportsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (!activeEvent) {
    return (
      <Container maxWidth="lg">
        <Alert severity="info" sx={{ mt: 4 }}>
          {t('classSchedule.noActiveEvent')}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 2 }}>
      {/* パンくずリスト */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link 
          component={RouterLink} 
          to="/" 
          color="inherit" 
          sx={{ display: 'flex', alignItems: 'center' }}
        >
          <HomeIcon sx={{ mr: 0.5 }} fontSize="small" />
          {t('common.home')}
        </Link>
        <Typography color="text.primary" sx={{ display: 'flex', alignItems: 'center' }}>
          <ScheduleIcon sx={{ mr: 0.5 }} fontSize="small" />
          {t('classSchedule.title')}
        </Typography>
      </Breadcrumbs>

      {/* ページタイトル */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {t('classSchedule.title')}
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          {activeEvent.name}
        </Typography>
        <Divider sx={{ my: 2 }} />
      </Box>
      
      {/* アクションボタン */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack 
          direction={isMobile ? 'column' : 'row'} 
          spacing={1}
          divider={!isMobile ? <Divider orientation="vertical" flexItem /> : undefined}
          alignItems="center"
        >
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/')}
            sx={{ minWidth: '120px' }}
          >
            {t('common.back')}
          </Button>
          
          <Button
            startIcon={<ShareIcon />}
            onClick={handleShare}
            color="primary"
            sx={{ minWidth: '120px' }}
          >
            {t('common.share')}
          </Button>
          
          <Button
            startIcon={<PrintIcon />}
            onClick={handlePrint}
            sx={{ minWidth: '120px' }}
          >
            {t('common.print')}
          </Button>
          
          <Button
            startIcon={<RefreshIcon />}
            onClick={() => window.location.reload()}
            sx={{ minWidth: '120px' }}
          >
            {t('common.refresh')}
          </Button>
        </Stack>
      </Paper>
      
      {/* クラス選択 */}
      <ClassSelector 
        activeEvent={activeEvent}
        selectedClasses={selectedClasses}
        onClassSelect={handleClassSelect}
      />
      
      {/* スケジュール表示 */}
      {scheduleEntries.length > 0 ? (
        <ClassScheduleTimeline 
          scheduleEntries={scheduleEntries}
          selectedClasses={selectedClasses}
        />
      ) : (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <HelpIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            {selectedClasses.length > 0 
              ? t('classSchedule.noMatchingSchedule') 
              : t('classSchedule.selectClassesToView')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {selectedClasses.length > 0 
              ? t('classSchedule.trySelectingDifferentClasses')
              : t('classSchedule.classSelectionHint')}
          </Typography>
          
          {/* デバッグ情報（開発時のみ表示） */}
          {process.env.NODE_ENV === 'development' && (
            <Box sx={{ mt: 3, p: 2, border: '1px dashed', borderColor: 'divider' }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                デバッグ情報:
              </Typography>
              <Typography variant="caption" component="div" sx={{ textAlign: 'left' }}>
                - アクティブスポーツ: {activeSports.length}件<br />
                - 選択クラス: {selectedClasses.join(', ') || '未選択'}<br />
                - 予定エントリ: {scheduleEntries.length}件
              </Typography>
            </Box>
          )}
        </Paper>
      )}
      
      {/* 注意書き */}
      <Paper sx={{ p: 2, mt: 4, bgcolor: theme.palette.grey[50] }}>
        <Typography variant="subtitle2" gutterBottom>
          {t('classSchedule.notes')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('classSchedule.scheduleMayChange')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {t('classSchedule.potentialMatchExplanation')}
        </Typography>
      </Paper>
    </Container>
  );
};

export default ClassSchedulePage;
