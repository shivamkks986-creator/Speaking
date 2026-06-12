// Onboarding — 5 premium swipeable slides with skip/continue
import React, { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FadeInView from '@/components/common/FadeInView';

import { radius, spacing } from '@/config/theme';

const { width } = Dimensions.get('window');

type Slide = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  gradient: [string, string];
  accent: string;
};

const SLIDES: Slide[] = [
  {
    id: '1',
    icon: 'sparkles',
    title: 'Improve English Daily',
    subtitle: 'Build fluency with bite-sized practice — designed for Indian learners.',
    gradient: ['#7C5CFF', '#A992FF'],
    accent: '#A992FF',
  },
  {
    id: '2',
    icon: 'chatbubbles',
    title: 'Practice with AI Voice Tutors',
    subtitle: 'Talk to 5 unique AI companions. Real voice, real corrections, instant feedback.',
    gradient: ['#FF6B9D', '#FFA496'],
    accent: '#FF6B9D',
  },
  {
    id: '3',
    icon: 'briefcase',
    title: 'Crack Interviews with AI',
    subtitle: '11 interview tracks — HR, Tech, Sales, Manager. Get hired faster.',
    gradient: ['#5B3FE0', '#22D3EE'],
    accent: '#22D3EE',
  },
  {
    id: '4',
    icon: 'flame',
    title: 'Track Progress & Streaks',
    subtitle: 'Earn XP, unlock badges, climb levels. Daily missions keep you sharp.',
    gradient: ['#FACC15', '#FF6B9D'],
    accent: '#FACC15',
  },
  {
    id: '5',
    icon: 'diamond',
    title: 'Unlock Premium Learning',
    subtitle: 'IELTS mode, unlimited AI, advanced pronunciation — start free.',
    gradient: ['#FACC15', '#FF6B9D', '#7C5CFF'] as unknown as [string, string],
    accent: '#FACC15',
  },
];

export default function OnboardingScreen() {
  const navigation = useNavigation<any>();
  const flatRef = useRef<FlatList>(null);
  const [index, setIndex] = useState(0);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) setIndex(i);
  };

  const next = () => {
    if (index < SLIDES.length - 1) {
      flatRef.current?.scrollToIndex({ index: index + 1, animated: true });
    } else {
      finish();
    }
  };

  const finish = async () => {
    await AsyncStorage.setItem('onboarding.completed', '1');
    navigation.replace('Welcome');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0418' }}>
      <LinearGradient colors={['#0A0418', '#150828', '#1F0E3D']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <View style={styles.brand}>
            <LinearGradient
              colors={['#FACC15', '#FF6B9D', '#7C5CFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.brandDot}
            >
              <Ionicons name="diamond" size={14} color="#fff" />
            </LinearGradient>
            <Text style={styles.brandText}>SpeakMate AI</Text>
          </View>
          <Pressable onPress={finish} hitSlop={10} testID="onboarding-skip-btn">
            <Text style={styles.skip}>Skip</Text>
          </Pressable>
        </View>

        <FlatList
          ref={flatRef}
          data={SLIDES}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          keyExtractor={(s) => s.id}
          renderItem={({ item, index: i }) => <SlideView slide={item} active={i === index} />}
        />

        <View style={styles.bottom}>
          <View style={styles.dots}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === index && { backgroundColor: SLIDES[index].accent, width: 24 },
                ]}
              />
            ))}
          </View>

          <Pressable onPress={next} testID="onboarding-next-btn" style={{ marginTop: spacing.lg }}>
            <LinearGradient
              colors={SLIDES[index].gradient as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.cta}
            >
              <Text style={styles.ctaText}>
                {index === SLIDES.length - 1 ? 'Get Started' : 'Continue'}
              </Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

function SlideView({ slide, active }: { slide: Slide; active: boolean }) {
  return (
    <View style={[styles.slide, { width }]}>
      <FadeInView duration={450} style={styles.illustrationWrap}>
        <LinearGradient
          colors={slide.gradient as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconGlow}
        >
          <View style={styles.iconInner}>
            <Ionicons name={slide.icon} size={64} color="#fff" />
          </View>
        </LinearGradient>
        {active && <RingGlow color={slide.accent} />}
      </FadeInView>

      <FadeInView delay={150} duration={500} direction="up">
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.sub}>{slide.subtitle}</Text>
      </FadeInView>
    </View>
  );
}

function RingGlow({ color }: { color: string }) {
  return (
    <>
      <View style={[styles.ring, { borderColor: `${color}30`, width: 220, height: 220, borderRadius: 110 }]} />
      <View style={[styles.ring, { borderColor: `${color}20`, width: 280, height: 280, borderRadius: 140 }]} />
      <View style={[styles.ring, { borderColor: `${color}10`, width: 340, height: 340, borderRadius: 170 }]} />
    </>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: { color: '#F2EEFF', fontWeight: '800', fontSize: 16 },
  skip: { color: 'rgba(242,238,255,0.7)', fontWeight: '700', fontSize: 14 },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  illustrationWrap: {
    width: 340,
    height: 340,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  iconGlow: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C5CFF',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 16,
  },
  iconInner: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  ring: {
    position: 'absolute',
    borderWidth: 1.5,
  },
  title: {
    color: '#F2EEFF',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  sub: {
    color: 'rgba(242,238,255,0.72)',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.md,
  },
  bottom: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: radius.pill,
    shadowColor: '#7C5CFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 10,
  },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
