import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

import { ChatMessage } from '@/types';
import { formatTime } from '@/utils/helpers';
import { radius } from '@/config/theme';

interface Props {
  msg: ChatMessage;
}

export default function ChatBubble({ msg }: Props) {
  const theme = useTheme();
  const isUser = msg.role === 'user';

  return (
    <View
      style={[
        styles.row,
        { justifyContent: isUser ? 'flex-end' : 'flex-start' },
      ]}
    >
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: isUser
              ? theme.colors.primary
              : theme.colors.surfaceVariant,
            borderBottomRightRadius: isUser ? 4 : radius.lg,
            borderBottomLeftRadius: isUser ? radius.lg : 4,
          },
        ]}
      >
        <Text
          style={{
            color: isUser ? theme.colors.onPrimary : theme.colors.onSurface,
          }}
        >
          {msg.text}
        </Text>

        {msg.correction ? (
          <View style={[styles.note, { backgroundColor: theme.colors.tertiaryContainer }]}>
            <Text variant="labelSmall" style={{ color: theme.colors.tertiary, fontWeight: '700' }}>
              ✓ CORRECTION
            </Text>
            <Text style={{ color: theme.colors.onTertiaryContainer, marginTop: 2 }}>
              {msg.correction}
            </Text>
          </View>
        ) : null}

        {msg.suggestion ? (
          <View style={[styles.note, { backgroundColor: theme.colors.secondaryContainer }]}>
            <Text variant="labelSmall" style={{ color: theme.colors.secondary, fontWeight: '700' }}>
              💡 BETTER
            </Text>
            <Text style={{ color: theme.colors.onSecondaryContainer, marginTop: 2 }}>
              {msg.suggestion}
            </Text>
          </View>
        ) : null}

        <Text
          variant="labelSmall"
          style={[
            styles.time,
            {
              color: isUser
                ? 'rgba(255,255,255,0.7)'
                : theme.colors.onSurfaceVariant,
            },
          ]}
        >
          {formatTime(msg.timestamp)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  bubble: {
    maxWidth: '82%',
    padding: 12,
    borderRadius: radius.lg,
  },
  note: {
    marginTop: 8,
    padding: 8,
    borderRadius: 8,
  },
  time: {
    marginTop: 4,
    alignSelf: 'flex-end',
  },
});
