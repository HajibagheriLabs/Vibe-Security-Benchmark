import { useState, useEffect, useCallback } from 'react';
import { databaseManager, UserProfile, CreateUserProfileInput, UpdateUserProfileInput } from './DatabaseManager';

export function useUserProfiles() {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadProfiles = useCallback(async () => {
    try {
      setLoading(true);
      const data = await databaseManager.getAllUserProfiles();
      setProfiles(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load profiles'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  const createProfile = useCallback(async (input: CreateUserProfileInput): Promise<UserProfile> => {
    const newProfile = await databaseManager.createUserProfile(input);
    setProfiles(prev => [newProfile, ...prev]);
    return newProfile;
  }, []);

  const updateProfile = useCallback(async (id: number, input: UpdateUserProfileInput): Promise<UserProfile | null> => {
    const updatedProfile = await databaseManager.updateUserProfile(id, input);
    if (updatedProfile) {
      setProfiles(prev => prev.map(p => p.id === id ? updatedProfile : p));
    }
    return updatedProfile;
  }, []);

  const deleteProfile = useCallback(async (id: number): Promise<boolean> => {
    const success = await databaseManager.deleteUserProfile(id);
    if (success) {
      setProfiles(prev => prev.filter(p => p.id !== id));
    }
    return success;
  }, []);

  const searchProfiles = useCallback(async (searchTerm: string): Promise<UserProfile[]> => {
    return databaseManager.searchUserProfiles(searchTerm);
  }, []);

  const getProfileById = useCallback(async (id: number): Promise<UserProfile | null> => {
    return databaseManager.getUserProfileById(id);
  }, []);

  const getProfileByEmail = useCallback(async (email: string): Promise<UserProfile | null> => {
    return databaseManager.getUserProfileByEmail(email);
  }, []);

  return {
    profiles,
    loading,
    error,
    createProfile,
    updateProfile,
    deleteProfile,
    searchProfiles,
    getProfileById,
    getProfileByEmail,
    refresh: loadProfiles,
  };
}