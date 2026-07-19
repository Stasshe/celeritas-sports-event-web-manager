import React from 'react';
import { Container, Typography, Box, Paper, IconButton, Breadcrumbs, Link } from '@mui/material';
import { ArrowBack as ArrowBackIcon, Home as HomeIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import ExportPanel from '../components/ExportPanel';

const ExportPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <IconButton onClick={() => navigate('/admin')} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1">
            {"エクスポートページ"}
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
            {"ダッシュボード"}
          </Link>
          <Typography color="text.primary">{"エクスポートページ"}</Typography>
        </Breadcrumbs>
      </Box>

      <Paper sx={{ p: 0 }}>
        <ExportPanel />
      </Paper>
    </Container>
  );
};

export default ExportPage;
