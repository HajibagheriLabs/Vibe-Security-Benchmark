// ExampleUsage.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AnimatedBottomTabBar, { TabItem } from './AnimatedBottomTabBar';

const tabs: [TabItem, TabItem, TabItem] = [
  {
    key: 'home',
    label: 'Home',
    icon: <Icon name="home-outline" />,
    activeColor: '#007AFF',
    inactiveColor: '#8E8E93',
  },
  {
    key: 'search',
    label: 'Search',
    icon: <Icon name="search-outline" />,
    activeColor: '#007AFF',
    inactiveColor: '#8E8E93',
  },
  {
    key: 'profile',
    label: 'Profile',
    icon: <Icon name="person-outline" />,
    activeColor: '#007AFF',
    inactiveColor: '#8E8E93',
  },
];

const ExampleUsage: React.FC = () => {
  const handleTabPress = (tab: TabItem, index: number) => {
    console.log(`Tab pressed: ${tab.label} at index ${index}`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.content} />
      <AnimatedBottomTabBar
        tabs={tabs}
        initialActiveIndex={0}
        onTabPress={handleTabPress}
        containerStyle={styles.tabBarContainer}
        indicatorStyle={styles.indicator}
        animationDuration={300}
        height={60}
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
  },
  tabBarContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  indicator: {
    backgroundColor: '#007AFF',
    height: 3,
    borderRadius: 1.5,
  },
});

export default ExampleUsage;