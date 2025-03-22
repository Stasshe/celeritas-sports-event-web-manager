import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  Drawer, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText,
  Divider,
  Box,
  Typography
} from '@mui/material';
import { 
  Dashboard as DashboardIcon,
  EmojiEvents as EventsIcon, 
  Sports as SportsIcon,
  Scoreboard as ScoreboardIcon,
  Settings as SettingsIcon,
  Help as HelpIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

const drawerWidth = 240;

export default function AdminNavigation() {
  const { t } = useTranslation();
  const router = useRouter();
  
  const isActive = (path: string) => {
    // '/admin/events/123' should match with '/admin/events'
    if (path === '/admin') {
      return router.pathname === '/admin';
    }
    return router.pathname.startsWith(path);
  };

  const menuItems = [
    { text: t('admin.dashboard'), icon: <DashboardIcon />, path: '/admin' },
    { text: t('admin.events'), icon: <EventsIcon />, path: '/admin/events' },
    { text: t('admin.sports'), icon: <SportsIcon />, path: '/admin/sports' },
    { text: t('admin.scoring'), icon: <ScoreboardIcon />, path: '/admin/scoring' },
    { text: t('admin.settings'), icon: <SettingsIcon />, path: '/admin/settings' },
    { text: t('admin.help'), icon: <HelpIcon />, path: '/admin/help' },
  ];

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
        },
      }}
    >
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" component="div">
          {t('admin.title')}
        </Typography>
      </Box>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <Link href={item.path} passHref key={item.path}>
            <ListItem 
              component="a"
              selected={isActive(item.path)}
              sx={{
                cursor: 'pointer',
                '&.Mui-selected': {
                  backgroundColor: 'primary.light',
                  '&:hover': {
                    backgroundColor: 'primary.main',
                  },
                },
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItem>
          </Link>
        ))}
      </List>
    </Drawer>
  );
}
