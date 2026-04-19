import { colors as C } from '../lib/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as haptics from '../lib/haptics';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  Animated,
  Share,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBadge } from '../components/StatusBadge';
import { SkeletonCard, SkeletonListItem } from '../components/Skeleton';
import { getCallById, getCallTranscript } from '../services/callService';
import { CallLog } from '../types';

const USD_TO_INR = 84;

function formatDuration(seconds: number): string {
  if (!seconds) return '0s';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatDurationParts(seconds: number): { value: string; label: string }[] {
  if (!seconds) return [{ value: '0', label: 'sec' }];
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 0) {
    return [
      { value: String(m), label: 'min' },
      { value: String(s).padStart(2, '0'), label: 'sec' },
    ];
  }
  return [{ value: String(s), label: 'sec' }];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Animated Wave SVG ───────────────────────────────────────────────────────

function AnimatedWave() {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(anim, {
        toValue: 1,
        duration: 3200,
        useNativeDriver: true,
      })
    ).start();
  }, [anim]);

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -120],
  });

  return (
    <Animated.View
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, transform: [{ translateX }] }}
      pointerEvents="none"
    >
      {/* Repeating wave lines — pure View-based approximation */}
      {[0, 1, 2, 3, 4].map((i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            top: 20 + i * 28,
            left: -40,
            right: -40,
            height: 1.5,
            borderRadius: 1,
            backgroundColor: 'rgba(0,212,170,0.08)',
            transform: [{ scaleX: 1.4 }],
          }}
        />
      ))}
      {/* Dots grid */}
      {[0, 1, 2, 3, 4, 5, 6].map((col) =>
        [0, 1, 2, 3].map((row) => (
          <View
            key={`${col}-${row}`}
            style={{
              position: 'absolute',
              top: 8 + row * 38,
              left: 10 + col * 48,
              width: 3,
              height: 3,
              borderRadius: 1.5,
              backgroundColor: 'rgba(0,212,170,0.12)',
            }}
          />
        ))
      )}
    </Animated.View>
  );
}

// ─── Chat Bubble ─────────────────────────────────────────────────────────────

interface TranscriptEntry {
  speaker?: string;
  role?: string;
  text?: string;
  message?: string;
  timestamp_ms?: number;
}

function ChatBubble({ entry, index }: { entry: TranscriptEntry; index: number }) {
  const speaker = entry.speaker || entry.role || (index % 2 === 0 ? 'AI' : 'User');
  const isAI = speaker.toLowerCase() === 'ai' || speaker.toLowerCase() === 'assistant' || speaker.toLowerCase() === 'bot';
  const text = entry.text || entry.message || '';

  return (
    <View style={[bubbleStyles.row, isAI ? bubbleStyles.rowAI : bubbleStyles.rowUser]}>
      {isAI && (
        <View style={bubbleStyles.avatar}>
          <Ionicons name="hardware-chip" size={13} color={C.primary} />
        </View>
      )}
      <View style={[bubbleStyles.bubble, isAI ? bubbleStyles.bubbleAI : bubbleStyles.bubbleUser]}>
        <Text style={[bubbleStyles.speakerLabel, { color: isAI ? C.primary : C.secondary }]}>
          {isAI ? 'AI Assistant' : 'Customer'}
        </Text>
        <Text style={bubbleStyles.text}>{text}</Text>
        {entry.timestamp_ms !== undefined && (
          <Text style={bubbleStyles.time}>
            {Math.floor(entry.timestamp_ms / 1000)}s
          </Text>
        )}
      </View>
      {!isAI && (
        <View style={[bubbleStyles.avatar, bubbleStyles.avatarUser]}>
          <Ionicons name="person" size={13} color={C.secondary} />
        </View>
      )}
    </View>
  );
}

const bubbleStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
    gap: 8,
  },
  rowAI: { paddingRight: 48 },
  rowUser: { paddingLeft: 48, justifyContent: 'flex-end' },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.primaryMuted,
    borderWidth: 1,
    borderColor: C.primary + '40',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarUser: {
    backgroundColor: C.secondaryMuted,
    borderColor: C.secondary + '40',
  },
  bubble: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
  },
  bubbleAI: {
    backgroundColor: C.primaryMuted,
    borderWidth: 1,
    borderColor: C.primary + '20',
    borderBottomLeftRadius: 4,
  },
  bubbleUser: {
    backgroundColor: C.secondaryMuted,
    borderWidth: 1,
    borderColor: C.secondary + '20',
    borderBottomRightRadius: 4,
  },
  speakerLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  text: {
    color: C.text,
    fontSize: 14,
    lineHeight: 20,
  },
  time: {
    color: C.textMuted,
    fontSize: 10,
    marginTop: 4,
    textAlign: 'right',
  },
});

// ─── Mock Waveform Player ─────────────────────────────────────────────────────

function WaveformPlayer({ url }: { url: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isPlaying) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.12, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    }
  }, [isPlaying, pulseAnim]);

  const handlePlay = async () => {
    haptics.lightTap();
    if (!isPlaying) {
      setIsPlaying(true);
      try {
        await Linking.openURL(url);
      } catch {
        Alert.alert('Error', 'Cannot open recording');
      }
      // Reset state after opening external player
      setTimeout(() => setIsPlaying(false), 1000);
    } else {
      setIsPlaying(false);
    }
  };

  // Generate mock waveform bars
  const bars = [0.3, 0.6, 0.9, 0.5, 0.8, 0.4, 0.7, 1.0, 0.6, 0.3, 0.8, 0.5, 0.9, 0.4, 0.7, 0.6, 0.3, 0.8, 0.5, 0.9, 0.4, 0.6, 0.3, 0.7, 0.5, 0.8, 0.4, 1.0, 0.6, 0.3];

  return (
    <View style={waveStyles.container}>
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <TouchableOpacity onPress={handlePlay} style={waveStyles.playBtn} activeOpacity={0.8}>
          <LinearGradient
            colors={[C.primary, C.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={waveStyles.playBtnGrad}
          >
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={20} color={C.bg} />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
      <View style={waveStyles.waveform}>
        {bars.map((h, i) => (
          <View
            key={i}
            style={[
              waveStyles.bar,
              {
                height: 4 + h * 32,
                backgroundColor: isPlaying
                  ? i < bars.length * 0.4
                    ? C.primary
                    : C.primary + '40'
                  : C.primary + '40',
              },
            ]}
          />
        ))}
      </View>
      <Text style={waveStyles.label}>{isPlaying ? 'Playing…' : 'Tap to play'}</Text>
    </View>
  );
}

const waveStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  playBtn: { borderRadius: 24 },
  playBtnGrad: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveform: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 40,
  },
  bar: {
    flex: 1,
    borderRadius: 2,
  },
  label: {
    color: C.textMuted,
    fontSize: 11,
    fontWeight: '600',
    minWidth: 60,
    textAlign: 'right',
  },
});

// ─── Collapsible Section ──────────────────────────────────────────────────────

function CollapsibleSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const toggle = () => {
    haptics.lightTap();
    const toValue = open ? 0 : 1;
    Animated.timing(rotateAnim, { toValue, duration: 200, useNativeDriver: true }).start();
    setOpen(!open);
  };

  const rotate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] });

  return (
    <View style={colStyles.container}>
      <TouchableOpacity onPress={toggle} style={colStyles.header} activeOpacity={0.7}>
        <Text style={colStyles.title}>{title}</Text>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
        </Animated.View>
      </TouchableOpacity>
      {open && <View style={colStyles.body}>{children}</View>}
    </View>
  );
}

const colStyles = StyleSheet.create({
  container: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    marginHorizontal: 20,
    marginBottom: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  title: { color: C.textSecondary, fontSize: 13, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  body: { paddingHorizontal: 16, paddingBottom: 16 },
});

// ─── Metadata Row ─────────────────────────────────────────────────────────────

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={metaStyles.row}>
      <Text style={metaStyles.label}>{label}</Text>
      <Text style={metaStyles.value} numberOfLines={1} selectable>{value}</Text>
    </View>
  );
}

const metaStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  label: { color: C.textMuted, fontSize: 12, fontWeight: '600', letterSpacing: 0.3, flex: 1 },
  value: { color: C.textSecondary, fontSize: 12, flex: 2, textAlign: 'right' },
});

