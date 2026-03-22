import { useState } from 'react'
import { V, FONT, FONT_D, PERSONA } from '../../components/vira/theme'
import ViraBottomNav from '../../components/vira/ViraBottomNav'
import ViraChat from './ViraChat'
import ViraMoodLog from './ViraMoodLog'
import ViraMeds from './ViraMeds'
import ViraIntake from './ViraIntake'
import { MessageCircle, Heart, User } from 'lucide-react'

// Pill icon (no lucide pill icon)
function PillIcon({ size = 20, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.5 1.5l-8 8a4.95 4.95 0 0 0 7 7l8-8a4.95 4.95 0 0 0-7-7z" />
      <path d="M6.5 10.5L13.5 3.5" />
    </svg>
  )
}

const TABS = [
  { key: 'mood', label: 'Mood', icon: Heart },
  { key: 'meds', label: 'Meds', icon: ({ size, ...p }) => <PillIcon size={size} {...p} /> },
  { key: 'chat', label: 'Chat', icon: MessageCircle },
  { key: 'profile', label: 'Profile', icon: User },
]

export default function ViraLayout() {
  const [activeTab, setActiveTab] = useState('chat')
  const [persona, setPersona] = useState('general')
  const [showPersonaPicker, setShowPersonaPicker] = useState(false)

  const currentPersona = PERSONA[persona]

  return (
    <div style={{
      minHeight: '100dvh', background: V.bg,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Top bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        padding: '12px 16px',
        paddingTop: 'max(12px, env(safe-area-inset-top))',
        background: `${V.bg}F2`, backdropFilter: 'blur(16px)',
        borderBottom: `1px solid ${V.border}`,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        {/* Vira logo */}
        <div style={{
          width: 36, height: 36, borderRadius: 12,
          background: `linear-gradient(135deg, ${currentPersona.accent}, #EC4899)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 2px 12px ${currentPersona.accent}30`,
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
            <path d="M12 3v1m0 16v1m-8-9H3m18 0h-1M5.6 5.6l.7.7m12.4 12.4l-.7-.7M5.6 18.4l.7-.7M18.7 5.6l-.7.7" />
            <circle cx="12" cy="12" r="3" fill="rgba(255,255,255,0.2)" />
          </svg>
        </div>
        <div>
          <h1 style={{
            fontFamily: FONT_D, fontSize: 18, fontWeight: 700,
            color: V.text, margin: 0, letterSpacing: '-0.02em',
          }}>
            Vira
          </h1>
          <p style={{
            fontFamily: FONT, fontSize: 10, color: currentPersona.accent,
            margin: 0, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase',
          }}>
            {currentPersona.label}
          </p>
        </div>

        <div style={{ flex: 1 }} />

        {/* Persona picker */}
        <button
          onClick={() => setShowPersonaPicker(!showPersonaPicker)}
          style={{
            padding: '6px 12px', borderRadius: 10,
            background: V.card, border: `1px solid ${V.border}`,
            color: V.textSec, fontFamily: FONT, fontSize: 12,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: currentPersona.accent,
          }} />
          Program
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      {/* Persona picker dropdown */}
      {showPersonaPicker && (
        <div style={{
          position: 'absolute', top: 64, right: 16, zIndex: 60,
          background: V.card, borderRadius: 14, border: `1px solid ${V.border}`,
          padding: 6, minWidth: 200,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          animation: 'fadeIn 0.2s ease-out',
        }}>
          {Object.entries(PERSONA).map(([key, p]) => (
            <button
              key={key}
              onClick={() => { setPersona(key); setShowPersonaPicker(false) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                padding: '10px 12px', borderRadius: 10,
                background: persona === key ? `${p.accent}15` : 'transparent',
                border: 'none', cursor: 'pointer', textAlign: 'left',
              }}
            >
              <div style={{
                width: 10, height: 10, borderRadius: '50%',
                background: p.accent,
                boxShadow: persona === key ? `0 0 8px ${p.accent}50` : 'none',
              }} />
              <span style={{
                fontFamily: FONT, fontSize: 13, fontWeight: persona === key ? 600 : 400,
                color: persona === key ? p.accent : V.textSec,
              }}>
                {p.label}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, position: 'relative' }}>
        {activeTab === 'chat' && <ViraChat persona={persona} />}
        {activeTab === 'mood' && <ViraMoodLog />}
        {activeTab === 'meds' && <ViraMeds />}
        {activeTab === 'intake' && <ViraIntake />}
        {activeTab === 'profile' && (
          <div style={{ padding: '24px 16px' }}>
            <div style={{
              background: V.card, borderRadius: 18, padding: 24,
              border: `1px solid ${V.border}`, borderTop: `3px solid ${V.accent}`,
              textAlign: 'center',
            }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: `linear-gradient(135deg, ${V.accent}, #EC4899)`,
                margin: '0 auto 16px', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: 32,
              }}>
                👤
              </div>
              <h3 style={{ fontFamily: FONT_D, fontSize: 20, fontWeight: 700, color: V.text, margin: '0 0 4px' }}>
                Health Profile
              </h3>
              <p style={{ fontFamily: FONT, fontSize: 13, color: V.textSec, margin: '0 0 20px' }}>
                Your personal health data is private and encrypted
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left' }}>
                {[
                  { label: 'Care Program', value: currentPersona.label },
                  { label: 'Mood Streak', value: '5 days' },
                  { label: 'Med Adherence', value: '94%' },
                  { label: 'Member Since', value: 'March 2026' },
                ].map(row => (
                  <div key={row.label} style={{
                    display: 'flex', justifyContent: 'space-between',
                    padding: '12px 14px', borderRadius: 10,
                    background: V.bg, border: `1px solid ${V.border}`,
                  }}>
                    <span style={{ fontFamily: FONT, fontSize: 13, color: V.textSec }}>{row.label}</span>
                    <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: V.text }}>{row.value}</span>
                  </div>
                ))}
              </div>

              <button style={{
                marginTop: 20, width: '100%', padding: '14px',
                borderRadius: 14, border: `1px solid ${V.border}`,
                background: V.bg, color: V.textSec,
                fontFamily: FONT, fontSize: 14, fontWeight: 500,
                cursor: 'pointer',
              }}>
                Start Conversational Intake
              </button>
            </div>
          </div>
        )}
      </div>

      <ViraBottomNav
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onVira={() => setActiveTab('chat')}
      />
    </div>
  )
}
