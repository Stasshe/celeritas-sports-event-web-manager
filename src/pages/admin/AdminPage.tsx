import React, { useState } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Tabs, 
  Tab,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  IconButton,
  useTheme
} from '@mui/material';
import { 
  Menu as MenuIcon,
  Event as EventIcon,
  SportsSoccer as SportIcon,
  Settings as SettingsIcon,
  Help as HelpIcon,
  ChevronLeft as ChevronLeftIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import EventManagement from '../../components/admin/EventManagement';
import SportManagement from '../../components/admin/SportManagement';
// SettingsPanelコンポーネントを正しいパスからインポート
import SettingsPanel from '../../components/admin/SettingsPanel';

const MotionBox = motion(Box);

const AdminPage: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(true);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  // タブの内容をレンダリング
  const renderTabContent = () => {
    switch (activeTab) {
      case 0:
        return <EventManagement />;
      case 1:
        return <SportManagement />;
      case 2:
        return <SettingsPanel />;
      default:
        return null;
    }
  };

  const drawerWidth = 240;

  return (
    <Container maxWidth={false} disableGutters>
      <Box sx={{ display: 'flex' }}>
        {/* サイドバー */}
        <Drawer
          variant="persistent"
          anchor="left"
          open={drawerOpen}
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
              mt: '64px',  // AppBarの高さに合わせる
            },
          }}
        >
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'flex-end',
            padding: theme.spacing(0, 1),
            ...theme.mixins.toolbar 
          }}>
            <IconButton onClick={toggleDrawer}>
              <ChevronLeftIcon />
            </IconButton>
          </Box>
          <Divider />
          <List>
            <ListItemButton 
              selected={activeTab === 0}
              onClick={() => setActiveTab(0)}
            >
              <ListItemIcon>
                <EventIcon />
              </ListItemIcon>
              <ListItemText primary={t('admin.events')} />
            </ListItemButton>
            <ListItemButton 
              selected={activeTab === 1}
              onClick={() => setActiveTab(1)}
            >
              <ListItemIcon>
                <SportIcon />
              </ListItemIcon>
              <ListItemText primary={t('admin.sports')} />
            </ListItemButton>
            <ListItemButton 
              selected={activeTab === 2}
              onClick={() => setActiveTab(2)}
            >
              <ListItemIcon>
                <SettingsIcon />
              </ListItemIcon>
              <ListItemText primary={t('admin.settings')} />
            </ListItemButton>
          </List>
          <Divider />
          <List>
            <ListItemButton 
              component={RouterLink}
              to="/admin/help"
            >
              <ListItemIcon>
                <HelpIcon />
              </ListItemIcon>
              <ListItemText primary={t('admin.help')} />
            </ListItemButton>
          </List>
        </Drawer>

        {/* メインコンテンツ */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            transition: theme.transitions.create('margin', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.leavingScreen,
            }),
            marginLeft: drawerOpen ? `${drawerWidth}px` : 0,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            {!drawerOpen && (
              <IconButton
                color="inherit"
                aria-label="open drawer"
                onClick={toggleDrawer}
                edge="start"
                sx={{ mr: 2 }}
              >
                <MenuIcon />
              </IconButton>
            )}
            <Typography variant="h4" component="h1">
              {t('admin.title')}
            </Typography>
          </Box>

          <Paper sx={{ p: 2, mb: 4 }}>
            <Tabs 
              value={activeTab} 
              onChange={handleTabChange} 
              aria-label="admin tabs"
              variant="fullWidth"
            >
              <Tab label={t('admin.events')} />
              <Tab label={t('admin.sports')} />
              <Tab label={t('admin.settings')} />
            </Tabs>
          </Paper>

          <MotionBox
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {renderTabContent()}
          </MotionBox>
        </Box>
      </Box>
    </Container>
  );
};

export default AdminPage;
