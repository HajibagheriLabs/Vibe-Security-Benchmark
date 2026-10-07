import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  LayoutChangeEvent,
} from 'react-native';

export interface TabItem {
  key: string;
  label: string;
  icon: React.ReactNode;
}

interface AnimatedBottomTabBarProps {
  tabs: TabItem[];
  activeTab: number;
  onTabPress: (index: number) => void;
  activeColor?: string;
  inactiveColor?: string;
  indicatorColor?: string;
  backgroundColor?: string;
  height?: number;
}

const AnimatedBottomTabBar: React.FC<AnimatedBottomTabBarProps> = ({
  tabs,
  activeTab,
  onTabPress,
  activeColor = '#007AFF',
  inactiveColor = '#8E8E93',
  indicatorColor = '#007AFF',
  backgroundColor = '#FFFFFF',
  height = 60,
}) => {
  const indicatorAnim = useRef(new Animated.Value(0)).current;
  const tabWidths = useRef<number[]>([]);
  const containerWidth = useRef(0);

  const getTabWidth = () => {
    if (containerWidth.current === 0 || tabs.length === 0) return 0;
    return containerWidth.current / tabs.length;
  };

  const animateIndicator = (index: number) => {
    const tabWidth = getTabWidth();
    if (tabWidth === 0) return;

    Animated.spring(indicatorAnim, {
      toValue: index * tabWidth,
      useNativeDriver: true,
      damping: 20,
      stiffness: 200,
      mass: 0.8,
    }).start();
  };

  useEffect(() => {
    animateIndicator(activeTab);
  }, [activeTab, containerWidth.current]);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    if (width !== containerWidth.current) {
      containerWidth.current = width;
      animateIndicator(activeTab);
    }
  };

  const handleTabPress = (index: number) => {
    onTabPress(index);
  };

  const tabWidth = getTabWidth();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor,
          height,
          borderTopColor: '#E5E5EA',
        },
      ]}
      onLayout={handleLayout}
    >
      {/* Sliding Indicator */}
      {tabWidth > 0 && (
        <Animated.View
          style={[
            styles.indicator,
            {
              width: tabWidth,
              backgroundColor: indicatorColor,
              transform: [{ translateX: indicatorAnim }],
            },
          ]}
        />
      )}

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {tabs.map((tab, index) => {
          const isActive = index === activeTab;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tab}
              onPress={() => handleTabPress(index)}
              activeOpacity={0.7}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={tab.label}
            >
              <View style={styles.iconContainer}>
                {tab.icon}
              </View>
              <Text
                style={[
                  styles.label,
                  { color: isActive ? activeColor : inactiveColor },
                ]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    borderTopWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 8,
  },
  tabsContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  iconContainer: {
    marginBottom: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
  },
  indicator: {
    position: 'absolute',
    top: 0,
    height: 3,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
});

export default AnimatedBottomTabBar;