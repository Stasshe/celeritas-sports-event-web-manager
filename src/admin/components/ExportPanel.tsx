import React, { useState } from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Button, 
  FormControl, 
  FormControlLabel, 
  Checkbox, 
  RadioGroup, 
  Radio, 
  TextField, 
  CircularProgress, 
  Paper, 
  Grid, 
  Divider, 
  Alert, 
  useTheme,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import { 
  GetApp as DownloadIcon,
  Event as EventIcon,
  SportsSoccer as SportIcon,
  ExpandMore as ExpandMoreIcon,
  ContentCopy as ContentCopyIcon,
  BugReport as BugReportIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useDatabase } from '../../hooks/useDatabase';
import { Event, Sport } from '../../types';
import { exportToExcel, ExportError, ERROR_CODES } from '../../utils/export/ExportManager';
import { useThemeContext } from '../../contexts/ThemeContext';

const ExportPanel: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { alpha } = useThemeContext();
  
  // 詳細エラー表示の状態
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  
  // Fetch data
  const { data: events, loading: eventsLoading } = useDatabase<Record<string, Event>>('/events');
  const { data: sports, loading: sportsLoading } = useDatabase<Record<string, Sport>>('/sports');
  
  // Export options state
  const [exportOptions, setExportOptions] = useState({
    includeOverallWinners: true,
    includeIndividualEvents: true,
    selectedEventIds: [] as string[],
    selectedSportIds: [] as string[],
    exportScope: 'all', // 'all', 'selectedEvents', 'selectedSports'
    customFileName: '',
  });
  
  // Export status
  const [exportStatus, setExportStatus] = useState<{
    status: 'idle' | 'loading' | 'success' | 'error';
    message?: string;
    errorCode?: string;
    details?: string[];
    originalError?: string;
    context?: any;
  }>({ status: 'idle' });
  
  // Loading state
  const isLoading = eventsLoading || sportsLoading || exportStatus.status === 'loading';

  // エラーメッセージの処理を改善
  const getErrorMessage = (error: ExportError | Error): { 
    message: string; 
    details?: string[];
    originalError?: string;
    context?: any;
  } => {
    if (error instanceof ExportError) {
      return {
        message: error.message,
        details: error.details,
        originalError: error.originalError?.message,
        context: error.context
      };
    }
    
    // 一般的なエラーの場合
    return {
      message: '予期しないエラーが発生しました',
      details: [error.message],
      originalError: error.message
    };
  };
  
  // Handle export option changes
  const handleOptionChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    field: keyof typeof exportOptions
  ) => {
    const value = event.target.type === 'checkbox' 
      ? event.target.checked 
      : event.target.value;
    
    setExportOptions(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Handle event selection
  const handleEventSelectionChange = (eventId: string, checked: boolean) => {
    setExportOptions(prev => {
      if (checked) {
        return {
          ...prev,
          selectedEventIds: [...prev.selectedEventIds, eventId]
        };
      } else {
        return {
          ...prev,
          selectedEventIds: prev.selectedEventIds.filter(id => id !== eventId)
        };
      }
    });
  };
  
  // Handle sport selection
  const handleSportSelectionChange = (sportId: string, checked: boolean) => {
    setExportOptions(prev => {
      if (checked) {
        return {
          ...prev,
          selectedSportIds: [...prev.selectedSportIds, sportId]
        };
      } else {
        return {
          ...prev,
          selectedSportIds: prev.selectedSportIds.filter(id => id !== sportId) // Fix this line: eventId -> sportId
        };
      }
    });
  };
  
  // Handle export button click
  const handleExport = async () => {
    try {
      // データの存在チェック
      if (!events || !sports) {
        setExportStatus({
          status: 'error',
          message: 'エクスポートするデータが見つかりません',
          details: [
            'イベントデータ: ' + (events ? `${Object.keys(events).length}件` : '未読み込み'),
            'スポーツデータ: ' + (sports ? `${Object.keys(sports).length}件` : '未読み込み')
          ],
          errorCode: ERROR_CODES.NO_DATA
        });
        return;
      }

      // 選択範囲の検証
      if (exportOptions.exportScope === 'selectedEvents' && exportOptions.selectedEventIds.length === 0) {
        setExportStatus({
          status: 'error',
          message: 'エクスポートするイベントが選択されていません',
          details: ['少なくとも1つのイベントを選択してください'],
          errorCode: ERROR_CODES.NO_EVENTS_SELECTED
        });
        return;
      }

      if (exportOptions.exportScope === 'selectedSports' && exportOptions.selectedSportIds.length === 0) {
        setExportStatus({
          status: 'error',
          message: 'エクスポートする競技が選択されていません',
          details: ['少なくとも1つの競技を選択してください'],
          errorCode: ERROR_CODES.NO_SPORTS_SELECTED
        });
        return;
      }

      // コンテンツオプションの検証
      if (!exportOptions.includeOverallWinners && !exportOptions.includeIndividualEvents) {
        setExportStatus({
          status: 'error',
          message: 'エクスポートするコンテンツが選択されていません',
          details: [
            '総合優勝者または個別イベントのいずれかを選択してください',
            '現在の設定: 総合優勝者=' + (exportOptions.includeOverallWinners ? '有効' : '無効'),
            '現在の設定: 個別イベント=' + (exportOptions.includeIndividualEvents ? '有効' : '無効')
          ]
        });
        return;
      }
      
      setExportStatus({ status: 'loading' });
      
      // Prepare export options
      const fileName = exportOptions.customFileName 
        ? (exportOptions.customFileName.endsWith('.xlsx') 
            ? exportOptions.customFileName 
            : `${exportOptions.customFileName}.xlsx`)
        : 'sports-results.xlsx';
      
      interface ExportOptions {
        includeOverallWinners: boolean;
        includeIndividualEvents: boolean;
        fileName: string;
        eventIds?: string[];
        sportIds?: string[];
      }
      
      let finalOptions: ExportOptions = {
        includeOverallWinners: exportOptions.includeOverallWinners,
        includeIndividualEvents: exportOptions.includeIndividualEvents,
        fileName,
      };
      
      // Add event/sport filters based on scope
      if (exportOptions.exportScope === 'selectedEvents' && exportOptions.selectedEventIds.length > 0) {
        finalOptions = {
          ...finalOptions,
          eventIds: exportOptions.selectedEventIds,
        };
      } else if (exportOptions.exportScope === 'selectedSports' && exportOptions.selectedSportIds.length > 0) {
        finalOptions = {
          ...finalOptions,
          sportIds: exportOptions.selectedSportIds,
        };
      }
      
      // Execute export
      await exportToExcel(events, sports, finalOptions);
      
      setExportStatus({
        status: 'success',
        message: t('export.successMessage')
      });
      
      // Reset status after a delay
      setTimeout(() => {
        setExportStatus({ status: 'idle' });
      }, 5000);
      
    } catch (error) {
      console.error('Export error:', error);
      
      const errorInfo = getErrorMessage(error as ExportError | Error);
      setExportStatus({
        status: 'error',
        message: errorInfo.message,
        details: errorInfo.details,
        originalError: errorInfo.originalError,
        context: errorInfo.context,
        errorCode: error instanceof ExportError ? error.code : ERROR_CODES.UNKNOWN
      });

      // Reset status after a longer delay for errors
      setTimeout(() => {
        setExportStatus({ status: 'idle' });
      }, 15000); // エラーは15秒表示
    }
  };
  
  // Select all events
  const handleSelectAllEvents = (checked: boolean) => {
    if (checked && events) {
      setExportOptions(prev => ({
        ...prev,
        selectedEventIds: Object.keys(events)
      }));
    } else {
      setExportOptions(prev => ({
        ...prev,
        selectedEventIds: []
      }));
    }
  };
  
  // Select all sports
  const handleSelectAllSports = (checked: boolean) => {
    if (checked && sports) {
      setExportOptions(prev => ({
        ...prev,
        selectedSportIds: Object.keys(sports)
      }));
    } else {
      setExportOptions(prev => ({
        ...prev,
        selectedSportIds: []
      }));
    }
  };
  
  // Group sports by event
  const getSportsByEvent = (eventId: string): Sport[] => {
    if (!sports) return [];
    return Object.values(sports).filter(sport => sport.eventId === eventId);
  };
  
  // エラーログをクリップボードにコピーする関数
  const copyErrorToClipboard = () => {
    if (exportStatus.status === 'error') {
      const errorLog = [
        `エラー発生時刻: ${new Date().toLocaleString()}`,
        `エラーメッセージ: ${exportStatus.message}`,
        `エラーコード: ${exportStatus.errorCode || 'UNKNOWN'}`,
        '',
        '詳細ログ:',
        ...(exportStatus.details || []).map(detail => `- ${detail}`),
        '',
        exportStatus.originalError ? `元エラー: ${exportStatus.originalError}` : '',
        exportStatus.context ? `コンテキスト: ${JSON.stringify(exportStatus.context, null, 2)}` : '',
        '',
        `エクスポート設定:`,
        `- 総合優勝者を含む: ${exportOptions.includeOverallWinners}`,
        `- 個別イベントを含む: ${exportOptions.includeIndividualEvents}`,
        `- エクスポート範囲: ${exportOptions.exportScope}`,
        `- カスタムファイル名: ${exportOptions.customFileName || '(なし)'}`,
        `- 選択イベント数: ${exportOptions.selectedEventIds.length}`,
        `- 選択競技数: ${exportOptions.selectedSportIds.length}`,
        '',
        `ブラウザ情報: ${navigator.userAgent}`
      ].filter(Boolean).join('\n');

      navigator.clipboard.writeText(errorLog).then(() => {
        // コピー成功の通知（簡単なフィードバック）
        console.log('エラーログをクリップボードにコピーしました');
      });
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>
        {t('export.title')}
      </Typography>
      
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {t('export.instructions')}
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            {t('export.exportInstructions')}
          </Typography>
          
          {exportStatus.status === 'success' && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {exportStatus.message}
            </Alert>
          )}
          
          {exportStatus.status === 'error' && (
            <Alert 
              severity="error" 
              sx={{ mb: 2 }}
              action={
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Tooltip title="エラーログをクリップボードにコピー">
                    <IconButton 
                      color="inherit" 
                      size="small" 
                      onClick={copyErrorToClipboard}
                    >
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {(exportStatus.details || exportStatus.originalError || exportStatus.context) && (
                    <Button 
                      color="inherit" 
                      size="small" 
                      onClick={() => setShowErrorDetails(!showErrorDetails)}
                      startIcon={<BugReportIcon />}
                    >
                      {showErrorDetails ? '詳細を隠す' : '詳細を表示'}
                    </Button>
                  )}
                </Box>
              }
            >
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  {exportStatus.message}
                </Typography>
                {exportStatus.errorCode && (
                  <Chip 
                    label={`エラーコード: ${exportStatus.errorCode}`} 
                    size="small" 
                    variant="outlined" 
                    sx={{ mt: 1 }} 
                  />
                )}
              </Box>
              
              {showErrorDetails && (
                <Accordion sx={{ mt: 2, bgcolor: 'transparent' }} elevation={0}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle2">詳細エラーログ</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box sx={{ backgroundColor: alpha(theme.palette.error.main, 0.1), p: 2, borderRadius: 1 }}>
                      {exportStatus.details && exportStatus.details.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>処理詳細:</Typography>
                          {exportStatus.details.map((detail, index) => (
                            <Typography key={index} variant="body2" sx={{ fontFamily: 'monospace', mb: 0.5 }}>
                              • {detail}
                            </Typography>
                          ))}
                        </Box>
                      )}
                      
                      {exportStatus.originalError && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>元エラー:</Typography>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'error.dark' }}>
                            {exportStatus.originalError}
                          </Typography>
                        </Box>
                      )}
                      
                      {exportStatus.context && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>コンテキスト:</Typography>
                          <pre style={{ 
                            fontSize: '0.75rem', 
                            margin: 0, 
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word'
                          }}>
                            {JSON.stringify(exportStatus.context, null, 2)}
                          </pre>
                        </Box>
                      )}
                      
                      <Box>
                        <Typography variant="subtitle2" gutterBottom>エクスポート設定:</Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          総合優勝者: {exportOptions.includeOverallWinners ? '有効' : '無効'}<br />
                          個別イベント: {exportOptions.includeIndividualEvents ? '有効' : '無効'}<br />
                          範囲: {exportOptions.exportScope}<br />
                          選択イベント数: {exportOptions.selectedEventIds.length}<br />
                          選択競技数: {exportOptions.selectedSportIds.length}
                        </Typography>
                      </Box>
                    </Box>
                  </AccordionDetails>
                </Accordion>
              )}
            </Alert>
          )}
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="h6" gutterBottom>
            {t('export.exportOptions')}
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  {t('export.contentOptions')}
                </Typography>
                
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={exportOptions.includeOverallWinners}
                      onChange={(e) => handleOptionChange(e, 'includeOverallWinners')}
                    />
                  }
                  label={t('export.includeOverallWinners')}
                />
                
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={exportOptions.includeIndividualEvents}
                      onChange={(e) => handleOptionChange(e, 'includeIndividualEvents')}
                    />
                  }
                  label={t('export.includeIndividualEvents')}
                />
                
                <Box sx={{ mt: 2 }}>
                  <TextField
                    label={t('export.customFileName')}
                    value={exportOptions.customFileName}
                    onChange={(e) => handleOptionChange(e as any, 'customFileName')}
                    fullWidth
                    placeholder="sports-results.xlsx"
                    variant="outlined"
                    size="small"
                    helperText={t('export.fileNameHelp')}
                  />
                </Box>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  {t('export.exportScope')}
                </Typography>
                
                <FormControl component="fieldset">
                  <RadioGroup
                    value={exportOptions.exportScope}
                    onChange={(e) => handleOptionChange(e as any, 'exportScope')}
                  >
                    <FormControlLabel
                      value="all"
                      control={<Radio />}
                      label={t('export.allEvents')}
                    />
                    <FormControlLabel
                      value="selectedEvents"
                      control={<Radio />}
                      label={t('export.selectedEvents')}
                    />
                    <FormControlLabel
                      value="selectedSports"
                      control={<Radio />}
                      label={t('export.selectedSports')}
                    />
                  </RadioGroup>
                </FormControl>
              </Paper>
            </Grid>
          </Grid>
          
          {exportOptions.exportScope === 'selectedEvents' && (
            <Paper sx={{ p: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1">
                  {t('export.selectEvents')}
                </Typography>
                
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={events ? exportOptions.selectedEventIds.length === Object.keys(events).length : false}
                      onChange={(e) => handleSelectAllEvents(e.target.checked)}
                    />
                  }
                  label={t('export.selectAll')}
                />
              </Box>
              
              <Divider sx={{ mb: 2 }} />
              
              {eventsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : events && Object.values(events).length > 0 ? (
                <Grid container spacing={2}>
                  {Object.values(events).map((event) => (
                    <Grid item xs={12} sm={6} md={4} key={event.id}>
                      <Box 
                        sx={{
                          p: 2, 
                          border: `1px solid ${theme.palette.divider}`,
                          borderRadius: 1,
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <Checkbox
                          checked={exportOptions.selectedEventIds.includes(event.id)}
                          onChange={(e) => handleEventSelectionChange(event.id, e.target.checked)}
                        />
                        <Box sx={{ ml: 1 }}>
                          <Typography variant="body1">{event.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {new Date(event.date).toLocaleDateString()}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {t('export.noEvents')}
                </Typography>
              )}
            </Paper>
          )}
          
          {exportOptions.exportScope === 'selectedSports' && (
            <Paper sx={{ p: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1">
                  {t('export.selectSports')}
                </Typography>
                
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={sports ? exportOptions.selectedSportIds.length === Object.keys(sports).length : false}
                      onChange={(e) => handleSelectAllSports(e.target.checked)}
                    />
                  }
                  label={t('export.selectAll')}
                />
              </Box>
              
              <Divider sx={{ mb: 2 }} />
              
              {sportsLoading || eventsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : events && sports && Object.values(events).length > 0 ? (
                <>
                  {Object.values(events).map((event) => {
                    const eventSports = getSportsByEvent(event.id);
                    if (eventSports.length === 0) return null;
                    
                    return (
                      <Box key={event.id} sx={{ mb: 3 }}>
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          mb: 1,
                          p: 1,
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          borderRadius: 1
                        }}>
                          <EventIcon sx={{ mr: 1 }} />
                          <Typography variant="subtitle1">
                            {event.name}
                          </Typography>
                        </Box>
                        
                        <Grid container spacing={2}>
                          {eventSports.map((sport) => (
                            <Grid item xs={12} sm={6} md={4} key={sport.id}>
                              <Box 
                                sx={{
                                  p: 2, 
                                  border: `1px solid ${theme.palette.divider}`,
                                  borderRadius: 1,
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                              >
                                <Checkbox
                                  checked={exportOptions.selectedSportIds.includes(sport.id)}
                                  onChange={(e) => handleSportSelectionChange(sport.id, e.target.checked)}
                                />
                                <Box sx={{ ml: 1, display: 'flex', alignItems: 'center' }}>
                                  <SportIcon sx={{ mr: 1, fontSize: 16 }} />
                                  <div>
                                    <Typography variant="body1">{sport.name}</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                      {t(`sports.${sport.type}`)}
                                    </Typography>
                                  </div>
                                </Box>
                              </Box>
                            </Grid>
                          ))}
                        </Grid>
                      </Box>
                    );
                  })}
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {t('export.noSports')}
                </Typography>
              )}
            </Paper>
          )}
          
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <DownloadIcon />}
              onClick={handleExport}
              disabled={isLoading}
              size="large"
            >
              {isLoading ? t('export.exporting') : t('export.exportToExcel')}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ExportPanel;
