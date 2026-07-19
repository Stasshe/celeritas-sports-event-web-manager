import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, useMediaQuery, useTheme } from '@mui/material';
import { SVGViewer } from '@g-loot/react-tournament-brackets';

interface BracketViewportProps {
  children: React.ReactNode;
  bracketWidth: number;
  bracketHeight: number;
  startAt?: [number, number];
}

const BracketViewport: React.FC<BracketViewportProps> = ({
  children,
  bracketWidth,
  bracketHeight,
  startAt
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(entries => {
      setWidth(Math.floor(entries[0].contentRect.width));
    });
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  if (!isMobile) {
    return (
      <Box
        sx={{
          width: '100%',
          overflow: 'hidden',
          '& > svg': {
            display: 'block',
            width: '100%',
            height: 'auto'
          }
        }}
      >
        {children}
      </Box>
    );
  }

  const height = 360;

  return (
    <Box
      ref={containerRef}
      sx={{
        position: 'relative',
        width: '100%',
        height,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'background.default',
        touchAction: 'none',
        '& > div': { maxWidth: '100%' }
      }}
    >
      {width > 0 && (
        <SVGViewer
          width={width}
          height={height}
          bracketWidth={Math.max(bracketWidth, width)}
          bracketHeight={Math.max(bracketHeight, height)}
          startAt={startAt}
          background={theme.palette.background.default}
          SVGBackground={theme.palette.background.paper}
          miniatureProps={{ position: 'none' }}
        >
          {children}
        </SVGViewer>
      )}
      <Typography
        variant="caption"
        sx={{
          position: 'absolute',
          left: 8,
          bottom: 8,
          px: 1,
          py: 0.5,
          borderRadius: 0.75,
          color: 'text.secondary',
          bgcolor: 'background.paper',
          boxShadow: 1,
          pointerEvents: 'none'
        }}
      >
        ドラッグで移動・ピンチで拡大縮小
      </Typography>
    </Box>
  );
};

export default BracketViewport;
