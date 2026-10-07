import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useUserProfiles } from '../hooks/useUserProfiles';
import { UserProfile } from '../db/database';
import { UserProfileForm } from '../components/UserProfileForm';

export const UserProfileListScreen: React.FC = () => {
  const {
    profiles,
    loading,
    error,
    createProfile,
    updateProfile,
    deleteProfile,
    searchProfiles,
    refresh,
  } = useUserProfiles();

  const [showForm, setShowForm] = useState(false);
  const [editingProfile, setEditingProfile] = useState<UserProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[] | null>(null);
  const [searching, setSearching] = useState(false);

  const displayProfiles = searchResults !== null ? searchResults : profiles;

  const handleCreate = async (data: Parameters<typeof createProfile>[0]) => {
    await createProfile(data);
    setShowForm(false);
  };

  const handleUpdate = async (data: Parameters<typeof updateProfile>[1]) => {
    if (editingProfile) {
      await updateProfile(editingProfile.id, data);
      setEditingProfile(null);
      setShowForm(false);
    }
  };

  const handleDelete = (profile: UserProfile) => {
    Alert.alert(
      'Delete Profile',
      `Are you sure you want to delete ${profile.email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteProfile(profile.id),
        },
      ]
    );
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    const results = await searchProfiles(query);
    setSearchResults(results);
    setSearching(false);
  };

  const renderItem = ({ item }: { item: UserProfile }) => (
    <TouchableOpacity
      style={styles.listItem}
      onPress={() => {
        setEditingProfile(item);
        setShowForm(true);
      }}
    >
      <View style={styles.listItemContent}>
        <View>
          <Text style={styles.listItemEmail}>{item.email}</Text>
          <Text style={styles.listItemPhone}>{item.phoneNumber}</Text>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={(e) => {
            e.stopPropagation();
            handleDelete(item);
          }}
        >
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>User Profiles</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => { setEditingProfile(null); setShowForm(true); }}>
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="Search by email or phone..."
        value={searchQuery}
        onChangeText={handleSearch}
        clearButtonMode="while-editing"
      />

      {searching && <ActivityIndicator style={styles.searchIndicator} />}

      <FlatList
        data={displayProfiles}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery ? 'No matching profiles found' : 'No profiles yet. Tap + Add to create one.'}
            </Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {showForm && (
        <UserProfileForm
          initialData={editingProfile}
          onSubmit={editingProfile ? handleUpdate : handleCreate}
          onCancel={() => { setShowForm(false); setEditingProfile(null); }}
          submitting={loading}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  searchInput: {
    margin: 16,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    fontSize: 16,
  },
  searchIndicator: {
    marginVertical: 8,
  },
  listItem: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  listItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listItemEmail: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  listItemPhone: {
    fontSize: 15,
    color: '#8E8E93',
    marginTop: 2,
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  separator: {
    height: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
  errorBanner: {
    margin: 16,
    padding: 12,
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  errorText: {
    color: '#C62828',
    fontSize: 14,
  },
});