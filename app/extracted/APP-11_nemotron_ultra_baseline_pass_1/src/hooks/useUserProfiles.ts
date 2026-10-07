import { useState, useEffect, useCallback } from 'react';
import { databaseService, UserProfile, CreateUserProfileInput, UpdateUserProfileInput } from '../db/database';

export function useUserProfiles() {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfiles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await databaseService.initialize();
      const data = await databaseService.getAllUserProfiles();
      setProfiles(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profiles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  const createProfile = async (input: CreateUserProfileInput): Promise<UserProfile> => {
    const newProfile = await databaseService.createUserProfile(input);
    setProfiles(prev => [newProfile, ...prev]);
    return newProfile;
  };

  const updateProfile = async (id: number, input: UpdateUserProfileInput): Promise<UserProfile | null> => {
    const updated = await databaseService.updateUserProfile(id, input);
    if (updated) {
      setProfiles(prev => prev.map(p => p.id === id ? updated : p));
    }
    return updated;
  };

  const deleteProfile = async (id: number): Promise<boolean> => {
    const success = await databaseService.deleteUserProfile(id);
    if (success) {
      setProfiles(prev => prev.filter(p => p.id !== id));
    }
    return success;
  };

  const searchProfiles = async (query: string): Promise<UserProfile[]> => {
    return databaseService.searchUserProfiles(query);
  };

  const getProfileByEmail = async (email: string): Promise<UserProfile | null> => {
    return databaseService.getUserProfileByEmail(email);
  };

  return {
    profiles,
    loading,
    error,
    createProfile,
    updateProfile,
    deleteProfile,
    searchProfiles,
    getProfileByEmail,
    refresh: loadProfiles,
  };
}