import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Defs, RadialGradient, Stop, Ellipse, Path } from 'react-native-svg';
import { colors as C, typography, spacing, radii, shadows, cardStyle } from '../../lib/theme';
import { useWebLink } from '../../hooks/useWebLink';
import { supabase } from '../../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Assistant {
  id: string;
  name: string;
  voice_id?: string | null;
  created_at: string;
  is_active?: boolean;
}

// ─── Empty / illustration ─────────────────────────────────────────────────────

function AssistantIllustration() {
  return (
    <Svg width={100} height={80} viewBox="0 0 100 80" fill="none">
      <Defs>
        <RadialGradient id="ag1" cx="40%" cy="40%" rx="60%" ry="60%">
          <Stop offset="0" stopColor="#00d4aa" stopOpacity="0.25" />
          <Stop offset="1" stopColor="#00d4aa" stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="ag2" cx="70%" cy="70%" rx="50%" ry="50%">
          <Stop offset="0" stopColor="#0099ff" stopOpacity="0.20" />
          <Stop offset="1" stopColor="#0099ff" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Ellipse cx="40" cy="40" rx="50" ry="45" fill="url(#ag1)" />
      <Ellipse cx="70" cy="55" rx="35" ry="30" fill="url(#ag2)" />
      {/* Chip outline */}
      <Path
        d="M30 20 h40 a6 6 0 0 1 6 6 v28 a6 6 0 0 1 -6 6 H30 a6 6 0 0 1 -6 -6 V26 a6 6 0 0 1 6 -6z"
        stroke="#00d4aa"
        strokeWidth="1.5"
        strokeOpacity="0.6"
        fill="none"
      />
      {/* Pin connectors */}
      {[28, 38, 48, 58].map((y, i) => (
        <React.Fragment key={i}>
          <Path d={`M24 ${y} h-6`} stroke="#00d4aa" strokeWidth="1.2" strokeOpacity="0.4" />
          <Path d={`M76 ${y} h6`} stroke="#0099ff" strokeWidth="1.2" strokeOpacity="0.4" />
        </React.Fragment>
      ))}
      {/* Inner grid */}
      <Path d="M38 30 h24 M38 40 h24 M38 50 h24" stroke="#00d4aa" strokeWidth="0.8" strokeOpacity="0.3" />
    </Svg>
  );
}

// ─── Assistant row card ────────────────────────────────────────────────────────

