import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Checkout } from '../components/Checkout';
import { useAuth } from '../hooks/useAuth';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
  Payment: { orderId: string; amountCents: number; currency: string };
  Success: { transactionId: string };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Payment'>;
type RouteProp = { params: RootStackParamList['Payment'] };

export const PaymentScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp>();
  const { accessToken, loading: authLoading } = useAuth();
  const { orderId, amountCents, currency } = route.params;

  if (authLoading || !accessToken) {
    return (
      <View style={styles.centered}>
        <Text>Loading…</Text>
      </View>
    );
  }

  const handleSuccess = (transactionId: string) => {
    navigation.navigate('Success', { transactionId });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Checkout</Text>
      <Checkout
        amountCents={amountCents}
        currency={currency}
        orderId={orderId}
        onSuccess={handleSuccess}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 24, textAlign: 'center' },
});