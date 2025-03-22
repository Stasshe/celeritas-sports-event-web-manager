import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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

import { Sport, Match, Team } from '../../../types';
import { useTranslation } from 'react-i18next';
import { useThemeContext } from '../../../contexts/ThemeContext';
import { SingleEliminationBracket, SVGViewer, Participant } from '@g-loot/react-tournament-brackets';
import MatchCard from './components/MatchCard';
import MatchEditDialog from './components/MatchEditDialog';
//import TournamentMatchPlacer from './components/TournamentMatchPlacer';
import TournamentBuilder from './components/TournamentBuilder';
import { TournamentStructureHelper } from './components/TournamentStructureHelper';
import { generateBracketMatches } from '../../../utils/tournamentViewHelper';

// インターフェース部分を修正
interface TournamentScoringProps {
  sport: Sport;
  onUpdate: (updatedSport: Sport) => void;
  readOnly?: boolean; // 読み取り専用モード
  hideBuilder?: boolean; // ビルダーを非表示にするオプション
}

// トーナメントブラケットのmatchComponentの型定義を追加
interface MatchComponentProps {
  match: {
    id: string;
    name: string;
    nextMatchId: string | null;
    tournamentRoundText: string;
    startTime: string;
    state: 'DONE' | 'PLAYING' | 'SCHEDULED';
    participants: Participant[];
  };
  onMatchClick?: () => void;
  onPartyClick?: (party: Participant) => void;
  topParty: Participant;
  bottomParty: Participant;
  x: number;
  y: number;
  width: number;
  height: number;
}

