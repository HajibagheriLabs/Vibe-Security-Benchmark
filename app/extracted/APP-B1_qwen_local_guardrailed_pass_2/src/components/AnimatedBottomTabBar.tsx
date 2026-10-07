import React, { useRef, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
  SafeAreaView,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type TabItem = {
  name: string;
  label: string;
};

type Props = {
  tabs: TabItem[];
  activeTab: string;
  onChangeTab: (name: string) => void;
};

const AnimatedBottomTabBar: React.FC<Props> = ({ tabs, activeTab, onChangeTab }) => {
  const tabWidth = SCREEN_WIDTH / tabs.length;
  const indicatorPosition = useRef(new Animated.Value(0)).current;

  // Animate indicator when active tab changes
  useEffect(() => {
    const index = tabs.findIndex((t) => t.name === activeTab);
    if (index === -1) return;

    const targetOffset = index * tabWidth;
    Animated.timing(indicatorPosition, {
      toValue: targetOffset,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [activeTab, tabs, tabWidth, indicatorPosition]);

  const renderTab = (tab: TabItem, index: number) => {
    const isActive = activeTab === tab.name;

    return (
      <TouchableOpacity
        key={tab.name}
        style={[styles.tab, { width: tabWidth }]}
        onPress={() => onChangeTab(tab.name)}
        activeOpacity={0.7}
      >
        <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
          {tab.label}
        </Text>
      </TouchableOpacity>
    );
  };

  // Sliding indicator
  const translateX = indicatorPosition;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.bar}>
        {/* Sliding Indicator */}
        <Animated.View
          style={[
            styles.indicator,
            {
              transform: [{ translateX }],
            },
          ]}
        />
        {tabs.map((tab, index) => renderTab(tab, index))}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  bar: {
    flexDirection: 'row',
    height: 60,
    position: 'relative',
  },
  tab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    height: 2,
    width: 40,
    backgroundColor: '#007AFF',
    borderRadius: 1,
  },
});

export default AnimatedBottomTabBar;