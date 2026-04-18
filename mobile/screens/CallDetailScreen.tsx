import { colors as C } from '../lib/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as haptics from '../lib/haptics';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBadge } from '../components/StatusBadge';
import { getCallById, getCallTranscript } from '../services/callService';
import { CallLog } from '../types';


const USD_TO_INR = 84;

function formatDuration(seconds: number): string {
  if (!seconds) return '0s';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
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

export default function CallDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [call, setCall] = useState<CallLog | null>(null);
  const [transcript, setTranscript] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    } catch (err: any) {
      setError(err.message || 'Failed to load call');
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const handleCallAgain = () => {
    if (!call) return;
    const tel = `tel:${call.phone_number}`;
    Linking.openURL(tel).catch(() => Alert.alert('Error', 'Cannot initiate call'));
  };

  const handlePlayRecording = () => {
    if (!call?.recording_url) return;
    Linking.openURL(call.recording_url).catch(() =>
      Alert.alert('Error', 'Cannot open recording')
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  if (error || !call) {
    return (
      <View style={styles.centered}>
        <Ionicons name="warning-outline" size={40} color={C.danger} />
        <Text style={styles.errorText}>{error || 'Call not found'}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const costInr = (call.cost || 0) * USD_TO_INR;
  const breakdown = call.metadata?.cost_breakdown;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {call.phone_number}
        </Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Call Info Card */}
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <StatusBadge status={call.status} />
          <Text style={styles.direction}>
            {call.direction === 'inbound' ? '↓ Inbound' : '↑ Outbound'}
          </Text>
        </View>
        <View style={styles.infoGrid}>
          <InfoRow icon="time-outline" label="Duration" value={formatDuration(call.duration_seconds ?? 0)} />
          <InfoRow icon="wallet-outline" label="Cost" value={`₹${costInr.toFixed(2)}`} />
          <InfoRow icon="calendar-outline" label="Time" value={formatDate(call.created_at)} />
          {call.assistant?.name && (
            <InfoRow icon="hardware-chip-outline" label="Assistant" value={call.assistant.name} />
          )}
        </View>
      </View>

      {/* Cost Breakdown */}
      {breakdown && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Cost Breakdown</Text>
          {breakdown.stt !== undefined && (
            <CostRow label="Speech-to-Text (STT)" usd={breakdown.stt} />
          )}
          {breakdown.llm !== undefined && (
            <CostRow label="Language Model (LLM)" usd={breakdown.llm} />
          )}
          {breakdown.tts !== undefined && (
            <CostRow label="Text-to-Speech (TTS)" usd={breakdown.tts} />
          )}
          {breakdown.infra !== undefined && (
            <CostRow label="Infrastructure" usd={breakdown.infra} />
          )}
        </View>
      )}

      {/* Recording */}
      {call.recording_url && (
        <TouchableOpacity style={styles.recordingBtn} onPress={handlePlayRecording}>
          <Ionicons name="play-circle-outline" size={22} color={C.primary} />
          <Text style={styles.recordingBtnText}>Play Recording</Text>
        </TouchableOpacity>
      )}

      {/* Transcript */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Transcript</Text>
        {transcript.length === 0 ? (
          <Text style={styles.emptyTranscript}>No transcript available.</Text>
        ) : (
          transcript.map((entry: any, idx: number) => (
            <View key={idx} style={styles.transcriptEntry}>
              <Text
                style={[
                  styles.speaker,
                  entry.speaker === 'AI' ? styles.speakerAI : styles.speakerCaller,
                ]}
              >
                {entry.speaker || (idx % 2 === 0 ? 'AI' : 'Caller')}
              </Text>
              <Text style={styles.transcriptText}>{entry.text || entry.message}</Text>
            </View>
          ))
        )}
      </View>

      {/* Call Again */}
      <TouchableOpacity style={styles.callAgainBtn} onPress={handleCallAgain}>
        <Ionicons name="call" size={18} color={C.bg} />
        <Text style={styles.callAgainText}>Call Again</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function InfoRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color={C.textMuted} style={{ marginRight: 8 }} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function CostRow({ label, usd }: { label: string; usd: number }) {
  return (
    <View style={styles.costRow}>
      <Text style={styles.costLabel}>{label}</Text>
      <Text style={styles.costValue}>₹{(usd * USD_TO_INR).toFixed(4)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg, gap: 12 },
  errorText: { color: C.danger, fontSize: 15 },
  backBtn: { marginTop: 8, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: C.surfaceRaised, borderRadius: 8 },
  backBtnText: { color: C.text, fontSize: 14 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 44,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: { flex: 1, color: C.text, fontSize: 18, fontWeight: '600' },
  card: {
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  cardTitle: { color: C.text, fontSize: 15, fontWeight: '600', marginBottom: 12 },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  direction: { color: C.textMuted, fontSize: 13 },
  infoGrid: { gap: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  infoLabel: { color: C.textMuted, fontSize: 13, flex: 1 },
  infoValue: { color: C.text, fontSize: 13, fontWeight: '500' },
  costRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.border },
  costLabel: { color: C.textMuted, fontSize: 13 },
  costValue: { color: C.text, fontSize: 13, fontWeight: '500' },
  recordingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 14,
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.primary + '55',
  },
  recordingBtnText: { color: C.primary, fontSize: 15, fontWeight: '600' },
  transcriptEntry: { marginBottom: 12 },
  speaker: { fontSize: 12, fontWeight: '700', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 },
  speakerAI: { color: C.primary },
  speakerCaller: { color: C.secondary },
  transcriptText: { color: C.text, fontSize: 14, lineHeight: 20 },
  emptyTranscript: { color: C.textMuted, fontSize: 13 },
  callAgainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: C.primary,
    borderRadius: 14,
  },
  callAgainText: { color: C.bg, fontSize: 16, fontWeight: '700' },
});
