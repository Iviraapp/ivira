import { useState, useRef, useEffect } from 'react'
import { V, G, GR, FONT, FONT_D, glass } from '../../components/vira/theme'

const INTAKE_QUESTIONS = [
  { key: 'name', question: "Let's get started. What's your full name?", type: 'text' },
  { key: 'age', question: "Thanks! And how old are you?", type: 'number' },
  { key: 'concern', question: "What's your primary health concern? For example: blood pressure management, mental wellness, medication management, or general health.", type: 'text' },
  { key: 'conditions', question: "Do you have any existing medical conditions? If none, just type 'None'.", type: 'text' },
  { key: 'medications', question: "Are you currently taking any medications? Please list them, or type 'None'.", type: 'text' },
  { key: 'allergies', question: "Any known allergies — food or medication? Type 'None' if not.", type: 'text' },
  { key: 'emergency_name', question: "Almost done! Who should we contact in case of an emergency? Please share their name.", type: 'text' },
  { key: 'emergency_phone', question: "And their phone number?", type: 'tel' },
]

const FIELD_LABELS = {
  name: 'Full Name', age: 'Age', concern: 'Primary Concern',
  conditions: 'Medical Conditions', medications: 'Current Medications',
  allergies: 'Allergies', emergency_name: 'Emergency Contact', emergency_phone: 'Emergency Phone',
}

// Rule 4: Vira avatar always visible left, user messages have 2px violet-500/30 border
// Rule 3: gap-4 (GR.md) between bubbles
function ChatBubble({ role, text }) {
  const isVira = role === 'vira'
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'row', // Rule 4: avatar always on left
      alignItems: 'flex-start',
      gap: GR.sm,
      padding: `0 0 ${GR.md}px 0`, // Rule 3: golden ratio gap
    }}>
      {/* Rule 4: Always-visible avatar */}
      <div style={{
        width: G * 4, height: G * 4, borderRadius: '50%', flexShrink: 0,
        background: isVira
          ? `linear-gradient(135deg, ${V.accent}, #EC4899)`
          : V.cardSolid,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginTop: G / 4,
        border: isVira ? 'none' : `1px solid ${V.border}`,
      }}>
        {isVira ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
            <circle cx="12" cy="12" r="3" fill="rgba(255,255,255,0.2)" />
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={V.textTer} strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        )}
      </div>
      <div style={{
        maxWidth: '85%',
        padding: `${GR.sm}px ${GR.md}px`,
        borderRadius: isVira
          ? `${G / 2}px ${GR.md}px ${GR.md}px ${GR.md}px`
          : `${GR.md}px ${G / 2}px ${GR.md}px ${GR.md}px`,
        ...glass(isVira ? null : V.accent),
        background: isVira ? V.card : `${V.accent}10`,
        // Rule 4: User messages have 2px violet-500/30 border
        border: isVira
          ? `1px solid ${V.border}`
          : `2px solid ${V.userBorder}`,
        color: V.text, fontFamily: FONT, fontSize: 14, lineHeight: 1.5,
      }}>
        {text}
      </div>
    </div>
  )
}

