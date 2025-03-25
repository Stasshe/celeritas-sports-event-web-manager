// イベントタイプ
export interface Event {
  id: string;
  name: string;
  date: string;
  alternativeDate?: string; // 雨天時の予備日
  description: string;
  isActive: boolean; // 現在表示したい行事かどうか
  organizers: Organizer[]; // 担当者リスト
  sports: string[]; // スポーツIDの配列
  coverImageUrl?: string; // カバー画像URL追加
  createdAt?: string; // オプショナルなcreatedAt属性を追加
  // 以下を追加
  roster?: {
    grade1?: Record<string, string[]>; // クラス名: 名前リスト 1年生
    grade2?: Record<string, string[]>; // クラス名: 名前リスト 2年生
    grade3?: Record<string, string[]>; // クラス名: 名前リスト 3年生
  };
  gradeParticipation?: {
    grade1: boolean;
    grade2: boolean;
    grade3: boolean;
  };
  // 以下を追加：総合成績ボード設定
  overallScoreboard?: {
    enabled: boolean;
    displayScores: boolean; // 詳細スコアを表示するか
    displayRank: number; // 何位まで表示するか（デフォルト3位）
    teamType: 'class' | 'grade' | 'custom'; // チーム種別
    customTeams?: string[]; // カスタムチーム名リスト
  };
  // 以下を追加：総合成績
  overallScores?: Record<string, number>; // チームID：合計点数
  // 以下を追加：スポーツごとのポイント設定
  sportPointSettings?: Record<string, {
    enabled: boolean; // 総合成績に含めるか
    points: number[]; // 順位ごとのポイント [1位, 2位, 3位, ...]
    weight: number; // 重み付け係数（デフォルト1.0）
    customPointRule?: string; // カスタムポイントルールの説明
  }>;
}

// 担当者タイプ
export interface Organizer {
  id: string;
  name: string;
  role: "leader" | "member" | string; // リーダー、メンバー、またはカスタム役職
  grade: 1 | 2 | 3; // 学年
}

// スポーツタイプ
export interface Sport {
  id: string;
  name: string;
  eventId: string;
  type: "tournament" | "roundRobin" | "league" | "ranking"; // 競技形式
  description?: string;
  rules?: string;
  manual?: string; // マニュアル情報
  organizers: Organizer[]; // 担当者リスト
  teams: Team[];
  matches: Match[];
  // トーナメント設定
  tournamentSettings?: {
    hasThirdPlaceMatch: boolean; // 3位決定戦の有無
    hasRepechage: boolean; // 敗者復活戦の有無
  };
  // 総当たり戦設定
  roundRobinSettings?: Partial<RoundRobinSettings>;
  // リーグ戦設定
  leagueSettings: {
    blockCount: number; // ブロック数を必須に
    advancingTeams: number; // 各ブロックから何チーム進出するか
    hasPlayoff: boolean; // プレーオフの有無
    hasThirdPlaceMatch: boolean; // 3位決定戦の有無
  };
  // ランキング設定
  rankingSettings?: {
    criteriaName: string; // 順位付けの基準名 (例: タイム、得点)
    isAscending: boolean; // 小さい方が上位か (タイム等)
  };
  // カスタム形式の場合のデータ
  customLayout?: CustomCell[][];
  // 名簿データ
  roster?: {
    grade1?: Record<string, string[]>; // クラス名: 名前リスト 1年生
    grade2?: Record<string, string[]>; // クラス名: 名前リスト 2年生
    grade3?: Record<string, string[]>; // クラス名: 名前リスト 3年生
  };
  coverImageUrl?: string; // カバー画像のURLを追加
  [key: string]: any; // インデックスシグネチャを追加
  lastEditedBy: string | undefined;  // nullを削除
  lastEditedAt?: string;
  scheduleSettings?: ScheduleSettings | LeagueScheduleSettings;
  // 以下を追加：総合成績用ポイント設定
  pointSettings?: {
    enabled: boolean; // 総合成績に含めるか
    points: number[]; // 順位ごとのポイント [1位, 2位, 3位, ...]
    weight: number; // 重み付け係数（デフォルト1.0）
    customPointRule?: string; // カスタムポイントルールの説明
  };
}

