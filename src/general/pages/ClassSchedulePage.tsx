import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  Link,
  Breadcrumbs,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Home as HomeIcon,
  Schedule as ScheduleIcon,
  ArrowBack as ArrowBackIcon,
  Share as ShareIcon,
  Print as PrintIcon,
  Refresh as RefreshIcon,
  Help as HelpIcon
} from '@mui/icons-material';
import { useNavigate, Link as RouterLink } from 'react-router';
import { useDatabase } from '../../hooks/useDatabase';
import { Event, Sport } from '../../types';
import ClassSelector from '../components/schedule/ClassSelector';
import ClassScheduleTimeline from '../components/schedule/ClassScheduleTimeline';
import { useClassSchedule } from '../../hooks/useClassSchedule';

const ClassSchedulePage: React.FC = () => {
  const navigate = useNavigate();

  const { data: events, loading: eventsLoading } = useDatabase<Record<string, Event>>('/events');
  const { data: sports, loading: sportsLoading } = useDatabase<Record<string, Sport>>('/sports');

  const [activeEvent, setActiveEvent] = useState<Event | null>(null);
  const [activeSports, setActiveSports] = useState<Sport[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const classParam = searchParams.get('classes');
    if (classParam) setSelectedClasses(classParam.split(','));
  }, []);

  useEffect(() => {
    if (!events || !sports) return;
    const activeEventObj = Object.values(events).find(event => event.isActive);
    if (!activeEventObj) return;
    setActiveEvent(activeEventObj);
    setActiveSports(Object.values(sports).filter(sport => sport.eventId === activeEventObj.id));
  }, [events, sports]);

  const updateUrlParam = (classes: string[]) => {
    const url = new URL(window.location.href);
    if (classes.length > 0) {
      url.searchParams.set('classes', classes.join(','));
    } else {
      url.searchParams.delete('classes');
    }
    window.history.replaceState({}, '', url.toString());
  };

  const handleClassSelect = (classId: string) => {
    if (classId === 'clear-all') {
      setSelectedClasses([]);
      updateUrlParam([]);
      return;
    }

    if (classId === 'select-all') {
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

    setSelectedClasses(prev => {
      const newSelection = prev.includes(classId) ? prev.filter(id => id !== classId) : [...prev, classId];
      updateUrlParam(newSelection);
      return newSelection;
    });
  };

  const scheduleEntries = useClassSchedule(activeSports, activeEvent, selectedClasses);

  const handleShare = async () => {
    const url = new URL(window.location.href);
    if (selectedClasses.length > 0) url.searchParams.set('classes', selectedClasses.join(','));

    if (navigator.share) {
      await navigator.share({ title: 'クラス別スケジュール', text: url.toString(), url: url.toString() });
    } else {
      await navigator.clipboard.writeText(url.toString());
    }
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
          現在アクティブな行事がありません
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 2, mb: 4 }}>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link component={RouterLink} to="/" color="inherit" sx={{ display: 'flex', alignItems: 'center' }}>
          <HomeIcon sx={{ mr: 0.5 }} fontSize="small" />
          ホーム
        </Link>
        <Typography
          sx={{
            color: "text.primary",
            display: 'flex',
            alignItems: 'center'
          }}>
          <ScheduleIcon sx={{ mr: 0.5 }} fontSize="small" />
          クラス別スケジュール
        </Typography>
      </Breadcrumbs>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            クラス別スケジュール
          </Typography>
          <Typography variant="subtitle1" sx={{
            color: "text.secondary"
          }}>
            {activeEvent.name}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="戻る">
            <IconButton onClick={() => navigate('/')}>
              <ArrowBackIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="共有">
            <IconButton onClick={handleShare} color="primary">
              <ShareIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="プリント">
            <IconButton onClick={() => window.print()}>
              <PrintIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="リフレッシュ">
            <IconButton onClick={() => window.location.reload()}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      <ClassSelector activeEvent={activeEvent} selectedClasses={selectedClasses} onClassSelect={handleClassSelect} />
      {scheduleEntries.length > 0 ? (
        <ClassScheduleTimeline scheduleEntries={scheduleEntries} selectedClasses={selectedClasses} />
      ) : (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <HelpIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            {selectedClasses.length > 0 ? '該当するスケジュールが見つかりません' : '表示するクラスを選択してください'}
          </Typography>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            {selectedClasses.length > 0 ? '他のクラスを選択してみてください' : '上記のクラス選択から、表示したいクラスを選んでください'}
          </Typography>
        </Paper>
      )}
      <Paper variant="outlined" sx={{ p: 2, mt: 3, bgcolor: 'action.hover' }}>
        <Typography variant="subtitle2" gutterBottom>
          注意事項
        </Typography>
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          スケジュールは変更される場合があります。最新情報をご確認ください。
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            mt: 0.5
          }}>
          ※「可能性」と表示されている試合は、組み合わせによって出場する可能性のある試合です。
        </Typography>
      </Paper>
    </Container>
  );
};

export default ClassSchedulePage;
