'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { 
  Microphone, 
  Brain, 
  Sliders,
  Lightning,
  Gear,
  BookOpen,
  Robot,
  Database,
  Code,
  PlugsConnected
} from '@phosphor-icons/react'

const features = [
  {
    icon: Microphone,
    title: '30+ Voice Options',
    description: 'Choose from our curated voice library with male, female & custom voices in multiple languages.',
    gradient: 'from-violet-500/20 to-violet-600/10',
  },
  {
    icon: Brain,
    title: 'Multiple LLM Providers',
    description: 'OpenAI GPT-4o, Claude 3.5 Sonnet, Groq, Together AI — use the best model for your use case.',
    gradient: 'from-blue-500/20 to-blue-600/10',
  },
  {
    icon: BookOpen,
    title: 'RAG Knowledge Base',
    description: 'Upload PDFs, crawl websites, or add custom text. Your AI learns your business instantly.',
    gradient: 'from-emerald-500/20 to-emerald-600/10',
  },
  {
    icon: Database,
    title: 'Customer Memory',
    description: 'Your AI remembers past conversations, customer details & preferences across all interactions.',
    gradient: 'from-amber-500/20 to-amber-600/10',
  },
  {
    icon: Robot,
    title: 'Custom System Prompts',
    description: 'Define personality, rules, and behavior. Use dynamic variables like {customer_name} or {order_status}.',
    gradient: 'from-pink-500/20 to-pink-600/10',
  },
  {
    icon: PlugsConnected,
    title: 'Webhooks & Integrations',
    description: 'Connect to your CRM, booking system, or any API. Trigger actions based on call events.',
    gradient: 'from-cyan-500/20 to-cyan-600/10',
  },
]

const providers = [
  { name: 'OpenAI', model: 'GPT-4o' },
  { name: 'Anthropic', model: 'Claude 3.5' },
  { name: 'Groq', model: 'Llama 3' },
  { name: 'Together', model: 'Mixtral' },
]

export function CustomizationSection() {
  return (
    <section id="customization" className="w-full max-w-7xl mx-auto px-6 md:px-8 py-12 md:py-16">
      {/* Header */}
      <div className="mb-12 text-center max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-4">
            <Gear size={16} weight="bold" />
            Full Control
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mb-3">Build AI Agents Your Way</h2>
          <p className="text-textMuted text-base">
            Configure every aspect of your AI assistant — from voice and language model to 
            knowledge base and memory. No code required.
          </p>
        </motion.div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
        {features.map((feature, index) => (
          <motion.div 
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="bg-surface border border-border rounded-2xl p-6 hover:border-primary/30 transition-all group"
          >
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
              <feature.icon size={24} weight="duotone" className="text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
            <p className="text-textMuted text-sm leading-relaxed">{feature.description}</p>
          </motion.div>
        ))}
      </div>

      {/* LLM Providers Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-2xl p-6 mb-10"
      >
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-textMain mb-1">Powered by Leading AI Models</h3>
            <p className="text-sm text-textMuted">Switch LLM providers anytime — same integration, different brains.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {providers.map((provider) => (
              <div 
                key={provider.name}
                className="flex items-center gap-2 bg-background/60 px-4 py-2 rounded-xl border border-border"
              >
                <span className="text-sm font-medium text-textMain">{provider.name}</span>
                <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">{provider.model}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="text-center"
      >
        <Link 
          href="https://app.voicory.com/signup"
          className="inline-flex items-center gap-2 bg-primary hover:bg-primaryHover text-background font-semibold py-3.5 px-8 rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/25"
        >
          Start Building
          <Lightning size={18} weight="fill" />
        </Link>
        <p className="text-textMuted text-sm mt-3">
          Free to start • No credit card required
        </p>
      </motion.div>
    </section>
  )
}
