import type { Metadata } from 'next'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Privacy Policy | Voicory',
  description: 'Privacy Policy for Voicory AI Voice Calling Platform',
}

export default function PrivacyPolicyPage() {
  return (
    <>
    <Navbar />
    <main className="min-h-screen bg-background text-textMain py-24">
      <div className="max-w-4xl mx-auto px-6 md:px-8">
        <h1 className="text-4xl md:text-5xl font-bold mb-8">Privacy Policy</h1>
        <p className="text-textMuted mb-8">Last updated: January 2025</p>

        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p className="text-textMuted leading-relaxed">
              Voicory (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. 
              This Privacy Policy explains how we collect, use, disclose, and safeguard your 
              information when you use our AI voice calling platform and related services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>
            <h3 className="text-xl font-medium mb-3">2.1 Personal Information</h3>
            <ul className="list-disc list-inside text-textMuted space-y-2 ml-4">
              <li>Name and contact information (email, phone number)</li>
              <li>Billing information (processed securely via Paddle)</li>
              <li>Company/Organization details</li>
              <li>Account credentials</li>
            </ul>

            <h3 className="text-xl font-medium mb-3 mt-6">2.2 Usage Data</h3>
            <ul className="list-disc list-inside text-textMuted space-y-2 ml-4">
              <li>Call recordings and transcripts (as authorized by you)</li>
              <li>Platform usage analytics</li>
              <li>Device and browser information</li>
              <li>IP address and location data</li>
            </ul>

            <h3 className="text-xl font-medium mb-3 mt-6">2.3 AI Training Data</h3>
            <p className="text-textMuted leading-relaxed">
              Your call data may be used to improve our AI models. You can opt out of this 
              in your account settings. We anonymize all data used for training purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
            <ul className="list-disc list-inside text-textMuted space-y-2 ml-4">
              <li>To provide and maintain our services</li>
              <li>To process payments and billing</li>
              <li>To improve our AI voice technology</li>
              <li>To send service updates and marketing communications</li>
              <li>To comply with legal obligations</li>
              <li>To detect and prevent fraud</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Data Storage and Security</h2>
            <p className="text-textMuted leading-relaxed">
              We use industry-standard security measures including:
            </p>
            <ul className="list-disc list-inside text-textMuted space-y-2 ml-4 mt-3">
              <li>256-bit SSL/TLS encryption for data in transit</li>
              <li>AES-256 encryption for data at rest</li>
              <li>SOC 2 Type II compliant infrastructure</li>
              <li>Regular security audits and penetration testing</li>
              <li>Multi-factor authentication options</li>
            </ul>
            <p className="text-textMuted leading-relaxed mt-4">
              Data is stored on secure servers located in India and may be backed up in 
              other regions for disaster recovery purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Data Sharing</h2>
            <p className="text-textMuted leading-relaxed">
              We do not sell your personal information. We may share data with:
            </p>
            <ul className="list-disc list-inside text-textMuted space-y-2 ml-4 mt-3">
              <li><strong>Paddle.com</strong> — our Merchant of Record for payment processing, invoicing, and tax compliance</li>
              <li>Cloud service providers (Google Cloud, Supabase) for hosting</li>
              <li>AI providers (OpenAI, ElevenLabs) for voice and language processing</li>
              <li>Analytics providers (anonymized data only)</li>
              <li>Law enforcement when legally required</li>
            </ul>
            <p className="text-textMuted leading-relaxed mt-4">
              When you make a purchase, your payment information is collected directly by 
              Paddle. We do not store your full credit card details. Please refer to 
              Paddle&apos;s privacy policy for how they handle your payment data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Your Rights</h2>
            <p className="text-textMuted leading-relaxed mb-4">
              Under applicable data protection laws, you have the right to:
            </p>
            <ul className="list-disc list-inside text-textMuted space-y-2 ml-4">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Delete your data (&quot;Right to be Forgotten&quot;)</li>
              <li>Export your data in a portable format</li>
              <li>Opt out of marketing communications</li>
              <li>Withdraw consent for AI training</li>
            </ul>
            <p className="text-textMuted leading-relaxed mt-4">
              To exercise these rights, contact us at privacy@voicory.com
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Cookies</h2>
            <p className="text-textMuted leading-relaxed">
              We use essential cookies for platform functionality and optional analytics 
              cookies to improve our services. You can manage cookie preferences in your 
              browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Children&apos;s Privacy</h2>
            <p className="text-textMuted leading-relaxed">
              Our services are not intended for users under 18 years of age. We do not 
              knowingly collect information from children.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. International Users</h2>
            <p className="text-textMuted leading-relaxed">
              If you access our services from outside India, your data may be transferred 
              to and processed in India. By using our services, you consent to this transfer.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Changes to This Policy</h2>
            <p className="text-textMuted leading-relaxed">
              We may update this Privacy Policy periodically. We will notify you of 
              significant changes via email or through our platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Contact Us</h2>
            <p className="text-textMuted leading-relaxed">
              For privacy-related questions or concerns:
            </p>
            <div className="mt-4 bg-surface border border-border rounded-xl p-6">
              <p className="text-textMuted">
                <strong className="text-textMain">Email:</strong> privacy@voicory.com
              </p>
              <p className="text-textMuted mt-2">
                <strong className="text-textMain">Address:</strong> Voicory Technologies Pvt. Ltd.<br />
                Bengaluru, Karnataka, India
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
    <Footer />
    </>
  )
}
