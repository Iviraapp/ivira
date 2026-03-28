import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import AuthLayout, { useAuthTheme } from '../../components/auth/AuthLayout'
import PinInput from '../../components/auth/PinInput'
import api from '../../lib/api'

export default function AdminLogin() {
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
    if (localStorage.getItem('ivira_admin_token')) navigate('/admin/dashboard', { replace: true })
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
      await api.post('/super/otp/email/request', { email: email.trim() })
      setStep('otp')
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Admin not found')
    } finally {
      setLoading(false)
    }
  }

  const resendOTP = async () => {
    if (!canResend) return
    setCanResend(false)
    setCountdown(60)
    try {
      await api.post('/super/otp/email/request', { email: email.trim() })
    } catch { setCanResend(true) }
  }

  const verifyOTP = async (code) => {
    const otpStr = code || otp.join('')
    if (otpStr.length !== 6) return
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/super/otp/email/verify', { email: email.trim(), otp: otpStr })
      setStep('verifying')
      setTimeout(() => {
        localStorage.setItem('ivira_admin_token', data.token)
        navigate('/admin/dashboard', { replace: true })
      }, 1200)
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Invalid code')
      setShaking(true)
      setTimeout(() => { setShaking(false); setError(''); setOtp(['', '', '', '', '', '']) }, 1000)
      setLoading(false)
    }
  }

  const footerContent = step !== 'verifying' && (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 24 }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={textTer} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0110 0v4" />
      </svg>
      <span style={{ fontSize: 12, color: textTer }}>Secured by I V I R A Guard</span>
    </div>
  )

  return (
    <AuthLayout
      title="I V I R A"
      subtitle="Command Center — Super Admin access."
      tagline="Secure. Real-time. Global."
      role="admin"
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
            <h2 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 4px', color: textPrimary, letterSpacing: '-0.02em', fontFamily: ff }}>
              I V I R A
            </h2>
            <p style={{ fontSize: 14, color: textSec, margin: 0, fontFamily: ff }}>Command Center</p>
          </div>

          <div style={{ marginBottom: 28 }}>
            <h3 style={{ fontSize: 22, fontWeight: 700, color: textPrimary, margin: '0 0 6px', fontFamily: ff }}>Welcome Back</h3>
            <p style={{ fontSize: 14, color: textSec, margin: 0, lineHeight: 1.5, fontFamily: ff }}>Sign in with your admin email</p>
          </div>

          <div style={{ marginBottom: 8 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: textSec, marginBottom: 8, letterSpacing: '0.5px', textTransform: 'uppercase', fontFamily: ff }}>Email Address</label>
            <input type="email" placeholder="admin@ivira.app" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && requestOTP()} autoFocus style={t.inputStyle(!!error)} onFocus={t.onFocus} onBlur={(e) => t.onBlur(e, !!error)} />
            {error && <p style={{ color: errorColor, fontSize: 13, margin: '8px 0 0', fontFamily: ff }}>{error}</p>}
          </div>

          <button onClick={requestOTP} disabled={loading} onMouseEnter={() => setBtnHover(true)} onMouseLeave={() => setBtnHover(false)} style={{ ...t.buttonStyle(loading, btnHover), marginTop: 14 }}>
            {loading && <Loader2 size={18} style={{ animation: 'authSpin 1s linear infinite' }} />}
            {loading ? 'Sending...' : 'SEND LOGIN CODE'}
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
