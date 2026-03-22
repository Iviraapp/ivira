import { useState } from 'react'
import api from '../lib/api'

const FONT = "'Inter', -apple-system, sans-serif"
const FONT_M = "'JetBrains Mono', monospace"

export default function SubdomainRecoveryModal({ open, onClose }) {
  const [step, setStep] = useState('contact') // contact | otp | results
  const [contact, setContact] = useState('')
  const [otp, setOtp] = useState('')
  const [gyms, setGyms] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [method, setMethod] = useState('')

  if (!open) return null

  const handleFindGyms = async () => {
    if (!contact.trim()) return setError('Please enter your email or phone')
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/find-gyms', { contact: contact.trim() })
      setMethod(data.method)
      setStep('otp')
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async () => {
    if (!otp.trim() || otp.length < 6) return setError('Enter the 6-digit OTP')
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/verify-subdomain-otp', { contact: contact.trim(), otp: otp.trim() })
      setGyms(data.gyms || [])
      setStep('results')
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setStep('contact')
    setContact('')
    setOtp('')
    setGyms([])
    setError('')
    onClose()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: FONT,
    }}>
      <div onClick={handleClose} style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
      }} />
      <div style={{
        position: 'relative', width: '100%', maxWidth: 420,
        background: '#121212', border: '1px solid #1F1F1F',
        borderRadius: 16, padding: 32, margin: 16,
        animation: 'subRecoveryIn 0.25s ease-out',
      }}>
        {/* Close button */}
        <button onClick={handleClose} style={{
          position: 'absolute', top: 12, right: 12,
          background: 'none', border: 'none', color: '#666',
          cursor: 'pointer', fontSize: 20, lineHeight: 1,
        }}>&times;</button>

        {/* Step: Contact */}
        {step === 'contact' && (
          <>
            <div style={{
              fontSize: 10, fontWeight: 700, color: '#1A3A8F',
              letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 8,
            }}>ACCOUNT RECOVERY</div>
            <h2 style={{
              margin: 0, fontSize: 20, fontWeight: 700, color: '#EDEDED', marginBottom: 6,
            }}>Find Your Gyms</h2>
            <p style={{ fontSize: 13, color: '#888', marginBottom: 24, marginTop: 0 }}>
              Enter the email or phone used to register your gym.
            </p>
            <label style={{
              display: 'block', fontSize: 11, fontWeight: 700, color: '#666',
              marginBottom: 6, textTransform: 'uppercase', letterSpacing: '1px',
            }}>Email or Phone</label>
            <input
              type="text"
              value={contact}
              onChange={e => setContact(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleFindGyms()}
              placeholder="owner@gym.com or 9876543210"
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 10,
                border: '1px solid #1F1F1F', background: '#0A0A0A',
                color: '#EDEDED', fontSize: 14, fontFamily: FONT,
                outline: 'none', boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = '#1A3A8F'}
              onBlur={e => e.target.style.borderColor = '#1F1F1F'}
              autoFocus
            />
            {error && <p style={{ fontSize: 12, color: '#EA4335', marginTop: 8, marginBottom: 0 }}>{error}</p>}
            <button onClick={handleFindGyms} disabled={loading} style={{
              width: '100%', padding: '12px 0', borderRadius: 10, border: 'none',
              background: '#1A3A8F', color: '#fff', fontSize: 14, fontWeight: 700,
              cursor: loading ? 'wait' : 'pointer', marginTop: 16, fontFamily: FONT,
              opacity: loading ? 0.6 : 1, transition: 'opacity 0.2s',
            }}>{loading ? 'Sending OTP...' : 'Find My Gyms'}</button>
            <p style={{ fontSize: 11, color: '#555', textAlign: 'center', marginTop: 12, marginBottom: 0 }}>
              Rate limited to 3 attempts per 15 minutes for security.
            </p>
          </>
        )}

        {/* Step: OTP */}
        {step === 'otp' && (
          <>
            <div style={{
              fontSize: 10, fontWeight: 700, color: '#1A3A8F',
              letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 8,
            }}>VERIFY IDENTITY</div>
            <h2 style={{
              margin: 0, fontSize: 20, fontWeight: 700, color: '#EDEDED', marginBottom: 6,
            }}>Enter OTP</h2>
            <p style={{ fontSize: 13, color: '#888', marginBottom: 24, marginTop: 0 }}>
              We sent a 6-digit code to your {method === 'email' ? 'email' : 'phone'}.
            </p>
            <input
              type="text"
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={e => e.key === 'Enter' && handleVerifyOTP()}
              placeholder="000000"
              maxLength={6}
              inputMode="numeric"
              style={{
                width: '100%', padding: '14px 14px', borderRadius: 10,
                border: '1px solid #1F1F1F', background: '#0A0A0A',
                color: '#EDEDED', fontSize: 24, fontFamily: FONT_M,
                outline: 'none', boxSizing: 'border-box', textAlign: 'center',
                letterSpacing: '8px', transition: 'border-color 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = '#1A3A8F'}
              onBlur={e => e.target.style.borderColor = '#1F1F1F'}
              autoFocus
            />
            {error && <p style={{ fontSize: 12, color: '#EA4335', marginTop: 8, marginBottom: 0 }}>{error}</p>}
            <button onClick={handleVerifyOTP} disabled={loading} style={{
              width: '100%', padding: '12px 0', borderRadius: 10, border: 'none',
              background: '#1A3A8F', color: '#fff', fontSize: 14, fontWeight: 700,
              cursor: loading ? 'wait' : 'pointer', marginTop: 16, fontFamily: FONT,
              opacity: loading ? 0.6 : 1, transition: 'opacity 0.2s',
            }}>{loading ? 'Verifying...' : 'Verify & Show Gyms'}</button>
            <button onClick={() => { setStep('contact'); setError('') }} style={{
              width: '100%', padding: '10px 0', borderRadius: 10,
              border: '1px solid #1F1F1F', background: 'transparent',
              color: '#888', fontSize: 13, cursor: 'pointer', marginTop: 8, fontFamily: FONT,
            }}>Back</button>
          </>
        )}

        {/* Step: Results */}
        {step === 'results' && (
          <>
            <div style={{
              fontSize: 10, fontWeight: 700, color: '#34A853',
              letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 8,
            }}>FOUND</div>
            <h2 style={{
              margin: 0, fontSize: 20, fontWeight: 700, color: '#EDEDED', marginBottom: 20,
            }}>Your Gyms</h2>
            {gyms.length === 0 ? (
              <div style={{
                background: '#0A0A0A', border: '1px solid #1F1F1F', borderRadius: 12,
                padding: 24, textAlign: 'center',
              }}>
                <p style={{ color: '#888', fontSize: 14, margin: 0 }}>
                  No gyms found for this contact.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {gyms.map(gym => (
                  <a
                    key={gym.id}
                    href={gym.subdomain ? `https://${gym.subdomain}.ivira.app` : `/login`}
                    style={{
                      display: 'block', padding: '16px 18px', borderRadius: 12,
                      background: '#0A0A0A', border: '1px solid #1F1F1F',
                      textDecoration: 'none', transition: 'all 0.2s',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#1A3A8F'; e.currentTarget.style.background = '#141414' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#1F1F1F'; e.currentTarget.style.background = '#0A0A0A' }}
                  >
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#EDEDED', marginBottom: 4, fontFamily: FONT }}>
                      {gym.gym_name}
                    </div>
                    <div style={{ fontSize: 12, color: '#1A3A8F', fontFamily: FONT_M }}>
                      {gym.subdomain ? `${gym.subdomain}.ivira.app` : 'No subdomain set'}
                    </div>
                    {gym.owner_name && (
                      <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
                        Owner: {gym.owner_name}
                      </div>
                    )}
                  </a>
                ))}
              </div>
            )}
            <button onClick={handleClose} style={{
              width: '100%', padding: '12px 0', borderRadius: 10, border: 'none',
              background: '#1F1F1F', color: '#EDEDED', fontSize: 14, fontWeight: 600,
              cursor: 'pointer', marginTop: 16, fontFamily: FONT,
            }}>Done</button>
          </>
        )}
      </div>

      <style>{`
        @keyframes subRecoveryIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  )
}
