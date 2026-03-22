import { useState, useEffect } from 'react'
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
  'Europe/Vienna': 'EU', 'Europe/Dublin': 'EU', 'Europe/Helsinki': 'EU',
  'Europe/Warsaw': 'EU', 'Europe/Stockholm': 'EU', 'Europe/Lisbon': 'EU',
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

const linkStyle = { color: '#DC2626', textDecoration: 'underline' }

// ── Region-Specific Sections ───────────────────────────────
function DataLawSection({ region }) {
  const content = {
    IN: {
      law: 'Digital Personal Data Protection (DPDP) Act 2023',
      rights: [
        { name: 'Access', desc: 'Request a summary of your personal data we hold' },
        { name: 'Correction', desc: 'Correct inaccurate or incomplete data' },
        { name: 'Erasure', desc: 'Request deletion of your personal data' },
        { name: 'Withdraw consent', desc: 'Withdraw previously given consent for data processing' },
        { name: 'Nominate', desc: 'Nominate an individual to exercise your rights in case of death or incapacity' },
        { name: 'Grievance redressal', desc: 'Raise complaints regarding data handling' },
      ],
      officer: 'DPDP Act Grievance Officer',
      response: '30 days as per DPDP Act 2023',
      retention: { payment: '8 years (Indian tax law compliance)', biometric: '30 days after membership ends', post: '90 days then anonymized' },
    },
    US: {
      law: 'California Consumer Privacy Act (CCPA) / state privacy laws',
      rights: [
        { name: 'Right to Know', desc: 'Request what personal information we collect, use, and disclose' },
        { name: 'Right to Delete', desc: 'Request deletion of your personal information' },
        { name: 'Right to Opt-Out', desc: 'Opt out of the sale or sharing of personal information (we do not sell data)' },
        { name: 'Right to Non-Discrimination', desc: 'You will not be discriminated against for exercising your privacy rights' },
        { name: 'Right to Correct', desc: 'Request correction of inaccurate personal information' },
      ],
      officer: 'Data Protection Officer',
      response: '45 days (extendable by 45 days with notice)',
      retention: { payment: '7 years (IRS compliance)', biometric: '30 days after membership ends', post: '90 days then anonymized' },
    },
    GB: {
      law: 'UK General Data Protection Regulation (UK GDPR) & Data Protection Act 2018',
      rights: [
        { name: 'Access', desc: 'Obtain a copy of your personal data and processing details' },
        { name: 'Rectification', desc: 'Correct inaccurate or incomplete personal data' },
        { name: 'Erasure', desc: 'Request deletion of your data ("right to be forgotten")' },
        { name: 'Restrict processing', desc: 'Limit how we use your data in certain circumstances' },
        { name: 'Data portability', desc: 'Receive your data in a machine-readable format' },
        { name: 'Object', desc: 'Object to processing based on legitimate interests or direct marketing' },
        { name: 'Lodge complaint', desc: 'File a complaint with the Information Commissioner\'s Office (ICO)' },
      ],
      officer: 'Data Protection Officer',
      response: '30 days (extendable by 60 days for complex requests)',
      retention: { payment: '7 years (HMRC compliance)', biometric: '30 days after membership ends', post: '30 days then deleted' },
    },
    EU: {
      law: 'General Data Protection Regulation (GDPR)',
      rights: [
        { name: 'Access', desc: 'Obtain a copy of your personal data and processing details' },
        { name: 'Rectification', desc: 'Correct inaccurate or incomplete personal data' },
        { name: 'Erasure', desc: 'Request deletion of your data ("right to be forgotten")' },
        { name: 'Restrict processing', desc: 'Limit how we use your data in certain circumstances' },
        { name: 'Data portability', desc: 'Receive your data in a structured, machine-readable format' },
        { name: 'Object', desc: 'Object to processing based on legitimate interests or direct marketing' },
        { name: 'Automated decision-making', desc: 'Not be subject to decisions based solely on automated processing' },
        { name: 'Lodge complaint', desc: 'File a complaint with your local Data Protection Authority' },
      ],
      officer: 'Data Protection Officer',
      response: '30 days (extendable by 60 days for complex requests)',
      retention: { payment: '10 years (EU tax directive compliance)', biometric: '30 days after membership ends', post: '30 days then deleted' },
    },
    AE: {
      law: 'UAE Federal Decree-Law No. 45 of 2021 on Personal Data Protection',
      rights: [
        { name: 'Access', desc: 'Request access to your personal data' },
        { name: 'Correction', desc: 'Correct or update inaccurate data' },
        { name: 'Erasure', desc: 'Request deletion of your personal data' },
        { name: 'Restrict processing', desc: 'Limit processing of your data in specific circumstances' },
        { name: 'Data portability', desc: 'Transfer your data to another service provider' },
        { name: 'Withdraw consent', desc: 'Withdraw previously given consent' },
      ],
      officer: 'Data Protection Officer',
      response: '30 days',
      retention: { payment: '5 years (UAE Commercial Transactions Law)', biometric: '30 days after membership ends', post: '90 days then anonymized' },
    },
    AU: {
      law: 'Australian Privacy Act 1988 & Australian Privacy Principles (APPs)',
      rights: [
        { name: 'Access', desc: 'Request access to your personal information' },
        { name: 'Correction', desc: 'Request correction of inaccurate or out-of-date information' },
        { name: 'Complaint', desc: 'Lodge a complaint with IVIRA or the Office of the Australian Information Commissioner (OAIC)' },
        { name: 'Anonymity', desc: 'Option to deal with us anonymously or using a pseudonym where practicable' },
      ],
      officer: 'Privacy Officer',
      response: '30 days',
      retention: { payment: '7 years (ATO compliance)', biometric: '30 days after membership ends', post: '90 days then anonymized' },
    },
    CA: {
      law: 'Personal Information Protection and Electronic Documents Act (PIPEDA)',
      rights: [
        { name: 'Access', desc: 'Request access to your personal information held by us' },
        { name: 'Correction', desc: 'Challenge the accuracy and completeness of your information' },
        { name: 'Withdraw consent', desc: 'Withdraw consent for the collection, use, or disclosure of your information' },
        { name: 'Complaint', desc: 'File a complaint with the Privacy Commissioner of Canada' },
      ],
      officer: 'Privacy Officer',
      response: '30 days',
      retention: { payment: '7 years (CRA compliance)', biometric: '30 days after membership ends', post: '90 days then anonymized' },
    },
    SG: {
      law: 'Personal Data Protection Act 2012 (PDPA)',
      rights: [
        { name: 'Access', desc: 'Request access to your personal data and information about how it has been used' },
        { name: 'Correction', desc: 'Request correction of errors or omissions in your personal data' },
        { name: 'Withdraw consent', desc: 'Withdraw consent for the collection, use, or disclosure of your data' },
        { name: 'Data portability', desc: 'Request your data in a common electronic format' },
      ],
      officer: 'Data Protection Officer',
      response: '30 days',
      retention: { payment: '5 years (IRAS compliance)', biometric: '30 days after membership ends', post: '90 days then anonymized' },
    },
    GLOBAL: {
      law: 'applicable local data protection laws in your jurisdiction',
      rights: [
        { name: 'Access', desc: 'Request a copy of your personal data' },
        { name: 'Correction', desc: 'Correct inaccurate or incomplete data' },
        { name: 'Deletion', desc: 'Request deletion of your personal data' },
        { name: 'Withdraw consent', desc: 'Withdraw previously given consent for data processing' },
      ],
      officer: 'Data Protection Officer',
      response: '30 days',
      retention: { payment: '7 years (applicable tax law compliance)', biometric: '30 days after membership ends', post: '90 days then anonymized' },
    },
  }

  const c = content[region] || content.GLOBAL

  return (
    <>
      <h2 style={S.h2}>7. Your Rights under {c.law}</h2>
      <p style={S.p}>Under {c.law}, you have the following rights:</p>
      <ul style={S.ul}>
        {c.rights.map(r => (
          <li key={r.name} style={S.li}><strong>{r.name}</strong> &mdash; {r.desc}</li>
        ))}
      </ul>
      <p style={S.p}>
        To exercise these rights, visit <strong>Settings &gt; Data &amp; Privacy</strong> in your dashboard, or email <a href="mailto:privacy@ivira.app" style={linkStyle}>privacy@ivira.app</a>.
      </p>

      <h2 style={S.h2}>8. {c.officer}</h2>
      <ul style={S.ul}>
        <li style={S.li}><strong>Name:</strong> IVIRA {c.officer}</li>
        <li style={S.li}><strong>Email:</strong> privacy@ivira.app</li>
        <li style={S.li}><strong>Response time:</strong> Within {c.response}</li>
        <li style={S.li}><strong>Registered address:</strong> IVIRA Technologies, Bengaluru, Karnataka, India</li>
      </ul>

      <h2 style={S.h2}>6. Data Retention</h2>
      <ul style={S.ul}>
        <li style={S.li}><strong>Active account data</strong> &mdash; retained for the duration of your membership</li>
        <li style={S.li}><strong>Post-cancellation</strong> &mdash; {c.retention.post}</li>
        <li style={S.li}><strong>Payment records</strong> &mdash; retained for {c.retention.payment}</li>
        <li style={S.li}><strong>Biometric data</strong> &mdash; deleted {c.retention.biometric}</li>
      </ul>
    </>
  )
}

