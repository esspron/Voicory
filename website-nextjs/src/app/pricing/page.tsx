'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'

export default function PricingPage() {
  // Usage Calculator State
  const [callsPerMonth, setCallsPerMonth] = useState(1000)
  const [avgCallLength, setAvgCallLength] = useState(2)
  const [messagesPerMonth, setMessagesPerMonth] = useState(5000)

  // Calculate costs
  const voicoryCostPerMin = 0.05
  const messageCost = 0.005
  const totalCallMinutes = callsPerMonth * avgCallLength
  const totalCallCost = totalCallMinutes * voicoryCostPerMin
  const totalMessageCost = messagesPerMonth * messageCost
  const totalMonthlyCost = totalCallCost + totalMessageCost

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background text-textMain">
      {/* Hero Section */}
      <section className="pt-28 pb-16 px-6 md:px-8">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-primary text-sm font-medium tracking-wider uppercase mb-4">PRICING</p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            Simple, scalable pricing
          </h1>
          <p className="text-lg text-textMuted max-w-2xl mx-auto">
            Pay only for what you use. No subscriptions, no commitments.
            Start with free credits and scale as you grow.
          </p>
        </div>
      </section>

      {/* Pricing Table */}
      <section className="py-12 px-6 md:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Table Header */}
          <div className="grid grid-cols-3 gap-4 mb-2">
            <div></div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-textMain">Pay As You Go</h3>
              <p className="text-xs text-textMuted">For individuals & startups</p>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-textMain">Enterprise</h3>
              <p className="text-xs text-textMuted">For large organizations</p>
            </div>
          </div>

          {/* Pricing Table */}
          <div className="bg-surface border border-white/10 rounded-2xl overflow-hidden">
            {/* Usage and Scale */}
            <div className="border-b border-white/5 p-4">
              <h4 className="text-xs font-semibold text-textMuted uppercase tracking-wider">Usage and Scale</h4>
            </div>
            
            <div className="grid grid-cols-3 gap-4 p-4 border-b border-white/5 hover:bg-white/[0.02]">
              <div className="text-sm text-textMain">Call Minutes</div>
              <div className="text-sm text-textMuted text-center">Usage based</div>
              <div className="text-sm text-textMuted text-center">Custom</div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 p-4 border-b border-white/5 hover:bg-white/[0.02]">
              <div className="text-sm text-textMain">Call Concurrency</div>
              <div className="text-sm text-textMuted text-center">10 included + $10/line/mo</div>
              <div className="text-sm text-textMuted text-center">Custom</div>
            </div>

            {/* Voicory Hosting Cost */}
            <div className="border-b border-white/5 p-4 bg-white/[0.02]">
              <h4 className="text-xs font-semibold text-textMuted uppercase tracking-wider">Voicory Platform Cost</h4>
            </div>
            
            <div className="grid grid-cols-3 gap-4 p-4 border-b border-white/5 hover:bg-white/[0.02]">
              <div className="text-sm text-textMain">Voice Calls</div>
              <div className="text-sm text-center"><span className="text-primary font-semibold">$0.05</span> <span className="text-textMuted">/ min</span></div>
              <div className="text-sm text-textMuted text-center">Volume based</div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 p-4 border-b border-white/5 hover:bg-white/[0.02]">
              <div className="text-sm text-textMain">WhatsApp / Chat</div>
              <div className="text-sm text-center"><span className="text-primary font-semibold">$0.005</span> <span className="text-textMuted">/ msg</span></div>
              <div className="text-sm text-textMuted text-center">Volume based</div>
            </div>

            {/* Model Provider Cost */}
            <div className="border-b border-white/5 p-4 bg-white/[0.02]">
              <h4 className="text-xs font-semibold text-textMuted uppercase tracking-wider">Model Provider Cost (STT, LLM, TTS)</h4>
            </div>
            
            <div className="grid grid-cols-3 gap-4 p-4 border-b border-white/5 hover:bg-white/[0.02]">
              <div className="text-sm text-textMain">Calls</div>
              <div className="text-sm text-textMuted text-center">At cost (pass-through)</div>
              <div className="text-sm text-textMuted text-center">Included</div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 p-4 border-b border-white/5 hover:bg-white/[0.02]">
              <div className="text-sm text-textMain">Chat / WhatsApp</div>
              <div className="text-sm text-textMuted text-center">At cost (pass-through)</div>
              <div className="text-sm text-textMuted text-center">Included</div>
            </div>

            {/* Channels */}
            <div className="border-b border-white/5 p-4 bg-white/[0.02]">
              <h4 className="text-xs font-semibold text-textMuted uppercase tracking-wider">Channels</h4>
            </div>
            
            <div className="grid grid-cols-3 gap-4 p-4 border-b border-white/5 hover:bg-white/[0.02]">
              <div className="text-sm text-textMain">Voice Calls</div>
              <div className="text-sm text-center text-emerald-400">✓</div>
              <div className="text-sm text-center text-emerald-400">✓</div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 p-4 border-b border-white/5 hover:bg-white/[0.02]">
              <div className="text-sm text-textMain">WhatsApp</div>
              <div className="text-sm text-center text-emerald-400">✓</div>
              <div className="text-sm text-center text-emerald-400">✓</div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 p-4 border-b border-white/5 hover:bg-white/[0.02]">
              <div className="text-sm text-textMain">Web Chat Widget</div>
              <div className="text-sm text-center text-emerald-400">✓</div>
              <div className="text-sm text-center text-emerald-400">✓</div>
            </div>

            {/* Data Retention */}
            <div className="border-b border-white/5 p-4 bg-white/[0.02]">
              <h4 className="text-xs font-semibold text-textMuted uppercase tracking-wider">Data Retention</h4>
            </div>
            
            <div className="grid grid-cols-3 gap-4 p-4 border-b border-white/5 hover:bg-white/[0.02]">
              <div className="text-sm text-textMain">Call History</div>
              <div className="text-sm text-textMuted text-center">30 days</div>
              <div className="text-sm text-textMuted text-center">Custom</div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 p-4 border-b border-white/5 hover:bg-white/[0.02]">
              <div className="text-sm text-textMain">Chat History</div>
              <div className="text-sm text-textMuted text-center">30 days</div>
              <div className="text-sm text-textMuted text-center">Custom</div>
            </div>

            {/* Security */}
            <div className="border-b border-white/5 p-4 bg-white/[0.02]">
              <h4 className="text-xs font-semibold text-textMuted uppercase tracking-wider">Security and Compliance</h4>
            </div>
            
            <div className="grid grid-cols-3 gap-4 p-4 border-b border-white/5 hover:bg-white/[0.02]">
              <div className="text-sm text-textMain">HIPAA Compliance</div>
              <div className="text-sm text-textMuted text-center">Add-on $1000/mo</div>
              <div className="text-sm text-center text-emerald-400">✓</div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 p-4 border-b border-white/5 hover:bg-white/[0.02]">
              <div className="text-sm text-textMain">SOC2</div>
              <div className="text-sm text-center text-textMuted">—</div>
              <div className="text-sm text-center text-emerald-400">✓</div>
            </div>

            {/* Support */}
            <div className="border-b border-white/5 p-4 bg-white/[0.02]">
              <h4 className="text-xs font-semibold text-textMuted uppercase tracking-wider">Support</h4>
            </div>
            
            <div className="grid grid-cols-3 gap-4 p-4 border-b border-white/5 hover:bg-white/[0.02]">
              <div className="text-sm text-textMain">Support Channels</div>
              <div className="text-sm text-textMuted text-center">Email, Docs</div>
              <div className="text-sm text-textMuted text-center">Private Slack, Priority</div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 p-4 hover:bg-white/[0.02]">
              <div className="text-sm text-textMain">SLA</div>
              <div className="text-sm text-textMuted text-center">99.9%</div>
              <div className="text-sm text-textMuted text-center">99.99% + Custom</div>
            </div>

            {/* CTA Row */}
            <div className="grid grid-cols-3 gap-4 p-6 bg-white/[0.02] border-t border-white/10">
              <div></div>
              <div className="text-center">
                <Link
                  href="https://app.voicory.com/signup"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-black font-semibold rounded-xl hover:bg-primary/90 transition-all"
                >
                  Get Started Free
                </Link>
              </div>
              <div className="text-center">
                <Link
                  href="mailto:enterprise@voicory.com"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 text-textMain font-semibold rounded-xl border border-white/10 hover:bg-white/10 transition-all"
                >
                  Contact Sales
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Usage Calculator */}
      <section className="py-16 px-6 md:px-8 bg-surface/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-primary text-sm font-medium tracking-wider uppercase mb-4">USAGE CALCULATOR</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Estimate your cost</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Calculator Inputs */}
            <div className="space-y-8">
              {/* Calls per month */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-textMain">Calls per month</label>
                  <span className="text-primary font-semibold">{callsPerMonth.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="50000"
                  step="100"
                  value={callsPerMonth}
                  onChange={(e) => setCallsPerMonth(parseInt(e.target.value))}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-xs text-textMuted mt-1">
                  <span>100</span>
                  <span>50,000</span>
                </div>
              </div>

              {/* Average call length */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-textMain">Average call length (mins)</label>
                  <span className="text-primary font-semibold">{avgCallLength}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="15"
                  step="1"
                  value={avgCallLength}
                  onChange={(e) => setAvgCallLength(parseInt(e.target.value))}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-xs text-textMuted mt-1">
                  <span>1 min</span>
                  <span>15 mins</span>
                </div>
              </div>

              {/* Messages per month */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-textMain">WhatsApp/Chat messages per month</label>
                  <span className="text-primary font-semibold">{messagesPerMonth.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100000"
                  step="1000"
                  value={messagesPerMonth}
                  onChange={(e) => setMessagesPerMonth(parseInt(e.target.value))}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-xs text-textMuted mt-1">
                  <span>0</span>
                  <span>100,000</span>
                </div>
              </div>
            </div>

            {/* Cost Breakdown */}
            <div className="bg-surface border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-6">Cost Breakdown</h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-4 border-b border-white/5">
                  <div>
                    <p className="text-sm font-medium text-textMain">Voicory Platform (Calls)</p>
                    <p className="text-xs text-textMuted">{totalCallMinutes.toLocaleString()} mins × $0.05/min</p>
                  </div>
                  <span className="text-textMain font-semibold">${totalCallCost.toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center pb-4 border-b border-white/5">
                  <div>
                    <p className="text-sm font-medium text-textMain">Voicory Platform (Chat)</p>
                    <p className="text-xs text-textMuted">{messagesPerMonth.toLocaleString()} msgs × $0.005/msg</p>
                  </div>
                  <span className="text-textMain font-semibold">${totalMessageCost.toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center pb-4 border-b border-white/5">
                  <div>
                    <p className="text-sm font-medium text-textMain">Model Providers (LLM, TTS, STT)</p>
                    <p className="text-xs text-textMuted">At cost - varies by provider</p>
                  </div>
                  <span className="text-textMuted text-sm">Variable</span>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <div>
                    <p className="text-lg font-semibold text-textMain">Total Voicory Cost</p>
                    <p className="text-xs text-textMuted">+ model provider costs</p>
                  </div>
                  <span className="text-3xl font-bold text-primary">${totalMonthlyCost.toFixed(2)}</span>
                </div>
              </div>

              <Link
                href="https://app.voicory.com/signup"
                className="block w-full mt-6 py-3 bg-primary text-black font-semibold rounded-xl text-center hover:bg-primary/90 transition-all"
              >
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Add Funds CTA */}
      <section className="py-16 px-6 md:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-gradient-to-br from-primary/10 via-surface to-violet-500/5 border border-primary/20 rounded-2xl p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Ready to get started?</h2>
            <p className="text-textMuted mb-6">
              Add funds to your account anytime. <strong className="text-primary">$1 = 1 credit</strong>.
              Minimum $20, maximum $10,000.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="https://app.voicory.com/signup"
                className="inline-flex items-center gap-2 px-8 py-3 bg-primary text-black font-semibold rounded-xl hover:bg-primary/90 transition-all"
              >
                Get 50 Free Credits
              </Link>
              <Link
                href="https://app.voicory.com/settings/billing"
                className="inline-flex items-center gap-2 px-8 py-3 bg-white/5 text-textMain font-semibold rounded-xl border border-white/10 hover:bg-white/10 transition-all"
              >
                Add Funds
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-6 md:px-8 border-t border-white/5">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          
          <div className="space-y-4">
            <details className="group bg-surface border border-white/5 rounded-xl">
              <summary className="flex justify-between items-center p-5 cursor-pointer list-none">
                <span className="font-semibold">Can I try Voicory for free?</span>
                <span className="text-primary group-open:rotate-45 transition-transform">+</span>
              </summary>
              <div className="px-5 pb-5 text-textMuted text-sm">
                Yes! Every new account gets 50 free credits to test our AI voice and chat agents. 
                No credit card required to sign up.
              </div>
            </details>

            <details className="group bg-surface border border-white/5 rounded-xl">
              <summary className="flex justify-between items-center p-5 cursor-pointer list-none">
                <span className="font-semibold">How does credit equate to minutes?</span>
                <span className="text-primary group-open:rotate-45 transition-transform">+</span>
              </summary>
              <div className="px-5 pb-5 text-textMuted text-sm">
                $1 = 1 credit. The Voicory platform charges $0.05 per minute for calls and $0.005 per message for chat.
                Model provider costs (LLM, TTS, STT) are charged separately at cost.
              </div>
            </details>

            <details className="group bg-surface border border-white/5 rounded-xl">
              <summary className="flex justify-between items-center p-5 cursor-pointer list-none">
                <span className="font-semibold">Do credits expire?</span>
                <span className="text-primary group-open:rotate-45 transition-transform">+</span>
              </summary>
              <div className="px-5 pb-5 text-textMuted text-sm">
                No, credits never expire. Use them whenever you need.
              </div>
            </details>

            <details className="group bg-surface border border-white/5 rounded-xl">
              <summary className="flex justify-between items-center p-5 cursor-pointer list-none">
                <span className="font-semibold">What is the minimum amount to add?</span>
                <span className="text-primary group-open:rotate-45 transition-transform">+</span>
              </summary>
              <div className="px-5 pb-5 text-textMuted text-sm">
                The minimum amount is $20. You can add up to $10,000 at a time. 
                For larger amounts, contact our enterprise team.
              </div>
            </details>

            <details className="group bg-surface border border-white/5 rounded-xl">
              <summary className="flex justify-between items-center p-5 cursor-pointer list-none">
                <span className="font-semibold">Does Voicory Platform Cost include model providers?</span>
                <span className="text-primary group-open:rotate-45 transition-transform">+</span>
              </summary>
              <div className="px-5 pb-5 text-textMuted text-sm">
                No, the $0.05/min platform cost is for Voicory&apos;s infrastructure only. 
                Model provider costs (OpenAI, ElevenLabs, Deepgram, etc.) are charged at cost and vary by provider.
              </div>
            </details>

            <details className="group bg-surface border border-white/5 rounded-xl">
              <summary className="flex justify-between items-center p-5 cursor-pointer list-none">
                <span className="font-semibold">Can I get a refund?</span>
                <span className="text-primary group-open:rotate-45 transition-transform">+</span>
              </summary>
              <div className="px-5 pb-5 text-textMuted text-sm">
                Unused credits can be refunded within 7 days of purchase. 
                See our <Link href="/refund" className="text-primary hover:underline">refund policy</Link> for details.
              </div>
            </details>

            <details className="group bg-surface border border-white/5 rounded-xl">
              <summary className="flex justify-between items-center p-5 cursor-pointer list-none">
                <span className="font-semibold">What is concurrency?</span>
                <span className="text-primary group-open:rotate-45 transition-transform">+</span>
              </summary>
              <div className="px-5 pb-5 text-textMuted text-sm">
                Concurrency refers to the number of simultaneous calls your agents can handle. 
                Pay As You Go includes 10 concurrent lines. Additional lines are $10/line/month.
              </div>
            </details>

            <details className="group bg-surface border border-white/5 rounded-xl">
              <summary className="flex justify-between items-center p-5 cursor-pointer list-none">
                <span className="font-semibold">Do you offer enterprise pricing?</span>
                <span className="text-primary group-open:rotate-45 transition-transform">+</span>
              </summary>
              <div className="px-5 pb-5 text-textMuted text-sm">
                Yes! For high-volume usage or custom requirements, contact us at{' '}
                <a href="mailto:enterprise@voicory.com" className="text-primary hover:underline">enterprise@voicory.com</a>.
              </div>
            </details>
          </div>
        </div>
      </section>

      {/* Payment Security */}
      <section className="py-12 px-6 md:px-8 border-t border-white/5">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm text-textMuted">
            🔒 Secure payments powered by <strong>Paddle</strong> — our merchant of record.
          </p>
          <div className="flex items-center justify-center gap-8 mt-4 text-textMuted/50">
            <span className="text-sm">Visa</span>
            <span className="text-sm">Mastercard</span>
            <span className="text-sm">Amex</span>
            <span className="text-sm">PayPal</span>
          </div>
        </div>
      </section>
    </main>
    <Footer />
    </>
  )
}
