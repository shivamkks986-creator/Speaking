import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Text, TextInput, IconButton, useTheme, Appbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChatMessage } from '@/types';
import { aiService } from '@/services/aiService';
import { useProgress } from '@/contexts/ProgressContext';
import { randomId } from '@/utils/helpers';
import ChatBubble from '@/components/feature/ChatBubble';
import EmptyState from '@/components/common/EmptyState';

export default function AITutorScreen() {
  const theme = useTheme();
  const { recordActivity } = useProgress();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const onSend = useCallback(async () => {
    const text = input.trim();
    if (!text || thinking) return;
    const userMsg: ChatMessage = {
      id: randomId(),
      role: 'user',
      text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setThinking(true);
    setError(null);
    try {
      const reply = await aiService.chat(text);
      setMessages((prev) => [...prev, reply]);
      recordActivity(1, 'chat').catch(() => {});
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    } catch {
      setError('Could not reach the AI tutor. Try again.');
    } finally {
      setThinking(false);
    }
  }, [input, thinking, recordActivity]);

  const onClear = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }} elevated>
        <Appbar.Content title="AI Tutor" subtitle="Chat in English freely" />
        {messages.length > 0 ? (
          <Appbar.Action icon="broom" onPress={onClear} testID="tutor-clear-btn" />
        ) : null}
      </Appbar.Header>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={64}
      >
        {messages.length === 0 ? (
          <EmptyState
            icon="chatbubbles-outline"
            title="Say hello in English"
            description="Type a message or even Hindi — I'll teach you the English version, fix grammar, and suggest better phrasing."
          />
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={({ item }) => <ChatBubble msg={item} />}
            contentContainerStyle={styles.list}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          />
        )}

        {error ? (
          <View style={[styles.errorBar, { backgroundColor: theme.colors.errorContainer }]}>
            <Text style={{ color: theme.colors.onErrorContainer }}>{error}</Text>
          </View>
        ) : null}

        {thinking ? (
          <View style={styles.thinkingRow}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={[styles.thinkingText, { color: theme.colors.onSurfaceVariant }]}>
              AI is typing…
            </Text>
          </View>
        ) : null}

        <View
          style={[
            styles.inputBar,
            { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.outline },
          ]}
        >
          <TextInput
            mode="outlined"
            placeholder="Ask anything in English or Hindi…"
            value={input}
            onChangeText={setInput}
            multiline
            style={styles.input}
            dense
            testID="tutor-input"
          />
          <IconButton
            icon="send"
            mode="contained"
            iconColor="#fff"
            containerColor={input.trim() ? theme.colors.primary : theme.colors.outline}
            onPress={onSend}
            disabled={!input.trim() || thinking}
            testID="tutor-send-btn"
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { padding: 12, paddingBottom: 8 },
  thinkingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 8,
  },
  thinkingText: { fontStyle: 'italic' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  input: { flex: 1, maxHeight: 120 },
  errorBar: { paddingHorizontal: 16, paddingVertical: 10 },
});
