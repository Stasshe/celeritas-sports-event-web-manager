import React from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableRow,
  TableHead,
  useTheme
} from '@mui/material';
import { Sport, CustomCell } from '../../types';
import { useTranslation } from 'react-i18next';

interface CustomLayoutProps {
  sport: Sport;
}

const CustomLayout: React.FC<CustomLayoutProps> = ({ sport }) => {
  const { t } = useTranslation();
  const theme = useTheme();

  if (!sport.customLayout || sport.customLayout.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', my: 4 }}>
        <Typography variant="h6" color="text.secondary">
          {t('custom.noData')}
        </Typography>
      </Box>
    );
  }

  // 各カスタムセルの型を確認
  const flattenedLayout = sport.customLayout.flat();

  // 行ごとにセルをグループ化
  const rows = flattenedLayout.reduce((acc, cell) => {
    if (!acc[cell.rowIndex]) {
      acc[cell.rowIndex] = [];
    }
    acc[cell.rowIndex].push(cell);
    return acc;
  }, {} as Record<number, CustomCell[]>);

  // 行のインデックスを並べ替え
  const rowIndices = Object.keys(rows).map(Number).sort((a, b) => a - b);

  return (
    <Paper sx={{ p: 2, overflowX: 'auto' }}>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell colSpan={flattenedLayout[0]?.colIndex + 1 || 1} align="center" sx={{ 
                backgroundColor: theme.palette.primary.light,
                color: theme.palette.primary.contrastText,
                fontWeight: 'bold',
                fontSize: '1.2rem'
              }}>
                {sport.name}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rowIndices.map(rowIndex => (
              <TableRow key={rowIndex}>
                {rows[rowIndex]
                  .sort((a, b) => a.colIndex - b.colIndex)
                  .map(cell => (
                    <TableCell
                      key={cell.id}
                      align="center"
                      colSpan={cell.colspan || 1}
                      rowSpan={cell.rowspan || 1}
                      sx={{
                        ...(cell.type === 'header' 
                          ? { 
                              backgroundColor: theme.palette.primary.main, 
                              color: theme.palette.primary.contrastText,
                              fontWeight: 'bold'
                            } 
                          : {}),
                        ...(cell.type === 'score' 
                          ? { 
                              backgroundColor: theme.palette.secondary.light,
                              fontWeight: 'bold'
                            } 
                          : {}),
                        ...(cell.type === 'result' 
                          ? { 
                              backgroundColor: theme.palette.success.light,
                              fontWeight: 'bold'
                            } 
                          : {}),
                        ...(cell.style || {})
                      }}
                    >
                      {cell.content}
                    </TableCell>
                  ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default CustomLayout;
