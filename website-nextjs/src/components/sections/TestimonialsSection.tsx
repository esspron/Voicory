'use client'

import { motion } from 'framer-motion'
import { Star, Quotes, Buildings, Users, Phone } from '@phosphor-icons/react'

const testimonials = [
  {
    id: 1,
    quote: "Voicory reduced our customer support costs by 60% while improving response times. The Hindi voice quality is incredible!",
    author: "Priya Sharma",
    role: "Head of Operations",
    company: "QuickKart",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face",
    stats: { calls: "50K+", savings: "60%" },
  },
  {
    id: 2,
    quote: "We handle 10,000+ appointment bookings monthly through Voicory. Our patients love the natural Hindi conversations.",
    author: "Dr. Rajesh Patel",
    role: "Founder",
    company: "HealthFirst Clinics",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
    stats: { calls: "10K+", savings: "45%" },
  },
  {
    id: 3,
    quote: "The WhatsApp integration is a game-changer. We qualify leads 24/7 without hiring additional staff.",
    author: "Anita Desai",
    role: "Marketing Director",
    company: "PropSquare",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&crop=face",
    stats: { calls: "25K+", savings: "70%" },
  },
]

const stats = [
  { icon: Phone, value: "2M+", label: "Conversations Handled" },
  { icon: Users, value: "500+", label: "Active Businesses" },
  { icon: Buildings, value: "15+", label: "Industries Served" },
]

export function TestimonialsSection() {
  return (
    <section className="w-full max-w-7xl mx-auto px-6 md:px-8 py-12 md:py-16">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <span className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-4">
          <Star size={16} weight="fill" />
          Trusted by 500+ Businesses
        </span>
        <h2 className="text-3xl md:text-4xl font-bold mb-3">
          Real Results from Real Customers
        </h2>
        <p className="text-textMuted text-base max-w-2xl mx-auto">
          See how Indian businesses are transforming their customer experience with Voicory.
        </p>
      </motion.div>

      {/* Stats Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex flex-wrap justify-center gap-8 mb-12"
      >
        {stats.map((stat) => (
          <div key={stat.label} className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <stat.icon size={20} weight="duotone" className="text-primary" />
              <span className="text-3xl font-bold gradient-text">{stat.value}</span>
            </div>
            <span className="text-sm text-textMuted">{stat.label}</span>
          </div>
        ))}
      </motion.div>

      {/* Testimonial Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {testimonials.map((testimonial, index) => (
          <motion.div
            key={testimonial.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 * index }}
            className="relative bg-surface border border-border rounded-2xl p-6 hover:border-primary/30 transition-all group"
          >
            {/* Quote Icon */}
            <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Quotes size={48} weight="fill" className="text-primary" />
            </div>

            {/* Stars */}
            <div className="flex gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={16} weight="fill" className="text-amber-400" />
              ))}
            </div>

            {/* Quote */}
            <p className="text-textMain text-sm leading-relaxed mb-6 relative z-10">
              "{testimonial.quote}"
            </p>

            {/* Stats Badges */}
            <div className="flex gap-2 mb-4">
              <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-lg">
                {testimonial.stats.calls} calls/mo
              </span>
              <span className="px-2 py-1 bg-green-500/10 text-green-400 text-xs rounded-lg">
                {testimonial.stats.savings} cost saved
              </span>
            </div>

            {/* Author */}
            <div className="flex items-center gap-3">
              <img
                src={testimonial.avatar}
                alt={testimonial.author}
                className="w-12 h-12 rounded-full object-cover border-2 border-border"
              />
              <div>
                <div className="font-semibold text-textMain text-sm">{testimonial.author}</div>
                <div className="text-xs text-textMuted">
                  {testimonial.role}, {testimonial.company}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Company Logos */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="text-center"
      >
        <p className="text-textMuted text-sm mb-6">Powering conversations for companies across India</p>
        <div className="flex flex-wrap justify-center items-center gap-8 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
          {/* Placeholder company logos - stylized text */}
          {['QuickKart', 'HealthFirst', 'PropSquare', 'TechGrowth', 'EduLearn', 'FinServe'].map((company) => (
            <div 
              key={company}
              className="text-textMuted font-semibold text-lg tracking-wide"
            >
              {company}
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  )
}
