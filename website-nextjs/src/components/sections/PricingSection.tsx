'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { 
  Check, 
  Lightning, 
  Star, 
  Rocket,
  Phone,
  Crown,
  CurrencyInr,
  Gift,
  WhatsappLogo,
  Sparkle
} from '@phosphor-icons/react'

const includedFeatures = [
  'Unlimited AI Assistants',
  'Voice Calls (Twilio, Vonage, Telnyx)',
  'WhatsApp Business Integration',
  'Knowledge Base with RAG',
  'Customer Memory System',
  '15+ Indian Languages',
  'Voice Library (30+ voices)',
  'Real-time Analytics',
  'API Access',
  'Webhook Integrations',
]

const enterpriseFeatures = [
  'Everything in Pay-as-you-go',
  'Custom LLM Integration',
  'On-premise Deployment',
  'Dedicated Account Manager',
  'Custom Voice Cloning',
  'SLA Guarantee (99.9%)',
  'Priority Support (24/7)',
  'Volume Discounts',
]

export function PricingSection() {
  return (
    <section id="pricing" className="w-full max-w-7xl mx-auto px-6 md:px-8 py-12 md:py-16">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <span className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-4">
          <CurrencyInr size={16} weight="bold" />
          Simple Pricing
        </span>
        <h2 className="text-3xl md:text-4xl font-bold mb-3">
          Pay Only for What You Use
        </h2>
        <p className="text-textMuted text-base max-w-2xl mx-auto">
          No monthly fees, no commitments. Pay only for what you use. Scale as you grow.
        </p>
      </motion.div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
        {/* PAYG Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative bg-surface border border-primary/30 ring-2 ring-primary/20 rounded-3xl p-8"
        >
          {/* Popular Badge */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="bg-primary text-background px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Sparkle size={14} weight="fill" />
              Recommended
            </span>
          </div>

          <div className="mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl flex items-center justify-center mb-4">
              <Lightning size={24} weight="duotone" className="text-primary" />
            </div>
            <h3 className="text-2xl font-bold">Pay as You Go</h3>
            <p className="text-textMuted text-sm mt-1">Perfect for startups & growing businesses</p>
          </div>

          {/* Price */}
          <div className="mb-6 pb-6 border-b border-border">
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-textMuted text-lg">₹</span>
              <span className="text-5xl font-bold">0.03</span>
              <span className="text-textMuted">/minute</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-primary">
              <Gift size={16} weight="fill" />
              <span>Pay only for what you use</span>
            </div>
          </div>

          {/* Features */}
          <div className="mb-8">
            <div className="text-sm font-medium text-textMuted mb-4 uppercase tracking-wide">Everything included:</div>
            <ul className="space-y-3">
              {includedFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <Check size={18} weight="bold" className="text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-textMain">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA */}
          <Link
            href="https://app.voicory.com/signup"
            className="block text-center py-3.5 px-6 rounded-xl font-semibold bg-primary text-background hover:bg-primaryHover transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/25"
          >
            Get Started
          </Link>
          <p className="text-center text-xs text-textMuted mt-3">Minimum top-up $20 · Pay only for what you use</p>
        </motion.div>

        {/* Enterprise Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="relative bg-surface border border-border rounded-3xl p-8"
        >
          <div className="mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500/20 to-amber-600/10 rounded-xl flex items-center justify-center mb-4">
              <Crown size={24} weight="duotone" className="text-amber-500" />
            </div>
            <h3 className="text-2xl font-bold">Enterprise</h3>
            <p className="text-textMuted text-sm mt-1">For large teams with custom needs</p>
          </div>

          {/* Price */}
          <div className="mb-6 pb-6 border-b border-border">
            <div className="text-3xl font-bold mb-2">Custom Pricing</div>
            <div className="text-sm text-textMuted">
              Volume discounts & dedicated support
            </div>
          </div>

          {/* Features */}
          <div className="mb-8">
            <div className="text-sm font-medium text-textMuted mb-4 uppercase tracking-wide">Everything in PAYG, plus:</div>
            <ul className="space-y-3">
              {enterpriseFeatures.slice(1).map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <Check size={18} weight="bold" className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-textMain">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA */}
          <Link
            href="mailto:support@voicory.com"
            className="block text-center py-3.5 px-6 rounded-xl font-semibold bg-surface border border-border hover:border-primary/50 transition-all"
          >
            Contact Sales
          </Link>
        </motion.div>
      </div>

      {/* Trust Badges */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="text-center"
      >
        <div className="flex flex-wrap items-center justify-center gap-6 text-textMuted text-sm">
          <div className="flex items-center gap-2">
            <Check size={18} weight="bold" className="text-primary" />
            <span>No monthly minimum</span>
          </div>
          <div className="flex items-center gap-2">
            <Check size={18} weight="bold" className="text-primary" />
            <span>Pay only for what you use</span>
          </div>
          <div className="flex items-center gap-2">
            <Check size={18} weight="bold" className="text-primary" />
            <span>GST invoice available</span>
          </div>
          <div className="flex items-center gap-2">
            <Check size={18} weight="bold" className="text-primary" />
            <span>Pay via UPI, Cards, or Netbanking</span>
          </div>
        </div>
      </motion.div>
    </section>
  )
}
