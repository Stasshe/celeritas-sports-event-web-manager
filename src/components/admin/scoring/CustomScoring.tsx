import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  IconButton,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  useTheme,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  GridOn as TableIcon,
  FormatBold as BoldIcon,
  FormatItalic as ItalicIcon,
  FormatAlignLeft as AlignLeftIcon,
  FormatAlignCenter as AlignCenterIcon,
  FormatAlignRight as AlignRightIcon
} from '@mui/icons-material';
import { Sport, CustomCell } from '../../../types';
import { useTranslation } from 'react-i18next';
import { useThemeContext } from '../../../contexts/ThemeContext';
import TeamManagement from '../TeamManagement';

interface CustomScoringProps {
  sport: Sport;
  onUpdate: (sport: Sport) => void;
}

const generateId = () => `cell_${Math.random().toString(36).substr(2, 9)}`;

const CustomScoring: React.FC<CustomScoringProps> = ({ sport, onUpdate }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { alpha } = useThemeContext();
  
  const [layout, setLayout] = useState<CustomCell[][]>(
    sport.customLayout || 
    [
      [
        {
          id: generateId(),
          rowIndex: 0,
          colIndex: 0,
          content: sport.name,
          type: 'header'
        }
      ]
    ]
  );
  
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentCell, setCurrentCell] = useState<CustomCell | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [editedType, setEditedType] = useState<'header' | 'data' | 'score' | 'result'>('data');
  const [editedStyle, setEditedStyle] = useState<Record<string, string>>({});
  const [colspan, setColspan] = useState(1);
  const [rowspan, setRowspan] = useState(1);
  const [showTeamManagement, setShowTeamManagement] = useState(false);

  // スポーツデータが変更されたら、レイアウトを更新
  useEffect(() => {
    if (sport.customLayout && JSON.stringify(sport.customLayout) !== JSON.stringify(layout)) {
      setLayout(sport.customLayout);
    }
  }, [sport]);

  // レイアウトが変更されたら、スポーツデータを更新
  useEffect(() => {
    if (layout !== sport.customLayout) {
      const updatedSport = {
        ...sport,
        customLayout: layout
      };
      onUpdate(updatedSport);
    }
  }, [layout]);

  // 行の追加
  const addRow = () => {
    const newRow = Array(layout[0]?.length || 1).fill(0).map((_, colIndex) => ({
      id: generateId(),
      rowIndex: layout.length,
      colIndex,
      content: '',
      type: 'data' as const
    }));
    
    setLayout([...layout, newRow]);
  };

  // 列の追加
  const addColumn = () => {
    const newLayout = layout.map((row, rowIndex) => [
      ...row,
      {
        id: generateId(),
        rowIndex,
        colIndex: row.length,
        content: '',
        type: 'data' as const
      }
    ]);
    
    setLayout(newLayout);
  };

  // 行の削除
  const removeRow = () => {
    if (layout.length <= 1) return;
    setLayout(layout.slice(0, -1));
  };

  // 列の削除
  const removeColumn = () => {
    if (layout[0]?.length <= 1) return;
    const newLayout = layout.map(row => row.slice(0, -1));
    setLayout(newLayout);
  };

  // セルの編集
  const handleCellClick = (cell: CustomCell) => {
    setCurrentCell(cell);
    setEditedContent(cell.content);
    setEditedType(cell.type);
    setEditedStyle(cell.style || {});
    setColspan(cell.colspan || 1);
    setRowspan(cell.rowspan || 1);
    setEditDialogOpen(true);
  };

  // 編集内容の保存
  const saveCell = () => {
    if (!currentCell) return;

    const newLayout = layout.map(row => [...row]);
    const { rowIndex, colIndex } = currentCell;
    
    newLayout[rowIndex][colIndex] = {
      ...currentCell,
      content: editedContent,
      type: editedType,
      style: Object.keys(editedStyle).length > 0 ? editedStyle : undefined,
      colspan: colspan > 1 ? colspan : undefined,
      rowspan: rowspan > 1 ? rowspan : undefined
    };
    
    setLayout(newLayout);
    setEditDialogOpen(false);
  };

  // テキスト配置のスタイルを変更
  const handleAlignChange = (align: string) => {
    setEditedStyle(prev => ({
      ...prev,
      textAlign: align
    }));
  };

  // 太字スタイルをトグル
  const toggleBold = () => {
    setEditedStyle(prev => ({
      ...prev,
      fontWeight: prev.fontWeight === 'bold' ? 'normal' : 'bold'
    }));
  };

  // イタリックスタイルをトグル
  const toggleItalic = () => {
    setEditedStyle(prev => ({
      ...prev,
      fontStyle: prev.fontStyle === 'italic' ? 'normal' : 'italic'
    }));
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h6">
            {t('customLayout.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('customLayout.description')}
          </Typography>
        </Box>
        <Box>
          <Button 
            variant="outlined"
            onClick={() => setShowTeamManagement(!showTeamManagement)}
          >
            {showTeamManagement 
              ? t('customLayout.hideTeams')
              : t('customLayout.manageTeams')
            }
          </Button>
        </Box>
      </Box>

      {/* チーム管理セクション */}
      {showTeamManagement && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <TeamManagement sport={sport} onUpdate={onUpdate} />
        </Paper>
      )}

      {/* テーブル編集ツール */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          {t('customLayout.tableStructure')}
        </Typography>
        <Grid container spacing={2}>
          <Grid item>
            <Button 
              startIcon={<AddIcon />} 
              variant="outlined" 
              onClick={addRow}
              size="small"
            >
              {t('customLayout.addRow')}
            </Button>
          </Grid>
          <Grid item>
            <Button 
              startIcon={<RemoveIcon />} 
              variant="outlined"
              onClick={removeRow}
              size="small"
              disabled={layout.length <= 1}
              color="error"
            >
              {t('customLayout.removeRow')}
            </Button>
          </Grid>
          <Grid item>
            <Button 
              startIcon={<AddIcon />} 
              variant="outlined"
              onClick={addColumn}
              size="small"
            >
              {t('customLayout.addColumn')}
            </Button>
          </Grid>
          <Grid item>
            <Button 
              startIcon={<RemoveIcon />} 
              variant="outlined"
              onClick={removeColumn}
              size="small"
              disabled={layout[0]?.length <= 1}
              color="error"
            >
              {t('customLayout.removeColumn')}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* レイアウト表示・編集 */}
      <TableContainer component={Paper}>
        <Table>
          <TableBody>
            {layout.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {row.map((cell, colIndex) => {
                  // セルタイプに基づいて背景色を決定
                  let bgColor;
                  let textColor;
                  
                  switch (cell.type) {
                    case 'header':
                      bgColor = alpha(theme.palette.primary.main, 0.1);
                      textColor = theme.palette.primary.main;
                      break;
                    case 'score':
                      bgColor = alpha(theme.palette.secondary.main, 0.1);
                      textColor = theme.palette.secondary.main;
                      break;
                    case 'result':
                      bgColor = alpha(theme.palette.success.main, 0.1);
                      textColor = theme.palette.success.main;
                      break;
                    default:
                      bgColor = 'transparent';
                      textColor = theme.palette.text.primary;
                  }
                  
                  return (
                    <TableCell
                      key={cell.id}
                      onClick={() => handleCellClick(cell)}
                      align={(cell.style?.textAlign as any) || 'center'}
                      colSpan={cell.colspan}
                      rowSpan={cell.rowspan}
                      sx={{
                        cursor: 'pointer',
                        backgroundColor: bgColor,
                        color: textColor,
                        fontWeight: cell.style?.fontWeight,
                        fontStyle: cell.style?.fontStyle,
                        border: '1px solid',
                        borderColor: theme.palette.divider,
                        minWidth: '100px',
                        position: 'relative',
                        '&:hover': {
                          boxShadow: 1,
                          '& .edit-icon': {
                            display: 'block'
                          }
                        },
                        ...cell.style
                      }}
                    >
                      {cell.content}
                      <IconButton 
                        size="small"
                        sx={{ 
                          position: 'absolute',
                          top: 2,
                          right: 2,
                          display: 'none',
                          opacity: 0.7,
                          p: 0.5,
                          bgcolor: alpha(theme.palette.background.paper, 0.8)
                        }}
                        className="edit-icon"
                      >
                        <EditIcon fontSize="inherit" />
                      </IconButton>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* セル編集ダイアログ */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {t('customLayout.editCell')}
        </DialogTitle>
        <DialogContent dividers>
          <TextField
            label={t('customLayout.cellContent')}
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            fullWidth
            margin="normal"
          />
          
          <FormControl fullWidth margin="normal">
            <InputLabel>{t('customLayout.cellType')}</InputLabel>
            <Select
              value={editedType}
              onChange={(e) => setEditedType(e.target.value as any)}
            >
              <MenuItem value="header">{t('customLayout.typeHeader')}</MenuItem>
              <MenuItem value="data">{t('customLayout.typeData')}</MenuItem>
              <MenuItem value="score">{t('customLayout.typeScore')}</MenuItem>
              <MenuItem value="result">{t('customLayout.typeResult')}</MenuItem>
            </Select>
          </FormControl>
          
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              {t('customLayout.styling')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <Tooltip title={t('customLayout.alignLeft')}>
                <IconButton onClick={() => handleAlignChange('left')} color={editedStyle?.textAlign === 'left' ? 'primary' : 'default'}>
                  <AlignLeftIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title={t('customLayout.alignCenter')}>
                <IconButton onClick={() => handleAlignChange('center')} color={!editedStyle?.textAlign || editedStyle?.textAlign === 'center' ? 'primary' : 'default'}>
                  <AlignCenterIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title={t('customLayout.alignRight')}>
                <IconButton onClick={() => handleAlignChange('right')} color={editedStyle?.textAlign === 'right' ? 'primary' : 'default'}>
                  <AlignRightIcon />
                </IconButton>
              </Tooltip>
              <Divider orientation="vertical" flexItem />
              <Tooltip title={t('customLayout.bold')}>
                <IconButton onClick={toggleBold} color={editedStyle?.fontWeight === 'bold' ? 'primary' : 'default'}>
                  <BoldIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title={t('customLayout.italic')}>
                <IconButton onClick={toggleItalic} color={editedStyle?.fontStyle === 'italic' ? 'primary' : 'default'}>
                  <ItalicIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
          
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              {t('customLayout.cellSpan')}
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label={t('customLayout.colspan')}
                  type="number"
                  value={colspan}
                  onChange={(e) => setColspan(Math.max(1, parseInt(e.target.value) || 1))}
                  InputProps={{ inputProps: { min: 1 } }}
                  fullWidth
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label={t('customLayout.rowspan')}
                  type="number"
                  value={rowspan}
                  onChange={(e) => setRowspan(Math.max(1, parseInt(e.target.value) || 1))}
                  InputProps={{ inputProps: { min: 1 } }}
                  fullWidth
                />
              </Grid>
            </Grid>
          </Box>
          
          <Box sx={{ mt: 3, p: 2, border: '1px solid', borderColor: theme.palette.divider, borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              {t('customLayout.preview')}
            </Typography>
            <Paper elevation={0} sx={{ 
              p: 2,
              textAlign: editedStyle?.textAlign || 'center',
              fontWeight: editedStyle?.fontWeight,
              fontStyle: editedStyle?.fontStyle,
              backgroundColor: 
                editedType === 'header' ? alpha(theme.palette.primary.main, 0.1) :
                editedType === 'score' ? alpha(theme.palette.secondary.main, 0.1) :
                editedType === 'result' ? alpha(theme.palette.success.main, 0.1) :
                'transparent',
              color: 
                editedType === 'header' ? theme.palette.primary.main :
                editedType === 'score' ? theme.palette.secondary.main :
                editedType === 'result' ? theme.palette.success.main :
                theme.palette.text.primary,
            }}>
              {editedContent || t('customLayout.emptyCell')}
            </Paper>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={saveCell}
            startIcon={<SaveIcon />}
          >
            {t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CustomScoring;
