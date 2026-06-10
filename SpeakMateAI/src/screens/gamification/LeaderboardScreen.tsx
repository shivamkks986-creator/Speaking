// Leaderboard — community-wide ranking sourced from Firestore `users` collection.
// Falls back to a local mock when Firestore is offline / empty.
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useGamification } from '@/contexts/GamificationContext';
import GlassCard from '@/components/common/GlassCard';
import { radius, spacing } from '@/config/theme';

type Row = { uid: string; name: string; xp: number; isYou?: boolean };

const FALLBACK: Row[] = [
  { uid: 'a', name: 'Priya S.', xp: 4820 },
  { uid: 'b', name: 'Rohan M.', xp: 4310 },
  { uid: 'c', name: 'Anjali V.', xp: 3940 },
  { uid: 'd', name: 'Karan T.', xp: 3580 },
  { uid: 'e', name: 'Neha R.', xp: 3120 },
  { uid: 'f', name: 'Vikas K.', xp: 2780 },
  { uid: 'g', name: 'Sneha B.', xp: 2410 },
];

export default function LeaderboardScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { state: gam } = useGamification();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const q = query(collection(db, 'users'), orderBy('xp', 'desc'), limit(50));
        const snap = await getDocs(q);
        const list: Row[] = snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            uid: d.id,
            name: data.displayName || 'Learner',
            xp: data.xp || 0,
          };
        });
        if (list.length > 0) setRows(list);
        else setRows(FALLBACK);
      } catch {
        setRows(FALLBACK);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Inject the current user with local XP so the user can always see themselves
  const decorated: Row[] = (() => {
    if (!user) return rows;
    const mine: Row = {
      uid: user.uid,
      name: user.displayName || 'You',
      xp: gam.xp,
      isYou: true,
    };
    const without = rows.filter((r) => r.uid !== user.uid);
    return [...without, mine].sort((a, b) => b.xp - a.xp);
  })();

  const myRank = decorated.findIndex((r) => r.isYou) + 1;

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0418' }}>
      <LinearGradient colors={['#1F0E3D', '#0A0418']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={styles.head}>
          <Pressable onPress={() => navigation.goBack()} testID="leaderboard-back-btn">
            <Ionicons name="chevron-back" size={26} color="#F2EEFF" />
          </Pressable>
          <Text style={styles.title}>Leaderboard</Text>
          <Ionicons name="trophy" size={22} color="#FACC15" />
        </View>

        {/* Hero podium */}
        <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
          {decorated.length >= 3 && (
            <View style={styles.podium}>
              <Podium row={decorated[1]} rank={2} height={90} colors={['#C0C0C0', '#9CA3AF']} />
              <Podium row={decorated[0]} rank={1} height={120} colors={['#FACC15', '#F59E0B']} />
              <Podium row={decorated[2]} rank={3} height={70} colors={['#CD7F32', '#A16207']} />
            </View>
          )}

          {/* Your rank */}
          {user && myRank > 0 && (
            <GlassCard style={{ marginHorizontal: spacing.lg, marginTop: spacing.md }}>
              <View style={styles.youRow}>
                <View style={styles.rankPill}>
                  <Text style={styles.rankNum}>#{myRank}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={styles.youLabel}>Your rank</Text>
                  <Text style={styles.youName}>{user.displayName || 'You'}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.xpVal}>{gam.xp}</Text>
                  <Text style={styles.xpUnit}>XP</Text>
                </View>
              </View>
            </GlassCard>
          )}

          {/* Full list */}
          <Text style={styles.section}>This week</Text>
          <View style={{ paddingHorizontal: spacing.lg, gap: 8 }}>
            {loading ? (
              <Text style={styles.dim}>Loading rankings…</Text>
            ) : (
              decorated.slice(0, 20).map((r, i) => (
                <View
                  key={r.uid}
                  style={[
                    styles.rankRow,
                    r.isYou && { borderColor: '#A992FF', backgroundColor: 'rgba(124,92,255,0.12)' },
                  ]}
                >
                  <Text style={[styles.rankIdx, i < 3 && { color: '#FACC15' }]}>#{i + 1}</Text>
                  <Text style={[styles.rankName, r.isYou && { color: '#F2EEFF' }]} numberOfLines={1}>
                    {r.isYou ? `${r.name} (You)` : r.name}
                  </Text>
                  <Text style={styles.rankXp}>{r.xp} XP</Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Podium({
  row,
  rank,
  height,
  colors,
}: {
  row: Row;
  rank: number;
  height: number;
  colors: [string, string];
}) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <View style={[styles.podAvatar, { borderColor: colors[0] }]}>
        <Text style={{ color: '#F2EEFF', fontWeight: '800', fontSize: 18 }}>
          {(row.name || '?').slice(0, 1).toUpperCase()}
        </Text>
      </View>
      <Text style={styles.podName} numberOfLines={1}>{row.name}</Text>
      <Text style={styles.podXp}>{row.xp} XP</Text>
      <LinearGradient colors={colors} style={[styles.podBar, { height }]}>
        <Text style={styles.podRank}>{rank}</Text>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: { color: '#F2EEFF', fontWeight: '800', fontSize: 20 },
  podium: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    gap: spacing.sm,
  },
  podAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginBottom: 8,
  },
  podName: { color: '#F2EEFF', fontWeight: '700', fontSize: 12, marginBottom: 2, maxWidth: 90 },
  podXp: { color: 'rgba(242,238,255,0.7)', fontSize: 10, marginBottom: 6 },
  podBar: {
    width: '90%',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  podRank: { color: '#fff', fontWeight: '900', fontSize: 22 },
  youRow: { flexDirection: 'row', alignItems: 'center' },
  rankPill: {
    backgroundColor: 'rgba(124,92,255,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#A992FF',
  },
  rankNum: { color: '#A992FF', fontWeight: '800', fontSize: 14 },
  youLabel: { color: 'rgba(242,238,255,0.6)', fontSize: 11 },
  youName: { color: '#F2EEFF', fontWeight: '800', fontSize: 15 },
  xpVal: { color: '#FACC15', fontWeight: '800', fontSize: 18 },
  xpUnit: { color: 'rgba(242,238,255,0.6)', fontSize: 10 },
  section: {
    color: '#F2EEFF',
    fontWeight: '800',
    fontSize: 14,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  rankIdx: { color: 'rgba(242,238,255,0.6)', fontWeight: '800', fontSize: 13, width: 36 },
  rankName: { color: 'rgba(242,238,255,0.9)', fontWeight: '600', fontSize: 14, flex: 1 },
  rankXp: { color: '#A992FF', fontWeight: '800', fontSize: 13 },
  dim: { color: 'rgba(242,238,255,0.6)', textAlign: 'center', paddingVertical: spacing.lg },
});
