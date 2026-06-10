import React, { useState } from 'react';
import { View, StyleSheet, FlatList, Pressable } from 'react-native';
import { Text, Button, useTheme, Appbar, IconButton } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getDrillsForToday } from '@/data/pronunciationDrills';
import { speechService } from '@/services/speechService';
import Card from '@/components/common/Card';
import { PronunciationDrill } from '@/types';
import { useNavigation } from '@react-navigation/native';

export default function PronunciationPracticeScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const [drills] = useState<PronunciationDrill[]>(getDrillsForToday());
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  const playWord = (word: string) => {
    speechService.speak(word, { rate: 0.7 });
  };

  const playSlow = (word: string) => {
    speechService.speak(word, { rate: 0.45 });
  };

  const playExample = (text: string) => {
    speechService.speak(text);
  };

  const markComplete = (id: string) => {
    setCompleted((prev) => new Set(prev).add(id));
  };

  const progress = Math.round((completed.size / drills.length) * 100);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }} elevated>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content
          title="Pronunciation Practice"
          subtitle={`${completed.size} / ${drills.length} completed`}
        />
      </Appbar.Header>

      <FlatList
        data={drills}
        keyExtractor={(d) => d.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={[styles.headerBox, { backgroundColor: theme.colors.primaryContainer }]}>
            <Ionicons name="megaphone" size={28} color={theme.colors.primary} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text variant="titleMedium" style={{ fontWeight: '700' }}>
                Master 3 tricky words today
              </Text>
              <Text style={{ color: theme.colors.onPrimaryContainer, marginTop: 2, fontSize: 13 }}>
                Listen → Repeat aloud → Tap done. Progress: {progress}%
              </Text>
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const done = completed.has(item.id);
          return (
            <Card style={{ marginTop: 12 }}>
              <View style={styles.wordRow}>
                <View style={{ flex: 1 }}>
                  <Text variant="headlineSmall" style={{ fontWeight: '800' }}>
                    {item.word}
                  </Text>
                  <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                    {item.phonetic}
                  </Text>
                </View>
                {done ? (
                  <Ionicons name="checkmark-circle" size={28} color={theme.colors.tertiary} />
                ) : null}
              </View>

              <View style={styles.btnRow}>
                <Button
                  mode="contained"
                  icon="volume-high"
                  onPress={() => playWord(item.word)}
                  style={{ flex: 1, borderRadius: 12 }}
                  testID={`pron-normal-${item.id}`}
                >
                  Normal
                </Button>
                <Button
                  mode="outlined"
                  icon="play-speed"
                  onPress={() => playSlow(item.word)}
                  style={{ flex: 1, borderRadius: 12 }}
                  testID={`pron-slow-${item.id}`}
                >
                  Slow
                </Button>
              </View>

              <View style={[styles.tipBox, { backgroundColor: theme.colors.secondaryContainer }]}>
                <Text
                  variant="labelMedium"
                  style={{ color: theme.colors.secondary, fontWeight: '800' }}
                >
                  TIP
                </Text>
                <Text style={{ color: theme.colors.onSecondaryContainer, marginTop: 4 }}>
                  {item.tip}
                </Text>
              </View>

              <View style={styles.exampleRow}>
                <View style={{ flex: 1 }}>
                  <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                    EXAMPLE
                  </Text>
                  <Text style={{ fontStyle: 'italic', marginTop: 2 }}>“{item.example}”</Text>
                </View>
                <IconButton
                  icon="volume-high"
                  onPress={() => playExample(item.example)}
                  testID={`pron-example-${item.id}`}
                />
              </View>

              <Button
                mode={done ? 'outlined' : 'contained-tonal'}
                icon={done ? 'check-circle' : 'check'}
                onPress={() => markComplete(item.id)}
                disabled={done}
                style={{ marginTop: 4, borderRadius: 12 }}
                testID={`pron-done-${item.id}`}
              >
                {done ? 'Completed' : 'Mark as practised'}
              </Button>
            </Card>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 32 },
  headerBox: { flexDirection: 'row', padding: 16, borderRadius: 16, alignItems: 'center' },
  wordRow: { flexDirection: 'row', alignItems: 'center' },
  btnRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  tipBox: { marginTop: 12, padding: 12, borderRadius: 10 },
  exampleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
});
