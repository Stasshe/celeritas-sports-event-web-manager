import { useMemo } from 'react';
import { Sport, Match, ClassScheduleEntry, Event } from '../types';
import { timeToMinutes } from '../utils/scheduleGenerator';

// 各スポーツのスケジュール設定からクラススケジュールエントリを生成するフック
export const useClassSchedule = (
  sports: Sport[],
  activeEvent: Event | null,
  selectedClasses: string[]
): ClassScheduleEntry[] => {
  
  // スポーツデータからクラススケジュールエントリを生成
  const scheduleEntries = useMemo(() => {
    if (!sports.length || !activeEvent) return [];
    
    const entries: ClassScheduleEntry[] = [];
    
    sports.forEach(sport => {
      // スケジュール設定がない場合はスキップ
      if (!sport.scheduleSettings?.timeSlots || sport.scheduleSettings.timeSlots.length === 0) {
        console.log(`Sport ${sport.name} has no timeSlots or schedule settings`);
        return;
      }
      
      // すべてのチームを含める（フィルタリングは後で行う）
      const allTeams = sport.teams || [];
      
      console.log(`Processing ${sport.name} with ${sport.scheduleSettings.timeSlots.length} time slots`);
      
      // タイムスロットを処理
      sport.scheduleSettings.timeSlots.forEach(slot => {
        // 試合タイプのみ処理
        if (slot.type !== 'match' || !slot.matchId) return;
        
        // 対応する試合を取得
        const match = sport.matches?.find(m => m.id === slot.matchId);
        if (!match) {
          console.log(`Match not found for matchId: ${slot.matchId}`);
          return;
        }
        
        // チームを取得
        const team1 = allTeams.find(t => t.id === match.team1Id);
        const team2 = allTeams.find(t => t.id === match.team2Id);
        
        if (!team1 || !team2) {
          console.log(`Teams not found for match: ${match.id}`);
          return;
        }
        
        // 名前からクラス識別子を抽出するヘルパー関数
        const extractClassIdentifier = (teamName: string): string => {
          // "grade1-1-A", "grade2-2-B", "1A", "3C"などの形式に対応
          const patterns = [
            /grade(\d)-(\d)-([A-Za-z0-9]+)/i,  // grade1-1-A形式
            /^(\d)([A-Za-z])$/                 // 1A形式
          ];
          
          for (const pattern of patterns) {
            const match = teamName.match(pattern);
            if (match) {
              return match[0];
            }
          }
          return teamName; // パターンに一致しない場合はそのまま返す
        };
        
        // チーム名からクラス識別子を取得
        const team1ClassId = extractClassIdentifier(team1.name);
        const team2ClassId = extractClassIdentifier(team2.name);
        
        // この試合が選択されたクラスに関連するかチェック
        const isRelevantToSelectedClasses = 
          selectedClasses.length === 0 || // 何も選択されていない場合はすべて表示
          selectedClasses.includes(team1.id) || 
          selectedClasses.includes(team2.id) ||
          selectedClasses.includes(team1ClassId) ||
          selectedClasses.includes(team2ClassId);
        
        if (!isRelevantToSelectedClasses) return;
        
        // 確定試合の場合
        const entry: ClassScheduleEntry = {
          sportId: sport.id,
          sportName: sport.name,
          matchId: match.id,
          startTime: slot.startTime,
          endTime: slot.endTime,
          location: match.location,
          date: match.date,
          teams: {
            team1Id: team1.id,
            team1Name: team1.name,
            team2Id: team2.id,
            team2Name: team2.name
          },
          status: match.status || 'scheduled',
          courtId: slot.courtId,
          courtName: slot.courtId ? sport.scheduleSettings?.courtNames?.[slot.courtId] : undefined
        };
        
        entries.push(entry);
      });
      
      // 潜在的な試合（トーナメントの次の試合など）を処理
      const potentialMatches = sport.matches.filter(m => m.status === 'potential');
      
      potentialMatches.forEach(match => {
        // この試合の潜在的な参加者をチェック
        if (!match.potentialParticipants?.length) return;
        
        // 選択されたクラスに関連する潜在的な試合のみフィルター
        const isRelevantToSelectedClasses = 
          selectedClasses.length === 0 || // 何も選択されていない場合はすべて表示
          match.potentialParticipants.some(teamId => selectedClasses.includes(teamId));
        
        if (!isRelevantToSelectedClasses) return;
        
        // スケジュール設定から時間を予測
        const matchDuration = sport.scheduleSettings?.matchDuration || 30;
        
        // 前の試合の情報から時間を予測する（例：準々決勝 → 準決勝）
        const previousMatches = sport.matches.filter(m => 
          m.round === match.round - 1 && m.status !== 'potential'
        );
        
        if (previousMatches.length > 0) {
          // 前のラウンドの試合の最終時間から30分後を推定
          const lastPreviousMatch = previousMatches.reduce((latest, m) => {
            // 試合のスロットを見つける
            const slot = sport.scheduleSettings?.timeSlots?.find(s => s.matchId === m.id);
            if (!slot) return latest;
            
            const currentEndMinutes = timeToMinutes(slot.endTime);
            const latestEndMinutes = latest ? timeToMinutes(latest.endTime) : 0;
            
            return currentEndMinutes > latestEndMinutes ? slot : latest;
          }, null as any);
          
          if (lastPreviousMatch) {
            // 潜在的な参加者の名前を取得
            const potentialTeams = match.potentialParticipants.map(teamId => {
              const team = sport.teams.find(t => t.id === teamId);
              return team ? team.name : 'Unknown';
            });
            
            // 前の試合の後30分後を推定開始時間とする
            const lastEndMinutes = timeToMinutes(lastPreviousMatch.endTime);
            const estimatedStartMinutes = lastEndMinutes + 30; // 30分後
            const estimatedStartTime = minutesToTime(estimatedStartMinutes);
            const estimatedEndTime = minutesToTime(estimatedStartMinutes + matchDuration);
            
            // 潜在的な試合エントリを作成
            const potentialEntry: ClassScheduleEntry = {
              sportId: sport.id,
              sportName: sport.name,
              matchId: match.id,
              startTime: estimatedStartTime,
              endTime: estimatedEndTime,
              location: match.location,
              date: match.date,
              teams: {
                team1Id: potentialTeams[0] || 'TBD',
                team1Name: potentialTeams[0] || 'TBD',
                team2Id: potentialTeams[1] || 'TBD',
                team2Name: potentialTeams[1] || 'TBD'
              },
              status: 'potential',
              certainty: match.certainty || 50, // デフォルト50%
            };
            
            entries.push(potentialEntry);
          }
        }
      });
    });
    
    console.log(`Generated ${entries.length} schedule entries`);
    
    // 試合時間でソート
    return entries.sort((a, b) => {
      // 日付の比較（日付がある場合）
      if (a.date && b.date) {
        const dateComparison = new Date(a.date).getTime() - new Date(b.date).getTime();
        if (dateComparison !== 0) return dateComparison;
      } else if (a.date) {
        return -1; // aに日付があればaを先に
      } else if (b.date) {
        return 1;  // bに日付があればbを先に
      }
      
      // 開始時間で比較
      return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
    });
  }, [sports, activeEvent, selectedClasses]);
  
  return scheduleEntries;
};

// 分を時間文字列（HH:MM）に変換するユーティリティ関数
export const minutesToTime = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};
