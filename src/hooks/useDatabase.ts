import { useEffect, useState, useRef, useCallback } from 'react';
import { database } from '../config/firebase';
import { ref, onValue, set, update, remove, push, DataSnapshot } from 'firebase/database';

interface UpdateOptions {
  silent?: boolean;  // サイレント更新オプション
  partial?: boolean; // 部分更新オプション
}

export function useDatabase<T>(path: string, initialValue: T | null = null) {
  const [data, setData] = useState<T | null>(initialValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isUpdatingRef = useRef(false);
  const updateQueueRef = useRef<{ data: T, resolve: () => void, reject: () => void }[]>([]);
  const [version, setVersion] = useState<number>(0);

  useEffect(() => {
    setLoading(true);
    const dbRef = ref(database, path);

    const unsubscribe = onValue(
      dbRef,
      (snapshot: DataSnapshot) => {
        const newData = snapshot.val();
        if (newData?._version && newData._version !== version) {
          setVersion(newData._version);
        }
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
      const dbRef = ref(database, path);
      // オンライン状態を確認
      if (!navigator.onLine) {
        throw new Error('You are offline');
      }
      
      // 保存を試みる
      const result = await set(dbRef, newData);
      // 保存が成功したかどうかを確認
      if (result !== undefined) {
        throw new Error('Failed to save data');
      }
      return true;
    } catch (error) {
      console.error('Save error:', error);
      throw error; // エラーを上位に伝播
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
        data: { ...updates, _version: version + 1 },
        resolve: async () => {
          try {
            await setData_({ ...updates, _version: version + 1 });
            setData(updates);
            setVersion(v => v + 1);
            resolve(true);
          } catch (error) {
            console.error('Update error:', error);
            reject(error);
          }
        },
        reject: () => reject(new Error('Update failed'))
      });
      processUpdateQueue();
    });
  }, [processUpdateQueue, version]);

  // 部分更新用の関数を追加
  const partialUpdate = useCallback(async (
    updates: Partial<T>,
    options: UpdateOptions = {}
  ): Promise<boolean> => {
    if (!data) return false;

    try {
      const updatedData = { ...data, ...updates };
      if (options.silent) {
        // サイレント更新：ローディング状態を変更しない
        await set(ref(database, path), updatedData);
        setData(updatedData);
      } else {
        await updateData(updatedData);
      }
      return true;
    } catch (error) {
      console.error('Partial update error:', error);
      return false;
    }
  }, [data, path, updateData]);

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

  return { 
    data, 
    loading, 
    error, 
    setData: updateData, 
    updateData, 
    removeData, 
    pushData,
    partialUpdate,
    version 
  };
}
