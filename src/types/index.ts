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
  roundRobinSettings?: {
    winPoints: number; // 勝ち点
    drawPoints: number; // 引き分け点
    losePoints: number; // 負け点
    considerLosePoints: boolean; // 負け点を考慮するか
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
}

// チームタイプ
export interface Team {
  id: string;
  name: string;
  members?: string[];
  color?: string;
  logo?: string;
}

export type MatchStatus = 'scheduled' | 'inProgress' | 'completed';

export interface Match {
  id: string;
  round: number;
  matchNumber: number;
  team1Id?: string;
  team2Id?: string;
  team1Score: number;
  team2Score: number;
  winnerId?: string;
  status: MatchStatus;
  date?: string;
  location?: string;
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