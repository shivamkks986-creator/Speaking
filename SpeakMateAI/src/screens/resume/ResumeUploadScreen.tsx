// Resume Upload + AI Parsing + Personalised Interview Q Generation
// Flow: pick PDF (expo-document-picker) → upload → parsed summary card →
// "Generate Questions" → 8-10 personalised questions → "Start Mock Interview"
// launches ResumeInterview screen which feeds Qs into the existing LiveInterview flow.
import React, { useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { RootStackParamList } from '@/navigation/types';
import { aiService, QuotaExceededError } from '@/services/aiService';
import { ParsedResume, ResumeInterviewQuestionSet } from '@/types';
import { radius, spacing } from '@/config/theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const MAX_MB = 5;

export default function ResumeUploadScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  const [parsing, setParsing] = useState(false);
  const [generatingQs, setGeneratingQs] = useState(false);
  const [resume, setResume] = useState<ParsedResume | null>(null);
  const [questionSet, setQuestionSet] = useState<ResumeInterviewQuestionSet | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pickAndUpload = useCallback(async () => {
    setError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      if (asset.size && asset.size > MAX_MB * 1024 * 1024) {
        setError(`File too large. Max ${MAX_MB} MB.`);
        return;
      }
      setParsing(true); setQuestionSet(null); setResume(null);
      const parsed = await aiService.parseResume({
        uri: asset.uri,
        name: asset.name || 'resume.pdf',
        mimeType: asset.mimeType || 'application/pdf',
      });
      setResume(parsed);
    } catch (e) {
      if (e instanceof QuotaExceededError) {
        setError(`Daily free limit reached (${e.used}/${e.limit}). Upgrade for unlimited.`);
      } else {
        setError(e instanceof Error ? e.message : 'Could not parse resume');
      }
    } finally {
      setParsing(false);
    }
  }, []);

  const generateQuestions = useCallback(async () => {
    if (!resume) return;
    setError(null); setGeneratingQs(true);
    try {
      const qs = await aiService.resumeInterviewQuestions(resume, resume.role_target || undefined);
      setQuestionSet(qs);
    } catch (e) {
      if (e instanceof QuotaExceededError) {
        setError(`Daily free limit reached (${e.used}/${e.limit}). Upgrade for unlimited.`);
      } else {
        setError(e instanceof Error ? e.message : 'Could not generate questions');
      }
    } finally {
      setGeneratingQs(false);
    }
  }, [resume]);

  const startInterview = useCallback(() => {
    if (!questionSet) return;
    navigation.navigate('ResumeInterview', {
      questions: questionSet.questions,
      targetRole: questionSet.target_role,
      focusAreas: questionSet.focus_areas,
    });
  }, [questionSet, navigation]);

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0418' }}>
      <LinearGradient colors={['#1F0E3D', '#0A0418', '#150828']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn} testID="resume-back-btn">
              <Ionicons name="chevron-back" size={20} color="#F2EEFF" />
            </Pressable>
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={styles.title}>Resume → Custom Interview</Text>
              <Text style={styles.subtitle}>AI parses your PDF · generates personalised questions</Text>
            </View>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="warning" size={14} color="#FCA5A5" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Upload card */}
          <Pressable
            onPress={pickAndUpload}
            disabled={parsing}
            style={[styles.uploadCard, parsing && { opacity: 0.7 }]}
            testID="resume-upload-btn"
          >
            <LinearGradient
              colors={resume ? ['#34D399', '#22D3EE'] : ['#7C5CFF', '#A992FF']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.uploadInner}
            >
              {parsing ? (
                <>
                  <ActivityIndicator color="#FFFFFF" size="large" />
                  <Text style={styles.uploadTitle}>Parsing your resume…</Text>
                  <Text style={styles.uploadSub}>Extracting skills, projects & experience</Text>
                </>
              ) : resume ? (
                <>
                  <Ionicons name="checkmark-circle" size={36} color="#FFFFFF" />
                  <Text style={styles.uploadTitle}>Resume parsed ✓</Text>
                  <Text style={styles.uploadSub}>Tap to upload a different one</Text>
                </>
              ) : (
                <>
                  <Ionicons name="cloud-upload" size={36} color="#FFFFFF" />
                  <Text style={styles.uploadTitle}>Upload your resume (PDF)</Text>
                  <Text style={styles.uploadSub}>Max {MAX_MB} MB · text-based PDFs work best</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>

          {/* Parsed resume summary */}
          {resume && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Parsed Profile</Text>
              <View style={styles.profileCard}>
                {!!resume.name && <Text style={styles.profileName}>{resume.name}</Text>}
                {!!resume.role_target && <Text style={styles.profileRole}>{resume.role_target}</Text>}
                {!!resume.summary && <Text style={styles.profileSummary}>{resume.summary}</Text>}
                <View style={styles.statsRow}>
                  <Stat icon="ribbon" color="#FACC15" label="Years exp" value={`${resume.years_of_experience}`} />
                  <Stat icon="briefcase" color="#7C5CFF" label="Experiences" value={`${resume.experience.length}`} />
                  <Stat icon="construct" color="#22D3EE" label="Projects" value={`${resume.projects.length}`} />
                </View>
              </View>

              {resume.skills.length > 0 && (
                <>
                  <Text style={styles.label}>Skills ({resume.skills.length})</Text>
                  <View style={styles.skillsRow}>
                    {resume.skills.slice(0, 20).map((s) => (
                      <View key={s} style={styles.skillChip}><Text style={styles.skillChipText}>{s}</Text></View>
                    ))}
                  </View>
                </>
              )}

              {resume.experience.length > 0 && (
                <>
                  <Text style={styles.label}>Experience</Text>
                  {resume.experience.map((e, i) => (
                    <View key={i} style={styles.expCard}>
                      <Text style={styles.expTitle}>{e.title}{e.company ? ` · ${e.company}` : ''}</Text>
                      {!!e.duration && <Text style={styles.expMeta}>{e.duration}</Text>}
                      {e.highlights.slice(0, 3).map((h, j) => (
                        <View key={j} style={{ flexDirection: 'row', marginTop: 3 }}>
                          <Text style={{ color: '#A992FF', marginRight: 6 }}>•</Text>
                          <Text style={styles.expHighlight}>{h}</Text>
                        </View>
                      ))}
                    </View>
                  ))}
                </>
              )}

              {/* Generate Qs CTA */}
              {!questionSet ? (
                <Pressable
                  onPress={generateQuestions}
                  disabled={generatingQs}
                  style={[styles.generateBtn, generatingQs && { opacity: 0.6 }]}
                  testID="resume-generate-qs-btn"
                >
                  <LinearGradient colors={['#FACC15', '#FF6B9D']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.generateInner}>
                    {generatingQs ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="sparkles" size={18} color="#FFFFFF" />
                        <Text style={styles.generateText}>Generate personalised questions</Text>
                      </>
                    )}
                  </LinearGradient>
                </Pressable>
              ) : null}
            </View>
          )}

          {/* Generated questions */}
          {questionSet && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your custom interview ({questionSet.questions.length} questions)</Text>
              <Text style={styles.qsTarget}>🎯 Target: {questionSet.target_role}</Text>

              {questionSet.focus_areas.length > 0 && (
                <View style={[styles.focusCard, { backgroundColor: 'rgba(250,204,21,0.1)', borderColor: 'rgba(250,204,21,0.3)' }]}>
                  <Text style={[styles.focusTitle, { color: '#FACC15' }]}>📚 Brush up before the interview</Text>
                  {questionSet.focus_areas.map((f, i) => (
                    <View key={i} style={{ flexDirection: 'row', marginTop: 4 }}>
                      <Text style={{ color: '#FACC15', marginRight: 6 }}>•</Text>
                      <Text style={styles.focusBody}>{f}</Text>
                    </View>
                  ))}
                </View>
              )}

              {questionSet.questions.map((q, i) => (
                <View key={i} style={styles.qCard}>
                  <View style={styles.qHead}>
                    <View style={[styles.qBadge, badgeColor(q.category)]}>
                      <Text style={styles.qBadgeText}>{q.category.toUpperCase()}</Text>
                    </View>
                    <View style={[styles.qBadge, diffColor(q.difficulty)]}>
                      <Text style={styles.qBadgeText}>{q.difficulty.toUpperCase()}</Text>
                    </View>
                  </View>
                  <Text style={styles.qText}>{i + 1}. {q.question}</Text>
                  {!!q.rationale && <Text style={styles.qRationale}>💡 {q.rationale}</Text>}
                </View>
              ))}

              {/* Start interview CTA */}
              <Pressable onPress={startInterview} style={styles.startBtn} testID="resume-start-interview-btn">
                <LinearGradient colors={['#7C5CFF', '#22D3EE']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.startInner}>
                  <Ionicons name="mic" size={18} color="#FFFFFF" />
                  <Text style={styles.startText}>Start Voice Mock Interview</Text>
                </LinearGradient>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Stat({ icon, color, label, value }: { icon: keyof typeof Ionicons.glyphMap; color: string; label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={16} color={color} />
      <View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );
}

function badgeColor(category: string) {
  switch (category) {
    case 'project':    return { backgroundColor: 'rgba(124,92,255,0.2)', borderColor: 'rgba(124,92,255,0.5)' };
    case 'technical':  return { backgroundColor: 'rgba(34,211,238,0.2)', borderColor: 'rgba(34,211,238,0.5)' };
    case 'hr':         return { backgroundColor: 'rgba(52,211,153,0.2)', borderColor: 'rgba(52,211,153,0.5)' };
    case 'situational':return { backgroundColor: 'rgba(250,204,21,0.2)', borderColor: 'rgba(250,204,21,0.5)' };
    case 'gap':        return { backgroundColor: 'rgba(255,123,107,0.2)', borderColor: 'rgba(255,123,107,0.5)' };
    default:           return { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.2)' };
  }
}

function diffColor(diff: string) {
  switch (diff) {
    case 'easy':   return { backgroundColor: 'rgba(52,211,153,0.2)', borderColor: 'rgba(52,211,153,0.5)' };
    case 'medium': return { backgroundColor: 'rgba(250,204,21,0.2)', borderColor: 'rgba(250,204,21,0.5)' };
    case 'hard':   return { backgroundColor: 'rgba(255,107,157,0.2)', borderColor: 'rgba(255,107,157,0.5)' };
    default:       return { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.2)' };
  }
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md },
  iconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#F2EEFF', fontSize: 18, fontWeight: '800', marginBottom: 4 },
  subtitle: { color: '#A992FF', fontSize: 12, fontWeight: '700', marginTop: 4, lineHeight: 16 },

  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: spacing.lg, marginTop: spacing.sm, padding: spacing.sm, borderRadius: radius.md, backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  errorText: { color: '#FCA5A5', fontSize: 12, flex: 1 },

  uploadCard: { marginHorizontal: spacing.lg, marginTop: spacing.xl, borderRadius: radius.xl, overflow: 'hidden' },
  uploadInner: { alignItems: 'center', padding: spacing.xl, gap: 8 },
  uploadTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', marginTop: 4 },
  uploadSub: { color: 'rgba(255,255,255,0.85)', fontSize: 11, textAlign: 'center' },

  section: { paddingHorizontal: spacing.lg, marginTop: spacing.xl },
  sectionTitle: { color: '#F2EEFF', fontSize: 15, fontWeight: '800', marginBottom: spacing.md },

  profileCard: { padding: spacing.md, borderRadius: radius.lg, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  profileName: { color: '#F2EEFF', fontSize: 18, fontWeight: '800' },
  profileRole: { color: '#A992FF', fontSize: 13, fontWeight: '700', marginTop: 2 },
  profileSummary: { color: 'rgba(242,238,255,0.75)', fontSize: 12, marginTop: 8, lineHeight: 17 },
  statsRow: { flexDirection: 'row', marginTop: spacing.md, gap: spacing.sm },
  stat: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.04)', paddingHorizontal: 10, paddingVertical: 8, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  statValue: { color: '#F2EEFF', fontSize: 14, fontWeight: '800' },
  statLabel: { color: 'rgba(242,238,255,0.55)', fontSize: 9, fontWeight: '700' },

  label: { color: 'rgba(242,238,255,0.7)', fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginTop: spacing.lg, marginBottom: spacing.sm },
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  skillChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: 'rgba(124,92,255,0.15)', borderWidth: 1, borderColor: 'rgba(124,92,255,0.3)' },
  skillChipText: { color: '#A992FF', fontSize: 11, fontWeight: '700' },

  expCard: { padding: spacing.sm, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 8 },
  expTitle: { color: '#F2EEFF', fontSize: 13, fontWeight: '800' },
  expMeta: { color: 'rgba(242,238,255,0.55)', fontSize: 10, marginTop: 2 },
  expHighlight: { color: 'rgba(242,238,255,0.85)', fontSize: 12, lineHeight: 16, flex: 1 },

  generateBtn: { marginTop: spacing.lg, borderRadius: radius.pill, overflow: 'hidden' },
  generateInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  generateText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },

  qsTarget: { color: '#A992FF', fontSize: 12, fontWeight: '700', marginBottom: spacing.sm },
  focusCard: { padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.md },
  focusTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },
  focusBody: { color: '#F2EEFF', fontSize: 12, lineHeight: 17, flex: 1 },

  qCard: { padding: spacing.md, borderRadius: radius.lg, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginBottom: spacing.sm },
  qHead: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  qBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill, borderWidth: 1 },
  qBadgeText: { color: '#F2EEFF', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  qText: { color: '#F2EEFF', fontSize: 13, fontWeight: '700', lineHeight: 18 },
  qRationale: { color: 'rgba(169,146,255,0.85)', fontSize: 11, marginTop: 6, fontStyle: 'italic', lineHeight: 15 },

  startBtn: { marginTop: spacing.lg, borderRadius: radius.pill, overflow: 'hidden' },
  startInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  startText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
});
