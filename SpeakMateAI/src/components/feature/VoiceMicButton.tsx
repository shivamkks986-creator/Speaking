import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Pressable, ViewStyle, StyleProp, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  onPress: () => void;
  recording: boolean;
  state?: 'idle' | 'listening' | 'thinking' | 'speaking';
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export const VoiceMicButton: React.FC<Props> = ({
  onPress,
  recording,
  state = 'idle',
  size = 120,
  style,
}) => {
  const pulse = useRef(new Animated.Value(0)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    loopRef.current?.stop();
    if (recording || state === 'listening') {
      const seq = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1,
            duration: 800,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 0,
            duration: 800,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      );
      loopRef.current = seq;
      seq.start();
    } else {
      Animated.timing(pulse, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
    return () => {
      loopRef.current?.stop();
    };
  }, [recording, state, pulse]);

  const scale1 = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] });
  const opacity1 = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] });
  const scale2 = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.7] });
  const opacity2 = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0] });

  const colors: [string, string] =
    state === 'speaking'
      ? ['#34D399', '#22D3EE']
      : state === 'thinking'
      ? ['#FACC15', '#F97316']
      : recording || state === 'listening'
      ? ['#FF6B9D', '#7C5CFF']
      : ['#7C5CFF', '#A992FF'];

  const icon: keyof typeof Ionicons.glyphMap =
    state === 'thinking' ? 'ellipsis-horizontal' : state === 'speaking' ? 'volume-high' : recording || state === 'listening' ? 'stop' : 'mic';

  return (
    <Pressable onPress={onPress} style={[{ width: size + 60, height: size + 60, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Animated.View
        style={[
          styles.ring,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: colors[0], transform: [{ scale: scale2 }], opacity: opacity2 },
        ]}
      />
      <Animated.View
        style={[
          styles.ring,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: colors[0], transform: [{ scale: scale1 }], opacity: opacity1 },
        ]}
      />
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: colors[0],
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.6,
          shadowRadius: 20,
          elevation: 12,
        }}
      >
        <Ionicons name={icon} size={size * 0.45} color="#FFFFFF" />
      </LinearGradient>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  ring: {
    position: 'absolute',
  },
});

export default VoiceMicButton;
