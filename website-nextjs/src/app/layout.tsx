import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { GoogleAnalytics } from '@/components/GoogleAnalytics'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  preload: true,
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0E0E13',
}

export const metadata: Metadata = {
  metadataBase: new URL('https://www.voicory.com'),
  title: {
    default: 'Voicory - AI Voice & Chat Agents for India | Hindi, English & 10+ Languages',
    template: '%s | Voicory',
  },
  description: 'Build intelligent AI voice agents and WhatsApp chatbots that speak Hindi, English, and 10+ Indian languages. Pay-as-you-go pricing starting at $0.03/min for voice calls. Perfect for customer support, appointment booking, and lead qualification.',
  keywords: [
    'voice AI India',
    'AI voice agent',
    'Hindi AI chatbot',
    'WhatsApp AI bot India',
    'customer service AI',
    'voice bot Hindi',
    'AI phone calls',
    'Twilio AI India',
    'conversational AI',
    'voice automation',
    'AI assistant India',
    'multilingual AI',
    'AI customer support',
    'voice AI platform',
    'AI calling software',
  ],
  authors: [{ name: 'Voicory', url: 'https://www.voicory.com' }],
  creator: 'Voicory',
  publisher: 'Voicory',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: 'https://www.voicory.com',
  },
  openGraph: {
    title: 'Voicory - AI Voice & Chat Agents for India',
    description: 'Build intelligent AI voice agents that speak Hindi, English & 10+ Indian languages. AI voice and chat agents for India. Pay as you go.',
    url: 'https://www.voicory.com',
    siteName: 'Voicory',
    locale: 'en_IN',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Voicory - AI Voice & Chat Agents for India',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Voicory - AI Voice & Chat Agents for India',
    description: 'Build AI voice agents that speak Hindi, English & 10+ Indian languages. Start free!',
    images: ['/og-image.png'],
    creator: '@voicory',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
  category: 'technology',
}

// JSON-LD structured data for SEO
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Voicory',
  description: 'AI Voice & Chat Agents for India - Build intelligent voice bots that speak Hindi, English & 10+ Indian languages',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '0.03',
    priceCurrency: 'USD',
    priceValidUntil: '2026-12-31',
    availability: 'https://schema.org/InStock',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    ratingCount: '127',
  },
  provider: {
    '@type': 'Organization',
    name: 'Voicory',
    url: 'https://www.voicory.com',
    logo: 'https://www.voicory.com/logo.png',
    sameAs: [
      'https://twitter.com/voicory',
      'https://linkedin.com/company/voicory',
    ],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* Preconnect to external domains for faster loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        
        {/* DNS prefetch for analytics */}
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />
        
        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={inter.className}>
        <GoogleAnalytics />
        {children}
      </body>
    </html>
  )
}
