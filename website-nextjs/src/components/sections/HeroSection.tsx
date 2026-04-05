'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

// Reduced to 15 bars for better performance (was 33)
const SOUNDWAVE_BARS = [
  { color: 'rgb(97, 245, 180)', delay: 0.2 },
  { color: 'rgb(255, 221, 3)', delay: 0.8 },
  { color: 'rgb(77, 202, 250)', delay: 0.4 },
  { color: 'rgb(153, 119, 255)', delay: 1.2 },
  { color: 'rgb(232, 106, 51)', delay: 0.6 },
  { color: 'rgb(222, 148, 226)', delay: 1.0 },
  { color: 'rgb(255, 250, 233)', delay: 0.3 },
  { color: 'rgb(97, 245, 180)', delay: 1.5 },
  { color: 'rgb(77, 202, 250)', delay: 0.7 },
  { color: 'rgb(255, 221, 3)', delay: 1.1 },
  { color: 'rgb(153, 119, 255)', delay: 0.5 },
  { color: 'rgb(232, 106, 51)', delay: 1.8 },
  { color: 'rgb(222, 148, 226)', delay: 0.9 },
  { color: 'rgb(255, 250, 233)', delay: 1.4 },
  { color: 'rgb(97, 245, 180)', delay: 0.1 },
  { color: 'rgb(77, 202, 250)', delay: 1.6 },
  { color: 'rgb(255, 221, 3)', delay: 0.35 },
  { color: 'rgb(153, 119, 255)', delay: 1.3 },
  { color: 'rgb(232, 106, 51)', delay: 0.55 },
  { color: 'rgb(222, 148, 226)', delay: 1.7 },
  { color: 'rgb(255, 250, 233)', delay: 0.25 },
  { color: 'rgb(97, 245, 180)', delay: 0.85 },
  { color: 'rgb(77, 202, 250)', delay: 1.9 },
  { color: 'rgb(255, 221, 3)', delay: 0.45 },
  { color: 'rgb(153, 119, 255)', delay: 1.05 },
  { color: 'rgb(232, 106, 51)', delay: 0.65 },
  { color: 'rgb(222, 148, 226)', delay: 1.25 },
  { color: 'rgb(255, 250, 233)', delay: 0.75 },
  { color: 'rgb(97, 245, 180)', delay: 1.45 },
  { color: 'rgb(77, 202, 250)', delay: 0.15 },
]

function SoundwaveVisualization() {
  return (
    <div className="pointer-events-none h-[140px] w-full sm:h-[200px] flex items-center justify-center gap-3 sm:gap-4 overflow-hidden">
      {SOUNDWAVE_BARS.map((bar, i) => (
        <div
          key={i}
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
    <section className="relative flex w-full flex-col pt-28 md:pt-36 lg:pt-40 text-center">
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
      <h1 className="px-6 text-balance text-4xl leading-[1.1] tracking-tight md:text-5xl lg:text-6xl xl:text-7xl font-bold">
        <span>AI Voice & Chat Agents</span>
        <br />
        <span className="gradient-text">Built for India</span>
      </h1>

      {/* Subtitle */}
      <p className="text-textMuted text-base md:text-lg lg:text-xl max-w-2xl mx-auto px-6 mt-6 md:mt-8">
        Create intelligent AI assistants for phone calls and WhatsApp in Hindi, English & 10+ Indian languages. 
        Pay-as-you-go pricing starting at ₹0.80/min.
      </p>

      {/* CTA Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 px-6 mt-8 md:mt-10">
        <Link
          href="https://app.voicory.com/signup"
          className="bg-primary hover:bg-primaryHover text-background px-8 py-3.5 rounded-full text-sm md:text-base font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/25"
        >
          Get Started Free
        </Link>
        <Link
          href="#demo"
          className="text-textMuted hover:text-textMain border border-border hover:border-textMuted px-8 py-3.5 rounded-full text-sm md:text-base font-medium transition-all duration-200"
        >
          Watch Demo
        </Link>
      </div>

      {/* Soundwave Visualization */}
      <div className="relative mt-10 md:mt-14">
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
      <div className="flex flex-wrap justify-center items-center gap-6 sm:gap-8 px-6 mt-8 md:mt-10">
        <div className="flex items-center gap-2 text-textMuted text-sm">
          <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>No commitments</span>
        </div>
        <div className="flex items-center gap-2 text-textMuted text-sm">
          <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>Setup in 5 minutes</span>
        </div>
        <div className="flex items-center gap-2 text-textMuted text-sm">
          <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>Works with Twilio & WhatsApp</span>
        </div>
      </div>

      {/* Dashboard Preview Image */}
      <div className="relative mt-16 md:mt-20 lg:mt-24 mb-8 px-4 sm:px-6 max-w-6xl mx-auto w-full">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent blur-3xl rounded-full" />
        <div className="relative">
          {/* Browser Frame */}
          <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
            {/* Browser Header */}
            <div className="bg-surface/80 border-b border-border px-4 py-3 flex items-center gap-3">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <div className="flex-1 max-w-md">
                <div className="bg-background/50 rounded-lg px-4 py-1.5 text-xs text-textMuted flex items-center gap-2">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  app.voicory.com
                </div>
              </div>
            </div>
            {/* Dashboard Content */}
            <div className="relative bg-background overflow-hidden">
              <Image 
                src="/dashboard-screenshot.png" 
                alt="Voicory Dashboard - AI Voice & Chat Analytics"
                width={1920}
                height={1080}
                priority
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1152px"
                className="w-full h-auto"
              />
              {/* Overlay UI Elements */}
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
              
              {/* Floating Cards */}
              <div className="absolute top-4 left-4 bg-surface/90 backdrop-blur-xl border border-border rounded-xl p-3 shadow-xl animate-float" style={{ animationDelay: '0s' }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-[10px] text-textMuted">Active Calls</div>
                    <div className="text-lg font-bold text-textMain">127</div>
                  </div>
                </div>
              </div>
              
              <div className="absolute top-4 right-4 bg-surface/90 backdrop-blur-xl border border-border rounded-xl p-3 shadow-xl animate-float" style={{ animationDelay: '0.5s' }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-[10px] text-textMuted">Success Rate</div>
                    <div className="text-lg font-bold text-primary">94.7%</div>
                  </div>
                </div>
              </div>
              
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-surface/90 backdrop-blur-xl border border-primary/30 rounded-xl p-4 shadow-xl animate-float" style={{ animationDelay: '1s' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-background" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z"/>
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs text-textMuted">WhatsApp Connected</div>
                    <div className="text-sm font-semibold text-textMain">2,847 conversations today</div>
                  </div>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
