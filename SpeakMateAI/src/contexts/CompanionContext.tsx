import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { COMPANIONS, Companion, CompanionId, DEFAULT_COMPANION_ID, getCompanion } from '@/config/companions';
import { STORAGE_KEYS } from '@/utils/constants';

interface CompanionCtx {
  companion: Companion;
  companions: Companion[];
  selectCompanion: (id: CompanionId) => Promise<void>;
}

const Ctx = createContext<CompanionCtx | undefined>(undefined);

export function CompanionProvider({ children }: { children: React.ReactNode }) {
  const [companionId, setCompanionId] = useState<CompanionId>(DEFAULT_COMPANION_ID);

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem(STORAGE_KEYS.SELECTED_COMPANION);
      if (saved && COMPANIONS.find((c) => c.id === saved)) {
        setCompanionId(saved as CompanionId);
      }
    })();
  }, []);

  const selectCompanion = useCallback(async (id: CompanionId) => {
    setCompanionId(id);
    await AsyncStorage.setItem(STORAGE_KEYS.SELECTED_COMPANION, id);
  }, []);

  const companion = useMemo(() => getCompanion(companionId), [companionId]);

  return (
    <Ctx.Provider value={{ companion, companions: COMPANIONS, selectCompanion }}>
      {children}
    </Ctx.Provider>
  );
}

export function useCompanion(): CompanionCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCompanion must be used within CompanionProvider');
  return ctx;
}
