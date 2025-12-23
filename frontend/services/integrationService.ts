/**
 * Integration Service
 * 
 * Handles saving and loading assistant integrations.
 */

import { supabase } from './supabase';
import type { AssistantIntegrations } from '../types/integrations';
import { DEFAULT_INTEGRATIONS } from '../types/integrations';
import { logger } from '../lib/logger';

// Database record type
interface IntegrationRecord {
  assistant_id: string;
  user_id: string;
  http_requests: Record<string, unknown>[];
  livekit_config: Record<string, unknown> | null;
  crm_config: Record<string, unknown> | null;
  webhooks: Record<string, unknown>[];
  calendar_config: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

// Map database record to frontend type
function mapIntegration(record: IntegrationRecord): AssistantIntegrations {
  return {
    httpRequests: (record.http_requests || []) as AssistantIntegrations['httpRequests'],
    livekit: record.livekit_config as AssistantIntegrations['livekit'] || DEFAULT_INTEGRATIONS.livekit,
    crm: record.crm_config as AssistantIntegrations['crm'],
    webhooks: (record.webhooks || []) as AssistantIntegrations['webhooks'],
    calendar: record.calendar_config as AssistantIntegrations['calendar'],
  };
}

// Map frontend type to database record
function mapToRecord(
  assistantId: string,
  userId: string,
  integrations: AssistantIntegrations
): Partial<IntegrationRecord> {
  return {
    assistant_id: assistantId,
    user_id: userId,
    http_requests: integrations.httpRequests as unknown as Record<string, unknown>[],
    livekit_config: integrations.livekit as unknown as Record<string, unknown> | null,
    crm_config: integrations.crm as unknown as Record<string, unknown> | null,
    webhooks: integrations.webhooks as unknown as Record<string, unknown>[],
    calendar_config: integrations.calendar as unknown as Record<string, unknown> | null,
  };
}

/**
 * Get integrations for an assistant
 */
export async function getAssistantIntegrations(
  assistantId: string
): Promise<AssistantIntegrations> {
  try {
    const { data, error } = await supabase
      .from('assistant_integrations')
      .select('*')
      .eq('assistant_id', assistantId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No record found, return defaults
        return { ...DEFAULT_INTEGRATIONS };
      }
      throw error;
    }

    return mapIntegration(data as IntegrationRecord);
  } catch (error) {
    logger.error('Failed to fetch assistant integrations', { error, assistantId });
    return { ...DEFAULT_INTEGRATIONS };
  }
}

/**
 * Save/update integrations for an assistant
 */
export async function saveAssistantIntegrations(
  assistantId: string,
  userId: string,
  integrations: AssistantIntegrations
): Promise<AssistantIntegrations> {
  try {
    const record = mapToRecord(assistantId, userId, integrations);

    const { data, error } = await supabase
      .from('assistant_integrations')
      .upsert(record, {
        onConflict: 'assistant_id',
      })
      .select()
      .single();

    if (error) throw error;

    logger.info('Assistant integrations saved', { assistantId });
    return mapIntegration(data as IntegrationRecord);
  } catch (error) {
    logger.error('Failed to save assistant integrations', { error, assistantId });
    throw error;
  }
}

/**
 * Delete integrations for an assistant
 */
export async function deleteAssistantIntegrations(
  assistantId: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('assistant_integrations')
      .delete()
      .eq('assistant_id', assistantId);

    if (error) throw error;

    logger.info('Assistant integrations deleted', { assistantId });
  } catch (error) {
    logger.error('Failed to delete assistant integrations', { error, assistantId });
    throw error;
  }
}

/**
 * Test an HTTP request configuration
 */
