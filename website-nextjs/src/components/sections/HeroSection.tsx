'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

const SOUNDWAVE_COLORS = [
  'rgb(97, 245, 180)',   // Green
  'rgb(255, 221, 3)',    // Yellow
  'rgb(255, 250, 233)',  // Off-white
  'rgb(77, 202, 250)',   // Blue
  'rgb(153, 119, 255)',  // Purple
  'rgb(232, 106, 51)',   // Orange
  'rgb(222, 148, 226)',  // Pink
]

function SoundwaveVisualization() {
  const bars = useMemo(() => 
    Array.from({ length: 33 }, (_, i) => ({
      id: i,
      color: SOUNDWAVE_COLORS[Math.floor(Math.random() * SOUNDWAVE_COLORS.length)],
      delay: Math.random() * 2,
    })), 
  [])

  return (
    <div className="pointer-events-none h-[140px] w-full sm:h-[200px] flex items-center justify-center gap-2 sm:gap-3 overflow-hidden">
      {bars.map((bar) => (
        <div
          key={bar.id}
          className="soundwave-bar"
          style={{
            backgroundColor: bar.color,
            animationDelay: `${bar.delay}s`,
          }}
        />
      ))}
    </div>
  )
}

export function HeroSection() {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <section className="relative flex w-full flex-col gap-5 pt-24 md:pt-28 text-center">
      {/* Dotted Background */}
      <div className="absolute inset-0 z-[-1] opacity-30">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(46, 199, 183, 0.15) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      {/* Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Main Heading */}
      <h1 className="px-6 text-balance text-3xl leading-tight tracking-tight md:text-5xl md:leading-tight md:tracking-tighter xl:text-6xl xl:leading-tight font-bold">
        <span>AI Voice & Chat Agents</span>
        <br />
        <span className="gradient-text">Built for India</span>
      </h1>

      {/* Subtitle */}
      <p className="text-textMuted text-base md:text-lg max-w-2xl mx-auto px-6">
        Create intelligent AI assistants for phone calls and WhatsApp in Hindi, English & 10+ Indian languages. 
        Pay-as-you-go pricing starting at ₹0.80/min.
      </p>

      {/* CTA Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 px-6">
        <Link
          href="https://app.voicory.com/signup"
          className="bg-primary hover:bg-primaryHover text-background px-6 py-3 rounded-full text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/25"
        >
          Start Free — ₹100 Credits
        </Link>
        <Link
          href="#demo"
          className="text-textMuted hover:text-textMain border border-border hover:border-textMuted px-6 py-3 rounded-full text-sm font-medium transition-all duration-200"
        >
          Watch Demo
        </Link>
      </div>

      {/* Soundwave Visualization */}
      <div className="relative mt-2">
        <div className="relative mx-auto min-h-[140px] w-full max-w-5xl sm:min-h-[200px]">
          <div className="absolute inset-0 grid place-items-center">
            {/* "Talk to Voicory" Button */}
            <div className="flex flex-col gap-4 relative z-10">
              <button
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className="group flex text-center justify-center items-center rounded-full transition-all duration-300 uppercase active:scale-95 bg-textMain border border-border text-background hover:bg-background hover:border-textMain hover:text-textMain px-5 py-2 tracking-wider font-mono font-medium h-12 w-[11rem] gap-3 sm:h-16 sm:w-[16rem] sm:gap-4 sm:text-base relative after:absolute after:rounded-full after:border after:border-white/50 after:-inset-2 sm:after:-inset-3"
              >
                <span className="relative grid text-nowrap text-xs sm:text-sm">
                  <span className={`col-start-1 row-start-1 block transition-opacity duration-250 ${isHovered ? 'opacity-0' : 'opacity-100'}`}>
                    Talk to Voicory
                  </span>
                  <span className={`col-start-1 row-start-1 transition-opacity duration-250 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                    Try Live Demo
                  </span>
                </span>
              </button>
            </div>
          </div>

          {/* Animated Soundwave */}
          <SoundwaveVisualization />
        </div>
      </div>

      {/* Trust Badges */}
      <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6 px-6 pb-4">
        <div className="flex items-center gap-2 text-textMuted text-xs sm:text-sm">
          <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>No credit card required</span>
        </div>
        <div className="flex items-center gap-2 text-textMuted text-xs sm:text-sm">
          <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>Setup in 5 minutes</span>
        </div>
        <div className="flex items-center gap-2 text-textMuted text-xs sm:text-sm">
          <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>Works with Twilio & WhatsApp</span>
        </div>
      </div>
    </section>
  )
}
