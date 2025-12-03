'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
  Phone, 
  WhatsappLogo, 
  Robot, 
  Brain,
  BookOpen,
  Gear,
  Play,
  Pause,
  Check,
  Lightning,
  ChartLineUp
} from '@phosphor-icons/react'

const features = [
  { 
    id: 'calls', 
    label: 'Voice Calls', 
    icon: Phone, 
    description: 'Inbound & outbound AI calls via Twilio',
    color: 'from-emerald-500/20 to-emerald-600/10'
  },
  { 
    id: 'whatsapp', 
    label: 'WhatsApp', 
    icon: WhatsappLogo, 
    description: 'AI chatbot for WhatsApp Business',
    color: 'from-green-500/20 to-green-600/10'
  },
  { 
    id: 'memory', 
    label: 'Customer Memory', 
    icon: Brain, 
    description: 'Remember context across conversations',
    color: 'from-violet-500/20 to-violet-600/10'
  },
  { 
    id: 'knowledge', 
    label: 'Knowledge Base', 
    icon: BookOpen, 
    description: 'RAG with your docs, PDFs & websites',
    color: 'from-blue-500/20 to-blue-600/10'
  },
  { 
    id: 'assistant', 
    label: 'Custom Assistants', 
    icon: Robot, 
    description: 'Build & configure AI personalities',
    color: 'from-primary/20 to-primary/10'
  },
  { 
    id: 'analytics', 
    label: 'Analytics', 
    icon: ChartLineUp, 
    description: 'Track calls, costs & performance',
    color: 'from-amber-500/20 to-amber-600/10'
  },
]

const useCases = [
  'Customer Support',
  'Appointment Booking',
  'Lead Qualification', 
  'Order Status',
  'FAQ Handling',
  'Feedback Collection'
]

