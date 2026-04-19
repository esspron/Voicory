/**
 * callService — Call log data access layer.
 * Wraps Supabase queries for call_logs table: fetch, filter, paginate.
 * Sets up real-time subscription for live call status updates.
 */
import { supabase } from '../lib/supabase';
import { CallLog } from '../types';

export async function getCalls(
  userId: string,
  options: {
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<CallLog[]> {
  let query = supabase
    .from('call_logs')
    .select('*, assistant:assistant_id(name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (options.status && options.status !== 'all') {
    query = query.eq('status', options.status);
  }
  if (options.search) {
    query = query.ilike('phone_number', `%${options.search}%`);
  }

  const limit = options.limit ?? 20;
  const offset = options.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error) throw error;
  return (data as CallLog[]) || [];
}

export async function getCallById(callId: string): Promise<CallLog | null> {
  const { data, error } = await supabase
    .from('call_logs')
    .select('*, assistant:assistant_id(name)')
    .eq('id', callId)
    .single();
  if (error) throw error;
  return data as CallLog;
}

export async function getCallTranscript(callId: string): Promise<any[]> {
  // Try call_transcripts table first
  const { data, error } = await supabase
    .from('call_transcripts')
    .select('*')
    .eq('call_id', callId)
    .order('timestamp_ms', { ascending: true });

  if (!error && data && data.length > 0) {
    return data;
  }

  // Fallback: parse transcript from call_logs metadata
  const { data: callData } = await supabase
    .from('call_logs')
    .select('transcript, metadata')
    .eq('id', callId)
    .single();

  if (!callData) return [];

  // If transcript is a string, convert to array format
  if (typeof callData.transcript === 'string' && callData.transcript) {
    return [{ speaker: 'AI', text: callData.transcript }];
  }

  // Try metadata.transcript
  if (callData.metadata?.transcript && Array.isArray(callData.metadata.transcript)) {
    return callData.metadata.transcript;
  }

  return [];
}
