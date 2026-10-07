import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  StyleSheet,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Tab {
  label: string;
  icon?: string;
}

interface AnimatedBottomTabBarProps {
  tabs: Tab[];
  activeTab: number;
  onTabPress: (index: number) => void;
}

const TAB_COUNT = 3;

export const AnimatedBottomTabBar: React.FC<AnimatedBottomTabBarProps> = ({
  tabs,
  activeTab,
  onTabPress,
}) => {
  const [scrollX] = React.useState(new Animated.Value(0));

  // Update the animated value when activeTab changes
  React.useEffect(() => {
    Animated.timing(scrollX, {
      toValue: activeTab,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [activeTab, scrollX]);

  // Calculate the position of the indicator
  // We want to move from 0 to SCREEN_WIDTH / TAB_COUNT for each step
  const indicatorPosition = scrollX.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, SCREEN_WIDTH / TAB_COUNT, (SCREEN_WIDTH / TAB_COUNT) * 2],
  });

  return (
    <View style={styles.container}>
      <View style={styles.tabsContainer}>
        {tabs.map((tab, index) => (
          <TouchableOpacity
            key={index}
            style={styles.tabItem}
            onPress={() => onTabPress(index)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabLabel,
                activeTab === index ? styles.activeLabel : styles.inactiveLabel,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
        
        {/* Sliding Indicator */}
        <Animated.View
          style={[
            styles.indicator,
            {
              transform: [{ translateX: indicatorPosition }],
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingBottom: 5, // Safe area padding approximation
  },
  tabsContainer: {
    flexDirection: 'row',
    height: 50,
    position: 'relative',
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  activeLabel: {
    color: '#007AFF',
  },
  inactiveLabel: {
    color: '#8E8E93',
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    width: SCREEN_WIDTH / TAB_COUNT,
    height: 3,
    backgroundColor: '#007AFF',
    borderRadius: 1.5,
  },
});

export default AnimatedBottomTabBar;