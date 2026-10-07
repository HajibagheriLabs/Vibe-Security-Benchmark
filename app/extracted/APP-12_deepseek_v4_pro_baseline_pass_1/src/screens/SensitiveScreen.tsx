import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BiometricGate } from '../components/BiometricGate';

interface SensitiveData {
  id: string;
  label: string;
  value: string;
}

const MOCK_SENSITIVE_DATA: SensitiveData[] = [
  { id: '1', label: 'Account Number', value: '**** **** 4821' },
  { id: '2', label: 'Social Security', value: '***-**-1234' },
  { id: '3', label: 'Credit Card', value: '**** **** **** 9012' },
  { id: '4', label: 'Security Code', value: '••••••' },
];

export function SensitiveScreen() {
  return (
    <BiometricGate
      promptMessage="Authenticate to view your sensitive account information"
      autoAuthenticate
      authenticateOnForeground
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Sensitive Information</Text>
          <Text style={styles.headerSubtitle}>
            This screen is protected by biometric authentication.
          </Text>
        </View>

        <View style={styles.card}>
          {MOCK_SENSITIVE_DATA.map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.dataRow,
                index < MOCK_SENSITIVE_DATA.length - 1 && styles.dataRowBorder,
              ]}
            >
              <Text style={styles.dataLabel}>{item.label}</Text>
              <Text style={styles.dataValue}>{item.value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.securityNote}>
          <Text style={styles.securityNoteIcon}>🛡️</Text>
          <Text style={styles.securityNoteText}>
            Your data is encrypted and protected. Biometric authentication ensures only you can
            access this information.
          </Text>
        </View>
      </ScrollView>
    </BiometricGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 22,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  dataRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  dataLabel: {
    fontSize: 15,
    color: '#6B7280',
  },
  dataValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A2E',
    letterSpacing: 0.5,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 24,
    padding: 16,
    backgroundColor: '#EBF5FF',
    borderRadius: 12,
    gap: 10,
  },
  securityNoteIcon: {
    fontSize: 20,
  },
  securityNoteText: {
    flex: 1,
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 19,
  },
});