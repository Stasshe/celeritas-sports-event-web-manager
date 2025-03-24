import React from 'react';
import { Container, Typography, Box, Paper, IconButton, Breadcrumbs, Link } from '@mui/material';
import { ArrowBack as ArrowBackIcon, Home as HomeIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ExportPanel from '../../components/admin/ExportPanel';

const ExportPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <IconButton onClick={() => navigate('/admin')} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1">
            {t('export.pageTitle')}
          </Typography>
        </Box>
        
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <Link 
            underline="hover" 
            color="inherit" 
            onClick={() => navigate('/admin')}
            sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
          >
            <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
            {t('admin.dashboard')}
          </Link>
          <Typography color="text.primary">{t('export.pageTitle')}</Typography>
        </Breadcrumbs>
      </Box>

      <Paper sx={{ p: 0 }}>
        <ExportPanel />
      </Paper>
    </Container>
  );
};

export default ExportPage;
