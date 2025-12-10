import type { Metadata } from 'next'
import Link from 'next/link'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Refund Policy | Voicory',
  description: 'Refund Policy for Voicory AI Voice and Chat Platform - Prepaid Credits',
}

export default function RefundPolicyPage() {
  return (
    <>
    <Navbar />
    <main className="min-h-screen bg-background text-textMain py-24">
      <div className="max-w-4xl mx-auto px-6 md:px-8">
        <h1 className="text-4xl md:text-5xl font-bold mb-8">Refund Policy</h1>
        <p className="text-textMuted mb-8">Last updated: December 2025</p>

        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Overview</h2>
            <p className="text-textMuted leading-relaxed">
              Voicory operates on a <strong>prepaid credits</strong> (pay-per-usage) model. 
              You purchase credits in advance, and these credits are consumed as you use 
              our AI voice and chat services. This policy outlines our refund procedures 
              for credit purchases.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Free Credits</h2>
            <p className="text-textMuted leading-relaxed">
              New accounts receive <strong>50 free credits</strong> to test our services. 
              Free credits are promotional and are not eligible for refund or cash value.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Credit Purchase Refunds</h2>
            
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-6 mb-6">
              <h3 className="text-xl font-medium mb-3 text-primary">✅ Eligible for Full Refund</h3>
              <p className="text-textMuted leading-relaxed mb-3">
                You may request a <strong>full refund</strong> if:
              </p>
              <ul className="list-disc list-inside text-textMuted space-y-2 ml-4">
                <li>The request is made within <strong>7 days</strong> of purchase</li>
                <li><strong>No credits</strong> from the package have been used</li>
                <li>This is your first refund request</li>
              </ul>
            </div>

            <div className="bg-surface border border-white/10 rounded-xl p-6 mb-6">
              <h3 className="text-xl font-medium mb-3">❌ NOT Eligible for Refund</h3>
              <p className="text-textMuted leading-relaxed mb-3">
                Refunds are <strong>not available</strong> for:
              </p>
              <ul className="list-disc list-inside text-textMuted space-y-2 ml-4">
                <li>Credit packages where <strong>any credits have been used</strong> (even 1 credit)</li>
                <li>Purchases older than 7 days</li>
                <li>Free or promotional credits</li>
                <li>Bonus credits received from referrals or coupons</li>
                <li>Accounts terminated for Terms of Service violations</li>
                <li>Multiple refund requests (one refund per customer)</li>
              </ul>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-6">
              <h3 className="text-xl font-medium mb-3 text-amber-400">⚠️ Important Note</h3>
              <p className="text-textMuted leading-relaxed">
                Because credits are consumed immediately upon use, we cannot offer partial 
                refunds for partially used packages. Please use your free credits to 
                evaluate our service before making a purchase.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. How to Request a Refund</h2>
            <p className="text-textMuted leading-relaxed mb-4">
              To request a refund, email us at <a href="mailto:support@voicory.com" className="text-primary hover:underline">support@voicory.com</a> with:
            </p>
            <ul className="list-disc list-inside text-textMuted space-y-2 ml-4">
              <li>Your registered email address</li>
              <li>Order/Transaction ID (found in your billing history)</li>
              <li>Reason for refund request</li>
            </ul>
            <p className="text-textMuted leading-relaxed mt-4">
              We will review your request and respond within <strong>2 business days</strong>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Refund Processing</h2>
            <ul className="list-disc list-inside text-textMuted space-y-3 ml-4">
              <li>
                <strong>Processing Time:</strong> Approved refunds are processed within 
                5-10 business days
              </li>
              <li>
                <strong>Refund Method:</strong> Refunds are issued to the original payment 
                method used for the purchase
              </li>
              <li>
                <strong>Payment Processor:</strong> All refunds are processed by 
                <strong> Paddle</strong>, our merchant of record. You will receive a 
                confirmation email from Paddle when the refund is initiated
              </li>
              <li>
                <strong>Currency:</strong> Refunds are issued in the same currency as 
                the original purchase
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Technical Issues</h2>
            <p className="text-textMuted leading-relaxed">
              If you experience technical issues that prevent you from using your credits:
            </p>
            <ul className="list-disc list-inside text-textMuted space-y-2 ml-4 mt-3">
              <li>Contact <a href="mailto:support@voicory.com" className="text-primary hover:underline">support@voicory.com</a> immediately</li>
              <li>We will investigate the issue within 24 hours</li>
              <li>If the issue is on our end, we may offer bonus credits or a refund at our discretion</li>
              <li>Service credits for documented downtime may be offered instead of cash refunds</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Chargebacks & Disputes</h2>
            <p className="text-textMuted leading-relaxed">
              If you have a concern about a charge:
            </p>
            <ul className="list-disc list-inside text-textMuted space-y-2 ml-4 mt-3">
              <li><strong>Contact us first</strong> at support@voicory.com</li>
              <li>We aim to resolve all disputes within 5 business days</li>
              <li>If unresolved, you may contact Paddle&apos;s support</li>
            </ul>
            <p className="text-textMuted leading-relaxed mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <strong>⚠️ Warning:</strong> Initiating a chargeback with your bank without 
              first contacting us will result in <strong>immediate account suspension</strong> 
              and forfeiture of all remaining credits. Please work with us to resolve any issues.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Account Closure</h2>
            <p className="text-textMuted leading-relaxed">
              If you close your Voicory account:
            </p>
            <ul className="list-disc list-inside text-textMuted space-y-2 ml-4 mt-3">
              <li>Any remaining credits will be forfeited</li>
              <li>Unused credits are not refundable after account closure</li>
              <li>We recommend using your credits before closing your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Contact Us</h2>
            <p className="text-textMuted leading-relaxed">
              For refund requests or billing questions:
            </p>
            <ul className="list-disc list-inside text-textMuted space-y-2 ml-4 mt-3">
              <li>Email: <a href="mailto:support@voicory.com" className="text-primary hover:underline">support@voicory.com</a></li>
              <li>Response time: Within 2 business days</li>
            </ul>
          </section>

          <section className="pt-8 border-t border-white/10">
            <p className="text-textMuted text-sm">
              This refund policy is part of our <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>. 
              By purchasing credits, you acknowledge that you have read and agree to this policy.
            </p>
          </section>
        </div>
      </div>
    </main>
    <Footer />
    </>
  )
}
