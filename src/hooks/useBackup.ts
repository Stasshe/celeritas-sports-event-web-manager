import { useCallback, useEffect, useState } from 'react';
import { database } from '../config/firebase';
import { ref, onValue, update, set, get, DataSnapshot } from 'firebase/database';
import { Event, Sport } from '../types';
import { useDatabase } from './useDatabase';

// バックアップの設定
export const BACKUP_CONFIG = {
  AUTO_BACKUP_COUNT: 3,   // 自動バックアップの保存数
  MANUAL_BACKUP_COUNT: 3, // 手動バックアップの保存数
  AUTO_BACKUP_INTERVAL: 3600000, // 自動バックアップの間隔（ミリ秒）: 1時間
};

// バックアップタイプ
export type BackupType = 'auto' | 'manual';

// バックアップエントリー
export interface BackupEntry {
  id: string;
  timestamp: number;
  description?: string;
  type: BackupType;
}

export interface BackupData {
  events?: Record<string, Event>;
  sports?: Record<string, Sport>;
  timestamp: number;
  description?: string;
}

export function useBackup() {
  const { data: events } = useDatabase<Record<string, Event>>('/events');
  const { data: sports } = useDatabase<Record<string, Sport>>('/sports');
  
  const [autoBackups, setAutoBackups] = useState<BackupEntry[]>([]);
  const [manualBackups, setManualBackups] = useState<BackupEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [backupLoading, setBackupLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // バックアップリストをロードする
  useEffect(() => {
    const backupRef = ref(database, '/backup');
    
    const unsubscribe = onValue(backupRef, (snapshot) => {
      try {
        const data = snapshot.val();
        if (!data) {
          setAutoBackups([]);
          setManualBackups([]);
          setLoading(false);
          return;
        }
        
        // 自動バックアップを取得
        const autoEntries: BackupEntry[] = [];
        if (data.auto) {
          Object.keys(data.auto).forEach((id) => {
            if (id === '_version') return;
            
            if (data.auto[id].timestamp) {
              autoEntries.push({
                id,
                timestamp: data.auto[id].timestamp,
                type: 'auto'
              });
            }
          });
        }
        
        // 手動バックアップを取得
        const manualEntries: BackupEntry[] = [];
        if (data.manual) {
          Object.keys(data.manual).forEach((id) => {
            if (id === '_version') return;
            
            if (data.manual[id].timestamp) {
              manualEntries.push({
                id,
                timestamp: data.manual[id].timestamp,
                description: data.manual[id].description,
                type: 'manual'
              });
            }
          });
        }
        
        // 日時順にソート（新しい順）
        setAutoBackups(autoEntries.sort((a, b) => b.timestamp - a.timestamp));
        setManualBackups(manualEntries.sort((a, b) => b.timestamp - a.timestamp));
      } catch (err) {
        console.error('Failed to load backups', err);
        setError(err instanceof Error ? err : new Error('バックアップの読み込みに失敗しました'));
      } finally {
        setLoading(false);
      }
    });
    
    return () => {
      unsubscribe();
    };
  }, []);

  // バックアップの作成
  const createBackup = useCallback(async (
    type: BackupType = 'auto', 
    description?: string
  ): Promise<string | null> => {
    if (!events || !sports) return null;
    
    try {
      setBackupLoading(true);
      
      const timestamp = Date.now();
      const id = `backup_${timestamp}`;
      const backupData: BackupData = {
        events,
        sports,
        timestamp,
        description
      };
      
      const backupPath = `/backup/${type}/${id}`;
      await set(ref(database, backupPath), backupData);
      
      // バックアップ数の制限を適用
      const maxBackups = type === 'auto' ? BACKUP_CONFIG.AUTO_BACKUP_COUNT : BACKUP_CONFIG.MANUAL_BACKUP_COUNT;
      const currentBackups = type === 'auto' ? autoBackups : manualBackups;
      
      if (currentBackups.length >= maxBackups) {
        // 古いバックアップを削除
        const backupsToDelete = currentBackups
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(maxBackups - 1);
          
        for (const backup of backupsToDelete) {
          await set(ref(database, `/backup/${type}/${backup.id}`), null);
        }
      }
      
      return id;
    } catch (err) {
      console.error('Failed to create backup', err);
      setError(err instanceof Error ? err : new Error('バックアップの作成に失敗しました'));
      return null;
    } finally {
      setBackupLoading(false);
    }
  }, [events, sports, autoBackups, manualBackups]);
  
  // バックアップからの復元
  const restoreBackup = useCallback(async (type: BackupType, id: string): Promise<boolean> => {
    try {
      setBackupLoading(true);
      
      // バックアップデータを取得
      const backupRef = ref(database, `/backup/${type}/${id}`);
      const snapshot = await get(backupRef);
      const backupData = snapshot.val() as BackupData | null;
      
      if (!backupData || !backupData.events || !backupData.sports) {
        throw new Error('バックアップデータが存在しないか、壊れています');
      }
      
      // イベントとスポーツデータを復元
      await update(ref(database), {
        '/events': backupData.events,
        '/sports': backupData.sports
      });
      
      return true;
    } catch (err) {
      console.error('Failed to restore backup', err);
      setError(err instanceof Error ? err : new Error('バックアップの復元に失敗しました'));
      return false;
    } finally {
      setBackupLoading(false);
    }
  }, []);

  // バックアップの詳細を取得
  const getBackupDetails = useCallback(async (
    type: BackupType, 
    id: string
  ): Promise<BackupData | null> => {
    try {
      const backupRef = ref(database, `/backup/${type}/${id}`);
      const snapshot = await get(backupRef);
      const backupData = snapshot.val() as BackupData | null;
      return backupData;
    } catch (err) {
      console.error('Failed to get backup details', err);
      setError(err instanceof Error ? err : new Error('バックアップの詳細取得に失敗しました'));
      return null;
    }
  }, []);

  // 差分を計算する関数
  const getBackupDiff = useCallback(async (
    type: BackupType,
    id: string,
    compareTo: 'current' | { type: BackupType, id: string }
  ): Promise<{ events: any, sports: any } | null> => {
    try {
      // ターゲットのバックアップを取得
      const backupData = await getBackupDetails(type, id);
      if (!backupData) return null;
      
      // 比較先のデータを取得
      let compareData: BackupData | null;
      
      if (compareTo === 'current') {
        compareData = {
          events: events || {},
          sports: sports || {},
          timestamp: Date.now()
        };
      } else {
        compareData = await getBackupDetails(compareTo.type, compareTo.id);
        if (!compareData) return null;
      }
      
      // 差分を計算
      const eventsDiff = compareObjectDiff(backupData.events || {}, compareData.events || {});
      const sportsDiff = compareObjectDiff(backupData.sports || {}, compareData.sports || {});
      
      return {
        events: eventsDiff,
        sports: sportsDiff
      };
    } catch (err) {
      console.error('Failed to calculate backup diff', err);
      setError(err instanceof Error ? err : new Error('差分計算に失敗しました'));
      return null;
    }
  }, [events, sports, getBackupDetails]);

  // オブジェクトの差分を計算するヘルパー関数
  const compareObjectDiff = (obj1: Record<string, any>, obj2: Record<string, any>) => {
    const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);
    const diff: Record<string, { added?: boolean, removed?: boolean, changed?: boolean, oldValue?: any, newValue?: any }> = {};
    
    allKeys.forEach(key => {
      // 特殊なキーはスキップ
      if (key === '_version') return;
      
      if (!(key in obj1)) {
        // 新しく追加された項目
        diff[key] = { added: true, newValue: obj2[key] };
      } else if (!(key in obj2)) {
        // 削除された項目
        diff[key] = { removed: true, oldValue: obj1[key] };
      } else if (JSON.stringify(obj1[key]) !== JSON.stringify(obj2[key])) {
        // 変更された項目
        diff[key] = { 
          changed: true, 
          oldValue: obj1[key], 
          newValue: obj2[key] 
        };
      }
    });
    
    return diff;
  };

  // 定期的な自動バックアップ
  useEffect(() => {
    if (!events || !sports) return;
    
    const autoBackupInterval = setInterval(() => {
      createBackup('auto').catch(console.error);
    }, BACKUP_CONFIG.AUTO_BACKUP_INTERVAL);
    
    // 最初の自動バックアップ（もし自動バックアップが1つもなければ）
    if (autoBackups.length === 0) {
      createBackup('auto').catch(console.error);
    }
    
    return () => {
      clearInterval(autoBackupInterval);
    };
  }, [events, sports, autoBackups.length, createBackup]);

  return {
    autoBackups,
    manualBackups,
    loading,
    backupLoading,
    error,
    createBackup,
    restoreBackup,
    getBackupDetails,
    getBackupDiff
  };
}
