import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { VOCAB_WORDS } from '@/data/vocabulary';
import { STORAGE_KEYS } from '@/utils/constants';
import { speechService } from '@/services/speechService';
import VocabCard from '@/components/feature/VocabCard';
import ScreenContainer from '@/components/common/ScreenContainer';
import EmptyState from '@/components/common/EmptyState';

export default function FavoritesScreen() {
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.FAV_WORDS)
      .then((raw) => raw && setFavorites(JSON.parse(raw)))
      .catch(() => {});
  }, []);

  const toggleFav = useCallback(async (id: string) => {
    setFavorites((prev) => {
      const next = prev.filter((x) => x !== id);
      AsyncStorage.setItem(STORAGE_KEYS.FAV_WORDS, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const words = VOCAB_WORDS.filter((w) => favorites.includes(w.id));

  if (words.length === 0) {
    return (
      <ScreenContainer>
        <EmptyState
          icon="heart-outline"
          title="No favorites yet"
          description="Tap the heart on any word to save it for revision."
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer padded={false}>
      <FlatList
        data={words}
        keyExtractor={(w) => w.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={{ marginBottom: 12 }}>
            <VocabCard
              word={item}
              isFavorite
              onToggleFavorite={() => toggleFav(item.id)}
              onSpeak={() => speechService.speak(item.word)}
            />
          </View>
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },
});
