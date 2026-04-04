/**
 * Provider Config Service
 * Manages per-user provider credentials for non-CRM integrations.
 * Talks to /api/integrations/:provider/* endpoints.
 */

import { authFetch } from '@/lib/api';

export interface ProviderConfig {
  provider: string;
  isConnected: boolean;
  webhookUrl?: string;
  updatedAt?: string;
}

export interface SaveConfigPayload {
  apiKey?: string;
  apiSecret?: string;
  webhookUrl?: string;
  extraConfig?: Record<string, unknown>;
}

export async function getProviderConfig(provider: string): Promise<ProviderConfig | null> {
  const res = await authFetch(`/api/integrations/${encodeURIComponent(provider)}/config`);
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.config) return null;
  return {
    provider: data.config.provider,
    isConnected: !!data.config.is_connected,
    webhookUrl: data.config.webhook_url,
    updatedAt: data.config.updated_at,
  };
}

export async function saveProviderConfig(
  provider: string,
  payload: SaveConfigPayload
): Promise<ProviderConfig> {
  const res = await authFetch(`/api/integrations/${encodeURIComponent(provider)}/config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: payload.apiKey,
      api_secret: payload.apiSecret,
      webhook_url: payload.webhookUrl,
      extra_config: payload.extraConfig,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to save configuration');
  }
  const data = await res.json();
  return {
    provider: data.config.provider,
    isConnected: !!data.config.is_connected,
    webhookUrl: data.config.webhook_url,
    updatedAt: data.config.updated_at,
  };
}

export async function testProviderConnection(
  provider: string
): Promise<{ success: boolean; message: string }> {
  const res = await authFetch(`/api/integrations/${encodeURIComponent(provider)}/test`, {
    method: 'POST',
  });
  const data = await res.json();
  return { success: !!data.success, message: data.message || '' };
}

export async function disconnectProvider(provider: string): Promise<void> {
  const res = await authFetch(`/api/integrations/${encodeURIComponent(provider)}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to disconnect');
  }
}

export async function getProviderWebhookUrl(provider: string): Promise<string> {
  const res = await authFetch(`/api/integrations/${encodeURIComponent(provider)}/webhook-url`);
  if (!res.ok) throw new Error('Failed to get webhook URL');
  const data = await res.json();
  return data.webhookUrl;
}
