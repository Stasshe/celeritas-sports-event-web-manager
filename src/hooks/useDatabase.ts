import { useEffect, useState, useRef, useCallback } from 'react';
import { database } from '../config/firebase';
import { ref, onValue, set, update, remove, push, DataSnapshot } from 'firebase/database';

interface UpdateOptions {
  silent?: boolean;  // サイレント更新オプション
  partial?: boolean; // 部分更新オプション
  optimistic?: boolean; // 楽観的更新
  fieldsToUpdate?: string[]; // 更新するフィールドの指定
}

export function useDatabase<T>(path: string, initialValue: T | null = null) {
  const [data, setData] = useState<T | null>(initialValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isUpdatingRef = useRef(false);
  const updateQueueRef = useRef<{ data: Partial<T>, options: UpdateOptions, resolve: (value: boolean) => void, reject: (reason?: any) => void }[]>([]);
  const [version, setVersion] = useState<number>(0);
  const localVersionRef = useRef<number>(0);
  const previousDataRef = useRef<T | null>(null);
  const [conflictStatus, setConflictStatus] = useState<'none' | 'detected' | 'resolved'>('none');
  
  // 変更されたフィールドの追跡
  const modifiedFieldsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setLoading(true);
    const dbRef = ref(database, path);

    const unsubscribe = onValue(
      dbRef,
      (snapshot: DataSnapshot) => {
        const newData = snapshot.val() as T & { _version?: number };
        
        // バージョン管理
        if (newData && newData._version !== undefined) {
          // 外部更新を検出（他のユーザーによる更新）
          if (localVersionRef.current > 0 && newData._version > localVersionRef.current && isUpdatingRef.current === false) {
            // 変更を検出したフィールドを特定
            const changedExternalFields = detectChangedFields(previousDataRef.current, newData);
            
            // ローカルで変更中のフィールドとの競合を検出
            const modifiedFieldsArray = Array.from(modifiedFieldsRef.current);
            const conflictingFields = modifiedFieldsArray.filter(field => 
              changedExternalFields.has(field));
            
            if (conflictingFields.length > 0) {
              setConflictStatus('detected');
              console.log('変更の競合が検出されました:', conflictingFields);
              
              // 重要: 競合フィールド以外のみ更新
              const nonConflictingData = { ...newData };
              conflictingFields.forEach(field => {
                // ネストされたフィールドの処理
                if (field.includes('.')) {
                  const parts = field.split('.');
                  let current = data as any;
                  let target = nonConflictingData as any;
                  
                  for (let i = 0; i < parts.length - 1; i++) {
                    current = current[parts[i]];
                    target = target[parts[i]];
                  }
                  
                  const lastPart = parts[parts.length - 1];
                  if (current && target) {
                    target[lastPart] = current[lastPart];
                  }
                } else {
                  // 単純なフィールドの場合
                  if (data) {
                    nonConflictingData[field as keyof typeof nonConflictingData] = (data as any)[field];
                  }
                }
              });
              // 競合を除いたデータで更新
              setData(nonConflictingData as T);
              return; // 競合があれば処理を終了
            }
          }
          
          localVersionRef.current = newData._version;
          setVersion(newData._version);
        }
        
        // 前のデータを保存（差分検出用）
        previousDataRef.current = newData;
        
        // 更新中でなければ標準の更新
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

  // 変更されたフィールドを検出する関数
  const detectChangedFields = (oldData: any, newData: any, prefix = ''): Set<string> => {
    const changedFields = new Set<string>();
    
    if (!oldData || !newData) return changedFields;
    
    // すべてのキーを収集
    const allKeys = new Set([
      ...Object.keys(oldData || {}),
      ...Object.keys(newData || {})
    ]);
    
    // 特別なフィールドは無視
    allKeys.delete('_version');
    
    // Setを配列に変換して反復処理（エラー修正）
    Array.from(allKeys).forEach(key => {
      const fullPath = prefix ? `${prefix}.${key}` : key;
      
      // 値が存在しない場合
      if (!oldData[key] && newData[key]) {
        changedFields.add(fullPath);
        return;
      }
      
      if (oldData[key] && !newData[key]) {
        changedFields.add(fullPath);
        return;
      }
      
      // オブジェクトの場合は再帰
      if (typeof oldData[key] === 'object' && typeof newData[key] === 'object') {
        const nestedChanges = detectChangedFields(oldData[key], newData[key], fullPath);
        // Setを配列に変換して反復処理（エラー修正）
        Array.from(nestedChanges).forEach(field => changedFields.add(field));
      } 
      // プリミティブ値の比較
      else if (oldData[key] !== newData[key]) {
        changedFields.add(fullPath);
      }
    });
    
    return changedFields;
  };

  // データの書き込み
  const setData_ = async (newData: Partial<T>, options: UpdateOptions = {}) => {
    try {
      const dbRef = ref(database, path);
      // オンライン状態を確認
      if (!navigator.onLine) {
        throw new Error('You are offline');
      }
      
      // オプティミスティックUIのためにデータを即時更新
      if (options.optimistic) {
        const currentData = data || {} as T;
        const mergedData = { ...currentData, ...newData } as T;
        setData(mergedData);
      }
      
      // 現在のデータと新しいデータをマージ
      const currentData = data || {} as T;
      const mergedData = { ...currentData, ...newData } as T & { _version?: number };
      
      // バージョンの更新
      if (version !== undefined) {
        mergedData._version = version + 1;
      }
      
      // 部分更新の場合
      if (options.partial && options.fieldsToUpdate) {
        const updates: Record<string, any> = {};
        
        options.fieldsToUpdate.forEach(field => {
          // ネストされたフィールドの処理
          if (field.includes('.')) {
            const parts = field.split('.');
            let current: any = mergedData;
            let updatePath = path;
            
            for (let i = 0; i < parts.length - 1; i++) {
              current = current[parts[i]];
              updatePath += `/${parts[i]}`;
            }
            
            const lastPart = parts[parts.length - 1];
            updates[`${updatePath}/${lastPart}`] = current[lastPart];
          } else {
            updates[`${path}/${field}`] = (mergedData as any)[field];
          }
        });
        
        // バージョンも更新
        updates[`${path}/_version`] = mergedData._version;
        
        await update(ref(database), updates);
      } else {
        // 完全な更新
        await set(dbRef, mergedData);
      }
      
      // バージョンの更新
      localVersionRef.current = mergedData._version || 0;
      setVersion(mergedData._version || 0);
      
      // 競合状態をリセット
      setConflictStatus('none');
      
      // 変更されたフィールドをクリア
      modifiedFieldsRef.current.clear();
      
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
    const { data: updateData, options, resolve, reject } = updateQueueRef.current[0];

    try {
      await setData_(updateData, options);
      updateQueueRef.current.shift();
      resolve(true);
    } catch (err) {
      console.error('Update failed:', err);
      reject(err);
    } finally {
      isUpdatingRef.current = false;
      if (updateQueueRef.current.length > 0) {
        processUpdateQueue();
      }
    }
  }, [path]);

  const updateData = useCallback(async (updates: Partial<T>, options: UpdateOptions = {}): Promise<boolean> => {
    if (!navigator.onLine) {
      throw new Error('You are offline');
    }

    try {
      // 更新対象のパスのデータを個別に更新
      const updatePromises = Object.entries(updates).map(([key, value]) => {
        const updatePath = `${path}/${key}`;
        return update(ref(database), { [updatePath]: value });
      });

      // すべての更新を並行して実行
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
    }
  }, [database, path]);

  // フィールド変更の追跡
  const trackFieldChange = useCallback((fieldName: string) => {
    modifiedFieldsRef.current.add(fieldName);
  }, []);

  // 部分更新用の関数を改善
  const partialUpdate = useCallback(async (
    updates: Partial<T>,
    options: UpdateOptions = {}
  ): Promise<boolean> => {
    if (!data) return false;

    try {
      // 更新するフィールドを特定
      const fieldsToUpdate = options.fieldsToUpdate || Object.keys(updates);
      
      // 楽観的更新オプションの設定
      const optimistic = options.optimistic !== undefined ? options.optimistic : true;
      
      // 変更されたフィールドを追跡
      fieldsToUpdate.forEach(field => trackFieldChange(field));
      
      // 楽観的UI更新（即時反映）- ここが重要
      if (optimistic) {
        // isUpdatingRef.currentをtrueにしないことでデータの差し替えを防止
        const tempFlag = isUpdatingRef.current;
        isUpdatingRef.current = false;
        
        // 現在のデータを更新してローカルUI状態を更新
        setData(prevData => ({...prevData, ...updates} as T));
        
        // フラグを元に戻す
        isUpdatingRef.current = tempFlag;
      }
      
      // サーバー側の実際の更新処理
      return await updateData(updates, {
        ...options,
        partial: true,
        optimistic: false, // 既に楽観的に更新したので二重適用を避ける
        fieldsToUpdate
      });
    } catch (error) {
      console.error('Partial update error:', error);
      return false;
    }
  }, [data, updateData, trackFieldChange]);

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

  // 競合解決機能を強化
  const resolveConflict = useCallback(async (resolution: 'local' | 'remote' | 'merge', mergeData?: Partial<T>) => {
    if (conflictStatus !== 'detected') return;
    
    try {
      if (resolution === 'local' && data) {
        // ローカルのデータを優先（フィールド競合情報を活用）
        const localUpdates: Partial<T> = {};
        const modifiedFieldsArray = Array.from(modifiedFieldsRef.current);
        
        // 変更されたフィールドだけを更新対象に
        modifiedFieldsArray.forEach(field => {
          let value = data;
          const parts = field.split('.');
          
          for (let i = 0; i < parts.length; i++) {
            value = (value as any)[parts[i]];
            if (value === undefined) break;
          }
          
          if (value !== undefined) {
            // ネストされたフィールドの処理
            if (field.includes('.')) {
              if (!localUpdates) return;
              const parts = field.split('.');
              let current = localUpdates as any;
              
              for (let i = 0; i < parts.length - 1; i++) {
                if (!current[parts[i]]) current[parts[i]] = {};
                current = current[parts[i]];
              }
              
              current[parts[parts.length - 1]] = value;
            } else {
              (localUpdates as any)[field] = value;
            }
          }
        });
        
        await updateData(localUpdates as Partial<T>, { 
          fieldsToUpdate: modifiedFieldsArray,
          partial: true,
          optimistic: true 
        });
      } else if (resolution === 'remote') {
        // リモートのデータを受け入れる（単純にデータの再取得）
        setConflictStatus('resolved');
        modifiedFieldsRef.current.clear();
      } else if (resolution === 'merge' && mergeData) {
        // マージデータを使用して更新
        await updateData(mergeData, { 
          optimistic: true,
          fieldsToUpdate: Object.keys(mergeData)
        });
      }
      
      setConflictStatus('resolved');
    } catch (error) {
      console.error('Conflict resolution error:', error);
    }
  }, [conflictStatus, data, updateData]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      updateQueueRef.current = [];
      isUpdatingRef.current = false;
      modifiedFieldsRef.current.clear();
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
    version,
    trackFieldChange,
    conflictStatus,
    resolveConflict
  };
}
