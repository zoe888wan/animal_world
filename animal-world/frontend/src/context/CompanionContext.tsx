/**
 * 陪伴宠物上下文
 * 存储用户选择的页面陪伴宠物 ID，供全局使用
 */
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

const STORAGE_KEY = 'animal_world_companion_pet_id';

const CompanionContext = createContext<{
  companionPetId: number | null;
  setCompanionPetId: (id: number | null) => void;
  refreshCompanion: () => void;
} | null>(null);

function loadStored(): number | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v) {
      const n = parseInt(v, 10);
      if (!isNaN(n)) return n;
    }
  } catch {}
  return null;
}

export function CompanionProvider({ children }: { children: ReactNode }) {
  const [companionPetId, setState] = useState<number | null>(loadStored);

  const setCompanionPetId = useCallback((id: number | null) => {
    setState(id);
    if (id != null) localStorage.setItem(STORAGE_KEY, String(id));
    else localStorage.removeItem(STORAGE_KEY);
  }, []);

  const refreshCompanion = useCallback(() => {
    setState(loadStored());
  }, []);

  return (
    <CompanionContext.Provider value={{ companionPetId, setCompanionPetId, refreshCompanion }}>
      {children}
    </CompanionContext.Provider>
  );
}

export function useCompanion() {
  const ctx = useContext(CompanionContext);
  if (!ctx) throw new Error('useCompanion must be used within CompanionProvider');
  return ctx;
}
