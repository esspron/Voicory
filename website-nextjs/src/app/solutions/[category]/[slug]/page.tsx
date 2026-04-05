import { Metadata } from 'next'
import Link from 'next/link'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { getSolutionData } from '@/services/vapiService'

interface SolutionPageProps {
  params: Promise<{
    category: string
    slug: string
  }>
}

export async function generateMetadata({ params }: SolutionPageProps): Promise<Metadata> {
  const { category, slug } = await params
  const data = getSolutionData(category, slug)
  
  return {
    title: `${data.title} | Voicory - Voice AI Agents`,
    description: data.description,
    openGraph: {
      title: `${data.title} | Voicory`,
      description: data.description,
    },
  }
}

// Generate static params for common routes
export async function generateStaticParams() {
  const industries = [
    'healthcare', 'financial-services', 'insurance', 'logistics',
    'home-services', 'retail-&-consumer', 'travel-&-hospitality', 'debt-collection'
  ]
  
  const useCases = [
    'lead-qualification', 'ai-customer-service', 'ai-receptionists', 'dispatch-service',
    'ai-answering-service', 'ai-ivr', 'ai-appointment-setter', 'ai-telemarketing', 'ai-call-center'
  ]
  
  const integrations = [
    'cal.com', 'custom-llm', 'make', 'twillio', 'vonage', 'n8n', 'go-high-level'
  ]
  
  const params = [
    ...industries.map(slug => ({ category: 'industry', slug })),
    ...useCases.map(slug => ({ category: 'use-case', slug })),
    ...integrations.map(slug => ({ category: 'integration', slug })),
  ]
  
  return params
}

export default async function SolutionPage({ params }: SolutionPageProps) {
  const { category, slug } = await params
  const data = getSolutionData(category, slug)

  return (
    <div className="min-h-screen bg-background text-textMain overflow-hidden flex flex-col">
      <Navbar />
      
      <main className="flex-1 relative pt-20">
        {/* Background Effect */}
        <div className="absolute inset-0 z-[-1] opacity-30 pointer-events-none">
          <div 
            className="absolute inset-0"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(46, 199, 183, 0.15) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
        </div>

        {/* Ambient Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/5 blur-[100px] rounded-full pointer-events-none" />

        <section className="relative flex w-full flex-col gap-8 pt-14 text-center md:pt-24 xl:pt-[6.5rem] px-6">
          <div className="inline-block mx-auto rounded-full border border-white/20 bg-white/5 backdrop-blur-sm px-4 py-1.5 text-sm text-textMain uppercase tracking-wider">
            {data.category}
          </div>

          <h1 className="px-6 text-balance text-4xl leading-tight tracking-tight md:text-6xl md:leading-tight font-bold max-w-4xl mx-auto">
            AI Voice Solutions for <br />
            <span className="gradient-text">{data.title}</span>
          </h1>

          <p className="text-textMuted text-lg max-w-2xl mx-auto leading-relaxed">
            {data.description}
          </p>

          <div className="mx-auto mt-8 flex flex-wrap gap-4 justify-center">
            <Link 
              href="https://app.voicory.com/signup"
              className="bg-primary hover:bg-primaryHover text-background font-bold py-4 px-8 rounded-full transition-all duration-300 uppercase tracking-wider text-sm hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/25"
            >
              Get Started with {data.title}
            </Link>
            <Link 
              href="#demo"
              className="bg-surface border border-border hover:border-primary/50 text-textMain font-bold py-4 px-8 rounded-full transition-all duration-300 uppercase tracking-wider text-sm"
            >
              Watch Demo
            </Link>
          </div>
        </section>

        {/* Features Section */}
        <section className="max-w-7xl mx-auto px-6 md:px-8 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Why Choose Voicory for {data.title}?
            </h2>
            <p className="text-textMuted text-lg max-w-2xl mx-auto">
              Purpose-built features designed specifically for your industry needs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {data.features.map((feature, i) => (
              <div 
                key={i} 
                className="group bg-surface border border-border rounded-3xl p-8 hover:border-primary/50 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="w-14 h-14 bg-surfaceHover rounded-2xl mb-6 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-4">{feature.title}</h3>
                <p className="text-textMuted leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Stats Section */}
        <section className="max-w-7xl mx-auto px-6 md:px-8 py-16">
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-3xl p-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-4xl md:text-5xl font-bold text-primary mb-2">95%</div>
                <div className="text-textMuted text-sm">Customer Satisfaction</div>
              </div>
              <div>
                <div className="text-4xl md:text-5xl font-bold text-primary mb-2">60%</div>
                <div className="text-textMuted text-sm">Cost Reduction</div>
              </div>
              <div>
                <div className="text-4xl md:text-5xl font-bold text-primary mb-2">24/7</div>
                <div className="text-textMuted text-sm">Availability</div>
              </div>
              <div>
                <div className="text-4xl md:text-5xl font-bold text-primary mb-2">500+</div>
                <div className="text-textMuted text-sm">Businesses Trust Us</div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="max-w-7xl mx-auto px-6 md:px-8 py-16">
          <div className="bg-surface border border-border rounded-3xl p-12 text-center relative overflow-hidden">
            {/* Background glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-primary/10 blur-[80px] rounded-full pointer-events-none" />
            
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to Transform Your {data.title}?
              </h2>
              <p className="text-textMuted text-lg max-w-2xl mx-auto mb-8">
                Start today. Pay only for what you use.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link 
                  href="https://app.voicory.com/signup"
                  className="bg-primary hover:bg-primaryHover text-background font-bold py-4 px-8 rounded-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/25"
                >
                  Get Started
                </Link>
                <Link 
                  href="/contact"
                  className="bg-background border border-border hover:border-primary/50 text-textMain font-bold py-4 px-8 rounded-xl transition-all duration-300"
                >
                  Talk to Sales
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