export default function ViraIntake() {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState({})
  const [messages, setMessages] = useState([
    { role: 'vira', text: "Welcome! I'll help you set up your health profile through a quick conversation — much easier than filling out forms. Ready?" },
    { role: 'vira', text: INTAKE_QUESTIONS[0].question },
  ])
  const [input, setInput] = useState('')
  const [complete, setComplete] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const handleSubmit = () => {
    const text = input.trim()
    if (!text) return
    const currentQ = INTAKE_QUESTIONS[step]
    const newAnswers = { ...answers, [currentQ.key]: text }
    setAnswers(newAnswers)
    setMessages(prev => [...prev, { role: 'user', text }])
    setInput('')
    if (step + 1 < INTAKE_QUESTIONS.length) {
      const nextQ = INTAKE_QUESTIONS[step + 1]
      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'vira', text: nextQ.question }])
        setStep(step + 1)
      }, 600)
    } else {
      setTimeout(() => {
        setMessages(prev => [...prev, {
          role: 'vira',
          text: "That's everything I need. Please review your information below and confirm.",
        }])
        setComplete(true)
      }, 600)
    }
  }

  const progress = complete ? 100 : ((step) / INTAKE_QUESTIONS.length) * 100

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: V.bg,
    }}>
      {/* Progress bar */}
      <div style={{ padding: `${GR.sm}px ${GR.md}px 0` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: GR.xs }}>
          <span style={{
            fontFamily: FONT, fontSize: 11, fontWeight: 600, color: V.textSec,
            letterSpacing: '0.04em', textTransform: 'uppercase',
          }}>
            Health Profile Intake
          </span>
          <span style={{ fontFamily: FONT, fontSize: 11, color: V.textTer }}>
            {complete ? 'Complete' : `${step + 1} of ${INTAKE_QUESTIONS.length}`}
          </span>
        </div>
        <div style={{
          height: G / 2, borderRadius: G / 4, background: V.cardSolid, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', borderRadius: G / 4,
            background: `linear-gradient(90deg, ${V.accent}, #EC4899)`,
            width: `${progress}%`, transition: 'width 0.4s ease',
          }} />
        </div>
      </div>

      {/* Chat messages */}
      <div ref={scrollRef} style={{
        flex: 1, overflowY: 'auto',
        padding: `${GR.sm}px ${GR.md}px`,
        paddingBottom: complete ? GR.md : GR.xl * 2,
      }}>
        {messages.map((msg, i) => (
          <ChatBubble key={i} {...msg} />
        ))}

        {/* Summary card */}
        {complete && (
          <div style={{
            margin: `${GR.md}px 0`,
            padding: GR.md,
            ...glass(V.accent),
            borderTop: `3px solid ${V.accent}`,
            animation: 'fadeIn 0.4s ease-out',
          }}>
            <h3 style={{
              fontFamily: FONT_D, fontSize: 16, fontWeight: 700,
              color: V.text, margin: `0 0 ${GR.md}px`,
            }}>
              Your Health Profile
            </h3>

            {Object.entries(answers).map(([key, val]) => (
              <div key={key} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: `${GR.sm}px 0`,
                borderBottom: `1px solid ${V.border}`,
              }}>
                <span style={{ fontFamily: FONT, fontSize: 13, color: V.textSec }}>
                  {FIELD_LABELS[key]}
                </span>
                <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: V.text, textAlign: 'right', maxWidth: '55%' }}>
                  {val}
                </span>
              </div>
            ))}

            <button style={{
              marginTop: GR.md, width: '100%', padding: `${GR.sm}px`,
              borderRadius: GR.md, border: 'none',
              background: `linear-gradient(135deg, ${V.accent}, #EC4899)`,
              color: '#fff', fontFamily: FONT, fontSize: 15, fontWeight: 700,
              cursor: 'pointer',
              boxShadow: `0 ${G / 2}px ${GR.md}px ${V.accentGlow}`,
            }}>
              Confirm & Save Profile
            </button>
          </div>
        )}
      </div>

      {/* Rule 5: Floating Pill input with inset shadow */}
      {!complete && (
        <div style={{
          position: 'fixed', bottom: G * 8,
          left: 0, right: 0,
          padding: `${GR.xs}px ${GR.sm}px`,
          paddingBottom: `max(${GR.xs}px, env(safe-area-inset-bottom))`,
          ...glass(),
          borderRadius: 0,
          borderTop: `1px solid ${V.border}`,
          borderLeft: 'none', borderRight: 'none', borderBottom: 'none',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: GR.xs,
            background: V.cardSolid,
            borderRadius: GR.lg, // Pill shape
            padding: `${G / 2}px ${G / 2}px ${G / 2}px ${GR.md}px`,
            // Rule 5: Inset shadow for depth
            boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.25), inset 0 1px 2px rgba(0,0,0,0.15)',
            border: `1px solid ${V.border}`,
          }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="Type your answer..."
              type={INTAKE_QUESTIONS[step]?.type === 'number' ? 'number' : INTAKE_QUESTIONS[step]?.type === 'tel' ? 'tel' : 'text'}
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                color: V.text, fontFamily: FONT, fontSize: 15,
                padding: `${GR.sm}px 0`,
              }}
            />
            <button
              onClick={handleSubmit}
              disabled={!input.trim()}
              style={{
                width: G * 5, height: G * 5, borderRadius: '50%',
                background: input.trim() ? `linear-gradient(135deg, ${V.accent}, #EC4899)` : V.cardSolid,
                border: `1px solid ${input.trim() ? 'transparent' : V.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: input.trim() ? 'pointer' : 'default',
                boxShadow: input.trim() ? `0 2px 8px ${V.accentGlow}` : 'none',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
