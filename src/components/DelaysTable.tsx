import React from 'react';
import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, Box } from '@mui/material';
import { Sport } from '../types';
import { useTranslation } from 'react-i18next';

interface DelaysTableProps {
  sports: Sport[];
}

const DelaysTable: React.FC<DelaysTableProps> = ({ sports }) => {
  const { t } = useTranslation();
  // すべての競技を表示（0分も含める）
  const sportsWithDelay = sports;

  if (sportsWithDelay.length === 0) {
    return null;
  }

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" gutterBottom>
        {t('sport.delayTimeOverview', { defaultValue: '競技ごとの遅延時間一覧' })}
      </Typography>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('sport.name')}</TableCell>
              <TableCell align="right">{t('sport.delayMinutesLabel', { defaultValue: '遅延時間 (分)' })}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sportsWithDelay.map((sport) => (
              <TableRow key={sport.id}>
                <TableCell>{sport.name}</TableCell>
                <TableCell align="right">{typeof sport.delayMinutes === 'number' ? sport.delayMinutes : 0}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default DelaysTable;