export async function testHTTPRequest(
  request: AssistantIntegrations['httpRequests'][0],
  testData?: Record<string, string>
): Promise<{ success: boolean; response?: unknown; error?: string }> {
  try {
    // Replace template variables with test data
    let body = request.bodyTemplate || '';
    if (testData) {
      Object.entries(testData).forEach(([key, value]) => {
        body = body.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
      });
    }

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': request.contentType || 'application/json',
    };

    // Add auth
    if (request.auth.type === 'bearer' && request.auth.bearerToken) {
      headers['Authorization'] = `Bearer ${request.auth.bearerToken}`;
    } else if (request.auth.type === 'api_key' && request.auth.apiKeyHeader && request.auth.apiKeyValue) {
      headers[request.auth.apiKeyHeader] = request.auth.apiKeyValue;
    } else if (request.auth.type === 'basic' && request.auth.username && request.auth.password) {
      const credentials = btoa(`${request.auth.username}:${request.auth.password}`);
      headers['Authorization'] = `Basic ${credentials}`;
    }

    // Make the request
    const response = await fetch(request.url, {
      method: request.method,
      headers,
      body: ['POST', 'PUT', 'PATCH'].includes(request.method) ? body : undefined,
    });

    const responseData = await response.text();
    let parsedResponse: unknown;
    try {
      parsedResponse = JSON.parse(responseData);
    } catch {
      parsedResponse = responseData;
    }

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        response: parsedResponse,
      };
    }

    return {
      success: true,
      response: parsedResponse,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: message,
    };
  }
}

// ============================================
// RE SCRIPT TEMPLATE SERVICE
// ============================================

import type { REScript } from '../types/reScripts';
import { RE_SCRIPT_TEMPLATES } from '../data/reScriptTemplates';

/**
 * Get all RE script templates (from static data + user's custom templates)
 */
export async function getREScriptTemplates(userId?: string): Promise<REScript[]> {
  // Start with system templates
  const templates = [...RE_SCRIPT_TEMPLATES];

  // If user ID provided, fetch their custom templates
  if (userId) {
    try {
      const { data, error } = await supabase
        .from('re_script_templates')
        .select('*')
        .eq('user_id', userId)
        .eq('is_system_template', false);

      if (!error && data) {
        templates.push(...(data as REScript[]));
      }
    } catch (error) {
      logger.error('Failed to fetch custom RE scripts', { error, userId });
    }
  }

  return templates;
}

/**
 * Save a custom RE script template (fork)
 */
export async function saveREScriptTemplate(
  userId: string,
  script: Omit<REScript, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>
): Promise<REScript> {
  try {
    const record = {
      user_id: userId,
      name: script.name,
      description: script.description,
      category: script.category,
      direction: script.direction,
      is_system_template: false,
      parent_template_id: script.parentTemplateId,
      system_prompt: script.systemPrompt,
      first_message: script.firstMessage,
      qualification_questions: script.qualificationQuestions,
      objection_handlers: script.objectionHandlers,
      appointment_booking_trigger: script.appointmentBookingTrigger,
      transfer_trigger: script.transferTrigger,
      callback_trigger: script.callbackTrigger,
      variables: script.variables,
      tags: script.tags,
      industry: script.industry,
      estimated_call_duration: script.estimatedCallDuration,
    };

    const { data, error } = await supabase
      .from('re_script_templates')
      .insert(record)
      .select()
      .single();

    if (error) throw error;

    logger.info('Custom RE script saved', { userId, name: script.name });
    return data as REScript;
  } catch (error) {
    logger.error('Failed to save custom RE script', { error, userId });
    throw error;
  }
}

/**
 * Delete a custom RE script template
 */
export async function deleteREScriptTemplate(
  templateId: string,
  userId: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('re_script_templates')
      .delete()
      .eq('id', templateId)
      .eq('user_id', userId)
      .eq('is_system_template', false); // Safety: can't delete system templates

    if (error) throw error;

    logger.info('Custom RE script deleted', { templateId, userId });
  } catch (error) {
    logger.error('Failed to delete custom RE script', { error, templateId });
    throw error;
  }
}
