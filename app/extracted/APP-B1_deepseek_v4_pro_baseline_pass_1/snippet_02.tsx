import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AnimatedBottomTabBar from './AnimatedBottomTabBar';

const App = () => {
  const [activeTab, setActiveTab] = React.useState('home');

  const handleTabPress = (key: string) => {
    setActiveTab(key);
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Active Tab: {activeTab}</Text>
      </View>
      <AnimatedBottomTabBar
        activeTab={activeTab}
        onTabPress={handleTabPress}
        indicatorColor="#FF6B6B"
        activeTextColor="#FF6B6B"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
});

export default App;