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
  useTheme
} from '@mui/material';
import { 
  GetApp as DownloadIcon,
  Event as EventIcon,
  SportsSoccer as SportIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useDatabase } from '../../hooks/useDatabase';
import { Event, Sport } from '../../types';
import { exportToExcel, ExportError, ERROR_CODES } from '../../utils/export/ExportManager';
import { useThemeContext } from '../../contexts/ThemeContext';

const ExportPanel: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { alpha } = useThemeContext(); // Add this line to get the alpha function
  
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
    details?: string;
  }>({ status: 'idle' });
  
  // Loading state
  const isLoading = eventsLoading || sportsLoading || exportStatus.status === 'loading';

  // エラーメッセージの翻訳を取得する関数
  const getErrorMessage = (error: ExportError | Error): { message: string; details?: string } => {
    if (error instanceof ExportError) {
      const errorKey = `export.errors.${getErrorKeyFromCode(error.code)}`;
      return {
        message: t(errorKey),
        details: error.originalError?.message
      };
    }
    
    // 一般的なエラーの場合
    return {
      message: t('export.errors.unknown'),
      details: error.message
    };
  };

  // エラーコードからキーを取得する関数
  const getErrorKeyFromCode = (code: string): string => {
    switch (code) {
      case ERROR_CODES.NO_DATA:
        return 'noData';
      case ERROR_CODES.NO_EVENTS_SELECTED:
        return 'noEventsSelected';
      case ERROR_CODES.NO_SPORTS_SELECTED:
        return 'noSportsSelected';
      case ERROR_CODES.INVALID_FILE_NAME:
        return 'invalidFileName';
      case ERROR_CODES.WORKBOOK_CREATION_FAILED:
        return 'workbookCreationFailed';
      case ERROR_CODES.DATA_PROCESSING_FAILED:
        return 'dataProcessingFailed';
      case ERROR_CODES.FILE_GENERATION_FAILED:
        return 'fileGenerationFailed';
      case ERROR_CODES.DOWNLOAD_FAILED:
        return 'downloadFailed';
      case ERROR_CODES.NETWORK_ERROR:
        return 'networkError';
      case ERROR_CODES.PERMISSION_DENIED:
        return 'permissionDenied';
      default:
        return 'unknown';
    }
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
          message: t('export.errors.noData'),
          errorCode: ERROR_CODES.NO_DATA
        });
        return;
      }

      // 選択範囲の検証
      if (exportOptions.exportScope === 'selectedEvents' && exportOptions.selectedEventIds.length === 0) {
        setExportStatus({
          status: 'error',
          message: t('export.errors.noEventsSelected'),
          errorCode: ERROR_CODES.NO_EVENTS_SELECTED
        });
        return;
      }

      if (exportOptions.exportScope === 'selectedSports' && exportOptions.selectedSportIds.length === 0) {
        setExportStatus({
          status: 'error',
          message: t('export.errors.noSportsSelected'),
          errorCode: ERROR_CODES.NO_SPORTS_SELECTED
        });
        return;
      }

      // コンテンツオプションの検証
      if (!exportOptions.includeOverallWinners && !exportOptions.includeIndividualEvents) {
        setExportStatus({
          status: 'error',
          message: t('export.errors.noData'),
          details: 'すべてのコンテンツオプションが無効になっています'
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
        errorCode: error instanceof ExportError ? error.code : ERROR_CODES.UNKNOWN
      });

      // Reset status after a longer delay for errors
      setTimeout(() => {
        setExportStatus({ status: 'idle' });
      }, 10000);
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
                exportStatus.details && (
                  <Button 
                    color="inherit" 
                    size="small" 
                    onClick={() => {
                      navigator.clipboard.writeText(exportStatus.details || '');
                    }}
                  >
                    詳細をコピー
                  </Button>
                )
              }
            >
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  {exportStatus.message}
                </Typography>
                {exportStatus.details && (
                  <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
                    詳細: {exportStatus.details}
                  </Typography>
                )}
                {exportStatus.errorCode && (
                  <Typography variant="caption" sx={{ mt: 1, display: 'block', opacity: 0.7 }}>
                    エラーコード: {exportStatus.errorCode}
                  </Typography>
                )}
              </Box>
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