function PaymentProcessors({ region }) {
  const processors = {
    IN: 'Razorpay',
    US: 'Stripe',
    GB: 'Stripe',
    EU: 'Stripe',
    AE: 'Stripe / Network International',
    AU: 'Stripe',
    CA: 'Stripe',
    SG: 'Stripe',
    GLOBAL: 'Stripe / Razorpay',
  }
  return processors[region] || processors.GLOBAL
}

// ── Main Component ─────────────────────────────────────────
export default function Privacy() {
  const [region, setRegion] = useState(() => detectRegion())

  return (
    <LegalLayout title="Privacy Policy" documentTitle="Privacy Policy | IVIRA">
      <p style={S.p}>
        <strong>Last updated:</strong> March 2026
      </p>

      {/* Region selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, color: '#888' }}>Showing policy for:</span>
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

      <p style={S.p}>
        IVIRA Technologies ("we", "us", "our") operates the IVIRA platform. This Privacy Policy explains how we collect, use, store, and protect your personal data in compliance with {region === 'IN' ? 'the Digital Personal Data Protection (DPDP) Act 2023' : region === 'EU' ? 'the General Data Protection Regulation (GDPR)' : region === 'GB' ? 'the UK GDPR & Data Protection Act 2018' : region === 'US' ? 'applicable US state privacy laws including CCPA' : region === 'AE' ? 'UAE Federal Decree-Law No. 45 of 2021' : region === 'AU' ? 'the Australian Privacy Act 1988' : region === 'CA' ? 'PIPEDA' : region === 'SG' ? 'the Personal Data Protection Act 2012 (PDPA)' : 'applicable data protection laws in your jurisdiction'}.
      </p>

      <h2 style={S.h2}>1. Information We Collect</h2>

      <h3 style={S.h3}>Personal Information</h3>
      <ul style={S.ul}>
        <li style={S.li}>Name, phone number, and email address</li>
        <li style={S.li}>Gym membership details (plan, start/end dates, status)</li>
      </ul>

      <h3 style={S.h3}>Health & Fitness Data</h3>
      <ul style={S.ul}>
        <li style={S.li}>Workout logs, step counts, and exercise history</li>
        <li style={S.li}>Dietary preferences, meal logs, and nutrition tracking data</li>
        <li style={S.li}>Intermittent fasting schedules and logs</li>
        <li style={S.li}>Body measurements and fitness goals</li>
      </ul>

      <h3 style={S.h3}>Biometric / Photo Data for Check-ins</h3>
      <ul style={S.ul}>
        <li style={S.li}>Facial recognition data captured at kiosk check-in terminals</li>
        <li style={S.li}>QR code identifiers linked to member profiles</li>
      </ul>
      {(region === 'EU' || region === 'GB') && (
        <p style={S.p}>
          <strong>Note:</strong> Under {region === 'EU' ? 'GDPR Article 9' : 'UK GDPR'}, biometric data is classified as a special category of personal data. We process this data only with your explicit consent. You may withdraw consent and use QR-based or phone-based check-in instead.
        </p>
      )}
      {region === 'US' && (
        <p style={S.p}>
          <strong>Note:</strong> If you are located in Illinois, we comply with the Biometric Information Privacy Act (BIPA). Biometric data is used solely for check-in verification, stored encrypted, and deleted within 30 days of membership termination.
        </p>
      )}

      <h3 style={S.h3}>Payment Information</h3>
      <ul style={S.ul}>
        <li style={S.li}>Transaction records processed via {PaymentProcessors({ region })}</li>
        <li style={S.li}>We do <strong>not</strong> store credit/debit card details on our servers</li>
        {region === 'IN' && <li style={S.li}>GST-compliant invoicing for all transactions</li>}
        {region === 'AE' && <li style={S.li}>VAT-compliant invoicing as per UAE Federal Tax Authority requirements</li>}
        {(region === 'GB' || region === 'EU') && <li style={S.li}>VAT-compliant invoicing where applicable</li>}
        {region === 'AU' && <li style={S.li}>GST-compliant invoicing as per ATO requirements</li>}
        {region === 'SG' && <li style={S.li}>GST-compliant invoicing as per IRAS requirements</li>}
      </ul>

      <h3 style={S.h3}>Location Data</h3>
      <ul style={S.ul}>
        <li style={S.li}>GPS coordinates for gym check-in verification (150m radius validation)</li>
        <li style={S.li}>City-level location for GymFinder and Concierge services</li>
        <li style={S.li}>Location data is not tracked in the background and is only collected during active use</li>
      </ul>

      <h3 style={S.h3}>Usage Data</h3>
      <ul style={S.ul}>
        <li style={S.li}>Check-in frequency and patterns</li>
        <li style={S.li}>App interactions and feature usage</li>
        <li style={S.li}>Device information (model, OS version, app version)</li>
      </ul>

      <h2 style={S.h2}>2. How We Use Your Data</h2>
      <ul style={S.ul}>
        <li style={S.li}>Service delivery and account management</li>
        <li style={S.li}>AI-powered nutrition recommendations and meal tracking</li>
        <li style={S.li}>AI fitness coaching (workout suggestions, goal tracking)</li>
        <li style={S.li}>Check-in verification (biometric, QR, and GPS-based)</li>
        <li style={S.li}>Payment processing and tax-compliant billing</li>
        <li style={S.li}>Concierge service for matching you with training facilities</li>
        <li style={S.li}>Leaderboards, challenges, and gamification features</li>
        <li style={S.li}>Analytics and service improvement</li>
        <li style={S.li}>Communication via email, SMS, and WhatsApp notifications</li>
      </ul>
      {(region === 'EU' || region === 'GB') && (
        <>
          <h3 style={S.h3}>Legal Basis for Processing ({region === 'EU' ? 'GDPR Art. 6' : 'UK GDPR Art. 6'})</h3>
          <ul style={S.ul}>
            <li style={S.li}><strong>Contract performance</strong> &mdash; processing necessary to deliver our service</li>
            <li style={S.li}><strong>Consent</strong> &mdash; biometric check-in, marketing communications, AI nutrition analysis</li>
            <li style={S.li}><strong>Legitimate interests</strong> &mdash; analytics, fraud prevention, service improvement</li>
            <li style={S.li}><strong>Legal obligation</strong> &mdash; tax records, regulatory compliance</li>
          </ul>
        </>
      )}

      <h2 style={S.h2}>3. Data Sharing</h2>
      <ul style={S.ul}>
        <li style={S.li}><strong>Gym owners</strong> &mdash; member data relevant to their gym operations</li>
        <li style={S.li}><strong>{PaymentProcessors({ region })}</strong> &mdash; payment processing</li>
        <li style={S.li}><strong>WhatsApp Business API (WATI)</strong> &mdash; notifications and reminders</li>
        <li style={S.li}><strong>AI service providers</strong> &mdash; anonymized data for nutrition analysis and coaching</li>
      </ul>
      <p style={S.p}>
        We do <strong>NOT</strong> sell your personal data to any third party.
      </p>
      {(region === 'EU' || region === 'GB') && (
        <p style={S.p}>
          <strong>International transfers:</strong> Your data may be transferred to servers in India (AWS Mumbai). We ensure adequate safeguards through Standard Contractual Clauses (SCCs) as approved by the {region === 'EU' ? 'European Commission' : 'UK ICO'}.
        </p>
      )}
      {region === 'US' && (
        <p style={S.p}>
          <strong>Do Not Sell:</strong> IVIRA does not sell, rent, or share your personal information for monetary or other valuable consideration. We honor Do Not Track browser signals.
        </p>
      )}

      <h2 style={S.h2}>4. AI Data Processing</h2>
      <ul style={S.ul}>
        <li style={S.li}>AI models process meal descriptions to estimate macronutrients (protein, carbs, fat, calories)</li>
        <li style={S.li}>AI coaching uses your workout history to provide personalized recommendations</li>
        <li style={S.li}>Data is anonymized before being used for model improvement</li>
        <li style={S.li}>You can request complete deletion of your AI interaction history at any time</li>
        {(region === 'EU' || region === 'GB') && (
          <li style={S.li}>In accordance with {region === 'EU' ? 'GDPR Art. 22' : 'UK GDPR Art. 22'}, you have the right not to be subject to decisions based solely on automated processing</li>
        )}
      </ul>

      <h2 style={S.h2}>5. Biometric Data for Check-ins</h2>
      <ul style={S.ul}>
        <li style={S.li}>Photo and QR data is used solely for identity verification at check-in</li>
        <li style={S.li}>Biometric data is stored encrypted and auto-deleted 30 days after membership ends</li>
        <li style={S.li}>Members can opt out of biometric check-in and use phone-based verification instead</li>
      </ul>

      <DataLawSection region={region} />

      <h2 style={S.h2}>9. Children's Privacy</h2>
      <p style={S.p}>
        IVIRA is not directed at children under {region === 'US' ? '13 (COPPA)' : region === 'EU' || region === 'GB' ? '16 (or the age set by the member state)' : '18'}. We do not knowingly collect personal data from children. If you believe a child has provided us with personal data, please contact us immediately.
      </p>

      <h2 style={S.h2}>10. Cookies & Tracking</h2>
      <p style={S.p}>
        IVIRA uses essential cookies for authentication and session management. We do not use advertising cookies or third-party tracking pixels.
        {(region === 'EU' || region === 'GB') ? ' In compliance with the ePrivacy Directive, we obtain consent before setting any non-essential cookies.' : ''}
      </p>

      <h2 style={S.h2}>11. Changes to This Policy</h2>
      <p style={S.p}>
        We may update this Privacy Policy from time to time. Material changes will be communicated to users via email and/or in-app notification{region === 'EU' || region === 'GB' ? '. Where required, we will obtain your consent before implementing changes that affect how we process your data' : ''}. Continued use of IVIRA after changes constitutes acceptance of the updated policy.
      </p>
    </LegalLayout>
  )
}
