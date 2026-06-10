import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { Companion } from '@/config/companions';

interface Props {
  companion: Companion;
  size?: number;
  showRing?: boolean;
  state?: 'idle' | 'listening' | 'thinking' | 'speaking';
  style?: StyleProp<ViewStyle>;
}

export const CompanionAvatar: React.FC<Props> = ({
  companion,
  size = 64,
  showRing = false,
  state = 'idle',
  style,
}) => {
  const ringColor = state === 'listening' ? '#22D3EE' : state === 'speaking' ? '#34D399' : state === 'thinking' ? '#FACC15' : companion.accent;

  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      {showRing && (
        <View
          style={[
            styles.ring,
            {
              width: size + 12,
              height: size + 12,
              borderRadius: (size + 12) / 2,
              borderColor: ringColor,
            },
          ]}
        />
      )}
      <LinearGradient
        colors={companion.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={companion.icon} size={size * 0.5} color="#FFFFFF" />
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  ring: {
    position: 'absolute',
    borderWidth: 2,
  },
});

export default CompanionAvatar;
