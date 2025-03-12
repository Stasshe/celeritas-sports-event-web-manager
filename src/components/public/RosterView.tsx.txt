import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
  Card,
  CardContent,
  Grid,
  useTheme,
  CircularProgress
} from '@mui/material';
import { Sport } from '../../types';
import { useTranslation } from 'react-i18next';
import { useThemeContext } from '../../contexts/ThemeContext';
import { motion } from 'framer-motion';

interface RosterViewProps {
  sport: Sport;
}

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
      id={`grade-tabpanel-${index}`}
      aria-labelledby={`grade-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
};

const MotionCard = motion(Card);

const RosterView: React.FC<RosterViewProps> = ({ sport }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { alpha } = useThemeContext();
  
  const [selectedGrade, setSelectedGrade] = useState(0);
  
  const handleGradeChange = (_event: React.SyntheticEvent, newValue: number) => {
    setSelectedGrade(newValue);
  };
  
  const getCurrentGradeKey = (): 'grade1' | 'grade2' | 'grade3' => {
    switch (selectedGrade) {
      case 0:
        return 'grade1';
      case 1:
        return 'grade2';
      case 2:
        return 'grade3';
      default:
        return 'grade2';
    }
  };
  
  // クラス一覧を取得
  const getClassNames = () => {
    const gradeKey = getCurrentGradeKey();
    if (!sport.roster || !sport.roster[gradeKey]) return [];
    
    return Object.keys(sport.roster[gradeKey] || {}).sort();
  };
  
  // 特定のクラスのメンバー一覧を取得
  const getClassMembers = (className: string) => {
    const gradeKey = getCurrentGradeKey();
    if (!sport.roster || !sport.roster[gradeKey] || !sport.roster[gradeKey]?.[className]) {
      return [];
    }
    
    return sport.roster[gradeKey]?.[className] || [];
  };
  
  if (!sport.roster) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body1" color="text.secondary">
          {t('roster.noData')}
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={selectedGrade} onChange={handleGradeChange} aria-label="grade tabs">
          <Tab label={t('roster.grade1')} />
          <Tab label={t('roster.grade2')} />
          <Tab label={t('roster.grade3')} />
        </Tabs>
      </Box>
      
      <TabPanel value={selectedGrade} index={0}>
        <ClassListPanel classNames={getClassNames()} getClassMembers={getClassMembers} />
      </TabPanel>
      
      <TabPanel value={selectedGrade} index={1}>
        <ClassListPanel classNames={getClassNames()} getClassMembers={getClassMembers} />
      </TabPanel>
      
      <TabPanel value={selectedGrade} index={2}>
        <ClassListPanel classNames={getClassNames()} getClassMembers={getClassMembers} />
      </TabPanel>
    </Box>
  );
};

interface ClassListPanelProps {
  classNames: string[];
  getClassMembers: (className: string) => string[];
}

const ClassListPanel: React.FC<ClassListPanelProps> = ({ classNames, getClassMembers }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { alpha } = useThemeContext();
  
  if (classNames.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 2 }}>
        <Typography color="text.secondary">
          {t('roster.noClasses')}
        </Typography>
      </Box>
    );
  }
  
  return (
    <Grid container spacing={3}>
      {classNames.map((className, index) => {
        const members = getClassMembers(className);
        
        return (
          <Grid item xs={12} sm={6} md={4} key={className}>
            <MotionCard
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.3 }}
              elevation={2}
            >
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {className}
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                {members.length > 0 ? (
                  <List dense>
                    {members.map((member, idx) => (
                      <ListItem key={idx} sx={{ px: 0, py: 0.5 }}>
                        <ListItemText primary={member} />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography color="text.secondary">
                    {t('roster.noMembers')}
                  </Typography>
                )}
                
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                  <Chip 
                    label={t('roster.memberCount', { count: members.length })} 
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                </Box>
              </CardContent>
            </MotionCard>
          </Grid>
        );
      })}
    </Grid>
  );
};

export default RosterView;
