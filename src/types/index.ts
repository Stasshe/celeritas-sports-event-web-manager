// イベントタイプ
export interface Event {
  id: string;
  name: string;
  date: string;
  description: string;
  isActive: boolean;
  coverImage?: string | null; // nullも許容するように変更
  sports: string[]; // スポーツIDの配列
}

// スポーツタイプ
export interface Sport {
  id: string;
  name: string;
  eventId: string;
  type: "tournament" | "roundRobin" | "custom"; // 競技形式
  coverImage?: string | null; // nullも許容するように変更
  description?: string;
  rules?: string;
  teams: Team[];
  matches: Match[];
  // カスタム形式の場合のデータ
  customLayout?: CustomCell[][];
}

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
