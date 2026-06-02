import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, useTheme, ProgressBar, ActivityIndicator } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RootStackParamList } from '@/navigation/types';
import { INTERVIEW_QUESTIONS } from '@/data/interviewQuestions';
import { aiService } from '@/services/aiService';
import { speechService } from '@/services/speechService';
import { useProgress } from '@/contexts/ProgressContext';
import { InterviewAnswer } from '@/types';
import Card from '@/components/common/Card';
import { radius } from '@/config/theme';

type Route = RouteProp<RootStackParamList, 'InterviewSession'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function InterviewSessionScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const theme = useTheme();
  const { recordActivity } = useProgress();

  const questions = useMemo(() => {
    if (route.params?.questionId) {
      const q = INTERVIEW_QUESTIONS.find((x) => x.id === route.params!.questionId);
      return q ? [q] : INTERVIEW_QUESTIONS.slice(0, 5);
    }
    return INTERVIEW_QUESTIONS.slice(0, 5);
  }, [route.params]);

  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [thinking, setThinking] = useState(false);
  const [results, setResults] = useState<InterviewAnswer[]>([]);
  const [phase, setPhase] = useState<'asking' | 'reviewing' | 'done'>('asking');

  const current = questions[index];

  useEffect(() => {
    if (phase === 'asking' && current) {
      speechService.speak(current.question);
    }
    return () => speechService.stopSpeaking();
  }, [index, phase, current]);

  const submit = useCallback(async () => {
    if (!answer.trim() || !current) return;
    setThinking(true);
    try {
      const { score, feedback } = await aiService.evaluateInterviewAnswer(current, answer);
      setResults((prev) => [
        ...prev,
        { questionId: current.id, question: current.question, answer, score, feedback },
      ]);
      setPhase('reviewing');
    } finally {
      setThinking(false);
    }
  }, [answer, current]);

  const next = useCallback(() => {
    if (index + 1 < questions.length) {
      setIndex(index + 1);
      setAnswer('');
      setPhase('asking');
    } else {
      recordActivity(Math.max(2, questions.length), 'interview').catch(() => {});
      setPhase('done');
    }
  }, [index, questions.length, recordActivity]);

  const overall =
    results.length > 0
      ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length)
      : 0;

  if (phase === 'done') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <ScrollView contentContainerStyle={styles.doneWrap}>
          <Ionicons name="trophy" size={72} color="#F59E0B" />
          <Text variant="headlineMedium" style={{ fontWeight: '800', marginTop: 12 }}>
            Interview Complete
          </Text>
          <Text style={[styles.overallScore, { color: theme.colors.primary }]}>{overall}/100</Text>
          <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
            {overall >= 80
              ? 'Outstanding! You sound interview-ready.'
              : overall >= 60
                ? 'Good progress — practise a few more rounds for confidence.'
                : 'Keep practising. Structure with STAR and add concrete examples.'}
          </Text>

          {results.map((r, i) => (
            <Card key={r.questionId} style={{ marginTop: 12, width: '100%' }}>
              <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                Q{i + 1}
              </Text>
              <Text style={{ fontWeight: '700', marginTop: 4 }}>{r.question}</Text>
              <View style={styles.scoreRow}>
                <Text>Score</Text>
                <Text style={{ fontWeight: '700' }}>{r.score}/100</Text>
              </View>
              <ProgressBar
                progress={r.score / 100}
                color={r.score >= 70 ? theme.colors.tertiary : theme.colors.secondary}
                style={{ height: 6, borderRadius: 3, marginTop: 4 }}
              />
              <Text style={{ marginTop: 8, fontStyle: 'italic' }}>{r.feedback}</Text>
            </Card>
          ))}

          <Button
            mode="contained"
            style={{ marginTop: 24, alignSelf: 'stretch' }}
            onPress={() => navigation.popToTop()}
            testID="interview-finish-btn"
          >
            Back to home
          </Button>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const lastResult = results[results.length - 1];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.progressTop}>
            <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              Question {index + 1} of {questions.length}
            </Text>
            <ProgressBar
              progress={(index + (phase === 'reviewing' ? 1 : 0)) / questions.length}
              color={theme.colors.primary}
              style={styles.progressBar}
            />
          </View>

          <Card>
            <View style={styles.interviewerRow}>
              <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
                <Ionicons name="person" size={20} color="#fff" />
              </View>
              <Text variant="labelLarge" style={{ marginLeft: 8, fontWeight: '700' }}>
                AI Interviewer
              </Text>
              <Button
                mode="text"
                compact
                icon="volume-high"
                onPress={() => current && speechService.speak(current.question)}
              >
                Hear
              </Button>
            </View>
            <Text variant="titleLarge" style={{ fontWeight: '700', marginTop: 8, lineHeight: 28 }}>
              {current?.question}
            </Text>
          </Card>

          {phase === 'asking' ? (
            <View style={{ marginTop: 16 }}>
              <TextInput
                mode="outlined"
                label="Your answer"
                value={answer}
                onChangeText={setAnswer}
                multiline
                numberOfLines={6}
                placeholder="Take your time. Structure with STAR..."
                testID="interview-answer-input"
              />
              <Button
                mode="contained"
                onPress={submit}
                loading={thinking}
                disabled={thinking || !answer.trim()}
                contentStyle={{ height: 48 }}
                style={{ marginTop: 12, borderRadius: 12 }}
                testID="interview-submit-btn"
              >
                Submit answer
              </Button>
            </View>
          ) : (
            lastResult && (
              <Card style={{ marginTop: 16 }}>
                <View style={styles.scoreHeader}>
                  <Text variant="titleMedium" style={{ fontWeight: '700' }}>
                    AI Feedback
                  </Text>
                  <Text
                    style={[
                      styles.scoreNumber,
                      { color: lastResult.score >= 70 ? theme.colors.tertiary : theme.colors.secondary },
                    ]}
                  >
                    {lastResult.score}/100
                  </Text>
                </View>
                <Text style={{ marginTop: 6, lineHeight: 22 }}>{lastResult.feedback}</Text>
                <Button
                  mode="contained"
                  onPress={next}
                  icon="arrow-right"
                  style={{ marginTop: 12, borderRadius: 12 }}
                  testID="interview-next-btn"
                >
                  {index + 1 < questions.length ? 'Next question' : 'See results'}
                </Button>
              </Card>
            )
          )}

          {thinking ? (
            <View style={styles.thinking}>
              <ActivityIndicator color={theme.colors.primary} />
              <Text style={{ marginLeft: 8, color: theme.colors.onSurfaceVariant }}>
                Analysing your answer…
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  progressTop: { marginBottom: 12 },
  progressBar: { height: 6, borderRadius: 3, marginTop: 6 },
  interviewerRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  scoreHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  scoreNumber: { fontSize: 24, fontWeight: '800' },
  doneWrap: { padding: 24, alignItems: 'center' },
  overallScore: { fontSize: 56, fontWeight: '800', marginVertical: 8 },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  thinking: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
});
