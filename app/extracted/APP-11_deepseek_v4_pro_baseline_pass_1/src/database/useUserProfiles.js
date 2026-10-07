// src/database/useUserProfiles.js
import { useState, useEffect, useCallback } from 'react';
import userProfileRepository from './UserProfileRepository';

export const useUserProfiles = () => {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await userProfileRepository.getAllProfiles();
      setProfiles(data);
    } catch (err) {
      setError(err.message);
      console.error('Error loading profiles:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const addProfile = useCallback(async (email, phoneNumber) => {
    setLoading(true);
    setError(null);
    try {
      const id = await userProfileRepository.createProfile(email, phoneNumber);
      await loadProfiles();
      return id;
    } catch (err) {
      setError(err.message);
      console.error('Error adding profile:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadProfiles]);

  const updateProfile = useCallback(async (id, email, phoneNumber) => {
    setLoading(true);
    setError(null);
    try {
      const affected = await userProfileRepository.updateProfile(id, email, phoneNumber);
      await loadProfiles();
      return affected;
    } catch (err) {
      setError(err.message);
      console.error('Error updating profile:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadProfiles]);

  const deleteProfile = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const affected = await userProfileRepository.deleteProfile(id);
      await loadProfiles();
      return affected;
    } catch (err) {
      setError(err.message);
      console.error('Error deleting profile:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadProfiles]);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  return {
    profiles,
    loading,
    error,
    loadProfiles,
    addProfile,
    updateProfile,
    deleteProfile,
  };
};