import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Html5Qrcode } from 'html5-qrcode'
import { ScanLine, CheckCircle2, XCircle, Loader2, Camera, CameraOff, Keyboard, Shield, AlertTriangle, Clock, CreditCard, User, Phone, Calendar, X } from 'lucide-react'
import { format } from 'date-fns'
import api from '../lib/api'

// ── Gym owner configurable auto-dismiss time (seconds) ──
const AUTO_DISMISS_OPTIONS = [
  { label: '15s', value: 15 },
  { label: '30s', value: 30 },
  { label: '1m', value: 60 },
  { label: '2m', value: 120 },
  { label: 'Manual', value: 0 },
]

// ── Bouncer Screen — Full-screen member verification overlay ──
function BouncerScreen({ checkin, onDismiss, autoDismissSeconds }) {
  const [countdown, setCountdown] = useState(autoDismissSeconds)
  const timerRef = useRef(null)

  const isActive = checkin?.membership?.status === 'active'
  const isExpired = checkin?.membership?.status === 'expired'
  const hasNoMembership = !checkin?.membership
  const hasIssue = isExpired || hasNoMembership

  // Calculate days until expiry or days overdue
  const daysInfo = (() => {
    if (!checkin?.membership?.end_date) return null
    const end = new Date(checkin.membership.end_date)
    const now = new Date()
    const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24))
    return diff
  })()

  const isExpiringSoon = daysInfo !== null && daysInfo > 0 && daysInfo <= 7

  // Auto-dismiss timer (only for active members)
  useEffect(() => {
    if (hasIssue || autoDismissSeconds === 0) return // Don't auto-dismiss for issues

    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          onDismiss()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timerRef.current)
  }, [hasIssue, autoDismissSeconds])

  const statusColor = isActive ? '#22C55E' : isExpired ? '#EF4444' : '#F59E0B'
  const statusBg = isActive ? '#22C55E15' : isExpired ? '#EF444415' : '#F59E0B15'
  const statusBorder = isActive ? '#22C55E30' : isExpired ? '#EF444430' : '#F59E0B30'
  const statusLabel = isActive ? 'ACTIVE' : isExpired ? 'EXPIRED' : 'NO MEMBERSHIP'
  const bgGradient = isActive
    ? 'radial-gradient(ellipse at top, #0a2010 0%, #0a0a0f 60%)'
    : isExpired
      ? 'radial-gradient(ellipse at top, #200a0a 0%, #0a0a0f 60%)'
      : 'radial-gradient(ellipse at top, #201a0a 0%, #0a0a0f 60%)'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: bgGradient,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: 32,
      animation: 'bouncerSlideIn 0.3s ease-out',
    }}>
      {/* Close button */}
      <button onClick={onDismiss} style={{
        position: 'absolute', top: 20, right: 20,
        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12, width: 44, height: 44, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <X size={20} color="#888" />
      </button>

      {/* Countdown timer (top-right, for active members) */}
      {!hasIssue && autoDismissSeconds > 0 && (
        <div style={{
          position: 'absolute', top: 24, left: 24,
          display: 'flex', alignItems: 'center', gap: 6,
          color: '#555', fontSize: 13,
        }}>
          <Clock size={14} />
          <span>Closing in {countdown}s</span>
        </div>
      )}

      {/* Status icon pulse */}
      <div style={{
        width: 80, height: 80, borderRadius: 40,
        background: statusBg, border: `2px solid ${statusBorder}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 24,
        animation: isActive ? 'bouncerPulse 2s ease-in-out infinite' : 'bouncerShake 0.5s ease-in-out',
        boxShadow: `0 0 40px ${statusColor}20`,
      }}>
        {isActive ? (
          <CheckCircle2 size={40} color={statusColor} />
        ) : isExpired ? (
          <AlertTriangle size={40} color={statusColor} />
        ) : (
          <Shield size={40} color={statusColor} />
        )}
      </div>

      {/* Member photo */}
      <div style={{
        width: 120, height: 120, borderRadius: 60,
        border: `3px solid ${statusColor}`,
        overflow: 'hidden', marginBottom: 16,
        background: '#1a1a2e', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 0 30px ${statusColor}15`,
      }}>
        {checkin.member_photo ? (
          <img src={checkin.member_photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: 48, fontWeight: 700, color: statusColor }}>
            {(checkin.member_name || '?')[0].toUpperCase()}
          </span>
        )}
      </div>

      {/* Member name */}
      <h1 style={{
        color: '#fff', fontSize: 32, fontWeight: 800,
        margin: '0 0 4px', letterSpacing: -0.5, textAlign: 'center',
      }}>
        {checkin.member_name || 'Unknown'}
      </h1>

      {/* Status badge */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        background: statusBg, border: `1px solid ${statusBorder}`,
        borderRadius: 24, padding: '8px 20px', marginBottom: 24,
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: 4, background: statusColor,
          boxShadow: `0 0 8px ${statusColor}`,
        }} />
        <span style={{ color: statusColor, fontSize: 14, fontWeight: 700, letterSpacing: 1 }}>
          {statusLabel}
        </span>
      </div>

      {/* Info cards */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 12, width: '100%', maxWidth: 600, marginBottom: 24,
      }}>
        {/* Membership plan */}
        <InfoCard
          icon={<CreditCard size={16} />}
          label="Plan"
          value={checkin.membership?.plan_name || 'None'}
          color={statusColor}
        />

        {/* Expiry / Renewal */}
        <InfoCard
          icon={<Calendar size={16} />}
          label={isExpired ? 'Expired On' : 'Renewal Date'}
          value={checkin.membership?.end_date
            ? format(new Date(checkin.membership.end_date), 'dd MMM yyyy')
            : 'N/A'
          }
          color={isExpiringSoon ? '#F59E0B' : statusColor}
          highlight={isExpiringSoon || isExpired}
          sublabel={
            daysInfo !== null
              ? daysInfo > 0
                ? `${daysInfo} day${daysInfo !== 1 ? 's' : ''} remaining`
                : `${Math.abs(daysInfo)} day${Math.abs(daysInfo) !== 1 ? 's' : ''} overdue`
              : null
          }
        />

        {/* Phone */}
        <InfoCard
          icon={<Phone size={16} />}
          label="Phone"
          value={checkin.member_phone || 'N/A'}
          color="#666"
        />

        {/* Member since */}
        <InfoCard
          icon={<User size={16} />}
          label="Member Since"
          value={checkin.member_joined
            ? format(new Date(checkin.member_joined), 'dd MMM yyyy')
            : 'N/A'
          }
          color="#666"
        />
      </div>

      {/* Issue alerts — only for expired/no membership */}
      {hasIssue && (
        <div style={{
          width: '100%', maxWidth: 600,
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 12, padding: 20, marginBottom: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <AlertTriangle size={18} color="#EF4444" />
            <span style={{ color: '#EF4444', fontSize: 15, fontWeight: 700 }}>Action Required</span>
          </div>

          {isExpired && (
            <div style={{ color: '#ccc', fontSize: 13, lineHeight: 1.6 }}>
              This member's membership expired
              {checkin.membership?.end_date && (
                <strong style={{ color: '#EF4444' }}>
                  {' '}{format(new Date(checkin.membership.end_date), 'dd MMM yyyy')}
                </strong>
              )}.
              <br />
              Consider: <strong>Renew membership</strong>, <strong>Upgrade plan</strong>, or <strong>Allow day pass</strong>.
            </div>
          )}

          {hasNoMembership && (
            <div style={{ color: '#ccc', fontSize: 13, lineHeight: 1.6 }}>
              No active membership found for this member.
              <br />
              Consider: <strong>Create membership</strong>, <strong>Day pass</strong>, or <strong>Contact member</strong>.
            </div>
          )}

          {/* Quick action buttons */}
          <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
            <ActionButton label="Renew" color="#22C55E" />
            <ActionButton label="Day Pass" color="#10B981" />
            <ActionButton label="Upgrade Plan" color="#8B5CF6" />
            <ActionButton label="Contact" color="#F59E0B" />
          </div>
        </div>
      )}

      {/* Expiring soon warning — even for active members */}
      {isActive && isExpiringSoon && (
        <div style={{
          width: '100%', maxWidth: 600,
          background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
          borderRadius: 12, padding: 16, marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <Clock size={18} color="#F59E0B" />
          <span style={{ color: '#F59E0B', fontSize: 13, fontWeight: 600 }}>
            Membership expires in {daysInfo} day{daysInfo !== 1 ? 's' : ''} — remind to renew
          </span>
        </div>
      )}

      {/* Check-in time */}
      <div style={{ color: '#444', fontSize: 12, marginTop: 8 }}>
        Checked in at {format(new Date(), 'hh:mm:ss a')} via {checkin.method?.toUpperCase() || 'QR'}
      </div>
    </div>
  )
}

function InfoCard({ icon, label, value, color, highlight, sublabel }) {
  return (
    <div style={{
      background: highlight ? `${color}08` : 'rgba(255,255,255,0.03)',
      border: `1px solid ${highlight ? `${color}25` : 'rgba(255,255,255,0.06)'}`,
      borderRadius: 10, padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={{ color: '#555' }}>{icon}</span>
        <span style={{ color: '#555', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {label}
        </span>
      </div>
      <div style={{ color: highlight ? color : '#fff', fontSize: 16, fontWeight: 700 }}>
        {value}
      </div>
      {sublabel && (
        <div style={{ color, fontSize: 11, marginTop: 4, fontWeight: 500 }}>
          {sublabel}
        </div>
      )}
    </div>
  )
}

function ActionButton({ label, color }) {
  return (
    <button style={{
      background: `${color}15`, border: `1px solid ${color}30`,
      borderRadius: 8, padding: '8px 16px', color, fontSize: 12,
      fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
    }}>
      {label}
    </button>
  )
}

// ── Main Scanner Page ──
export default function Scanner() {
  const { gymId } = useAuth()
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [history, setHistory] = useState([])
  const [manualMode, setManualMode] = useState(false)
  const [manualToken, setManualToken] = useState('')
  const [bouncerData, setBouncerData] = useState(null)
  const [autoDismiss, setAutoDismiss] = useState(30) // default 30 seconds
  const scannerRef = useRef(null)
  const lastScannedRef = useRef('')

  // Load saved auto-dismiss preference
  useEffect(() => {
    const saved = localStorage.getItem('ivira_bouncer_dismiss')
    if (saved) setAutoDismiss(parseInt(saved, 10))
  }, [])

  const saveAutoDismiss = (val) => {
    setAutoDismiss(val)
    localStorage.setItem('ivira_bouncer_dismiss', String(val))
  }

  const startScanner = async () => {
    try {
      const scanner = new Html5Qrcode('qr-reader')
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        (decodedText) => handleScan(decodedText),
        () => { /* QR decode error — expected, no action needed */ },
      )
      setScanning(true)
    } catch (err) {
      console.error('Scanner start failed:', err)
      setResult({ success: false, message: 'Camera access denied. Use manual entry below.' })
      setManualMode(true)
    }
  }

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
        scannerRef.current.clear()
      } catch {}
      scannerRef.current = null
    }
    setScanning(false)
  }

  const handleScan = async (token) => {
    if (token === lastScannedRef.current || processing) return
    lastScannedRef.current = token
    setProcessing(true)
    setResult(null)

    try {
      const res = await api.post(`/gyms/${gymId}/checkin`, { token })
      const checkinData = res.data?.checkin || res.data
      const memberName = checkinData?.member_name || 'Member'
      const entry = {
        success: true,
        message: `${memberName} checked in!`,
        member: memberName,
        time: new Date(),
        method: 'qr',
        membership_status: checkinData?.membership?.status || 'unknown',
      }
      setResult(entry)
      setHistory((prev) => [entry, ...prev].slice(0, 20))

      // Show bouncer screen with full member data
      setBouncerData({ ...checkinData, method: 'qr' })

      setTimeout(() => { lastScannedRef.current = '' }, 10000)
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Check-in failed'
      const isExpired = msg.toLowerCase().includes('not active') || msg.toLowerCase().includes('expired')

      if (isExpired) {
        // Show bouncer screen for failed check-ins too (expired/inactive)
        setBouncerData({
          member_name: 'Member',
          member_status: 'inactive',
          membership: { status: 'expired' },
          method: 'qr',
        })
      }

      setResult({ success: false, message: msg })
      setTimeout(() => { lastScannedRef.current = '' }, 3000)
    } finally {
      setProcessing(false)
    }
  }

  const handleManualSubmit = async (e) => {
    e.preventDefault()
    if (!manualToken.trim()) return
    await handleScan(manualToken.trim())
    setManualToken('')
  }

  const dismissBouncer = () => {
    setBouncerData(null)
  }

  useEffect(() => {
    return () => { stopScanner() }
  }, [])

  return (
    <div>
      {/* Bouncer Screen Overlay */}
      {bouncerData && (
        <BouncerScreen
          checkin={bouncerData}
          onDismiss={dismissBouncer}
          autoDismissSeconds={autoDismiss}
        />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 700, margin: 0 }}>QR Scanner</h1>
          <p style={{ color: '#666', fontSize: 14, margin: '4px 0 0' }}>
            Scan member QR codes to check them in
          </p>
        </div>

        {/* Auto-dismiss config */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: '#555', fontSize: 12 }}>Auto-close:</span>
          {AUTO_DISMISS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => saveAutoDismiss(opt.value)}
              style={{
                padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                cursor: 'pointer', border: '1px solid',
                background: autoDismiss === opt.value ? '#10B981' : 'transparent',
                borderColor: autoDismiss === opt.value ? '#10B981' : '#333',
                color: autoDismiss === opt.value ? '#fff' : '#666',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {/* Scanner area */}
        <div style={{ flex: '1 1 400px' }}>
          <div style={{
            background: '#0d0d14', border: '1px solid #1a1a2e', borderRadius: 12,
            overflow: 'hidden',
          }}>
            {/* Camera viewport */}
            <div style={{
              position: 'relative', background: '#000',
              minHeight: 350, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div id="qr-reader" style={{ width: '100%', maxWidth: 400 }} />

              {!scanning && !manualMode && (
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex',
                  flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  background: '#0d0d14', gap: 16,
                }}>
                  <ScanLine size={48} color="#333" />
                  <p style={{ color: '#555', fontSize: 14 }}>Camera not active</p>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={startScanner} style={btnStyle('#10B981')}>
                      <Camera size={16} /> Start Camera
                    </button>
                    <button onClick={() => setManualMode(true)} style={btnStyle('#333')}>
                      <Keyboard size={16} /> Manual Entry
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Controls */}
            <div style={{ padding: 16, borderTop: '1px solid #1a1a2e', display: 'flex', gap: 10 }}>
              {scanning ? (
                <button onClick={stopScanner} style={btnStyle('#ef4444')}>
                  <CameraOff size={16} /> Stop Camera
                </button>
              ) : (
                <button onClick={startScanner} style={btnStyle('#10B981')}>
                  <Camera size={16} /> {manualMode ? 'Switch to Camera' : 'Start Camera'}
                </button>
              )}
              <button
                onClick={() => { setManualMode(!manualMode); if (scanning) stopScanner() }}
                style={btnStyle(manualMode ? '#10B981' : '#333')}
              >
                <Keyboard size={16} /> Manual Entry
              </button>
            </div>

            {/* Manual token entry */}
            {manualMode && (
              <form onSubmit={handleManualSubmit} style={{
                padding: '0 16px 16px', display: 'flex', gap: 10,
              }}>
                <input
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="Paste QR token here..."
                  style={{
                    flex: 1, padding: '10px 12px', background: '#1a1a2e',
                    border: '1px solid #2a2a3e', borderRadius: 8, color: '#fff',
                    fontSize: 13, outline: 'none', fontFamily: 'monospace',
                  }}
                />
                <button type="submit" disabled={processing} style={btnStyle('#22C55E')}>
                  {processing ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Check In'}
                </button>
              </form>
            )}

            {/* Result banner */}
            {processing && (
              <div style={{
                padding: '14px 20px', background: '#10B98115', borderTop: '1px solid #1a1a2e',
                display: 'flex', alignItems: 'center', gap: 10, color: '#10B981',
              }}>
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: 14, fontWeight: 500 }}>Processing check-in...</span>
              </div>
            )}

            {result && !processing && (
              <div style={{
                padding: '14px 20px',
                background: result.success ? '#22C55E15' : '#ef444415',
                borderTop: '1px solid #1a1a2e',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                {result.success ? (
                  <CheckCircle2 size={20} color="#22C55E" />
                ) : (
                  <XCircle size={20} color="#ef4444" />
                )}
                <span style={{
                  fontSize: 14, fontWeight: 600,
                  color: result.success ? '#22C55E' : '#ef4444',
                }}>
                  {result.message}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Session history */}
        <div style={{ flex: '1 1 300px' }}>
          <div style={{
            background: '#0d0d14', border: '1px solid #1a1a2e', borderRadius: 12,
          }}>
            <div style={{
              padding: '16px 20px', borderBottom: '1px solid #1a1a2e',
            }}>
              <h2 style={{ color: '#fff', fontSize: 16, fontWeight: 600, margin: 0 }}>
                Session Log ({history.length})
              </h2>
            </div>

            {history.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#444', fontSize: 13 }}>
                Scanned check-ins will appear here
              </div>
            ) : (
              <div style={{ maxHeight: 500, overflowY: 'auto' }}>
                {history.map((entry, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '12px 20px', borderBottom: '1px solid #111',
                      display: 'flex', alignItems: 'center', gap: 10,
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      // Re-open bouncer for this entry if we have the data
                      if (entry.checkinData) setBouncerData(entry.checkinData)
                    }}
                  >
                    {entry.success ? (
                      <CheckCircle2 size={16} color="#22C55E" />
                    ) : (
                      <XCircle size={16} color="#ef4444" />
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{
                        color: entry.success ? '#fff' : '#ef4444',
                        fontSize: 13, fontWeight: 500,
                      }}>
                        {entry.member || entry.message}
                      </div>
                      <div style={{ color: '#555', fontSize: 11 }}>
                        {entry.time ? format(entry.time, 'hh:mm:ss a') : ''}
                        {entry.membership_status && entry.membership_status !== 'unknown' && (
                          <span style={{
                            marginLeft: 8,
                            color: entry.membership_status === 'active' ? '#22C55E' : '#EF4444',
                          }}>
                            {entry.membership_status}
                          </span>
                        )}
                      </div>
                    </div>
                    <span style={{
                      padding: '2px 6px', borderRadius: 4, fontSize: 10,
                      fontWeight: 600, textTransform: 'uppercase',
                      background: '#10B98120', color: '#10B981',
                    }}>
                      {entry.method || 'qr'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes bouncerSlideIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes bouncerPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.9; }
        }
        @keyframes bouncerShake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        #qr-reader video { border-radius: 0 !important; }
        #qr-reader { border: none !important; }
        #qr-reader__scan_region { border: none !important; }
        #qr-reader__dashboard { display: none !important; }
      `}</style>
    </div>
  )
}

function btnStyle(bg) {
  return {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '10px 16px', background: bg, color: '#fff',
    border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
    cursor: 'pointer', whiteSpace: 'nowrap',
  }
}
