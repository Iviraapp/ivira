import { useState } from 'react'
import { motion } from 'framer-motion'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'

const FEATURE_LABELS = {
  newsletter: 'Newsletter',
  affiliate: 'Affiliate Program',
  analytics: 'Advanced Analytics',
  trainers: 'Trainer Management',
  staff: 'Staff Management',
  'staff-checkin': 'Staff Check-in',
  'staff-performance': 'Staff Performance',
  'whatsapp-marketing': 'WhatsApp Marketing',
  'api-access': 'API Access',
  'white-label': 'White Label',
  'priority-support': 'Priority Support',
}

const UPGRADE_PACKAGE = {
  standard: 'pro',
  pro: 'enterprise',
}

export default function FeatureLockedCard({ featureSlug, packageType = 'standard' }) {
  const { gym } = useAuth()
  const [requesting, setRequesting] = useState(false)
  const [requested, setRequested] = useState(false)

  const label = FEATURE_LABELS[featureSlug] || featureSlug
  const targetPackage = UPGRADE_PACKAGE[packageType] || 'pro'

  const handleUpgradeRequest = async () => {
    setRequesting(true)
    try {
      await api.post('/leads', {
        name: gym?.owner_name || 'Gym Owner',
        gym_name: gym?.name || 'Unknown Gym',
        phone: gym?.phone || '',
        email: gym?.email || '',
        package_interest: targetPackage,
      })
      setRequested(true)
    } catch {
      // Silently fail — not critical
    } finally {
      setRequesting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: '#0A0A0A',
        border: '1px solid #1A1A1A',
        borderRadius: 12,
        padding: '24px 20px',
        textAlign: 'center',
        maxWidth: 400,
        margin: '0 auto',
      }}
    >
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: 'rgba(124, 58, 237, 0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 16px',
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>

      <h3 style={{ color: '#FFF', fontSize: 16, fontWeight: 600, margin: '0 0 8px' }}>
        Unlock {label}
      </h3>
      <p style={{ color: '#777', fontSize: 13, margin: '0 0 20px', lineHeight: 1.5 }}>
        This feature is available with the{' '}
        <span style={{ color: '#7C3AED', fontWeight: 500, textTransform: 'capitalize' }}>
          {targetPackage}
        </span>{' '}
        package.
      </p>

      {requested ? (
        <p style={{ color: '#4ADE80', fontSize: 13, fontWeight: 500, margin: 0 }}>
          Upgrade request sent! We'll be in touch.
        </p>
      ) : (
        <button
          onClick={handleUpgradeRequest}
          disabled={requesting}
          style={{
            padding: '10px 24px',
            background: '#7C3AED',
            color: '#FFF',
            border: 'none',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: requesting ? 'not-allowed' : 'pointer',
            opacity: requesting ? 0.7 : 1,
            transition: 'opacity 0.2s',
          }}
        >
          {requesting ? 'Requesting...' : 'Request Upgrade'}
        </button>
      )}
    </motion.div>
  )
}
