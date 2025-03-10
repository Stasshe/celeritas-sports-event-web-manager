import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Button,
  Divider,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Chip,
  Stack,
  Grid,
  useTheme,
  alpha
} from '@mui/material';
import {
  DragHandle as DragIcon,
  Shuffle as ShuffleIcon,
  RestartAlt as ResetIcon,
  Check as CheckIcon
} from '@mui/icons-material';
import { Sport, Team, Player } from '../../../types/index';
import { useTranslation } from 'react-i18next';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

interface TournamentScoringProps {
  sport: Sport;
  onSave: (seededTeams: (Team | null)[]) => void;
  onCancel: () => void;
  firstRoundMatchCount: number;
}

const TournamentScoring: React.FC<TournamentScoringProps> = ({ 
  sport, 
  onSave, 
  onCancel,
  firstRoundMatchCount 
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  
  const [availableTeams, setAvailableTeams] = useState<Team[]>([]);
  const [seededTeams, setSeededTeams] = useState<(Team | null)[]>([]);
  const [teamRosters, setTeamRosters] = useState<Record<string, Player[]>>({});
  
  // 初期化 - 名簿とシード情報を設定
  useEffect(() => {
    if (sport.teams) {
      // 既存の試合から既に配置されたチームを取得
      const assignedTeamIds = new Set<string>();
      if (sport.matches) {
        sport.matches.filter(m => m.round === 1).forEach(match => {
          if (match.team1Id) assignedTeamIds.add(match.team1Id);
          if (match.team2Id) assignedTeamIds.add(match.team2Id);
        });
      }
      
      // 利用可能なチームと既にシードされたチームを分ける
      const available = [...sport.teams].filter(team => !assignedTeamIds.has(team.id));
      
      // ロスター情報を整理
      const rosterByTeam: Record<string, Player[]> = {};
      
      // rosterをフラットな配列として処理（既に整形済みのデータとして扱う）
      const players: Player[] = [];
      
      // チーム名簿データを処理
      if (sport.roster) {
        // 学年ごとの処理
        ['grade1', 'grade2', 'grade3'].forEach(gradeKey => {
          const gradeData = sport.roster?.[gradeKey as keyof typeof sport.roster];
          if (gradeData) {
            // クラスごとの処理
            Object.entries(gradeData).forEach(([className, names]) => {
              // 各名前をプレイヤーとして追加
              names.forEach((name, idx) => {
                const player: Player = {
                  id: `${gradeKey}-${className}-${idx}`,
                  name,
                  grade: parseInt(gradeKey.replace('grade', '')) as 1 | 2 | 3,
                  teamId: '' // デフォルトは空のチームID
                };
                players.push(player);
              });
            });
          }
        });
        
        // チームに割り当て済みのプレイヤーがいる場合は、そのデータを使用
        players.forEach(player => {
          if (player.teamId) {
            if (!rosterByTeam[player.teamId]) {
              rosterByTeam[player.teamId] = [];
            }
            rosterByTeam[player.teamId].push(player);
          }
        });
      }
      
      // シード用のチーム配列を作成（第1ラウンドの試合数 × 2）
      const seedCount = firstRoundMatchCount * 2;
      const seeds = Array(seedCount).fill(null);
      
      // 既存のマッチから既にシードされているチームを配置
      if (sport.matches) {
        const firstRoundMatches = sport.matches.filter(m => m.round === 1)
          .sort((a, b) => a.matchNumber - b.matchNumber);
        
        firstRoundMatches.forEach(match => {
          const idx1 = (match.matchNumber - 1) * 2;
          const idx2 = idx1 + 1;
          
          if (match.team1Id) {
            const team = sport.teams.find(t => t.id === match.team1Id) || null;
            seeds[idx1] = team;
            // 利用可能リストから削除
            const availIdx = available.findIndex(t => t.id === match.team1Id);
            if (availIdx >= 0) {
              available.splice(availIdx, 1);
            }
          }
          
          if (match.team2Id) {
            const team = sport.teams.find(t => t.id === match.team2Id) || null;
            seeds[idx2] = team;
            // 利用可能リストから削除
            const availIdx = available.findIndex(t => t.id === match.team2Id);
            if (availIdx >= 0) {
              available.splice(availIdx, 1);
            }
          }
        });
      }
      
      setAvailableTeams(available);
      setSeededTeams(seeds);
      setTeamRosters(rosterByTeam);
    }
  }, [sport, firstRoundMatchCount]);

  // ドラッグ＆ドロップ処理
  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const { source, destination } = result;
    
    // 利用可能なチームからシードへ
    if (source.droppableId === 'available-teams' && destination.droppableId.startsWith('seed-')) {
      const seedIndex = parseInt(destination.droppableId.split('-')[1]);
      const teamIndex = source.index;
      
      const newAvailableTeams = [...availableTeams];
      const team = newAvailableTeams.splice(teamIndex, 1)[0];
      
      const newSeededTeams = [...seededTeams];
      
      // 既存のチームを入れ替える場合
      if (newSeededTeams[seedIndex]) {
        newAvailableTeams.push(newSeededTeams[seedIndex]!);
      }
      
      newSeededTeams[seedIndex] = team;
      
      setAvailableTeams(newAvailableTeams);
      setSeededTeams(newSeededTeams);
    }
    
    // シード間での入れ替え
    else if (source.droppableId.startsWith('seed-') && destination.droppableId.startsWith('seed-')) {
      const sourceSeedIndex = parseInt(source.droppableId.split('-')[1]);
      const destSeedIndex = parseInt(destination.droppableId.split('-')[1]);
      
      const newSeededTeams = [...seededTeams];
      const temp = newSeededTeams[sourceSeedIndex];
      newSeededTeams[sourceSeedIndex] = newSeededTeams[destSeedIndex];
      newSeededTeams[destSeedIndex] = temp;
      
      setSeededTeams(newSeededTeams);
    }
    
    // シードから利用可能なチームへ
    else if (source.droppableId.startsWith('seed-') && destination.droppableId === 'available-teams') {
      const seedIndex = parseInt(source.droppableId.split('-')[1]);
      
      const newSeededTeams = [...seededTeams];
      const team = newSeededTeams[seedIndex];
      newSeededTeams[seedIndex] = null;
      
      if (team) {
        const newAvailableTeams = [...availableTeams, team];
        setAvailableTeams(newAvailableTeams);
      }
      
      setSeededTeams(newSeededTeams);
    }
  };
  
  // 自動シード処理
  const handleRandomSeed = () => {
    const combinedTeams = [...availableTeams];
    seededTeams.forEach(team => {
      if (team) combinedTeams.push(team);
    });
    
    // チームをランダムにシャッフル
    const shuffled = [...combinedTeams].sort(() => 0.5 - Math.random());
    
    // シードに配置
    const newSeededTeams = Array(seededTeams.length).fill(null);
    const newAvailableTeams = [...shuffled];
    
    for (let i = 0; i < Math.min(seededTeams.length, shuffled.length); i++) {
      newSeededTeams[i] = newAvailableTeams.shift() || null;
    }
    
    setSeededTeams(newSeededTeams);
    setAvailableTeams(newAvailableTeams);
  };
  
  // シードのリセット処理
  const handleClearSeeds = () => {
    const allTeams = [...availableTeams];
    seededTeams.forEach(team => {
      if (team) allTeams.push(team);
    });
    
    setAvailableTeams(allTeams);
    setSeededTeams(Array(seededTeams.length).fill(null));
  };
  
  // シードを保存
  const handleSave = () => {
    onSave(seededTeams);
  };

  // チームのロスター情報を表示
  const renderTeamRoster = (team: Team | null) => {
    if (!team) return null;
    
    const roster = teamRosters[team.id] || [];
    
    if (roster.length === 0) {
      return (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
          {t('tournament.noPlayers')}
        </Typography>
      );
    }
    
    return (
      <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
        {roster.slice(0, 3).map(player => (
          <Chip
            key={player.id}
            label={player.name}
            size="small"
            variant="outlined"
            sx={{ fontSize: '0.7rem' }}
          />
        ))}
        {roster.length > 3 && (
          <Chip
            label={`+${roster.length - 3}`}
            size="small"
            sx={{ fontSize: '0.7rem' }}
          />
        )}
      </Stack>
    );
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
        <Typography variant="h6">
          {t('tournament.seeding')}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<ShuffleIcon />}
            onClick={handleRandomSeed}
            size="small"
          >
            {t('tournament.randomSeed')}
          </Button>
          <Button
            variant="outlined"
            startIcon={<ResetIcon />}
            onClick={handleClearSeeds}
            color="warning"
            size="small"
          >
            {t('tournament.clearSeeds')}
          </Button>
        </Stack>
      </Box>
      
      <Typography variant="body2" color="text.secondary" paragraph>
        {t('tournament.seedingInstructions')}
      </Typography>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Grid container spacing={2}>
          {/* 左側：利用可能なチーム */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="subtitle1" gutterBottom>
                {t('tournament.availableTeams')}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Droppable droppableId="available-teams">
                {(provided) => (
                  <Box
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    sx={{ minHeight: 100 }}
                  >
                    {availableTeams.length === 0 ? (
                      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', p: 2 }}>
                        {t('tournament.noAvailableTeams')}
                      </Typography>
                    ) : (
                      availableTeams.map((team, index) => (
                        <Draggable key={team.id} draggableId={team.id} index={index}>
                          {(provided, snapshot) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              elevation={snapshot.isDragging ? 6 : 1}
                              sx={{
                                mb: 1,
                                transition: 'all 0.2s',
                                transform: snapshot.isDragging ? 'scale(1.02)' : 'scale(1)',
                                bgcolor: snapshot.isDragging ? 'background.paper' : 'transparent'
                              }}
                            >
                              <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <DragIcon fontSize="small" sx={{ mr: 1, opacity: 0.5 }} />
                                  <Box sx={{ flexGrow: 1 }}>
                                    <Typography variant="body2" fontWeight="bold">
                                      {team.name}
                                    </Typography>
                                    {renderTeamRoster(team)}
                                  </Box>
                                </Box>
                              </CardContent>
                            </Card>
                          )}
                        </Draggable>
                      ))
                    )}
                    {provided.placeholder}
                  </Box>
                )}
              </Droppable>
            </Paper>
          </Grid>

          {/* 右側：シード配置 */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                {t('tournament.seedPositions')}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                {seededTeams.map((team, index) => (
                  <Grid item xs={12} sm={6} md={4} key={`seed-${index}`}>
                    <Droppable droppableId={`seed-${index}`}>
                      {(provided, snapshot) => (
                        <Paper
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          variant="outlined"
                          sx={{
                            p: 1,
                            height: '100%',
                            minHeight: 80,
                            bgcolor: snapshot.isDraggingOver ? alpha(theme.palette.primary.light, 0.05) : 'transparent',
                            borderColor: snapshot.isDraggingOver ? theme.palette.primary.main : theme.palette.divider
                          }}
                        >
                          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                            {t('tournament.seedNumber', { number: index + 1 })}
                          </Typography>
                          
                          {team ? (
                            <Draggable draggableId={`seeded-${team.id}`} index={0}>
                              {(provided, snapshot) => (
                                <Card
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  elevation={snapshot.isDragging ? 6 : 1}
                                  sx={{
                                    transition: 'all 0.2s',
                                    transform: snapshot.isDragging ? 'scale(1.02)' : 'scale(1)',
                                    bgcolor: snapshot.isDragging ? 'background.paper' : 'transparent',
                                    borderLeft: `3px solid ${theme.palette.primary.main}`
                                  }}
                                >
                                  <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                      <DragIcon fontSize="small" sx={{ mr: 1, opacity: 0.5 }} />
                                      <Box sx={{ flexGrow: 1 }}>
                                        <Typography variant="body2" fontWeight="bold">
                                          {team.name}
                                        </Typography>
                                        {renderTeamRoster(team)}
                                      </Box>
                                    </Box>
                                  </CardContent>
                                </Card>
                              )}
                            </Draggable>
                          ) : (
                            <Box
                              sx={{
                                height: 40,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '1px dashed',
                                borderColor: theme.palette.divider,
                                borderRadius: 1
                              }}
                            >
                              <Typography variant="body2" color="text.secondary">
                                {t('tournament.dropTeamHere')}
                              </Typography>
                            </Box>
                          )}
                          {provided.placeholder}
                        </Paper>
                      )}
                    </Droppable>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      </DragDropContext>
      
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
        <Button onClick={onCancel} sx={{ mr: 1 }}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSave}
          startIcon={<CheckIcon />}
          disabled={seededTeams.some(team => team === null)}
        >
          {t('tournament.saveSeeding')}
        </Button>
      </Box>
    </Box>
  );
};

export default TournamentScoring;
