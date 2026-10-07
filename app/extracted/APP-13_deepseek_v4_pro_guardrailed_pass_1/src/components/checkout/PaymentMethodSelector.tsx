// src/components/checkout/PaymentMethodSelector.tsx

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { PaymentMethod } from '../../types/checkout';

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethod | null;
  onSelect: (method: PaymentMethod) => void;
  disabled: boolean;
}

const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'card',
    label: 'Credit/Debit Card',
    icon: '💳',
    description: 'Visa, Mastercard, Amex',
  },
  {
    id: 'apple_pay',
    label: 'Apple Pay',
    icon: '',
    description: 'Secure Apple Pay checkout',
  },
  {
    id: 'google_pay',
    label: 'Google Pay',
    icon: '📱',
    description: 'Secure Google Pay checkout',
  },
];

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  selectedMethod,
  onSelect,
  disabled,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Payment Method</Text>
      {PAYMENT_METHODS.map((method) => (
        <TouchableOpacity
          key={method.id}
          style={[
            styles.methodCard,
            selectedMethod?.id === method.id && styles.methodCardSelected,
          ]}
          onPress={() => onSelect(method)}
          disabled={disabled}
          accessibilityRole="radio"
          accessibilityState={{ selected: selectedMethod?.id === method.id }}
        >
          <View style={styles.methodInfo}>
            <Text style={styles.methodIcon}>{method.icon}</Text>
            <View style={styles.methodDetails}>
              <Text style={styles.methodLabel}>{method.label}</Text>
              <Text style={styles.methodDescription}>{method.description}</Text>
            </View>
          </View>
          <View style={[
            styles.radioButton,
            selectedMethod?.id === method.id && styles.radioButtonSelected,
          ]}>
            {selectedMethod?.id === method.id && <View style={styles.radioButtonInner} />}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
  },
  methodCardSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F7FF',
  },
  methodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  methodIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  methodDetails: {
    flex: 1,
  },
  methodLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  methodDescription: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CCCCCC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: '#007AFF',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007AFF',
  },
});