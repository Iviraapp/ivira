import { useState } from 'react'
import LegalLayout, { legalStyles as S } from '../../components/LegalLayout'

// ── Geo Detection ──────────────────────────────────────────
const TZ_TO_REGION = {
  'Asia/Kolkata': 'IN', 'Asia/Calcutta': 'IN', 'Asia/Colombo': 'IN',
  'America/New_York': 'US', 'America/Chicago': 'US', 'America/Denver': 'US',
  'America/Los_Angeles': 'US', 'America/Phoenix': 'US',
  'Europe/London': 'GB', 'Europe/Belfast': 'GB',
  'Asia/Dubai': 'AE', 'Asia/Muscat': 'AE',
  'Europe/Berlin': 'EU', 'Europe/Paris': 'EU', 'Europe/Rome': 'EU',
  'Europe/Madrid': 'EU', 'Europe/Amsterdam': 'EU', 'Europe/Brussels': 'EU',
  'Australia/Sydney': 'AU', 'Australia/Melbourne': 'AU',
  'America/Toronto': 'CA', 'America/Vancouver': 'CA',
  'Asia/Singapore': 'SG',
}

function detectRegion() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    return TZ_TO_REGION[tz] || 'GLOBAL'
  } catch { return 'GLOBAL' }
}

const REGION_LABELS = {
  IN: 'India', US: 'United States', GB: 'United Kingdom', AE: 'UAE',
  EU: 'European Union', AU: 'Australia', CA: 'Canada', SG: 'Singapore', GLOBAL: 'Global',
}

const REGIONS = ['IN', 'US', 'GB', 'AE', 'EU', 'AU', 'CA', 'SG', 'GLOBAL']

// ── Region-Specific Config ─────────────────────────────────
const GEO_CONFIG = {
  IN: {
    currency: 'Indian Rupees (INR)',
    tax: 'GST (18%)',
    paymentProcessor: 'Razorpay',
    jurisdiction: 'the laws of India',
    court: 'the High Court of Karnataka, Bengaluru',
    disputeBody: 'mediation under the Arbitration and Conciliation Act 1996',
    consumerLaw: 'Consumer Protection Act 2019',
    dataLaw: 'DPDP Act 2023',
    cooling: '7 days from subscription activation',
  },
  US: {
    currency: 'US Dollars (USD)',
    tax: 'applicable state/local sales tax',
    paymentProcessor: 'Stripe',
    jurisdiction: 'the laws of the State of Delaware, United States',
    court: 'the federal and state courts located in Delaware',
    disputeBody: 'binding arbitration under the American Arbitration Association (AAA) rules',
    consumerLaw: 'applicable state consumer protection statutes',
    dataLaw: 'CCPA and applicable state privacy laws',
    cooling: '14 days from subscription activation (full refund)',
  },
  GB: {
    currency: 'British Pounds (GBP)',
    tax: 'VAT (20%)',
    paymentProcessor: 'Stripe',
    jurisdiction: 'the laws of England and Wales',
    court: 'the courts of England and Wales',
    disputeBody: 'mediation through a CEDR-accredited mediator',
    consumerLaw: 'Consumer Rights Act 2015',
    dataLaw: 'UK GDPR & Data Protection Act 2018',
    cooling: '14 days from subscription activation (Consumer Contracts Regulations 2013)',
  },
  EU: {
    currency: 'Euros (EUR)',
    tax: 'VAT (applicable local rate)',
    paymentProcessor: 'Stripe',
    jurisdiction: 'the laws of the Republic of Ireland',
    court: 'the courts of Dublin, Ireland',
    disputeBody: 'the EU Online Dispute Resolution platform (https://ec.europa.eu/odr)',
    consumerLaw: 'EU Consumer Rights Directive 2011/83/EU',
    dataLaw: 'GDPR',
    cooling: '14 days from subscription activation (EU Consumer Rights Directive)',
  },
  AE: {
    currency: 'UAE Dirhams (AED)',
    tax: 'VAT (5%)',
    paymentProcessor: 'Stripe / Network International',
    jurisdiction: 'the laws of the United Arab Emirates',
    court: 'the Dubai International Financial Centre (DIFC) Courts',
    disputeBody: 'mediation through the Dubai Courts\' Mediation Centre',
    consumerLaw: 'UAE Consumer Protection Law (Federal Law No. 15 of 2020)',
    dataLaw: 'UAE Federal Decree-Law No. 45 of 2021',
    cooling: '7 days from subscription activation',
  },
  AU: {
    currency: 'Australian Dollars (AUD)',
    tax: 'GST (10%)',
    paymentProcessor: 'Stripe',
    jurisdiction: 'the laws of New South Wales, Australia',
    court: 'the courts of New South Wales',
    disputeBody: 'mediation through the Australian Disputes Centre (ADC)',
    consumerLaw: 'Australian Consumer Law (Schedule 2 of the Competition and Consumer Act 2010)',
    dataLaw: 'Privacy Act 1988',
    cooling: '14 days from subscription activation',
  },
  CA: {
    currency: 'Canadian Dollars (CAD)',
    tax: 'applicable federal/provincial sales tax (GST/HST/PST)',
    paymentProcessor: 'Stripe',
    jurisdiction: 'the laws of the Province of Ontario, Canada',
    court: 'the courts of Toronto, Ontario',
    disputeBody: 'mediation through ADR Institute of Canada',
    consumerLaw: 'Consumer Protection Act, 2002 (Ontario)',
    dataLaw: 'PIPEDA',
    cooling: '14 days from subscription activation',
  },
  SG: {
    currency: 'Singapore Dollars (SGD)',
    tax: 'GST (9%)',
    paymentProcessor: 'Stripe',
    jurisdiction: 'the laws of Singapore',
    court: 'the courts of Singapore',
    disputeBody: 'mediation through the Singapore Mediation Centre (SMC)',
    consumerLaw: 'Consumer Protection (Fair Trading) Act (CPFTA)',
    dataLaw: 'PDPA 2012',
    cooling: '7 days from subscription activation',
  },
  GLOBAL: {
    currency: 'US Dollars (USD)',
    tax: 'applicable local taxes',
    paymentProcessor: 'Stripe / Razorpay',
    jurisdiction: 'the laws of the Republic of India',
    court: 'the High Court of Karnataka, Bengaluru',
    disputeBody: 'mediation within a 30-day window',
    consumerLaw: 'applicable local consumer protection laws',
    dataLaw: 'applicable local data protection laws',
    cooling: '14 days from subscription activation',
  },
}

