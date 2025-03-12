import { useEffect, useState, useRef, useCallback } from 'react';
import { database } from '../config/firebase';
import { ref, onValue, set, update, remove, push, DataSnapshot } from 'firebase/database';

export function useDatabase<T>(path: string, initialValue: T | null = null) {
  const [data, setData] = useState<T | null>(initialValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isUpdatingRef = useRef(false);
  const updateQueueRef = useRef<{ data: T, resolve: () => void, reject: () => void }[]>([]);

  useEffect(() => {
    setLoading(true);
    const dbRef = ref(database, path);

    const unsubscribe = onValue(
      dbRef,
      (snapshot: DataSnapshot) => {
        const newData = snapshot.val();
        setData(newData as T);
        setLoading(false);
      },
      (error) => {
        setError(error);
        setLoading(false);
      }
    );

    return () => {
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

  // データの更新を管理するキュー処理
  const processUpdateQueue = useCallback(async () => {
    if (isUpdatingRef.current || updateQueueRef.current.length === 0) return;

    isUpdatingRef.current = true;
    const { data: updateData, resolve, reject } = updateQueueRef.current[0];

    try {
      await set(ref(database, path), updateData);
      updateQueueRef.current.shift();
      resolve();
    } catch (err) {
      console.error('Update failed:', err);
      reject();
    } finally {
      isUpdatingRef.current = false;
      if (updateQueueRef.current.length > 0) {
        processUpdateQueue();
      }
    }
  }, [path]);

  // 安全な更新処理
  const updateData = useCallback(async (updates: T): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      updateQueueRef.current.push({
        data: updates,
        resolve: () => resolve(true),
        reject: () => reject(false)
      });
      processUpdateQueue();
    });
  }, [processUpdateQueue]);

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

  // クリーンアップ
  useEffect(() => {
    return () => {
      updateQueueRef.current = [];
      isUpdatingRef.current = false;
    };
  }, []);

  return { data, loading, error, setData: updateData, updateData, removeData, pushData };
}