function AssistantCard({ assistant }: { assistant: Assistant }) {
  const isActive = assistant.is_active !== false;
  return (
    <View style={as.card}>
      <LinearGradient
        colors={isActive ? [C.primary + '20', C.primary + '08'] : [C.surface, C.surface]}
        style={as.cardIcon}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons name="hardware-chip-outline" size={18} color={isActive ? C.primary : C.textFaint} />
      </LinearGradient>
      <View style={{ flex: 1 }}>
        <Text style={as.cardName} numberOfLines={1}>{assistant.name}</Text>
        <Text style={as.cardSub}>
          {isActive ? 'Active' : 'Inactive'}
          {'  ·  '}
          {new Date(assistant.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </Text>
      </View>
      <View style={[as.statusDot, { backgroundColor: isActive ? C.success : C.textFaint }]} />
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AssistantIndexScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { openLink } = useWebLink();

  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAssistants();
  }, []);

  const loadAssistants = async () => {
    try {
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error: fetchErr } = await supabase
        .from('assistants')
        .select('id, name, voice_id, created_at, is_active')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (fetchErr) throw fetchErr;
      setAssistants(data ?? []);
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message : null) || 'Failed to load assistants');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={as.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={[as.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={as.backBtn}>
          <Ionicons name="arrow-back" size={20} color={C.textSecondary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={as.title}>AI Assistants</Text>
          <Text style={as.subtitle}>Manage your voice agents</Text>
        </View>
      </View>

      {/* ── Hero CTA ── */}
      <View style={as.heroCard}>
        <View style={as.heroIllustration}>
          <AssistantIllustration />
        </View>
        <Text style={as.heroHeading}>Manage on the web</Text>
        <Text style={as.heroBody}>
          Build, configure, and test your AI assistants at{' '}
          <Text style={{ color: C.primary }}>app.voicory.com</Text>
        </Text>

        <TouchableOpacity
          onPress={() => openLink('createAssistant')}
          activeOpacity={0.85}
          style={{ width: '100%' }}
        >
          <LinearGradient
            colors={[C.primary, C.primaryDark]}
            style={as.primaryBtn}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="add-circle-outline" size={18} color="#000" style={{ marginRight: 8 }} />
            <Text style={as.primaryBtnText}>Create Assistant</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => openLink('assistants')}
          activeOpacity={0.8}
          style={as.secondaryBtn}
        >
          <Ionicons name="globe-outline" size={16} color={C.primary} style={{ marginRight: 8 }} />
          <Text style={as.secondaryBtnText}>Open Web Dashboard</Text>
        </TouchableOpacity>
      </View>

      {/* ── Read-only list ── */}
      <View style={as.listSection}>
        <Text style={as.sectionLabel}>YOUR ASSISTANTS</Text>

        {loading ? (
          <View style={as.loadingWrap}>
            <ActivityIndicator size="small" color={C.primary} />
          </View>
        ) : error ? (
          <View style={as.errorBox}>
            <Ionicons name="alert-circle-outline" size={15} color={C.danger} />
            <Text style={as.errorText}>{error}</Text>
            <TouchableOpacity onPress={loadAssistants}>
              <Text style={as.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : assistants.length === 0 ? (
          <View style={as.emptyBox}>
            <Ionicons name="hardware-chip-outline" size={28} color={C.textFaint} />
            <Text style={as.emptyTitle}>No assistants yet</Text>
            <Text style={as.emptyBody}>Create your first AI voice assistant on the web.</Text>
          </View>
        ) : (
          <View style={as.listCard}>
            {assistants.map((a, i) => (
              <React.Fragment key={a.id}>
                <AssistantCard assistant={a} />
                {i < assistants.length - 1 && <View style={as.sep} />}
              </React.Fragment>
            ))}
          </View>
        )}
      </View>

      {/* ── Info note ── */}
      <View style={as.infoNote}>
        <Ionicons name="information-circle-outline" size={14} color={C.textFaint} />
        <Text style={as.infoText}>
          Your mobile and web accounts are linked — the same login works on both.
          Full assistant editing is available on the web dashboard.
        </Text>
      </View>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const as = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.xl,
    paddingBottom: 20,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...typography.h2, color: C.text },
  subtitle: { ...typography.caption, color: C.textMuted, marginTop: 2 },

  // Hero
  heroCard: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.xxl,
    ...cardStyle,
    padding: 24,
    alignItems: 'center',
  },
  heroIllustration: {
    marginBottom: spacing.lg,
  },
  heroHeading: { ...typography.h3, color: C.text, textAlign: 'center', marginBottom: 8 },
  heroBody: {
    ...typography.body,
    color: C.textMuted,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 21,
  },
  primaryBtn: {
    height: 48,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: 10,
    width: '100%',
  },
  primaryBtnText: { ...typography.button, color: '#000' },
  secondaryBtn: {
    height: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: C.primary + '40',
    backgroundColor: C.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    width: '100%',
  },
  secondaryBtnText: { ...typography.buttonSm, color: C.primary },

  // List
  listSection: { marginHorizontal: spacing.xl, marginBottom: spacing.xxl },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: C.textFaint,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  listCard: {
    ...cardStyle,
    overflow: 'hidden',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: spacing.lg,
    gap: 12,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardName: { ...typography.bodySm, color: C.text },
  cardSub: { ...typography.captionSm, color: C.textMuted, marginTop: 2 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  sep: { height: 1, backgroundColor: C.borderLight, marginLeft: 60 },

  // States
  loadingWrap: { padding: 32, alignItems: 'center' },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    backgroundColor: C.danger + '12',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: C.danger + '25',
  },
  errorText: { flex: 1, ...typography.caption, color: C.danger },
  retryText: { ...typography.caption, color: C.danger, fontWeight: '700' },
  emptyBox: {
    padding: 36,
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: C.border,
    gap: 8,
  },
  emptyTitle: { ...typography.bodySm, color: C.text, fontWeight: '700' },
  emptyBody: { ...typography.caption, color: C.textMuted, textAlign: 'center' },

  // Info note
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginHorizontal: spacing.xl,
    padding: 12,
    backgroundColor: C.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: C.borderLight,
  },
  infoText: { flex: 1, ...typography.captionSm, color: C.textFaint, lineHeight: 16 },
});
