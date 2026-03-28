import { useEffect } from 'react'
import { Link } from 'react-router-dom'

const FONT = "'Inter', -apple-system, sans-serif"

const styles = {
  page: {
    minHeight: '100vh',
    background: '#000000',
    color: '#EDEDED',
    fontFamily: FONT,
    fontSize: 14,
    lineHeight: 1.7,
  },
  container: {
    maxWidth: 720,
    margin: '0 auto',
    padding: '0 24px',
  },
  header: {
    padding: '32px 0',
    borderBottom: '1px solid #1A1A1A',
    marginBottom: 40,
  },
  logo: {
    fontSize: 18,
    fontWeight: 800,
    color: '#EDEDED',
    textDecoration: 'none',
    letterSpacing: '-0.5px',
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: 700,
    color: '#EDEDED',
    margin: '16px 0 0',
    lineHeight: 1.3,
  },
  h2: {
    fontSize: 20,
    fontWeight: 700,
    color: '#EDEDED',
    margin: '40px 0 16px',
    paddingTop: 24,
    borderTop: '1px solid #1A1A1A',
  },
  h3: {
    fontSize: 16,
    fontWeight: 600,
    color: '#EDEDED',
    margin: '24px 0 12px',
  },
  p: {
    color: '#EDEDED',
    margin: '0 0 12px',
    fontSize: 14,
    lineHeight: 1.7,
  },
  ul: {
    margin: '0 0 16px',
    paddingLeft: 20,
    color: '#EDEDED',
  },
  li: {
    marginBottom: 6,
    fontSize: 14,
    lineHeight: 1.6,
  },
  footer: {
    borderTop: '1px solid #1A1A1A',
    marginTop: 60,
    padding: '32px 0',
    display: 'flex',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLinks: {
    display: 'flex',
    gap: 20,
    flexWrap: 'wrap',
  },
  footerLink: {
    color: '#666666',
    fontSize: 12,
    textDecoration: 'none',
    transition: 'color 0.2s',
  },
  footerText: {
    color: '#666666',
    fontSize: 12,
    width: '100%',
    textAlign: 'center',
    marginTop: 8,
  },
}

export default function LegalLayout({ title, documentTitle, children }) {
  useEffect(() => {
    document.title = documentTitle || `${title} | IVIRA`
  }, [title, documentTitle])

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <Link to="/" style={styles.logo}><span style={{ opacity: 0.45 }}>I</span><span>VIRA</span></Link>
          <h1 style={styles.pageTitle}>{title}</h1>
        </header>

        <main>{children}</main>

        <footer style={styles.footer}>
          <div style={styles.footerLinks}>
            <Link to="/" style={styles.footerLink}>Home</Link>
            <Link to="/privacy" style={styles.footerLink}>Privacy Policy</Link>
            <Link to="/terms" style={styles.footerLink}>Terms of Service</Link>
            <Link to="/contact" style={styles.footerLink}>Contact Us</Link>
          </div>
          <div style={styles.footerText}>
            &copy; {new Date().getFullYear()} IVIRA. All Rights Reserved.
          </div>
        </footer>
      </div>
    </div>
  )
}

export { styles as legalStyles }
