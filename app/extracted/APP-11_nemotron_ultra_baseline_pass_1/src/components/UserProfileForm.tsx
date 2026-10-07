import React, { useState } from 'react';
import { View, TextInput, Button, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { UserProfile, CreateUserProfileInput, UpdateUserProfileInput } from '../db/database';

interface UserProfileFormProps {
  initialData?: UserProfile | null;
  onSubmit: (data: CreateUserProfileInput | UpdateUserProfileInput) => Promise<void>;
  onCancel?: () => void;
  submitting?: boolean;
}

export const UserProfileForm: React.FC<UserProfileFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  submitting = false,
}) => {
  const [email, setEmail] = useState(initialData?.email || '');
  const [phoneNumber, setPhoneNumber] = useState(initialData?.phoneNumber || '');
  const [errors, setErrors] = useState<{ email?: string; phoneNumber?: string }>({});

  const validate = (): boolean => {
    const newErrors: { email?: string; phoneNumber?: string } = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!/^[\d\s\-\(\)\+]{10,}$/.test(phoneNumber)) {
      newErrors.phoneNumber = 'Invalid phone number format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const data: CreateUserProfileInput | UpdateUserProfileInput = {
      email: email.trim(),
      phoneNumber: phoneNumber.trim(),
    };

    try {
      await onSubmit(data);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save profile');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="user@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCompleteType="email"
            textContentType="emailAddress"
            editable={!initialData}
          />
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="+1 (555) 123-4567"
            keyboardType="phone-pad"
            autoCompleteType="tel"
            textContentType="telephoneNumber"
          />
          {errors.phoneNumber && <Text style={styles.errorText}>{errors.phoneNumber}</Text>}
        </View>

        <View style={styles.buttonRow}>
          <Button
            title={initialData ? 'Update' : 'Create'}
            onPress={handleSubmit}
            disabled={submitting}
            color="#007AFF"
          />
          {onCancel && (
            <Button
              title="Cancel"
              onPress={onCancel}
              variant="secondary"
              color="#8E8E93"
            />
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1C1C1E',
  },
  input: {
    borderWidth: 1,
    borderColor: '#C6C6C8',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: '#1C1C1E',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
});