export function DemoSection() {
  const [selectedFeature, setSelectedFeature] = useState('calls')
  const [formData, setFormData] = useState({ phone: '', name: '' })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Demo request:', formData)
  }

  return (
    <section id="demo" className="w-full max-w-7xl mx-auto px-6 md:px-8 py-12 md:py-16">
      {/* Section Header */}
      <div className="text-center mb-10">
        <span className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-4">
          <Lightning size={16} weight="fill" />
          Platform Features
        </span>
        <h2 className="text-3xl md:text-4xl font-bold mb-3">
          Everything You Need to Build AI Agents
        </h2>
        <p className="text-textMuted text-base max-w-2xl mx-auto">
          From voice calls to WhatsApp, knowledge bases to customer memory — 
          Voicory handles it all in one platform.
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-12">
        {features.map((feature) => {
          const isActive = selectedFeature === feature.id
          return (
            <button
              key={feature.id}
              onClick={() => setSelectedFeature(feature.id)}
              className={`relative p-4 rounded-2xl border text-left transition-all duration-200 ${
                isActive 
                  ? 'bg-surface border-primary/30 ring-2 ring-primary/20' 
                  : 'bg-surface/50 border-border hover:border-primary/20 hover:bg-surface'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-3`}>
                <feature.icon size={20} weight={isActive ? "fill" : "duotone"} className={isActive ? 'text-primary' : 'text-textMain'} />
              </div>
              <h3 className="font-semibold text-sm text-textMain mb-1">{feature.label}</h3>
              <p className="text-xs text-textMuted leading-relaxed">{feature.description}</p>
              {isActive && (
                <div className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full" />
              )}
            </button>
          )
        })}
      </div>

      {/* Demo Card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left: Demo Form */}
        <div className="bg-surface border border-border rounded-3xl p-8 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/5 blur-3xl rounded-full" />
          
          <div className="relative">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                <Phone size={24} weight="duotone" className="text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-textMain">Try Live Demo</h3>
                <p className="text-sm text-textMuted">Get a call from our AI assistant</p>
              </div>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm text-textMuted mb-2">Phone Number</label>
                <input 
                  type="tel" 
                  placeholder="+91 98765 43210" 
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-textMain placeholder:text-textMuted/50 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all" 
                />
              </div>
              <div>
                <label className="block text-sm text-textMuted mb-2">Your Name</label>
                <input 
                  type="text" 
                  placeholder="Enter your name" 
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-textMain placeholder:text-textMuted/50 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all" 
                />
              </div>
              <button 
                type="submit" 
                className="w-full bg-primary hover:bg-primaryHover text-background font-semibold py-3.5 px-6 rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/25 flex items-center justify-center gap-2"
              >
                <Phone size={18} weight="fill" />
                Request Demo Call
              </button>
            </form>

            <p className="text-xs text-textMuted text-center mt-4">
              Our AI will call you within 30 seconds
            </p>
          </div>
        </div>

        {/* Right: Use Cases with Image */}
        <div className="space-y-6">
          {/* Phone Mockup Image */}
          <div className="relative flex justify-center mb-6">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent blur-2xl" />
            <div className="relative bg-surface border border-border rounded-[2.5rem] p-2 shadow-2xl shadow-black/40">
              <div className="bg-background rounded-[2rem] overflow-hidden w-[200px]">
                {/* Phone Notch */}
                <div className="bg-background pt-2 pb-1 flex justify-center">
                  <div className="w-20 h-5 bg-surface rounded-full" />
                </div>
                {/* Chat Screen */}
                <div className="px-3 py-4 space-y-3 h-[300px]">
                  <div className="flex gap-2 items-start">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex-shrink-0 flex items-center justify-center">
                      <Robot size={12} className="text-primary" />
                    </div>
                    <div className="bg-surface rounded-2xl rounded-tl-sm px-3 py-2 max-w-[140px]">
                      <p className="text-[10px] text-textMain">Namaste! 🙏 How can I help you today?</p>
                    </div>
                  </div>
                  <div className="flex gap-2 items-start justify-end">
                    <div className="bg-primary/20 rounded-2xl rounded-tr-sm px-3 py-2 max-w-[140px]">
                      <p className="text-[10px] text-textMain">I want to check my order status</p>
                    </div>
                  </div>
                  <div className="flex gap-2 items-start">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex-shrink-0 flex items-center justify-center">
                      <Robot size={12} className="text-primary" />
                    </div>
                    <div className="bg-surface rounded-2xl rounded-tl-sm px-3 py-2 max-w-[140px]">
                      <p className="text-[10px] text-textMain">Sure! Your order #12847 is out for delivery 📦</p>
                    </div>
                  </div>
                  <div className="flex gap-2 items-start justify-end">
                    <div className="bg-primary/20 rounded-2xl rounded-tr-sm px-3 py-2 max-w-[140px]">
                      <p className="text-[10px] text-textMain">धन्यवाद! 🎉</p>
                    </div>
                  </div>
                </div>
                {/* Phone Home Bar */}
                <div className="pb-2 flex justify-center">
                  <div className="w-24 h-1 bg-border rounded-full" />
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-2xl font-bold text-textMain mb-2">Built for Real Business Use Cases</h3>
            <p className="text-textMuted">
              Whether you&apos;re handling customer support, booking appointments, or qualifying leads — 
              Voicory adapts to your workflow.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {useCases.map((useCase) => (
              <div 
                key={useCase}
                className="flex items-center gap-3 p-3 bg-surface/50 border border-border rounded-xl"
              >
                <Check size={18} weight="bold" className="text-primary flex-shrink-0" />
                <span className="text-sm text-textMain">{useCase}</span>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-2xl p-6 border border-primary/10">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Gear size={20} weight="duotone" className="text-primary" />
              </div>
              <div>
                <h4 className="font-semibold text-textMain mb-1">Easy Integration</h4>
                <p className="text-sm text-textMuted">
                  Connect your Twilio numbers, import from WhatsApp Business API, 
                  or use our embeddable widget. Setup takes under 5 minutes.
                </p>
              </div>
            </div>
          </div>

          <Link 
            href="https://app.voicory.com/signup"
            className="inline-flex items-center gap-2 bg-surface border border-border hover:border-primary/50 text-textMain px-6 py-3 rounded-xl font-medium transition-all duration-200 hover:bg-surface/80"
          >
            Start Building Free
            <Lightning size={18} weight="fill" className="text-primary" />
          </Link>
        </div>
      </div>
    </section>
  )
}
