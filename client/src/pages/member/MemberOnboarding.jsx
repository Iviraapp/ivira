import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Fingerprint, Smartphone, Heart, Dumbbell, Scale, Zap, ChevronRight, Check, Sparkles } from 'lucide-react'
import api from '../../lib/api'

const FONT = "'Inter', -apple-system, sans-serif"
const M = {
  bg: '#050505', card: '#121212', border: '#1F1F1F',
  text: '#FFFFFF', textSec: 'rgba(255,255,255,0.6)', textTer: 'rgba(255,255,255,0.35)',
  accent: '#7C3AED', accentSoft: 'rgba(124,58,237,0.12)', accentGlow: 'rgba(124,58,237,0.3)',
  green: '#34A853',
}

// Lightweight confetti — pure canvas, no deps
function fireConfetti(canvas) {
  const ctx = canvas.getContext('2d')
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  const particles = []
  const colors = ['#7C3AED', '#A78BFA', '#34A853', '#FBBC05', '#EA4335', '#FFFFFF']

  for (let i = 0; i < 150; i++) {
    particles.push({
      x: canvas.width / 2 + (Math.random() - 0.5) * 200,
      y: canvas.height / 2,
      vx: (Math.random() - 0.5) * 15,
      vy: -(Math.random() * 15 + 5),
      size: Math.random() * 8 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
      gravity: 0.3 + Math.random() * 0.2,
      opacity: 1,
    })
  }

  let frame = 0
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    let alive = false
    for (const p of particles) {
      p.x += p.vx
      p.vy += p.gravity
      p.y += p.vy
      p.rotation += p.rotationSpeed
      p.opacity -= 0.005
      if (p.opacity <= 0) continue
      alive = true
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate((p.rotation * Math.PI) / 180)
      ctx.globalAlpha = p.opacity
      ctx.fillStyle = p.color
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6)
      ctx.restore()
    }
    frame++
    if (alive && frame < 180) requestAnimationFrame(animate)
  }
  animate()
}

function StepIndicator({ current, total }) {
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 40 }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{
          width: i === current ? 32 : 8, height: 8, borderRadius: 4,
          background: i <= current ? M.accent : M.border,
          transition: 'all 0.4s ease',
        }} />
      ))}
    </div>
  )
}

