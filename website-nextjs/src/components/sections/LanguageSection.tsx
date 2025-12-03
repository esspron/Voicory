'use client'

import { motion } from 'framer-motion'
import { 
  Translate, 
  Globe, 
  ChatCircle, 
  Check,
  Waveform
} from '@phosphor-icons/react'

const languages = [
  { code: 'hi', name: 'Hindi', native: 'हिंदी', speakers: '600M+' },
  { code: 'en', name: 'English', native: 'English', speakers: '1.5B' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা', speakers: '270M+' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు', speakers: '96M+' },
  { code: 'mr', name: 'Marathi', native: 'मराठी', speakers: '95M+' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்', speakers: '85M+' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી', speakers: '60M+' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ', speakers: '50M+' },
]

const features = [
  {
    icon: Translate,
    title: 'Native Fluency',
    description: 'Our AI speaks with natural accents and local expressions, not robotic translations.',
  },
  {
    icon: Globe,
    title: 'Regional Dialects',
    description: 'Support for regional variations within each language for authentic conversations.',
  },
  {
    icon: ChatCircle,
    title: 'Code-Switching',
    description: 'Seamlessly switch between languages mid-conversation, just like real Indians do.',
  },
  {
    icon: Waveform,
    title: 'Voice Cloning',
    description: 'Clone any voice and make it speak all supported languages naturally.',
  },
]

export function LanguageSection() {
  return (
    <section id="languages" className="w-full max-w-7xl mx-auto px-6 md:px-8 py-12 md:py-16">
      {/* Header */}
      <div className="text-center mb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-4">
            <Translate size={16} weight="bold" />
            Multilingual AI
          </span>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Speak Every Indian Language
          </h2>
          <p className="text-textMuted text-lg max-w-2xl mx-auto">
            Our AI callers communicate fluently in 15+ Indian languages, 
            understanding regional nuances and cultural context.
          </p>
        </motion.div>
      </div>

      {/* Language Grid */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-16"
      >
        {languages.map((lang) => (
          <div 
            key={lang.code}
            className="group relative bg-surface border border-border rounded-2xl p-4 text-center hover:border-primary/50 hover:bg-surface/80 transition-all cursor-pointer"
          >
            <div className="text-2xl mb-2 font-medium">{lang.native}</div>
            <div className="text-sm text-textMuted">{lang.name}</div>
            <div className="text-xs text-primary mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {lang.speakers} speakers
            </div>
          </div>
        ))}
      </motion.div>

      {/* +7 More Badge */}
      <div className="flex justify-center mb-16">
        <span className="bg-primary/10 text-primary px-6 py-2 rounded-full text-sm font-medium">
          + 7 more languages coming soon
        </span>
      </div>

      {/* Visual Showcase - India Map with Language Bubbles */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="relative mb-16 mx-auto max-w-4xl"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent blur-3xl" />
        <div className="relative bg-surface/50 border border-border rounded-3xl p-8 overflow-hidden">
          {/* Background Map Silhouette */}
          <div className="absolute inset-0 opacity-5">
            <svg viewBox="0 0 400 400" className="w-full h-full">
              <path fill="currentColor" d="M200 50 L280 80 L320 150 L350 220 L320 300 L250 350 L200 370 L150 350 L80 300 L50 220 L80 150 L120 80 Z" />
            </svg>
          </div>
          
          <div className="relative flex flex-col items-center gap-6 py-6">
            <h3 className="text-2xl font-bold text-center">
              <span className="gradient-text">One Platform</span>, Every Language
            </h3>
            
            {/* Language Conversation Examples */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl">
              {/* Hindi Example */}
              <div className="bg-background/60 border border-border rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                    <span className="text-sm font-bold text-orange-400">हि</span>
                  </div>
                  <span className="text-sm font-medium">Hindi</span>
                </div>
                <div className="space-y-2">
                  <div className="bg-surface rounded-lg px-3 py-2">
                    <p className="text-xs text-textMuted">"नमस्ते! मैं आपकी कैसे मदद कर सकता हूँ?"</p>
                  </div>
                  <div className="bg-primary/10 rounded-lg px-3 py-2 text-right">
                    <p className="text-xs text-textMuted">"मुझे अपना ऑर्डर ट्रैक करना है"</p>
                  </div>
                </div>
              </div>
              
              {/* Tamil Example */}
              <div className="bg-background/60 border border-border rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                    <span className="text-sm font-bold text-red-400">த</span>
                  </div>
                  <span className="text-sm font-medium">Tamil</span>
                </div>
                <div className="space-y-2">
                  <div className="bg-surface rounded-lg px-3 py-2">
                    <p className="text-xs text-textMuted">"வணக்கம்! உங்களுக்கு எப்படி உதவ முடியும்?"</p>
                  </div>
                  <div className="bg-primary/10 rounded-lg px-3 py-2 text-right">
                    <p className="text-xs text-textMuted">"நான் ஒரு சந்திப்பை முன்பதிவு செய்ய விரும்புகிறேன்"</p>
                  </div>
                </div>
              </div>
              
              {/* Bengali Example */}
              <div className="bg-background/60 border border-border rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                    <span className="text-sm font-bold text-green-400">বা</span>
                  </div>
                  <span className="text-sm font-medium">Bengali</span>
                </div>
                <div className="space-y-2">
                  <div className="bg-surface rounded-lg px-3 py-2">
                    <p className="text-xs text-textMuted">"নমস্কার! আমি কিভাবে সাহায্য করতে পারি?"</p>
                  </div>
                  <div className="bg-primary/10 rounded-lg px-3 py-2 text-right">
                    <p className="text-xs text-textMuted">"আমার প্রশ্ন আছে পণ্য সম্পর্কে"</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Waveform Visualization */}
            <div className="flex items-center gap-1 py-4">
              {[12, 20, 16, 28, 14, 24, 10, 22, 18, 30, 15, 26, 12, 20, 25, 14, 28, 16, 22, 18].map((height, i) => (
                <div 
                  key={i}
                  className="w-1 bg-primary/60 rounded-full animate-pulse"
                  style={{ 
                    height: `${height}px`,
                    animationDelay: `${i * 0.1}s`
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 * index }}
            className="bg-surface border border-border rounded-2xl p-6 hover:border-primary/30 transition-all"
          >
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
              <feature.icon size={24} weight="duotone" className="text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
            <p className="text-textMuted text-sm leading-relaxed">{feature.description}</p>
          </motion.div>
        ))}
      </div>

      {/* Trust Indicators */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="mt-16 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-3xl p-8 text-center"
      >
        <h3 className="text-xl font-semibold mb-6">Why Our Language AI is Different</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            'Trained on 100M+ Indian conversations',
            '98% accent accuracy in native languages',
            'Real-time dialect adaptation',
          ].map((point, i) => (
            <div key={i} className="flex items-center justify-center gap-3 text-textMuted">
              <Check size={20} weight="bold" className="text-primary flex-shrink-0" />
              <span>{point}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  )
}
