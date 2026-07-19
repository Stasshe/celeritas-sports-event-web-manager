import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Alert, Box, Button, Snackbar, Typography } from '@mui/material';
import { Save as SaveIcon, Sync as SyncIcon, Warning as WarningIcon } from '@mui/icons-material';

export const AUTO_SAVE_DELAY = 800;

type SavingStatus = 'idle' | 'saving' | 'saved' | 'error';
type SnackbarSeverity = 'success' | 'error' | 'info' | 'warning';

interface SnackbarOptions {
  action?: React.ReactNode;
  autoHideDuration?: number;
  icon?: React.ReactNode;
}

interface SaveHandler {
  handler: () => Promise<boolean>;
  revision: number;
}

interface AdminLayoutActions {
  cancelScheduledSave: (scope: string) => void;
  hasUnsavedChanges: () => boolean;
  registerSaveHandler: (handler: () => Promise<boolean>, scope: string) => void;
  save: (scope?: string) => Promise<boolean>;
  scheduleSave: (scope: string, delay?: number) => void;
  setSavingStatus: (status: SavingStatus) => void;
  showSnackbar: (message: string, severity: SnackbarSeverity, options?: SnackbarOptions) => void;
  unregisterSaveHandler: (scope: string) => void;
}

interface AdminSaveState {
  hasUnsavedChanges: boolean;
  lastSaved: Date | null;
  savingStatus: SavingStatus;
}

interface SnackbarState {
  action?: React.ReactNode;
  autoHideDuration: number;
  icon?: React.ReactNode;
  message: string;
  open: boolean;
  severity: SnackbarSeverity;
}

const AdminLayoutActionsContext = createContext<AdminLayoutActions | null>(null);
const AdminSaveStateContext = createContext<AdminSaveState | null>(null);

const PendingSave = () => {
  const actions = useContext(AdminLayoutActionsContext);
  const state = useContext(AdminSaveStateContext);
  if (!actions || !state?.hasUnsavedChanges) return null;

  return (
    <Box
      sx={{
        alignItems: 'center',
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        bottom: 24,
        boxShadow: 4,
        display: 'flex',
        gap: 1,
        left: 24,
        p: 1.5,
        position: 'fixed',
        zIndex: 2000,
      }}
    >
      <Typography variant="body2" color="text.secondary">未保存の変更があります</Typography>
      <Button size="small" startIcon={<SaveIcon />} onClick={() => actions.save()} variant="outlined">
        保存
      </Button>
    </Box>
  );
};

