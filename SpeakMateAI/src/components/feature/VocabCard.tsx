import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text, useTheme, Chip, IconButton } from 'react-native-paper';

import { VocabWord } from '@/types';
import Card from '@/components/common/Card';

interface Props {
  word: VocabWord;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onSpeak?: () => void;
}

export default function VocabCard({ word, isFavorite, onToggleFavorite, onSpeak }: Props) {
  const theme = useTheme();
  return (
    <Card>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text variant="headlineSmall" style={{ fontWeight: '700' }}>
            {word.word}
          </Text>
          <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {word.partOfSpeech} · {word.level}
          </Text>
        </View>
        <View style={styles.actions}>
          <IconButton
            icon="volume-high"
            size={20}
            onPress={onSpeak}
            testID={`vocab-speak-${word.id}`}
          />
          <Pressable
            onPress={onToggleFavorite}
            testID={`vocab-fav-${word.id}`}
            hitSlop={8}
            style={({ pressed }) => [
              styles.favBtn,
              {
                backgroundColor: isFavorite
                  ? theme.colors.secondary
                  : theme.colors.surfaceVariant,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Text
              style={{
                color: isFavorite ? theme.colors.onSecondary : theme.colors.onSurface,
                fontSize: 18,
              }}
            >
              {isFavorite ? '♥' : '♡'}
            </Text>
          </Pressable>
        </View>
      </View>

      <Text variant="bodyLarge" style={{ marginTop: 12 }}>
        {word.meaning}
      </Text>
      <Chip compact style={{ marginTop: 8, alignSelf: 'flex-start' }}>
        {word.hindiMeaning}
      </Chip>

      <View style={[styles.exampleBox, { backgroundColor: theme.colors.primaryContainer }]}>
        <Text variant="labelMedium" style={{ color: theme.colors.primary, fontWeight: '700' }}>
          EXAMPLE
        </Text>
        <Text
          style={{ color: theme.colors.onPrimaryContainer, marginTop: 4, fontStyle: 'italic' }}
        >
          “{word.example}”
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  favBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exampleBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
  },
});
