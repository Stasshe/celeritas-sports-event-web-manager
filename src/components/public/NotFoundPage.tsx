import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Typography, CircularProgress } from '@mui/material';

const NotFoundPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    
    // パスパターンに基づいてリダイレクト
    if (path.startsWith('/admin/')) {
      navigate('/admin');
    } else if (path.startsWith('/sport/')) {
      navigate('/');
    } else {
      // その他のパスは全てホームページへ
      navigate('/');
    }
  }, [navigate, location]);

  return (
    <Box 
      display="flex" 
      flexDirection="column" 
      alignItems="center" 
      justifyContent="center" 
      minHeight="80vh"
    >
      <CircularProgress />
      <Typography variant="h6" sx={{ mt: 2 }}>
        リダイレクト中...
      </Typography>
    </Box>
  );
};

export default NotFoundPage;
