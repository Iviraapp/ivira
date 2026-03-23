import { useState, useRef, useEffect } from 'react'
import { V, G, GR, FONT, FONT_D, PERSONA, CRISIS_KEYWORDS, glass } from '../../components/vira/theme'
import RedFlagOverlay from '../../components/vira/RedFlagOverlay'

const MOCK_REPLIES = {
  mental_health: [
    "I hear you. It's okay to feel that way. Would you like to talk about what's been weighing on you?",
    "Thank you for sharing that. Your feelings are valid. Let's explore this together — no rush.",
    "I've noticed you've been logging lower moods this week. Sometimes it helps to identify small wins. Can you think of one thing that went well today?",
    "That takes courage to say. Remember, reaching out is a sign of strength. How are you feeling right now, in this moment?",
  ],
  hypertension: [
    "Your last blood pressure reading was 138/88. Let's check — have you taken your Amlodipine today?",
    "Great job logging consistently! Your 7-day average is trending down. Keep up the low-sodium meals.",
    "I noticed a 2-day gap in your medication log. Skipping doses can cause rebound spikes. Shall I set a reminder?",
    "Your readings look stable this week. Remember: 30 minutes of walking daily can reduce systolic pressure by 5-8 points.",
  ],
  pharmacy: [
    "Your Metformin refill is due in 3 days. I can notify your pharmacy — shall I proceed?",
    "Quick check: any side effects from the new dosage? Common ones include nausea or headache.",
    "Your insurance pre-authorization for Humira has been approved. Next infusion is scheduled for March 28.",
    "All medications logged for today. Your adherence this month is 94% — excellent consistency.",
  ],
  general: [
    "Welcome back! How are you feeling today? You can log your mood, check medications, or just chat.",
    "I'm Vira, your personal health companion. I'm here to help you stay on track with your wellness goals.",
    "Is there anything specific you'd like to focus on today? I can help with mood tracking, medication reminders, or general wellness.",
  ],
}

// Rule 4: Vira avatar always visible on left, user messages have 2px violet-500/30 border
// Rule 3: gap-4 (16px) between bubbles via GR.md padding
function ChatBubble({ role, text, timestamp, persona }) {
  const isVira = role === 'vira'
  const accent = PERSONA[persona]?.accent || V.accent

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'row', // Rule 4: avatar always on left
      alignItems: 'flex-start',
      gap: GR.sm, // 13px golden ratio
      padding: `0 0 ${GR.md}px 0`, // Rule 3: gap-4 equivalent (16px→21px golden)
    }}>
      {/* Rule 4: Vira avatar always visible on left */}
      <div style={{
        width: G * 4.5, height: G * 4.5, // 36px
        borderRadius: '50%', flexShrink: 0,
        background: isVira
          ? `linear-gradient(135deg, ${accent}, #EC4899)`
          : V.cardSolid,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginTop: G / 2,
        boxShadow: isVira ? `0 ${G / 4}px ${GR.sm}px ${accent}40` : 'none',
        border: isVira ? 'none' : `1px solid ${V.border}`,
      }}>
        {isVira ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
            <path d="M12 3v1m0 16v1m-8-9H3m18 0h-1M5.6 5.6l.7.7m12.4 12.4l-.7-.7M5.6 18.4l.7-.7M18.7 5.6l-.7.7" />
            <circle cx="12" cy="12" r="3" fill="rgba(255,255,255,0.2)" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={V.textTer} strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        )}
      </div>

      {/* Bubble */}
      <div style={{
        maxWidth: '85%',
        padding: `${GR.sm}px ${GR.md}px`, // 13px 21px golden
        borderRadius: isVira
          ? `${G / 2}px ${GR.md}px ${GR.md}px ${GR.md}px`
          : `${GR.md}px ${G / 2}px ${GR.md}px ${GR.md}px`,
        ...glass(isVira ? null : accent),
        background: isVira ? V.card : `${accent}10`,
        // Rule 4: User messages have 2px violet-500/30 border
        border: isVira
          ? `1px solid ${V.border}`
          : `2px solid ${V.userBorder}`,
        color: V.text,
        fontFamily: FONT, fontSize: 14, lineHeight: 1.65,
        animation: 'fadeIn 0.3s ease-out',
      }}>
        {text}
        <div style={{
          fontSize: 10, color: V.textTer, marginTop: GR.xs,
          textAlign: isVira ? 'left' : 'right',
        }}>
          {timestamp}
        </div>
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: GR.sm,
      padding: `0 0 ${GR.md}px 0`,
    }}>
      <div style={{
        width: G * 4.5, height: G * 4.5, borderRadius: '50%', flexShrink: 0,
        background: `linear-gradient(135deg, ${V.accent}, #EC4899)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
          <circle cx="12" cy="12" r="3" fill="rgba(255,255,255,0.2)" />
        </svg>
      </div>
      <div style={{
        padding: `${GR.sm}px ${GR.md}px`,
        borderRadius: `${G / 2}px ${GR.md}px ${GR.md}px ${GR.md}px`,
        ...glass(),
        display: 'flex', gap: G / 2,
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 6, height: 6, borderRadius: '50%', background: V.textTer,
            animation: `typingDot 1.4s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
    </div>
  )
}

