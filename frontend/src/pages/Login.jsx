import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Activity, Mail, KeyRound, Loader2 } from 'lucide-react'

export default function Login() {
  const { requestOtp, verifyOtp } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState('email') // 'email' | 'otp'
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRequestOtp = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await requestOtp(email)
      setStep('otp')
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await verifyOtp(email, otp)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Invalid OTP')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0a0a0f', padding: 20,
    }}>
      <div style={{
        width: '100%', maxWidth: 400, background: '#0d0d14',
        border: '1px solid #1a1a2e', borderRadius: 16, padding: 40,
      }}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #10B981, #059669)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Activity size={28} color="#fff" />
          </div>
          <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: 0 }}><span style={{ opacity: 0.45 }}>I</span><span>VIRA</span></h1>
          <p style={{ color: '#666', fontSize: 14, margin: '6px 0 0' }}>Owner Dashboard</p>
        </div>

        {step === 'email' ? (
          <form onSubmit={handleRequestOtp}>
            <label style={{ color: '#999', fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>
              Email Address
            </label>
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <Mail size={16} style={{ position: 'absolute', left: 12, top: 13, color: '#555' }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@yourgym.com"
                required
                style={{
                  width: '100%', padding: '11px 12px 11px 36px', background: '#1a1a2e',
                  border: '1px solid #2a2a3e', borderRadius: 8, color: '#fff',
                  fontSize: 14, outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
            {error && <p style={{ color: '#ef4444', fontSize: 13, margin: '0 0 12px' }}>{error}</p>}
            <button
              type="submit"
              disabled={loading || !email}
              style={{
                width: '100%', padding: '12px', background: '#10B981', color: '#fff',
                border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
                cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {loading && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
              Send OTP
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp}>
            <p style={{ color: '#999', fontSize: 13, marginBottom: 16 }}>
              OTP sent to <strong style={{ color: '#ccc' }}>{email}</strong>
            </p>
            <label style={{ color: '#999', fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>
              Enter OTP
            </label>
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <KeyRound size={16} style={{ position: 'absolute', left: 12, top: 13, color: '#555' }} />
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                required
                autoFocus
                maxLength={6}
                style={{
                  width: '100%', padding: '11px 12px 11px 36px', background: '#1a1a2e',
                  border: '1px solid #2a2a3e', borderRadius: 8, color: '#fff',
                  fontSize: 18, letterSpacing: 8, outline: 'none', boxSizing: 'border-box',
                  fontFamily: 'monospace',
                }}
              />
            </div>
            {error && <p style={{ color: '#ef4444', fontSize: 13, margin: '0 0 12px' }}>{error}</p>}
            <button
              type="submit"
              disabled={loading || otp.length < 4}
              style={{
                width: '100%', padding: '12px', background: '#10B981', color: '#fff',
                border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
                cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {loading && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
              Verify & Login
            </button>
            <button
              type="button"
              onClick={() => { setStep('email'); setOtp(''); setError('') }}
              style={{
                width: '100%', padding: '10px', background: 'transparent', color: '#666',
                border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', marginTop: 8,
              }}
            >
              ← Change email
            </button>
          </form>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: #444; }
        input:focus { border-color: #10B981 !important; }
      `}</style>
    </div>
  )
}
