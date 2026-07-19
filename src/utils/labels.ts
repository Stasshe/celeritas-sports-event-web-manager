import { Match, Sport, TimeSlot } from '../types';

const sportTypeLabels: Record<Sport['type'], string> = {
  tournament: 'トーナメント',
  roundRobin: '総当たり戦',
  league: 'リーグ形式',
  ranking: 'ランキング形式',
};

const sportTypeDescriptions: Record<Sport['type'], string> = {
  tournament: 'トーナメント形式で試合を行います',
  roundRobin: '総当たり戦で試合を行います',
  league: 'リーグ戦形式で試合を行います',
  ranking: 'ランキング形式で順位を決定します',
};

const matchStatusLabels: Record<Match['status'], string> = {
  scheduled: '予定',
  inProgress: '進行中',
  completed: '完了',
  potential: '可能性',
};

const scheduleTypeLabels: Record<TimeSlot['type'], string> = {
  match: '試合',
  break: '休憩',
  lunch: '昼休み',
  preparation: '準備',
  cleanup: '片付け',
};

export const getSportTypeLabel = (type: Sport['type']): string => sportTypeLabels[type];

export const getSportTypeDescription = (type: Sport['type']): string => sportTypeDescriptions[type];

export const getMatchStatusLabel = (status: Match['status']): string => matchStatusLabels[status];

export const getScheduleTypeLabel = (type: TimeSlot['type']): string => scheduleTypeLabels[type];
