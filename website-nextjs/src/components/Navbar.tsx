'use client'

import Link from 'next/link'
import { useState } from 'react'
import { List, X } from '@phosphor-icons/react'
import { VoicoryLogo } from './VoicoryLogo'

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)

  const navLinks = [
    { href: '#features', label: 'Features' },
    { href: '/pricing', label: 'Pricing' },
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

            <Link
              href="mailto:support@voicory.com"
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
              
              <Link
                href="mailto:support@voicory.com"
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
