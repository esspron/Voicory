// ─────────────────────────────────────────────────────────────────────────────
// webLinks.ts — Canonical URLs for the Voicory web SaaS (app.voicory.com)
//
// The mobile app and web app share the same Supabase project
// (ssxirklimsdmsnwgtwfs.supabase.co), so the same user account authenticates
// on both platforms without any extra steps.
// ─────────────────────────────────────────────────────────────────────────────

export const WEB_BASE = 'https://app.voicory.com';

export const webLinks = {
  // Core pages
  dashboard:        `${WEB_BASE}/dashboard`,
  billing:          `${WEB_BASE}/billing`,
  assistants:       `${WEB_BASE}/assistants`,
  campaigns:        `${WEB_BASE}/campaigns`,
  settings:         `${WEB_BASE}/settings`,

  // Assistants
  createAssistant:  `${WEB_BASE}/assistants/create`,

  // Extended pages
  knowledgeBase:    `${WEB_BASE}/knowledge`,
  apiKeys:          `${WEB_BASE}/settings/api-keys`,
  teamSettings:     `${WEB_BASE}/settings/team`,
  analytics:        `${WEB_BASE}/analytics`,
  contacts:         `${WEB_BASE}/contacts`,

  // Marketing / support
  website:          'https://www.voicory.com',
  helpCenter:       'https://www.voicory.com/help',
  support:          'mailto:hello@voicory.com',
} as const;

export type WebLinkKey = keyof typeof webLinks;
