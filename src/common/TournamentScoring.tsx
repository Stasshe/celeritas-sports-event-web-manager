import React, { useState, useEffect, useMemo, useCallback } from 'react';
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

import { Sport, Match, Team } from '../types';
import { getMatchStatusLabel } from '../utils/labels';
import { useThemeContext } from '../contexts/ThemeContext';
import { SingleEliminationBracket, Participant } from '@g-loot/react-tournament-brackets';
import MatchCard from './MatchCard';
import MatchEditDialog from './MatchEditDialog';
import BracketViewport from './BracketViewport';
//import TournamentMatchPlacer from './components/TournamentMatchPlacer';
import TournamentBuilder from './TournamentBuilder';
import { TournamentStructureHelper } from './TournamentStructureHelper';
import { generateBracketMatches } from './tournamentViewHelper';
import {
  createConsolationMatches,
  createThirdPlaceMatch,
  hasValidTournamentParticipants,
  resolveTournamentParticipants
} from './tournament';

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
  onPartyClick?: (party: Participant) => void;
  topParty: Participant;
  bottomParty: Participant;
}

const TournamentScoring: React.FC<TournamentScoringProps> = ({ 
  sport, 
  onUpdate,
  readOnly = false, // デフォルトは編集可能
  hideBuilder = false // デフォルトはビルダーを表示
}) => {
  const theme = useTheme();
  const { alpha } = useThemeContext();

  // 試合データの状態管理
  const [matches, setMatches] = useState<Match[]>(sport.matches || []);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [matchDialogOpen, setMatchDialogOpen] = useState(false);
  const [hasThirdPlace, setHasThirdPlace] = useState(
    sport.tournamentSettings?.hasThirdPlaceMatch ?? false
  );
  const [hasConsolation, setHasConsolation] = useState(
    sport.tournamentSettings?.consolation?.enabled ?? false
  );
  const [includeSecondRoundLosers, setIncludeSecondRoundLosers] = useState(
    sport.tournamentSettings?.consolation?.includeSecondRoundLosers ?? false
  );
  const [hasConsolationThirdPlace, setHasConsolationThirdPlace] = useState(
    sport.tournamentSettings?.consolation?.hasThirdPlaceMatch ?? false
  );
  const [isDialogProcessing, setIsDialogProcessing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // チームデータの状態管理を追加
  const [teams, setTeams] = useState<Team[]>(sport.teams || []);

  // トーナメント表示用のデータ - メインブラケットと3位決定戦ブラケットを分離
  const { mainBracketMatches, consolationBracketMatches } = useMemo(() => {
    const currentSport = { ...sport, matches };
    const formattedMatches = generateBracketMatches(currentSport);
    const consolationMatches = generateBracketMatches(currentSport, 'consolation');
    const isThirdPlace = (match: typeof formattedMatches[number]) => {
      return match.name === "3位決定戦" || match.id.includes('third_place');
    };
    const mainMatches = formattedMatches.filter(match => !isThirdPlace(match)).map(match => ({
      ...match,
      name: typeof match.name === 'object' ? 
        `${match.tournamentRoundText}回戦` :
        match.name
    }));
    return { 
      mainBracketMatches: mainMatches,
      consolationBracketMatches: consolationMatches.filter(match => !isThirdPlace(match))
    };
  }, [sport, matches]);
  
  // 試合の編集
  const handleEditMatch = (match: Match) => {
    if (readOnly) return;
    setSelectedMatch(match);
    setMatchDialogOpen(true);
  };

  // 試合の更新（即時保存用）- エラーハンドリング強化と型の修正
  const handleMatchUpdate = async (updatedMatch: Match) => {
    if (readOnly) return;
    setIsDialogProcessing(true);
    try {
      // トーナメントでは同点をチェック（3位決定戦を除く）
      const isThirdPlaceMatch = updatedMatch.matchNumber === 0 || updatedMatch.id.includes('third_place');
      const hasEnteredScore = updatedMatch.team1Score !== 0 || updatedMatch.team2Score !== 0;
      
      // トーナメントでは同点を許可しない（3位決定戦を除く）
      if (!isThirdPlaceMatch && hasEnteredScore && TournamentStructureHelper.isTie(updatedMatch)) {
        alert("トーナメントでは同点は許可されません。勝者を決定してください。");
        setIsDialogProcessing(false);
        return;
      }
      
      // チームIDの検証
      if (!hasValidTournamentParticipants(updatedMatch, sport.teams)) {
        throw new Error('Invalid team IDs in match');
      }
      
      const status = TournamentStructureHelper.getMatchStatus(updatedMatch);
      
      // winnerId を型に合わせて設定（Firebase用にnullを使用する）
      const newMatch: Match = {
        ...updatedMatch,
        type: 'tournament' as const, // トーナメント形式を明示的に指定
        status: status as "scheduled" | "inProgress" | "completed", // statusを明示的に型指定
        winnerId: updatedMatch.team1Score > updatedMatch.team2Score ? updatedMatch.team1Id :
                  updatedMatch.team2Score > updatedMatch.team1Score ? updatedMatch.team2Id :
                  undefined  // 同点の場合は undefined に設定
      };

      // 即時にローカル状態を更新（UXのため）
      const changedMatches = matches.map(m =>
        m.id === newMatch.id ? newMatch : m
      );
      const newMatches = resolveTournamentParticipants(changedMatches);

      // ローカルのUI更新を先に行い、ダイアログを閉じる
      setMatches(newMatches);
      setMatchDialogOpen(false);
      
      // その後にデータ更新を行う
      const updatedSport: Sport = {
        ...sport,
        matches: newMatches
      };
      
      // 親コンポーネントに変更を通知
      onUpdate(updatedSport);
    } catch (error) {
      console.error('Match update error:', error);
      // エラーをユーザーに通知
    } finally {
      setIsDialogProcessing(false);
    }
  };

  // handleMatchesCreateを修正
  const handleMatchesCreate = (newMatches: Match[], selectedTeams: Team[]) => {
    if (readOnly) return;
    const consolationMatches = hasConsolation
      ? createConsolationMatches(newMatches, includeSecondRoundLosers, hasConsolationThirdPlace)
      : [];
    const allMatches = [...newMatches, ...consolationMatches];

    // ローカルの状態を更新
    setMatches(allMatches);
    setTeams(selectedTeams);

    // 即時にクラウドに保存
    const updatedSport = {
      ...sport,
      matches: allMatches,
      teams: selectedTeams
    };
    
    // 直接onUpdateを呼び出し
    onUpdate(updatedSport);
  };

  const handleThirdPlaceChange = (checked: boolean) => {
    setHasThirdPlace(checked);
    let mainMatches = matches.filter(match => {
      if (match.bracket === 'consolation') return false;
      return match.matchNumber !== 0 && !match.id.includes('third_place');
    });

    if (checked && mainMatches.length > 0) {
      const thirdPlaceMatch = createThirdPlaceMatch(mainMatches);
      if (thirdPlaceMatch) mainMatches = [...mainMatches, thirdPlaceMatch];
    }
    const consolationMatches = hasConsolation
      ? createConsolationMatches(
          mainMatches,
          includeSecondRoundLosers,
          hasConsolationThirdPlace
        )
      : [];
    const updatedMatches = [...mainMatches, ...consolationMatches];

    setMatches(updatedMatches);
    onUpdate({
      ...sport,
      matches: updatedMatches,
      tournamentSettings: {
        hasThirdPlaceMatch: checked,
        hasRepechage: sport.tournamentSettings?.hasRepechage ?? false,
        consolation: {
          enabled: hasConsolation,
          includeSecondRoundLosers,
          hasThirdPlaceMatch: hasConsolationThirdPlace
        }
      }
    });
  };

  const updateConsolation = (
    enabled: boolean,
    includeSecondRound: boolean,
    hasThirdPlaceMatch: boolean
  ) => {
    setHasConsolation(enabled);
    setIncludeSecondRoundLosers(includeSecondRound);
    setHasConsolationThirdPlace(hasThirdPlaceMatch);
    const mainMatches = matches.filter(match => match.bracket !== 'consolation');
    const consolationMatches = enabled
      ? createConsolationMatches(mainMatches, includeSecondRound, hasThirdPlaceMatch)
      : [];
    const updatedMatches = [...mainMatches, ...consolationMatches];
    setMatches(updatedMatches);
    onUpdate({
      ...sport,
      matches: updatedMatches,
      tournamentSettings: {
        hasThirdPlaceMatch: hasThirdPlace,
        hasRepechage: sport.tournamentSettings?.hasRepechage ?? false,
        consolation: {
          enabled,
          includeSecondRoundLosers: includeSecondRound,
          hasThirdPlaceMatch
        }
      }
    });
  };

  // トーナメント表示のコンポーネント部分を修正
  const renderMatchComponent = useCallback(({
    match,
    onPartyClick,
    topParty,
    bottomParty
  }: MatchComponentProps) => {
    // 現在の試合データを取得
    const currentMatch = matches.find(m => m.id === match.id);

    return (
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
        onTouchStart={event => event.stopPropagation()}
        onTouchMove={event => event.stopPropagation()}
        onTouchEnd={event => event.stopPropagation()}
        onTouchCancel={event => event.stopPropagation()}
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
            backgroundColor: topParty.name === "シード"
              ? theme.palette.text.disabled  // seed は灰色
              : topParty.name === "未定"
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
            bgcolor: topParty.isWinner || topParty.name === "シード" || topParty.name === "未定"
              ? theme.palette.grey[100]  // seed と tbd のセルを灰色に
              : 'transparent',
            color: topParty.name === "シード"
              ? theme.palette.text.disabled  // seed は灰色
              : topParty.name === "未定"
              ? theme.palette.warning.main  // tbd はオレンジ
              : topParty.isWinner
              ? theme.palette.primary.main // 勝者は青
              : 'inherit'
          }}>
            {topParty.name.slice(-3)}
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
            backgroundColor: bottomParty.name === "シード"
              ? theme.palette.text.disabled
              : bottomParty.name === "未定"
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
            bgcolor: (bottomParty.isWinner || bottomParty.name === "未定") && bottomParty.name !== "シード"
              ? theme.palette.grey[100]  // seed と tbd の背景色を灰色に
              : 'transparent',
            color: bottomParty.name === "シード"
              ? theme.palette.text.disabled  // seed は灰色
              : bottomParty.name === "未定"
              ? theme.palette.warning.main  // tbd はオレンジ
              : bottomParty.isWinner
              ? theme.palette.primary.main
              : 'inherit'
          }}>
            {bottomParty.name.slice(-3)}
          </Typography>
          <Typography variant="body2" sx={{ 
            fontWeight: 'bold',
            color: 'inherit'
          }}>
            {bottomParty.score ? bottomParty.score : (bottomParty.name === "シード" ? '-' : 0)}
          </Typography>
        </Box>
      </Box>
    );
  }, [theme, readOnly, matches, handleEditMatch]);

  const ThirdPlaceMatchCard = ({ bracket }: { bracket: 'main' | 'consolation' }) => {
    const thirdPlaceMatchData = matches.find(match => {
      const isThirdPlace = match.matchNumber === 0 || match.id.includes('third_place');
      if (!isThirdPlace) return false;
      if (bracket === 'consolation') return match.bracket === 'consolation';
      return match.bracket !== 'consolation';
    });

    if (!thirdPlaceMatchData) {
      return null;
    }

    const team1 = sport.teams.find(t => t.id === thirdPlaceMatchData.team1Id);
    const team2 = sport.teams.find(t => t.id === thirdPlaceMatchData.team2Id);
    let title = 'メイン3位決定戦';
    if (bracket === 'consolation') title = '負け側3位決定戦';

    return (
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          {title}
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
                {title}
              </Typography>
            </Grid>
            
            {/* 対戦カード */}
            <Grid item xs={5} sx={{ textAlign: 'center' }}>
              <Typography 
                variant="body1" 
                fontWeight={thirdPlaceMatchData.winnerId === thirdPlaceMatchData.team1Id ? 'bold' : 'normal'}
                color={thirdPlaceMatchData.winnerId === thirdPlaceMatchData.team1Id ? 'primary' : 'text.primary'}
              >
                {team1?.name || "未定"}
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
                {team2?.name || "未定"}
              </Typography>
              <Typography variant="h6">
                {thirdPlaceMatchData.team2Score || 0}
              </Typography>
            </Grid>
            
            <Grid item xs={12} sx={{ textAlign: 'center', mt: 1 }}>
              <Chip 
                size="small" 
                color={thirdPlaceMatchData.status === 'completed' ? 'success' : 'default'}
                label={getMatchStatusLabel(thirdPlaceMatchData.status)}
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
              {"トーナメント設定"}
            </Typography>
          </Box>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            useFlexGap
            sx={{ flexWrap: 'wrap' }}
          >
            <FormControlLabel
              control={(
                <Switch
                  checked={hasThirdPlace}
                  onChange={event => handleThirdPlaceChange(event.target.checked)}
                />
              )}
              label="メイン3位決定戦を実施"
            />
            <FormControlLabel
              control={(
                <Switch
                  checked={hasConsolation}
                  onChange={event => {
                    updateConsolation(
                      event.target.checked,
                      includeSecondRoundLosers,
                      hasConsolationThirdPlace
                    );
                  }}
                />
              )}
              label="負け側トーナメントを実施"
            />
            <FormControlLabel
              control={(
                <Switch
                  checked={includeSecondRoundLosers}
                  disabled={!hasConsolation}
                  onChange={event => {
                    updateConsolation(true, event.target.checked, hasConsolationThirdPlace);
                  }}
                />
              )}
              label="2回戦敗者も参加"
            />
            <FormControlLabel
              control={(
                <Switch
                  checked={hasConsolationThirdPlace}
                  disabled={!hasConsolation}
                  onChange={event => {
                    updateConsolation(true, includeSecondRoundLosers, event.target.checked);
                  }}
                />
              )}
              label="負け側3位決定戦を実施"
            />
          </Stack>
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
              {"メインブラケット"}
            </Typography>
            {mainBracketMatches.length > 0 && (
              <SingleEliminationBracket
                matches={mainBracketMatches}
                matchComponent={renderMatchComponent}
                svgWrapper={BracketViewport}
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
          </Paper>

          <ThirdPlaceMatchCard bracket="main" />

          {consolationBracketMatches.length > 0 && (
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                負け側トーナメント
              </Typography>
              <SingleEliminationBracket
                matches={consolationBracketMatches}
                matchComponent={renderMatchComponent}
                svgWrapper={BracketViewport}
                options={{
                  style: {
                    roundHeader: {
                      backgroundColor: theme.palette.secondary.main,
                      color: theme.palette.secondary.contrastText,
                      fontWeight: 'bold'
                    },
                    connectorColor: theme.palette.divider,
                    connectorColorHighlight: theme.palette.secondary.main
                  }
                }}
              />
            </Paper>
          )}

          <ThirdPlaceMatchCard bracket="consolation" />
        </>
      ) : (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">
            {"マッチがありません"}
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
