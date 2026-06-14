// RemoteConfigContext — single source of truth for kill switches.
// Subscribes to Firestore `system/config` in real-time + polls backend every 60s
// for budget/usage data. Provides `isEnabled(module)` + `config` to the rest of the app.
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  RemoteConfig,
  DEFAULT_CONFIG,
  subscribeRemoteConfig,
  fetchBackendStatus,
  fetchRemoteConfig,
} from '@/services/remoteConfigService';

type ModuleKey = 'tutor' | 'speaking' | 'interview' | 'premium' | 'global';

interface Ctx {
  config: RemoteConfig;
  loading: boolean;
  isEnabled: (mod: ModuleKey) => boolean;
  refresh: () => Promise<void>;
}

const RemoteConfigContext = createContext<Ctx | undefined>(undefined);

export function RemoteConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<RemoteConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  const merge = (partial: Partial<RemoteConfig>) => {
    if (!mounted.current) return;
    setConfig((prev) => ({ ...prev, ...partial }));
  };

  const refresh = async () => {
    const [firestoreCfg, backendCfg] = await Promise.all([
      fetchRemoteConfig(),
      fetchBackendStatus(),
    ]);
    merge(firestoreCfg);
    if (backendCfg) merge(backendCfg);
    setLoading(false);
  };

  useEffect(() => {
    mounted.current = true;
    refresh();
    // Real-time Firestore subscription
    const unsubFs = subscribeRemoteConfig((partial) => merge(partial));
    // Poll backend status every 60s for budget tracking
    const interval = setInterval(() => {
      fetchBackendStatus().then((c) => {
        if (c) merge(c);
      });
    }, 60_000);
    return () => {
      mounted.current = false;
      unsubFs();
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isEnabled = (mod: ModuleKey): boolean => {
    // Backend kill switch takes priority — if it's down, everything's off.
    if (config.forceDisabled) return false;
    if (!config.globalAIEnabled) return mod === 'premium' ? config.premiumEnabled : false;
    switch (mod) {
      case 'tutor':     return config.tutorEnabled;
      case 'speaking':  return config.speakingEnabled;
      case 'interview': return config.interviewEnabled;
      case 'premium':   return config.premiumEnabled;
      case 'global':    return config.globalAIEnabled;
    }
  };

  return (
    <RemoteConfigContext.Provider value={{ config, loading, isEnabled, refresh }}>
      {children}
    </RemoteConfigContext.Provider>
  );
}

export function useRemoteConfig(): Ctx {
  const ctx = useContext(RemoteConfigContext);
  if (!ctx) throw new Error('useRemoteConfig must be used within RemoteConfigProvider');
  return ctx;
}
