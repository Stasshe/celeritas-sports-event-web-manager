import { useCallback, useEffect, useMemo, useRef } from 'react';
import { AUTO_SAVE_DELAY, useAdminLayout } from '../context/AdminLayoutContext';

export const useAutoSave = (scope: string, handler: () => Promise<boolean>) => {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  const {
    cancelScheduledSave,
    registerSaveHandler,
    save,
    scheduleSave,
    unregisterSaveHandler,
  } = useAdminLayout();

  useEffect(() => {
    const currentHandler = () => handlerRef.current();
    registerSaveHandler(currentHandler, scope);
    return () => unregisterSaveHandler(scope);
  }, [registerSaveHandler, scope, unregisterSaveHandler]);

  const schedule = useCallback((delay = AUTO_SAVE_DELAY) => {
    scheduleSave(scope, delay);
  }, [scheduleSave, scope]);

  const saveNow = useCallback(() => save(scope), [save, scope]);
  const cancel = useCallback(() => cancelScheduledSave(scope), [cancelScheduledSave, scope]);

  return useMemo(() => ({ cancel, saveNow, schedule }), [cancel, saveNow, schedule]);
};
