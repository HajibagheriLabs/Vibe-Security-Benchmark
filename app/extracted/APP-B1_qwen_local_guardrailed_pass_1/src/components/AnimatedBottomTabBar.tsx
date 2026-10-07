import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Animated,
  StyleSheet,
  Platform,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Rule 3 (Binary Trust): Static config is safe for bundled assets.
// Rule 2 (Process Isolation): Safe for React Native (no IPC/Node objects).
type TabItem = {
  label: string;
  icon: string; // Using string for simplicity, in prod use Icon components
  screen: string;
};

type AnimatedBottomTabBarProps = {
  tabs: TabItem[];
  activeIndex: number;
  onChangeIndex: (index: number) => void;
};

const AnimatedBottomTabBar: React.FC<AnimatedBottomTabBarProps> = ({
  tabs,
  activeIndex,
  onChangeIndex,
}) => {
  // Security: Use Animated.Value for performant UI thread animation
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const [indicatorWidth, setIndicatorWidth] = useState(0);

  // Rule 1 (Storage): No state persistence here, purely visual.

  useEffect(() => {
    // Calculate the width of a single tab to determine slide distance
    // We assume equal width distribution for the indicator logic
    const tabWidth = SCREEN_WIDTH / tabs.length;
    
    // Animate the indicator position
    Animated.timing(slideAnimation, {
      toValue: activeIndex * tabWidth,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [activeIndex, tabs.length, slideAnimation]);

  const handleTabPress = (index: number) => {
    if (index !== activeIndex) {
      onChangeIndex(index);
    }
  };

  // Rule 3 (Binary Trust): Styles are bundled, no external CSS injection.
  return (
    <View style={styles.container}>
      <View style={styles.tabsContainer}>
        {tabs.map((tab, index) => (
          <TouchableOpacity
            key={tab.screen}
            style={styles.tabItem}
            onPress={() => handleTabPress(index)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabLabel,
                index === activeIndex && styles.activeLabel,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Sliding Indicator */}
      <Animated.View
        style={[
          styles.indicator,
          {
            // Transform translateX moves the indicator under the active tab
            transform: [
              {
                translateX: slideAnimation,
              },
            ],
            width: indicatorWidth || (SCREEN_WIDTH / tabs.length),
          },
        ]}
      />
      
      {/* Hidden measure to get exact width of one tab for the indicator */}
      <View
        style={{
          position: 'absolute',
          width: SCREEN_WIDTH / tabs.length,
          opacity: 0,
        }}
        onLayout={(e) => setIndicatorWidth(e.nativeEvent.layout.width)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 60,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    justifyContent: 'center',
    // Rule 3: Safe area padding for modern devices
    paddingBottom: Platform.OS === 'ios' ? 10 : 0,
  },
  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    flex: 1,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  tabLabel: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
  activeLabel: {
    color: '#007AFF', // Standard iOS blue, or brand color
    fontWeight: '600',
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    height: 3,
    backgroundColor: '#007AFF',
    borderRadius: 1.5,
    // Shadow for depth on iOS
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    // Android elevation
    elevation: 3,
  },
});

export default AnimatedBottomTabBar;