import { useEffect, useState, useRef, useCallback } from 'react';
import { getFirebaseDatabase } from '../config/firebase';
import { ref, onValue, set, update, remove, push, DataSnapshot } from 'firebase/database';

interface UpdateOptions {
  silent?: boolean;  // サイレント更新オプション
  optimistic?: boolean; // 楽観的更新
}

export function useDatabase<T>(path: string, initialValue: T | null = null) {
  const database = getFirebaseDatabase();
  const [data, setData] = useState<T | null>(initialValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isUpdatingRef = useRef(false);

  useEffect(() => {
    setLoading(true);
    const dbRef = ref(database, path);

    const unsubscribe = onValue(
      dbRef,
      (snapshot: DataSnapshot) => {
        const newData = snapshot.val() as T;

        // 書き込み中はリアルタイムsnapshotで楽観的UIを上書きしない
        if (!isUpdatingRef.current) {
          setData(newData);
        }

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

  // データの更新
  const updateData = useCallback(async (updates: Partial<T>, options: UpdateOptions = {}): Promise<boolean> => {
    if (!navigator.onLine) {
      throw new Error('You are offline');
    }

    // undefinedをnullに変換する関数
    const normalizeValue = (value: any): any => {
      if (value === undefined) return null;

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return Object.entries(value).reduce((acc, [k, v]) => {
          acc[k] = normalizeValue(v);
          return acc;
        }, {} as Record<string, any>);
      }

      if (Array.isArray(value)) {
        return value.map(v => normalizeValue(v));
      }

      return value;
    };

    isUpdatingRef.current = true;
    try {
      // 更新対象のパスのデータを個別に更新(undefinedをnullに変換して保存)
      const updatePromises = Object.entries(updates).map(([key, value]) => {
        const updatePath = `${path}/${key}`;
        const normalizedValue = normalizeValue(value);
        return update(ref(database), { [updatePath]: normalizedValue });
      });

      await Promise.all(updatePromises);

      // 楽観的UI更新
      if (options.optimistic) {
        setData(prev => ({
          ...prev,
          ...updates
        } as T));
      }

      return true;
    } catch (error) {
      console.error('Update error:', error);
      return false;
    } finally {
      isUpdatingRef.current = false;
    }
  }, [path]);

  // 部分更新(楽観的UI即時反映 + サーバー更新)
  const partialUpdate = useCallback(async (
    updates: Partial<T>,
    options: UpdateOptions = {}
  ): Promise<boolean> => {
    if (!data) return false;

    const optimistic = options.optimistic !== undefined ? options.optimistic : true;

    if (optimistic) {
      setData(prevData => ({ ...prevData, ...updates } as T));
    }

    return await updateData(updates, { ...options, optimistic: false });
  }, [data, updateData]);

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

  // 新しいデータの追加(キーを自動生成)
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

  return {
    data,
    loading,
    error,
    setData: updateData,
    updateData,
    removeData,
    pushData,
    partialUpdate,
  };
}
