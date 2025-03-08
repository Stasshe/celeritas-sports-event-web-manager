import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  IconButton,
  Tooltip,
  useTheme
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  AddCircleOutline as AddRowIcon,
  LibraryAdd as AddColumnIcon
} from '@mui/icons-material';
import { Sport, CustomCell } from '../../../types';
import { useTranslation } from 'react-i18next';

interface CustomScoringProps {
  sport: Sport;
  onUpdate: (updatedSport: Sport) => void;
}

const CustomScoring: React.FC<CustomScoringProps> = ({ sport, onUpdate }) => {
  const { t } = useTranslation();
  const theme = useTheme();

  const [layout, setLayout] = useState<CustomCell[]>(sport.customLayout?.flat() || []);
  const [selectedCell, setSelectedCell] = useState<CustomCell | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [rowCount, setRowCount] = useState(0);
  const [colCount, setColCount] = useState(0);

  // スポーツデータが更新されたときにレイアウトも更新
  useEffect(() => {
    const newLayout = sport.customLayout?.flat() || [];
    setLayout(newLayout);

    // 行数と列数を計算
    if (newLayout.length > 0) {
      const maxRow = Math.max(...newLayout.map(cell => cell.rowIndex)) + 1;
      const maxCol = Math.max(...newLayout.map(cell => cell.colIndex)) + 1;
      setRowCount(maxRow);
      setColCount(maxCol);
    } else {
      // デフォルトでは5x5のグリッド
      setRowCount(5);
      setColCount(5);
    }
  }, [sport.customLayout]);

  // レイアウトがない場合は初期化
  useEffect(() => {
    if (layout.length === 0) {
      initializeLayout();
    }
  }, [layout]);

  // 初期レイアウトを作成
  const initializeLayout = () => {
    const newLayout: CustomCell[] = [];
    const rows = 5;
    const cols = 5;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        newLayout.push({
          id: `cell_${r}_${c}_${Date.now()}`,
          rowIndex: r,
          colIndex: c,
          content: '',
          type: r === 0 || c === 0 ? 'header' : 'data'
        });
      }
    }

    // ヘッダーセルの初期値を設定
    newLayout.forEach(cell => {
      if (cell.rowIndex === 0 && cell.colIndex === 0) {
        cell.content = sport.name;
      } else if (cell.rowIndex === 0) {
        cell.content = `列${cell.colIndex}`;
      } else if (cell.colIndex === 0) {
        cell.content = `行${cell.rowIndex}`;
      }
    });

    setLayout(newLayout);
    setRowCount(rows);
    setColCount(cols);
  };

  // セルをクリックしたときの処理
  const handleCellClick = (cell: CustomCell) => {
    setSelectedCell(cell);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedCell(null);
  };

  // セルの内容を更新
  const handleUpdateCell = (updatedCell: CustomCell) => {
    const newLayout = layout.map(cell => 
      cell.id === updatedCell.id ? updatedCell : cell
    );
    setLayout(newLayout);
    handleCloseDialog();
    
    // スポーツデータを更新
    updateSportLayout(newLayout);
  };

  // 新しい行を追加
  const addRow = () => {
    const newRowIndex = rowCount;
    const newCells: CustomCell[] = [];
    
    for (let c = 0; c < colCount; c++) {
      newCells.push({
        id: `cell_${newRowIndex}_${c}_${Date.now()}`,
        rowIndex: newRowIndex,
        colIndex: c,
        content: c === 0 ? `行${newRowIndex}` : '',
        type: c === 0 ? 'header' : 'data'
      });
    }
    
    const newLayout = [...layout, ...newCells];
    setLayout(newLayout);
    setRowCount(newRowIndex + 1);
    
    // スポーツデータを更新
    updateSportLayout(newLayout);
  };

  // 新しい列を追加
  const addColumn = () => {
    const newColIndex = colCount;
    const newCells: CustomCell[] = [];
    
    for (let r = 0; r < rowCount; r++) {
      newCells.push({
        id: `cell_${r}_${newColIndex}_${Date.now()}`,
        rowIndex: r,
        colIndex: newColIndex,
        content: r === 0 ? `列${newColIndex}` : '',
        type: r === 0 ? 'header' : 'data'
      });
    }
    
    const newLayout = [...layout, ...newCells];
    setLayout(newLayout);
    setColCount(newColIndex + 1);
    
    // スポーツデータを更新
    updateSportLayout(newLayout);
  };

  // スポーツデータのレイアウトを更新
  const updateSportLayout = (newLayout: CustomCell[]) => {
    // カスタムレイアウトを2次元配列に変換
    const layout2D: CustomCell[][] = [];
    
    for (let r = 0; r < rowCount; r++) {
      const row: CustomCell[] = [];
      for (let c = 0; c < colCount; c++) {
        const cell = newLayout.find(cell => cell.rowIndex === r && cell.colIndex === c);
        if (cell) {
          row.push(cell);
        }
      }
      layout2D.push(row);
    }

    onUpdate({
      ...sport,
      customLayout: layout2D
    });
  };

  // セルのタイプに応じたスタイルを取得
  const getCellStyle = (type: string) => {
    switch (type) {
      case 'header':
        return {
          backgroundColor: theme.palette.primary.main,
          color: theme.palette.primary.contrastText,
          fontWeight: 'bold'
        };
      case 'score':
        return {
          backgroundColor: theme.palette.secondary.light,
          fontWeight: 'bold'
        };
      case 'result':
        return {
          backgroundColor: theme.palette.success.light,
          fontWeight: 'bold'
        };
      default:
        return {};
    }
  };

  // 行と列ごとにセルをグループ化
  const cellsByRow = Array.from({ length: rowCount }, (_, rowIndex) => {
    return layout.filter(cell => cell.rowIndex === rowIndex)
      .sort((a, b) => a.colIndex - b.colIndex);
  });

  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="h6" gutterBottom>
          {t('customLayout.title') || 'カスタムレイアウト'}
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<AddRowIcon />}
            onClick={addRow}
            size="small"
            sx={{ mr: 1 }}
          >
            {t('customLayout.addRow') || '行追加'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<AddColumnIcon />}
            onClick={addColumn}
            size="small"
          >
            {t('customLayout.addColumn') || '列追加'}
          </Button>
        </Box>
      </Box>

      <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableBody>
            {cellsByRow.map((row, rowIdx) => (
              <TableRow key={`row_${rowIdx}`}>
                {row.map((cell) => (
                  <TableCell
                    key={cell.id}
                    align="center"
                    onClick={() => handleCellClick(cell)}
                    sx={{
                      ...getCellStyle(cell.type),
                      cursor: 'pointer',
                      border: '1px solid',
                      borderColor: theme.palette.divider,
                      textAlign: 'center',
                      padding: '8px',
                      minWidth: '60px',
                      height: '40px',
                      '&:hover': {
                        backgroundColor: theme.palette.action.hover,
                      },
                      ...(cell.style || {})
                    }}
                    colSpan={cell.colspan || 1}
                    rowSpan={cell.rowspan || 1}
                  >
                    {cell.content}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* セル編集ダイアログ */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {t('customLayout.editCell') || 'セル編集'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('customLayout.content') || '内容'}
                value={selectedCell?.content || ''}
                onChange={(e) => selectedCell && setSelectedCell({...selectedCell, content: e.target.value})}
                margin="normal"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel>{t('customLayout.cellType') || 'セルタイプ'}</InputLabel>
                <Select
                  value={selectedCell?.type || 'data'}
                  onChange={(e) => selectedCell && setSelectedCell({
                    ...selectedCell, 
                    type: e.target.value as "header" | "data" | "score" | "result"
                  })}
                >
                  <MenuItem value="header">{t('customLayout.header') || 'ヘッダー'}</MenuItem>
                  <MenuItem value="data">{t('customLayout.data') || 'データ'}</MenuItem>
                  <MenuItem value="score">{t('customLayout.score') || 'スコア'}</MenuItem>
                  <MenuItem value="result">{t('customLayout.result') || '結果'}</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={6} sm={3}>
              <TextField
                fullWidth
                label={t('customLayout.colspan') || '横結合'}
                type="number"
                margin="normal"
                value={selectedCell?.colspan || 1}
                onChange={(e) => selectedCell && setSelectedCell({
                  ...selectedCell, 
                  colspan: Math.max(1, parseInt(e.target.value) || 1)
                })}
                inputProps={{ min: 1 }}
              />
            </Grid>

            <Grid item xs={6} sm={3}>
              <TextField
                fullWidth
                label={t('customLayout.rowspan') || '縦結合'}
                type="number"
                margin="normal"
                value={selectedCell?.rowspan || 1}
                onChange={(e) => selectedCell && setSelectedCell({
                  ...selectedCell, 
                  rowspan: Math.max(1, parseInt(e.target.value) || 1)
                })}
                inputProps={{ min: 1 }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>{t('common.cancel') || 'キャンセル'}</Button>
          <Button 
            onClick={() => selectedCell && handleUpdateCell(selectedCell)} 
            variant="contained" 
            color="primary"
          >
            {t('common.save') || '保存'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CustomScoring;
