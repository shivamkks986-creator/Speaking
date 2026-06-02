import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, TextInput, Button, useTheme, Avatar, HelperText } from 'react-native-paper';

import { useAuth } from '@/contexts/AuthContext';
import { validateName } from '@/utils/validators';
import ScreenContainer from '@/components/common/ScreenContainer';
import Card from '@/components/common/Card';

export default function ProfileScreen() {
  const theme = useTheme();
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.displayName ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSave = async () => {
    const err = validateName(name);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await updateProfile({ displayName: name.trim() });
      Alert.alert('Saved', 'Your profile has been updated.');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not update profile';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer scroll>
      <View style={styles.avatarRow}>
        {user?.photoURL ? (
          <Avatar.Image size={88} source={{ uri: user.photoURL }} />
        ) : (
          <Avatar.Text
            size={88}
            label={(user?.displayName || 'U').slice(0, 1).toUpperCase()}
            color="#fff"
            style={{ backgroundColor: theme.colors.primary }}
          />
        )}
        <Text variant="titleMedium" style={{ marginTop: 12, fontWeight: '700' }} numberOfLines={1}>
          {user?.email}
        </Text>
        <Text style={{ color: theme.colors.onSurfaceVariant }}>
          Member since {new Date(user?.createdAt ?? Date.now()).toLocaleDateString('en-IN')}
        </Text>
      </View>

      <Card>
        <Text variant="titleSmall" style={{ fontWeight: '700', marginBottom: 8 }}>
          Personal info
        </Text>
        <TextInput
          mode="outlined"
          label="Display name"
          value={name}
          onChangeText={setName}
          testID="profile-name-input"
        />
        {error ? (
          <HelperText type="error" visible style={{ marginTop: 4 }}>
            {error}
          </HelperText>
        ) : null}
        <Button
          mode="contained"
          onPress={onSave}
          loading={saving}
          disabled={saving}
          style={{ marginTop: 12, borderRadius: 12 }}
          contentStyle={{ height: 46 }}
          testID="profile-save-btn"
        >
          Save changes
        </Button>
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  avatarRow: { alignItems: 'center', marginVertical: 24 },
});
