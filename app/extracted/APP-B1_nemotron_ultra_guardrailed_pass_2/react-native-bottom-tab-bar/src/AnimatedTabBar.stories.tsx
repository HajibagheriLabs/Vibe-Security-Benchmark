import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AnimatedTabBar, type TabItem } from './AnimatedTabBar';

const tabs: readonly [TabItem, TabItem, TabItem] = [
  { id: 'home', label: 'Home', icon: <Text>🏠</Text>, selectedIcon: <Text>🏠</Text> },
  { id: 'search', label: 'Search', icon: <Text>🔍</Text>, selectedIcon: <Text>🔍</Text> },
  { id: 'profile', label: 'Profile', icon: <Text>👤</Text>, selectedIcon: <Text>👤</Text> },
];

export default {
  title: 'Components/AnimatedTabBar',
  component: AnimatedTabBar,
};

export const Default = () => {
  const [activeTab, setActiveTab] = useState('home');
  return (
    <View style={styles.wrapper}>
      <View style={styles.content}>
        <Text style={styles.contentText}>Active: {activeTab}</Text>
      </View>
      <AnimatedTabBar tabs={tabs} activeTab={activeTab} onTabPress={setActiveTab} />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#F2F2F7' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  contentText: { fontSize: 18, color: '#8E8E93' },
});