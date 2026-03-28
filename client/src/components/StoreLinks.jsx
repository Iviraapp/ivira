import { useState, useEffect } from 'react'
import api from '../lib/api'

function isMobile() {
  if (typeof navigator === 'undefined') return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

function AppStoreBadge({ width = 140, height = 42, onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 140 42"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        cursor: 'pointer',
        transition: 'transform 0.2s ease',
        transform: hov ? 'scale(1.05)' : 'scale(1)',
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onClick}
      role="button"
      aria-label="Download on the App Store"
    >
      <rect x="0.5" y="0.5" width="139" height="41" rx="9.5" fill="#000" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      {/* Apple logo - simplified */}
      <g transform="translate(12, 8)" fill="#fff">
        <path d="M16.2 8.8c0-2.5 2-3.7 2.1-3.8-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9-.8 0-2-.9-3.3-.8-1.7 0-3.3 1-4.1 2.5-1.8 3.1-.5 7.6 1.3 10.1.8 1.2 1.9 2.6 3.2 2.5 1.3-.1 1.8-.8 3.3-.8s2 .8 3.3.8c1.4 0 2.3-1.2 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.7-1-2.7-4.1h-.4zM13.7 3.2c.7-.9 1.2-2.1 1.1-3.2-1 0-2.3.7-3 1.6-.6.7-1.2 2-1 3.1 1.1.1 2.2-.6 2.9-1.5z" />
      </g>
      {/* "Download on the" */}
      <text x="42" y="16" fill="#fff" fontFamily="'Inter', -apple-system, sans-serif" fontSize="7" fontWeight="400">
        Download on the
      </text>
      {/* "App Store" */}
      <text x="42" y="30" fill="#fff" fontFamily="'Inter', -apple-system, sans-serif" fontSize="13" fontWeight="600">
        App Store
      </text>
    </svg>
  )
}

function GooglePlayBadge({ width = 140, height = 42, onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 140 42"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        cursor: 'pointer',
        transition: 'transform 0.2s ease',
        transform: hov ? 'scale(1.05)' : 'scale(1)',
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onClick}
      role="button"
      aria-label="Get it on Google Play"
    >
      <rect x="0.5" y="0.5" width="139" height="41" rx="9.5" fill="#000" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      {/* Play triangle */}
      <g transform="translate(14, 10)">
        <path d="M0 1.5v19c0 .8.9 1.3 1.6.9L17.2 12c.7-.4.7-1.4 0-1.8L1.6.6C.9.2 0 .7 0 1.5z" fill="#fff" />
      </g>
      {/* "GET IT ON" */}
      <text x="42" y="16" fill="#fff" fontFamily="'Inter', -apple-system, sans-serif" fontSize="7" fontWeight="400" letterSpacing="0.04em">
        GET IT ON
      </text>
      {/* "Google Play" */}
      <text x="42" y="30" fill="#fff" fontFamily="'Inter', -apple-system, sans-serif" fontSize="13" fontWeight="600">
        Google Play
      </text>
    </svg>
  )
}

function trackEvent(platform) {
  api.post('/analytics/event', { event: 'store_intent', platform }).catch(() => {})
}

export default function StoreLinks({ variant = 'hero' }) {
  const [mobile, setMobile] = useState(false)

  useEffect(() => {
    setMobile(isMobile())
  }, [])

  const isHero = variant === 'hero'
  const badgeW = isHero ? 140 : 120
  const badgeH = isHero ? 42 : 36

  const pwaButton = (
    <button
      onClick={() => {
        trackEvent('pwa')
        // PWA install or redirect logic
      }}
      style={{
        padding: isHero ? '12px 28px' : '8px 20px',
        borderRadius: 10,
        border: '1px solid rgba(255,255,255,0.1)',
        background: '#10B981',
        color: '#fff',
        fontSize: isHero ? 15 : 13,
        fontWeight: 700,
        fontFamily: "'Inter', -apple-system, sans-serif",
        cursor: 'pointer',
        transition: 'transform 0.2s ease',
        letterSpacing: '-0.01em',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
    >
      Get Instant Access
    </button>
  )

  const badges = (
    <div style={{ display: 'flex', gap: isHero ? 12 : 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
      <AppStoreBadge
        width={badgeW}
        height={badgeH}
        onClick={() => trackEvent('ios')}
      />
      <GooglePlayBadge
        width={badgeW}
        height={badgeH}
        onClick={() => trackEvent('android')}
      />
    </div>
  )

  if (mobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isHero ? 16 : 10 }}>
        {pwaButton}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <AppStoreBadge
            width={isHero ? 120 : 100}
            height={isHero ? 36 : 30}
            onClick={() => trackEvent('ios')}
          />
          <GooglePlayBadge
            width={isHero ? 120 : 100}
            height={isHero ? 36 : 30}
            onClick={() => trackEvent('android')}
          />
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isHero ? 12 : 8 }}>
      {badges}
    </div>
  )
}
