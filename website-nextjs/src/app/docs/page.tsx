'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
  Code, 
  Phone, 
  Users, 
  ChatCircle, 
  Key, 
  ShieldCheck, 
  ArrowRight, 
  Copy, 
  Check,
  Timer,
  Warning,
  CaretRight,
  List,
  MagnifyingGlass,
  Funnel,
  ArrowSquareOut,
} from '@phosphor-icons/react'

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

interface Endpoint {
  method: string
  path: string
  description: string
  params?: { name: string; type: string; required?: boolean; description: string }[]
  filters?: { name: string; type: string; description: string }[]
  response: string
  example?: string
}

interface Section {
  id: string
  title: string
  icon: React.ReactNode
}

// ═══════════════════════════════════════════════════════════════
// Code Block with copy
// ═══════════════════════════════════════════════════════════════

function CodeBlock({ code, language = 'bash' }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative group rounded-xl bg-[#0a0a0f] border border-border/50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-surface/80 border-b border-border/30">
        <span className="text-xs font-mono text-textMuted">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-textMuted hover:text-primary transition-colors"
        >
          {copied ? <Check size={14} weight="bold" className="text-emerald-400" /> : <Copy size={14} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-sm font-mono leading-relaxed text-textMain/90">
        <code>{code}</code>
      </pre>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Endpoint Card
// ═══════════════════════════════════════════════════════════════

function EndpointCard({ endpoint }: { endpoint: Endpoint }) {
  const [open, setOpen] = useState(false)
  const methodColor = endpoint.method === 'GET' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'

  return (
    <div className="rounded-xl border border-border/40 bg-surface/40 overflow-hidden transition-all duration-200 hover:border-border/60">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-surfaceHover/50 transition-colors"
      >
        <span className={`px-2.5 py-1 text-xs font-bold font-mono rounded-md border ${methodColor}`}>
          {endpoint.method}
        </span>
        <code className="text-sm font-mono text-textMain flex-1">{endpoint.path}</code>
        <span className="text-xs text-textMuted hidden sm:block">{endpoint.description}</span>
        <CaretRight
          size={16}
          className={`text-textMuted transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
        />
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-border/20">
          <p className="text-sm text-textMuted pt-3">{endpoint.description}</p>

          {endpoint.params && endpoint.params.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-textMuted uppercase tracking-wider mb-2">Path Parameters</h4>
              <div className="space-y-1">
                {endpoint.params.map(p => (
                  <div key={p.name} className="flex items-baseline gap-2 text-sm">
                    <code className="text-primary font-mono">{p.name}</code>
                    <span className="text-textMuted/60 text-xs">{p.type}</span>
                    {p.required && <span className="text-[10px] text-red-400 font-semibold">REQUIRED</span>}
                    <span className="text-textMuted/80">— {p.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {endpoint.filters && endpoint.filters.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-textMuted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Funnel size={12} /> Query Filters
              </h4>
              <div className="rounded-lg border border-border/30 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-surface/60 text-left">
                      <th className="px-3 py-2 text-xs font-semibold text-textMuted">Parameter</th>
                      <th className="px-3 py-2 text-xs font-semibold text-textMuted">Type</th>
                      <th className="px-3 py-2 text-xs font-semibold text-textMuted">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {endpoint.filters.map(f => (
                      <tr key={f.name} className="border-t border-border/20">
                        <td className="px-3 py-2 font-mono text-primary">{f.name}</td>
                        <td className="px-3 py-2 text-textMuted/70">{f.type}</td>
                        <td className="px-3 py-2 text-textMuted/80">{f.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div>
            <h4 className="text-xs font-semibold text-textMuted uppercase tracking-wider mb-2">Response</h4>
            <CodeBlock code={endpoint.response} language="json" />
          </div>

          {endpoint.example && (
            <div>
              <h4 className="text-xs font-semibold text-textMuted uppercase tracking-wider mb-2">Example</h4>
              <CodeBlock code={endpoint.example} language="bash" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Data
// ═══════════════════════════════════════════════════════════════

const BASE_URL = 'https://voicory-backend-783942490798.asia-south1.run.app/api/v1'

const sections: Section[] = [
  { id: 'overview', title: 'Overview', icon: <Code size={18} /> },
  { id: 'authentication', title: 'Authentication', icon: <Key size={18} /> },
  { id: 'rate-limits', title: 'Rate Limits', icon: <Timer size={18} /> },
  { id: 'pagination', title: 'Pagination', icon: <List size={18} /> },
  { id: 'errors', title: 'Error Handling', icon: <Warning size={18} /> },
  { id: 'calls', title: 'Call Logs', icon: <Phone size={18} /> },
  { id: 'customers', title: 'Customers', icon: <Users size={18} /> },
  { id: 'messages', title: 'Messages', icon: <ChatCircle size={18} /> },
  { id: 'security', title: 'Security', icon: <ShieldCheck size={18} /> },
]

const callEndpoints: Endpoint[] = [
  {
    method: 'GET',
    path: '/v1/calls',
    description: 'List all call logs with pagination and filters',
    filters: [
      { name: 'page', type: 'integer', description: 'Page number (default: 1)' },
      { name: 'limit', type: 'integer', description: 'Results per page (default: 25, max: 100)' },
      { name: 'status', type: 'string', description: 'Filter by status: completed, failed, busy, no-answer' },
      { name: 'direction', type: 'string', description: 'Filter by direction: inbound, outbound' },
      { name: 'assistant_id', type: 'uuid', description: 'Filter by assistant ID' },
      { name: 'phone_number', type: 'string', description: 'Filter by customer phone number' },
      { name: 'from', type: 'ISO 8601', description: 'Start date (e.g., 2026-01-01T00:00:00Z)' },
      { name: 'to', type: 'ISO 8601', description: 'End date' },
    ],
    response: `{
  "data": [
    {
      "id": "deb055d2-aec9-4a21-92e1-efe951f8dca3",
      "call_sid": "CA1234567890",
      "direction": "outbound",
      "status": "completed",
      "from_number": "+918047093920",
      "to_number": "+919123456789",
      "duration_seconds": 138,
      "cost": 0.1924,
      "summary": "Customer inquiry about demo",
      "transcript": [...],
      "recording_url": "https://...",
      "provider": "twilio",
      "started_at": "2026-04-18T19:50:20.322Z",
      "ended_at": "2026-04-18T19:52:38.322Z",
      "assistant_id": "abc-123-def"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 25,
    "total": 142,
    "total_pages": 6,
    "has_more": true
  }
}`,
    example: `curl -s "${BASE_URL}/calls?status=completed&limit=10" \\
  -H "x-api-key: YOUR_API_KEY"`,
  },
  {
    method: 'GET',
    path: '/v1/calls/:id',
    description: 'Get detailed information about a specific call',
    params: [{ name: 'id', type: 'uuid', required: true, description: 'Call ID' }],
    response: `{
  "data": {
    "id": "deb055d2-aec9-4a21-92e1-efe951f8dca3",
    "call_sid": "CA1234567890",
    "direction": "outbound",
    "status": "completed",
    "from_number": "+918047093920",
    "to_number": "+919123456789",
    "duration_seconds": 138,
    "cost": 0.1924,
    "summary": "Customer inquiry about demo",
    "transcript": [
      { "speaker": "AI", "text": "Hello, how can I help you?" },
      { "speaker": "Caller", "text": "I'd like a demo" }
    ],
    "recording_url": "https://...",
    "stt_minutes": 2.3,
    "tts_characters": 456,
    "metadata": { ... }
  }
}`,
    example: `curl -s "${BASE_URL}/calls/deb055d2-aec9-4a21-92e1-efe951f8dca3" \\
  -H "x-api-key: YOUR_API_KEY"`,
  },
]

const customerEndpoints: Endpoint[] = [
  {
    method: 'GET',
    path: '/v1/customers',
    description: 'List all customers with pagination and search',
    filters: [
      { name: 'page', type: 'integer', description: 'Page number (default: 1)' },
      { name: 'limit', type: 'integer', description: 'Results per page (default: 25, max: 100)' },
      { name: 'search', type: 'string', description: 'Search by name, email, or phone number' },
      { name: 'source', type: 'string', description: 'Filter by source: website, whatsapp, phone, manual' },
      { name: 'from', type: 'ISO 8601', description: 'Created after date' },
      { name: 'to', type: 'ISO 8601', description: 'Created before date' },
    ],
    response: `{
  "data": [
    {
      "id": "8ed50d58-090e-4d90-8c47-b0b6295d7287",
      "name": "Rohan Kumar",
      "email": "rohan@example.com",
      "phone_number": "+919665544332",
      "source": "website",
      "interaction_count": 5,
      "last_interaction": "2026-04-16T14:28:16Z",
      "variables": { "tags": ["premium"] },
      "created_at": "2026-04-01T10:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 25, "total": 48, "total_pages": 2, "has_more": true }
}`,
    example: `curl -s "${BASE_URL}/customers?search=rohan&limit=10" \\
  -H "x-api-key: YOUR_API_KEY"`,
  },
  {
    method: 'GET',
    path: '/v1/customers/:id',
    description: 'Get customer details with recent calls and messages',
    params: [{ name: 'id', type: 'uuid', required: true, description: 'Customer ID' }],
    response: `{
  "data": {
    "id": "8ed50d58-090e-4d90-8c47-b0b6295d7287",
    "name": "Rohan Kumar",
    "email": "rohan@example.com",
    "phone_number": "+919665544332",
    "source": "website",
    "interaction_count": 5,
    "variables": { "tags": ["premium"] },
    "recent_calls": [
      { "id": "...", "direction": "outbound", "status": "completed", "duration": 45, "cost": 0.12 }
    ],
    "recent_messages": [
      { "id": "...", "direction": "inbound", "content": { "text": { "body": "Hi!" } }, "status": "delivered" }
    ]
  }
}`,
    example: `curl -s "${BASE_URL}/customers/8ed50d58-090e-4d90-8c47-b0b6295d7287" \\
  -H "x-api-key: YOUR_API_KEY"`,
  },
]

const messageEndpoints: Endpoint[] = [
  {
    method: 'GET',
    path: '/v1/messages',
    description: 'List WhatsApp messages with pagination and filters',
    filters: [
      { name: 'page', type: 'integer', description: 'Page number (default: 1)' },
      { name: 'limit', type: 'integer', description: 'Results per page (default: 25, max: 100)' },
      { name: 'direction', type: 'string', description: 'Filter: inbound or outbound' },
      { name: 'customer_id', type: 'uuid', description: 'Filter by customer ID' },
      { name: 'phone_number', type: 'string', description: 'Filter by phone number (from or to)' },
      { name: 'from', type: 'ISO 8601', description: 'Messages after date' },
      { name: 'to', type: 'ISO 8601', description: 'Messages before date' },
    ],
    response: `{
  "data": [
    {
      "id": "71e5c5b7-84c6-4e77-9120-465e35840376",
      "direction": "outbound",
      "content": { "text": { "body": "Sure, how can I help?" } },
      "message_type": "text",
      "from_number": "+918047093920",
      "to_number": "+919876543210",
      "status": "delivered",
      "is_from_bot": false,
      "customer_id": "8ed50d58-...",
      "created_at": "2026-04-18T20:30:19Z"
    }
  ],
  "meta": { "page": 1, "limit": 25, "total": 312, "total_pages": 13, "has_more": true }
}`,
    example: `curl -s "${BASE_URL}/messages?direction=inbound&limit=20" \\
  -H "x-api-key: YOUR_API_KEY"`,
  },
  {
    method: 'GET',
    path: '/v1/messages/:id',
    description: 'Get a single WhatsApp message by ID',
    params: [{ name: 'id', type: 'uuid', required: true, description: 'Message ID' }],
    response: `{
  "data": {
    "id": "71e5c5b7-84c6-4e77-9120-465e35840376",
    "direction": "outbound",
    "content": { "text": { "body": "Sure, how can I help?" } },
    "message_type": "text",
    "from_number": "+918047093920",
    "to_number": "+919876543210",
    "status": "delivered",
    "is_from_bot": false,
    "delivered_at": "2026-04-18T20:30:20Z",
    "read_at": "2026-04-18T20:31:05Z",
    "wa_message_id": "wamid.HBgN..."
  }
}`,
    example: `curl -s "${BASE_URL}/messages/71e5c5b7-84c6-4e77-9120-465e35840376" \\
  -H "x-api-key: YOUR_API_KEY"`,
  },
]

// ═══════════════════════════════════════════════════════════════
// Page Component
// ═══════════════════════════════════════════════════════════════

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState('overview')

  return (
    <div className="min-h-screen bg-background text-textMain">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-emerald-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">V</span>
            </div>
            <span className="text-lg font-bold text-textMain">Voicory</span>
            <span className="text-xs text-textMuted bg-surface px-2 py-0.5 rounded-full border border-border/30">Docs</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="https://app.voicory.com"
              className="text-sm text-textMuted hover:text-primary transition-colors flex items-center gap-1"
            >
              Dashboard <ArrowSquareOut size={14} />
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-12 flex gap-8">
        {/* Sidebar */}
        <aside className="hidden lg:block w-56 flex-shrink-0">
          <div className="sticky top-24 space-y-1">
            {sections.map(s => (
              <a
                key={s.id}
                href={`#${s.id}`}
                onClick={() => setActiveSection(s.id)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                  activeSection === s.id
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-textMuted hover:text-textMain hover:bg-surfaceHover/50'
                }`}
              >
                {s.icon}
                {s.title}
              </a>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 space-y-16">
          {/* Overview */}
          <section id="overview">
            <div className="space-y-4">
              <h1 className="text-4xl font-bold tracking-tight">
                API <span className="text-primary">Documentation</span>
              </h1>
              <p className="text-lg text-textMuted max-w-2xl">
                Integrate Voicory's call logs, customer data, and WhatsApp messages into your CRM, 
                analytics platform, or custom application.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { icon: <Phone size={24} weight="duotone" />, title: 'Call Logs', desc: 'Access call history, transcripts, recordings, and cost data', color: 'from-emerald-500/20 to-teal-600/20' },
                { icon: <Users size={24} weight="duotone" />, title: 'Customers', desc: 'Pull customer profiles with interaction history', color: 'from-blue-500/20 to-indigo-600/20' },
                { icon: <ChatCircle size={24} weight="duotone" />, title: 'Messages', desc: 'Retrieve WhatsApp conversations and message status', color: 'from-purple-500/20 to-pink-600/20' },
              ].map(c => (
                <div key={c.title} className={`p-5 rounded-xl bg-gradient-to-br ${c.color} border border-white/5`}>
                  <div className="text-primary mb-3">{c.icon}</div>
                  <h3 className="font-semibold text-textMain">{c.title}</h3>
                  <p className="text-sm text-textMuted mt-1">{c.desc}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 p-4 rounded-xl bg-surface/60 border border-border/30">
              <p className="text-sm font-mono text-textMuted">
                <span className="text-primary">Base URL:</span>{' '}
                <code className="text-textMain">https://voicory-backend-783942490798.asia-south1.run.app/api/v1</code>
              </p>
            </div>
          </section>

          {/* Authentication */}
          <section id="authentication" className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Key size={24} className="text-primary" /> Authentication
            </h2>
            <p className="text-textMuted">
              All API requests require an API key passed in the <code className="text-primary bg-primary/10 px-1.5 py-0.5 rounded text-sm">x-api-key</code> header.
            </p>
            <p className="text-textMuted">
              You can generate API keys from the{' '}
              <Link href="https://app.voicory.com" className="text-primary hover:underline">Voicory Dashboard</Link>
              {' '}→ Settings → API Keys.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div className="p-4 rounded-xl bg-surface/60 border border-border/30">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500/10 text-emerald-400 rounded">PUBLIC</span>
                  <code className="text-sm font-mono text-textMuted">pk_...</code>
                </div>
                <p className="text-sm text-textMuted">Read-only access. Safe for client-side widgets and integrations.</p>
              </div>
              <div className="p-4 rounded-xl bg-surface/60 border border-border/30">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 text-xs font-bold bg-amber-500/10 text-amber-400 rounded">PRIVATE</span>
                  <code className="text-sm font-mono text-textMuted">sk_...</code>
                </div>
                <p className="text-sm text-textMuted">Full access. Keep server-side only — never expose in frontend code.</p>
              </div>
            </div>

            <CodeBlock
              code={`curl -s "https://voicory-backend-783942490798.asia-south1.run.app/api/v1/calls" \\
  -H "x-api-key: YOUR_API_KEY"`}
              language="bash"
            />
          </section>

          {/* Rate Limits */}
          <section id="rate-limits" className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Timer size={24} className="text-primary" /> Rate Limits
            </h2>
            <p className="text-textMuted">
              API requests are rate-limited per API key to ensure fair usage and platform stability.
            </p>

            <div className="rounded-xl border border-border/30 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface/60 text-left">
                    <th className="px-4 py-3 font-semibold text-textMuted">Limit</th>
                    <th className="px-4 py-3 font-semibold text-textMuted">Window</th>
                    <th className="px-4 py-3 font-semibold text-textMuted">Description</th>
                  </tr>
                </thead>
                <tbody className="text-textMain/90">
                  <tr className="border-t border-border/20">
                    <td className="px-4 py-3 font-mono text-primary">60 requests</td>
                    <td className="px-4 py-3">1 minute</td>
                    <td className="px-4 py-3 text-textMuted">Sliding window per API key</td>
                  </tr>
                  <tr className="border-t border-border/20">
                    <td className="px-4 py-3 font-mono text-primary">10 requests</td>
                    <td className="px-4 py-3">5 seconds</td>
                    <td className="px-4 py-3 text-textMuted">Burst protection</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-textMuted uppercase tracking-wider">Response Headers</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { header: 'X-RateLimit-Limit', desc: 'Max requests per window' },
                  { header: 'X-RateLimit-Remaining', desc: 'Requests left in window' },
                  { header: 'X-RateLimit-Reset', desc: 'Unix timestamp when window resets' },
                ].map(h => (
                  <div key={h.header} className="p-3 rounded-lg bg-surface/40 border border-border/20">
                    <code className="text-xs font-mono text-primary">{h.header}</code>
                    <p className="text-xs text-textMuted mt-1">{h.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <CodeBlock
              code={`HTTP/1.1 429 Too Many Requests
Retry-After: 45
Content-Type: application/json

{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Maximum 60 requests per minute.",
    "retry_after": 45
  }
}`}
              language="http"
            />
          </section>

          {/* Pagination */}
          <section id="pagination" className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <List size={24} className="text-primary" /> Pagination
            </h2>
            <p className="text-textMuted">
              All list endpoints return paginated results. Use <code className="text-primary bg-primary/10 px-1.5 py-0.5 rounded text-sm">page</code> and{' '}
              <code className="text-primary bg-primary/10 px-1.5 py-0.5 rounded text-sm">limit</code> query parameters.
            </p>

            <div className="rounded-xl border border-border/30 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface/60 text-left">
                    <th className="px-4 py-3 font-semibold text-textMuted">Parameter</th>
                    <th className="px-4 py-3 font-semibold text-textMuted">Default</th>
                    <th className="px-4 py-3 font-semibold text-textMuted">Range</th>
                  </tr>
                </thead>
                <tbody className="text-textMain/90">
                  <tr className="border-t border-border/20">
                    <td className="px-4 py-3 font-mono text-primary">page</td>
                    <td className="px-4 py-3">1</td>
                    <td className="px-4 py-3 text-textMuted">1 – ∞</td>
                  </tr>
                  <tr className="border-t border-border/20">
                    <td className="px-4 py-3 font-mono text-primary">limit</td>
                    <td className="px-4 py-3">25</td>
                    <td className="px-4 py-3 text-textMuted">1 – 100</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <CodeBlock
              code={`// meta object in every list response
{
  "page": 2,
  "limit": 25,
  "total": 142,
  "total_pages": 6,
  "has_more": true
}`}
              language="json"
            />
          </section>

          {/* Errors */}
          <section id="errors" className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Warning size={24} className="text-primary" /> Error Handling
            </h2>
            <p className="text-textMuted">
              All errors return a consistent JSON structure with an <code className="text-primary bg-primary/10 px-1.5 py-0.5 rounded text-sm">error</code> object.
            </p>

            <div className="rounded-xl border border-border/30 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface/60 text-left">
                    <th className="px-4 py-3 font-semibold text-textMuted">Status</th>
                    <th className="px-4 py-3 font-semibold text-textMuted">Code</th>
                    <th className="px-4 py-3 font-semibold text-textMuted">Meaning</th>
                  </tr>
                </thead>
                <tbody className="text-textMain/90">
                  {[
                    { status: '400', code: 'INVALID_ID / INVALID_FILTER', meaning: 'Bad request — invalid UUID or filter format' },
                    { status: '401', code: 'MISSING_API_KEY', meaning: 'No x-api-key header provided' },
                    { status: '401', code: 'INVALID_API_KEY', meaning: 'API key not found or wrong' },
                    { status: '401', code: 'REVOKED_API_KEY', meaning: 'API key has been revoked' },
                    { status: '404', code: 'NOT_FOUND', meaning: 'Resource not found' },
                    { status: '429', code: 'RATE_LIMIT_EXCEEDED', meaning: 'Too many requests' },
                    { status: '500', code: 'INTERNAL_ERROR', meaning: 'Server error — contact support' },
                  ].map(e => (
                    <tr key={e.code} className="border-t border-border/20">
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                          e.status === '400' ? 'bg-amber-500/10 text-amber-400' :
                          e.status === '401' ? 'bg-red-500/10 text-red-400' :
                          e.status === '404' ? 'bg-gray-500/10 text-gray-400' :
                          e.status === '429' ? 'bg-orange-500/10 text-orange-400' :
                          'bg-red-500/10 text-red-400'
                        }`}>{e.status}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-primary">{e.code}</td>
                      <td className="px-4 py-3 text-textMuted">{e.meaning}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <CodeBlock
              code={`{
  "error": {
    "code": "INVALID_API_KEY",
    "message": "Invalid API key"
  }
}`}
              language="json"
            />
          </section>

          {/* Call Logs */}
          <section id="calls" className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Phone size={24} className="text-primary" /> Call Logs
            </h2>
            <p className="text-textMuted">
              Access your voice call history including transcripts, summaries, recordings, and cost breakdowns.
            </p>
            <div className="space-y-3">
              {callEndpoints.map(e => <EndpointCard key={e.path} endpoint={e} />)}
            </div>
          </section>

          {/* Customers */}
          <section id="customers" className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Users size={24} className="text-primary" /> Customers
            </h2>
            <p className="text-textMuted">
              Pull customer profiles from Voicory's built-in CRM. Each customer detail includes recent calls and WhatsApp messages.
            </p>
            <div className="space-y-3">
              {customerEndpoints.map(e => <EndpointCard key={e.path} endpoint={e} />)}
            </div>
          </section>

          {/* Messages */}
          <section id="messages" className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <ChatCircle size={24} className="text-primary" /> WhatsApp Messages
            </h2>
            <p className="text-textMuted">
              Retrieve WhatsApp messages sent and received through your Voicory-connected WhatsApp Business numbers.
            </p>
            <div className="space-y-3">
              {messageEndpoints.map(e => <EndpointCard key={e.path} endpoint={e} />)}
            </div>
          </section>

          {/* Security */}
          <section id="security" className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <ShieldCheck size={24} className="text-primary" /> Security
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { title: 'Tenant Isolation', desc: 'All data is scoped to your API key. You can never access another account\'s data.' },
                { title: 'Input Sanitization', desc: 'All query parameters are sanitized and validated before reaching the database.' },
                { title: 'Redis Rate Limiting', desc: 'Per-key sliding window rate limits backed by Redis — no in-memory cheating.' },
                { title: 'UUID Validation', desc: 'All ID parameters are validated as proper UUIDs — no SQL injection vectors.' },
                { title: 'Request Logging', desc: 'Every API request is logged with key, path, status, duration, and IP.' },
                { title: 'Security Headers', desc: 'X-Content-Type-Options, X-Frame-Options, Cache-Control on all responses.' },
                { title: 'No Internal Fields', desc: 'Internal fields like user_id, config_id, secrets are never exposed in responses.' },
                { title: 'Key Revocation', desc: 'Revoked keys are immediately rejected — no grace period.' },
              ].map(s => (
                <div key={s.title} className="p-4 rounded-xl bg-surface/40 border border-border/20">
                  <h3 className="font-semibold text-textMain text-sm flex items-center gap-2">
                    <Check size={16} className="text-emerald-400" />
                    {s.title}
                  </h3>
                  <p className="text-xs text-textMuted mt-1.5">{s.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section className="mt-16 p-8 rounded-2xl bg-gradient-to-br from-primary/10 to-emerald-600/5 border border-primary/20 text-center">
            <h2 className="text-2xl font-bold text-textMain">Ready to integrate?</h2>
            <p className="text-textMuted mt-2">
              Generate your API key from the Voicory dashboard and start pulling data in minutes.
            </p>
            <Link
              href="https://app.voicory.com"
              className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-primary text-black font-semibold rounded-xl hover:bg-primaryHover transition-colors"
            >
              Go to Dashboard <ArrowRight size={18} weight="bold" />
            </Link>
          </section>
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/20 mt-16">
        <div className="max-w-7xl mx-auto px-6 py-8 flex items-center justify-between text-sm text-textMuted">
          <p>© {new Date().getFullYear()} Voicory. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-primary transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
