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
  const sportIdRef = useRef<string>(sport.id);
  
  // スポーツIDが変更されたときにcontentReadyをリセット
  useEffect(() => {
    if (sportIdRef.current !== sport.id) {
      setContentReady(false);
      sportIdRef.current = sport.id;
    }
  }, [sport.id]);
  
  // 初回表示時に一度だけonLoadを呼び出す
  useEffect(() => {
    if (active && !contentReady) {
      onLoad();
      // すぐにコンテンツを表示
      setContentReady(true);
    }
  }, [active, contentReady, onLoad]);
  
  // 常にコンテンツを表示
  return <>{children}</>;
};