export default function Terms() {
  const [region, setRegion] = useState(() => detectRegion())
  const geo = GEO_CONFIG[region] || GEO_CONFIG.GLOBAL

  return (
    <LegalLayout title="Terms of Service" documentTitle="Terms of Service | IVIRA">
      <p style={S.p}>
        <strong>Last updated:</strong> March 2026
      </p>

      {/* Region selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, color: '#888' }}>Showing terms for:</span>
        <select
          value={region}
          onChange={e => setRegion(e.target.value)}
          style={{
            fontSize: 13, fontWeight: 600, color: '#EDEDED',
            background: '#1A1A1A', border: '1px solid #333', borderRadius: 6,
            padding: '5px 10px', cursor: 'pointer', outline: 'none',
          }}
        >
          {REGIONS.map(r => (
            <option key={r} value={r}>{REGION_LABELS[r]}</option>
          ))}
        </select>
      </div>

      <h2 style={S.h2}>1. Acceptance of Terms</h2>
      <p style={S.p}>
        By accessing or using the IVIRA platform, you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not use our services.
      </p>
      {(region === 'EU' || region === 'GB') && (
        <p style={S.p}>
          Nothing in these terms affects your statutory rights as a consumer under {geo.consumerLaw}.
        </p>
      )}

      <h2 style={S.h2}>2. Service Description</h2>
      <p style={S.p}>
        IVIRA is a Software-as-a-Service (SaaS) platform for fitness and gym management, offering tools for member management, check-ins, payments, nutrition tracking, AI coaching, training facility discovery, and analytics.
      </p>
      <p style={S.p}>Service tiers:</p>
      <ul style={S.ul}>
        <li style={S.li}><strong>Starter</strong> &mdash; up to 100 members, core gym management features</li>
        <li style={S.li}><strong>Growth</strong> &mdash; up to 500 members, advanced analytics, AI coaching, and priority support</li>
        <li style={S.li}><strong>Pro</strong> &mdash; up to 2,000 members, full feature set including marketplace, API access, and dedicated account manager</li>
      </ul>

      <h2 style={S.h2}>3. Service Level Agreement (SLA)</h2>
      <ul style={S.ul}>
        <li style={S.li}><strong>Uptime guarantee:</strong> 99.5% (excluding scheduled maintenance)</li>
        <li style={S.li}><strong>Scheduled maintenance:</strong> Sundays 2:00&ndash;5:00 AM {region === 'IN' ? 'IST' : region === 'US' ? 'ET' : region === 'GB' ? 'GMT/BST' : region === 'EU' ? 'CET' : region === 'AE' ? 'GST' : region === 'AU' ? 'AEST' : region === 'SG' ? 'SGT' : 'UTC'} with 48-hour advance notice</li>
        <li style={S.li}><strong>Credit policy:</strong> 5% of monthly fee per hour of unplanned downtime (maximum 30% credit)</li>
        <li style={S.li}><strong>Force majeure:</strong> SLA excludes outages caused by events beyond reasonable control</li>
      </ul>

      <h2 style={S.h2}>4. Account &amp; Data Ownership</h2>
      <ul style={S.ul}>
        <li style={S.li}>Gym owners retain full ownership of their member data</li>
        <li style={S.li}>IVIRA retains platform analytics data in anonymized form</li>
        <li style={S.li}>Data export is available on request and will be delivered within 7 business days</li>
        <li style={S.li}>Your data is processed in accordance with {geo.dataLaw}</li>
      </ul>

      <h2 style={S.h2}>5. Payment Terms</h2>
      <ul style={S.ul}>
        <li style={S.li}>All amounts are in {geo.currency}, inclusive of {geo.tax}</li>
        <li style={S.li}>Payments are processed via {geo.paymentProcessor}</li>
        <li style={S.li}>Annual billing is the default; monthly payment is available at a 15% premium</li>
        <li style={S.li}>Subscriptions auto-renew unless cancelled with 30 days' written notice</li>
        {(region === 'EU' || region === 'GB') && (
          <li style={S.li}><strong>Cooling-off period:</strong> You have the right to cancel within {geo.cooling} for a full refund under {geo.consumerLaw}</li>
        )}
        {region === 'US' && (
          <li style={S.li}><strong>Auto-renewal disclosure:</strong> Your subscription will automatically renew at the then-current rate. You will receive a reminder email 30 days before renewal. You may cancel at any time through your account settings</li>
        )}
      </ul>

      <h2 style={S.h2} id="payment-split">6. Payment Split Liability</h2>
      <ul style={S.ul}>
        <li style={S.li}>IVIRA facilitates payment collection on behalf of gyms via {geo.paymentProcessor}</li>
        <li style={S.li}><strong>Revenue split:</strong> Gym receives 89%, Trainers 10%, Platform 1%</li>
        <li style={S.li}>Settlements are processed within 3&ndash;5 business days via {geo.paymentProcessor}</li>
        <li style={S.li}>IVIRA is not liable for trainer-gym payment disputes</li>
        <li style={S.li}>Refunds follow the originating gym's refund policy{(region === 'EU' || region === 'GB') ? `, subject to your statutory rights under ${geo.consumerLaw}` : ''}</li>
      </ul>

      <h2 style={S.h2}>7. Cancellation &amp; Refund Policy</h2>
      <ul style={S.ul}>
        <li style={S.li}><strong>Cooling-off:</strong> {geo.cooling} for a full refund</li>
        <li style={S.li}><strong>After cooling-off:</strong> Pro-rata refund for unused months on annual plans</li>
        <li style={S.li}><strong>Monthly plans:</strong> Cancel anytime, effective at end of billing cycle</li>
        <li style={S.li}>Refunds are processed within 5&ndash;10 business days to the original payment method</li>
      </ul>
      {region === 'IN' && (
        <p style={S.p}>
          Refund disputes may be escalated to the Consumer Disputes Redressal Commission under the Consumer Protection Act 2019.
        </p>
      )}

      <h2 style={S.h2}>8. AI Features &amp; Disclaimer</h2>
      <ul style={S.ul}>
        <li style={S.li}>IVIRA's AI coaching and nutrition features provide general fitness guidance only</li>
        <li style={S.li}>AI recommendations are <strong>not</strong> a substitute for professional medical, dietary, or fitness advice</li>
        <li style={S.li}>Users should consult qualified professionals before making changes to their health regimen</li>
        <li style={S.li}>IVIRA is not liable for any injury, illness, or adverse outcome resulting from following AI-generated recommendations</li>
      </ul>

      <h2 style={S.h2}>9. Concierge Service Terms</h2>
      <ul style={S.ul}>
        <li style={S.li}>The Concierge Service connects users with third-party training facilities (MMA, yoga, boxing, etc.)</li>
        <li style={S.li}>IVIRA acts as an intermediary and does not operate, manage, or control third-party facilities</li>
        <li style={S.li}>Facility listings, pricing, and availability are provided by facility owners and may change without notice</li>
        <li style={S.li}>IVIRA is not responsible for the quality, safety, or legality of services provided by third-party facilities</li>
        <li style={S.li}>Users are encouraged to verify facility credentials, insurance, and safety standards independently</li>
      </ul>

      <h2 style={S.h2}>10. Acceptable Use</h2>
      <ul style={S.ul}>
        <li style={S.li}>No illegal activities, data scraping, or reverse engineering of the platform</li>
        <li style={S.li}>Gym owners are responsible for the accuracy of member data they manage</li>
        <li style={S.li}>No impersonation, harassment, or abuse of other users on leaderboards or community features</li>
        <li style={S.li}>IVIRA reserves the right to suspend or terminate accounts that violate these terms</li>
      </ul>

      <h2 style={S.h2}>11. Intellectual Property</h2>
      <ul style={S.ul}>
        <li style={S.li}>The IVIRA brand, source code, and design are proprietary and protected by applicable intellectual property laws</li>
        <li style={S.li}>Gym owners retain all rights to their own brand assets uploaded to the platform</li>
        <li style={S.li}>User-generated content (reviews, photos) grants IVIRA a non-exclusive license to display within the platform</li>
      </ul>

      <h2 style={S.h2}>12. Limitation of Liability</h2>
      <ul style={S.ul}>
        <li style={S.li}>Maximum liability is limited to the total fees paid by you in the preceding 12 months</li>
        <li style={S.li}>IVIRA shall not be liable for any indirect, incidental, special, or consequential damages</li>
        {(region === 'EU' || region === 'GB') && (
          <li style={S.li}>Nothing in these terms limits or excludes liability for death or personal injury caused by negligence, fraud, or any other liability that cannot be limited or excluded by law</li>
        )}
        {region === 'AU' && (
          <li style={S.li}>Our goods and services come with guarantees that cannot be excluded under the Australian Consumer Law</li>
        )}
      </ul>

      <h2 style={S.h2}>13. Governing Law &amp; Jurisdiction</h2>
      <ul style={S.ul}>
        <li style={S.li}>These terms are governed by {geo.jurisdiction}</li>
        <li style={S.li}>Exclusive jurisdiction lies with {geo.court}</li>
        <li style={S.li}>Disputes shall first be resolved through {geo.disputeBody} before litigation</li>
        {region === 'US' && (
          <li style={S.li}><strong>Class action waiver:</strong> You agree that any dispute resolution will be conducted only on an individual basis and not in a class, consolidated, or representative action</li>
        )}
        {region === 'EU' && (
          <li style={S.li}>EU consumers may also bring claims in the courts of their country of residence</li>
        )}
      </ul>

      <h2 style={S.h2}>14. Termination</h2>
      <ul style={S.ul}>
        <li style={S.li}>Either party may terminate with 30 days' written notice</li>
        <li style={S.li}>Immediate termination is permitted for material breach of these terms</li>
        <li style={S.li}>Post-termination, your data will be available for export for 60 days, after which it will be permanently deleted</li>
        {(region === 'EU' || region === 'GB') && (
          <li style={S.li}>This does not affect your right to cancel within the cooling-off period under {geo.consumerLaw}</li>
        )}
      </ul>
    </LegalLayout>
  )
}
