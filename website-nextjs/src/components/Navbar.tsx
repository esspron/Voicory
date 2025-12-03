'use client'

import Link from 'next/link'
import { useState } from 'react'
import { List, X, CaretDown, ArrowRight } from '@phosphor-icons/react'
import { VoicoryLogo } from './VoicoryLogo'

const industries = [
  "Healthcare", "Financial Services", "Insurance", "Logistics", 
  "Home Services", "Retail & Consumer", "Travel & Hospitality", "Debt Collection"
]

const useCases = [
  "Lead Qualification", "AI Customer Service", "AI Receptionists", "Dispatch Service",
  "AI Answering Service", "AI IVR", "AI Appointment Setter", 
  "AI Telemarketing", "AI Call Center"
]

const integrations = [
  "Cal.com", "Custom LLM", "Make", "Twillio", "Vonage", "n8n", "Go High Level"
]

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [isSolutionsOpen, setIsSolutionsOpen] = useState(false)

  const navLinks = [
    { href: '#features', label: 'Features' },
    { href: '#pricing', label: 'Pricing' },
    { href: '/docs', label: 'Docs', external: true },
  ]

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass">
      <nav className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <VoicoryLogo size="md" />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-textMuted hover:text-textMain transition-colors text-xs font-medium font-mono uppercase tracking-wider px-4 py-2"
              >
                {link.label}
                {link.external && (
                  <svg className="inline h-3 w-3 ml-1 opacity-60" fill="none" viewBox="0 0 16 17" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12.3359 10.5007V3.83398H5.66927M4.33594 11.834L12.173 3.99695" stroke="currentColor" strokeLinecap="square" />
                  </svg>
                )}
              </Link>
            ))}

            {/* Solutions Dropdown */}
            <div 
              className="relative"
              onMouseEnter={() => setIsSolutionsOpen(true)}
              onMouseLeave={() => setIsSolutionsOpen(false)}
            >
              <button className="flex items-center gap-1 text-textMuted hover:text-textMain transition-colors text-xs font-medium font-mono uppercase tracking-wider px-4 py-2">
                Solutions
                <CaretDown 
                  size={14} 
                  weight="bold"
                  className={`transition-transform duration-200 ${isSolutionsOpen ? 'rotate-180' : ''}`} 
                />
              </button>

              {/* Dropdown Menu */}
              <div className={`absolute top-full left-1/2 -translate-x-1/2 w-[900px] bg-surface border border-border rounded-2xl shadow-2xl p-6 transition-all duration-200 origin-top ${isSolutionsOpen ? 'opacity-100 scale-100 visible' : 'opacity-0 scale-95 invisible'}`}>
                <div className="grid grid-cols-12 gap-8">
                  {/* Left Cards */}
                  <div className="col-span-3 flex flex-col gap-4">
                    <Link href="/partners" className="bg-surfaceHover p-4 rounded-xl border border-border hover:border-primary/50 transition-colors cursor-pointer group">
                      <div className="w-10 h-10 bg-border rounded-lg flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                        <span className="text-xl">🎓</span>
                      </div>
                      <h4 className="text-textMain font-bold mb-1 normal-case text-sm">Find A Certified Partner</h4>
                      <p className="text-textMuted text-[10px] normal-case leading-relaxed">Don&apos;t know how to implement voice AI. Find an expert!</p>
                    </Link>
                    <Link href="/app-partners" className="bg-surfaceHover p-4 rounded-xl border border-border hover:border-primary/50 transition-colors cursor-pointer group">
                      <div className="w-10 h-10 bg-border rounded-lg flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                        <span className="text-xl">🤝</span>
                      </div>
                      <h4 className="text-textMain font-bold mb-1 normal-case text-sm">App Partners</h4>
                      <p className="text-textMuted text-[10px] normal-case leading-relaxed">VOIP companies and voice AI platforms collaborate with Voicory.</p>
                    </Link>
                  </div>

                  {/* Industries */}
                  <div className="col-span-3">
                    <h3 className="text-textMuted text-xs font-bold mb-4 tracking-widest">INDUSTRIES</h3>
                    <ul className="space-y-3">
                      {industries.map(item => (
                        <li key={item}>
                          <Link 
                            href={`/solutions/industry/${item.toLowerCase().replace(/ /g, '-')}`} 
                            className="text-textMain hover:text-primary text-sm normal-case block transition-colors"
                          >
                            {item}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Use Cases */}
                  <div className="col-span-3">
                    <h3 className="text-textMuted text-xs font-bold mb-4 tracking-widest">USE CASES</h3>
                    <ul className="space-y-3">
                      {useCases.map(item => (
                        <li key={item}>
                          <Link 
                            href={`/solutions/use-case/${item.toLowerCase().replace(/ /g, '-')}`} 
                            className="text-textMain hover:text-primary text-sm normal-case block transition-colors"
                          >
                            {item}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Integrations */}
                  <div className="col-span-3">
                    <h3 className="text-textMuted text-xs font-bold mb-4 tracking-widest">INTEGRATIONS</h3>
                    <ul className="space-y-3 mb-4">
                      {integrations.map(item => (
                        <li key={item}>
                          <Link 
                            href={`/solutions/integration/${item.toLowerCase().replace(/ /g, '-')}`} 
                            className="text-textMain hover:text-primary text-sm normal-case block transition-colors"
                          >
                            {item}
                          </Link>
                        </li>
                      ))}
                    </ul>
                    <Link 
                      href="/integrations" 
                      className="inline-flex items-center gap-1 text-xs border border-border rounded-lg px-3 py-2 text-textMain hover:bg-surfaceHover transition-colors normal-case"
                    >
                      See All Integrations
                      <ArrowRight size={12} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <Link
              href="#community"
              className="text-textMuted hover:text-textMain transition-colors text-xs font-medium font-mono uppercase tracking-wider px-4 py-2"
            >
              Community
            </Link>
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="https://app.voicory.com/login"
              className="text-textMuted hover:text-textMain transition-colors text-sm font-medium"
            >
              Sign In
            </Link>
            <Link
              href="https://app.voicory.com/signup"
              className="bg-primary hover:bg-primaryHover text-background px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5"
            >
              Get Started Free
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden p-2 text-textMuted hover:text-textMain"
          >
            {isOpen ? <X size={24} /> : <List size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="lg:hidden mt-4 pb-4 border-t border-border pt-4">
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-textMuted hover:text-textMain transition-colors text-sm font-medium"
                  onClick={() => setIsOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              
              {/* Mobile Solutions Accordion */}
              <div className="border-t border-border pt-4">
                <button 
                  onClick={() => setIsSolutionsOpen(!isSolutionsOpen)}
                  className="flex items-center justify-between w-full text-textMuted hover:text-textMain text-sm font-medium"
                >
                  Solutions
                  <CaretDown size={16} className={`transition-transform ${isSolutionsOpen ? 'rotate-180' : ''}`} />
                </button>
                {isSolutionsOpen && (
                  <div className="mt-4 space-y-4 pl-4">
                    <div>
                      <h4 className="text-xs text-textMuted uppercase tracking-wider mb-2">Industries</h4>
                      <div className="flex flex-wrap gap-2">
                        {industries.slice(0, 4).map(item => (
                          <Link 
                            key={item}
                            href={`/solutions/industry/${item.toLowerCase().replace(/ /g, '-')}`}
                            className="text-xs bg-surface px-3 py-1 rounded-lg hover:text-primary"
                            onClick={() => setIsOpen(false)}
                          >
                            {item}
                          </Link>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs text-textMuted uppercase tracking-wider mb-2">Use Cases</h4>
                      <div className="flex flex-wrap gap-2">
                        {useCases.slice(0, 4).map(item => (
                          <Link 
                            key={item}
                            href={`/solutions/use-case/${item.toLowerCase().replace(/ /g, '-')}`}
                            className="text-xs bg-surface px-3 py-1 rounded-lg hover:text-primary"
                            onClick={() => setIsOpen(false)}
                          >
                            {item}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Link
                href="#community"
                className="text-textMuted hover:text-textMain transition-colors text-sm font-medium"
                onClick={() => setIsOpen(false)}
              >
                Community
              </Link>

              <div className="flex flex-col gap-3 mt-4 border-t border-border pt-4">
                <Link
                  href="https://app.voicory.com/login"
                  className="text-textMuted hover:text-textMain transition-colors text-sm font-medium text-center"
                >
                  Sign In
                </Link>
                <Link
                  href="https://app.voicory.com/signup"
                  className="bg-primary hover:bg-primaryHover text-background px-5 py-2.5 rounded-full text-sm font-semibold transition-all text-center"
                >
                  Get Started Free
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}
