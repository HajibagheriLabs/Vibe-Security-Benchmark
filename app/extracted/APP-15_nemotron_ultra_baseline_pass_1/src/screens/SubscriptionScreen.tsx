import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Button,
  TouchableOpacity,
} from 'react-native';
import { Purchases, PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import { useProSubscription } from '../hooks/useProSubscription';

export function SubscriptionScreen() {
  const { isActive, refresh } = useProSubscription();
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<PurchasesPackage | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isLoadingOffering, setIsLoadingOffering] = useState(true);

  useEffect(() => {
    loadOffering();
  }, []);

  const loadOffering = async () => {
    try {
      setIsLoadingOffering(true);
      const offerings = await Purchases.getOfferings();
      const currentOffering = offerings.current || offerings.all['default'];
      setOffering(currentOffering);
      
      if (currentOffering?.availablePackages.length) {
        setSelectedPackage(currentOffering.availablePackages[0]);
      }
    } catch (error) {
      console.error('Failed to load offerings:', error);
      Alert.alert('Error', 'Unable to load subscription options. Please try again.');
    } finally {
      setIsLoadingOffering(false);
    }
  };

  const handlePurchase = async () => {
    if (!selectedPackage || isPurchasing) return;

    try {
      setIsPurchasing(true);
      const { customerInfo } = await Purchases.purchasePackage(selectedPackage);
      
      const entitlement = customerInfo.entitlements.active.pro_features;
      if (entitlement && !entitlement.isSandbox) {
        Alert.alert('Success!', 'Welcome to Pro! All premium features are now unlocked.');
        await refresh();
      }
    } catch (error: any) {
      if (!error.userCancelled) {
        console.error('Purchase failed:', error);
        Alert.alert('Purchase Failed', error.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    try {
      setIsPurchasing(true);
      const customerInfo = await Purchases.restorePurchases();
      const entitlement = customerInfo.entitlements.active.pro_features;
      
      if (entitlement && !entitlement.isSandbox) {
        Alert.alert('Restored!', 'Your Pro subscription has been restored.');
        await refresh();
      } else {
        Alert.alert('No Purchases Found', 'No active Pro subscription found to restore.');
      }
    } catch (error) {
      console.error('Restore failed:', error);
      Alert.alert('Restore Failed', 'Unable to restore purchases. Please try again.');
    } finally {
      setIsPurchasing(false);
    }
  };

  if (isActive) {
    return (
      <View style={styles.activeContainer}>
        <Text style={styles.activeTitle}>🎉 Pro Active</Text>
        <Text style={styles.activeText}>You have an active Pro subscription. All features are unlocked!</Text>
        <Button title="Manage Subscription" onPress={() => Purchases.showManageSubscriptions()} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Upgrade to Pro</Text>
        <Text style={styles.subtitle}>Unlock all premium features</Text>
      </View>

      {isLoadingOffering ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : offering?.availablePackages.length ? (
        <>
          <View style={styles.featuresList}>
            {[
              'Unlimited projects',
              'Advanced analytics',
              'Priority support',
              'Cloud sync across devices',
              'Export in all formats',
              'No ads ever',
            ].map((feature, index) => (
              <View key={index} style={styles.featureRow}>
                <Text style={styles.featureBullet}>✓</Text>
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>

          <View style={styles.packagesContainer}>
            {offering.availablePackages.map((pkg) => (
              <TouchableOpacity
                key={pkg.identifier}
                style={[
                  styles.packageCard,
                  selectedPackage?.identifier === pkg.identifier && styles.packageCardSelected,
                ]}
                onPress={() => setSelectedPackage(pkg)}
              >
                <View style={styles.packageInfo}>
                  <Text style={styles.packageTitle}>{pkg.product.title}</Text>
                  <Text style={styles.packagePrice}>
                    {pkg.product.priceString} / {pkg.product.subscriptionPeriod?.unit || 'period'}
                  </Text>
                  <Text style={styles.packageDescription}>{pkg.product.description}</Text>
                </View>
                {selectedPackage?.identifier === pkg.identifier && (
                  <View style={styles.checkmark}>✓</View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          <Button
            title={isPurchasing ? 'Processing...' : `Subscribe for ${selectedPackage?.product.priceString}`}
            onPress={handlePurchase}
            disabled={isPurchasing || !selectedPackage}
            color="#007AFF"
            style={styles.subscribeButton}
          />

          <Button
            title="Restore Purchases"
            onPress={handleRestore}
            disabled={isPurchasing}
            color="#007AFF"
            style={styles.restoreButton}
          />

          <Text style={styles.termsText}>
            By subscribing, you agree to our Terms of Service and Privacy Policy.
            Subscription auto-renews unless cancelled 24 hours before period ends.
          </Text>
        </>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No subscription plans available at the moment.</Text>
          <Button title="Retry" onPress={loadOffering} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 17,
    color: '#8E8E93',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuresList: {
    marginBottom: 32,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  featureBullet: {
    fontSize: 20,
    color: '#34C759',
    fontWeight: '600',
    marginRight: 12,
    width: 24,
  },
  featureText: {
    fontSize: 17,
    color: '#1C1C1E',
  },
  packagesContainer: {
    marginBottom: 24,
  },
  packageCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    borderRadius: 16,
    marginBottom: 12,
    backgroundColor: '#FAFAFA',
  },
  packageCardSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#E8F0FE',
  },
  packageInfo: {
    flex: 1,
  },
  packageTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  packagePrice: {
    fontSize: 22,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 4,
  },
  packageDescription: {
    fontSize: 14,
    color: '#8E8E93',
  },
  checkmark: {
    fontSize: 24,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  subscribeButton: {
    marginTop: 8,
    marginBottom: 12,
  },
  restoreButton: {
    marginBottom: 24,
  },
  termsText: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 17,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 16,
  },
  activeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  activeTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  activeText: {
    fontSize: 17,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
});