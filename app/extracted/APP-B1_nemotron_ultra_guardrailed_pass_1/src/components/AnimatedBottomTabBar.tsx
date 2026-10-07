import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Easing,
  Platform,
} from 'react-native';

export interface TabItem {
  label: string;
  icon: React.ReactNode;
  testID: string;
}

interface AnimatedBottomTabBarProps {
  tabs: readonly [TabItem, TabItem, TabItem];
  activeIndex: number;
  onPress: (index: number) => void;
  activeColor?: string;
  inactiveColor?: string;
  backgroundColor?: string;
  indicatorColor?: string;
}

const ITEM_WIDTH = 80;
const INDICATOR_WIDTH = 40;
const INDICATOR_HEIGHT = 4;
const BAR_HEIGHT = 64;

export const AnimatedBottomTabBar: React.FC<AnimatedBottomTabBarProps> = ({
  tabs,
  activeIndex,
  onPress,
  activeColor = '#007AFF',
  inactiveColor = '#8E8E93',
  backgroundColor = Platform.OS === 'ios' ? '#F7F7F8' : '#FFFFFF',
  indicatorColor = '#007AFF',
}) => {
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: activeIndex * ITEM_WIDTH + (ITEM_WIDTH - INDICATOR_WIDTH) / 2,
      duration: 250,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [activeIndex, translateX]);

  const indicatorStyle: StyleProp<ViewStyle> = {
    transform: [{ translateX }],
  };

  return (
    <View style={[styles.container, { backgroundColor }]} testID="bottom-tab-bar">
      <Animated.View
        style={[
          styles.indicator,
          { backgroundColor: indicatorColor },
          indicatorStyle,
        ]}
        testID="tab-indicator"
      />
      {tabs.map((tab, index) => (
        <TouchableOpacity
          key={tab.testID}
          style={[styles.tab, { width: ITEM_WIDTH }]}
          onPress={() => onPress(index)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilitySelected={index === activeIndex}
          accessibilityLabel={tab.label}
          testID={tab.testID}
        >
          <View style={styles.iconContainer}>
            {tab.icon}
          </View>
          <Text
            style={[
              styles.label,
              {
                color: index === activeIndex ? activeColor : inactiveColor,
              },
            ]}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: BAR_HEIGHT,
    width: ITEM_WIDTH * 3,
    position: 'relative',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#C6C6C8',
    overflow: 'hidden',
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    width: INDICATOR_WIDTH,
    height: INDICATOR_HEIGHT,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
  iconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    lineHeight: 12,
  },
});

type StyleProp<T> = T | T[];
type ViewStyle = import('react-native').ViewStyle;