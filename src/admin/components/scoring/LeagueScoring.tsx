import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Tabs,
  Tab,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Divider,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  useTheme,
  AlertTitle,
  Alert
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Shuffle as ShuffleIcon,
} from '@mui/icons-material';
import { getMatchStatusLabel } from '../../../utils/labels';
import { Sport, Match, Team, LeagueBlock } from '../../../types';
import RoundRobinTable from '../../../general/components/sports/RoundRobinTable';
import TournamentScoring from '../../../common/TournamentScoring';
import { LeagueMatchHelper } from './helpers/LeagueMatchHelper';
import { LeaguePlayoffHelper } from './helpers/LeaguePlayoffHelper';

interface LeagueScoringProps {
  sport: Sport;
  onUpdate: (updatedSport: Sport) => void;
  readOnly?: boolean;
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
      id={`block-tabpanel-${index}`}
      aria-labelledby={`block-tab-${index}`}
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

const LeagueScoring: React.FC<LeagueScoringProps> = ({ sport, onUpdate, readOnly = false }) => {
  const theme = useTheme();

  const [activeTab, setActiveTab] = useState(0);
  const [blocks, setBlocks] = useState<LeagueBlock[]>([]);
  const [blockCount, setBlockCount] = useState(sport.leagueSettings?.blockCount || 2);
  const [advancingTeams, setAdvancingTeams] = useState(sport.leagueSettings?.advancingTeams || 1);
  const [hasThirdPlaceMatch, setHasThirdPlaceMatch] = useState<boolean>(sport.leagueSettings?.hasThirdPlaceMatch ?? true);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [matchDialogOpen, setMatchDialogOpen] = useState(false);
  const [teams, setTeams] = useState<Team[]>(sport.teams || []);
  const [playoffMatches, setPlayoffMatches] = useState<Match[]>([]);
  const [showPlayoff, setShowPlayoff] = useState(false);
  const [useRosterTeams, setUseRosterTeams] = useState(true);  // 名簿のチームを使用するかどうか

  // ダイアログ用の一時的な値を保持する状態を追加
  const [tempBlockCount, setTempBlockCount] = useState(sport.leagueSettings?.blockCount || 2);
  const [tempAdvancingTeams, setTempAdvancingTeams] = useState(sport.leagueSettings?.advancingTeams || 1);
  const [tempHasThirdPlaceMatch, setTempHasThirdPlaceMatch] = useState<boolean>(sport.leagueSettings?.hasThirdPlaceMatch ?? true);

  // 名簿データからチームを生成する関数
  useEffect(() => {
    if (useRosterTeams && sport.roster) {
      const rosterTeams: Team[] = [];

      // 学年ごとのクラスをチームとして追加
      Object.entries(sport.roster).forEach(([gradeKey, gradeData]) => {
        if (gradeData) {
          // 各クラスをチームとして登録
          Object.entries(gradeData).forEach(([className, members]) => {
            if (className && members && members.length > 0) {
              // チームIDを作成（学年_クラス名）
              const teamId = `${gradeKey}_${className}`;

              // チーム名を作成（例: 1年2組）
              const teamName = `${className}`;

              // 既存のチームと重複しないよう確認
              if (!rosterTeams.some(team => team.id === teamId)) {
                rosterTeams.push({
                  id: teamId,
                  name: teamName,
                  members: members.filter(m => m !== 'none'),
                  color: '#' + Math.floor(Math.random()*16777215).toString(16) // ランダムな色
                });
              }
            }
          });
        }
      });

      // 名簿からチームが取得できた場合は、それを使用
      if (rosterTeams.length > 0) {
        setTeams(rosterTeams);

        // sportのteamsも更新
        if (sport.teams?.length !== rosterTeams.length ||
            !sport.teams.every(t1 => rosterTeams.some(t2 => t2.id === t1.id))) {
          onUpdate({
            ...sport,
            teams: rosterTeams
          });
        }
      }
    }
  }, [sport.roster, useRosterTeams, onUpdate, sport]);

  // ブロックごとのチームと試合を抽出
  useEffect(() => {
    // 初期設定
    if (!sport.leagueSettings) {
      onUpdate({
        ...sport,
        leagueSettings: {
          blockCount: 2,
          advancingTeams: 1,
          hasPlayoff: true,
          hasThirdPlaceMatch: true
        }
      });
    }

    // 既存のブロックデータを取得
    const existingBlocks: LeagueBlock[] = [];
    const playoffMatchesFound: Match[] = [];

    if (sport.matches) {
      // ブロック情報を抽出
      const blockMatches = sport.matches.filter(m => m.blockId);
      const blockIds = new Set(blockMatches.map(m => m.blockId));

      blockIds.forEach(blockId => {
        if (!blockId) return;

        const matchesInBlock = blockMatches.filter(m => m.blockId === blockId);
        if (matchesInBlock.length > 0) {
          // 参加チームを取得
          const teamIds = new Set<string>();
          matchesInBlock.forEach(m => {
            if (m.team1Id) teamIds.add(m.team1Id);
            if (m.team2Id) teamIds.add(m.team2Id);
          });

          existingBlocks.push({
            id: blockId,
            name: `ブロック ${existingBlocks.length + 1}`,
            teamIds: Array.from(teamIds),
            matches: matchesInBlock
          });
        }
      });

      // プレーオフの試合を抽出
      playoffMatchesFound.push(...sport.matches.filter(m => !m.blockId));
    }

    // 重要な変更: ブロック数の処理を修正
    // 設定値を優先し、既存のブロック数が設定値より少ない場合は新しいブロックを追加
    const targetBlockCount = sport.leagueSettings?.blockCount || blockCount;

    if (existingBlocks.length > 0) {
      // 設定されたブロック数に合わせて調整
      if (existingBlocks.length < targetBlockCount) {
        // 不足分のブロックを追加
        for (let i = existingBlocks.length; i < targetBlockCount; i++) {
          existingBlocks.push({
            id: `block_${i + 1}`,
            name: `ブロック ${i + 1}`,
            teamIds: [],
            matches: []
          });
        }
      } else if (existingBlocks.length > targetBlockCount) {
        // 超過分のブロックを削除する実装
        // 削除前にユーザーに警告を表示
        const shouldRemove = window.confirm(
          `${existingBlocks.length - targetBlockCount}個のブロック(${targetBlockCount})を削除しますか？合計${existingBlocks.length}です。`
        );

        if (shouldRemove) {
          // 超過分のブロックとそれに関連する試合を削除
          const blocksToKeep = existingBlocks.slice(0, targetBlockCount);
          const removedBlockIds = existingBlocks
            .slice(targetBlockCount)
            .map(block => block.id);

          // 残すブロックだけを設定
          existingBlocks.length = targetBlockCount;

          // スポーツデータからも該当ブロックの試合を削除
          if (sport.matches) {
            const updatedMatches = sport.matches.filter(match =>
              !match.blockId || !removedBlockIds.includes(match.blockId)
            );

            // スポーツデータを更新
            onUpdate({
              ...sport,
              matches: updatedMatches,
              leagueSettings: {
                ...sport.leagueSettings,
                blockCount: targetBlockCount
              }
            });
          }
        } else {
          // キャンセルの場合は、targetBlockCountを既存のブロック数に合わせる
          // これによりブロック数の不一致を防ぐ
          setBlockCount(existingBlocks.length);

          // スポーツデータも合わせて更新
          onUpdate({
            ...sport,
            leagueSettings: {
              ...sport.leagueSettings,
              blockCount: existingBlocks.length
            }
          });
        }
      }

      setBlocks(existingBlocks);
      setBlockCount(targetBlockCount); // ブロック数を設定値に合わせる
    } else {
      // ブロックがまだない場合は初期ブロックを作成
      const initialBlocks = Array.from({ length: targetBlockCount }, (_, i) => ({
        id: `block_${i + 1}`,
        name: `ブロック ${i + 1}`,
        teamIds: [],
        matches: []
      }));
      setBlocks(initialBlocks);
      setBlockCount(targetBlockCount);
    }

    if (playoffMatchesFound.length > 0) {
      setPlayoffMatches(playoffMatchesFound);
      setShowPlayoff(true);
    }

  }, [sport.id, onUpdate, sport]);

  // チームをブロックに分配 - 完全に再構築するように修正
  const distributeTeams = useCallback(() => {
    if (teams.length === 0 || blockCount === 0) return;

    // 既存のスコアデータが消えることを警告
    if (blocks.some(block => block.matches.some(m => m.team1Score > 0 || m.team2Score > 0))) {
      if (!window.confirm("スコアをリセットしますか？")) {
        return;
      }
    }

    // 現在のブロック数を使用してチーム分配と試合生成を行う
    const newBlocks = LeagueMatchHelper.distributeTeamsToBlocks(teams, blockCount);

    // 既存のすべての試合を削除し、新しく生成した試合だけを使用
    setBlocks(newBlocks);
    setPlayoffMatches([]);
    setShowPlayoff(false);

    // sportデータを更新
    const allMatches = newBlocks.flatMap(block => block.matches);

    onUpdate({
      ...sport,
      teams: teams, // チームデータも更新
      matches: allMatches, // 既存の試合をすべて削除し、新しい試合のみを設定
      leagueSettings: {
        ...sport.leagueSettings,
        blockCount,
        advancingTeams,
        hasPlayoff: true,
        hasThirdPlaceMatch
      }
    });

  }, [teams, blockCount, advancingTeams, blocks, hasThirdPlaceMatch, onUpdate, sport]);

  // 試合の編集
  const handleEditMatch = (match: Match) => {
    if (readOnly) return;
    setSelectedMatch(match);
    setMatchDialogOpen(true);
  };

  // 試合の更新
  const handleMatchUpdate = (updatedMatch: Match) => {
    if (readOnly) return;

    // 勝者を自動判定 (リーグでは同点を許可)
    const winner = updatedMatch.team1Score > updatedMatch.team2Score
      ? updatedMatch.team1Id
      : updatedMatch.team2Score > updatedMatch.team1Score
        ? updatedMatch.team2Id
        : undefined; // 同点の場合は勝者なし（undefinedを使用）

    // ステータスを設定：明示的な完了が設定されていれば優先し、それ以外はスコアに応じて判断
    const status = updatedMatch.status === 'completed' ? 'completed' as const :
                  (updatedMatch.team1Score > 0 || updatedMatch.team2Score > 0)
                    ? 'completed' as const
                    : 'scheduled' as const;

    const finalMatch: Match = {
      ...updatedMatch,
      type: 'league' as const, // リーグ戦のタイプを明示的に指定
      winnerId: winner,
      status: status
    };

    // ブロック内の試合を更新
    const updatedBlocks = blocks.map(block => {
      if (block.id === finalMatch.blockId) {
        return {
          ...block,
          matches: block.matches.map(m =>
            m.id === finalMatch.id ? finalMatch : m
          )
        };
      }
      return block;
    });

    setBlocks(updatedBlocks);

    const resolvedPlayoffMatches = LeaguePlayoffHelper.resolveBlockRankSources(
      playoffMatches,
      updatedBlocks
    );
    setPlayoffMatches(resolvedPlayoffMatches);

    // スポーツデータ全体を更新
    const allMatches = [
      ...updatedBlocks.flatMap(block => block.matches),
      ...resolvedPlayoffMatches
    ];

    onUpdate({
      ...sport,
      matches: allMatches
    });

    setMatchDialogOpen(false);
  };

  // プレーオフトーナメントを生成
  const generatePlayoffTournament = () => {
    if (blocks.length === 0) return;

    try {
      // ユーザーに確認（既存のプレーオフがある場合）
      if (playoffMatches.length > 0) {
        const confirmReset = window.confirm("プレーオフをリセットしますか？");
        if (!confirmReset) return;
      }

      // LeaguePlayoffHelperを使用して処理を実行
      const result = LeaguePlayoffHelper.generatePlayoffTournament(
        blocks, teams, advancingTeams, hasThirdPlaceMatch
      );

      if (!result.success) {
        alert(result.message);
        return;
      }

      // 結果を反映
      setPlayoffMatches(result.matches);
      setShowPlayoff(true);

      // Sport全体のデータ更新
      const allMatches = [
        ...blocks.flatMap(block => block.matches),
        ...result.matches
      ];

      onUpdate({
        ...sport,
        matches: allMatches,
        leagueSettings: {
          ...sport.leagueSettings,
          hasPlayoff: true,
          hasThirdPlaceMatch
        }
      });

      // プレーオフタブに切り替え
      setActiveTab(blocks.length);

    } catch (error) {
      console.error("Error generating playoff tournament:", error);
      alert("トーナメント生成エラー");
    }
  };

  // プレーオフの試合更新
  const handlePlayoffUpdate = (updatedPlayoff: Sport) => {
    // 更新されたプレーオフ試合をLeaguePlayoffHelperで処理
    const updatedMatches = LeaguePlayoffHelper.updatePlayoffMatches(updatedPlayoff.matches);

    // 更新された試合データを状態に反映
    setPlayoffMatches(updatedMatches);

    // スポーツデータ全体を更新
    const allMatches = [
      ...blocks.flatMap(block => block.matches),
      ...updatedMatches
    ];

    onUpdate({
      ...sport,
      matches: allMatches
    });
  };

  // 数値入力のハンドラー - 一時変数を使用するように修正
  const handleBlockCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // 空文字列の場合は一時的に許可（入力途中として扱う）
    if (value === '') {
      setTempBlockCount(0);
      return;
    }
    // 数値に変換して設定
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue)) {
      setTempBlockCount(Math.max(1, numValue));
    }
  };

  const handleAdvancingTeamsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // 空文字列の場合は一時的に許可
    if (value === '') {
      setTempAdvancingTeams(0);
      return;
    }
    // 数値に変換して設定
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue)) {
      setTempAdvancingTeams(Math.max(1, numValue));
    }
  };

  // 設定ダイアログを開く時に一時変数を初期化
  const openSettingsDialog = () => {
    setTempBlockCount(blockCount);
    setTempAdvancingTeams(advancingTeams);
    setTempHasThirdPlaceMatch(hasThirdPlaceMatch);
    setSettingsDialogOpen(true);
  };

  // 設定ダイアログの保存
  const handleSaveSettings = () => {
    // 最終的な値のバリデーション
    const finalBlockCount = Math.max(1, tempBlockCount);
    const finalAdvancingTeams = Math.max(1, tempAdvancingTeams);

    // ブロック数の上限を計算（チーム数の半分を超えないように）
    const maxBlocks = Math.max(1, Math.floor(teams.length / 2));
    const validBlockCount = Math.min(finalBlockCount, maxBlocks);

    // 新しいブロック配列を作成
    const newBlocks = Array.from({ length: validBlockCount }, (_, i) => {
      // 既存のブロックがあればそれを維持、なければ新規作成
      const existingBlock = blocks[i];
      if (existingBlock) {
        return existingBlock;
      }
      return {
        id: `block_${i + 1}`,
        name: `ブロック ${i + 1}`,
        teamIds: [],
        matches: []
      };
    });

    // 状態を更新
    setBlocks(newBlocks);
    setBlockCount(validBlockCount);
    setAdvancingTeams(finalAdvancingTeams);
    setHasThirdPlaceMatch(tempHasThirdPlaceMatch);

    // スポーツデータを更新
    onUpdate({
      ...sport,
      leagueSettings: {
        ...sport.leagueSettings,
        blockCount: validBlockCount,
        advancingTeams: finalAdvancingTeams,
        hasPlayoff: true,
        hasThirdPlaceMatch: tempHasThirdPlaceMatch
      }
    });

    setSettingsDialogOpen(false);
  };

  // タブ切り替え
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // チーム名を取得する関数
  const getTeamName = (teamId: string) => {
    const team = teams.find(team => team.id === teamId);
    return team ? team.name : 'Unknown';
  };

  // アルファベットブロック名を取得するユーティリティ関数を追加
  const getBlockLetter = (index: number): string => {
    return String.fromCharCode(65 + index); // 0->A, 1->B, 2->C, ...
  };

  const [blockEditDialogOpen, setBlockEditDialogOpen] = useState(false);
  const [manualBlockTeams, setManualBlockTeams] = useState<string[][]>([]);

  // ブロック分け編集ダイアログを開く
  const openBlockEditDialog = () => {
    // 現在のブロック分けを初期値に
    setManualBlockTeams(blocks.map(b => [...b.teamIds]));
    setBlockEditDialogOpen(true);
  };

  // ブロック分け編集ダイアログでのチーム割り当て変更
  const handleManualBlockChange = (blockIdx: number, newTeamIds: string[]) => {
    setManualBlockTeams(prev => prev.map((ids, i) => i === blockIdx ? newTeamIds : ids));
  };

  // ブロック分け編集ダイアログの保存
  const handleSaveBlockEdit = () => {
    // チームが重複しないように全体で一意にする
    const allSelected = manualBlockTeams.flat();
    const uniqueTeams = Array.from(new Set(allSelected));
    // 未割当チームも考慮
    const unassigned = teams.map(t => t.id).filter(id => !uniqueTeams.includes(id));
    // 新しいブロック配列
    const newBlocks = blocks.map((block, i) => {
      const teamIds = manualBlockTeams[i] || [];
      const blockTeams = teamIds.map(id => teams.find(t => t.id === id)).filter(Boolean) as Team[];
      return {
        ...block,
        teamIds,
        matches: LeagueMatchHelper.generateRoundRobinMatches(blockTeams, block.id)
      };
    });
    setBlocks(newBlocks);
    setBlockEditDialogOpen(false);
    // sportデータも更新
    const allMatches = newBlocks.flatMap(b => b.matches);
    onUpdate({
      ...sport,
      matches: allMatches
    });
  };

  return (
    <Box>
      {/* 設定パネル (readOnlyでない場合のみ表示) */}
      {!readOnly && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">{"リーグ設定"}</Typography>
            <Button
              variant="outlined"
              color="primary"
              onClick={openSettingsDialog}
            >
              {"設定を編集"}
            </Button>
          </Box>

          <Grid container spacing={2}>
            <Grid
              size={{
                xs: 12,
                sm: 4
              }}>
              <Typography variant="body1">
                {"ブロック"}: <strong>{blockCount}</strong>
              </Typography>
            </Grid>
            <Grid
              size={{
                xs: 12,
                sm: 4
              }}>
              <Typography variant="body1">
                {"進出チーム数"}: <strong>{advancingTeams}</strong>
              </Typography>
            </Grid>
            <Grid
              size={{
                xs: 12,
                sm: 4
              }}>
              <Typography variant="body1">
                {"3位決定戦を実施"}: <strong>{hasThirdPlaceMatch ? "はい" : "いいえ"}</strong>
              </Typography>
            </Grid>
            <Grid size={12}>
              <Button
                variant="outlined"
                color="secondary"
                onClick={openBlockEditDialog}
                disabled={teams.length === 0 || blocks.length === 0}
                sx={{ mt: 1 }}
              >
                ブロック分けを編集
              </Button>
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          <Grid container spacing={2}>
            <Grid size={12}>
              <Alert severity="info" sx={{ mb: 2 }}>
                {teams.length > 0 ? (
                  <>登録チーム数: {teams.length}</>
                ) : (
                  <>{"チームが見つかりません"}</>
                )}
              </Alert>
            </Grid>
            <Grid
              size={{
                xs: 12,
                sm: 6
              }}>
              <Button
                variant="contained"
                color="primary"
                fullWidth
                startIcon={<ShuffleIcon />}
                onClick={distributeTeams}
                disabled={teams.length === 0}
              >
                {"チームを振り分け"}
              </Button>
            </Grid>
            <Grid
              size={{
                xs: 12,
                sm: 6
              }}>
              <Button
                variant="contained"
                color="secondary"
                fullWidth
                onClick={generatePlayoffTournament}
                disabled={blocks.length === 0 || teams.length < 2}
              >
                {"プレーオフを生成"}
              </Button>
            </Grid>
          </Grid>
        </Paper>
      )}
      {/* チームがない場合の警告表示 */}
      {teams.length === 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <AlertTitle>{"チームがありません"}</AlertTitle>
          {"名簿からチームを追加してください"}
        </Alert>
      )}
      {/* ブロックタブ - 表示をアルファベットに変更 */}
      {blocks.length > 0 ? (
        <Box sx={{ mb: 4 }}>
          <Paper sx={{ mb: 2 }}>
            <Tabs
              value={Math.min(activeTab, blocks.length)}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
            >
              {blocks.map((block, index) => (
                <Tab key={block.id} label={`${"ブロック"} ${getBlockLetter(index)}`} />
              ))}
              {showPlayoff && (
                <Tab label={"プレーオフ"} />
              )}
            </Tabs>
          </Paper>

          {/* ブロックのタブパネル - 表示をアルファベットに変更 */}
          {blocks.map((block, index) => (
            <TabPanel key={block.id} value={activeTab} index={index}>
              <Paper sx={{ p: 2, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  {`${"ブロック"} ${getBlockLetter(index)} ${"チーム"}`}
                </Typography>
                <Grid container spacing={1}>
                  {block.teamIds.map(teamId => (
                    <Grid key={teamId}>
                      <Chip label={getTeamName(teamId)} />
                    </Grid>
                  ))}
                  {block.teamIds.length === 0 && (
                    <Grid size={12}>
                      <Typography sx={{
                        color: "text.secondary"
                      }}>
                        {"チームがありません"}
                      </Typography>
                    </Grid>
                  )}
                </Grid>

                {/* ブロック内の試合一覧 */}
                {block.matches.length > 0 ? (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      {"試合"}
                    </Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>{"試合"}</TableCell>
                            <TableCell>{"チーム1"}</TableCell>
                            <TableCell align="center">{"スコア"}</TableCell>
                            <TableCell>{"チーム2"}</TableCell>
                            <TableCell align="center">{"状態"}</TableCell>
                            {!readOnly && (
                              <TableCell align="center">{"操作"}</TableCell>
                            )}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {block.matches.map(match => (
                            <TableRow key={match.id} hover>
                              <TableCell>{match.matchNumber}</TableCell>
                              <TableCell>{getTeamName(match.team1Id)}</TableCell>
                              <TableCell align="center">
                                {`${match.team1Score} - ${match.team2Score}`}
                              </TableCell>
                              <TableCell>{getTeamName(match.team2Id)}</TableCell>
                              <TableCell align="center">
                                <Chip
                                  size="small"
                                  color={match.status === 'completed' ? 'success' : 'default'}
                                  label={getMatchStatusLabel(match.status)}
                                />
                              </TableCell>
                              {!readOnly && (
                                <TableCell align="center">
                                  <IconButton
                                    size="small"
                                    color="primary"
                                    onClick={() => handleEditMatch(match)}
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                ) : (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    {"試合がありません"}
                  </Alert>
                )}

                {/* ブロックの順位表 */}
                {block.matches.length > 0 && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      {"順位表"}
                    </Typography>

                    {/* 既存のRoundRobinTableを再利用 */}
                    <RoundRobinTable
                      sport={{
                        ...sport,
                        matches: block.matches,
                        teams: teams.filter(team => block.teamIds.includes(team.id))
                      } as Sport}
                    />
                  </Box>
                )}
              </Paper>
            </TabPanel>
          ))}

          {/* プレーオフのタブパネル */}
          {showPlayoff && (
            <TabPanel value={activeTab} index={blocks.length}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  {"プレーオフトーナメント"}
                </Typography>

                {playoffMatches.length > 0 ? (
                  <TournamentScoring
                    sport={{
                      ...sport,
                      matches: playoffMatches,
                      type: 'tournament'
                    } as Sport}
                    onUpdate={handlePlayoffUpdate}
                    readOnly={readOnly}
                    hideBuilder={true} // ビルダーを非表示にするプロパティを追加
                  />
                ) : (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    {"プレーオフはまだ生成されていません"}
                  </Alert>
                )}
              </Paper>
            </TabPanel>
          )}
        </Box>
      ) : (
        <Alert severity="info" sx={{ mb: 3 }}>
          {"ブロックがまだ作成されていません"}
        </Alert>
      )}
      {/* 試合編集ダイアログ */}
      {selectedMatch && (
        <Dialog
          open={matchDialogOpen}
          onClose={() => setMatchDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            {"試合を編集"}
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid size={12}>
                <Grid container sx={{
                  alignItems: "center"
                }}>
                  <Grid sx={{ textAlign: 'center' }} size={5}>
                    <Typography variant="subtitle1">
                      {getTeamName(selectedMatch.team1Id)}
                    </Typography>
                  </Grid>
                  <Grid sx={{ textAlign: 'center' }} size={2}>
                    <Typography variant="body1">VS</Typography>
                  </Grid>
                  <Grid sx={{ textAlign: 'center' }} size={5}>
                    <Typography variant="subtitle1">
                      {getTeamName(selectedMatch.team2Id)}
                    </Typography>
                  </Grid>
                </Grid>
              </Grid>

              <Grid size={12}>
                <Grid container spacing={2}>
                  <Grid size={5}>
                    <TextField
                      fullWidth
                      label={"スコア"}
                      type="number"
                      value={selectedMatch.team1Score}
                      onChange={(e) => setSelectedMatch({
                        ...selectedMatch,
                        team1Score: parseInt(e.target.value) || 0
                      })}
                      slotProps={{
                        htmlInput: { min: 0 }
                      }}
                    />
                  </Grid>
                  <Grid
                    sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    size={2}>
                    <Typography variant="h5">-</Typography>
                  </Grid>
                  <Grid size={5}>
                    <TextField
                      fullWidth
                      label={"スコア"}
                      type="number"
                      value={selectedMatch.team2Score}
                      onChange={(e) => setSelectedMatch({
                        ...selectedMatch,
                        team2Score: parseInt(e.target.value) || 0
                      })}
                      slotProps={{
                        htmlInput: { min: 0 }
                      }}
                    />
                  </Grid>
                </Grid>
              </Grid>

              <Grid size={12}>
                <FormControl fullWidth>
                  <InputLabel>{"状態"}</InputLabel>
                  <Select
                    value={selectedMatch.status}
                    onChange={(e) => setSelectedMatch({
                      ...selectedMatch,
                      status: e.target.value as 'scheduled' | 'inProgress' | 'completed'
                    })}
                  >
                    <MenuItem value="scheduled">{"予定"}</MenuItem>
                    <MenuItem value="inProgress">{"進行中"}</MenuItem>
                    <MenuItem value="completed">{"完了"}</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setMatchDialogOpen(false)}>
              {"キャンセル"}
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={() => handleMatchUpdate(selectedMatch)}
            >
              {"保存"}
            </Button>
          </DialogActions>
        </Dialog>
      )}
      {/* 設定ダイアログ - 一時変数を使用するように修正 */}
      <Dialog
        open={settingsDialogOpen}
        onClose={() => setSettingsDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {"リーグ設定"}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3}>
            <Grid size={12}>
              <TextField
                fullWidth
                label={"ブロック数"}
                type="number"
                value={tempBlockCount || ''} // 0の場合は空文字列を表示
                onChange={handleBlockCountChange}
                helperText={"チームを分けるブロックの数"}
                slotProps={{
                  htmlInput: { min: 1, max: Math.max(1, Math.floor(teams.length / 2)) }
                }}
              />
              {teams.length > 0 && (
                <Typography variant="caption" sx={{
                  color: "text.secondary"
                }}>
                  最大{Math.max(1, Math.floor(teams.length / 2))}ブロック
                </Typography>
              )}
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                label={"進出チーム数"}
                type="number"
                value={tempAdvancingTeams || ''} // 0の場合は空文字列を表示
                onChange={handleAdvancingTeamsChange}
                helperText={"各ブロックから進出するチーム数"}
                slotProps={{
                  htmlInput: { min: 1 }
                }}
              />
            </Grid>
            <Grid size={12}>
              <FormControl fullWidth>
                <InputLabel id="third-place-match-label">{"3位決定戦を実施"}</InputLabel>
                <Select
                  labelId="third-place-match-label"
                  value={tempHasThirdPlaceMatch ? "true" : "false"}
                  onChange={(e) => {
                    setTempHasThirdPlaceMatch(e.target.value === "true" ? true : false);
                  }}
                  label={"3位決定戦を実施"}
                >
                  <MenuItem value="true">{"はい"}</MenuItem>
                  <MenuItem value="false">{"いいえ"}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setSettingsDialogOpen(false)}
            color="inherit"
          >
            {"キャンセル"}
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSaveSettings}
            // 両方の値が0より大きい場合のみ保存を許可
            disabled={tempBlockCount <= 0 || tempAdvancingTeams <= 0}
          >
            {"保存"}
          </Button>
        </DialogActions>
      </Dialog>
      {/* ブロック分け編集ダイアログ */}
      <Dialog
        open={blockEditDialogOpen}
        onClose={() => setBlockEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>ブロック分けを編集</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            {blocks.map((block, idx) => (
              <Grid key={block.id} size={12}>
                <Typography variant="subtitle1" gutterBottom>
                  {`${"ブロック"} ${getBlockLetter(idx)}`}
                </Typography>
                <FormControl fullWidth>
                  <InputLabel>{"チーム"}</InputLabel>
                  <Select
                    multiple
                    value={manualBlockTeams[idx] || []}
                    onChange={e => handleManualBlockChange(idx, typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value as string[])}
                    renderValue={selected => (selected as string[]).map(id => getTeamName(id)).join(', ')}
                  >
                    {teams.map(team => (
                      <MenuItem key={team.id} value={team.id}>
                        {getTeamName(team.id)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBlockEditDialogOpen(false)}>{"キャンセル"}</Button>
          <Button variant="contained" color="primary" onClick={handleSaveBlockEdit}>{"保存"}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LeagueScoring;
