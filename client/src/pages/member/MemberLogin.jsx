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
  const [step, setStep] = useState(() => isMobileDevice() ? 'app_prompt' : 'email')
  const [email, setEmail] = useState('')
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
  useEffect(() => {
    if (tokenParam && gymParam) {
      localStorage.setItem('ivira_member_token', tokenParam)
      localStorage.setItem('ivira_member_gym', gymParam)
      navigate('/member/dashboard', { replace: true })
    }
  }, [tokenParam, gymParam, navigate])

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
      await api.post('/members/login/otp/email', { email: email.trim() })
      setStep('otp')
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Member not found')
    } finally {
      setLoading(false)
    }
  }

  const resendOTP = async () => {
    if (!canResend) return
    setCanResend(false)
    setCountdown(60)
    try {
      await api.post('/members/login/otp/email', { email: email.trim() })
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
      const { data } = await api.post('/members/login/verify/email', { email: email.trim(), otp: otpStr })
      setStep('verifying')
      setTimeout(() => {
        localStorage.setItem('ivira_member_token', data.token)
        localStorage.setItem('ivira_member_gym', data.gymId)
        localStorage.setItem('ivira_member', JSON.stringify(data.member))
        navigate('/member/dashboard', { replace: true })
      }, 1200)
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Invalid code')
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
            Securing your session...
          </p>
        </div>
      )}

      {/* Mobile App Download Prompt — platform-aware */}
      {step === 'app_prompt' && (() => {
        const platform = getMobilePlatform()
        const isAndroid = platform === 'android'
        const isIOS = platform === 'ios'
        return (
          <>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <img src="/icons/icon-96.png" alt="IVIRA" style={{
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
                {isIOS ? 'IVIRA for iOS' : 'Download the IVIRA App'}
              </h3>
              <p style={{ fontSize: 14, color: textSec, margin: 0, lineHeight: 1.6, fontFamily: ff }}>
                {isIOS
                  ? 'The IVIRA iOS app is coming soon. Sign in via web for now.'
                  : 'Track workouts, find gyms, log nutrition, and more — all from the app.'}
              </p>
            </div>

            {/* Android: APK download + Google Play coming soon */}
            {isAndroid && (
              <>
                <a
                  href="https://api.ivira.app/downloads/ivira-latest.apk"
                  download
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    width: '100%', padding: '16px 24px', borderRadius: 12,
                    background: accent, color: '#fff', fontSize: 16, fontWeight: 700,
                    fontFamily: ff, textDecoration: 'none', textAlign: 'center',
                    marginBottom: 12, transition: 'opacity 0.2s',
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Download APK
                </a>
                <div style={{
                  padding: '14px', borderRadius: 10,
                  border: `1px solid ${t.inputBorder}`, textAlign: 'center', opacity: 0.5,
                  marginBottom: 20,
                }}>
                  <div style={{ fontSize: 11, color: textTer, fontFamily: ff }}>Coming Soon</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: textSec, fontFamily: ff }}>Google Play</div>
                </div>
              </>
            )}

            {/* iOS: App Store coming soon */}
            {isIOS && (
              <div style={{
                padding: '20px', borderRadius: 12,
                border: `1px solid ${t.inputBorder}`, textAlign: 'center', opacity: 0.6,
                marginBottom: 20,
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={textSec} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 8 }}>
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
                  <path d="M8 12l2 2 4-4"/>
                </svg>
                <div style={{ fontSize: 12, color: textTer, fontFamily: ff, marginBottom: 4 }}>Coming Soon</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: textSec, fontFamily: ff }}>App Store</div>
              </div>
            )}

            {/* Fallback for other mobile devices */}
            {!isAndroid && !isIOS && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                <div style={{
                  flex: 1, padding: '12px', borderRadius: 10,
                  border: `1px solid ${t.inputBorder}`, textAlign: 'center', opacity: 0.5,
                }}>
                  <div style={{ fontSize: 11, color: textTer, fontFamily: ff }}>Coming Soon</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: textSec, fontFamily: ff }}>App Store</div>
                </div>
                <div style={{
                  flex: 1, padding: '12px', borderRadius: 10,
                  border: `1px solid ${t.inputBorder}`, textAlign: 'center', opacity: 0.5,
                }}>
                  <div style={{ fontSize: 11, color: textTer, fontFamily: ff }}>Coming Soon</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: textSec, fontFamily: ff }}>Google Play</div>
                </div>
              </div>
            )}

            <div style={{ textAlign: 'center', borderTop: `1px solid ${t.inputBorder}`, paddingTop: 20 }}>
              <p style={{ fontSize: 13, color: textSec, fontFamily: ff, margin: 0 }}>
                Already have an account?{' '}
                <button
                  onClick={() => setStep('email')}
                  style={{ background: 'none', border: 'none', color: accent, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: ff }}
                >
                  Sign in here
                </button>
              </p>
            </div>
          </>
        )
      })()}

      {/* Email step */}
      {step === 'email' && (
        <>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <img src="/icons/icon-96.png" alt="IVIRA" style={{
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
              Welcome Back
            </h3>
            <p style={{ fontSize: 14, color: textSec, margin: 0, lineHeight: 1.5, fontFamily: ff }}>
              Sign in to access your gym, track progress
            </p>
          </div>

          <div style={{ marginBottom: 8 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: textSec, marginBottom: 8, letterSpacing: '0.5px', textTransform: 'uppercase', fontFamily: ff }}>
              Email Address
            </label>
            <input
              type="email"
              placeholder="you@email.com"
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
              <button
                onClick={resendOTP}
                style={{ background: 'none', border: 'none', color: accent, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: ff }}
              >
                Resend Code
              </button>
            )}
          </div>

          <button
            onClick={() => { setStep('email'); setError(''); setOtp(['', '', '', '', '', '']) }}
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
