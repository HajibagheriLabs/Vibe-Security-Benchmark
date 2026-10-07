// src/components/checkout/TransactionStatus.tsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { CheckoutSession } from '../../types/checkout';

interface TransactionStatusProps {
  session: CheckoutSession;
}

export const TransactionStatus: React.FC<TransactionStatusProps> = ({ session }) => {
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed':
        return '#4CAF50';
      case 'pending':
        return '#FF9800';
      case 'failed':
        return '#F44336';
      default:
        return '#666666';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'completed':
        return 'Payment Completed';
      case 'pending':
        return 'Payment Pending';
      case 'failed':
        return 'Payment Failed';
      default:
        return 'Processing';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.statusCard}>
        <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(session.status) }]} />
        <Text style={styles.statusLabel}>{getStatusLabel(session.status)}</Text>
      </View>
      
      <View style={styles.detailsCard}>
        <Text style={styles.detailsTitle}>Transaction Details</Text>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Amount</Text>
          <Text style={styles.detailValue}>
            {session.currency} {session.amount.toFixed(2)}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Session ID</Text>
          <Text style={styles.detailValue}>{session.sessionId}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Created</Text>
          <Text style={styles.detailValue}>
            {new Date(session.createdAt).toLocaleString()}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  statusLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
  },
});