import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import AuthLayout, { useAuthTheme } from '../components/auth/AuthLayout'
import PinInput from '../components/auth/PinInput'
import SubdomainRecoveryModal from '../components/SubdomainRecoveryModal'
import api from '../lib/api'

const langs = [
  { code: 'en', label: 'EN' },
  { code: 'hi', label: 'हि' },
  { code: 'te', label: 'తె' },
  { code: 'ta', label: 'த' },
  { code: 'kn', label: 'ಕ' },
]

export default function Login() {
  const [step, setStep] = useState('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [googleError, setGoogleError] = useState('')
  const [lang, setLang] = useState(() => localStorage.getItem('ivira_lang') || 'en')
  const [btnHover, setBtnHover] = useState(false)
  const [shaking, setShaking] = useState(false)
  const [subdomainModal, setSubdomainModal] = useState(false)
  const [countdown, setCountdown] = useState(60)
  const [canResend, setCanResend] = useState(false)
  const navigate = useNavigate()
  const { login, isAuthenticated } = useAuth()
  const toast = useToast()
  const t = useAuthTheme()
  const { ff, accent, textPrimary, textSec, textTer, errorColor } = t

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true })
  }, [isAuthenticated, navigate])

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

  const handleGoogleSignIn = () => {
    if (!window.google?.accounts?.id) {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
      if (!clientId) return
      window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(window.location.origin + '/auth/google/callback')}&response_type=token&scope=email+profile`
      return
    }
    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: async (response) => {
        try {
          const res = await fetch('https://api.ivira.app/api/v1/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken: response.credential, role: 'owner' }),
          })
          const data = await res.json()
          if (data.token) {
            login(data.token, data.gym)
            localStorage.setItem('ivira_lang', lang)
            toast.success(`Welcome back, ${data.gym.owner_name || data.gym.gym_name}!`)
            const gym = data.gym
            if (gym.onboarding_step !== undefined && gym.onboarding_step < 4) {
              navigate('/onboarding', { replace: true })
            } else {
              navigate('/dashboard', { replace: true })
            }
          } else {
            setGoogleError(data.message || 'Google sign-in failed')
          }
        } catch (err) {
          setGoogleError('Google sign-in failed')
        }
      },
    })
    window.google.accounts.id.prompt()
  }

  const requestOTP = async () => {
    if (!email.trim()) return setError('Please enter your email')
    setError('')
    setLoading(true)
    try {
      await api.post('/auth/otp/email/request', { email: email.trim() })
      setStep('otp')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  const resendOTP = async () => {
    if (!canResend) return
    setCanResend(false)
    setCountdown(60)
    try {
      await api.post('/auth/otp/email/request', { email: email.trim() })
      toast.success('OTP resent successfully')
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) { clearInterval(interval); setCanResend(true); return 0 }
          return prev - 1
        })
      }, 1000)
    } catch {
      toast.error('Failed to resend OTP')
      setCanResend(true)
    }
  }

  const verifyOTP = async (code) => {
    const otpStr = code || otp.join('')
    if (otpStr.length !== 6) return
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/otp/email/verify', { email: email.trim(), otp: otpStr })
      setStep('verifying')
      setTimeout(() => {
        login(data.token, data.gym)
        localStorage.setItem('ivira_lang', lang)
        toast.success(`Welcome back, ${data.gym.owner_name || data.gym.gym_name}!`)
        const gym = data.gym
        if (gym.onboarding_step !== undefined && gym.onboarding_step < 4) {
          navigate('/onboarding', { replace: true })
        } else {
          navigate('/dashboard', { replace: true })
        }
      }, 1500)
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP')
      setShaking(true)
      setTimeout(() => {
        setShaking(false)
        setError('')
        setOtp(['', '', '', '', '', ''])
      }, 1000)
      setLoading(false)
    }
  }

  const footerContent = step !== 'verifying' && (
    <>
      <p style={{ textAlign: 'center', marginTop: 28, fontSize: 14, color: textSec }}>
        New gym owner?{' '}
        <a
          href="/onboarding"
          style={{ color: accent, fontWeight: 600, textDecoration: 'none', transition: 'opacity 0.2s' }}
          onMouseEnter={(e) => (e.target.style.opacity = '0.7')}
          onMouseLeave={(e) => (e.target.style.opacity = '1')}
        >
          Register your gym
        </a>
      </p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 20 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={textTer} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
        <span style={{ fontSize: 12, color: textTer }}>Secured by IVIRA Guard</span>
      </div>
    </>
  )

  return (
    <AuthLayout
      title="IVIRA"
      subtitle="Access your enterprise dashboard."
      tagline="Secure. Real-time. Global."
      role="owner"
      langs={langs}
      activeLang={lang}
      onLangChange={setLang}
      footerText={footerContent}
    >
      {/* Verifying spinner */}
      {step === 'verifying' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            border: `3px solid ${t.inputBorder}`, borderTopColor: accent,
            animation: 'authSpin 0.8s linear infinite', marginBottom: 24,
          }} />
          <p style={{ fontSize: 16, fontWeight: 600, color: textPrimary, fontFamily: ff, margin: 0 }}>
            Securing your session...
          </p>
        </div>
      )}

      {/* Email step */}
      {step === 'email' && (
        <>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <img src="/icons/icon-96.png" alt="I V I R A" style={{
              width: 56, height: 56, borderRadius: 16, marginBottom: 16,
              boxShadow: '0 0 40px rgba(16,185,129,0.25)', objectFit: 'cover',
            }} />
            <h2 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 4px', color: textPrimary, fontFamily: ff }}>
              <span style={{ opacity: 0.45 }}>I</span><span>VIRA</span>
            </h2>
            <p style={{ fontSize: 14, color: textSec, margin: 0, fontFamily: ff }}>Owner Dashboard</p>
          </div>

          <div style={{ marginBottom: 28 }}>
            <h3 style={{ fontSize: 22, fontWeight: 700, color: textPrimary, margin: '0 0 6px', fontFamily: ff }}>Welcome Back</h3>
            <p style={{ fontSize: 14, color: textSec, margin: 0, lineHeight: 1.5, fontFamily: ff }}>Sign in to your gym dashboard</p>
          </div>

          <div style={{ marginBottom: 8 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: textSec, marginBottom: 8, letterSpacing: '0.5px', textTransform: 'uppercase', fontFamily: ff }}>
              Email address
            </label>
            <input
              type="email"
              placeholder="owner@gym.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && requestOTP()}
              autoFocus
              style={t.inputStyle(!!error)}
              onFocus={t.onFocus}
              onBlur={(e) => t.onBlur(e, !!error)}
            />
            {error && <p style={{ color: errorColor, fontSize: 13, margin: '8px 0 0', fontFamily: ff }}>{error}</p>}
          </div>

          <button
            onClick={requestOTP}
            disabled={loading}
            onMouseEnter={() => setBtnHover(true)}
            onMouseLeave={() => setBtnHover(false)}
            style={{ ...t.buttonStyle(loading, btnHover), marginTop: 14 }}
          >
            {loading && <Loader2 size={18} style={{ animation: 'authSpin 1s linear infinite' }} />}
            {loading ? 'Sending...' : 'SEND LOGIN CODE'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0 16px' }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>or</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              padding: '12px 20px', borderRadius: 12,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.49h4.84a4.14 4.14 0 01-1.8 2.71v2.26h2.92a8.78 8.78 0 002.68-6.62z"/><path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.83.86-3.04.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A8.99 8.99 0 009 18z"/><path fill="#FBBC05" d="M3.96 10.71A5.41 5.41 0 013.68 9c0-.6.1-1.17.28-1.71V4.96H.96A8.99 8.99 0 000 9c0 1.45.35 2.82.96 4.04l3-2.33z"/><path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A8.99 8.99 0 00.96 4.96l3 2.33C4.67 5.16 6.66 3.58 9 3.58z"/></svg>
            Continue with Google
          </button>

          {googleError && <p style={{ color: errorColor, fontSize: 13, textAlign: 'center', margin: '8px 0 0', fontFamily: ff }}>{googleError}</p>}

          <p style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: textTer, fontFamily: ff }}>
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); setSubdomainModal(true) }}
              style={{ color: textTer, textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={(e) => (e.target.style.color = textSec)}
              onMouseLeave={(e) => (e.target.style.color = textTer)}
            >
              Forgot your gym's custom subdomain?
            </a>
          </p>
        </>
      )}

      {/* OTP step */}
      {step === 'otp' && (
        <>
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: textPrimary, margin: 0, fontFamily: ff }}>
              Verify Your Identity
            </h2>
            <p style={{ fontSize: 14, color: textSec, margin: '8px 0 0', fontFamily: ff, lineHeight: 1.5 }}>
              Enter the 6-digit code sent to your registered device.
            </p>
            <p style={{ fontSize: 14, color: textSec, margin: '8px 0 0', fontFamily: ff }}>
              Sent to <strong style={{ color: textPrimary }}>{email}</strong>
            </p>
          </div>

          <div style={{ marginBottom: 24 }}>
            <PinInput
              value={otp}
              onChange={setOtp}
              onComplete={verifyOTP}
              error={!!error}
              shaking={shaking}
            />
          </div>

          {error && <p style={{ color: errorColor, fontSize: 13, textAlign: 'center', marginBottom: 12, fontFamily: ff }}>{error}</p>}

          <button
            onClick={() => verifyOTP()}
            disabled={loading}
            onMouseEnter={() => setBtnHover(true)}
            onMouseLeave={() => setBtnHover(false)}
            style={t.buttonStyle(loading, btnHover)}
          >
            {loading && (
              <div style={{
                width: 16, height: 16, borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
                animation: 'authSpin 0.6s linear infinite',
              }} />
            )}
            {loading ? 'Verifying...' : 'VERIFY'}
          </button>

          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, fontFamily: ff, color: textSec }}>
            {!canResend ? (
              <span>
                Didn't receive the code? Resend in{' '}
                <span style={{ color: textPrimary, fontWeight: 600 }}>
                  00:{countdown.toString().padStart(2, '0')}
                </span>
              </span>
            ) : (
              <button
                onClick={resendOTP}
                style={{ background: 'none', border: 'none', color: accent, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: ff }}
                onMouseEnter={(e) => (e.target.style.opacity = '0.7')}
                onMouseLeave={(e) => (e.target.style.opacity = '1')}
              >
                Resend Code
              </button>
            )}
          </div>

          <button
            onClick={() => { setStep('email'); setError(''); setOtp(['', '', '', '', '', '']) }}
            style={{ display: 'block', margin: '20px auto 0', background: 'none', border: 'none', color: accent, fontSize: 14, cursor: 'pointer', fontFamily: ff, transition: 'opacity 0.2s' }}
            onMouseEnter={(e) => (e.target.style.opacity = '0.7')}
            onMouseLeave={(e) => (e.target.style.opacity = '1')}
          >
            Use a different email
          </button>
        </>
      )}

      <SubdomainRecoveryModal open={subdomainModal} onClose={() => setSubdomainModal(false)} />
    </AuthLayout>
  )
}
