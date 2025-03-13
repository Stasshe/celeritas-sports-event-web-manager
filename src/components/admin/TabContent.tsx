import React, { useState, useEffect } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { Sport } from '../../types';

interface TabContentProps {
  children: React.ReactNode;
  active: boolean;
  sport: Sport;
  field: keyof Sport;
  onLoad?: () => void;
  loading?: boolean;
  hasChanges?: boolean;
}

export const TabContent: React.FC<TabContentProps> = ({
  children,
  active,
  sport,
  field,
  onLoad,
  loading = false,
  hasChanges = false
}) => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (active && !isLoaded) {
      setIsLoaded(true);
      onLoad?.();
    }
  }, [active, isLoaded, onLoad]);

  if (!active) return null;

  return (
    <Box
      sx={{
        position: 'relative',
        ...(hasChanges && {
          '&::before': {
            content: '""',
            position: 'absolute',
            top: -2,
            right: -2,
            bottom: -2,
            left: -2,
            border: '2px solid',
            borderColor: 'warning.main',
            borderRadius: 1,
            opacity: 0.5,
            pointerEvents: 'none'
          }
        })
      }}
    >
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress size={24} />
        </Box>
      ) : (
        children
      )}
    </Box>
  );
};
