import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { V, G, GR, FONT, FONT_D, PERSONA, glass } from '../../components/vira/theme'
import ViraBottomNav from '../../components/vira/ViraBottomNav'
import ViraChat from './ViraChat'
import ViraMoodLog from './ViraMoodLog'
import ViraMeds from './ViraMeds'
import ViraIntake from './ViraIntake'
import { MessageCircle, Heart, User, ChevronLeft } from 'lucide-react'

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

// Rule 2: Desktop side navigation
function DesktopNav({ tabs, activeTab, onTabChange, persona, onPersonaChange, showPersonaPicker, setShowPersonaPicker }) {
  const currentPersona = PERSONA[persona]
  return (
    <div style={{
      width: 220, flexShrink: 0,
      display: 'flex', flexDirection: 'column',
      borderRight: `1px solid ${V.border}`,
      padding: GR.sm,
      gap: G,
    }}>
      {/* Logo */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: GR.sm,
        padding: `${GR.sm}px ${GR.xs}px`,
      }}>
        <div style={{
          width: G * 5, height: G * 5, borderRadius: GR.sm,
          background: `linear-gradient(135deg, ${currentPersona.accent}, #EC4899)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 ${G / 4}px ${GR.sm}px ${currentPersona.accent}30`,
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
      </div>

      {/* Nav items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: G / 2, marginTop: GR.xs }}>
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onTabChange(key)}
            style={{
              display: 'flex', alignItems: 'center', gap: GR.sm,
              padding: `${GR.sm}px ${GR.xs}px`,
              borderRadius: GR.sm,
              background: activeTab === key ? `${V.accent}12` : 'transparent',
              border: activeTab === key ? `1px solid ${V.accent}20` : '1px solid transparent',
              color: activeTab === key ? V.accent : V.textSec,
              cursor: 'pointer', fontFamily: FONT, fontSize: 13, fontWeight: activeTab === key ? 600 : 400,
              transition: 'all 0.15s',
            }}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1 }} />

      {/* Persona picker */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setShowPersonaPicker(!showPersonaPicker)}
          style={{
            width: '100%',
            padding: `${GR.xs}px ${GR.sm}px`,
            borderRadius: GR.sm,
            ...glass(),
            color: V.textSec, fontFamily: FONT, fontSize: 12,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: GR.xs,
          }}
        >
          <div style={{
            width: G, height: G, borderRadius: '50%',
            background: currentPersona.accent,
          }} />
          Program
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: 'auto' }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {showPersonaPicker && (
          <div style={{
            position: 'absolute', bottom: '100%', left: 0, right: 0,
            marginBottom: G / 2,
            ...glass(),
            padding: G / 2,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            animation: 'fadeIn 0.2s ease-out',
            zIndex: 60,
          }}>
            {Object.entries(PERSONA).map(([key, p]) => (
              <button
                key={key}
                onClick={() => { onPersonaChange(key); setShowPersonaPicker(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: GR.xs,
                  width: '100%',
                  padding: `${GR.xs}px ${GR.sm}px`,
                  borderRadius: GR.sm,
                  background: persona === key ? `${p.accent}12` : 'transparent',
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                }}
              >
                <div style={{
                  width: GR.xs, height: GR.xs, borderRadius: '50%',
                  background: p.accent,
                }} />
                <span style={{
                  fontFamily: FONT, fontSize: 12,
                  fontWeight: persona === key ? 600 : 400,
                  color: persona === key ? p.accent : V.textSec,
                }}>
                  {p.label}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ViraLayout() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('chat')
  const [persona, setPersona] = useState('general')
  const [showPersonaPicker, setShowPersonaPicker] = useState(false)
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const currentPersona = PERSONA[persona]

  return (
    <div style={{
      minHeight: '100dvh', background: V.bg,
      display: 'flex', flexDirection: isMobile ? 'column' : 'row',
    }}>
      {/* Rule 2: Desktop — left Nav column */}
      {!isMobile && (
        <DesktopNav
          tabs={TABS}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          persona={persona}
          onPersonaChange={setPersona}
          showPersonaPicker={showPersonaPicker}
          setShowPersonaPicker={setShowPersonaPicker}
        />
      )}

      {/* Rule 2: Mobile — top bar (glassmorphism) */}
      {isMobile && (
        <div style={{
          position: 'sticky', top: 0, zIndex: 50,
          padding: `${GR.sm}px ${GR.md}px`,
          paddingTop: `max(${GR.sm}px, env(safe-area-inset-top))`,
          ...glass(),
          borderRadius: 0,
          borderTop: 'none', borderLeft: 'none', borderRight: 'none',
          borderBottom: `1px solid ${V.border}`,
          display: 'flex', alignItems: 'center', gap: GR.sm,
        }}>
          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: 'rgba(255,255,255,0.05)', border: `1px solid ${V.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <ChevronLeft size={18} color={V.textSec} />
          </button>

          <div style={{
            width: G * 4.5, height: G * 4.5, borderRadius: GR.sm,
            background: `linear-gradient(135deg, ${currentPersona.accent}, #EC4899)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 ${G / 4}px ${GR.sm}px ${currentPersona.accent}30`,
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
          <button
            onClick={() => setShowPersonaPicker(!showPersonaPicker)}
            style={{
              padding: `${G * 0.75}px ${GR.sm}px`,
              borderRadius: GR.sm,
              ...glass(),
              color: V.textSec, fontFamily: FONT, fontSize: 12,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: G * 0.75,
            }}
          >
            <div style={{
              width: G, height: G, borderRadius: '50%',
              background: currentPersona.accent,
            }} />
            Program
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>
      )}

      {/* Mobile persona picker dropdown */}
      {isMobile && showPersonaPicker && (
        <div style={{
          position: 'absolute', top: G * 8, right: GR.md, zIndex: 60,
          ...glass(),
          padding: G * 0.75, minWidth: 200,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          animation: 'fadeIn 0.2s ease-out',
        }}>
          {Object.entries(PERSONA).map(([key, p]) => (
            <button
              key={key}
              onClick={() => { setPersona(key); setShowPersonaPicker(false) }}
              style={{
                display: 'flex', alignItems: 'center', gap: GR.xs,
                width: '100%',
                padding: `${GR.xs}px ${GR.sm}px`,
                borderRadius: GR.sm,
                background: persona === key ? `${p.accent}12` : 'transparent',
                border: 'none', cursor: 'pointer', textAlign: 'left',
              }}
            >
              <div style={{
                width: GR.xs, height: GR.xs, borderRadius: '50%',
                background: p.accent,
                boxShadow: persona === key ? `0 0 ${GR.xs}px ${p.accent}50` : 'none',
              }} />
              <span style={{
                fontFamily: FONT, fontSize: 13,
                fontWeight: persona === key ? 600 : 400,
                color: persona === key ? p.accent : V.textSec,
              }}>
                {p.label}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Content — flex: 1 takes remaining space */}
      <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
        {activeTab === 'chat' && <ViraChat persona={persona} />}
        {activeTab === 'mood' && <ViraMoodLog />}
        {activeTab === 'meds' && <ViraMeds />}
        {activeTab === 'intake' && <ViraIntake />}
        {activeTab === 'profile' && (
          <div style={{ padding: `${GR.lg}px ${GR.md}px` }}>
            <div style={{
              ...glass(V.accent),
              borderTop: `3px solid ${V.accent}`,
              padding: GR.lg, textAlign: 'center',
            }}>
              <div style={{
                width: G * 9, height: G * 9, borderRadius: '50%',
                background: `linear-gradient(135deg, ${V.accent}, #EC4899)`,
                margin: `0 auto ${GR.md}px`, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: 32,
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <h3 style={{ fontFamily: FONT_D, fontSize: 20, fontWeight: 700, color: V.text, margin: `0 0 ${G / 2}px` }}>
                Health Profile
              </h3>
              <p style={{ fontFamily: FONT, fontSize: 13, color: V.textSec, margin: `0 0 ${GR.md}px` }}>
                Your personal health data is private and encrypted
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: GR.xs, textAlign: 'left' }}>
                {[
                  { label: 'Care Program', value: currentPersona.label },
                  { label: 'Mood Streak', value: '5 days' },
                  { label: 'Med Adherence', value: '94%' },
                  { label: 'Member Since', value: 'March 2026' },
                ].map(row => (
                  <div key={row.label} style={{
                    display: 'flex', justifyContent: 'space-between',
                    padding: `${GR.sm}px`,
                    borderRadius: GR.sm,
                    ...glass(),
                  }}>
                    <span style={{ fontFamily: FONT, fontSize: 13, color: V.textSec }}>{row.label}</span>
                    <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: V.text }}>{row.value}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setActiveTab('intake')}
                style={{
                  marginTop: GR.md, width: '100%', padding: `${GR.sm}px`,
                  borderRadius: GR.md,
                  ...glass(),
                  color: V.textSec,
                  fontFamily: FONT, fontSize: 14, fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Start Conversational Intake
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Rule 2: Mobile — Bottom Floating Bar (hide sidebar, primary actions here) */}
      {isMobile && (
        <ViraBottomNav
          tabs={TABS}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onVira={() => setActiveTab('chat')}
        />
      )}
    </div>
  )
}
