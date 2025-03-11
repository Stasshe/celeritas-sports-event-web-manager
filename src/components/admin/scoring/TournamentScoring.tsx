import React, { useState, useEffect, useMemo, memo } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  IconButton,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
  Stack,
  Card,
  CardContent,
  Tooltip,
  useTheme,
  FormControlLabel,
  Switch
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Shuffle as ShuffleIcon,
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { Sport, Match, Team } from '../../../types';
import { useTranslation } from 'react-i18next';
import { useThemeContext } from '../../../contexts/ThemeContext';
import { SingleEliminationBracket, SVGViewer } from '@g-loot/react-tournament-brackets';
import MatchCard from './components/MatchCard';
import MatchEditDialog from './components/MatchEditDialog';
import TournamentMatchPlacer from './components/TournamentMatchPlacer';
import TournamentBuilder from './components/TournamentBuilder';

interface TournamentScoringProps {
  sport: Sport;
  onUpdate: (updatedSport: Sport) => void;
}

const TournamentScoring: React.FC<TournamentScoringProps> = ({ sport, onUpdate }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { alpha } = useThemeContext();

  // 試合データの状態管理
  const [matches, setMatches] = useState<Match[]>(sport.matches || []);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [matchDialogOpen, setMatchDialogOpen] = useState(false);
  const [hasThirdPlace, setHasThirdPlace] = useState(false);

  // トーナメント表示用のデータ
  const bracketMatches = useMemo(() => {
    if (!sport.teams || !matches.length) return [];

    // 最大ラウンド数を取得
    const maxRound = Math.max(...matches.map(m => m.round));
    
    const getMatchState = (status: string): 'DONE' | 'PLAYING' | 'SCHEDULED' => {
      switch (status) {
        case 'completed':
          return 'DONE';
        case 'inProgress':
          return 'PLAYING';
        default:
          return 'SCHEDULED';
      }
    };

    return matches
      .sort((a, b) => {
        // ラウンドとマッチナンバーでソート
        if (a.round !== b.round) return a.round - b.round;
        // 3位決定戦は最後に
        if (a.matchNumber === 0) return 1;
        if (b.matchNumber === 0) return -1;
        return a.matchNumber - b.matchNumber;
      })
      .map(match => ({
        id: match.id,
        name: match.matchNumber === 0
          ? t('tournament.thirdPlace')
          : match.round === maxRound && match.matchNumber === 1
          ? t('tournament.final')
          : `${t('tournament.round')} ${match.round} - ${match.matchNumber}`,
        nextMatchId: match.matchNumber === 0 ? null :
          matches.find(m =>
            m.round === match.round + 1 &&
            Math.ceil(match.matchNumber / 2) === m.matchNumber
          )?.id || null,
        tournamentRoundText: match.round.toString(),
        startTime: match.date || new Date().toISOString(),
        state: getMatchState(match.status),
        participants: [
          {
            id: match.team1Id || `seed-${match.round}-${match.matchNumber}-1`,
            name: match.team1Id 
              ? sport.teams.find(t => t.id === match.team1Id)?.name || t('tournament.tbd')
              : t('tournament.tbd'),
            score: match.team1Score,
            isWinner: Boolean(match.winnerId === match.team1Id),
            status: null
          },
          {
            id: match.team2Id || `seed-${match.round}-${match.matchNumber}-2`,
            name: match.team2Id
              ? sport.teams.find(t => t.id === match.team2Id)?.name || t('tournament.tbd')
              : t('tournament.tbd'),
            score: match.team2Score,
            isWinner: Boolean(match.winnerId === match.team2Id),
            status: null
          }
        ]
      }));
  }, [matches, sport.teams, t]);

  // ラウンドごとの試合データを構築（修正）
  const roundMatches = useMemo(() => {
    if (!matches || matches.length === 0) {
      return [];
    }
    const regularMatches = matches.filter(m => m.matchNumber !== 0);
    const maxRound = Math.max(...regularMatches.map(m => m.round), 0);
    const rounds: Match[][] = [];
    
    // 各ラウンドの試合を格納
    for (let i = 1; i <= maxRound; i++) {
      const matchesInRound = regularMatches
        .filter(m => m.round === i)
        .sort((a, b) => a.matchNumber - b.matchNumber);
      if (matchesInRound.length > 0) {
        rounds.push(matchesInRound);
      }
    }
    // 3位決定戦があれば最後に追加
    const thirdPlaceMatch = matches.find(m => m.matchNumber === 0);
    if (thirdPlaceMatch) {
      rounds.push([thirdPlaceMatch]);
    }
    return rounds;
  }, [matches]);

  // 試合の編集
  const handleEditMatch = (match: Match) => {
    setSelectedMatch(match);
    setMatchDialogOpen(true);
  };

  // 試合の更新
  const handleMatchUpdate = (updatedMatch: Match) => {
    const newMatches = matches.map(m => 
      m.id === updatedMatch.id ? updatedMatch : m
    );
    setMatches(newMatches);
    onUpdate({ ...sport, matches: newMatches });
    setMatchDialogOpen(false);
  };

  const handleMatchesCreate = (newMatches: Match[], selectedTeams: Team[]) => {
    setMatches(newMatches);
    onUpdate({ 
      ...sport, 
      matches: newMatches,
      teams: selectedTeams  // 選択されたチーム情報を更新
    });
  };

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">
            {t('tournament.settings')}
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={hasThirdPlace}
                onChange={(e) => {
                  setHasThirdPlace(e.target.checked);
                  // 3位決定戦の追加/削除ロジックをここに実装
                }}
              />
            }
            label={t('tournament.hasThirdPlace')}
          />
        </Box>
      </Paper>

      <TournamentBuilder
        sport={sport}
        onMatchesCreate={handleMatchesCreate}
      />
      
      {matches.length > 0 ? (
        <>
          {/* トーナメント図の表示 */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Box sx={{ 
              overflowX: 'auto',
              overflowY: 'hidden',
              width: '100%',
              position: 'relative'
            }}>
              <Box sx={{ 
                height: Math.max(500, matches.length * 100),
                minWidth: Math.max(1200, matches.length * 250),
                position: 'relative'
              }}>
                <SingleEliminationBracket
                  matches={bracketMatches}
                  matchComponent={CustomMatch}
                  options={{
                    style: {
                      roundHeader: {
                        backgroundColor: theme.palette.primary.main,
                        color: theme.palette.primary.contrastText,
                        fontWeight: 'bold'
                      },
                      connectorColor: theme.palette.divider,
                      connectorColorHighlight: theme.palette.primary.main
                    }
                  }}
                />
              </Box>
            </Box>
          </Paper>

          {/* ラウンドごとの試合リスト */}
          <Grid container spacing={2}>
            {roundMatches.length > 0 ? (
              roundMatches.map((matches, roundIndex) => (
                <Grid item xs={12} md={6} lg={4} key={roundIndex}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      {matches[0]?.matchNumber === 0
                        ? t('tournament.thirdPlace')
                        : roundIndex === roundMatches.length - 2 && !matches.find(m => m.matchNumber === 0)
                        ? t('tournament.final')
                        : t('tournament.round', { number: roundIndex + 1 })}
                    </Typography>
                    <Stack spacing={1}>
                      {matches.map(match => (
                        <Card key={match.id}>
                          <CardContent>
                            <MatchCard
                              match={match}
                              sport={sport}
                              onEdit={() => handleEditMatch(match)}
                            />
                          </CardContent>
                        </Card>
                      ))}
                    </Stack>
                  </Paper>
                </Grid>
              ))
            ) : (
              <Grid item xs={12}>
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                  <Typography color="text.secondary">
                    {t('tournament.noMatches')}
                  </Typography>
                </Paper>
              </Grid>
            )}
          </Grid>
        </>
      ) : (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">
            {t('tournament.noMatches')}
          </Typography>
        </Paper>
      )}

      {/* ダイアログのパフォーマンス最適化 */}
      {matchDialogOpen && selectedMatch && (
        <MatchEditDialog
          open={true}
          match={selectedMatch}
          sport={sport}
          onSave={handleMatchUpdate}
          teamRosters={sport.roster?.grade1 || {}}
          onClose={() => setMatchDialogOpen(false)}
        />
      )}
    </Box>
  );
};

