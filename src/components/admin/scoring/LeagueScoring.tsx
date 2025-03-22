import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Card,
  CardContent,
  CardHeader,
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
import { useTranslation } from 'react-i18next';
import { Sport, Match, Team, LeagueBlock } from '../../../types';
import RoundRobinTable from '../../sports/RoundRobinTable';
import { TournamentStructureHelper } from './components/TournamentStructureHelper';
import TournamentScoring from './TournamentScoring';
import { v4 as uuidv4 } from 'uuid';

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
  const { t } = useTranslation();
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
              const gradeName = t(`roster.${gradeKey}`);
              const teamName = `${gradeName}${className}`;
              
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
  }, [sport.roster, useRosterTeams, t, onUpdate, sport]);

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
    
    if (existingBlocks.length > 0) {
      setBlocks(existingBlocks);
      setBlockCount(existingBlocks.length);
    } else {
      // ブロックがまだない場合は初期ブロックを作成
      const initialBlocks = Array.from({ length: blockCount }, (_, i) => ({
        id: `block_${i + 1}`,
        name: `ブロック ${i + 1}`,
        teamIds: [],
        matches: []
      }));
      setBlocks(initialBlocks);
    }
    
    if (playoffMatchesFound.length > 0) {
      setPlayoffMatches(playoffMatchesFound);
      setShowPlayoff(true);
    }
    
  }, [sport.id, blockCount, onUpdate, sport]); // sportのIDが変わった時だけ実行

  // チームをブロックに分配
  const distributeTeams = useCallback(() => {
    if (teams.length === 0 || blockCount === 0) return;
    
    // 既存のスコアデータが消えることを警告
    if (blocks.some(block => block.matches.some(m => m.team1Score > 0 || m.team2Score > 0))) {
      if (!window.confirm(t('league.confirmResetScores'))) {
        return;
      }
    }
    
    // チームをシャッフル
    const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
    
    // 各ブロックに均等に分配
    const newBlocks: LeagueBlock[] = Array.from({ length: blockCount }, (_, i) => ({
      id: `block_${i + 1}`,
      name: `ブロック ${i + 1}`,
      teamIds: [],
      matches: []
    }));
    
    shuffledTeams.forEach((team, i) => {
      const blockIndex = i % blockCount;
      newBlocks[blockIndex].teamIds.push(team.id);
    });
    
    // 各ブロック内で総当たり戦の試合を生成
    newBlocks.forEach(block => {
      const blockTeams = block.teamIds.map(id => teams.find(t => t.id === id)).filter(Boolean) as Team[];
      block.matches = generateRoundRobinMatches(blockTeams, block.id);
    });
    
    setBlocks(newBlocks);
    
    // sportデータを更新
    const allMatches = newBlocks.flatMap(block => block.matches);
    
    onUpdate({
      ...sport,
      teams: teams, // チームデータも更新
      matches: allMatches,
      leagueSettings: {
        ...sport.leagueSettings,
        blockCount,
        advancingTeams,
        hasPlayoff: true,
        hasThirdPlaceMatch
      }
    });
    
  }, [teams, blockCount, advancingTeams, blocks, hasThirdPlaceMatch, onUpdate, sport, t]);

  // 総当たり戦の試合を生成
  const generateRoundRobinMatches = (teams: Team[], blockId: string): Match[] => {
    const matches: Match[] = [];
    let matchNumber = 1;
    
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        matches.push({
          id: `match_${blockId}_${matchNumber}`,
          team1Id: teams[i].id,
          team2Id: teams[j].id,
          team1Score: 0,
          team2Score: 0,
          round: 1,
          matchNumber: matchNumber++,
          status: 'scheduled' as const, // リテラル型を明示
          blockId
        });
      }
    }
    
    return matches;
  };

  // 試合の編集
  const handleEditMatch = (match: Match) => {
    if (readOnly) return;
    setSelectedMatch(match);
    setMatchDialogOpen(true);
  };

  // 試合の更新
  const handleMatchUpdate = (updatedMatch: Match) => {
    if (readOnly) return;
    
    // 勝者を自動判定
    const winner = updatedMatch.team1Score > updatedMatch.team2Score 
      ? updatedMatch.team1Id 
      : updatedMatch.team2Score > updatedMatch.team1Score 
        ? updatedMatch.team2Id 
        : undefined;
    
    const finalMatch: Match = {
      ...updatedMatch,
      winnerId: winner,
      status: (updatedMatch.team1Score > 0 || updatedMatch.team2Score > 0) 
        ? 'completed' as const
        : 'scheduled' as const
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
    
    // スポーツデータ全体を更新
    const allMatches = [
      ...updatedBlocks.flatMap(block => block.matches),
      ...playoffMatches
    ];
    
    onUpdate({
      ...sport,
      matches: allMatches
    });
    
    setMatchDialogOpen(false);
  };

  // プレーオフトーナメントを生成関数を完全に書き直し、より安定的に
const generatePlayoffTournament = () => {
  if (blocks.length === 0) return;
  
  try {
    // ユーザーに確認（既存のプレーオフがある場合）
    if (playoffMatches.length > 0) {
      const confirmReset = window.confirm(t('league.confirmResetPlayoff'));
      if (!confirmReset) return;
    }

    // 各ブロックの成績計算（シンプル化）
    const blockStandings: Record<string, string[]> = {};
    
    blocks.forEach(block => {
      // チーム成績の計算（勝ち点方式）
      const teamStats: Record<string, {
        teamId: string,
        points: number,
        goalDiff: number,
        goalsFor: number
      }> = {};
      
      // 全チームを初期化
      block.teamIds.forEach(teamId => {
        teamStats[teamId] = {
          teamId,
          points: 0,
          goalDiff: 0,
          goalsFor: 0
        };
      });
      
      // 試合結果から集計
      block.matches.forEach(match => {
        // 完了した試合のみ集計
        if (match.status !== 'completed') return;
        
        // チーム1の成績更新
        if (match.team1Id && teamStats[match.team1Id]) {
          const stat = teamStats[match.team1Id];
          if (match.team1Score > match.team2Score) {
            stat.points += 3; // 勝ち
          } else if (match.team1Score === match.team2Score) {
            stat.points += 1; // 引き分け
          }
          stat.goalsFor += match.team1Score;
          stat.goalDiff += match.team1Score - match.team2Score;
        }
        
        // チーム2の成績更新
        if (match.team2Id && teamStats[match.team2Id]) {
          const stat = teamStats[match.team2Id];
          if (match.team2Score > match.team1Score) {
            stat.points += 3; // 勝ち
          } else if (match.team1Score === match.team2Score) {
            stat.points += 1; // 引き分け
          }
          stat.goalsFor += match.team2Score;
          stat.goalDiff += match.team2Score - match.team1Score;
        }
      });
      
      // 順位でソート
      const sortedTeams = Object.values(teamStats).sort((a, b) => {
        if (a.points !== b.points) return b.points - a.points;
        if (a.goalDiff !== b.goalDiff) return b.goalDiff - a.goalDiff;
        return b.goalsFor - a.goalsFor;
      });
      
      blockStandings[block.id] = sortedTeams.map(stat => stat.teamId);
    });
    
    // 各ブロックの上位チームを取得
    const advancingTeamIds: string[] = [];
    
    blocks.forEach(block => {
      const blockRanking = blockStandings[block.id] || [];
      for (let i = 0; i < Math.min(advancingTeams, blockRanking.length); i++) {
        advancingTeamIds.push(blockRanking[i]);
      }
    });
    
    if (advancingTeamIds.length < 2) {
      alert(t('tournament.needAtLeastTwoTeams'));
      return;
    }
    
    // 進出チームのチーム情報を取得
    const playoffTeamObjects = advancingTeamIds
      .map(id => teams.find(t => t.id === id))
      .filter(Boolean) as Team[];
    
    // ここからTournamentBuilderの処理と同様の実装
    
    // 1. 試合構造を生成
    const matchStructure = TournamentStructureHelper.generateInitialMatches(playoffTeamObjects.length);
    console.log("Tournament Structure:", matchStructure);
    
    // 2. チーム配置を計算
    const teamPlacements = TournamentStructureHelper.calculateTeamPlacements(playoffTeamObjects);
    console.log("Team Placements:", teamPlacements);
    
    // 3. 試合データを生成
    const newPlayoffMatches: Match[] = [];
    
    matchStructure.forEach((matchInfo, index) => {
      const { round, matchNumber } = matchInfo;
      
      // この試合に配置されるチームを探す
      const team1Placement = teamPlacements.find(p => 
        p.round === round && p.matchNumber === matchNumber && p.position === 'team1'
      );
      
      const team2Placement = teamPlacements.find(p => 
        p.round === round && p.matchNumber === matchNumber && p.position === 'team2'
      );
      
      // 新しい試合オブジェクトを作成
      const newMatch: Match = {
        id: `playoff_match_${round}_${matchNumber}`,
        team1Id: team1Placement?.teamId || '',
        team2Id: team2Placement?.teamId || '',
        team1Score: 0,
        team2Score: 0,
        round,
        matchNumber,
        status: 'scheduled',
        date: new Date().toISOString().split('T')[0],
        // blockIdは設定しない（プレーオフ試合の識別用）
      };
      
      newPlayoffMatches.push(newMatch);
    });
    
    // 4. 自動進出処理 (不戦勝)
    newPlayoffMatches.forEach(match => {
      if (match.round === 1) {
        // 1回戦でどちらかのチームだけいる場合は自動的に次の試合に進出
        if ((match.team1Id && !match.team2Id) || (!match.team1Id && match.team2Id)) {
          const winningTeamId = match.team1Id || match.team2Id;
          
          // 次の試合を探す
          const nextRoundMatch = newPlayoffMatches.find(m => 
            m.round === 2 && Math.ceil(match.matchNumber / 2) === m.matchNumber
          );
          
          if (nextRoundMatch) {
            // 奇数番号の試合は上側、偶数番号の試合は下側に進出
            if (match.matchNumber % 2 !== 0) {
              nextRoundMatch.team1Id = winningTeamId;
            } else {
              nextRoundMatch.team2Id = winningTeamId;
            }
          }
        }
      }
    });
    
    console.log("Generated playoff matches:", newPlayoffMatches);
    
    // 3位決定戦を追加
    if (hasThirdPlaceMatch && newPlayoffMatches.length > 0) {
      // 最終ラウンド（決勝戦）を特定
      const maxRound = Math.max(...newPlayoffMatches.map(m => m.round));
      
      // 準決勝戦を特定（最終ラウンドの1つ前）
      const semifinalMatches = newPlayoffMatches.filter(m => m.round === maxRound - 1);
      
      if (semifinalMatches.length >= 2) {
        // 3位決定戦の試合を生成 - IDを明確に識別できる形式に
        const thirdPlaceMatch: Match = {
          id: `playoff_third_place_match`,
          team1Id: '', // 準決勝敗者が入る
          team2Id: '', // 準決勝敗者が入る
          team1Score: 0,
          team2Score: 0,
          round: maxRound, // 決勝と同じラウンド
          matchNumber: 0, // 特別な番号として0を使用
          status: 'scheduled',
          date: new Date().toISOString().split('T')[0],
        };
        
        // 3位決定戦を追加
        newPlayoffMatches.push(thirdPlaceMatch);
        
        console.log("Added third place match:", thirdPlaceMatch);
      }
    }
    
    // 状態更新
    setPlayoffMatches(newPlayoffMatches);
    setShowPlayoff(true);
    
    // Sport全体のデータ更新
    const allMatches = [
      ...blocks.flatMap(block => block.matches),
      ...newPlayoffMatches // 新しいプレーオフ試合
    ];
    
    onUpdate({
      ...sport,
      matches: allMatches,
      leagueSettings: {
        ...sport.leagueSettings,
        hasPlayoff: true,
        hasThirdPlaceMatch: hasThirdPlaceMatch // ここで設定を保存
      }
    });
    
    // プレーオフタブに切り替え
    setActiveTab(blocks.length);
    
  } catch (error) {
    console.error("Error generating playoff tournament:", error);
    alert(t('tournament.errorGenerating'));
  }
};

  // プレーオフの試合更新を強化
  const handlePlayoffUpdate = (updatedPlayoff: Sport) => {
    // プレーオフの試合データを取得
    const newPlayoffMatches = [...updatedPlayoff.matches];
    
    // 準決勝試合を検出して、敗者を3位決定戦に移動するロジックを追加
    const maxRound = Math.max(...newPlayoffMatches.map(m => m.round));
    const semifinalMatches = newPlayoffMatches.filter(m => 
      m.round === maxRound - 1 && m.winnerId // 勝者が確定している準決勝
    );
    
    // 3位決定戦を探す
    const thirdPlaceMatch = newPlayoffMatches.find(m => 
      m.matchNumber === 0 || m.id.includes('third_place')
    );
    
    // 準決勝と3位決定戦が存在する場合
    if (semifinalMatches.length > 0 && thirdPlaceMatch) {
      // 敗者を取得
      const losers = semifinalMatches.map(match => 
        match.team1Id === match.winnerId ? match.team2Id : match.team1Id
      ).filter(Boolean);
      
      // チーム1が空なら1つ目の敗者を設定
      if (!thirdPlaceMatch.team1Id && losers.length > 0) {
        thirdPlaceMatch.team1Id = losers[0];
      }
      
      // チーム2が空なら2つ目の敗者を設定
      if (!thirdPlaceMatch.team2Id && losers.length > 1) {
        thirdPlaceMatch.team2Id = losers[1];
      }
    }
    
    // 更新された試合データを状態に反映
    setPlayoffMatches(newPlayoffMatches);
    
    // スポーツデータ全体を更新
    const allMatches = [
      ...blocks.flatMap(block => block.matches),
      ...newPlayoffMatches
    ];
    
    onUpdate({
      ...sport,
      matches: allMatches
    });
  };

  // 数値入力のハンドラーを改善
  const handleBlockCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // 空文字列の場合は一時的に許可（入力途中として扱う）
    if (value === '') {
      setBlockCount(0);
      return;
    }
    // 数値に変換して設定
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue)) {
      setBlockCount(Math.max(1, numValue));
    }
  };

  const handleAdvancingTeamsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // 空文字列の場合は一時的に許可
    if (value === '') {
      setAdvancingTeams(0);
      return;
    }
    // 数値に変換して設定
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue)) {
      setAdvancingTeams(Math.max(1, numValue));
    }
  };

  // 設定ダイアログの保存を修正
  const handleSaveSettings = () => {
    // 最終的な値のバリデーション
    const finalBlockCount = Math.max(1, blockCount);
    const finalAdvancingTeams = Math.max(1, advancingTeams);

    // 新しいブロック数で更新
    const newBlocks = Array.from({ length: finalBlockCount }, (_, i) => ({
      id: `block_${i + 1}`,
      name: `ブロック ${i + 1}`,
      teamIds: [],
      matches: []
    }));

    setBlocks(newBlocks);
    setBlockCount(finalBlockCount);
    setAdvancingTeams(finalAdvancingTeams);

    onUpdate({
      ...sport,
      leagueSettings: {
        blockCount: finalBlockCount,
        advancingTeams: finalAdvancingTeams,
        hasPlayoff: true,
        hasThirdPlaceMatch: hasThirdPlaceMatch
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

  return (
    <Box>
      {/* 設定パネル (readOnlyでない場合のみ表示) */}
      {!readOnly && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">{t('league.settings')}</Typography>
            <Button 
              variant="outlined" 
              color="primary" 
              onClick={() => setSettingsDialogOpen(true)}
            >
              {t('league.editSettings')}
            </Button>
          </Box>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Typography variant="body1">
                {t('league.blocks')}: <strong>{blockCount}</strong>
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="body1">
                {t('league.advancingTeams')}: <strong>{advancingTeams}</strong>
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="body1">
                {t('league.hasThirdPlace')}: <strong>{hasThirdPlaceMatch ? t('common.yes') : t('common.no')}</strong>
              </Typography>
            </Grid>
          </Grid>
          
          <Divider sx={{ my: 2 }} />
          
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Alert severity="info" sx={{ mb: 2 }}>
                {teams.length > 0 ? (
                  <>{t('league.usingRosterTeams', { count: teams.length })}</>
                ) : (
                  <>{t('league.noTeamsFound')}</>
                )}
              </Alert>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Button 
                variant="contained" 
                color="primary" 
                fullWidth
                startIcon={<ShuffleIcon />}
                onClick={distributeTeams}
                disabled={teams.length === 0}
              >
                {t('league.distributeTeams')}
              </Button>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Button 
                variant="contained" 
                color="secondary" 
                fullWidth
                onClick={generatePlayoffTournament}
                disabled={blocks.length === 0 || teams.length < 2}
              >
                {t('league.generatePlayoff')}
              </Button>
            </Grid>
          </Grid>
        </Paper>
      )}
      
      {/* チームがない場合の警告表示 */}
      {teams.length === 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <AlertTitle>{t('league.noTeams')}</AlertTitle>
          {t('league.pleaseAddTeamsFromRoster')}
        </Alert>
      )}
      
      {/* ブロックタブ */}
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
                <Tab key={block.id} label={`${t('league.block')} ${index + 1}`} />
              ))}
              {showPlayoff && (
                <Tab label={t('league.playoff')} />
              )}
            </Tabs>
          </Paper>
          
          {/* ブロックのタブパネル */}
          {blocks.map((block, index) => (
            <TabPanel key={block.id} value={activeTab} index={index}>
              <Paper sx={{ p: 2, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  {`${t('league.block')} ${index + 1} ${t('league.teams')}`}
                </Typography>
                <Grid container spacing={1}>
                  {block.teamIds.map(teamId => (
                    <Grid item key={teamId}>
                      <Chip label={getTeamName(teamId)} />
                    </Grid>
                  ))}
                  {block.teamIds.length === 0 && (
                    <Grid item xs={12}>
                      <Typography color="text.secondary">
                        {t('league.noTeams')}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
                
                {/* ブロック内の試合一覧 */}
                {block.matches.length > 0 ? (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      {t('league.matches')}
                    </Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>{t('league.match')}</TableCell>
                            <TableCell>{t('league.team1')}</TableCell>
                            <TableCell align="center">{t('league.score')}</TableCell>
                            <TableCell>{t('league.team2')}</TableCell>
                            <TableCell align="center">{t('league.status')}</TableCell>
                            {!readOnly && (
                              <TableCell align="center">{t('league.actions')}</TableCell>
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
                                  label={t(`match.${match.status}`)}
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
                    {t('league.noMatches')}
                  </Alert>
                )}
                
                {/* ブロックの順位表 */}
                {block.matches.length > 0 && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      {t('league.standings')}
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
                  {t('league.playoffTournament')}
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
                    {t('league.noPlayoffYet')}
                  </Alert>
                )}
              </Paper>
            </TabPanel>
          )}
        </Box>
      ) : (
        <Alert severity="info" sx={{ mb: 3 }}>
          {t('league.noBlocksYet')}
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
            {t('league.editMatch')}
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Grid container alignItems="center">
                  <Grid item xs={5} sx={{ textAlign: 'center' }}>
                    <Typography variant="subtitle1">
                      {getTeamName(selectedMatch.team1Id)}
                    </Typography>
                  </Grid>
                  <Grid item xs={2} sx={{ textAlign: 'center' }}>
                    <Typography variant="body1">VS</Typography>
                  </Grid>
                  <Grid item xs={5} sx={{ textAlign: 'center' }}>
                    <Typography variant="subtitle1">
                      {getTeamName(selectedMatch.team2Id)}
                    </Typography>
                  </Grid>
                </Grid>
              </Grid>
              
              <Grid item xs={12}>
                <Grid container spacing={2}>
                  <Grid item xs={5}>
                    <TextField
                      fullWidth
                      label={t('league.score')}
                      type="number"
                      value={selectedMatch.team1Score}
                      onChange={(e) => setSelectedMatch({
                        ...selectedMatch,
                        team1Score: parseInt(e.target.value) || 0
                      })}
                      inputProps={{ min: 0 }}
                    />
                  </Grid>
                  <Grid item xs={2} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="h5">-</Typography>
                  </Grid>
                  <Grid item xs={5}>
                    <TextField
                      fullWidth
                      label={t('league.score')}
                      type="number"
                      value={selectedMatch.team2Score}
                      onChange={(e) => setSelectedMatch({
                        ...selectedMatch,
                        team2Score: parseInt(e.target.value) || 0
                      })}
                      inputProps={{ min: 0 }}
                    />
                  </Grid>
                </Grid>
              </Grid>
              
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>{t('league.status')}</InputLabel>
                  <Select
                    value={selectedMatch.status}
                    onChange={(e) => setSelectedMatch({
                      ...selectedMatch,
                      status: e.target.value as 'scheduled' | 'inProgress' | 'completed'
                    })}
                  >
                    <MenuItem value="scheduled">{t('match.scheduled')}</MenuItem>
                    <MenuItem value="inProgress">{t('match.inProgress')}</MenuItem>
                    <MenuItem value="completed">{t('match.completed')}</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setMatchDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button 
              variant="contained" 
              color="primary"
              onClick={() => handleMatchUpdate(selectedMatch)}
            >
              {t('common.save')}
            </Button>
          </DialogActions>
        </Dialog>
      )}
      
      {/* 設定ダイアログ */}
      <Dialog
        open={settingsDialogOpen}
        onClose={() => setSettingsDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {t('league.leagueSettings')}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('league.blockCount')}
                type="number"
                value={blockCount || ''} // 0の場合は空文字列を表示
                onChange={handleBlockCountChange}
                helperText={t('league.blockCountHelp')}
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('league.advancingTeams')}
                type="number"
                value={advancingTeams || ''} // 0の場合は空文字列を表示
                onChange={handleAdvancingTeamsChange}
                helperText={t('league.advancingTeamsHelp')}
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel id="third-place-match-label">{t('league.hasThirdPlace')}</InputLabel>
                <Select
                  labelId="third-place-match-label"
                  value={hasThirdPlaceMatch ? "true" : "false"}
                  onChange={(e) => {
                    setHasThirdPlaceMatch(e.target.value === "true" ? true : false);
                  }}
                  label={t('league.hasThirdPlace')}
                >
                  <MenuItem value="true">{t('common.yes')}</MenuItem>
                  <MenuItem value="false">{t('common.no')}</MenuItem>
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
            {t('common.cancel')}
          </Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleSaveSettings}
            // 両方の値が0より大きい場合のみ保存を許可
            disabled={blockCount <= 0 || advancingTeams <= 0}
          >
            {t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LeagueScoring;
