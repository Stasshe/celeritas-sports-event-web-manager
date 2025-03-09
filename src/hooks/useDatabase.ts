import { useEffect, useState } from 'react';
import { database } from '../config/firebase';
import { ref, onValue, set, update, remove, push, DataSnapshot } from 'firebase/database';

// グローバルキャッシュの型定義
interface Cache {
  [path: string]: {
    data: any;
    timestamp: number;
    subscribers: number;
  };
}

// メモリ内キャッシュ
const globalCache: Cache = {};

// キャッシュの有効期間（5分）
const CACHE_DURATION = 5 * 60 * 1000;

export function useDatabase<T>(path: string, initialValue: T | null = null) {
  const [data, setData] = useState<T | null>(() => {
    // キャッシュからの初期値取得
    const cached = globalCache[path];
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
    return initialValue;
  });
  const [loading, setLoading] = useState(!globalCache[path]);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // キャッシュのサブスクライバーをインクリメント
    if (!globalCache[path]) {
      globalCache[path] = { data: null, timestamp: 0, subscribers: 0 };
    }
    globalCache[path].subscribers++;

    const dbRef = ref(database, path);
    const unsubscribe = onValue(
      dbRef,
      (snapshot: DataSnapshot) => {
        const newData = snapshot.val();
        // キャッシュを更新
        globalCache[path] = {
          data: newData,
          timestamp: Date.now(),
          subscribers: globalCache[path].subscribers
        };
        setData(newData as T);
        setLoading(false);
      },
      (error) => {
        setError(error);
        setLoading(false);
      }
    );

    return () => {
      // クリーンアップ時にサブスクライバーをデクリメント
      globalCache[path].subscribers--;
      if (globalCache[path].subscribers === 0) {
        delete globalCache[path];
      }
      unsubscribe();
    };
  }, [path]);

  // データの書き込み
  const setData_ = async (newData: T) => {
    try {
      await set(ref(database, path), newData);
      return true;
    } catch (error) {
      setError(error as Error);
      return false;
    }
  };

  // データの更新
  const updateData = async (updates: Partial<T>) => {
    try {
      await update(ref(database, path), updates);
      return true;
    } catch (error) {
      setError(error as Error);
      return false;
    }
  };

  // データの削除
  const removeData = async (subPath: string = '') => {
    try {
      await remove(ref(database, path + subPath));
      return true;
    } catch (error) {
      setError(error as Error);
      return false;
    }
  };

  // 新しいデータの追加（キーを自動生成）
  const pushData = async <U extends Omit<T extends Record<string, infer R> ? R : never, 'id'>>(newData: U): Promise<string | null> => {
    try {
      const newRef = push(ref(database, path));
      const newId = newRef.key!;
      await set(newRef, { ...newData, id: newId });
      return newId;
    } catch (error) {
      setError(error as Error);
      return null;
    }
  };

  return { data, loading, error, setData: setData_, updateData, removeData, pushData };
}