// カスタムマッチコンポーネント
const CustomMatch = memo(({ match, onMatchClick, onPartyClick, topParty, bottomParty, ...props }: any) => {
  const theme = useTheme();
  const { t } = useTranslation();
  
  return (
    <foreignObject
      x={props.x - props.width / 2}
      y={props.y - props.height / 2}
      width={props.width}
      height={props.height}
    >
      <Box
        sx={{
          width: '100%',
          height: '100%',
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          bgcolor: 'background.paper',
          boxShadow: 1,
          overflow: 'hidden'
        }}
      >
        <Box sx={{ 
          p: 0.5, 
          bgcolor: match.isSeed ? 'primary.light' : 'grey.100',
          borderBottom: 1, 
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <Typography variant="caption" noWrap>
            {match.name}
          </Typography>
          {match.isSeed && (
            <Chip
              label={t('tournament.seed')}
              size="small"
              color="primary"
              sx={{ height: 16 }}
            />
          )}
        </Box>
        
        {/* 上側のチーム */}
        <Box
          sx={{
            p: 0.5,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            bgcolor: topParty.isWinner ? 'success.light' : 'transparent',
            borderBottom: 1,
            borderColor: 'divider',
            '&:hover': { bgcolor: 'action.hover' }
          }}
          onClick={() => onPartyClick && onPartyClick(topParty)}
        >
          <Typography variant="body2" noWrap sx={{ flex: 1, fontWeight: topParty.isWinner ? 'bold' : 'normal' }}>
            {topParty.name || 'Unknown'}
          </Typography>
          <Typography variant="body2" sx={{ ml: 1, fontWeight: 'bold' }}>
            {topParty.score ?? '-'}
          </Typography>
        </Box>
        
        {/* 下側のチーム */}
        <Box
          sx={{
            p: 0.5,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            bgcolor: bottomParty.isWinner ? 'success.light' : 'transparent',
            '&:hover': { bgcolor: 'action.hover' }
          }}
          onClick={() => onPartyClick && onPartyClick(bottomParty)}
        >
          <Typography variant="body2" noWrap sx={{ flex: 1, fontWeight: bottomParty.isWinner ? 'bold' : 'normal' }}>
            {bottomParty.name || 'Unknown'}
          </Typography>
          <Typography variant="body2" sx={{ ml: 1, fontWeight: 'bold' }}>
            {bottomParty.score ?? '-'}
          </Typography>
        </Box>
      </Box>
    </foreignObject>
  );
});

export default TournamentScoring;
