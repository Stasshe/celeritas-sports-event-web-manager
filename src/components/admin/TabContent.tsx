import React, { useState, useEffect, useRef } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { Sport } from '../../types';

export const TabContent: React.FC<{
  children: React.ReactNode;
  active: boolean;
  sport: Sport;
  field: string;
  loading: boolean;
  hasChanges: boolean;
  onLoad: () => void;
}> = ({ children, active, sport, field, loading, hasChanges, onLoad }) => {
  const [contentReady, setContentReady] = useState(false);
  
  // 初回表示時に一度だけonLoadを呼び出す
  useEffect(() => {
    if (active && !contentReady) {
      onLoad();
      // すぐにコンテンツを表示
      setContentReady(true);
    }
  }, [active, contentReady, onLoad]);
  
  // この部分を削除（ローディングを表示しない）
  /*
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }
  */
  
  // 常にコンテンツを表示
  return <>{children}</>;
};
