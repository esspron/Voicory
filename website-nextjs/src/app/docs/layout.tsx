import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'API Documentation',
  description: 'Voicory Public API v1 — integrate call logs, customers, and WhatsApp messages into your CRM or app.',
}

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return children
}
