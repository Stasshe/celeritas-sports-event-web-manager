import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  useTheme
} from '@mui/material';
import { Sport, CustomCell } from '../../types';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useThemeContext } from '../../contexts/ThemeContext';

interface CustomLayoutViewProps {
  sport: Sport;
}

const MotionBox = motion(Box);

const CustomLayoutView: React.FC<CustomLayoutViewProps> = ({ sport }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { alpha } = useThemeContext();

  if (!sport.customLayout || sport.customLayout.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body1" color="text.secondary">
          {t('customLayout.noData')}
        </Typography>
      </Box>
    );
  }

  // テーブル行数と列数を取得
  const rowCount = sport.customLayout.length;
  const colCount = Math.max(...sport.customLayout.map(row => row.length));

  // セルのレンダリングヘルパー関数
  const renderCell = (cell: CustomCell | undefined) => {
    if (!cell) return null;
    
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
    
    // カスタムスタイルがあれば適用
    const cellStyle = cell.style || {};
    
    return (
      <TableCell
        key={cell.id}
        align={cellStyle.textAlign as "left" | "center" | "right" | "justify" | undefined || 'center'}
        colSpan={cell.colspan || 1}
        rowSpan={cell.rowspan || 1}
        sx={{
          backgroundColor: bgColor,
          color: textColor,
          fontWeight: cellStyle.fontWeight || (cell.type === 'header' ? 'bold' : 'normal'),
          fontStyle: cellStyle.fontStyle,
          ...cellStyle
        }}
      >
        {cell.content}
      </TableCell>
    );
  };

  return (
    <MotionBox
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <TableContainer component={Paper}>
        <Table size="small">
          <TableBody>
            {sport.customLayout.map((row, rowIndex) => (
              <TableRow key={`row-${rowIndex}`}>
                {row.map((cell) => renderCell(cell))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </MotionBox>
  );
};

export default CustomLayoutView;
