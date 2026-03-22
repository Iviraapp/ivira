import LegalLayout, { legalStyles as S } from '../../components/LegalLayout'

export default function Privacy() {
  return (
    <LegalLayout title="Privacy Policy" documentTitle="Privacy Policy | IVIRA">
      <p style={S.p}>
        <strong>Last updated:</strong> March 2026
      </p>
      <p style={S.p}>
        IVIRA Technologies ("we", "us", "our") operates the IVIRA platform. This Privacy Policy explains how we collect, use, store, and protect your personal data in compliance with the Digital Personal Data Protection (DPDP) Act 2023.
      </p>

      {/* 1 */}
      <h2 style={S.h2}>1. Information We Collect</h2>

      <h3 style={S.h3}>Personal Information</h3>
      <ul style={S.ul}>
        <li style={S.li}>Name, phone number, and email address</li>
        <li style={S.li}>Gym membership details (plan, start/end dates, status)</li>
      </ul>

      <h3 style={S.h3}>Biometric / Photo Data for Check-ins</h3>
      <ul style={S.ul}>
        <li style={S.li}>Facial recognition data captured at kiosk check-in terminals</li>
        <li style={S.li}>QR code identifiers linked to member profiles</li>
      </ul>

      <h3 style={S.h3}>AI Nutrition Data</h3>
      <ul style={S.ul}>
        <li style={S.li}>Dietary preferences and restrictions</li>
        <li style={S.li}>Meal logs and food descriptions</li>
        <li style={S.li}>Macro and micronutrient tracking data</li>
      </ul>

      <h3 style={S.h3}>Payment Information</h3>
      <ul style={S.ul}>
        <li style={S.li}>Transaction records processed via Razorpay</li>
        <li style={S.li}>We do <strong>not</strong> store credit/debit card details on our servers</li>
      </ul>

      <h3 style={S.h3}>Usage Data</h3>
      <ul style={S.ul}>
        <li style={S.li}>Check-in frequency and patterns</li>
        <li style={S.li}>App interactions and feature usage</li>
      </ul>

      {/* 2 */}
      <h2 style={S.h2}>2. How We Use Your Data</h2>
      <ul style={S.ul}>
        <li style={S.li}>Service delivery and account management</li>
        <li style={S.li}>AI-powered nutrition recommendations and meal tracking</li>
        <li style={S.li}>Check-in verification (biometric and QR-based)</li>
        <li style={S.li}>Payment processing and GST billing</li>
        <li style={S.li}>Analytics and service improvement</li>
      </ul>

      {/* 3 */}
      <h2 style={S.h2}>3. Data Sharing</h2>
      <ul style={S.ul}>
        <li style={S.li}><strong>Gym owners</strong> &mdash; member data relevant to their gym operations</li>
        <li style={S.li}><strong>Razorpay</strong> &mdash; payment processing</li>
        <li style={S.li}><strong>WhatsApp Business API (WATI)</strong> &mdash; notifications and reminders</li>
      </ul>
      <p style={S.p}>
        We do <strong>NOT</strong> sell your personal data to any third party.
      </p>

      {/* 4 */}
      <h2 style={S.h2}>4. AI Nutrition Data Processing</h2>
      <ul style={S.ul}>
        <li style={S.li}>AI models process meal descriptions to estimate macronutrients (protein, carbs, fat, calories)</li>
        <li style={S.li}>Data is anonymized before being used for model training or improvement</li>
        <li style={S.li}>Members can request complete deletion of their nutrition history at any time</li>
      </ul>

      {/* 5 */}
      <h2 style={S.h2}>5. Biometric Data for Check-ins</h2>
      <ul style={S.ul}>
        <li style={S.li}>Photo and QR data is used solely for identity verification at check-in</li>
        <li style={S.li}>Biometric data is stored encrypted and auto-deleted 30 days after membership ends</li>
        <li style={S.li}>Members can opt out of biometric check-in and use phone-based verification instead</li>
      </ul>

      {/* 6 */}
      <h2 style={S.h2}>6. Data Retention</h2>
      <ul style={S.ul}>
        <li style={S.li}><strong>Active account data</strong> &mdash; retained for the duration of your membership</li>
        <li style={S.li}><strong>Post-cancellation</strong> &mdash; retained for 90 days for support purposes, then anonymized</li>
        <li style={S.li}><strong>Payment records</strong> &mdash; retained for 8 years (Indian tax law compliance)</li>
        <li style={S.li}><strong>Biometric data</strong> &mdash; deleted 30 days after membership ends</li>
      </ul>

      {/* 7 */}
      <h2 style={S.h2}>7. Your Rights under DPDP Act 2023</h2>
      <p style={S.p}>Under the Digital Personal Data Protection Act 2023, you have the right to:</p>
      <ul style={S.ul}>
        <li style={S.li}><strong>Access</strong> &mdash; request a summary of your personal data we hold</li>
        <li style={S.li}><strong>Correction</strong> &mdash; correct inaccurate or incomplete data</li>
        <li style={S.li}><strong>Erasure</strong> &mdash; request deletion of your personal data</li>
        <li style={S.li}><strong>Withdraw consent</strong> &mdash; withdraw previously given consent for data processing</li>
        <li style={S.li}><strong>Nominate</strong> &mdash; nominate an individual to exercise your rights in case of death or incapacity</li>
        <li style={S.li}><strong>Grievance redressal</strong> &mdash; raise complaints regarding data handling</li>
      </ul>

      <p style={S.p}>
        To exercise these rights, visit <strong>Settings &gt; Data &amp; Privacy</strong> in your dashboard, or email <a href="mailto:grievance@ivira.app" style={{ color: '#7C3AED', textDecoration: 'underline' }}>grievance@ivira.app</a>.
      </p>

      {/* 8 */}
      <h2 style={S.h2}>8. DPDP Act Grievance Officer</h2>
      <ul style={S.ul}>
        <li style={S.li}><strong>Name:</strong> Sunil Kumar (Grievance Officer)</li>
        <li style={S.li}><strong>Email:</strong> grievance@ivira.app</li>
        <li style={S.li}><strong>Response time:</strong> Within 30 days as per DPDP Act 2023</li>
        <li style={S.li}><strong>Registered address:</strong> [To be updated], Bengaluru, Karnataka, India</li>
      </ul>

      {/* 9 */}
      <h2 style={S.h2}>9. Changes to This Policy</h2>
      <p style={S.p}>
        We may update this Privacy Policy from time to time. Material changes will be communicated to users via email and/or WhatsApp notification. Continued use of IVIRA after changes constitutes acceptance of the updated policy.
      </p>
    </LegalLayout>
  )
}
