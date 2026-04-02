import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import AuthLayout, { useAuthTheme } from '../../components/auth/AuthLayout'
import PinInput from '../../components/auth/PinInput'
import api from '../../lib/api'

export default function TrainerLogin() {
  const [step, setStep] = useState('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [shaking, setShaking] = useState(false)
  const [btnHover, setBtnHover] = useState(false)
  const [countdown, setCountdown] = useState(60)
  const [canResend, setCanResend] = useState(false)
  const navigate = useNavigate()
  const t = useAuthTheme()
  const { ff, accent, textPrimary, textSec, textTer, errorColor } = t

  useEffect(() => {
    if (localStorage.getItem('ivira_trainer_token')) navigate('/trainer/dashboard', { replace: true })
  }, [navigate])

  useEffect(() => {
    if (step !== 'otp') return
    setCountdown(60)
    setCanResend(false)
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { clearInterval(interval); setCanResend(true); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [step])

  const requestOTP = async () => {
    if (!email.trim() || !email.includes('@')) return setError('Enter a valid email address')
    setError('')
    setLoading(true)
    try {
      await api.post('/staff/login/otp/email', { email: email.trim() })
      setStep('otp')
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Trainer not found')
    } finally {
      setLoading(false)
    }
  }

  const resendOTP = async () => {
    if (!canResend) return
    setCanResend(false)
    setCountdown(60)
    try {
      await api.post('/staff/login/otp/email', { email: email.trim() })
    } catch { setCanResend(true) }
  }

  const verifyOTP = async (code) => {
    const otpStr = code || otp.join('')
    if (otpStr.length !== 6) return
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/staff/login/verify/email', { email: email.trim(), otp: otpStr })
      setStep('verifying')
      setTimeout(() => {
        localStorage.setItem('ivira_trainer_token', data.token)
        navigate('/trainer/dashboard', { replace: true })
      }, 1200)
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Invalid code')
      setShaking(true)
      setTimeout(() => { setShaking(false); setError(''); setOtp(['', '', '', '', '', '']) }, 1000)
      setLoading(false)
    }
  }

  const handleGoogleSignIn = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (!clientId) return

    if (window.google?.accounts?.id) {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response) => {
          try {
            const res = await fetch('https://api.ivira.app/api/v1/auth/google', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ idToken: response.credential, role: 'member' }),
            })
            const data = await res.json()
            if (data.token) {
              localStorage.setItem('ivira_token', data.token)
              window.location.href = '/trainer'
            }
          } catch {}
        },
      })
      window.google.accounts.id.prompt()
    } else {
      window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(window.location.origin + '/auth/google/callback')}&response_type=token&scope=email+profile`
    }
  }

  const footerContent = step !== 'verifying' && (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 24 }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={textTer} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0110 0v4" />
      </svg>
      <span style={{ fontSize: 12, color: textTer }}>Secured by IVIRA Guard</span>
    </div>
  )

  return (
    <AuthLayout
      title="IVIRA"
      subtitle="Trainer Portal — manage your sessions."
      tagline="Coach. Inspire. Earn."
      role="trainer"
      footerText={footerContent}
    >
      {/* Verifying */}
      {step === 'verifying' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', border: `3px solid ${t.inputBorder}`, borderTopColor: accent, animation: 'authSpin 0.8s linear infinite', marginBottom: 24 }} />
          <p style={{ fontSize: 16, fontWeight: 600, color: textPrimary, fontFamily: ff, margin: 0 }}>Securing your session...</p>
        </div>
      )}

      {/* Email step */}
      {step === 'email' && (
        <>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: `linear-gradient(135deg, ${accent}, #3B6FD4)`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, boxShadow: '0 0 40px rgba(16,185,129,0.25)' }}>
              <span style={{ fontSize: 24, fontWeight: 900, color: '#fff', fontFamily: ff }}>G</span>
            </div>
            <h2 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 4px', color: textPrimary, fontFamily: ff }}>
              <span style={{ opacity: 0.45 }}>I</span><span>VIRA</span>
            </h2>
            <p style={{ fontSize: 14, color: textSec, margin: 0, fontFamily: ff }}>Trainer Portal</p>
          </div>

          <div style={{ marginBottom: 28 }}>
            <h3 style={{ fontSize: 22, fontWeight: 700, color: textPrimary, margin: '0 0 6px', fontFamily: ff }}>Welcome Back</h3>
            <p style={{ fontSize: 14, color: textSec, margin: 0, lineHeight: 1.5, fontFamily: ff }}>Sign in to manage your clients & sessions</p>
          </div>

          <div style={{ marginBottom: 8 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: textSec, marginBottom: 8, letterSpacing: '0.5px', textTransform: 'uppercase', fontFamily: ff }}>Email Address</label>
            <input type="email" placeholder="trainer@gym.com" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && requestOTP()} autoFocus style={t.inputStyle(!!error)} onFocus={t.onFocus} onBlur={(e) => t.onBlur(e, !!error)} />
            {error && <p style={{ color: errorColor, fontSize: 13, margin: '8px 0 0', fontFamily: ff }}>{error}</p>}
          </div>

          <button onClick={requestOTP} disabled={loading} onMouseEnter={() => setBtnHover(true)} onMouseLeave={() => setBtnHover(false)} style={{ ...t.buttonStyle(loading, btnHover), marginTop: 14 }}>
            {loading && <Loader2 size={18} style={{ animation: 'authSpin 1s linear infinite' }} />}
            {loading ? 'Sending...' : 'SEND LOGIN CODE'}
          </button>

          {/* Google sign-in */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
            <span style={{ fontSize: 12, color: textTer, fontFamily: ff }}>or</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
          </div>
          <button onClick={handleGoogleSignIn} style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            padding: '12px 20px', borderRadius: 12,
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
            color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: ff,
          }}>
            <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.49h4.84a4.14 4.14 0 01-1.8 2.71v2.26h2.92a8.78 8.78 0 002.68-6.62z"/><path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.83.86-3.04.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A8.99 8.99 0 009 18z"/><path fill="#FBBC05" d="M3.96 10.71A5.41 5.41 0 013.68 9c0-.6.1-1.17.28-1.71V4.96H.96A8.99 8.99 0 000 9c0 1.45.35 2.82.96 4.04l3-2.33z"/><path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A8.99 8.99 0 00.96 4.96l3 2.33C4.67 5.16 6.66 3.58 9 3.58z"/></svg>
            Continue with Google
          </button>
        </>
      )}

      {/* OTP step */}
      {step === 'otp' && (
        <>
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: textPrimary, margin: '0 0 8px', fontFamily: ff }}>Enter Verification Code</h2>
            <p style={{ fontSize: 14, color: textSec, margin: 0, lineHeight: 1.5, fontFamily: ff }}>
              6-digit code sent to <strong style={{ color: textPrimary }}>{email}</strong>
            </p>
          </div>

          <div style={{ marginBottom: 20 }}>
            <PinInput value={otp} onChange={setOtp} onComplete={verifyOTP} error={!!error} shaking={shaking} />
          </div>

          {error && <p style={{ color: errorColor, fontSize: 13, textAlign: 'center', marginBottom: 12, fontFamily: ff }}>{error}</p>}

          <button onClick={() => verifyOTP()} disabled={loading} onMouseEnter={() => setBtnHover(true)} onMouseLeave={() => setBtnHover(false)} style={t.buttonStyle(loading, btnHover)}>
            {loading && <Loader2 size={18} style={{ animation: 'authSpin 1s linear infinite' }} />}
            {loading ? 'Verifying...' : 'VERIFY'}
          </button>

          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: textSec, fontFamily: ff }}>
            {!canResend ? (
              <span>Resend in <span style={{ color: textPrimary, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>00:{countdown.toString().padStart(2, '0')}</span></span>
            ) : (
              <button onClick={resendOTP} style={{ background: 'none', border: 'none', color: accent, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: ff }}>Resend Code</button>
            )}
          </div>

          <button onClick={() => { setStep('email'); setError(''); setOtp(['', '', '', '', '', '']) }} style={{ display: 'block', margin: '16px auto 0', background: 'none', border: 'none', color: accent, fontSize: 14, cursor: 'pointer', fontFamily: ff, transition: 'opacity 0.2s' }} onMouseEnter={(e) => (e.target.style.opacity = '0.7')} onMouseLeave={(e) => (e.target.style.opacity = '1')}>
            Use a different email
          </button>
        </>
      )}
    </AuthLayout>
  )
}
