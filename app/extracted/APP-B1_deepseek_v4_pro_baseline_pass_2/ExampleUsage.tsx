import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AnimatedBottomTabBar from './AnimatedBottomTabBar';

const HomeIcon = ({ color }: { color: string }) => (
  <Text style={{ fontSize: 20, color }}>🏠</Text>
);

const SearchIcon = ({ color }: { color: string }) => (
  <Text style={{ fontSize: 20, color }}>🔍</Text>
);

const ProfileIcon = ({ color }: { color: string }) => (
  <Text style={{ fontSize: 20, color }}>👤</Text>
);

const ExampleUsage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);

  const tabs = [
    {
      key: 'home',
      label: 'Home',
      icon: <HomeIcon color={activeTab === 0 ? '#007AFF' : '#8E8E93'} />,
    },
    {
      key: 'search',
      label: 'Search',
      icon: <SearchIcon color={activeTab === 1 ? '#007AFF' : '#8E8E93'} />,
    },
    {
      key: 'profile',
      label: 'Profile',
      icon: <ProfileIcon color={activeTab === 2 ? '#007AFF' : '#8E8E93'} />,
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.contentText}>
          Active Tab: {tabs[activeTab].label}
        </Text>
      </View>
      <AnimatedBottomTabBar
        tabs={tabs}
        activeTab={activeTab}
        onTabPress={setActiveTab}
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
  },
  contentText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
});

export default ExampleUsage;