import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pricing | Voicory - Simple, Scalable Pricing',
  description: 'Pay as you go pricing for AI voice calls and chat. No subscriptions, no commitments. $0.05/min for calls, $0.005/msg for chat. Start with 50 free credits.',
}

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
