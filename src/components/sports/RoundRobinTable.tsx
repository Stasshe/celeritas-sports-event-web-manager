import React, { useMemo } from 'react';
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
  Tooltip,
  useTheme
} from '@mui/material';
import { Sport, Team, Match } from '../../types';
import { useTranslation } from 'react-i18next';

interface RoundRobinTableProps {
  sport: Sport;
}

interface TeamStats {
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

const RoundRobinTable: React.FC<RoundRobinTableProps> = ({ sport }) => {
  const { t } = useTranslation();
  const theme = useTheme();

  // チームの統計情報を計算
  const teamStats = useMemo(() => {
    if (!sport.teams || !sport.matches) {
      return [];
    }

    const stats: Record<string, TeamStats> = {};
    
    // チームの初期統計情報を作成
    sport.teams.forEach(team => {
      stats[team.id] = {
        teamId: team.id,
        teamName: team.name,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0
      };
    });

    // 試合結果から統計情報を更新
    sport.matches.forEach(match => {
      // 試合がまだ行われていない場合はスキップ
      if (match.status !== 'completed') {
        return;
      }

      const team1Stats = stats[match.team1Id];
      const team2Stats = stats[match.team2Id];

      if (team1Stats && team2Stats) {
        // 試合数を増やす
        team1Stats.played += 1;
        team2Stats.played += 1;

        // ゴール情報を更新
        team1Stats.goalsFor += match.team1Score;
        team1Stats.goalsAgainst += match.team2Score;
        team2Stats.goalsFor += match.team2Score;
        team2Stats.goalsAgainst += match.team1Score;

        // 勝敗を更新
        if (match.team1Score > match.team2Score) {
          team1Stats.won += 1;
          team2Stats.lost += 1;
          team1Stats.points += 3; // 勝利は3ポイント
        } else if (match.team1Score < match.team2Score) {
          team1Stats.lost += 1;
          team2Stats.won += 1;
          team2Stats.points += 3; // 勝利は3ポイント
        } else {
          team1Stats.drawn += 1;
          team2Stats.drawn += 1;
          team1Stats.points += 1; // 引き分けは1ポイント
          team2Stats.points += 1;
        }
      }
    });

    // ポイント順にソート（同点の場合は得失点差、さらに同じ場合は得点数で）
    return Object.values(stats).sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      const goalDiffA = a.goalsFor - a.goalsAgainst;
      const goalDiffB = b.goalsFor - b.goalsAgainst;
      if (goalDiffB !== goalDiffA) {
        return goalDiffB - goalDiffA;
      }
      return b.goalsFor - a.goalsFor;
    });
  }, [sport.teams, sport.matches]);

  // 対戦表を作成
  const matchGrid = useMemo(() => {
    if (!sport.teams || !sport.matches) {
      return {} as Record<string, Record<string, Match | null>>;
    }

    const grid: Record<string, Record<string, Match | null>> = {};
    
    // グリッドを初期化
    sport.teams.forEach(team1 => {
      grid[team1.id] = {};
      sport.teams.forEach(team2 => {
        grid[team1.id][team2.id] = null;
      });
    });

    // 試合情報をグリッドに配置
    sport.matches.forEach(match => {
      grid[match.team1Id][match.team2Id] = match;
      // 逆方向（チーム2視点でのチーム1との対戦）もNULLではなく同じ試合を参照するように
      // この値は表示上使わないが、両方とも同じ試合情報を参照することでデータ整合性を保つ
      grid[match.team2Id][match.team1Id] = match;
    });

    return grid;
  }, [sport.teams, sport.matches]);

  const matchesByGroup: Record<string, Record<string, Match | null>> = sport.matches.reduce((acc, match) => {
    const group = match.group || 'default';
    if (!acc[group]) {
      acc[group] = {};
    }
    acc[group][match.id] = match;
    return acc;
  }, {} as Record<string, Record<string, Match | null>>);

  const groupKeys = Object.keys(matchesByGroup);
  groupKeys.forEach(groupKey => {
    const groupMatches = matchesByGroup[groupKey];
    // ...existing code...
  });

  if (!sport.teams || sport.teams.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', my: 4 }}>
        <Typography variant="h6" color="text.secondary">
          {t('roundRobin.noTeams')}
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* 成績表 */}
      <Typography variant="h6" gutterBottom>
        {t('roundRobin.standings')}
      </Typography>
      <TableContainer component={Paper} sx={{ mb: 4 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: theme.palette.primary.light }}>
              <TableCell>{t('roundRobin.rank')}</TableCell>
              <TableCell>{t('roundRobin.team')}</TableCell>
              <TableCell align="center">{t('roundRobin.played')}</TableCell>
              <TableCell align="center">{t('roundRobin.won')}</TableCell>
              <TableCell align="center">{t('roundRobin.drawn')}</TableCell>
              <TableCell align="center">{t('roundRobin.lost')}</TableCell>
              <TableCell align="center">{t('roundRobin.goalsFor')}</TableCell>
              <TableCell align="center">{t('roundRobin.goalsAgainst')}</TableCell>
              <TableCell align="center">{t('roundRobin.goalDiff')}</TableCell>
              <TableCell align="center">{t('roundRobin.points')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {teamStats.map((stats, index) => (
              <TableRow key={stats.teamId} hover>
                <TableCell>{index + 1}</TableCell>
                <TableCell>{stats.teamName}</TableCell>
                <TableCell align="center">{stats.played}</TableCell>
                <TableCell align="center">{stats.won}</TableCell>
                <TableCell align="center">{stats.drawn}</TableCell>
                <TableCell align="center">{stats.lost}</TableCell>
                <TableCell align="center">{stats.goalsFor}</TableCell>
                <TableCell align="center">{stats.goalsAgainst}</TableCell>
                <TableCell align="center">{stats.goalsFor - stats.goalsAgainst}</TableCell>
                <TableCell align="center">{stats.points}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 対戦表 */}
      <Typography variant="h6" gutterBottom>
        {t('roundRobin.matchups')}
      </Typography>
      <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: theme.palette.primary.light }}>
              <TableCell></TableCell>
              {sport.teams.map(team => (
                <TableCell key={team.id} align="center">{team.name}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {sport.teams.map(team1 => (
              <TableRow key={team1.id} hover>
                <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                  {team1.name}
                </TableCell>
                {sport.teams.map(team2 => {
                  const match = team1.id === team2.id ? null : matchGrid[team1.id]?.[team2.id];
                  
                  return (
                    <TableCell 
                      key={team2.id} 
                      align="center" 
                      sx={{
                        backgroundColor: team1.id === team2.id ? theme.palette.action.hover : 'inherit',
                        ...(match?.status === 'completed' ? (
                          match.team1Id === team1.id && match.team1Score > match.team2Score || 
                          match.team2Id === team1.id && match.team2Score > match.team1Score
                        ) ? { backgroundColor: theme.palette.success.light } : {}
                        : {})
                      }}
                    >
                      {team1.id === team2.id ? (
                        '-'
                      ) : match ? (
                        <Tooltip title={match.date ? new Date(match.date).toLocaleDateString() : ''}>
                          <Box>
                            {match.team1Id === team1.id ? (
                              `${match.team1Score} - ${match.team2Score}`
                            ) : (
                              `${match.team2Score} - ${match.team1Score}`
                            )}
                          </Box>
                        </Tooltip>
                      ) : (
                        'TBD'
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default RoundRobinTable;
