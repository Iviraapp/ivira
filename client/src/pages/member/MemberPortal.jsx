import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import api from '../../lib/api'
import { formatDate, formatPaise } from '../../lib/utils'
import {
  QrCode, Calendar, CreditCard, ShoppingBag, LogOut,
  Download, MessageCircle, Home, FileText, User, Smartphone,
  Wifi, WifiOff, Vibrate,
} from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

const FONT = "'Inter', -apple-system, sans-serif"
const FONT_M = "'JetBrains Mono', 'Fira Code', monospace"
const QR_REFRESH_INTERVAL = 30 // seconds
const QR_VALIDITY_WINDOW = 60 // seconds

// Haptic feedback via Vibration API
function triggerHaptic(type) {
  if (!navigator.vibrate) return
  if (type === 'success') navigator.vibrate([100])
  else if (type === 'error') navigator.vibrate([300, 100, 300])
  else if (type === 'tap') navigator.vibrate([50])
}

// Generate a nonce for QR anti-screenshot fraud
function generateNonce() {
  const arr = new Uint8Array(16)
  crypto.getRandomValues(arr)
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('')
}

export default function MemberPortal() {
  const { gymId } = useParams()
  const [step, setStep] = useState('login') // login | otp | portal
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [token, setToken] = useState(() => localStorage.getItem('ivira_member_token'))
  const [member, setMember] = useState(null)
  const [gymInfo, setGymInfo] = useState(null)
  const [qrData, setQrData] = useState(null)
  const [qrCountdown, setQrCountdown] = useState(0)
  const [activeTab, setActiveTab] = useState('home') // home | invoices | store | profile
  const [checkins, setCheckins] = useState([])
  const [invoices, setInvoices] = useState([])
  const [products, setProducts] = useState([])
  const [brands, setBrands] = useState([])
  const [checkinStatus, setCheckinStatus] = useState(null) // null | 'success' | 'error'
  const [nfcSupported, setNfcSupported] = useState(false)
  const qrTimerRef = useRef()
  const refreshTimerRef = useRef()
  const { theme, isDark } = useTheme()

  // Check NFC support
  useEffect(() => {
    setNfcSupported('NDEFReader' in window)
  }, [])

  // Load gym branding
  useEffect(() => {
    if (gymId) {
      api.get(`/gyms/${gymId}`).then(r => setGymInfo(r.data?.gym || r.data)).catch(() => {})
    }
  }, [gymId])

  // If token exists, load profile
  useEffect(() => {
    if (token) loadProfile()
  }, [token])

  // Cache QR data for offline use
  useEffect(() => {
    if (qrData) {
      localStorage.setItem('ivira_cached_qr', JSON.stringify({ data: qrData, ts: Date.now() }))
    }
  }, [qrData])

  // Load cached QR on mount (offline support)
  useEffect(() => {
    if (!qrData) {
      try {
        const cached = JSON.parse(localStorage.getItem('ivira_cached_qr'))
        if (cached && Date.now() - cached.ts < 86400000) {
          setQrData(cached.data)
        }
      } catch {}
    }
  }, [])

  async function loadProfile() {
    try {
      const headers = { Authorization: `Bearer ${token}` }
      const { data } = await api.get(`/gyms/${gymId}/members/me`, { headers })
      setMember(data.member || data)
      setStep('portal')

      // Load checkins, invoices, products, brands in parallel
      Promise.allSettled([
        api.get(`/gyms/${gymId}/members/me/checkins`, { headers }),
        api.get(`/gyms/${gymId}/members/me/invoices`, { headers }),
        api.get(`/gyms/${gymId}/products`, { params: { status: 'active' } }),
        api.get('/affiliate/brands'),
      ]).then(([ci, inv, prods, br]) => {
        if (ci.status === 'fulfilled') setCheckins(ci.value.data?.checkins || ci.value.data || [])
        if (inv.status === 'fulfilled') setInvoices(inv.value.data?.invoices || [])
        if (prods.status === 'fulfilled') setProducts(prods.value.data?.data || prods.value.data || [])
        if (br.status === 'fulfilled') setBrands(br.value.data?.brands || [])
      })
    } catch {
      localStorage.removeItem('ivira_member_token')
      setToken(null)
      setStep('login')
    }
  }

  async function requestOTP() {
    if (!email.trim()) return setError('Please enter your email')
    setError(''); setLoading(true)
    try {
      await api.post(`/gyms/${gymId}/members/otp/request`, { email: email.trim() })
      setStep('otp')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP')
    } finally { setLoading(false) }
  }

  async function verifyOTP() {
    if (!otp.trim() || otp.length < 4) return setError('Enter valid OTP')
    setError(''); setLoading(true)
    try {
      const { data } = await api.post(`/gyms/${gymId}/members/otp/verify`, { email: email.trim(), otp: otp.trim() })
      localStorage.setItem('ivira_member_token', data.token)
      setToken(data.token)
      triggerHaptic('success')
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP')
      triggerHaptic('error')
    } finally { setLoading(false) }
  }

  // Secure QR generation with timestamp + nonce + auto-refresh
  const generateQR = useCallback(async () => {
    try {
      const nonce = generateNonce()
      const timestamp = Date.now()
      const { data } = await api.post(`/gyms/${gymId}/qr/generate`, {
        phone: member?.phone,
        nonce,
        timestamp,
      })
      const qrPayload = JSON.stringify({
        token: data.token || data.qrToken,
        ts: timestamp,
        nonce,
      })
      setQrData(qrPayload)
      setQrCountdown(QR_REFRESH_INTERVAL)
      triggerHaptic('tap')

      // Start countdown
      clearInterval(qrTimerRef.current)
      qrTimerRef.current = setInterval(() => {
        setQrCountdown(prev => {
          if (prev <= 1) {
            clearInterval(qrTimerRef.current)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate QR')
      triggerHaptic('error')
    }
  }, [gymId, member])

  // Auto-refresh QR every 30 seconds
  useEffect(() => {
    if (step === 'portal' && member && qrData) {
      refreshTimerRef.current = setInterval(() => {
        generateQR()
      }, QR_REFRESH_INTERVAL * 1000)
      return () => clearInterval(refreshTimerRef.current)
    }
  }, [step, member, qrData, generateQR])

  // Cleanup timers
  useEffect(() => () => {
    clearInterval(qrTimerRef.current)
    clearInterval(refreshTimerRef.current)
  }, [])

  // Simulate check-in success/error feedback (would connect to WebSocket)
  const showCheckinResult = (type) => {
    setCheckinStatus(type)
    triggerHaptic(type)
    setTimeout(() => setCheckinStatus(null), 2500)
  }

  // NFC tap-to-enter
  async function handleNFCCheckin() {
    if (!('NDEFReader' in window)) return
    triggerHaptic('tap')
    try {
      const ndef = new window.NDEFReader()
      await ndef.write({
        records: [{ recordType: 'text', data: JSON.stringify({ gymId, memberId: member?.id, ts: Date.now() }) }]
      })
      showCheckinResult('success')
    } catch {
      showCheckinResult('error')
    }
  }

  // Manual tap check-in (API fallback)
  async function handleTapCheckin() {
    triggerHaptic('tap'); setLoading(true)
    try {
      await api.post(`/gyms/${gymId}/checkins`, {
        phone: member?.phone, method: 'manual',
      })
      showCheckinResult('success')
    } catch {
      showCheckinResult('error')
    } finally { setLoading(false) }
  }

  function downloadInvoice(invoice) {
    triggerHaptic('tap')
    window.open(`/api/v1/gyms/${gymId}/members/me/invoices/${invoice.id}/pdf`, '_blank')
  }

  function shareInvoiceWhatsApp(invoice) {
    triggerHaptic('tap')
    const text = `Invoice ${invoice.invoice_number}\nAmount: ₹${(invoice.total_paise / 100).toLocaleString('en-IN')}\nDate: ${new Date(invoice.invoice_date).toLocaleDateString('en-IN')}\nStatus: ${invoice.status}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`)
  }

  async function buyProduct(product) {
    triggerHaptic('tap')
    try {
      const { data } = await api.post(`/gyms/${gymId}/store/checkout`, {
        product_id: product.id,
        email: member?.email,
      })
      if (data.checkout_url) window.location.href = data.checkout_url
    } catch {
      setError('Checkout failed')
    }
  }

  async function notifyMe(product) {
    const em = prompt('Enter your email to get notified when back in stock:')
    if (!em) return
    try {
      await api.post(`/gyms/${gymId}/products/${product.id}/waitlist`, { email: em })
      triggerHaptic('success')
    } catch {}
  }

  const inputStyle = {
    width: '100%', padding: '14px 16px', borderRadius: 12,
    border: `1px solid ${theme.border}`, background: theme.bgTer, color: theme.text,
    fontSize: 16, fontFamily: FONT, outline: 'none', boxSizing: 'border-box',
  }

  const gymAccent = gymInfo?.accent_color || theme.brandAccent
  const gymName = gymInfo?.gym_name || member?.gym_name || 'IVIRA'

  // ── Login / OTP ──
  if (step !== 'portal') {
    return (
      <div style={{
        minHeight: '100vh', background: '#000',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20, fontFamily: FONT,
      }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', marginBottom: 8, fontFamily: FONT }}>
              {gymName}
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 600, color: '#fff', margin: '0 0 4px', fontFamily: FONT }}>Member Portal</h1>
            <p style={{ fontSize: 14, color: '#888' }}>Access your membership</p>
          </div>
          <div style={{
            background: '#0A0A0A', borderRadius: 20, border: '1px solid #1A1A1A', padding: 28,
          }}>
            {step === 'login' && (
              <>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 8, fontFamily: FONT }}>Email</label>
                  <input style={inputStyle} type="email" placeholder="your@email.com"
                    value={email} onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && requestOTP()} autoFocus />
                  {error && <p style={{ fontSize: 12, color: '#EA4335', marginTop: 6 }}>{error}</p>}
                </div>
                <button disabled={loading} onClick={requestOTP} style={{
                  width: '100%', padding: '14px', borderRadius: 12, border: 'none',
                  background: '#fff', color: '#000', fontSize: 16, fontWeight: 700,
                  fontFamily: FONT, cursor: 'pointer', opacity: loading ? 0.6 : 1,
                }}>{loading ? 'Sending...' : 'Send OTP'}</button>
              </>
            )}
            {step === 'otp' && (
              <>
                <p style={{ fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 20 }}>
                  OTP sent to <span style={{ color: '#fff', fontWeight: 600 }}>{email}</span>
                </p>
                <div style={{ marginBottom: 20 }}>
                  <input style={{ ...inputStyle, textAlign: 'center', fontSize: 24, letterSpacing: 12, fontFamily: FONT_M }}
                    placeholder="------" value={otp} onChange={e => setOtp(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && verifyOTP()} autoFocus />
                  {error && <p style={{ fontSize: 12, color: '#EA4335', marginTop: 6, textAlign: 'center' }}>{error}</p>}
                </div>
                <button disabled={loading} onClick={verifyOTP} style={{
                  width: '100%', padding: '14px', borderRadius: 12, border: 'none',
                  background: '#fff', color: '#000', fontSize: 16, fontWeight: 700,
                  fontFamily: FONT, cursor: 'pointer', opacity: loading ? 0.6 : 1,
                }}>{loading ? 'Verifying...' : 'Verify'}</button>
                <button onClick={() => { setStep('login'); setError('') }} style={{
                  display: 'block', margin: '16px auto 0', background: 'none', border: 'none',
                  color: '#888', fontSize: 14, cursor: 'pointer', fontFamily: FONT,
                }}>Back</button>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Portal View ──
  const daysLeft = member?.membership?.end_date
    ? Math.max(0, Math.ceil((new Date(member.membership.end_date) - new Date()) / 86400000))
    : 0

  const TABS = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'invoices', icon: FileText, label: 'Invoices' },
    { id: 'store', icon: ShoppingBag, label: 'Store' },
    { id: 'profile', icon: User, label: 'Profile' },
  ]

  return (
    <div style={{
      minHeight: '100vh', background: '#000', fontFamily: FONT,
      paddingBottom: 80, // space for bottom nav
    }}>
      {/* Check-in status overlay */}
      {checkinStatus && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: checkinStatus === 'success' ? 'rgba(52,168,83,0.95)' : 'rgba(234,67,53,0.95)',
          animation: 'fadeInScale 0.3s ease',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>{checkinStatus === 'success' ? '✓' : '✗'}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#fff', fontFamily: FONT }}>
              {checkinStatus === 'success' ? 'Check-in Successful!' : 'Check-in Failed'}
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 16px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', fontFamily: FONT, marginBottom: 2 }}>
            {gymName}
          </div>
          <p style={{ fontSize: 13, color: '#666', margin: 0 }}>Hi, {member?.name}</p>
        </div>

        {/* ── HOME TAB ── */}
        {activeTab === 'home' && (
          <>
            {/* Membership card */}
            <div style={{
              background: '#0A0A0A', borderRadius: 20, border: '1px solid #1A1A1A',
              padding: '24px 22px', marginBottom: 16, position: 'relative', overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                background: gymAccent,
              }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, color: '#666', marginBottom: 6, fontWeight: 600 }}>
                    Membership
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', fontFamily: FONT }}>
                    {member?.membership?.plan_name || member?.current_plan?.name || 'No Plan'}
                  </div>
                </div>
                <span style={{
                  padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                  background: member?.status === 'active' ? 'rgba(52,168,83,0.15)' : 'rgba(234,67,53,0.15)',
                  color: member?.status === 'active' ? '#34A853' : '#EA4335',
                  textTransform: 'uppercase',
                }}>{member?.status}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 20 }}>
                <div>
                  <div style={{ fontSize: 11, color: '#666', marginBottom: 2 }}>Expires</div>
                  <div style={{ fontSize: 14, color: '#A0A0A0', fontWeight: 500 }}>
                    {member?.membership?.end_date ? formatDate(member.membership.end_date) : '--'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: '#666', marginBottom: 2 }}>Days Left</div>
                  <div style={{ fontSize: 40, fontWeight: 800, color: '#fff', fontFamily: FONT_M, lineHeight: 1 }}>
                    {daysLeft}
                  </div>
                </div>
              </div>
            </div>

            {/* QR Section */}
            <div style={{
              background: '#0A0A0A', borderRadius: 20, border: '1px solid #1A1A1A',
              padding: 24, textAlign: 'center', marginBottom: 16,
            }}>
              {qrData ? (
                <>
                  {/* QR with breathing animation */}
                  <div style={{
                    display: 'inline-block', padding: 20, background: '#FFFFFF',
                    borderRadius: 16, marginBottom: 16, position: 'relative',
                    animation: 'qrBreathe 3s ease-in-out infinite',
                  }}>
                    <QRCodeSVG value={qrData} size={200} />
                  </div>
                  {/* Countdown */}
                  <div style={{ marginBottom: 8 }}>
                    <span style={{
                      fontSize: 13, color: '#666', fontFamily: FONT,
                    }}>
                      Refreshes in{' '}
                      <span style={{
                        fontFamily: FONT_M, fontWeight: 700,
                        color: qrCountdown <= 5 ? '#EA4335' : qrCountdown <= 10 ? '#FBBC05' : '#fff',
                      }}>
                        {qrCountdown}s
                      </span>
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: '#666', margin: 0 }}>
                    Show this QR at the gym entrance
                  </p>
                </>
              ) : (
                <>
                  <div style={{
                    width: 64, height: 64, borderRadius: 16, background: '#141414',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
                  }}>
                    <QrCode size={32} color="#fff" />
                  </div>
                  <br />
                  <button disabled={loading} onClick={generateQR} style={{
                    padding: '16px 32px', borderRadius: 14, border: 'none',
                    background: '#fff', color: '#000', fontSize: 16, fontWeight: 700,
                    fontFamily: FONT, cursor: 'pointer', width: '100%',
                    opacity: loading ? 0.6 : 1,
                  }}>{loading ? 'Generating...' : 'Generate Check-in QR'}</button>
                  <p style={{ fontSize: 12, color: '#666', marginTop: 10 }}>
                    Auto-refreshes every {QR_REFRESH_INTERVAL}s for security
                  </p>
                </>
              )}
            </div>

            {/* NFC / Tap to Enter */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              {nfcSupported && (
                <button onClick={handleNFCCheckin} style={{
                  flex: 1, padding: '14px', borderRadius: 14, border: '1px solid #1A1A1A',
                  background: '#0A0A0A', color: '#A0A0A0', fontSize: 14, fontWeight: 600,
                  fontFamily: FONT, cursor: 'pointer', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: 8,
                }}>
                  <Smartphone size={16} /> Tap to Enter (NFC)
                </button>
              )}
              <button onClick={handleTapCheckin} disabled={loading} style={{
                flex: 1, padding: '14px', borderRadius: 14, border: '1px solid #1A1A1A',
                background: '#0A0A0A', color: '#A0A0A0', fontSize: 14, fontWeight: 600,
                fontFamily: FONT, cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: 8, opacity: loading ? 0.5 : 1,
              }}>
                <Vibrate size={16} /> Manual Check-in
              </button>
            </div>

            {/* Recent Check-ins */}
            <div style={{
              background: '#0A0A0A', borderRadius: 16, border: '1px solid #1A1A1A', padding: 20,
            }}>
              <h3 style={{
                fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 14,
                display: 'flex', alignItems: 'center', gap: 8, fontFamily: FONT, margin: '0 0 14px',
              }}>
                <Calendar size={16} color="#666" /> Recent Check-ins
              </h3>
              {checkins.length === 0 ? (
                <p style={{ fontSize: 14, color: '#666', textAlign: 'center', padding: '20px 0' }}>No check-ins yet</p>
              ) : (
                checkins.slice(0, 8).map((c, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 0',
                    borderBottom: i < Math.min(checkins.length, 8) - 1 ? '1px solid #1A1A1A' : 'none',
                  }}>
                    <span style={{ fontSize: 13, color: '#A0A0A0', fontFamily: FONT_M }}>{formatDate(c.checked_in_at)}</span>
                    <span style={{
                      padding: '3px 10px', borderRadius: 16, fontSize: 10, fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: 0.5,
                      background: '#141414', color: '#666',
                    }}>{c.method || 'QR'}</span>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* ── INVOICES TAB ── */}
        {activeTab === 'invoices' && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: '0 0 16px', fontFamily: FONT }}>
              Invoices & Payments
            </h2>
            {invoices.length === 0 ? (
              <div style={{
                background: '#0A0A0A', borderRadius: 16, border: '1px solid #1A1A1A',
                padding: '48px 20px', textAlign: 'center',
              }}>
                <FileText size={32} color="#666" style={{ marginBottom: 12 }} />
                <p style={{ fontSize: 14, color: '#666', fontFamily: FONT }}>No invoices yet</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {invoices.map((inv) => (
                  <div key={inv.id} style={{
                    background: '#0A0A0A', borderRadius: 14, border: '1px solid #1A1A1A',
                    padding: '16px 18px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', fontFamily: FONT }}>
                          {inv.plan_name || inv.category || 'Payment'}
                        </div>
                        <div style={{ fontSize: 12, color: '#666', fontFamily: FONT_M, marginTop: 2 }}>
                          {formatDate(inv.paid_at || inv.created_at)}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', fontFamily: FONT_M }}>
                          {formatPaise(inv.amount_paise || inv.amount)}
                        </div>
                        <span style={{
                          fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                          color: (inv.status === 'captured' || inv.status === 'paid') ? '#34A853' : '#FBBC05',
                        }}>
                          {inv.status === 'captured' ? 'Paid' : inv.status}
                        </span>
                      </div>
                    </div>
                    {/* GST details if available */}
                    {inv.gst_amount && (
                      <div style={{ fontSize: 11, color: '#666', marginBottom: 8, fontFamily: FONT }}>
                        GST: {formatPaise(inv.gst_amount)} (CGST + SGST)
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => downloadInvoice(inv)} style={{
                        flex: 1, padding: '10px', borderRadius: 10, border: '1px solid #1A1A1A',
                        background: '#141414', color: '#A0A0A0', fontSize: 13, fontWeight: 600,
                        fontFamily: FONT, cursor: 'pointer', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', gap: 6,
                      }}>
                        <Download size={14} /> Download
                      </button>
                      <button onClick={() => shareInvoiceWhatsApp(inv)} style={{
                        flex: 1, padding: '10px', borderRadius: 10, border: '1px solid #1A1A1A',
                        background: '#141414', color: '#A0A0A0', fontSize: 13, fontWeight: 600,
                        fontFamily: FONT, cursor: 'pointer', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', gap: 6,
                      }}>
                        <MessageCircle size={14} /> WhatsApp
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── STORE TAB ── */}
        {activeTab === 'store' && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: '0 0 16px', fontFamily: FONT }}>
              Store
            </h2>
            {products.length === 0 ? (
              <div style={{
                background: '#0A0A0A', borderRadius: 16, border: '1px solid #1A1A1A',
                padding: '48px 20px', textAlign: 'center',
              }}>
                <ShoppingBag size={32} color="#666" style={{ marginBottom: 12 }} />
                <p style={{ fontSize: 14, color: '#666', fontFamily: FONT }}>No products available</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                {products.map((p) => {
                  const outOfStock = (p.stock_quantity || 0) <= 0
                  return (
                    <div key={p.id} style={{
                      background: '#0A0A0A', borderRadius: 14, border: '1px solid #1A1A1A',
                      overflow: 'hidden', position: 'relative',
                    }}>
                      {/* Image placeholder */}
                      <div style={{
                        height: 120, background: '#141414',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <ShoppingBag size={28} color="#666" />
                        )}
                        {outOfStock && (
                          <div style={{
                            position: 'absolute', top: 8, right: 8, padding: '3px 8px',
                            borderRadius: 6, fontSize: 10, fontWeight: 700,
                            background: 'rgba(234,67,53,0.9)', color: '#fff',
                          }}>OUT OF STOCK</div>
                        )}
                      </div>
                      <div style={{ padding: 12 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', fontFamily: FONT, marginBottom: 4 }}>
                          {p.name}
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', fontFamily: FONT_M, marginBottom: 8 }}>
                          ₹{Math.round((p.price || 0) / 100)}
                        </div>
                        <button
                          onClick={() => outOfStock ? notifyMe(p) : buyProduct(p)}
                          style={{
                            width: '100%', padding: '10px', borderRadius: 10, border: 'none',
                            background: outOfStock ? '#141414' : '#fff',
                            color: outOfStock ? '#666' : '#000',
                            fontSize: 13, fontWeight: 700, fontFamily: FONT, cursor: 'pointer',
                          }}
                        >
                          {outOfStock ? 'Notify Me' : 'Buy Now'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Recommended brands */}
            {brands.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: '#fff', margin: '0 0 12px', fontFamily: FONT }}>
                  Recommended
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {brands.slice(0, 4).map(b => (
                    <a key={b.id} href={b.base_url} target="_blank" rel="noopener noreferrer" style={{
                      display: 'block', padding: 14, background: '#0A0A0A', borderRadius: 12,
                      textDecoration: 'none', border: '1px solid #1A1A1A',
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{b.name}</div>
                      <div style={{ fontSize: 11, color: '#666' }}>{b.category}</div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── PROFILE TAB ── */}
        {activeTab === 'profile' && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: '0 0 16px', fontFamily: FONT }}>
              Profile
            </h2>
            <div style={{
              background: '#0A0A0A', borderRadius: 16, border: '1px solid #1A1A1A', padding: 20,
            }}>
              {[
                ['Name', member?.name],
                ['Email', member?.email],
                ['Phone', member?.phone],
                ['Plan', member?.membership?.plan_name || member?.current_plan?.name || '—'],
                ['Status', member?.status],
                ['Member Since', formatDate(member?.created_at)],
              ].map(([label, value]) => (
                <div key={label} style={{
                  display: 'flex', justifyContent: 'space-between', padding: '12px 0',
                  borderBottom: '1px solid #1A1A1A',
                }}>
                  <span style={{ fontSize: 14, color: '#666', fontFamily: FONT }}>{label}</span>
                  <span style={{ fontSize: 14, fontWeight: 500, color: '#fff', fontFamily: FONT }}>{value || '—'}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => { localStorage.removeItem('ivira_member_token'); setToken(null); setStep('login') }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                width: '100%', margin: '24px 0', padding: '14px', borderRadius: 14,
                background: 'rgba(234,67,53,0.1)', border: '1px solid rgba(234,67,53,0.2)',
                color: '#EA4335', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: FONT,
              }}
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#0A0A0A', borderTop: '1px solid #1A1A1A',
        display: 'flex', justifyContent: 'space-around', padding: '8px 0 12px',
        zIndex: 50,
      }}>
        {TABS.map(({ id, icon: Icon, label }) => {
          const active = activeTab === id
          return (
            <button key={id} onClick={() => { setActiveTab(id); triggerHaptic('tap') }} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              background: 'none', border: 'none', cursor: 'pointer', padding: '4px 12px',
            }}>
              <Icon size={20} color={active ? '#fff' : '#666'} strokeWidth={active ? 2.5 : 1.5} />
              <span style={{
                fontSize: 10, fontWeight: active ? 700 : 500,
                color: active ? '#fff' : '#666', fontFamily: FONT,
              }}>{label}</span>
            </button>
          )
        })}
      </nav>

      <style>{`
        @keyframes qrBreathe {
          0%, 100% { box-shadow: 0 0 20px rgba(255,255,255,0.1); }
          50% { box-shadow: 0 0 40px rgba(255,255,255,0.25), 0 0 60px rgba(255,255,255,0.08); }
        }
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
