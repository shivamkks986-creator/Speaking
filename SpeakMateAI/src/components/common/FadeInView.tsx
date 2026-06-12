// FadeInView — stock React Native Animated wrapper that mimics
// Reanimated's FadeIn / FadeInUp / FadeInDown entrance animations.
// Used as a drop-in replacement to avoid native C++ (Reanimated) compilation.
import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle, StyleProp } from 'react-native';

type Direction = 'in' | 'up' | 'down';

interface Props {
  children?: React.ReactNode;
  delay?: number;
  duration?: number;
  direction?: Direction;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export default function FadeInView({
  children,
  delay = 0,
  duration = 400,
  direction = 'in',
  style,
  testID,
}: Props) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration,
      delay,
      useNativeDriver: true,
    }).start();
  }, [progress, delay, duration]);

  const translateY =
    direction === 'in'
      ? 0
      : progress.interpolate({
          inputRange: [0, 1],
          outputRange: [direction === 'up' ? 20 : -20, 0],
        });

  return (
    <Animated.View
      testID={testID}
      style={[
        { opacity: progress, transform: [{ translateY }] },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}
