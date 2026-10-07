import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_COUNT = 3;
const TAB_WIDTH = SCREEN_WIDTH / TAB_COUNT;

interface TabItem {
  label: string;
  icon?: React.ReactNode;
}

interface AnimatedTabBarProps {
  tabs: TabItem[];
  activeIndex: number;
  onPress: (index: number) => void;
  activeColor?: string;
  inactiveColor?: string;
  indicatorColor?: string;
  backgroundColor?: string;
}

export const AnimatedTabBar: React.FC<AnimatedTabBarProps> = ({
  tabs,
  activeIndex,
  onPress,
  activeColor = '#007AFF',
  inactiveColor = '#8E8E93',
  indicatorColor = '#007AFF',
  backgroundColor = '#FFFFFF',
}) => {
  const translateX = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(translateX, {
      toValue: activeIndex * TAB_WIDTH,
      duration: 250,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [activeIndex, translateX]);

  const renderTab = (tab: TabItem, index: number) => {
    const isActive = index === activeIndex;
    const inputRange = [index - 1, index, index + 1];
    const colorRange = [inactiveColor, activeColor, inactiveColor];

    const color = translateX.interpolate({
      inputRange: inputRange.map((i) => i * TAB_WIDTH),
      outputRange: colorRange,
      extrapolate: 'clamp',
    });

    return (
      <TouchableOpacity
        style={styles.tab}
        onPress={() => onPress(index)}
        activeOpacity={0.7}
        accessibilityRole="tab"
        accessibilitySelected={isActive}
        accessibilityLabel={tab.label}
      >
        <View style={styles.tabContent}>
          {tab.icon}
          <Animated.Text style={[styles.tabLabel, { color }]}>{tab.label}</Animated.Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.tabsRow}>
        {tabs.map((tab, index) => renderTab(tab, index))}
      </View>
      <Animated.View
        style={[
          styles.indicator,
          {
            backgroundColor: indicatorColor,
            transform: [{ translateX }],
            width: TAB_WIDTH,
          },
        ]}
      />
    </View>
  );
};

import { Easing } from 'react-native';

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  tabsRow: {
    flex: 1,
    flexDirection: 'row',
    height: 50,
  },
  tab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContent: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'System',
  },
  indicator: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    height: 3,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
});