import { useEffect, useState } from 'react';
import { database } from '../config/firebase';
import { ref, onValue, set, update, remove, push, DataSnapshot } from 'firebase/database';

export function useDatabase<T>(path: string, initialValue: T | null = null) {
  const [data, setData] = useState<T | null>(initialValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // データの読み取りとリアルタイム監視
  useEffect(() => {
    const dbRef = ref(database, path);
    const unsubscribe = onValue(
      dbRef,
      (snapshot: DataSnapshot) => {
        setData(snapshot.val() as T);
        setLoading(false);
      },
      (error) => {
        setError(error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
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
  const removeData = async () => {
    try {
      await remove(ref(database, path));
      return true;
    } catch (error) {
      setError(error as Error);
      return false;
    }
  };

  // 新しいデータの追加（キーを自動生成）
  const pushData = async (newData: Omit<T, 'id'>) => {
    try {
      const newRef = push(ref(database, path));
      await set(newRef, { ...newData, id: newRef.key });
      return newRef.key;
    } catch (error) {
      setError(error as Error);
      return null;
    }
  };

  return { data, loading, error, setData: setData_, updateData, removeData, pushData };
}
