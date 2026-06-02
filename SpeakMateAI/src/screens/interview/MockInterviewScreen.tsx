import React from 'react';
import { View, StyleSheet, FlatList, Pressable } from 'react-native';
import { Text, useTheme, Chip } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { RootStackParamList } from '@/navigation/types';
import { INTERVIEW_QUESTIONS } from '@/data/interviewQuestions';
import Card from '@/components/common/Card';
import ScreenContainer from '@/components/common/ScreenContainer';
import { radius } from '@/config/theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const difficultyColor: Record<string, string> = {
  easy: '#34D399',
  medium: '#F59E0B',
  hard: '#EF4444',
};

export default function MockInterviewScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();

  return (
    <ScreenContainer padded={false} scroll>
      <LinearGradient
        colors={['#F59E0B', '#FBBF24']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Ionicons name="briefcase" size={32} color="#fff" />
        <Text style={styles.heroTitle}>HR Interview Mode</Text>
        <Text style={styles.heroSub}>
          Practise with 10+ common HR questions. Get AI feedback & a score after every answer.
        </Text>
        <Pressable
          onPress={() => navigation.navigate('InterviewSession', {})}
          style={styles.startBtn}
          testID="interview-start-full"
        >
          <Text style={styles.startBtnText}>Start full interview →</Text>
        </Pressable>
      </LinearGradient>

      <View style={styles.section}>
        <Text variant="titleMedium" style={{ fontWeight: '700', marginBottom: 8 }}>
          Or pick a question
        </Text>
        <FlatList
          data={INTERVIEW_QUESTIONS}
          keyExtractor={(q) => q.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => navigation.navigate('InterviewSession', { questionId: item.id })}
              testID={`interview-q-${item.id}`}
            >
              <Card style={{ marginBottom: 10 }}>
                <View style={styles.qRow}>
                  <View style={{ flex: 1 }}>
                    <Text variant="titleSmall" style={{ fontWeight: '700' }}>
                      {item.question}
                    </Text>
                    <View style={styles.tagRow}>
                      <Chip compact style={{ marginTop: 6, marginRight: 6 }}>
                        {item.category}
                      </Chip>
                      <View
                        style={[
                          styles.diffPill,
                          { backgroundColor: difficultyColor[item.difficulty] },
                        ]}
                      >
                        <Text style={styles.diffText}>{item.difficulty}</Text>
                      </View>
                    </View>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={22}
                    color={theme.colors.onSurfaceVariant}
                  />
                </View>
              </Card>
            </Pressable>
          )}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: {
    margin: 16,
    padding: 20,
    borderRadius: radius.xl,
  },
  heroTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 8 },
  heroSub: { color: 'rgba(255,255,255,0.95)', marginTop: 6, lineHeight: 20 },
  startBtn: {
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  startBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  section: { paddingHorizontal: 16, paddingBottom: 24 },
  qRow: { flexDirection: 'row', alignItems: 'center' },
  tagRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  diffPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
  },
  diffText: { color: '#fff', fontWeight: '700', fontSize: 11, textTransform: 'uppercase' },
});
