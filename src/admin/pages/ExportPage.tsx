import React from 'react';
import { Container, Typography, Box, Paper, IconButton, Breadcrumbs, Link } from '@mui/material';
import { ArrowBack as ArrowBackIcon, Home as HomeIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router';
import ExportPanel from '../components/ExportPanel';

const ExportPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth={false} disableGutters>
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <IconButton onClick={() => navigate('/admin')} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1">
            {"エクスポートページ"}
          </Typography>
        </Box>

        <Breadcrumbs aria-label="breadcrumb">
          <Link
            underline="hover"
            color="inherit"
            onClick={() => navigate('/admin')}
            sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
          >
            <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
            {"ダッシュボード"}
          </Link>
          <Typography sx={{
            color: "text.primary"
          }}>{"エクスポートページ"}</Typography>
        </Breadcrumbs>
      </Box>
      <Paper elevation={0} square sx={{ p: 0, bgcolor: 'transparent' }}>
        <ExportPanel />
      </Paper>
    </Container>
  );
};

export default ExportPage;
