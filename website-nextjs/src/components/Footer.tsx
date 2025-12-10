'use client'

import Link from 'next/link'
import { 
  LinkedinLogo, 
  TwitterLogo, 
  EnvelopeSimple,
  WhatsappLogo,
  MapPin,
  Lightning
} from '@phosphor-icons/react'
import { VoicoryLogo } from './VoicoryLogo'

export function Footer() {
  const currentYear = new Date().getFullYear()

  const footerLinks = {
    product: [
      { label: 'Voice Calls', href: '#demo' },
      { label: 'WhatsApp Chatbot', href: '#demo' },
      { label: 'Knowledge Base', href: '#customization' },
      { label: 'Pricing', href: '/pricing' },
    ],
    features: [
      { label: 'Customer Memory', href: '#customization' },
      { label: 'Multi-Language', href: '#languages' },
      { label: 'Voice Library', href: '#customization' },
      { label: 'Analytics', href: '#demo' },
    ],
    integrations: [
      { label: 'Twilio', href: '#demo' },
      { label: 'Vonage', href: '#demo' },
      { label: 'WhatsApp Business', href: '#demo' },
      { label: 'Custom SIP', href: '#demo' },
    ],
    legal: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Refund Policy', href: '/refund' },
    ],
  }

  return (
    <footer className="bg-surface border-t border-border">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-10">
          {/* Brand Column */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <VoicoryLogo size="md" />
            </Link>
            <p className="text-textMuted text-sm mb-5 max-w-xs">
              AI voice & chat agents for India. Build intelligent assistants that handle calls and WhatsApp in Hindi, English & 10+ languages.
            </p>
            
            {/* Contact Info */}
            <div className="space-y-2 text-sm text-textMuted">
              <div className="flex items-center gap-2">
                <EnvelopeSimple size={16} />
                <a href="mailto:support@voicory.com" className="hover:text-primary transition-colors">
                  support@voicory.com
                </a>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={16} />
                <span>India</span>
              </div>
            </div>

            {/* CTA */}
            <Link 
              href="https://app.voicory.com/signup"
              className="inline-flex items-center gap-2 mt-5 bg-primary/10 hover:bg-primary/20 text-primary px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Lightning size={16} weight="fill" />
              Start Free — ₹2000 Credits
            </Link>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="text-textMain font-semibold mb-4 text-sm">Product</h4>
            <ul className="space-y-2.5">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-textMuted hover:text-primary transition-colors text-sm">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Features Links */}
          <div>
            <h4 className="text-textMain font-semibold mb-4 text-sm">Features</h4>
            <ul className="space-y-2.5">
              {footerLinks.features.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-textMuted hover:text-primary transition-colors text-sm">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Integrations Links */}
          <div>
            <h4 className="text-textMain font-semibold mb-4 text-sm">Integrations</h4>
            <ul className="space-y-2.5">
              {footerLinks.integrations.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-textMuted hover:text-primary transition-colors text-sm">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="text-textMain font-semibold mb-4 text-sm">Legal</h4>
            <ul className="space-y-2.5">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-textMuted hover:text-primary transition-colors text-sm">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-textMuted text-sm">
            © {currentYear} Voicory. Made with ❤️ in India.
          </p>
          
          {/* Social Links */}
          <div className="flex items-center gap-4">
            <a
              href="https://twitter.com/voicoryai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-textMuted hover:text-primary transition-colors"
              aria-label="Twitter"
            >
              <TwitterLogo size={20} weight="fill" />
            </a>
            <a
              href="https://linkedin.com/company/voicory"
              target="_blank"
              rel="noopener noreferrer"
              className="text-textMuted hover:text-primary transition-colors"
              aria-label="LinkedIn"
            >
              <LinkedinLogo size={20} weight="fill" />
            </a>
            <a
              href="https://wa.me/919876543210"
              target="_blank"
              rel="noopener noreferrer"
              className="text-textMuted hover:text-primary transition-colors"
              aria-label="WhatsApp"
            >
              <WhatsappLogo size={20} weight="fill" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