export const AdminLayoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [saveState, setSaveState] = useState<AdminSaveState>({
    hasUnsavedChanges: false,
    lastSaved: null,
    savingStatus: 'idle',
  });
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    autoHideDuration: 4000,
    message: '',
    open: false,
    severity: 'info',
  });

  const activeSaveCountRef = useRef(0);
  const dirtyScopesRef = useRef(new Set<string>());
  const handlersRef = useRef(new Map<string, SaveHandler>());
  const inFlightSavesRef = useRef(new Map<string, Promise<boolean>>());
  const isOnlineRef = useRef(navigator.onLine);
  const saveRef = useRef<(scope?: string) => Promise<boolean>>(async () => false);
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const updateDirtyState = useCallback(() => {
    const hasUnsavedChanges = dirtyScopesRef.current.size > 0;
    setSaveState((current) => {
      if (current.hasUnsavedChanges === hasUnsavedChanges) return current;
      return { ...current, hasUnsavedChanges };
    });
  }, []);

  const showSnackbar = useCallback((
    message: string,
    severity: SnackbarSeverity,
    options: SnackbarOptions = {},
  ) => {
    setSnackbar({
      action: options.action,
      autoHideDuration: options.autoHideDuration ?? 4000,
      icon: options.icon,
      message,
      open: true,
      severity,
    });
  }, []);

  const setSavingStatus = useCallback((savingStatus: SavingStatus) => {
    setSaveState((current) => {
      if (current.savingStatus === savingStatus) return current;
      return { ...current, savingStatus };
    });
  }, []);

  const cancelScheduledSave = useCallback((scope: string) => {
    const timer = timersRef.current.get(scope);
    if (timer) clearTimeout(timer);
    timersRef.current.delete(scope);
  }, []);

  const registerSaveHandler = useCallback((handler: () => Promise<boolean>, scope: string) => {
    const current = handlersRef.current.get(scope);
    handlersRef.current.set(scope, {
      handler,
      revision: current?.revision ?? 0,
    });
  }, []);

  const unregisterSaveHandler = useCallback((scope: string) => {
    cancelScheduledSave(scope);
    handlersRef.current.delete(scope);
    dirtyScopesRef.current.delete(scope);
    updateDirtyState();
  }, [cancelScheduledSave, updateDirtyState]);

  const save = useCallback(async (scope?: string): Promise<boolean> => {
    if (!isOnlineRef.current) {
      showSnackbar('オフライン状態では保存できません', 'error', { icon: <WarningIcon /> });
      setSavingStatus('error');
      return false;
    }

    const scopes = scope ? [scope] : Array.from(dirtyScopesRef.current);
    if (scopes.length === 0) return true;

    activeSaveCountRef.current += 1;
    setSavingStatus('saving');

    const results = await Promise.all(scopes.map(async (targetScope) => {
      cancelScheduledSave(targetScope);
      const previousSave = inFlightSavesRef.current.get(targetScope);
      if (previousSave) await previousSave;

      const registration = handlersRef.current.get(targetScope);
      if (!registration) {
        console.error(`Save handler is not registered for scope "${targetScope}"`);
        return false;
      }

      const revision = registration.revision;
      const pendingSave = registration.handler().catch((error) => {
        console.error(`Save failed for scope "${targetScope}":`, error);
        return false;
      });
      inFlightSavesRef.current.set(targetScope, pendingSave);

      const success = await pendingSave;
      if (inFlightSavesRef.current.get(targetScope) === pendingSave) {
        inFlightSavesRef.current.delete(targetScope);
      }

      const latest = handlersRef.current.get(targetScope);
      if (success && latest?.revision === revision) {
        dirtyScopesRef.current.delete(targetScope);
      }
      return success;
    }));

    activeSaveCountRef.current -= 1;
    updateDirtyState();
    const success = results.every(Boolean);

    if (!success) {
      setSavingStatus('error');
      showSnackbar('保存に失敗しました', 'error', {
        action: (
          <Button color="inherit" size="small" startIcon={<SyncIcon />} onClick={() => saveRef.current(scope)}>
            再試行
          </Button>
        ),
        icon: <WarningIcon />,
      });
    } else if (activeSaveCountRef.current === 0) {
      const savingStatus = dirtyScopesRef.current.size === 0 ? 'saved' : 'idle';
      setSaveState((current) => ({ ...current, lastSaved: new Date(), savingStatus }));
    }

    return success;
  }, [cancelScheduledSave, setSavingStatus, showSnackbar, updateDirtyState]);

  const scheduleSave = useCallback((scope: string, delay = AUTO_SAVE_DELAY) => {
    const registration = handlersRef.current.get(scope);
    if (!registration) {
      console.error(`Cannot schedule save without a handler for scope "${scope}"`);
      return;
    }

    registration.revision += 1;
    dirtyScopesRef.current.add(scope);
    updateDirtyState();
    cancelScheduledSave(scope);
    timersRef.current.set(scope, setTimeout(() => {
      timersRef.current.delete(scope);
      void saveRef.current(scope);
    }, delay));
  }, [cancelScheduledSave, updateDirtyState]);

  const hasUnsavedChanges = useCallback(() => dirtyScopesRef.current.size > 0, []);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  useEffect(() => {
    const handleOnline = () => {
      isOnlineRef.current = true;
    };
    const handleOffline = () => {
      isOnlineRef.current = false;
      setSavingStatus('error');
      showSnackbar('オフライン状態です。インターネット接続を確認してください', 'error');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setSavingStatus, showSnackbar]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges()) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => () => {
    timersRef.current.forEach(clearTimeout);
  }, []);

  const actions = useMemo<AdminLayoutActions>(() => ({
    cancelScheduledSave,
    hasUnsavedChanges,
    registerSaveHandler,
    save,
    scheduleSave,
    setSavingStatus,
    showSnackbar,
    unregisterSaveHandler,
  }), [
    cancelScheduledSave,
    hasUnsavedChanges,
    registerSaveHandler,
    save,
    scheduleSave,
    setSavingStatus,
    showSnackbar,
    unregisterSaveHandler,
  ]);

  return (
    <AdminLayoutActionsContext.Provider value={actions}>
      <AdminSaveStateContext.Provider value={saveState}>
        {children}
        <PendingSave />
        <Snackbar
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          autoHideDuration={snackbar.autoHideDuration}
          onClose={() => setSnackbar((current) => ({ ...current, open: false }))}
          open={snackbar.open}
        >
          <Alert
            action={snackbar.action}
            icon={snackbar.icon}
            onClose={() => setSnackbar((current) => ({ ...current, open: false }))}
            severity={snackbar.severity}
            variant="filled"
          >
            <Box>{snackbar.message}</Box>
          </Alert>
        </Snackbar>
      </AdminSaveStateContext.Provider>
    </AdminLayoutActionsContext.Provider>
  );
};

export const useAdminLayout = () => {
  const context = useContext(AdminLayoutActionsContext);
  if (!context) throw new Error('useAdminLayout must be used within AdminLayoutProvider');
  return context;
};

export const useAdminSaveState = () => {
  const context = useContext(AdminSaveStateContext);
  if (!context) throw new Error('useAdminSaveState must be used within AdminLayoutProvider');
  return context;
};
