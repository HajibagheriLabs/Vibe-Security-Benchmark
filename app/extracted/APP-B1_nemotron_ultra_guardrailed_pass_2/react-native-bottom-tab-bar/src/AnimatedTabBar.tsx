import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useDerivedValue,
  withTiming,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import type { TabItem, BottomTabBarProps } from './types';

const TABS_COUNT = 3;

export const AnimatedTabBar: React.FC<BottomTabBarProps> = ({
  tabs,
  activeTab,
  onTabPress,
  style,
  indicatorColor = '#007AFF',
  activeColor = '#007AFF',
  inactiveColor = '#8E8E93',
  backgroundColor = '#FFFFFF',
  height = 88,
  labelFontSize = 10,
  iconSize = 24,
}) => {
  const activeIndex = tabs.findIndex((t) => t.id === activeTab);
  const clampedIndex = Math.max(0, Math.min(activeIndex, TABS_COUNT - 1));

  const translateX = useSharedValue(0);
  const tabWidth = useSharedValue(0);

  const indicatorTranslateX = useDerivedValue(() => {
    return withTiming(
      interpolate(
        translateX.value,
        [0, 1, 2],
        [0, tabWidth.value, tabWidth.value * 2],
        Extrapolate.CLAMP
      ),
      { duration: 250, easing: (t) => t * (2 - t) }
    );
  });

  const indicatorWidth = useDerivedValue(() => tabWidth.value);

  const handleLayout = (e: ReactNative.LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width / TABS_COUNT;
    tabWidth.value = width;
    translateX.value = clampedIndex;
  };

  const handleTabPress = (index: number) => {
    translateX.value = withTiming(index, { duration: 250, easing: (t) => t * (2 - t) });
    onTabPress(tabs[index].id);
  };

  const tabStyle: ViewStyle = {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  };

  return (
    <View style={[styles.container, { height, backgroundColor }, style]} onLayout={handleLayout}>
      <Animated.View
        style={[
          styles.indicator,
          {
            backgroundColor: indicatorColor,
            width: indicatorWidth,
            transform: [{ translateX: indicatorTranslateX }],
          },
        ]}
      />
      {tabs.map((tab, index) => (
        <TouchableOpacity
          key={tab.id}
          style={tabStyle}
          onPress={() => handleTabPress(index)}
          accessibilityRole="tab"
          accessibilitySelected={index === clampedIndex}
          accessibilityLabel={tab.label}
          testID={`tab-${tab.id}`}
        >
          <Animated.View
            style={[
              styles.iconContainer,
              {
                opacity: interpolate(
                  translateX.value,
                  [index - 0.5, index, index + 0.5],
                  [0, 1, 0],
                  Extrapolate.CLAMP
                ),
              },
            ]}
          >
            {index === clampedIndex && tab.selectedIcon ? tab.selectedIcon : tab.icon}
          </Animated.View>
          <Animated.Text
            style={[
              styles.label,
              {
                fontSize: labelFontSize,
                color: interpolate(
                  translateX.value,
                  [index - 0.5, index, index + 0.5],
                  [inactiveColor, activeColor, inactiveColor],
                  Extrapolate.CLAMP
                ),
              },
            ]}
          >
            {tab.label}
          </Animated.Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    position: 'relative',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
    overflow: 'hidden',
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    height: 3,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  iconContainer: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  label: {
    fontWeight: '600',
    lineHeight: 13,
  },
});