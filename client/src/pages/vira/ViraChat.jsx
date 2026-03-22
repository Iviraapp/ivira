import { useState, useRef, useEffect } from 'react'
import { V, FONT, FONT_D, PERSONA, CRISIS_KEYWORDS } from '../../components/vira/theme'
import RedFlagOverlay from '../../components/vira/RedFlagOverlay'

const CARD_ACCENTS = [
  '#3B82F6', '#EF4444', '#22C55E', '#F59E0B', '#8B5CF6', '#EC4899',
  '#14B8A6', '#F97316', '#06B6D4', '#10B981', '#6366F1', '#E11D48',
]

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

function ChatBubble({ role, text, timestamp, persona }) {
  const isVira = role === 'vira'
  const accent = PERSONA[persona]?.accent || V.accent

  return (
    <div style={{
      display: 'flex', justifyContent: isVira ? 'flex-start' : 'flex-end',
      marginBottom: 12, padding: '0 4px',
      animation: 'fadeIn 0.3s ease-out',
    }}>
      {isVira && (
        <div style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          background: `linear-gradient(135deg, ${accent}, #EC4899)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginRight: 8, marginTop: 4,
          boxShadow: `0 2px 12px ${accent}40`,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
            <path d="M12 3v1m0 16v1m-8-9H3m18 0h-1M5.6 5.6l.7.7m12.4 12.4l-.7-.7M5.6 18.4l.7-.7M18.7 5.6l-.7.7" />
            <circle cx="12" cy="12" r="3" fill="rgba(255,255,255,0.2)" />
          </svg>
        </div>
      )}
      <div style={{
        maxWidth: '78%',
        padding: '12px 16px',
        borderRadius: isVira ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
        background: isVira ? V.card : `${accent}20`,
        border: `1px solid ${isVira ? V.border : `${accent}30`}`,
        color: V.text,
        fontFamily: FONT, fontSize: 14, lineHeight: 1.6,
      }}>
        {text}
        <div style={{
          fontSize: 10, color: V.textTer, marginTop: 6,
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
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 4px', marginBottom: 12 }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        background: `linear-gradient(135deg, ${V.accent}, #EC4899)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
          <circle cx="12" cy="12" r="3" fill="rgba(255,255,255,0.2)" />
        </svg>
      </div>
      <div style={{
        padding: '12px 18px', borderRadius: '4px 16px 16px 16px',
        background: V.card, border: `1px solid ${V.border}`,
        display: 'flex', gap: 4,
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
      padding: '8px 16px', borderRadius: 20,
      background: `${accent}12`, border: `1px solid ${accent}25`,
      color: accent, fontFamily: FONT, fontSize: 13, fontWeight: 500,
      cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
    }}>
      {label}
    </button>
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
  const scrollRef = useRef(null)
  const inputRef = useRef(null)
  const accent = PERSONA[persona]?.accent || V.accent

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

    if (checkCrisis(text)) {
      setShowCrisis(true)
      return
    }

    // Simulate Vira response
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
      display: 'flex', flexDirection: 'column', height: '100%',
      background: V.bg, position: 'relative',
    }}>
      {showCrisis && <RedFlagOverlay onDismiss={() => setShowCrisis(false)} />}

      {/* Persona header pill */}
      <div style={{
        padding: '12px 16px 8px', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <div style={{
          padding: '4px 12px', borderRadius: 20,
          background: `${accent}15`, border: `1px solid ${accent}25`,
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

      {/* Messages */}
      <div ref={scrollRef} style={{
        flex: 1, overflowY: 'auto', padding: '8px 12px',
        paddingBottom: 140,
      }}>
        {messages.map((msg, i) => (
          <ChatBubble key={i} {...msg} persona={persona} />
        ))}
        {typing && <TypingIndicator />}
      </div>

      {/* Quick actions */}
      {messages.length <= 2 && (
        <div style={{
          padding: '0 16px 8px', display: 'flex', gap: 8,
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

      {/* Input bar */}
      <div style={{
        position: 'fixed', bottom: 72, left: 0, right: 0,
        padding: '8px 12px',
        paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
        background: `${V.bg}F0`, backdropFilter: 'blur(16px)',
        borderTop: `1px solid ${V.border}`,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: V.card, borderRadius: 28,
          border: `1px solid ${V.border}`, padding: '4px 4px 4px 16px',
        }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Talk to Vira..."
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              color: V.text, fontFamily: FONT, fontSize: 15, padding: '10px 0',
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            style={{
              width: 40, height: 40, borderRadius: '50%',
              background: input.trim() ? `linear-gradient(135deg, ${accent}, #EC4899)` : V.border,
              border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: input.trim() ? 'pointer' : 'default',
              transition: 'all 0.2s',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes typingDot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
