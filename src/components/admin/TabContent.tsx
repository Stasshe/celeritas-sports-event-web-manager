import React, { useState, useEffect, useRef } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { Sport } from '../../types';

interface TabContentProps {
  children: React.ReactNode;
  active: boolean;
  sport: Sport;
  field: string;
  loading: boolean;
  hasChanges: boolean;
  onLoad: () => void;
}

export const TabContent: React.FC<TabContentProps> = ({
  children,
  active,
  sport,
  field,
  loading,
  hasChanges,
  onLoad
}) => {
  const [localLoading, setLocalLoading] = useState(false);
  const firstRenderRef = useRef(true);
  
  useEffect(() => {
    if (active && firstRenderRef.current) {
      firstRenderRef.current = false;
      // 初回表示時のみローディングを表示
      setLocalLoading(true);
      onLoad();
      // 短いタイムアウト後にローディングを消す
      const timer = setTimeout(() => {
        setLocalLoading(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [active, onLoad]);
  
  // データ更新時は何もしない
  
  if (localLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }
  
  return <>{children}</>;
};
