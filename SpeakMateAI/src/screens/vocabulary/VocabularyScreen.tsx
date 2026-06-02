import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, Pressable } from 'react-native';
import { Text, Chip, useTheme, FAB } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { RootStackParamList } from '@/navigation/types';
import { VocabWord } from '@/types';
import { VOCAB_WORDS } from '@/data/vocabulary';
import { STORAGE_KEYS } from '@/utils/constants';
import { useProgress } from '@/contexts/ProgressContext';
import { speechService } from '@/services/speechService';
import VocabCard from '@/components/feature/VocabCard';
import ScreenContainer from '@/components/common/ScreenContainer';
import EmptyState from '@/components/common/EmptyState';

type Level = 'all' | 'beginner' | 'intermediate' | 'advanced';
type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function VocabularyScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const { recordActivity } = useProgress();
  const [filter, setFilter] = useState<Level>('all');
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.FAV_WORDS)
      .then((raw) => raw && setFavorites(JSON.parse(raw)))
      .catch(() => {});
  }, []);

  const persistFavs = useCallback(async (next: string[]) => {
    setFavorites(next);
    await AsyncStorage.setItem(STORAGE_KEYS.FAV_WORDS, JSON.stringify(next));
  }, []);

  const toggleFav = useCallback(
    (w: VocabWord) => {
      const isFav = favorites.includes(w.id);
      const next = isFav ? favorites.filter((id) => id !== w.id) : [...favorites, w.id];
      persistFavs(next).catch(() => {});
      if (!isFav) recordActivity(0, 'vocab').catch(() => {});
    },
    [favorites, persistFavs, recordActivity]
  );

  const filtered =
    filter === 'all' ? VOCAB_WORDS : VOCAB_WORDS.filter((w) => w.level === filter);

  return (
    <ScreenContainer padded={false}>
      <View style={styles.filters}>
        {(['all', 'beginner', 'intermediate', 'advanced'] as Level[]).map((l) => (
          <Chip
            key={l}
            selected={filter === l}
            onPress={() => setFilter(l)}
            style={{ marginRight: 8 }}
            testID={`vocab-filter-${l}`}
          >
            {l[0].toUpperCase() + l.slice(1)}
          </Chip>
        ))}
      </View>

      {filtered.length === 0 ? (
        <EmptyState title="No words yet" description="Check back tomorrow for new words." />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(w) => w.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={{ marginBottom: 12 }}>
              <VocabCard
                word={item}
                isFavorite={favorites.includes(item.id)}
                onToggleFavorite={() => toggleFav(item)}
                onSpeak={() => speechService.speak(item.word)}
              />
            </View>
          )}
        />
      )}

      <FAB
        icon="heart"
        label={`${favorites.length} favorites`}
        style={[styles.fab, { backgroundColor: theme.colors.secondary }]}
        color="#fff"
        onPress={() => navigation.navigate('Favorites')}
        testID="vocab-favorites-fab"
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  filters: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexWrap: 'wrap',
  },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  fab: { position: 'absolute', right: 16, bottom: 16 },
});