function BiometricStep({ onNext, onSkip }) {
  const [status, setStatus] = useState('idle') // idle, loading, success, error
  const canWebAuthn = typeof window !== 'undefined' && !!window.PublicKeyCredential

  const handleEnable = async () => {
    if (!canWebAuthn) { onSkip(); return }
    setStatus('loading')
    try {
      // Simulate WebAuthn — in production this would call navigator.credentials.create()
      await new Promise(r => setTimeout(r, 1500))
      setStatus('success')
      setTimeout(onNext, 800)
    } catch {
      setStatus('error')
    }
  }

  return (
    <div style={{ textAlign: 'center', padding: '0 20px' }}>
      {/* Glowing fingerprint */}
      <div style={{
        width: 140, height: 140, borderRadius: '50%', margin: '0 auto 32px',
        background: `radial-gradient(circle, ${M.accentGlow} 0%, transparent 70%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'pulse 2s ease-in-out infinite',
      }}>
        <div style={{
          width: 100, height: 100, borderRadius: '50%',
          background: M.card, border: `2px solid ${M.accent}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {status === 'success' ? (
            <Check size={48} color={M.green} />
          ) : (
            <Fingerprint size={48} color={M.accent} />
          )}
        </div>
      </div>

      <h2 style={{ fontSize: 22, fontWeight: 700, color: M.text, margin: '0 0 8px', fontFamily: FONT }}>
        Secure Your Account
      </h2>
      <p style={{ fontSize: 14, color: M.textSec, margin: '0 0 32px', fontFamily: FONT, lineHeight: 1.5 }}>
        Enable biometric login for instant, password-free access
      </p>

      <button
        onClick={handleEnable}
        disabled={status === 'loading' || status === 'success'}
        style={{
          width: '100%', maxWidth: 320, padding: '16px', borderRadius: 14,
          background: status === 'success' ? M.green : M.accent,
          border: 'none', color: '#fff', fontSize: 16, fontWeight: 600,
          cursor: 'pointer', fontFamily: FONT, transition: 'all 0.3s',
          opacity: status === 'loading' ? 0.7 : 1,
        }}
      >
        {status === 'loading' ? 'Setting up...' : status === 'success' ? 'Enabled!' : 'Enable Biometric'}
      </button>

      <button
        onClick={onSkip}
        style={{
          display: 'block', margin: '20px auto 0', background: 'none', border: 'none',
          color: M.textTer, fontSize: 13, cursor: 'pointer', fontFamily: FONT,
        }}
      >
        Skip for now
      </button>
    </div>
  )
}

function HealthSyncStep({ onNext, onSkip }) {
  const [syncing, setSyncing] = useState(null) // null, 'google', 'apple'
  const [synced, setSynced] = useState(false)

  const isIOS = /iPhone|iPad/.test(navigator.userAgent)

  const handleSync = async (provider) => {
    setSyncing(provider)
    // Simulate sync
    await new Promise(r => setTimeout(r, 2000))
    setSynced(true)
    setTimeout(onNext, 1000)
  }

  return (
    <div style={{ textAlign: 'center', padding: '0 20px' }}>
      <div style={{
        width: 100, height: 100, borderRadius: '50%', margin: '0 auto 32px',
        background: M.card, border: `2px solid ${synced ? M.green : M.accent}40`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'border-color 0.3s',
      }}>
        {synced ? (
          <Check size={44} color={M.green} />
        ) : (
          <Heart size={44} color={M.accent} />
        )}
      </div>

      <h2 style={{ fontSize: 22, fontWeight: 700, color: M.text, margin: '0 0 8px', fontFamily: FONT }}>
        {synced ? 'Synced!' : 'Connect Health Data'}
      </h2>
      <p style={{ fontSize: 14, color: M.textSec, margin: '0 0 32px', fontFamily: FONT }}>
        Track steps, calories, and heart rate automatically
      </p>

      {!synced && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 320, margin: '0 auto' }}>
          {!isIOS && (
            <button
              onClick={() => handleSync('google_fit')}
              disabled={!!syncing}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                padding: '16px', borderRadius: 14, width: '100%',
                background: syncing === 'google_fit' ? M.accentSoft : M.card,
                border: `1px solid ${M.border}`, color: M.text,
                fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: FONT,
              }}
            >
              <Smartphone size={20} />
              {syncing === 'google_fit' ? 'Connecting...' : 'Google Fit'}
            </button>
          )}
          <button
            onClick={() => handleSync('apple_health')}
            disabled={!!syncing}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              padding: '16px', borderRadius: 14, width: '100%',
              background: syncing === 'apple_health' ? M.accentSoft : M.card,
              border: `1px solid ${M.border}`, color: M.text,
              fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: FONT,
            }}
          >
            <Heart size={20} />
            {syncing === 'apple_health' ? 'Connecting...' : 'Apple Health'}
          </button>
        </div>
      )}

      <button
        onClick={onSkip}
        style={{
          display: 'block', margin: '20px auto 0', background: 'none', border: 'none',
          color: M.textTer, fontSize: 13, cursor: 'pointer', fontFamily: FONT,
        }}
      >
        Skip for now
      </button>
    </div>
  )
}

