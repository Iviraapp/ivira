import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import AuthLayout, { useAuthTheme } from '../../components/auth/AuthLayout'
import PinInput from '../../components/auth/PinInput'
import api from '../../lib/api'

function isMobileDevice() {
  return typeof window !== 'undefined' && /Android|iPhone|iPad|iPod|webOS|BlackBerry|Opera Mini|IEMobile/i.test(navigator.userAgent)
}

function getMobilePlatform() {
  if (typeof window === 'undefined') return 'unknown'
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'unknown'
}

export default function MemberLogin() {
  const [mode, setMode] = useState('signin') // signin | signup
  const [step, setStep] = useState(() => isMobileDevice() ? 'app_prompt' : 'form')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [resolvedGym, setResolvedGym] = useState(null) // { gymName, city }
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [shaking, setShaking] = useState(false)
  const [countdown, setCountdown] = useState(60)
  const [canResend, setCanResend] = useState(false)
  const [btnHover, setBtnHover] = useState(false)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const t = useAuthTheme()
  const { ff, accent, textPrimary, textSec, textTer, errorColor } = t

  // Magic link token redirect
  const tokenParam = searchParams.get('token')
  const gymParam = searchParams.get('gym')
  const codeParam = searchParams.get('code')

  useEffect(() => {
    if (tokenParam && gymParam) {
      localStorage.setItem('ivira_member_token', tokenParam)
      localStorage.setItem('ivira_member_gym', gymParam)
      navigate('/member/dashboard', { replace: true })
    }
  }, [tokenParam, gymParam, navigate])

  // Deep link: auto-fill invite code from URL param
  useEffect(() => {
    if (codeParam) {
      setInviteCode(codeParam)
      setMode('signup')
      setStep('form')
      resolveCode(codeParam)
    }
  }, [codeParam])

  // Already logged in
  useEffect(() => {
    if (localStorage.getItem('ivira_member_token')) navigate('/member/dashboard', { replace: true })
  }, [navigate])

  // Countdown timer for OTP
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

  async function resolveCode(code) {
    if (!code || code.length < 4) { setResolvedGym(null); return }
    try {
      const { data } = await api.get(`/auth/resolve-code/${code.toUpperCase()}`)
      setResolvedGym(data)
    } catch {
      setResolvedGym(null)
    }
  }

  const requestOTP = async () => {
    if (!email.trim() || !email.includes('@')) return setError('Enter a valid email address')
    setError('')
    setLoading(true)
    try {
      if (mode === 'signup') {
        if (!name.trim()) { setLoading(false); return setError('Enter your name') }
        if (!phone.trim() || phone.trim().length < 10) { setLoading(false); return setError('Enter a valid phone number') }
        await api.post('/auth/b2c/register', {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          inviteCode: inviteCode.trim() || undefined,
        })
      } else {
        await api.post('/auth/b2c/otp/request', { email: email.trim() })
      }
      setStep('otp')
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error
      if (err.response?.status === 409) {
        setError('Account already exists. Sign in instead.')
      } else {
        setError(msg || (mode === 'signup' ? 'Could not create account' : 'Could not send code'))
      }
    } finally {
      setLoading(false)
    }
  }

  const resendOTP = async () => {
    if (!canResend) return
    setCanResend(false)
    setCountdown(60)
    try {
      await api.post('/auth/b2c/otp/request', { email: email.trim() })
    } catch {
      setCanResend(true)
    }
  }

  const verifyOTP = async (code) => {
    const otpStr = code || otp.join('')
    if (otpStr.length !== 6) return
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/b2c/otp/verify', { email: email.trim(), otp: otpStr })
      setStep('verifying')
      setTimeout(() => {
        localStorage.setItem('ivira_member_token', data.token)
        if (data.gymId) localStorage.setItem('ivira_member_gym', data.gymId)
        if (data.member) localStorage.setItem('ivira_member', JSON.stringify(data.member))
        navigate('/member/dashboard', { replace: true })
      }, 1200)
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Invalid code')
      setShaking(true)
      setTimeout(() => { setShaking(false); setError(''); setOtp(['', '', '', '', '', '']) }, 1000)
      setLoading(false)
    }
  }

  const switchMode = (newMode) => {
    setMode(newMode)
    setError('')
    setStep('form')
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
      subtitle="Your fitness journey, one tap away."
      tagline="Track. Train. Transform."
      role="member"
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
            {mode === 'signup' ? 'Creating your account...' : 'Securing your session...'}
          </p>
        </div>
      )}

      {/* Mobile App Download Prompt */}
      {step === 'app_prompt' && (() => {
        const platform = getMobilePlatform()
        const isAndroid = platform === 'android'
        const isIOS = platform === 'ios'
        return (
          <>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <img src="/icons/icon-96.png" alt="I V I R A" style={{
                width: 56, height: 56, borderRadius: 16, marginBottom: 16,
                boxShadow: '0 0 40px rgba(26,58,143,0.25)', objectFit: 'cover',
              }} />
              <h2 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 4px', color: textPrimary, letterSpacing: '0.2em', fontFamily: ff }}>
                I V I R A
              </h2>
              <p style={{ fontSize: 14, color: textSec, margin: 0, fontFamily: ff }}>Get the App</p>
            </div>

            <div style={{ marginBottom: 28, textAlign: 'center' }}>
              <h3 style={{ fontSize: 22, fontWeight: 700, color: textPrimary, margin: '0 0 8px', fontFamily: ff }}>
                {isIOS ? 'I V I R A for iOS' : 'Download the I V I R A App'}
              </h3>
              <p style={{ fontSize: 14, color: textSec, margin: 0, lineHeight: 1.6, fontFamily: ff }}>
                {isIOS
                  ? 'The I V I R A iOS app is coming soon. Sign in via web for now.'
                  : 'Track workouts, find gyms, log nutrition, and more — all from the app.'}
              </p>
            </div>

            {isAndroid && (
              <>
                <a href="https://api.ivira.app/downloads/ivira-latest.apk" download style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  width: '100%', padding: '16px 24px', borderRadius: 12,
                  background: accent, color: '#fff', fontSize: 16, fontWeight: 700,
                  fontFamily: ff, textDecoration: 'none', textAlign: 'center',
                  marginBottom: 12, transition: 'opacity 0.2s',
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Download APK
                </a>
                <div style={{ padding: '14px', borderRadius: 10, border: `1px solid ${t.inputBorder}`, textAlign: 'center', opacity: 0.5, marginBottom: 20 }}>
                  <div style={{ fontSize: 11, color: textTer, fontFamily: ff }}>Coming Soon</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: textSec, fontFamily: ff }}>Google Play</div>
                </div>
              </>
            )}

            {isIOS && (
              <div style={{ padding: '20px', borderRadius: 12, border: `1px solid ${t.inputBorder}`, textAlign: 'center', opacity: 0.6, marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: textTer, fontFamily: ff, marginBottom: 4 }}>Coming Soon</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: textSec, fontFamily: ff }}>App Store</div>
              </div>
            )}

            {!isAndroid && !isIOS && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                <div style={{ flex: 1, padding: '12px', borderRadius: 10, border: `1px solid ${t.inputBorder}`, textAlign: 'center', opacity: 0.5 }}>
                  <div style={{ fontSize: 11, color: textTer, fontFamily: ff }}>Coming Soon</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: textSec, fontFamily: ff }}>App Store</div>
                </div>
                <div style={{ flex: 1, padding: '12px', borderRadius: 10, border: `1px solid ${t.inputBorder}`, textAlign: 'center', opacity: 0.5 }}>
                  <div style={{ fontSize: 11, color: textTer, fontFamily: ff }}>Coming Soon</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: textSec, fontFamily: ff }}>Google Play</div>
                </div>
              </div>
            )}

            <div style={{ textAlign: 'center', borderTop: `1px solid ${t.inputBorder}`, paddingTop: 20 }}>
              <p style={{ fontSize: 13, color: textSec, fontFamily: ff, margin: '0 0 8px' }}>
                Already have an account?{' '}
                <button onClick={() => setStep('form')} style={{ background: 'none', border: 'none', color: accent, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: ff }}>
                  Sign in here
                </button>
              </p>
              <p style={{ fontSize: 13, color: textSec, fontFamily: ff, margin: 0 }}>
                New here?{' '}
                <button onClick={() => { setMode('signup'); setStep('form') }} style={{ background: 'none', border: 'none', color: accent, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: ff }}>
                  Create an account
                </button>
              </p>
            </div>
          </>
        )
      })()}

      {/* Sign In / Sign Up Form */}
      {step === 'form' && (
        <>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <img src="/icons/icon-96.png" alt="I V I R A" style={{
              width: 56, height: 56, borderRadius: 16, marginBottom: 16,
              boxShadow: '0 0 40px rgba(26,58,143,0.25)', objectFit: 'cover',
            }} />
            <h2 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 4px', color: textPrimary, letterSpacing: '0.2em', fontFamily: ff }}>
              I V I R A
            </h2>
            <p style={{ fontSize: 14, color: textSec, margin: 0, fontFamily: ff }}>Member Hub</p>
          </div>

          <div style={{ marginBottom: 28 }}>
            <h3 style={{ fontSize: 22, fontWeight: 700, color: textPrimary, margin: '0 0 6px', fontFamily: ff }}>
              {mode === 'signup' ? 'Create Account' : 'Welcome Back'}
            </h3>
            <p style={{ fontSize: 14, color: textSec, margin: 0, lineHeight: 1.5, fontFamily: ff }}>
              {mode === 'signup'
                ? 'Join I V I R A to track workouts and connect with your gym'
                : 'Sign in to access your gym, track progress'}
            </p>
          </div>

          {/* Resolved gym banner */}
          {mode === 'signup' && resolvedGym && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', borderRadius: 10, marginBottom: 16,
              background: `${accent}0d`, border: `1px solid ${accent}26`,
            }}>
              {resolvedGym.logoUrl && (
                <img src={resolvedGym.logoUrl} alt="" style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover' }} />
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: textPrimary, fontFamily: ff }}>
                  Joining {resolvedGym.gymName}
                </div>
                {resolvedGym.city && (
                  <div style={{ fontSize: 11, color: textSec, fontFamily: ff }}>{resolvedGym.city}</div>
                )}
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/>
              </svg>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 8 }}>
            {/* Name (signup only) */}
            {mode === 'signup' && (
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: textSec, marginBottom: 8, letterSpacing: '0.5px', textTransform: 'uppercase', fontFamily: ff }}>
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="Your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={t.inputStyle(false)}
                  onFocus={t.onFocus}
                  onBlur={(e) => t.onBlur(e, false)}
                />
              </div>
            )}

            {/* Email */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: textSec, marginBottom: 8, letterSpacing: '0.5px', textTransform: 'uppercase', fontFamily: ff }}>
                Email Address
              </label>
              <input
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (mode === 'signin' ? requestOTP() : null)}
                autoFocus={mode === 'signin'}
                style={t.inputStyle(!!error)}
                onFocus={t.onFocus}
                onBlur={(e) => t.onBlur(e, !!error)}
              />
            </div>

            {/* Phone (signup only) */}
            {mode === 'signup' && (
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: textSec, marginBottom: 8, letterSpacing: '0.5px', textTransform: 'uppercase', fontFamily: ff }}>
                  Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="+1 (814) 895-7439"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={t.inputStyle(false)}
                  onFocus={t.onFocus}
                  onBlur={(e) => t.onBlur(e, false)}
                />
              </div>
            )}

            {/* Invite Code (signup only) */}
            {mode === 'signup' && (
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: textSec, marginBottom: 8, letterSpacing: '0.5px', textTransform: 'uppercase', fontFamily: ff }}>
                  Gym Invite Code <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="GYM-XXXXXX"
                  value={inviteCode}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase()
                    setInviteCode(val)
                    if (val.length >= 4) resolveCode(val)
                    else setResolvedGym(null)
                  }}
                  style={{
                    ...t.inputStyle(false),
                    letterSpacing: '2px',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                  onFocus={t.onFocus}
                  onBlur={(e) => t.onBlur(e, false)}
                />
                {inviteCode && !resolvedGym && inviteCode.length >= 6 && (
                  <p style={{ color: errorColor, fontSize: 12, margin: '6px 0 0', fontFamily: ff }}>Invalid invite code</p>
                )}
              </div>
            )}
          </div>

          {error && <p style={{ color: errorColor, fontSize: 13, margin: '8px 0 0', fontFamily: ff }}>{error}</p>}

          <button
            onClick={requestOTP}
            disabled={loading}
            onMouseEnter={() => setBtnHover(true)}
            onMouseLeave={() => setBtnHover(false)}
            style={{ ...t.buttonStyle(loading, btnHover), marginTop: 14 }}
          >
            {loading && <Loader2 size={18} style={{ animation: 'authSpin 1s linear infinite' }} />}
            {loading
              ? (mode === 'signup' ? 'Creating...' : 'Sending...')
              : (mode === 'signup' ? 'CREATE ACCOUNT' : 'SEND LOGIN CODE')}
          </button>

          {/* Mode switch */}
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            {mode === 'signin' ? (
              <p style={{ fontSize: 13, color: textSec, fontFamily: ff, margin: 0 }}>
                New here?{' '}
                <button onClick={() => switchMode('signup')} style={{ background: 'none', border: 'none', color: accent, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: ff }}>
                  Create an account
                </button>
              </p>
            ) : (
              <p style={{ fontSize: 13, color: textSec, fontFamily: ff, margin: 0 }}>
                Already have an account?{' '}
                <button onClick={() => switchMode('signin')} style={{ background: 'none', border: 'none', color: accent, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: ff }}>
                  Sign in
                </button>
              </p>
            )}
          </div>
        </>
      )}

      {/* OTP step */}
      {step === 'otp' && (
        <>
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: textPrimary, margin: '0 0 8px', fontFamily: ff }}>
              Enter Verification Code
            </h2>
            <p style={{ fontSize: 14, color: textSec, margin: 0, lineHeight: 1.5, fontFamily: ff }}>
              6-digit code sent to <strong style={{ color: textPrimary }}>{email}</strong>
            </p>
          </div>

          <div style={{ marginBottom: 20 }}>
            <PinInput value={otp} onChange={setOtp} onComplete={verifyOTP} error={!!error} shaking={shaking} />
          </div>

          {error && <p style={{ color: errorColor, fontSize: 13, textAlign: 'center', marginBottom: 12, fontFamily: ff }}>{error}</p>}

          <button
            onClick={() => verifyOTP()}
            disabled={loading}
            onMouseEnter={() => setBtnHover(true)}
            onMouseLeave={() => setBtnHover(false)}
            style={t.buttonStyle(loading, btnHover)}
          >
            {loading && <Loader2 size={18} style={{ animation: 'authSpin 1s linear infinite' }} />}
            {loading ? 'Verifying...' : 'VERIFY'}
          </button>

          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: textSec, fontFamily: ff }}>
            {!canResend ? (
              <span>
                Resend in{' '}
                <span style={{ color: textPrimary, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
                  00:{countdown.toString().padStart(2, '0')}
                </span>
              </span>
            ) : (
              <button onClick={resendOTP} style={{ background: 'none', border: 'none', color: accent, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: ff }}>
                Resend Code
              </button>
            )}
          </div>

          <button
            onClick={() => { setStep('form'); setError(''); setOtp(['', '', '', '', '', '']) }}
            style={{ display: 'block', margin: '16px auto 0', background: 'none', border: 'none', color: accent, fontSize: 14, cursor: 'pointer', fontFamily: ff, transition: 'opacity 0.2s' }}
            onMouseEnter={(e) => (e.target.style.opacity = '0.7')}
            onMouseLeave={(e) => (e.target.style.opacity = '1')}
          >
            Use a different email
          </button>
        </>
      )}
    </AuthLayout>
  )
}
