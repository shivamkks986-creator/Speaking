import React, { useEffect } from 'react';
import { View, StyleSheet, Pressable, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  interpolate,
} from 'react-native-reanimated';

interface Props {
  onPress: () => void;
  recording: boolean;
  state?: 'idle' | 'listening' | 'thinking' | 'speaking';
  size?: number;
  style?: StyleProp<ViewStyle>;
}

const AnimatedView = Animated.createAnimatedComponent(View);

export const VoiceMicButton: React.FC<Props> = ({
  onPress,
  recording,
  state = 'idle',
  size = 120,
  style,
}) => {
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (recording || state === 'listening') {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 800, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 800, easing: Easing.in(Easing.quad) })
        ),
        -1,
        false
      );
    } else {
      pulse.value = withTiming(0, { duration: 200 });
    }
  }, [recording, state, pulse]);

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.35]) }],
    opacity: interpolate(pulse.value, [0, 1], [0.45, 0]),
  }));
  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.7]) }],
    opacity: interpolate(pulse.value, [0, 1], [0.25, 0]),
  }));

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
      <AnimatedView
        style={[
          styles.ring,
          ring2Style,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: colors[0] },
        ]}
      />
      <AnimatedView
        style={[
          styles.ring,
          ring1Style,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: colors[0] },
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
