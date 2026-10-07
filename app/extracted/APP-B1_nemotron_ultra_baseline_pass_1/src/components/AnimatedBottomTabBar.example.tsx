import React, { useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import AnimatedBottomTabBar from './AnimatedBottomTabBar';
import { Ionicons } from '@expo/vector-icons';

const TABS = [
  {
    label: 'Home',
    icon: <Ionicons name="home-outline" size={26} color="#8E8E93" />,
    activeIcon: <Ionicons name="home" size={26} color="#007AFF" />,
  },
  {
    label: 'Search',
    icon: <Ionicons name="search-outline" size={26} color="#8E8E93" />,
    activeIcon: <Ionicons name="search" size={26} color="#007AFF" />,
  },
  {
    label: 'Profile',
    icon: <Ionicons name="person-outline" size={26} color="#8E8E93" />,
    activeIcon: <Ionicons name="person" size={26} color="#007AFF" />,
  },
];

const TabBarExample: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.contentText}>
          Current Tab: {TABS[activeIndex].label}
        </Text>
      </View>
      <AnimatedBottomTabBar
        tabs={TABS}
        activeIndex={activeIndex}
        onPress={setActiveIndex}
        activeColor="#007AFF"
        inactiveColor="#8E8E93"
        indicatorColor="#007AFF"
        backgroundColor="#FFFFFF"
        height={90}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 100,
  },
  contentText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
});

export default TabBarExample;