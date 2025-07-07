import React from 'react';
import { Paper, Typography, Box, useTheme } from '@mui/material';
import { Sport } from '../types';
import { useTranslation } from 'react-i18next';

interface DelaysTableProps {
  sports: Sport[];
}

const DelaysTable: React.FC<DelaysTableProps> = ({ sports }) => {
  const { t } = useTranslation();
  const theme = useTheme();

  if (sports.length === 0) return null;

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" gutterBottom>
        {t('sport.delayTimeOverview', { defaultValue: '競技ごとの遅延時間一覧' })}
      </Typography>
      <Paper sx={{ p: 2, overflowX: 'auto' }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'flex-start',
            alignItems: 'flex-end',
            gap: { xs: 2, sm: 4 },
            overflowX: 'auto',
            pb: 2,
          }}
        >
          {sports.map((sport) => (
            <Box
              key={sport.id}
              sx={{
                minWidth: 90,
                textAlign: 'center',
                flex: '0 0 auto',
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{
                  borderBottom: `2px solid ${theme.palette.primary.main}`,
                  mb: 1,
                  fontWeight: 600,
                  fontSize: { xs: '0.95rem', sm: '1.05rem' },
                  wordBreak: 'break-word',
                }}
              >
                {sport.name}
              </Typography>
              <Typography
                variant="h5"
                color="primary"
                sx={{ fontWeight: 700, fontSize: { xs: '1.3rem', sm: '1.7rem' } }}
              >
                {typeof sport.delayMinutes === 'number' ? sport.delayMinutes : 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t('sport.delayMinutesUnit', { defaultValue: '分' })}
              </Typography>
            </Box>
          ))}
        </Box>
      </Paper>
    </Box>
  );
};

export default DelaysTable;
