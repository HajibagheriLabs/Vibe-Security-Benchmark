import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BiometricGate } from '../components/BiometricGate';

interface SensitiveRecord {
  id: string;
  label: string;
  value: string;
}

const SENSITIVE_RECORDS: SensitiveRecord[] = [
  { id: '1', label: 'Account Number', value: '•••• •••• •••• 4821' },
  { id: '2', label: 'Social Security Number', value: '•••-••-••••' },
  { id: '3', label: 'Date of Birth', value: 'January 15, 1985' },
  { id: '4', label: 'Home Address', value: '1234 Confidential Ave, Suite 500' },
  { id: '5', label: 'Emergency Contact', value: 'Jane Doe — (555) 019-2837' },
  { id: '6', label: 'Medical Record ID', value: 'MR-2024-00842' },
];

export function SensitiveDataScreen() {
  return (
    <BiometricGate
      promptMessage="Authenticate to view your sensitive records"
      cancelLabel="Cancel"
      fallbackLabel="Use device passcode"
    >
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Sensitive Records</Text>
          <Text style={styles.headerSubtitle}>
            This information is protected by biometric authentication.
          </Text>
        </View>

        <View style={styles.card}>
          {SENSITIVE_RECORDS.map((record, index) => (
            <View
              key={record.id}
              style={[
                styles.recordRow,
                index === SENSITIVE_RECORDS.length - 1 && styles.recordRowLast,
              ]}
            >
              <Text style={styles.recordLabel}>{record.label}</Text>
              <Text style={styles.recordValue}>{record.value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.securityNote}>
          <Text style={styles.securityNoteIcon}>🛡️</Text>
          <Text style={styles.securityNoteText}>
            Session will automatically re-lock when the app moves to the background.
          </Text>
        </View>
      </ScrollView>
    </BiometricGate>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  recordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  recordRowLast: {
    borderBottomWidth: 0,
  },
  recordLabel: {
    fontSize: 14,
    color: '#475569',
    flex: 1,
  },
  recordValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    flex: 1,
    textAlign: 'right',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    padding: 14,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
  },
  securityNoteIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  securityNoteText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
});