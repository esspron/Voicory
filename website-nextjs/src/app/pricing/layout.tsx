import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pricing | Voicory - Simple, Scalable Pricing',
  description: 'Pay as you go pricing for AI voice calls and chat. No subscriptions, no commitments. $0.03/min for calls, $0.001/msg for chat. Minimum top-up $20.',
}

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
