import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  useTheme,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Home as HomeIcon,
  People as PeopleIcon,
  EmojiEvents as RulesIcon,
  MenuBook as ManualIcon,
  SportsSoccer as SportIcon,
  Repeat as RoundRobinIcon,
  ViewList as CustomIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useDatabase } from '../../hooks/useDatabase';
import { Sport, Team, Match, Organizer } from '../../types';
import { motion } from 'framer-motion';
import { useThemeContext } from '../../contexts/ThemeContext';

// スコアリング表示コンポーネント
import TournamentView from '../../components/public/TournamentView';
import RoundRobinView from '../../components/public/RoundRobinView';
import CustomLayoutView from '../../components/public/CustomLayoutView';
import RosterView from '../../components/public/RosterView';

const MotionPaper = motion(Paper);
const MotionBox = motion(Box);

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = (props) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`sport-tabpanel-${index}`}
      aria-labelledby={`sport-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const SportDetailPage: React.FC = () => {
  const { sportId } = useParams<{ sportId: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme();
  const { alpha } = useThemeContext();
  
  const { data: sport, loading: sportLoading } = useDatabase<Sport>(`/sports/${sportId}`);
  
  const [activeTab, setActiveTab] = useState(0);
  
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // 競技タイプに応じたアイコンを返す
  const getSportTypeIcon = (type: string) => {
    switch (type) {
      case 'tournament':
        return <SportIcon />;
      case 'roundRobin':
        return <RoundRobinIcon />;
      case 'custom':
        return <CustomIcon />;
      default:
        return <SportIcon />;
    }
  };
  
  // リーダー情報を取得
  const getLeaders = (organizers: Organizer[]) => {
    return organizers.filter(org => org.role === 'leader');
  };
  
  // メンバー情報を取得（リーダー以外）
  const getMembers = (organizers: Organizer[]) => {
    return organizers.filter(org => org.role !== 'leader');
  };
  
  if (sportLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!sport) {
    return (
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>
          {t('sport.notFound')}
        </Typography>
        <Button 
          variant="contained"
          onClick={() => navigate('/')}
          startIcon={<ArrowBackIcon />}
          sx={{ mt: 2 }}
        >
          {t('common.backToHome')}
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
      <Box sx={{ mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/')}
          sx={{ mb: 2 }}
        >
          {t('common.backToHome')}
        </Button>
        
        <MotionBox
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="h4" component="h1">
              {sport.name}
            </Typography>
            <Chip 
              icon={getSportTypeIcon(sport.type)} 
              label={t(`sport.${sport.type}`)}
              color="primary"
              size="small"
            />
          </Box>
          
          {sport.description && (
            <Typography variant="body1" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
              {sport.description}
            </Typography>
          )}
        </MotionBox>
      </Box>
      
      {/* タブナビゲーション */}
      <MotionPaper
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        elevation={3}
        sx={{ mb: 4 }}
      >
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="sport tabs"
        >
          <Tab icon={<HomeIcon />} label={t('sport.tabs.home')} />
          <Tab icon={<PeopleIcon />} label={t('sport.tabs.roster')} />
          <Tab icon={<RulesIcon />} label={t('sport.tabs.rules')} />
          <Tab icon={<ManualIcon />} label={t('sport.tabs.manual')} />
        </Tabs>
      </MotionPaper>
      
      {/* ホームタブコンテンツ - 競技形式に応じたスコア表示 */}
      <TabPanel value={activeTab} index={0}>
        <Grid container spacing={4}>
          <Grid item xs={12} md={8}>
            <MotionPaper
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              elevation={2}
              sx={{ p: 3 }}
            >
              <Typography variant="h6" gutterBottom>
                {t('sport.current')}
              </Typography>
              <Divider sx={{ mb: 3 }} />
              
              {/* 競技形式に応じたビューを表示 */}
              {sport.type === 'tournament' && (
                <TournamentView sport={sport} />
              )}
              
              {sport.type === 'roundRobin' && (
                <RoundRobinView sport={sport} />
              )}
              
              {sport.type === 'custom' && (
                <CustomLayoutView sport={sport} />
              )}
            </MotionPaper>
          </Grid>
          
          <Grid item xs={12} md={4}>
            {/* 担当者情報 */}
            <MotionPaper
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
              elevation={2}
              sx={{ p: 3, mb: 3 }}
            >
              <Typography variant="h6" gutterBottom>
                {t('sport.organizers')}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              {sport.organizers && sport.organizers.length > 0 ? (
                <>
                  {/* リーダー表示 */}
                  {getLeaders(sport.organizers).length > 0 && (
                    <>
                      <Typography variant="subtitle2" color="primary" gutterBottom>
                        {t('sport.leaders')}:
                      </Typography>
                      <List dense>
                        {getLeaders(sport.organizers).map(leader => (
                          <ListItem key={leader.id} sx={{ py: 0.5 }}>
                            <ListItemIcon sx={{ minWidth: 36 }}>
                              <Avatar sx={{ width: 24, height: 24 }}>
                                {leader.name.charAt(0)}
                              </Avatar>
                            </ListItemIcon>
                            <ListItemText 
                              primary={leader.name} 
                              secondary={`${leader.grade}${t('sport.gradeUnit')}`} 
                              primaryTypographyProps={{ variant: 'body2' }}
                              secondaryTypographyProps={{ variant: 'caption' }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </>
                  )}
                  
                  {/* メンバー表示 */}
                  {getMembers(sport.organizers).length > 0 && (
                    <>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mt: 1 }}>
                        {t('sport.members')}:
                      </Typography>
                      <List dense>
                        {getMembers(sport.organizers).map(member => (
                          <ListItem key={member.id} sx={{ py: 0.5 }}>
                            <ListItemIcon sx={{ minWidth: 36 }}>
                              <Avatar sx={{ width: 24, height: 24, bgcolor: theme.palette.grey[400] }}>
                                {member.name.charAt(0)}
                              </Avatar>
                            </ListItemIcon>
                            <ListItemText 
                              primary={member.name} 
                              secondary={`${member.grade}${t('sport.gradeUnit')}`} 
                              primaryTypographyProps={{ variant: 'body2' }}
                              secondaryTypographyProps={{ variant: 'caption' }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </>
                  )}
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {t('sport.noOrganizers')}
                </Typography>
              )}
            </MotionPaper>
            
            {/* チーム情報 */}
            <MotionPaper
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.4 }}
              elevation={2}
              sx={{ p: 3 }}
            >
              <Typography variant="h6" gutterBottom>
                {t('sport.teams')}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              {sport.teams && sport.teams.length > 0 ? (
                <List dense>
                  {sport.teams.map((team) => (
                    <ListItem key={team.id} sx={{ py: 0.5 }}>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <Avatar 
                          sx={{ 
                            width: 24, 
                            height: 24, 
                            bgcolor: team.color || theme.palette.primary.light 
                          }}
                        >
                          {team.name.charAt(0)}
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText 
                        primary={team.name} 
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {t('sport.noTeams')}
                </Typography>
              )}
            </MotionPaper>
          </Grid>
        </Grid>
      </TabPanel>
      
      {/* 名簿表示タブ */}
      <TabPanel value={activeTab} index={1}>
        <MotionPaper
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          elevation={2}
          sx={{ p: 3 }}
        >
          <Typography variant="h6" gutterBottom>
            {t('sport.rosterList')}
          </Typography>
          <Divider sx={{ mb: 3 }} />
          
          <RosterView sport={sport} />
        </MotionPaper>
      </TabPanel>
      
      {/* ルール表示タブ */}
      <TabPanel value={activeTab} index={2}>
        <MotionPaper
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          elevation={2}
          sx={{ p: 3 }}
        >
          <Typography variant="h6" gutterBottom>
            {t('sport.tabs.rules')}
          </Typography>
          <Divider sx={{ mb: 3 }} />
          
          {sport.rules ? (
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
              {sport.rules}
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary" align="center">
              {t('sport.noRules')}
            </Typography>
          )}
        </MotionPaper>
      </TabPanel>
      
      {/* マニュアル表示タブ */}
      <TabPanel value={activeTab} index={3}>
        <MotionPaper
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          elevation={2}
          sx={{ p: 3 }}
        >
          <Typography variant="h6" gutterBottom>
            {t('sport.tabs.manual')}
          </Typography>
          <Divider sx={{ mb: 3 }} />
          
          {sport.manual ? (
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
              {sport.manual}
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary" align="center">
              {t('sport.noManual')}
            </Typography>
          )}
        </MotionPaper>
      </TabPanel>
    </Container>
  );
};

export default SportDetailPage;
