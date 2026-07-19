import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  CircularProgress,
  Button,
  Chip,
  Divider,
  IconButton,
  Grid,
  Tabs,
  Tab
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, Schedule as ScheduleIcon } from '@mui/icons-material';
import { getSportTypeLabel } from '../../utils/labels';
import { useDatabase } from '../../hooks/useDatabase';
import { Sport, Team, Match } from '../../types';
import TournamentScoring from '../../common/TournamentScoring';
import RoundRobinTable from '../components/sports/RoundRobinTable';
import RankingScoring from '../../admin/components/scoring/RankingScoring';
import LeagueScoring from '../../admin/components/scoring/LeagueScoring';
import ScheduleTimeline from '../components/sports/ScheduleTimeline';

// タブの型定義を追加
interface SportTab {
  label: string;
  value: number;
  icon?: React.ReactElement;
  iconPosition?: "start" | "end" | "top" | "bottom";
  disabled?: boolean;
}

const SportPage: React.FC = () => {
  const { sportId } = useParams<{ sportId: string }>();
  const navigate = useNavigate();
  const { data: sport, loading, updateData } = useDatabase<Sport>(`/sports/${sportId}`);
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSportUpdate = async (updatedSport: Sport) => {
    try {
      await updateData(updatedSport);
      return true;
    } catch (error) {
      console.error('Error updating sport:', error);
      return false;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!sport) {
    return (
      <Box sx={{ textAlign: 'center', my: 8 }}>
        <Typography variant="h5">
          {"競技が見つかりません"}
        </Typography>
        <Button sx={{ mt: 2 }} variant="contained" onClick={() => navigate('/')}>
          {"ホームに戻る"}
        </Button>
      </Box>
    );
  }

  // タブのリストを動的に生成
  const tabs: SportTab[] = [
    { 
      label: "試合", 
      value: 0 
    },
    { 
      label: "スケジュール", 
      icon: <ScheduleIcon />, 
      iconPosition: "start",
      value: 1,
      disabled: !sport.scheduleSettings?.timeSlots?.length
    }
  ];
  
  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <IconButton onClick={() => navigate('/')} aria-label="back" sx={{ mb: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <Typography variant="h4" component="h1" gutterBottom>
              {sport.name}
            </Typography>
            <Chip 
              label={getSportTypeLabel(sport.type)} 
              color="primary" 
              size="small" 
              sx={{ mr: 1 }} 
            />
          </Grid>
          {sport.coverImageUrl && (
            <Grid item xs={12} md={6}>
              <Box 
                component="img"
                src={sport.coverImageUrl}
                alt={sport.name}
                sx={{
                  width: '100%',
                  maxHeight: 200,
                  objectFit: 'contain',
                  borderRadius: 1
                }}
              />
            </Grid>
          )}
        </Grid>

        {sport.description && (
          <Typography variant="body1" color="text.secondary" paragraph sx={{ mt: 2 }}>
            {sport.description}
          </Typography>
        )}
        
        <Divider sx={{ my: 3 }} />
        
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
          aria-label="sport tabs"
        >
          {tabs.map((tab) => (
            <Tab 
              key={tab.value} 
              label={tab.label} 
              icon={tab.icon} 
              iconPosition={tab.iconPosition}
              disabled={tab.disabled} 
            />
          ))}
        </Tabs>
      </Box>
      
      <Box sx={{ mt: 4, display: tabValue === 0 ? 'block' : 'none' }}>
        {sport.type === 'tournament' && (
          <TournamentScoring 
            sport={sport} 
            onUpdate={handleSportUpdate}
            readOnly
          />
        )}
        {sport.type === 'roundRobin' && (
          <Box>
            <RoundRobinTable sport={sport} />
          </Box>
        )}
        {sport.type === 'ranking' && (
          <Box>
            <RankingScoring 
              sport={sport} 
              onUpdate={handleSportUpdate}
              readOnly
            />
          </Box>
        )}
        {sport.type === 'league' && (
          <Box>
            <LeagueScoring 
              sport={sport} 
              onUpdate={handleSportUpdate}
              readOnly
            />
          </Box>
        )}
      </Box>
      
      <Box sx={{ mt: 4, display: tabValue === 1 ? 'block' : 'none' }}>
        <Paper sx={{ p: 3 }}>
          <ScheduleTimeline sport={sport} />
        </Paper>
      </Box>
      
    </Container>
  );
};

export default SportPage;
