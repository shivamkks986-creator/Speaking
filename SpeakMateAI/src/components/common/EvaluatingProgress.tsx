// EvaluatingProgress — shimmering progress bar shown while the AI evaluates
// the user's answer. Communicates that the ~5s wait is real work, not a
// freeze. Cycles through staged status messages so users understand what's
// happening under the hood.
//
// Usage:
//   {evaluating && <EvaluatingProgress durationMs={5000} />}
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  /** Approx total time the evaluation takes (ms). Bar fills to ~92% over this
   *  window and holds — so it never claims 100% until the caller unmounts it. */
  durationMs?: number;
  /** Optional override for status messages. */
  stages?: string[];
  testID?: string;
}

const DEFAULT_STAGES = [
  'Listening to your answer…',
  'Checking grammar & clarity…',
  'Scoring your response…',
  'Preparing personalised feedback…',
];

export default function EvaluatingProgress({ durationMs = 5000, stages = DEFAULT_STAGES, testID }: Props) {
  const progress = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(-1)).current;
  const [stageIdx, setStageIdx] = useState(0);

  useEffect(() => {
    // Bar fills to 92% linearly over durationMs — the last 8% is reserved
    // for the moment the parent flips `evaluating=false`.
    Animated.timing(progress, {
      toValue: 0.92,
      duration: durationMs,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    // Shimmer sweep loops forever while mounted.
    const loop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();

    // Cycle through stage labels.
    const step = Math.max(600, Math.floor(durationMs / stages.length));
    const iv = setInterval(() => {
      setStageIdx((i) => Math.min(i + 1, stages.length - 1));
    }, step);

    return () => {
      loop.stop();
      clearInterval(iv);
    };
  }, [durationMs, stages.length]);

  const widthPct = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const shimmerTranslate = shimmer.interpolate({
    inputRange: [-1, 1],
    outputRange: [-120, 240],
  });

  return (
    <View style={styles.wrap} testID={testID ?? 'evaluating-progress'}>
      <View style={styles.stageRow}>
        <Ionicons name="sparkles" size={14} color="#FACC15" />
        <Text style={styles.stageText} testID="evaluating-stage-text">{stages[stageIdx]}</Text>
      </View>

      <View style={styles.track}>
        <Animated.View style={[styles.fill, { width: widthPct }]}>
          <LinearGradient
            colors={['#FACC15', '#FF6B9D', '#7C5CFF']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFillObject}
          />
          <Animated.View
            style={[styles.shimmer, { transform: [{ translateX: shimmerTranslate }] }]}
          >
            <LinearGradient
              colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.55)', 'rgba(255,255,255,0)']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFillObject}
            />
          </Animated.View>
        </Animated.View>
      </View>

      <Text style={styles.hint}>Usually takes 3–5 seconds. Please keep the app open.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 12,
    padding: 14,
    backgroundColor: 'rgba(124,92,255,0.10)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(124,92,255,0.30)',
  },
  stageRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  stageText: { color: '#F2EEFF', fontWeight: '700', fontSize: 13 },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
    overflow: 'hidden',
  },
  shimmer: {
    position: 'absolute',
    top: 0, bottom: 0,
    width: 120,
  },
  hint: {
    color: 'rgba(242,238,255,0.55)',
    fontSize: 11,
    marginTop: 8,
  },
});
