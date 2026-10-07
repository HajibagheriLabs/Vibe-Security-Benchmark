import React from 'react';
import { View, Text, Button, StyleSheet, Alert } from 'react-native';
import { Purchases } from 'revenuecat-purchases';
import { ProFeatureGate } from '../components/ProFeatureGate';
import { useProSubscription } from '../hooks/useProSubscription';

export function PremiumScreen() {
  const { isPro, customerInfo } = useProSubscription();

  const handleRestore = async () => {
    try {
      const info = await Purchases.restorePurchases();
      const hasPro = info.entitlements.active['pro'] !== undefined;
      Alert.alert(hasPro ? 'Restored' : 'Not Found', hasPro ? 'Pro access restored.' : 'No active Pro subscription found.');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Restore failed');
    }
  };

  const handleManage = async () => {
    try {
      await Purchases.showManageSubscriptions();
    } catch {
      Alert.alert('Unavailable', 'Subscription management not available on this platform.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Premium Features</Text>

      <ProFeatureGate fallback={<Text style={styles.locked}>🔒 Premium analytics locked</Text>}>
        <View style={styles.featureBox}>
          <Text style={styles.featureTitle}>📊 Advanced Analytics</Text>
          <Text style={styles.featureDesc}>Unlock detailed insights and export capabilities.</Text>
        </View>
      </ProFeatureGate>

      <ProFeatureGate fallback={<Text style={styles.locked}>🔒 Cloud sync locked</Text>}>
        <View style={styles.featureBox}>
          <Text style={styles.featureTitle}>☁️ Cloud Sync</Text>
          <Text style={styles.featureDesc}>Sync your data across all devices automatically.</Text>
        </View>
      </ProFeatureGate>

      <View style={styles.statusBox}>
        <Text style={styles.statusLabel}>Status: {isPro ? '🟢 Pro Active' : '🔴 Free Tier'}</Text>
        {customerInfo?.entitlements.active.pro && (
          <Text style={styles.expiry}>
            Expires: {new Date(customerInfo.entitlements.active.pro.expirationDate * 1000).toLocaleDateString()}
          </Text>
        )}
      </View>

      <View style={styles.buttonRow}>
        <Button title="Restore Purchases" onPress={handleRestore} />
        <Button title="Manage Subscription" onPress={handleManage} color="#0066cc" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 20 },
  featureBox: { backgroundColor: '#f5f5f5', borderRadius: 12, padding: 16, marginBottom: 16 },
  featureTitle: { fontSize: 18, fontWeight: '600', marginBottom: 4 },
  featureDesc: { color: '#555' },
  locked: { color: '#999', fontStyle: 'italic', marginBottom: 16 },
  statusBox: { backgroundColor: '#e8f0fe', borderRadius: 12, padding: 16, marginBottom: 20 },
  statusLabel: { fontSize: 16, fontWeight: '600' },
  expiry: { color: '#555', marginTop: 4 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
});