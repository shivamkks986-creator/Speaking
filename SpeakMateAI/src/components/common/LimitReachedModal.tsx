// LimitReachedModal — shown when a free user hits an endpoint's daily limit.
// Offers two paths: (1) upgrade to Premium, (2) watch a rewarded ad for +N
// bonus calls (Phase 2: real rewarded ad; Phase 1: instant simulated grant).
import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { billingService } from '@/services/billingService';
import { showRewarded, isRewardedReady, preloadRewarded, adsAvailable } from '@/services/adsService';

interface Props {
  visible: boolean;
  endpoint: string;
  onClose: () => void;
  /** Called after a rewarded ad successfully grants bonus quota. */
  onBonusGranted?: (bonus: number) => void;
}

export default function LimitReachedModal({ visible, endpoint, onClose, onBonusGranted }: Props) {
  const nav = useNavigation<any>();
  const [claiming, setClaiming] = useState(false);

  const onWatchAd = async () => {
    setClaiming(true);

    // 1. Show real rewarded ad. In Expo Go (no native module) this
    //    resolves true immediately so the dev flow keeps working.
    if (adsAvailable() && !isRewardedReady()) {
      preloadRewarded();
      setClaiming(false);
      Alert.alert('Ad not ready', 'Please wait a few seconds and try again.');
      return;
    }
    const earned = await showRewarded(endpoint);
    if (!earned) {
      setClaiming(false);
      Alert.alert('Reward not earned', 'Please watch the full ad to unlock bonus practice.');
      return;
    }

    // 2. Only after Google confirmed reward → hit backend to grant quota.
    const res = await billingService.claimRewardedAd(endpoint);
    setClaiming(false);
    if (res.ok && res.bonus_granted) {
      onBonusGranted?.(res.bonus_granted);
      Alert.alert('Bonus unlocked ✨', `You have +${res.bonus_granted} more practice calls today.`);
      onClose();
    } else if (res.reason === 'cooldown') {
      Alert.alert('Wait a moment', `Please wait ${res.wait_seconds || 60}s before watching another ad.`);
    } else if (res.reason === 'daily_cap_reached') {
      Alert.alert('Daily bonus cap reached', 'Upgrade to Premium for unlimited practice.');
    } else {
      Alert.alert('Try again', res.reason || 'Ad could not complete.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.iconWrap}>
            <Ionicons name="lock-closed" size={30} color="#FACC15" />
          </View>
          <Text style={styles.title}>Daily limit reached</Text>
          <Text style={styles.body}>
            You've used all your free practice for this feature today. Come back tomorrow, watch an ad for bonus practice, or unlock Premium.
          </Text>

          <Pressable onPress={onWatchAd} disabled={claiming} testID="limit-watch-ad-btn">
            <View style={styles.adBtn}>
              {claiming ? <ActivityIndicator color="#FACC15" /> : (
                <>
                  <Ionicons name="play-circle" size={20} color="#FACC15" />
                  <Text style={styles.adBtnText}>Watch an ad for bonus practice</Text>
                </>
              )}
            </View>
          </Pressable>

          <Pressable onPress={() => { onClose(); nav.navigate('Premium'); }} testID="limit-upgrade-btn">
            <LinearGradient
              colors={['#FACC15', '#FF6B9D', '#7C5CFF']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.upgradeBtn}
            >
              <Ionicons name="diamond" size={16} color="#FFFFFF" />
              <Text style={styles.upgradeBtnText}>Upgrade to Premium</Text>
            </LinearGradient>
          </Pressable>

          <Pressable onPress={onClose} style={styles.closeLink} testID="limit-close-btn">
            <Text style={styles.closeText}>Maybe later</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(10,4,24,0.8)', justifyContent: 'center', padding: 24 },
  sheet: { backgroundColor: '#150828', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  iconWrap: { alignSelf: 'center', width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(250,204,21,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { color: '#F2EEFF', fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  body: { color: 'rgba(242,238,255,0.7)', fontSize: 13, lineHeight: 19, textAlign: 'center', marginBottom: 20 },
  adBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(250,204,21,0.12)', borderWidth: 1, borderColor: 'rgba(250,204,21,0.35)', paddingVertical: 14, borderRadius: 999, marginBottom: 10 },
  adBtnText: { color: '#FACC15', fontWeight: '700', fontSize: 14 },
  upgradeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 999 },
  upgradeBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  closeLink: { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
  closeText: { color: 'rgba(242,238,255,0.5)', fontSize: 13 },
});
