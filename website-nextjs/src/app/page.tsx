import dynamic from 'next/dynamic'
import { HeroSection } from '@/components/sections/HeroSection'
import { Navbar } from '@/components/Navbar'

// Dynamic imports for below-the-fold content - improves initial load time
const LanguageSection = dynamic(() => import('@/components/sections/LanguageSection').then(mod => ({ default: mod.LanguageSection })), {
  loading: () => <div className="min-h-[400px]" />,
})
const CustomizationSection = dynamic(() => import('@/components/sections/CustomizationSection').then(mod => ({ default: mod.CustomizationSection })), {
  loading: () => <div className="min-h-[400px]" />,
})
const TestimonialsSection = dynamic(() => import('@/components/sections/TestimonialsSection').then(mod => ({ default: mod.TestimonialsSection })), {
  loading: () => <div className="min-h-[400px]" />,
})
const PricingSection = dynamic(() => import('@/components/sections/PricingSection').then(mod => ({ default: mod.PricingSection })), {
  loading: () => <div className="min-h-[600px]" />,
})
const Footer = dynamic(() => import('@/components/Footer').then(mod => ({ default: mod.Footer })), {
  loading: () => <div className="min-h-[200px]" />,
})

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-textMain overflow-hidden">
      <Navbar />
      <HeroSection />
      <LanguageSection />
      <CustomizationSection />
      <TestimonialsSection />
      <PricingSection />
      <Footer />
    </main>
  )
}