function QuickAction({ label, onClick, accent }) {
  return (
    <button onClick={onClick} style={{
      padding: `${GR.xs}px ${GR.md}px`,
      borderRadius: GR.lg,
      ...glass(accent),
      background: `${accent}10`,
      color: accent, fontFamily: FONT, fontSize: 13, fontWeight: 500,
      cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
    }}>
      {label}
    </button>
  )
}

// Rule 2: Desktop context sidebar
function ContextSidebar({ persona }) {
  const p = PERSONA[persona] || PERSONA.general
  return (
    <div style={{
      width: 260, flexShrink: 0,
      padding: GR.md,
      display: 'flex', flexDirection: 'column', gap: GR.sm,
      borderLeft: `1px solid ${V.border}`,
      overflowY: 'auto',
    }}>
      {/* Care Program */}
      <div style={{ ...glass(p.accent), padding: GR.sm }}>
        <div style={{
          fontFamily: FONT, fontSize: 10, fontWeight: 600, color: V.textTer,
          letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: GR.xs,
        }}>
          Active Program
        </div>
        <div style={{
          fontFamily: FONT_D, fontSize: 15, fontWeight: 700, color: V.text,
        }}>
          {p.label}
        </div>
        <div style={{
          width: GR.xs, height: GR.xs, borderRadius: '50%',
          background: p.accent, marginTop: GR.xs,
          boxShadow: `0 0 ${GR.xs}px ${p.accent}50`,
        }} />
      </div>

      {/* Quick Stats */}
      <div style={{ ...glass(), padding: GR.sm }}>
        <div style={{
          fontFamily: FONT, fontSize: 10, fontWeight: 600, color: V.textTer,
          letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: GR.sm,
        }}>
          Today's Stats
        </div>
        {[
          { label: 'Mood', value: '😊 Great', color: V.green },
          { label: 'Meds', value: '2/4 taken', color: V.amber },
          { label: 'Streak', value: '5 days', color: V.accent },
        ].map(s => (
          <div key={s.label} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: `${G}px 0`,
            borderBottom: `1px solid ${V.border}`,
          }}>
            <span style={{ fontFamily: FONT, fontSize: 12, color: V.textSec }}>{s.label}</span>
            <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: s.color }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div style={{ ...glass(), padding: GR.sm }}>
        <div style={{
          fontFamily: FONT, fontSize: 10, fontWeight: 600, color: V.textTer,
          letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: GR.sm,
        }}>
          Quick Actions
        </div>
        {['Log Mood', 'Check Meds', 'View History'].map(action => (
          <button key={action} style={{
            width: '100%', padding: `${GR.xs}px`,
            marginBottom: G / 2,
            borderRadius: GR.sm,
            ...glass(V.accent),
            background: `${V.accent}08`,
            color: V.textSec, fontFamily: FONT, fontSize: 12, fontWeight: 500,
            cursor: 'pointer', textAlign: 'left',
            transition: 'all 0.15s',
          }}>
            {action}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function ViraChat({ persona = 'general' }) {
  const [messages, setMessages] = useState([
    { role: 'vira', text: PERSONA[persona]?.tone === 'reflective'
        ? "Hello. I'm Vira, your wellness companion. This is a safe space — no judgement, just support. How are you feeling today?"
        : PERSONA[persona]?.tone === 'instructional'
        ? "Good morning! I'm Vira, your heart health assistant. Let's start with today's vitals. Have you taken your blood pressure reading?"
        : PERSONA[persona]?.tone === 'efficient'
        ? "Hi there! I'm Vira, your pharmacy assistant. I can help with refills, medication tracking, and side effect monitoring. What do you need?"
        : "Welcome! I'm Vira, your personal health companion. How can I help you today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [showCrisis, setShowCrisis] = useState(false)
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)
  const accent = PERSONA[persona]?.accent || V.accent

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, typing])

  const checkCrisis = (text) => {
    const lower = text.toLowerCase()
    return CRISIS_KEYWORDS.some(kw => lower.includes(kw))
  }

  const sendMessage = () => {
    const text = input.trim()
    if (!text) return
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    setMessages(prev => [...prev, { role: 'user', text, timestamp: now }])
    setInput('')
    if (checkCrisis(text)) { setShowCrisis(true); return }
    setTyping(true)
    const replies = MOCK_REPLIES[persona] || MOCK_REPLIES.general
    const reply = replies[Math.floor(Math.random() * replies.length)]
    setTimeout(() => {
      setTyping(false)
      setMessages(prev => [...prev, {
        role: 'vira', text: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }])
    }, 1200 + Math.random() * 800)
  }

  const quickActions = persona === 'mental_health'
    ? ['Log my mood', 'Breathing exercise', 'Gratitude check']
    : persona === 'hypertension'
    ? ['Log BP reading', 'Took my meds', 'Salt intake today']
    : persona === 'pharmacy'
    ? ['Refill status', 'Side effects', 'Next appointment']
    : ['How am I doing?', 'Log mood', 'My medications']

  return (
    <div style={{
      display: 'flex', height: '100%',
      background: V.bg, position: 'relative',
    }}>
      {showCrisis && <RedFlagOverlay onDismiss={() => setShowCrisis(false)} />}

      {/* Rule 2: Main Content column */}
      <div style={{
        display: 'flex', flexDirection: 'column', flex: 1,
        minWidth: 0,
      }}>
        {/* Persona header pill */}
        <div style={{
          padding: `${GR.sm}px ${GR.md}px ${GR.xs}px`,
          display: 'flex', alignItems: 'center', gap: GR.xs,
        }}>
          <div style={{
            padding: `${G / 2}px ${GR.sm}px`,
            borderRadius: GR.lg,
            ...glass(accent),
            background: `${accent}12`,
            fontSize: 11, fontWeight: 600, color: accent,
            fontFamily: FONT, letterSpacing: '0.03em',
            textTransform: 'uppercase',
          }}>
            {PERSONA[persona]?.label || 'General'}
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: 11, color: V.textTer, fontFamily: FONT }}>
            AI Assistant
          </div>
        </div>

        {/* Messages — Rule 3: golden ratio spacing */}
        <div ref={scrollRef} style={{
          flex: 1, overflowY: 'auto',
          padding: `${GR.xs}px ${GR.md}px`,
          paddingBottom: isMobile ? GR.xl * 3 : GR.xl * 2,
        }}>
          {messages.map((msg, i) => (
            <ChatBubble key={i} {...msg} persona={persona} />
          ))}
          {typing && <TypingIndicator />}
        </div>

        {/* Quick actions */}
        {messages.length <= 2 && (
          <div style={{
            padding: `0 ${GR.md}px ${GR.xs}px`, display: 'flex', gap: GR.xs,
            overflowX: 'auto', scrollbarWidth: 'none',
          }}>
            {quickActions.map(q => (
              <QuickAction key={q} label={q} accent={accent} onClick={() => {
                setInput(q)
                setTimeout(() => inputRef.current?.focus(), 50)
              }} />
            ))}
          </div>
        )}

        {/* Rule 5: Floating Pill input with inset shadow */}
        <div style={{
          position: 'fixed',
          bottom: isMobile ? G * 8 : GR.md,
          left: isMobile ? 0 : 'auto',
          right: isMobile ? 0 : 'auto',
          width: isMobile ? '100%' : undefined,
          maxWidth: isMobile ? '100%' : 680,
          padding: `${GR.xs}px ${GR.sm}px`,
          paddingBottom: isMobile ? `max(${GR.xs}px, env(safe-area-inset-bottom))` : `${GR.xs}px`,
          ...glass(),
          borderRadius: isMobile ? 0 : GR.lg,
          borderTop: `1px solid ${V.border}`,
          borderLeft: isMobile ? 'none' : undefined,
          borderRight: isMobile ? 'none' : undefined,
          borderBottom: isMobile ? 'none' : undefined,
          zIndex: 50,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: GR.xs,
            background: V.cardSolid,
            borderRadius: GR.lg, // Pill shape
            padding: `${G / 2}px ${G / 2}px ${G / 2}px ${GR.md}px`,
            // Rule 5: Inset shadow for depth
            boxShadow: `inset 0 2px 6px rgba(0,0,0,0.25), inset 0 1px 2px rgba(0,0,0,0.15)`,
            border: `1px solid ${V.border}`,
          }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Talk to Vira..."
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                color: V.text, fontFamily: FONT, fontSize: 15,
                padding: `${GR.sm}px 0`,
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim()}
              style={{
                width: G * 5, height: G * 5,
                borderRadius: '50%',
                background: input.trim() ? `linear-gradient(135deg, ${accent}, #EC4899)` : V.cardSolid,
                border: `1px solid ${input.trim() ? 'transparent' : V.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: input.trim() ? 'pointer' : 'default',
                transition: 'all 0.2s',
                boxShadow: input.trim() ? `0 2px 8px ${accent}40` : 'none',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Rule 2: Desktop Context Sidebar — hidden on mobile */}
      {!isMobile && <ContextSidebar persona={persona} />}

      <style>{`
        @keyframes typingDot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