function GoalStep({ onComplete }) {
  const [selected, setSelected] = useState(null)

  const goals = [
    { key: 'lose_weight', label: 'Lose Weight', icon: Scale, desc: 'Burn fat, get lean' },
    { key: 'build_muscle', label: 'Build Muscle', icon: Dumbbell, desc: 'Gain strength & size' },
    { key: 'stay_fit', label: 'Stay Fit', icon: Zap, desc: 'General wellness' },
  ]

  return (
    <div style={{ textAlign: 'center', padding: '0 20px' }}>
      <Sparkles size={40} color={M.accent} style={{ marginBottom: 16 }} />
      <h2 style={{ fontSize: 22, fontWeight: 700, color: M.text, margin: '0 0 8px', fontFamily: FONT }}>
        What's Your Goal?
      </h2>
      <p style={{ fontSize: 14, color: M.textSec, margin: '0 0 32px', fontFamily: FONT }}>
        We'll personalize your dashboard
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 360, margin: '0 auto 32px' }}>
        {goals.map(({ key, label, icon: Icon, desc }) => (
          <button
            key={key}
            onClick={() => setSelected(key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 16,
              padding: '18px 20px', borderRadius: 16, width: '100%',
              background: selected === key ? M.accentSoft : M.card,
              border: `2px solid ${selected === key ? M.accent : M.border}`,
              cursor: 'pointer', fontFamily: FONT, textAlign: 'left',
              transition: 'all 0.2s',
              boxShadow: selected === key ? `0 0 20px ${M.accentGlow}` : 'none',
            }}
          >
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: selected === key ? M.accent + '20' : '#0A0A0A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Icon size={24} color={selected === key ? M.accent : M.textSec} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: M.text }}>{label}</div>
              <div style={{ fontSize: 12, color: M.textSec, marginTop: 2 }}>{desc}</div>
            </div>
            {selected === key && (
              <Check size={20} color={M.accent} style={{ marginLeft: 'auto' }} />
            )}
          </button>
        ))}
      </div>

      <button
        onClick={() => selected && onComplete(selected)}
        disabled={!selected}
        style={{
          width: '100%', maxWidth: 360, padding: '16px', borderRadius: 14,
          background: selected ? M.accent : M.border,
          border: 'none', color: '#fff', fontSize: 16, fontWeight: 600,
          cursor: selected ? 'pointer' : 'not-allowed', fontFamily: FONT,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          transition: 'all 0.3s',
        }}
      >
        Continue
        <ChevronRight size={18} />
      </button>
    </div>
  )
}

export default function MemberOnboarding() {
  const [step, setStep] = useState(0) // 0=biometric, 1=health, 2=goal
  const [completed, setCompleted] = useState(false)
  const canvasRef = useRef(null)
  const navigate = useNavigate()

  const member = JSON.parse(localStorage.getItem('ivira_member') || '{}')
  const gymName = member?.gymName || 'your gym'

  const handleComplete = async (goal) => {
    const memberId = member?.id
    if (memberId) {
      try {
        const token = localStorage.getItem('ivira_member_token')
        await api.patch(`/member/profile/${memberId}`, {
          primary_goal: goal,
          is_onboarded: true,
        }, { headers: { Authorization: `Bearer ${token}` } })
      } catch (err) {
        console.error('Failed to save profile:', err)
      }
    }

    // Update local state
    const updated = { ...member, is_onboarded: true, primary_goal: goal }
    localStorage.setItem('ivira_member', JSON.stringify(updated))

    setCompleted(true)

    // Fire confetti
    setTimeout(() => {
      if (canvasRef.current) fireConfetti(canvasRef.current)
    }, 200)

    // Navigate to dashboard after 3s
    setTimeout(() => navigate('/member/dashboard', { replace: true }), 3500)
  }

  return (
    <div style={{
      minHeight: '100vh', background: M.bg, fontFamily: FONT,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '40px 16px', position: 'relative', overflow: 'hidden',
    }}>
      {/* Confetti canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          pointerEvents: 'none', zIndex: 50,
        }}
      />

      {completed ? (
        <div style={{ textAlign: 'center', zIndex: 10 }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: M.green, display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center',
            marginBottom: 24, boxShadow: `0 0 60px ${M.green}40`,
          }}>
            <Check size={40} color="#fff" />
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: M.text, margin: '0 0 8px' }}>
            You're All Set!
          </h1>
          <p style={{ fontSize: 16, color: M.textSec }}>
            Welcome to {gymName}
          </p>
        </div>
      ) : (
        <div style={{ width: '100%', maxWidth: 440 }}>
          <StepIndicator current={step} total={3} />

          {step === 0 && (
            <BiometricStep
              onNext={() => setStep(1)}
              onSkip={() => setStep(1)}
            />
          )}
          {step === 1 && (
            <HealthSyncStep
              onNext={() => setStep(2)}
              onSkip={() => setStep(2)}
            />
          )}
          {step === 2 && (
            <GoalStep onComplete={handleComplete} />
          )}
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
        }
      `}</style>
    </div>
  )
}