// リーグのブロック情報
export interface LeagueBlock {
  id: string;
  name: string;
  teamIds: string[];
  matches: Match[];
}

// 総当たり戦設定の型を明確に定義
export interface RoundRobinSettings {
  winPoints: number;
  drawPoints: number;
  losePoints: number;
  considerLosePoints: boolean;
  rankingMethod: 'points' | 'goalDifference' | 'goals';
  displayRankCount: number;
}

// デフォルト設定を定義
export const defaultRoundRobinSettings: RoundRobinSettings = {
  winPoints: 3,
  drawPoints: 1,
  losePoints: 0,
  considerLosePoints: false,
  rankingMethod: 'points',
  displayRankCount: 3
};

// チームタイプ
export interface Team {
  id: string;
  name: string;
  members?: string[];
  color?: string;
  logo?: string;
  blockId?: string; // Add this property for league competitions
}

// 試合タイプ - winnerId を string | undefined に統一
export interface Match {
  id: string;
  team1Id: string;
  team2Id: string;
  team1Score: number;
  team2Score: number;
  winnerId?: string; // null ではなく undefined を使用
  round: number; // トーナメントの場合のラウンド
  matchNumber: number; // 試合番号
  date?: string;
  
  location?: string;
  status: "scheduled" | "inProgress" | "completed"; // リテラル型を使用
  notes?: string;
  group?: string; 
  blockId?: string; // リーグ戦のブロックID
}

// カスタム形式のセル
export interface CustomCell {
  id: string;
  rowIndex: number;
  colIndex: number;
  content: string;
  type: "header" | "data" | "score" | "result";
  colspan?: number;
  rowspan?: number;
  style?: Record<string, string>;
}

// ユーザータイプ
export interface User {
  email: string;
  isAdmin: boolean;
}

export interface Player {
  id: string;
  name: string;
  grade: 1 | 2 | 3;
  teamId: string;
}

// ランキング用のエントリ
export interface RankingEntry {
  id: string;
  teamId: string;
  rank: number;
  score?: number | null; // スコアやタイム（null許可を追加）
  notes?: string;
  participantName?: string; // チームが存在しない場合の参加者名
}

// スケジュール情報の型を追加
export interface TimeSlot {
  startTime: string; // "09:00"の形式
  endTime: string; // "10:30"の形式
  title?: string; // オプショナルなタイトル（「休憩」など）
  type: "match" | "break" | "lunch" | "preparation" | "cleanup"; // 時間枠の種類
  matchId?: string; // 試合ID（type: "match"の場合）
  courtId?: 'court1' | 'court2'; // どのコートで行うか
  description?: string; // オプショナルな説明
  matchDescription?: string; // 試合の説明（チーム名など）を含むテキスト
}

// スケジュール設定インターフェース - 一貫性のために null 型も許可
export interface ScheduleSettings {
  startTime: string; // 開始時間 "09:00"
  endTime: string; // 終了時間 "17:00"
  matchDuration: number; // 一試合あたりの時間（分）
  breakDuration: number; // 休憩時間（分）
  courtCount: 1 | 2; // コート数（1または2）
  courtNames?: {  // 各コートの名前
    court1: string;
    court2?: string;
  };
  lunchBreak?: { // ランチ休憩（オプショナル）
    startTime: string;
    endTime: string;
  } | null; // nullを許容するように変更
  breakTimes?: TimeSlot[] | null; // nullを許容
  timeSlots?: TimeSlot[] | null; // nullを許容
}

// リーグ戦特有のスケジュール設定
export interface LeagueScheduleSettings extends ScheduleSettings {
  groupStageDuration: number; // グループステージの試合時間（分）
  playoffDuration: number; // プレーオフの試合時間（分）
  breakBetweenStages: number; // ステージ間の休憩時間（分）
}

// 総合成績の結果エントリ
export interface OverallScoreEntry {
  teamId: string;
  teamName: string;
  totalPoints: number;
  rank: number;
  sportPoints: Record<string, number>; // 競技ID：獲得ポイント
}