import LegalLayout from '../../components/LegalLayout'
import { useTheme } from '../../context/ThemeContext'

const FONT = "'Inter', -apple-system, sans-serif"

export default function Contact() {
  const { isDark } = useTheme()

  const cardStyle = {
    background: isDark ? '#121212' : '#FFFFFF',
    border: `1px solid ${isDark ? '#1F1F1F' : '#E5E7EB'}`,
    borderRadius: 12,
    padding: '24px 28px',
  }

  const cardTitle = {
    fontSize: 16,
    fontWeight: 600,
    color: isDark ? '#EDEDED' : '#111111',
    margin: '0 0 14px',
    fontFamily: FONT,
  }

  const cardText = {
    fontSize: 14,
    color: isDark ? '#EDEDED' : '#333333',
    lineHeight: 1.7,
    margin: '0 0 6px',
    fontFamily: FONT,
  }

  const cardLink = {
    color: '#1A3A8F',
    textDecoration: 'none',
    fontSize: 14,
    fontFamily: FONT,
  }

  const cardLabel = {
    fontSize: 12,
    color: isDark ? '#666666' : '#888888',
    margin: '0 0 2px',
    fontFamily: FONT,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  }

  return (
    <LegalLayout title="Contact Us" documentTitle="Contact Us | IVIRA">
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 20,
        marginTop: 8,
      }}>
        {/* Registered Office */}
        <div style={cardStyle}>
          <h3 style={cardTitle}>Registered Office</h3>
          <p style={cardText}>IVIRA Technologies</p>
          <p style={cardText}>[Address Line 1]</p>
          <p style={cardText}>Bengaluru, Karnataka 560001</p>
          <p style={cardText}>India</p>
        </div>

        {/* Support */}
        <div style={cardStyle}>
          <h3 style={cardTitle}>Support</h3>
          <p style={{ ...cardLabel, marginTop: 0 }}>Email</p>
          <p style={cardText}>
            <a href="mailto:admin@ivira.app" style={cardLink}>admin@ivira.app</a>
          </p>
          <p style={cardLabel}>WhatsApp</p>
          <p style={cardText}>
            <a href="https://wa.me/919876543210" style={cardLink}>+91 98765 43210</a>
          </p>
          <p style={cardLabel}>Hours</p>
          <p style={cardText}>Mon&ndash;Sat, 9:00 AM &ndash; 7:00 PM IST</p>
        </div>

        {/* For Gym Owners */}
        <div style={cardStyle}>
          <h3 style={cardTitle}>For Gym Owners</h3>
          <p style={cardText}>
            <strong>Priority Support:</strong> Available in-app for Growth &amp; Pro tiers
          </p>
          <p style={cardLabel}>Account Issues</p>
          <p style={cardText}>
            <a href="mailto:admin@ivira.app" style={cardLink}>admin@ivira.app</a>
          </p>
        </div>

        {/* Report a Vulnerability */}
        <div style={cardStyle}>
          <h3 style={cardTitle}>Report a Vulnerability</h3>
          <p style={cardLabel}>Security Issues</p>
          <p style={cardText}>
            <a href="mailto:admin@ivira.app" style={cardLink}>admin@ivira.app</a>
          </p>
          <p style={cardText}>We follow responsible disclosure practices.</p>
          <p style={cardText}>Response within 48 hours.</p>
        </div>

        {/* DPDP Act Grievance Officer */}
        <div style={cardStyle}>
          <h3 style={cardTitle}>DPDP Act Grievance Officer</h3>
          <p style={cardLabel}>Email</p>
          <p style={cardText}>
            <a href="mailto:admin@ivira.app" style={cardLink}>admin@ivira.app</a>
          </p>
          <p style={cardLabel}>Response Time</p>
          <p style={cardText}>Within 30 days as per DPDP Act 2023</p>
        </div>

        {/* Business Inquiries */}
        <div style={cardStyle}>
          <h3 style={cardTitle}>Business Inquiries</h3>
          <p style={cardLabel}>Partnerships & Enterprise</p>
          <p style={cardText}>
            <a href="mailto:admin@ivira.app" style={cardLink}>admin@ivira.app</a>
          </p>
        </div>
      </div>
    </LegalLayout>
  )
}
