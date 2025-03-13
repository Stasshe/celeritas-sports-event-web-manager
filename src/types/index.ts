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
  type: "tournament" | "roundRobin" | "custom"; // 競技形式
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
}

// 試合タイプ
export interface Match {
  id: string;
  team1Id: string;
  team2Id: string;
  team1Score: number;
  team2Score: number;
  winnerId?: string;
  round: number; // トーナメントの場合のラウンド
  matchNumber: number; // 試合番号
  date?: string;
  location?: string;
  status: "scheduled" | "inProgress" | "completed";
  notes?: string;
  group?: string; // 追加
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