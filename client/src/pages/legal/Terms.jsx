import LegalLayout, { legalStyles as S } from '../../components/LegalLayout'

export default function Terms() {
  return (
    <LegalLayout title="Terms of Service" documentTitle="Terms of Service | IVIRA">
      <p style={S.p}>
        <strong>Last updated:</strong> March 2026
      </p>

      {/* 1 */}
      <h2 style={S.h2}>1. Acceptance of Terms</h2>
      <p style={S.p}>
        By accessing or using the IVIRA platform, you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not use our services.
      </p>

      {/* 2 */}
      <h2 style={S.h2}>2. Service Description</h2>
      <p style={S.p}>
        IVIRA is a Software-as-a-Service (SaaS) platform for gym management, offering tools for member management, check-ins, payments, nutrition tracking, and analytics.
      </p>
      <p style={S.p}>Service tiers:</p>
      <ul style={S.ul}>
        <li style={S.li}><strong>Starter</strong> &mdash; up to 100 members, core gym management features</li>
        <li style={S.li}><strong>Growth</strong> &mdash; up to 500 members, advanced analytics and priority support</li>
        <li style={S.li}><strong>Pro</strong> &mdash; up to 2,000 members, full feature set including API access</li>
      </ul>

      {/* 3 */}
      <h2 style={S.h2}>3. SaaS Service Level Agreement (SLA)</h2>
      <ul style={S.ul}>
        <li style={S.li}><strong>Uptime guarantee:</strong> 99.5% (excluding scheduled maintenance)</li>
        <li style={S.li}><strong>Scheduled maintenance:</strong> Sundays 2:00&ndash;5:00 AM IST with 48-hour advance notice</li>
        <li style={S.li}><strong>Credit policy:</strong> 5% of monthly fee per hour of unplanned downtime (maximum 30% credit)</li>
        <li style={S.li}><strong>Force majeure:</strong> SLA excludes outages caused by events beyond reasonable control, including natural disasters, government actions, or third-party service failures</li>
      </ul>

      {/* 4 */}
      <h2 style={S.h2}>4. Account &amp; Data Ownership</h2>
      <ul style={S.ul}>
        <li style={S.li}>Gym owners retain full ownership of their member data</li>
        <li style={S.li}>IVIRA retains platform analytics data in anonymized form</li>
        <li style={S.li}>Data export is available on request and will be delivered within 7 business days</li>
      </ul>

      {/* 5 */}
      <h2 style={S.h2}>5. Payment Terms</h2>
      <ul style={S.ul}>
        <li style={S.li}>All amounts are in Indian Rupees (INR), inclusive of applicable GST (18%)</li>
        <li style={S.li}>Annual billing is the default; monthly payment is available at a 15% premium</li>
        <li style={S.li}>Subscriptions auto-renew unless cancelled with 30 days&rsquo; written notice</li>
      </ul>

      {/* 6 */}
      <h2 style={S.h2} id="payment-split">6. Payment Split Liability</h2>
      <ul style={S.ul}>
        <li style={S.li}>IVIRA facilitates payment collection on behalf of gyms via Razorpay</li>
        <li style={S.li}><strong>Revenue split:</strong> Gym receives 89%, Trainers 10%, Platform 1%</li>
        <li style={S.li}>Settlements are processed within 3&ndash;5 business days via Razorpay</li>
        <li style={S.li}>IVIRA is not liable for trainer-gym payment disputes</li>
        <li style={S.li}>Refunds follow the originating gym&rsquo;s refund policy</li>
      </ul>

      {/* 7 */}
      <h2 style={S.h2}>7. Acceptable Use</h2>
      <ul style={S.ul}>
        <li style={S.li}>No illegal activities, data scraping, or reverse engineering of the platform</li>
        <li style={S.li}>Gym owners are responsible for the accuracy of member data they manage</li>
        <li style={S.li}>IVIRA reserves the right to suspend or terminate accounts that violate these terms</li>
      </ul>

      {/* 8 */}
      <h2 style={S.h2}>8. Intellectual Property</h2>
      <ul style={S.ul}>
        <li style={S.li}>The IVIRA brand, source code, and design are proprietary and protected by applicable intellectual property laws</li>
        <li style={S.li}>Gym owners retain all rights to their own brand assets uploaded to the platform</li>
      </ul>

      {/* 9 */}
      <h2 style={S.h2}>9. Limitation of Liability</h2>
      <ul style={S.ul}>
        <li style={S.li}>Maximum liability is limited to the total fees paid by you in the preceding 12 months</li>
        <li style={S.li}>IVIRA shall not be liable for any indirect, incidental, special, or consequential damages</li>
      </ul>

      {/* 10 */}
      <h2 style={S.h2}>10. Governing Law &amp; Jurisdiction</h2>
      <ul style={S.ul}>
        <li style={S.li}>These terms are governed by the laws of India</li>
        <li style={S.li}>Exclusive jurisdiction lies with the High Court of Karnataka, Bengaluru</li>
        <li style={S.li}>Disputes shall first be resolved through mediation within a 30-day window before litigation</li>
      </ul>

      {/* 11 */}
      <h2 style={S.h2}>11. Termination</h2>
      <ul style={S.ul}>
        <li style={S.li}>Either party may terminate with 30 days&rsquo; written notice</li>
        <li style={S.li}>Immediate termination is permitted for material breach of these terms</li>
        <li style={S.li}>Post-termination, your data will be available for export for 60 days, after which it will be permanently deleted</li>
      </ul>
    </LegalLayout>
  )
}
