import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Divider,
  CircularProgress,
  Tab,
  Tabs,
  useTheme
} from '@mui/material';
import { Sport, Match, Team } from '../../types';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useThemeContext } from '../../contexts/ThemeContext';

interface RoundRobinViewProps {
  sport: Sport;
}

interface TeamStanding {
  team: Team;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
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
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
};

const MotionBox = motion(Box);

const RoundRobinView: React.FC<RoundRobinViewProps> = ({ sport }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { alpha } = useThemeContext();
  
  const [activeTab, setActiveTab] = useState(0);
  const [standings, setStandings] = useState<TeamStanding[]>([]);
  const [matchesByGroup, setMatchesByGroup] = useState<Record<string, Match[]>>({});
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<string[]>([]);

  useEffect(() => {
    if (sport.teams && sport.matches) {
      processData();
    }
  }, [sport]);

  const processData = () => {
    setLoading(true);
    
    try {
      // グループ分け
      const matchGroups: Record<string, Match[]> = {};
      const uniqueGroups: Set<string> = new Set();
      
      sport.matches.forEach(match => {
        const group = match.group || 'default';
        uniqueGroups.add(group);
        
        if (!matchGroups[group]) {
          matchGroups[group] = [];
        }
        
        matchGroups[group].push(match);
      });
      
      setMatchesByGroup(matchGroups);
      setGroups(Array.from(uniqueGroups));
      
      // 順位表の計算
      calculateStandings();
    } catch (error) {
      console.error('Error processing round robin data:', error);
    } finally {
      setLoading(false);
    }
  };

  // 順位表の計算
  const calculateStandings = () => {
    const winPoints = sport.roundRobinSettings?.winPoints || 3;
    const drawPoints = sport.roundRobinSettings?.drawPoints || 1;
    const losePoints = sport.roundRobinSettings?.losePoints || 0;
    const considerLosePoints = sport.roundRobinSettings?.considerLosePoints || false;
    
    // チームごとの成績を初期化
    const teamStats: Record<string, TeamStanding> = {};
    
    sport.teams.forEach(team => {
      teamStats[team.id] = {
        team,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0
      };
    });
    
    // 試合結果から成績を集計
    sport.matches.forEach(match => {
      if (match.status !== 'completed') return;
      
      const team1 = teamStats[match.team1Id];
      const team2 = teamStats[match.team2Id];
      
      if (team1 && team2) {
        // 試合数をカウント
        team1.played++;
        team2.played++;
        
        // ゴール数を集計
        team1.goalsFor += match.team1Score || 0;
        team1.goalsAgainst += match.team2Score || 0;
        team2.goalsFor += match.team2Score || 0;
        team2.goalsAgainst += match.team1Score || 0;
        
        // 勝敗を判定
        if (match.team1Score > match.team2Score) {
          // チーム1の勝ち
          team1.wins++;
          team2.losses++;
          team1.points += winPoints;
          if (considerLosePoints) team2.points += losePoints;
        } else if (match.team1Score < match.team2Score) {
          // チーム2の勝ち
          team1.losses++;
          team2.wins++;
          team2.points += winPoints;
          if (considerLosePoints) team1.points += losePoints;
        } else {
          // 引き分け
          team1.draws++;
          team2.draws++;
          team1.points += drawPoints;
          team2.points += drawPoints;
        }
      }
    });
    
    // 順位表をポイント順にソート
    const sortedStandings = Object.values(teamStats).sort((a, b) => {
      // まずポイントで比較
      if (b.points !== a.points) return b.points - a.points;
      
      // ポイントが同じ場合は得失点差で比較
      const aDiff = a.goalsFor - a.goalsAgainst;
      const bDiff = b.goalsFor - b.goalsAgainst;
      if (bDiff !== aDiff) return bDiff - aDiff;
      
      // 得失点差も同じ場合は総得点で比較
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      
      // すべて同じ場合はチーム名でソート
      return a.team.name.localeCompare(b.team.name);
    });
    
    setStandings(sortedStandings);
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const getMatchStatusColor = (status: string): "default" | "primary" | "secondary" | "success" | "error" | "info" | "warning" => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'inProgress':
        return 'warning';
      default:
        return 'default';
    }
  };

  // チーム名を取得
  const getTeamName = (teamId?: string): string => {
    if (!teamId) return t('tournament.tbd');
    const team = sport.teams.find(t => t.id === teamId);
    return team ? team.name : t('tournament.unknown');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!sport.teams || sport.teams.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body1" color="text.secondary">
          {t('roundRobin.noTeams')}
        </Typography>
      </Box>
    );
  }

  const currentGroup = groups[activeTab] || 'default';
  const matchesInCurrentGroup = matchesByGroup[currentGroup] || [];

  return (
    <MotionBox
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* グループタブ（グループが複数ある場合のみ表示） */}
      {groups.length > 1 && (
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={activeTab} onChange={handleTabChange} aria-label="group tabs">
            {groups.map((group, index) => (
              <Tab key={group} label={group === 'default' ? t('roundRobin.mainGroup') : group} />
            ))}
          </Tabs>
        </Box>
      )}
      
      {/* 順位表 */}
      <Typography variant="h6" gutterBottom>
        {t('roundRobin.standings')}
      </Typography>
      
      <TableContainer component={Paper} sx={{ mb: 4 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
              <TableCell>{t('roundRobin.rank')}</TableCell>
              <TableCell>{t('roundRobin.team')}</TableCell>
              <TableCell align="center">{t('roundRobin.played')}</TableCell>
              <TableCell align="center">{t('roundRobin.wins')}</TableCell>
              <TableCell align="center">{t('roundRobin.draws')}</TableCell>
              <TableCell align="center">{t('roundRobin.losses')}</TableCell>
              <TableCell align="center">{t('roundRobin.goalsFor')}</TableCell>
              <TableCell align="center">{t('roundRobin.goalsAgainst')}</TableCell>
              <TableCell align="center">{t('roundRobin.goalDiff')}</TableCell>
              <TableCell align="center">{t('roundRobin.points')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {standings.map((standing, index) => (
              <TableRow key={standing.team.id} 
                sx={{ 
                  bgcolor: index === 0 ? alpha(theme.palette.success.light, 0.1) : 'transparent',
                  '&:nth-of-type(even)': { bgcolor: alpha(theme.palette.action.hover, 0.1) }
                }}
              >
                <TableCell component="th" scope="row">{index + 1}</TableCell>
                <TableCell>{standing.team.name}</TableCell>
                <TableCell align="center">{standing.played}</TableCell>
                <TableCell align="center">{standing.wins}</TableCell>
                <TableCell align="center">{standing.draws}</TableCell>
                <TableCell align="center">{standing.losses}</TableCell>
                <TableCell align="center">{standing.goalsFor}</TableCell>
                <TableCell align="center">{standing.goalsAgainst}</TableCell>
                <TableCell align="center">{standing.goalsFor - standing.goalsAgainst}</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>{standing.points}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* 試合一覧 */}
      <Typography variant="h6" gutterBottom>
        {t('roundRobin.matches')}
      </Typography>
      
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
              <TableCell>{t('roundRobin.match')}</TableCell>
              <TableCell>{t('roundRobin.homeTeam')}</TableCell>
              <TableCell align="center">{t('roundRobin.score')}</TableCell>
              <TableCell>{t('roundRobin.awayTeam')}</TableCell>
              <TableCell align="center">{t('roundRobin.status')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {matchesInCurrentGroup.map((match) => (
              <TableRow key={match.id}
                sx={{ 
                  '&:nth-of-type(even)': { bgcolor: alpha(theme.palette.action.hover, 0.1) }
                }}
              >
                <TableCell>{match.matchNumber}</TableCell>
                <TableCell>{getTeamName(match.team1Id)}</TableCell>
                <TableCell align="center">
                  {match.status === 'completed' || match.status === 'inProgress'
                    ? `${match.team1Score} - ${match.team2Score}`
                    : '-'
                  }
                </TableCell>
                <TableCell>{getTeamName(match.team2Id)}</TableCell>
                <TableCell align="center">
                  <Chip 
                    label={match.status === 'completed' 
                      ? t('match.completed')
                      : match.status === 'inProgress'
                        ? t('match.inProgress')
                        : t('match.scheduled')
                    }
                    color={getMatchStatusColor(match.status)}
                    size="small"
                  />
                </TableCell>
              </TableRow>
            ))}
            
            {matchesInCurrentGroup.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    {t('roundRobin.noMatchesInGroup')}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* ルール説明 */}
      <Box sx={{ mt: 4, bgcolor: alpha(theme.palette.info.main, 0.1), p: 2, borderRadius: 1 }}>
        <Typography variant="subtitle2" gutterBottom>
          {t('roundRobin.pointsSystem')}
        </Typography>
        <Typography variant="body2">
          {t('roundRobin.win')}: {sport.roundRobinSettings?.winPoints || 3} {t('roundRobin.pts')}, 
          {t('roundRobin.draw')}: {sport.roundRobinSettings?.drawPoints || 1} {t('roundRobin.pts')}, 
          {t('roundRobin.loss')}: {sport.roundRobinSettings?.losePoints || 0} {t('roundRobin.pts')}
        </Typography>
      </Box>
    </MotionBox>
  );
};

export default RoundRobinView;
