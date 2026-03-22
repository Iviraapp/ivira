import { useState, useRef, useEffect } from 'react'
import { V, FONT, FONT_D } from '../../components/vira/theme'

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

function ChatBubble({ role, text }) {
  const isVira = role === 'vira'
  return (
    <div style={{
      display: 'flex', justifyContent: isVira ? 'flex-start' : 'flex-end',
      marginBottom: 10,
    }}>
      {isVira && (
        <div style={{
          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
          background: `linear-gradient(135deg, ${V.accent}, #EC4899)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginRight: 8, marginTop: 2,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
            <circle cx="12" cy="12" r="3" fill="rgba(255,255,255,0.2)" />
          </svg>
        </div>
      )}
      <div style={{
        maxWidth: '80%', padding: '10px 14px',
        borderRadius: isVira ? '4px 14px 14px 14px' : '14px 4px 14px 14px',
        background: isVira ? V.card : `${V.accent}20`,
        border: `1px solid ${isVira ? V.border : `${V.accent}30`}`,
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
      <div style={{ padding: '12px 16px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
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
          height: 4, borderRadius: 2, background: V.border, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', borderRadius: 2,
            background: `linear-gradient(90deg, ${V.accent}, #EC4899)`,
            width: `${progress}%`, transition: 'width 0.4s ease',
          }} />
        </div>
      </div>

      {/* Chat messages */}
      <div ref={scrollRef} style={{
        flex: 1, overflowY: 'auto', padding: '12px 12px',
        paddingBottom: complete ? 16 : 80,
      }}>
        {messages.map((msg, i) => (
          <ChatBubble key={i} {...msg} />
        ))}

        {/* Summary card */}
        {complete && (
          <div style={{
            margin: '16px 0', padding: '20px', borderRadius: 16,
            background: V.card, border: `1px solid ${V.border}`,
            borderTop: `3px solid ${V.accent}`,
            animation: 'fadeIn 0.4s ease-out',
          }}>
            <h3 style={{
              fontFamily: FONT_D, fontSize: 16, fontWeight: 700,
              color: V.text, margin: '0 0 16px',
            }}>
              Your Health Profile
            </h3>

            {Object.entries(answers).map(([key, val]) => (
              <div key={key} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '10px 0', borderBottom: `1px solid ${V.border}`,
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
              marginTop: 20, width: '100%', padding: '14px',
              borderRadius: 14, border: 'none',
              background: `linear-gradient(135deg, ${V.accent}, #EC4899)`,
              color: '#fff', fontFamily: FONT, fontSize: 15, fontWeight: 700,
              cursor: 'pointer',
              boxShadow: `0 4px 20px ${V.accentGlow}`,
            }}>
              Confirm & Save Profile
            </button>
          </div>
        )}
      </div>

      {/* Input bar (hidden when complete) */}
      {!complete && (
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
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="Type your answer..."
              type={INTAKE_QUESTIONS[step]?.type === 'number' ? 'number' : INTAKE_QUESTIONS[step]?.type === 'tel' ? 'tel' : 'text'}
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                color: V.text, fontFamily: FONT, fontSize: 15, padding: '10px 0',
              }}
            />
            <button
              onClick={handleSubmit}
              disabled={!input.trim()}
              style={{
                width: 40, height: 40, borderRadius: '50%',
                background: input.trim() ? `linear-gradient(135deg, ${V.accent}, #EC4899)` : V.border,
                border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: input.trim() ? 'pointer' : 'default',
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