// ─── Action Button ────────────────────────────────────────────────────────────

function ActionButton({
  icon,
  label,
  onPress,
  variant = 'default',
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  variant?: 'default' | 'primary' | 'danger';
}) {
  const bg = variant === 'primary' ? C.primaryMuted : variant === 'danger' ? C.dangerMuted : C.surfaceRaised;
  const fg = variant === 'primary' ? C.primary : variant === 'danger' ? C.danger : C.text;
  return (
    <TouchableOpacity onPress={onPress} style={[actionStyles.btn, { backgroundColor: bg }]} activeOpacity={0.75}>
      <Ionicons name={icon} size={20} color={fg} />
      <Text style={[actionStyles.label, { color: fg }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const actionStyles = StyleSheet.create({
  btn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CallDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [call, setCall] = useState<CallLog | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slowLoad, setSlowLoad] = useState(false);
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const [callData, transcriptData] = await Promise.all([
        getCallById(id),
        getCallTranscript(id),
      ]);
      setCall(callData);
      setTranscript(transcriptData);
      setError(null);
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load call';
      setError(message);
    }
  }, [id, fadeAnim]);

  useEffect(() => {
    setLoading(true);
    setSlowLoad(false);
    slowTimerRef.current = setTimeout(() => setSlowLoad(true), 10000);
    loadData().finally(() => {
      setLoading(false);
      setSlowLoad(false);
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    });
    return () => {
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    };
  }, [loadData]);

  const handleCallAgain = () => {
    if (!call) return;
    haptics.mediumTap();
    const tel = `tel:${call.phone_number}`;
    Linking.openURL(tel).catch(() => Alert.alert('Error', 'Cannot initiate call'));
  };

  const handleShareTranscript = async () => {
    if (!call) return;
    haptics.lightTap();
    const lines = transcript.map((e) => {
      const speaker = e.speaker || e.role || 'Unknown';
      const text = e.text || e.message || '';
      return `${speaker}: ${text}`;
    });
    const content = [
      `Call with ${call.phone_number}`,
      `Date: ${formatDate(call.created_at)}`,
      `Duration: ${formatDuration(call.duration_seconds ?? 0)}`,
      `Status: ${call.status}`,
      '',
      '--- Transcript ---',
      ...lines,
    ].join('\n');
    try {
      await Share.share({ message: content, title: `Call transcript – ${call.phone_number}` });
    } catch {
      // user cancelled
    }
  };

  const handleViewCustomer = () => {
    if (!call) return;
    haptics.lightTap();
    // Navigate to customer screen if available — fallback to phone search
    Linking.openURL(`tel:${call.phone_number}`).catch(() => {});
  };

  if (loading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top + 24, justifyContent: 'flex-start' }]}>
        <SkeletonCard style={{ marginHorizontal: 20, marginBottom: 16 }} />
        <SkeletonCard style={{ marginHorizontal: 20, marginBottom: 16 }} />
        {Array.from({ length: 3 }).map((_, i) => <SkeletonListItem key={i} />)}
        {slowLoad && (
          <View style={styles.slowLoadBanner}>
            <Ionicons name="time-outline" size={15} color={C.textMuted} />
            <Text style={styles.slowLoadText}>Taking longer than usual…</Text>
          </View>
        )}
      </View>
    );
  }

  if (error || !call) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <View style={styles.errorIcon}>
          <Ionicons name="warning-outline" size={32} color={C.danger} />
        </View>
        <Text style={styles.errorTitle}>Couldn't load call</Text>
        <Text style={styles.errorText}>{error || 'Call not found'}</Text>
        <TouchableOpacity onPress={loadData} style={styles.retryBtn}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={styles.errorBackBtn}>
          <Text style={styles.errorBackBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const costInr = (call.cost || 0) * USD_TO_INR;
  const breakdown = call.metadata?.cost_breakdown;
  const durationParts = formatDurationParts(call.duration_seconds ?? 0);
  const isInbound = call.direction === 'inbound';
  const heroGradient: [string, string, string] = isInbound
    ? ['#0c1d2f', '#0a1e1a', '#0c1219']
    : ['#1a0f2e', '#0a1e1a', '#0c1219'];

  return (
    <Animated.View style={[styles.root, { opacity: fadeAnim }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero Card ── */}
        <LinearGradient
          colors={heroGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.heroCard, { paddingTop: insets.top + 16 }]}
        >
          <AnimatedWave />

          {/* Back button */}
          <TouchableOpacity
            onPress={() => { haptics.lightTap(); router.back(); }}
            style={styles.backButton}
            activeOpacity={0.75}
          >
            <Ionicons name="arrow-back" size={20} color={C.text} />
          </TouchableOpacity>

          {/* Direction tag */}
          <View style={[styles.directionTag, { backgroundColor: isInbound ? C.secondaryMuted : C.primaryMuted }]}>
            <Ionicons
              name={isInbound ? 'call-outline' : 'arrow-up-circle-outline'}
              size={12}
              color={isInbound ? C.secondary : C.primary}
            />
            <Text style={[styles.directionText, { color: isInbound ? C.secondary : C.primary }]}>
              {isInbound ? 'Inbound' : 'Outbound'}
            </Text>
          </View>

          {/* Phone number */}
          <Text style={styles.heroPhone}>{call.phone_number}</Text>

          {/* Agent name */}
          {call.assistant?.name && (
            <View style={styles.agentRow}>
              <Ionicons name="hardware-chip-outline" size={13} color={C.primary} />
              <Text style={styles.agentName}>{call.assistant.name}</Text>
            </View>
          )}

          {/* Duration display */}
          <View style={styles.durationRow}>
            {durationParts.map((p, i) => (
              <React.Fragment key={i}>
                {i > 0 && <Text style={styles.durationSep}>·</Text>}
                <View style={styles.durationPart}>
                  <Text style={styles.durationValue}>{p.value}</Text>
                  <Text style={styles.durationLabel}>{p.label}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>

          {/* Status badge */}
          <View style={{ marginTop: 16, alignSelf: 'flex-start' }}>
            <StatusBadge status={call.status} />
          </View>
        </LinearGradient>

        {/* ── Stats Row ── */}
        <View style={styles.statsRow}>
          <StatPill icon="wallet-outline" label="Cost" value={`₹${costInr.toFixed(2)}`} />
          <StatPill icon="time-outline" label="Duration" value={formatDuration(call.duration_seconds ?? 0)} />
          <StatPill icon="calendar-outline" label="Date" value={formatDateShort(call.created_at)} />
        </View>

        {/* ── Recording Player ── */}
        {call.recording_url ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="mic-outline" size={15} color={C.primary} />
              <Text style={styles.cardTitle}>Recording</Text>
            </View>
            <WaveformPlayer url={call.recording_url} />
          </View>
        ) : null}

        {/* ── Transcript ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="chatbubbles-outline" size={15} color={C.primary} />
            <Text style={styles.cardTitle}>Transcript</Text>
            {transcript.length > 0 && (
              <View style={styles.transcriptCount}>
                <Text style={styles.transcriptCountText}>{transcript.length} messages</Text>
              </View>
            )}
          </View>
          {transcript.length === 0 ? (
            <View style={styles.emptyTranscript}>
              <Ionicons name="document-text-outline" size={28} color={C.textFaint} />
              <Text style={styles.emptyTranscriptText}>No transcript available</Text>
            </View>
          ) : (
            <View style={{ paddingTop: 4 }}>
              {transcript.map((entry, idx) => (
                <ChatBubble key={idx} entry={entry} index={idx} />
              ))}
            </View>
          )}
        </View>

        {/* ── Cost Breakdown ── */}
        {breakdown && (
          <CollapsibleSection title="Cost Breakdown">
            {breakdown.stt !== undefined && (
              <MetaRow label="Speech-to-Text (STT)" value={`₹${(breakdown.stt * USD_TO_INR).toFixed(4)}`} />
            )}
            {breakdown.llm !== undefined && (
              <MetaRow label="Language Model (LLM)" value={`₹${(breakdown.llm * USD_TO_INR).toFixed(4)}`} />
            )}
            {breakdown.tts !== undefined && (
              <MetaRow label="Text-to-Speech (TTS)" value={`₹${(breakdown.tts * USD_TO_INR).toFixed(4)}`} />
            )}
            {breakdown.infra !== undefined && (
              <MetaRow label="Infrastructure" value={`₹${(breakdown.infra * USD_TO_INR).toFixed(4)}`} />
            )}
          </CollapsibleSection>
        )}

        {/* ── Metadata ── */}
        <CollapsibleSection title="Call Details">
          {call.call_sid && <MetaRow label="Call SID" value={call.call_sid} />}
          {call.provider && <MetaRow label="Provider" value={call.provider} />}
          {call.from_number && <MetaRow label="From" value={call.from_number} />}
          {call.to_number && <MetaRow label="To" value={call.to_number} />}
          {call.started_at && <MetaRow label="Started" value={formatDate(call.started_at)} />}
          {call.ended_at && <MetaRow label="Ended" value={formatDate(call.ended_at)} />}
          <MetaRow label="Created" value={formatDate(call.created_at)} />
          {call.tts_characters !== undefined && (
            <MetaRow label="TTS Characters" value={call.tts_characters.toLocaleString()} />
          )}
          {call.stt_minutes !== undefined && (
            <MetaRow label="STT Minutes" value={`${call.stt_minutes.toFixed(2)} min`} />
          )}
        </CollapsibleSection>

        {/* ── Action Buttons ── */}
        <View style={styles.actionsRow}>
          <ActionButton icon="call-outline" label="Call Again" onPress={handleCallAgain} variant="primary" />
          <ActionButton icon="person-outline" label="Customer" onPress={handleViewCustomer} />
          <ActionButton icon="share-outline" label="Share" onPress={handleShareTranscript} />
        </View>
      </ScrollView>
    </Animated.View>
  );
}

// ─── Stat Pill ────────────────────────────────────────────────────────────────

function StatPill({ icon, label, value }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value: string }) {
  return (
    <View style={statStyles.pill}>
      <Ionicons name={icon} size={14} color={C.primary} />
      <Text style={statStyles.label}>{label}</Text>
      <Text style={statStyles.value}>{value}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  pill: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    paddingVertical: 12,
    gap: 4,
  },
  label: { color: C.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  value: { color: C.text, fontSize: 13, fontWeight: '700' },
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1, backgroundColor: C.bg },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.bg,
    gap: 12,
    padding: 32,
  },
  loadingText: { color: C.textMuted, fontSize: 14, marginTop: 8 },
  slowLoadBanner: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  slowLoadText: { color: C.textMuted, fontSize: 13, fontWeight: '500' },

  errorIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.dangerMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  errorTitle: { color: C.text, fontSize: 18, fontWeight: '700' },
  errorText: { color: C.textMuted, fontSize: 14, textAlign: 'center' },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: C.primary,
    borderRadius: 12,
    marginBottom: 4,
  },
  retryBtnText: { color: C.bg, fontSize: 14, fontWeight: '700' },
  errorBackBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: C.surfaceRaised,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  errorBackBtnText: { color: C.text, fontSize: 14, fontWeight: '600' },

  // Hero
  heroCard: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    position: 'relative',
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  directionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 12,
  },
  directionText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  heroPhone: {
    color: C.text,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  agentRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
  agentName: { color: C.textSecondary, fontSize: 14, fontWeight: '500' },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    backgroundColor: 'rgba(0,212,170,0.06)',
    borderWidth: 1,
    borderColor: C.primary + '20',
    borderRadius: 14,
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  durationSep: { color: C.textFaint, fontSize: 20, fontWeight: '300' },
  durationPart: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  durationValue: { color: C.primary, fontSize: 28, fontWeight: '800', letterSpacing: -1 },
  durationLabel: { color: C.primary + 'aa', fontSize: 13, fontWeight: '600' },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 12,
  },

  // Cards
  card: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  cardTitle: { color: C.text, fontSize: 14, fontWeight: '700', flex: 1 },
  transcriptCount: {
    backgroundColor: C.surfaceRaised,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  transcriptCountText: { color: C.textMuted, fontSize: 11, fontWeight: '600' },
  emptyTranscript: { alignItems: 'center', gap: 8, paddingVertical: 24 },
  emptyTranscriptText: { color: C.textMuted, fontSize: 14 },

  // Actions
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 8,
  },
});
