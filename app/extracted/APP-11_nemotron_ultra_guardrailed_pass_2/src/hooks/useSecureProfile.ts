src/hooks/useSecureProfile.ts
import { useCallback, useEffect, useState } from 'react';
import { initDB, upsertProfile, getProfile, setPII, clearPII, wipeSecureStore } from '../db/SecureProfileDB';

export function useSecureProfile(userId: string | null) {
  const [profile, setProfile] = useState<{
    userId: string;
    displayName: string;
    avatarUri: string;
    email?: string;
    phone?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!userId) { setProfile(null); setLoading(false); return; }
      try {
        await initDB();
        const data = await getProfile(userId);
        if (mounted) { setProfile(data); setLoading(false); }
      } catch (e) { console.error(e); setLoading(false); }
    }
    load();
    return () => { mounted = false; };
  }, [userId]);

  const updateProfile = useCallback(async (
    displayName: string,
    avatarUri: string,
    email: string,
    phone: string
  ) => {
    if (!userId) return;
    await upsertProfile(userId, displayName, avatarUri);
    setPII(userId, email, phone); // §1 memory only
    setProfile(p => p ? { ...p, displayName, avatarUri, email, phone } : null);
  }, [userId]);

  const logout = useCallback(async () => {
    if (userId) clearPII(userId);
    await wipeSecureStore();
    setProfile(null);
  }, [userId]);

  return { profile, loading, updateProfile, logout };
}