import React from 'react';
import { Box, Typography, Button, Container } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

const NotFoundPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  return (
    <Container>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '70vh',
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Typography variant="h1" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
            404
          </Typography>
        </motion.div>
        
        <Typography variant="h5" component="h2" gutterBottom>
          {t('notFound.title') || 'ページが見つかりません'}
        </Typography>
        
        <Typography color="text.secondary" align="center" sx={{ mb: 4 }}>
          {t('notFound.message') || 'お探しのページは存在しないか、削除された可能性があります。'}
        </Typography>
        
        <Button 
          variant="contained" 
          color="primary" 
          onClick={() => navigate('/')}
        >
          {t('common.backToHome') || 'ホームに戻る'}
        </Button>
      </Box>
    </Container>
  );
};

export default NotFoundPage;