const TournamentScoring: React.FC<TournamentScoringProps> = ({ 
  sport, 
  onUpdate,
  readOnly = false, // デフォルトは編集可能
  hideBuilder = false // デフォルトはビルダーを表示
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { alpha } = useThemeContext();

  // 試合データの状態管理
  const [matches, setMatches] = useState<Match[]>(sport.matches || []);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [matchDialogOpen, setMatchDialogOpen] = useState(false);
  const [hasThirdPlace, setHasThirdPlace] = useState(false);
  const [isDialogProcessing, setIsDialogProcessing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [updateQueue, setUpdateQueue] = useState<Sport | null>(null);

  // チームデータの状態管理を追加
  const [teams, setTeams] = useState<Team[]>(sport.teams || []);

  // SVG要素を大文字で定義
  const ForeignObject = 'foreignObject';

  // 参加者の状態を判定する関数を修正
  const getParticipantStatus = (teamId: string | null, match: Match): 'no-team' | 'waiting' | null => {
    if (!teamId) return 'no-team';

    // シード試合の判定
    if (TournamentStructureHelper.isNoTeam(teamId, match, matches)) return 'no-team';

    // 両チームが揃っているかチェック
    if (match.team1Id && match.team2Id) {
      const team1HasPrevious = matches.some(m => 
        m.round === match.round - 1 && 
        (m.team1Id === match.team1Id || m.team2Id === match.team1Id)
      );
      const team2HasPrevious = matches.some(m => 
        m.round === match.round - 1 && 
        (m.team1Id === match.team2Id || m.team2Id === match.team2Id)
      );

      // 両チームとも前の試合がある場合は通常表示
      if (team1HasPrevious && team2HasPrevious) return null;
    }

    // このチームの前の試合をチェック
    const previousMatch = matches.find(m => 
      m.round === match.round - 1 && 
      (m.team1Id === teamId || m.team2Id === teamId)
    );

    // 前の試合がある場合かつその勝者が未定の場合は待機状態
    if (previousMatch && !previousMatch.winnerId) return 'waiting';

    // 対戦相手の有無をチェック
    const hasOpponent = match.team1Id && match.team2Id;
    if (!hasOpponent) return 'waiting';

    return null;
  };

  // 試合の状態を判定する関数を追加
  const getMatchState = (match: Match): 'DONE' | 'PLAYING' | 'SCHEDULED' => {
    if (match.status === 'completed' || match.winnerId) return 'DONE';
    if (match.team1Score > 0 || match.team2Score > 0) return 'PLAYING';
    return 'SCHEDULED';
  };

  // トーナメント表示用のデータ - メインブラケットと3位決定戦ブラケットを分離
  const { mainBracketMatches, thirdPlaceMatch } = useMemo(() => {
    const formattedMatches = generateBracketMatches(sport, t);
    console.log("All formatted matches:", formattedMatches);
    
    // 3位決定戦の試合を抽出（matchNumber === 0 または名前が3位決定戦）
    const thirdPlaceMatches = formattedMatches.filter(match => {
      // matchの名前が "tournament.thirdPlace" に対応する翻訳文字列と一致するか
      const isThirdPlaceByName = typeof match.name === 'string' && 
                                match.name === t('tournament.thirdPlace');
      
      // IDが"third_place"を含むか
      const isThirdPlaceById = match.id.includes('third_place');
      
      return isThirdPlaceByName || isThirdPlaceById;
    });
    
    console.log("Third place matches found:", thirdPlaceMatches);
    
    // メインブラケットの試合（3位決定戦以外）
    const mainMatches = formattedMatches.filter(match => {
      const isThirdPlaceByName = typeof match.name === 'string' && 
                                match.name === t('tournament.thirdPlace');
      const isThirdPlaceById = match.id.includes('third_place');
      
      return !(isThirdPlaceByName || isThirdPlaceById);
    }).map(match => ({
      ...match,
      name: typeof match.name === 'object' ? 
        t('tournament.round', { round: match.tournamentRoundText }) :
        match.name
    }));
    
    // 実際の試合データから3位決定戦を探す（バックアップとして）
    let thirdPlaceMatchData = thirdPlaceMatches.length > 0 
      ? thirdPlaceMatches[0] 
      : null;
    
    // 3位決定戦が見つからなければ、matchNumber === 0 の試合を探す
    if (!thirdPlaceMatchData) {
      const matchNumberZero = matches.find(m => m.matchNumber === 0);
      if (matchNumberZero) {
        // 3位決定戦の試合データを手動で作成
        const team1 = sport.teams.find(t => t.id === matchNumberZero.team1Id);
        const team2 = sport.teams.find(t => t.id === matchNumberZero.team2Id);
        
        thirdPlaceMatchData = {
          id: matchNumberZero.id,
          name: t('tournament.thirdPlace'),
          nextMatchId: null,
          tournamentRoundText: "Final",
          startTime: matchNumberZero.date || new Date().toISOString(),
          state: matchNumberZero.status === 'completed' ? 'DONE' : 
                 matchNumberZero.status === 'inProgress' ? 'PLAYING' : 'SCHEDULED',
          participants: [
            {
              id: matchNumberZero.team1Id || 'team1',
              name: team1?.name || t('tournament.tbd'),
              score: matchNumberZero.team1Score,
              isWinner: matchNumberZero.winnerId === matchNumberZero.team1Id
            },
            {
              id: matchNumberZero.team2Id || 'team2',
              name: team2?.name || t('tournament.tbd'),
              score: matchNumberZero.team2Score,
              isWinner: matchNumberZero.winnerId === matchNumberZero.team2Id
            }
          ]
        };
      }
    }
    
    return { 
      mainBracketMatches: mainMatches,
      thirdPlaceMatch: thirdPlaceMatchData
    };
  }, [sport, t, matches]);

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
    if (readOnly) return;
    setSelectedMatch(match);
    setMatchDialogOpen(true);
  };

  // 試合の更新（即時保存用）- 3位決定戦対応版
  const handleMatchUpdate = async (updatedMatch: Match) => {
    if (readOnly) return;
    setIsDialogProcessing(true);
    try {
      const status = TournamentStructureHelper.getMatchStatus(updatedMatch);
      const newMatch = {
        ...updatedMatch,
        status,
        winnerId: updatedMatch.team1Score > updatedMatch.team2Score ? updatedMatch.team1Id :
                  updatedMatch.team2Score > updatedMatch.team1Score ? updatedMatch.team2Id :
                  undefined
      };

      // 即時にローカル状態を更新（UXのため）
      let newMatches = matches.map(m => 
        m.id === newMatch.id ? newMatch : m
      );

      // 準決勝の試合でスコアが入ったときの特別処理
      if (newMatch.winnerId) {
        // 通常の勝者進出処理
        newMatches = TournamentStructureHelper.progressWinnerToNextMatch(newMatch, newMatches);
        
        // 準決勝の場合は敗者を3位決定戦に進出させる
        const maxRound = Math.max(...newMatches.map(m => m.round));
        const isSemiFinal = newMatch.round === maxRound - 1;
        
        if (isSemiFinal) {
          // 敗者を特定
          const loserId = newMatch.team1Id === newMatch.winnerId 
            ? newMatch.team2Id 
            : newMatch.team1Id;
          
          // 3位決定戦の試合を探す
          const thirdPlaceMatch = newMatches.find(m => 
            m.matchNumber === 0 || m.id.includes('third_place')
          );
          
          // 3位決定戦が存在する場合、敗者を配置
          if (thirdPlaceMatch) {
            const updatedThirdPlaceMatch = { ...thirdPlaceMatch };
            
            // 最初の敗者をteam1に、2番目の敗者をteam2に配置
            if (!updatedThirdPlaceMatch.team1Id) {
              updatedThirdPlaceMatch.team1Id = loserId;
            } else if (!updatedThirdPlaceMatch.team2Id) {
              updatedThirdPlaceMatch.team2Id = loserId;
            }
            
            // 3位決定戦を更新
            newMatches = newMatches.map(m => 
              m.id === updatedThirdPlaceMatch.id ? updatedThirdPlaceMatch : m
            );
          }
        }
      }

      // ローカルのUI更新を先に行い、ダイアログを閉じる
      setMatches(newMatches);
      setMatchDialogOpen(false);
      
      // その後にデータ更新を行う
      const updatedSport = {
        ...sport,
        matches: newMatches
      };
      
      // 親コンポーネントに変更を通知
      onUpdate(updatedSport);
    } finally {
      setIsDialogProcessing(false);
    }
  };

  // handleMatchesCreateを修正
  const handleMatchesCreate = (newMatches: Match[], selectedTeams: Team[]) => {
    if (readOnly) return;
    
    // ローカルの状態を更新
    setMatches(newMatches);
    setTeams(selectedTeams);

    // 即時にクラウドに保存
    const updatedSport = {
      ...sport,
      matches: newMatches,
      teams: selectedTeams
    };
    
    // 直接onUpdateを呼び出し
    onUpdate(updatedSport);
  };

  // トーナメント表示のコンポーネント部分を修正
  const renderMatchComponent = useCallback(({
    match,
    onMatchClick,
    onPartyClick,
    topParty,
    bottomParty,
    ...props
  }: MatchComponentProps) => {
    // 現在の試合データを取得
    const currentMatch = matches.find(m => m.id === match.id);

    return (
    <ForeignObject
      x={props.x - props.width / 2}
      y={props.y - props.height / 2}
      width={props.width}
      height={props.height}
    >
      <Box
        sx={{
          width: '100%',
          height: '100%',
          border: '1px solid',
          borderColor: theme.palette.divider,
          borderRadius: 1,
          overflow: 'hidden',
          backgroundColor: (topParty.status === 'no-team' && bottomParty.status === 'no-team') 
            ? theme.palette.grey[100] 
            : theme.palette.background.paper,
          boxShadow: 1,
          cursor: readOnly ? 'default' : 'pointer',
          '&:hover': !readOnly ? {
            boxShadow: 3,
            borderColor: theme.palette.primary.main,
          } : {}
        }}
        onClick={() => {
          if (!readOnly && currentMatch) {
            handleEditMatch(currentMatch);
          }
        }}
      >
        <Box sx={{ p: 0.5, backgroundColor: theme.palette.grey[100], borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="caption" noWrap>
            {match.name}
          </Typography>
        </Box> 
        {/* 上側のチーム */}
        <Box
          sx={{
            p: 0.5,
            display: 'flex',
            justifyContent: 'space-between',
            backgroundColor: topParty.name === t('tournament.seed')
              ? theme.palette.text.disabled  // seed は灰色
              : topParty.name === t('tournament.tbd')
              ? 'inherit'
              : topParty.isWinner
              ? theme.palette.primary.light // 勝者は青
              : 'inherit',
            '&:hover': { backgroundColor: theme.palette.action.hover }
          }}
          onClick={() => onPartyClick && onPartyClick(topParty)}
        >
          <Typography variant="body2" noWrap sx={{ 
            maxWidth: '70%', 
            fontWeight: topParty.isWinner ? 'bold' : 'normal',
            bgcolor: topParty.isWinner || topParty.name === t('tournament.seed') || topParty.name === t('tournament.tbd')
              ? theme.palette.grey[100]  // seed と tbd のセルを灰色に
              : 'transparent',
            color: topParty.name === t('tournament.seed')
              ? theme.palette.text.disabled  // seed は灰色
              : topParty.name === t('tournament.tbd')
              ? theme.palette.warning.main  // tbd はオレンジ
              : topParty.isWinner
              ? theme.palette.primary.main // 勝者は青
              : 'inherit'
          }}>
            {topParty.name}
            {topParty.status === 'waiting' && ' (待機中)'}
          </Typography>
            <Typography variant="body2" sx={{ 
            fontWeight: 'bold',
            color: 'inherit'
            }}>
            {topParty.score ? topParty.score : 0}
            </Typography>
        </Box>
        
        {/* 下側のチーム */}
        <Box
          sx={{
            p: 0.5,
            display: 'flex',
            justifyContent: 'space-between',
            backgroundColor: bottomParty.name === t('tournament.seed')
              ? theme.palette.text.disabled
              : bottomParty.name === t('tournament.tbd')
              ? 'inherit'  // seed と tbd のセルを灰色に
              : bottomParty.isWinner 
              ? theme.palette.primary.light 
              : 'transparent',
            borderTop: `1px solid ${theme.palette.divider}`,
            '&:hover': { backgroundColor: theme.palette.action.hover }
          }}
          onClick={() => onPartyClick && onPartyClick(bottomParty)}
        >
          <Typography variant="body2" noWrap sx={{ 
            maxWidth: '70%', 
            fontWeight: bottomParty.isWinner ? 'bold' : 'normal',
            bgcolor: (bottomParty.isWinner || bottomParty.name === t('tournament.tbd')) && bottomParty.name !== t('tournament.seed')
              ? theme.palette.grey[100]  // seed と tbd の背景色を灰色に
              : 'transparent',
            color: bottomParty.name === t('tournament.seed')
              ? theme.palette.text.disabled  // seed は灰色
              : bottomParty.name === t('tournament.tbd')
              ? theme.palette.warning.main  // tbd はオレンジ
              : bottomParty.isWinner
              ? theme.palette.primary.main
              : bottomParty.status === 'waiting'
              ? theme.palette.warning.main
              : 'inherit'
          }}>
            {bottomParty.name}
            {bottomParty.status === 'waiting' && ' (待機中)'}
          </Typography>
          <Typography variant="body2" sx={{ 
            fontWeight: 'bold',
            color: 'inherit'
          }}>
            {bottomParty.score ? bottomParty.score : (bottomParty.name === t('tournament.seed') ? '-' : 0)}
          </Typography>
        </Box>
      </Box>
    </ForeignObject>
    );
  }, [theme, t, readOnly, matches, handleEditMatch]);

  const savingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdateRef = useRef<Sport | null>(null);

  // 更新を制御するためのデバウンス処理を改善
  useEffect(() => {
    if (!updateQueue || isSaving) return;

    if (savingTimeoutRef.current) {
      clearTimeout(savingTimeoutRef.current);
    }

    pendingUpdateRef.current = updateQueue;
    setIsSaving(true);

    savingTimeoutRef.current = setTimeout(async () => {
      try {
        await onUpdate(pendingUpdateRef.current!);
        pendingUpdateRef.current = null;
      } finally {
        setIsSaving(false);
        setUpdateQueue(null);
      }
    }, 100);

    return () => {
      if (savingTimeoutRef.current) {
        clearTimeout(savingTimeoutRef.current);
      }
    };
  }, [updateQueue, isSaving, onUpdate]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (savingTimeoutRef.current) {
        clearTimeout(savingTimeoutRef.current);
      }
    };
  }, []);

  // 3位決定戦の表示をより堅牢に
  const ThirdPlaceMatchCard = () => {
    // 3位決定戦の試合データを直接取得
    const thirdPlaceMatchData = matches.find(m => 
      m.matchNumber === 0 || m.id.includes('third_place')
    );

    if (!thirdPlaceMatchData) {
      return null;
    }

    // チーム情報を取得
    const team1 = sport.teams.find(t => t.id === thirdPlaceMatchData.team1Id);
    const team2 = sport.teams.find(t => t.id === thirdPlaceMatchData.team2Id);

    return (
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          {t('tournament.thirdPlaceMatch')}
        </Typography>
        <Box 
          sx={{ 
            width: '100%',
            bgcolor: theme.palette.background.paper,
            borderRadius: 1,
            overflow: 'hidden',
            boxShadow: 1,
            border: `1px solid ${theme.palette.divider}`,
            cursor: readOnly ? 'default' : 'pointer',
            '&:hover': !readOnly ? {
              boxShadow: 3,
              borderColor: theme.palette.primary.main,
            } : {},
            p: 2
          }}
          onClick={() => {
            if (!readOnly) {
              handleEditMatch(thirdPlaceMatchData);
            }
          }}
        >
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="subtitle1" align="center" gutterBottom>
                {t('tournament.thirdPlace')}
              </Typography>
            </Grid>
            
            {/* 対戦カード */}
            <Grid item xs={5} sx={{ textAlign: 'center' }}>
              <Typography 
                variant="body1" 
                fontWeight={thirdPlaceMatchData.winnerId === thirdPlaceMatchData.team1Id ? 'bold' : 'normal'}
                color={thirdPlaceMatchData.winnerId === thirdPlaceMatchData.team1Id ? 'primary' : 'text.primary'}
              >
                {team1?.name || t('tournament.tbd')}
              </Typography>
              <Typography variant="h6">
                {thirdPlaceMatchData.team1Score || 0}
              </Typography>
            </Grid>
            
            <Grid item xs={2} sx={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="body1">VS</Typography>
            </Grid>
            
            <Grid item xs={5} sx={{ textAlign: 'center' }}>
              <Typography 
                variant="body1"
                fontWeight={thirdPlaceMatchData.winnerId === thirdPlaceMatchData.team2Id ? 'bold' : 'normal'}
                color={thirdPlaceMatchData.winnerId === thirdPlaceMatchData.team2Id ? 'primary' : 'text.primary'}
              >
                {team2?.name || t('tournament.tbd')}
              </Typography>
              <Typography variant="h6">
                {thirdPlaceMatchData.team2Score || 0}
              </Typography>
            </Grid>
            
            <Grid item xs={12} sx={{ textAlign: 'center', mt: 1 }}>
              <Chip 
                size="small" 
                color={thirdPlaceMatchData.status === 'completed' ? 'success' : 'default'}
                label={t(`match.${thirdPlaceMatchData.status}`)}
              />
            </Grid>
          </Grid>
        </Box>
      </Paper>
    );
  };

  return (
    <Box>
      {/* readOnlyモードまたはhideBuilderがtrueの場合は設定パネルを非表示 */}
      {!readOnly && !hideBuilder && (
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
      )}

      {/* readOnlyモードまたはhideBuilderがtrueの場合はビルダーを非表示 */}
      {!readOnly && !hideBuilder && (
        <TournamentBuilder
          sport={sport}
          onMatchesCreate={handleMatchesCreate}
        />
      )}
      
      {matches.length > 0 ? (
        <>
          {/* メイントーナメント図の表示 */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              {t('tournament.mainBracket')}
            </Typography>
            <Box 
              sx={{ 
                width: '100%',
                height: 'auto',
                overflow: 'auto',
                '& svg': {
                  width: '100% !important',
                  height: '100% !important'
                }
              }}
            >
              {mainBracketMatches.length > 0 && (
                <SingleEliminationBracket
                  matches={mainBracketMatches}
                  matchComponent={renderMatchComponent}
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
              )}
            </Box>
          </Paper>
          
          {/* 3位決定戦の表示 - より堅牢なコンポーネント使用 */}
          {matches.some(m => m.matchNumber === 0 || m.id.includes('third_place')) && (
            <ThirdPlaceMatchCard />
          )}
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
          onClose={() => !isDialogProcessing && setMatchDialogOpen(false)}
          disabled={isDialogProcessing}
        />
      )}
    </Box>
  );
};

export default TournamentScoring;
