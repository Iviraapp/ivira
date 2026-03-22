import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useTheme } from '../../context/ThemeContext'
import { formatTime, debounce } from '../../lib/utils'
import api from '../../lib/api'
import Avatar from '../../components/ui/Avatar'
import {
  Search, QrCode, Smartphone, CheckCircle2, XCircle, User,
  Phone, Mail, Hash, Loader2, Camera, CameraOff, Nfc, Wifi,
  ShieldCheck, AlertTriangle, ChevronRight, RefreshCw, Volume2,
} from 'lucide-react'

const FONT = "'Inter', -apple-system, sans-serif"
const FONT_MONO = "'JetBrains Mono', 'Fira Code', monospace"

/* ── Keyframes (theme-independent) ── */
const KEYFRAMES = `
@keyframes kioskFadeIn {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes kioskPulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.08); opacity: 0.8; }
}
@keyframes successRing {
  0% { transform: scale(0.5); opacity: 0; }
  50% { transform: scale(1.2); opacity: 0.3; }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes successCheck {
  0% { stroke-dashoffset: 80; }
  100% { stroke-dashoffset: 0; }
}
@keyframes scanLine {
  0% { top: 10%; }
  50% { top: 85%; }
  100% { top: 10%; }
}
@keyframes nfcWave {
  0% { transform: scale(0.5); opacity: 0.8; }
  100% { transform: scale(2.5); opacity: 0; }
}
`

/* ── Success Overlay ── */
function SuccessOverlay({ memberName, onDone }) {
  const { theme } = useTheme()

  useEffect(() => {
    const timer = setTimeout(onDone, 3000)
    return () => clearTimeout(timer)
  }, [onDone])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,10,5,0.92)', backdropFilter: 'blur(20px)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      animation: 'kioskFadeIn 0.3s ease-out',
    }}>
      {/* Ripple rings */}
      {[0, 1, 2].map((i) => (
        <div key={i} style={{
          position: 'absolute', width: 200, height: 200, borderRadius: '50%',
          border: `2px solid ${theme.green}`,
          animation: `nfcWave 2s ease-out ${i * 0.4}s infinite`,
        }} />
      ))}

      <div style={{
        width: 120, height: 120, borderRadius: '50%',
        background: `rgba(0,214,143,0.15)`, border: `3px solid ${theme.green}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'successRing 0.5s ease-out',
        boxShadow: `0 0 60px rgba(0,214,143,0.3)`,
        position: 'relative', zIndex: 1,
      }}>
        <CheckCircle2 size={56} color={theme.green} strokeWidth={2} />
      </div>

      <h2 style={{
        fontSize: 36, fontWeight: 800, color: theme.green, margin: '28px 0 8px',
        fontFamily: FONT, textTransform: 'uppercase', letterSpacing: '2px',
        position: 'relative', zIndex: 1,
      }}>
        Checked In
      </h2>
      <p style={{
        fontSize: 20, color: theme.text, fontWeight: 600,
        fontFamily: FONT, position: 'relative', zIndex: 1,
      }}>
        {memberName}
      </p>
      <p style={{
        fontSize: 14, color: theme.textTer, marginTop: 8,
        fontFamily: FONT_MONO, position: 'relative', zIndex: 1,
      }}>
        {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
      </p>
    </div>
  )
}

/* ── Quick Verify Tab ── */
function QuickVerifyTab({ gymId }) {
  const { theme } = useTheme()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedMember, setSelectedMember] = useState(null)
  const [showSuccess, setShowSuccess] = useState(null)
  const inputRef = useRef(null)

  const debouncedSet = useCallback(
    debounce((val) => setDebouncedSearch(val), 250), []
  )

  useEffect(() => { debouncedSet(searchTerm) }, [searchTerm])
  useEffect(() => { inputRef.current?.focus() }, [])

  const { data: searchData, isLoading: searching } = useQuery({
    queryKey: ['member-search', gymId, debouncedSearch],
    queryFn: () => api.get(`/gyms/${gymId}/members`, {
      params: { search: debouncedSearch, limit: 8 },
    }).then((r) => r.data),
    enabled: !!gymId && debouncedSearch.length >= 2,
    keepPreviousData: true,
  })

  const checkinMutation = useMutation({
    mutationFn: (memberId) => api.post(`/gyms/${gymId}/checkins/manual`, { memberId }),
    onSuccess: (res) => {
      const name = res.data?.checkin?.member_name || selectedMember?.name || 'Member'
      setShowSuccess(name)
      setSelectedMember(null)
      setSearchTerm('')
      setDebouncedSearch('')
      queryClient.invalidateQueries({ queryKey: ['checkins'] })
      queryClient.invalidateQueries({ queryKey: ['gym-stats'] })
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Check-in failed')
    },
  })

  const members = searchData?.members ?? []

  const statusDot = (status) => {
    if (status === 'active') return theme.green
    if (status === 'expired') return theme.red
    return theme.amber
  }

  return (
    <>
      {showSuccess && <SuccessOverlay memberName={showSuccess} onDone={() => setShowSuccess(null)} />}

      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        {/* Search Input */}
        <div style={{ position: 'relative', marginBottom: 24 }}>
          <Search size={22} style={{
            position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)',
            color: theme.textTer, pointerEvents: 'none',
          }} />
          <input
            ref={inputRef}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, phone, email, or member ID..."
            style={{
              width: '100%', padding: '18px 20px 18px 56px', fontSize: 18,
              fontFamily: FONT, fontWeight: 500, color: theme.text,
              background: 'rgba(255,255,255,0.04)', border: `2px solid ${theme.border}`,
              borderRadius: 16, outline: 'none', boxSizing: 'border-box',
              transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = theme.borderFocus
              e.target.style.boxShadow = `0 0 0 4px ${theme.accentSoft}`
            }}
            onBlur={(e) => {
              e.target.style.borderColor = theme.border
              e.target.style.boxShadow = 'none'
            }}
          />
          {searching && (
            <Loader2 size={20} style={{
              position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)',
              color: theme.accent, animation: 'spin 1s linear infinite',
            }} />
          )}
        </div>

        {/* Hints */}
        {!debouncedSearch && (
          <div style={{
            display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 32, flexWrap: 'wrap',
          }}>
            {[
              { icon: User, label: 'Name' },
              { icon: Phone, label: 'Phone' },
              { icon: Mail, label: 'Email' },
              { icon: Hash, label: 'Member ID' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 10,
                background: 'rgba(255,255,255,0.03)', border: `1px solid ${theme.border}`,
                fontSize: 12, color: theme.textTer, fontFamily: FONT,
              }}>
                <Icon size={14} />
                {label}
              </div>
            ))}
          </div>
        )}

        {/* Search Results */}
        {debouncedSearch.length >= 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {members.length === 0 && !searching ? (
              <div style={{
                textAlign: 'center', padding: '48px 20px',
                background: 'rgba(255,255,255,0.02)', borderRadius: 16,
                border: `1px solid ${theme.border}`,
              }}>
                <XCircle size={40} color={theme.textTer} style={{ marginBottom: 12 }} />
                <p style={{ color: theme.textSec, fontSize: 16, margin: '0 0 4px', fontFamily: FONT, fontWeight: 600 }}>
                  No members found
                </p>
                <p style={{ color: theme.textTer, fontSize: 13, margin: 0, fontFamily: FONT }}>
                  Try a different name, phone, or email
                </p>
              </div>
            ) : (
              members.map((member, i) => {
                const dot = statusDot(member.status)
                return (
                  <div
                    key={member.id}
                    className="kiosk-search-result"
                    onClick={() => setSelectedMember(member)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 16,
                      padding: '16px 20px', borderRadius: 14,
                      background: 'rgba(255,255,255,0.025)',
                      border: `1px solid ${selectedMember?.id === member.id ? theme.accent : theme.border}`,
                      cursor: 'pointer', transition: 'all 0.2s',
                      animation: `kioskFadeIn 0.3s ease-out ${i * 40}ms both`,
                    }}
                  >
                    <Avatar name={member.name} src={member.photo_url} size={48} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          fontSize: 16, fontWeight: 700, color: theme.text,
                          fontFamily: FONT, textTransform: 'uppercase',
                        }}>
                          {member.name}
                        </span>
                        <span style={{
                          width: 7, height: 7, borderRadius: '50%', background: dot,
                          boxShadow: `0 0 6px ${dot}60`, flexShrink: 0,
                        }} />
                      </div>
                      <div style={{
                        fontSize: 13, color: theme.textTer, fontFamily: FONT, marginTop: 2,
                        display: 'flex', gap: 12,
                      }}>
                        <span>{member.phone}</span>
                        {member.email && <span>{member.email}</span>}
                      </div>
                      {member.plan_name && (
                        <span style={{
                          display: 'inline-block', marginTop: 4,
                          padding: '2px 8px', fontSize: 10, fontWeight: 700,
                          background: theme.accentSoft, color: theme.accent,
                          borderRadius: 6, textTransform: 'uppercase', fontFamily: FONT,
                        }}>
                          {member.plan_name}
                        </span>
                      )}
                    </div>
                    <ChevronRight size={20} color={theme.textTer} />
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* Confirm Check-in Panel */}
        {selectedMember && (
          <div style={{
            marginTop: 24, padding: 28, borderRadius: 20,
            background: theme.accentSoft,
            border: `2px solid ${theme.border}`,
            textAlign: 'center',
            animation: 'kioskFadeIn 0.3s ease-out',
          }}>
            <Avatar name={selectedMember.name} src={selectedMember.photo_url} size={64} />
            <h3 style={{
              fontSize: 22, fontWeight: 800, color: theme.text, margin: '14px 0 4px',
              fontFamily: FONT, textTransform: 'uppercase',
            }}>
              {selectedMember.name}
            </h3>
            <p style={{ fontSize: 14, color: theme.textSec, margin: '0 0 4px', fontFamily: FONT }}>
              {selectedMember.phone}
            </p>
            {selectedMember.status !== 'active' && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 10, marginTop: 8,
                background: 'rgba(255,71,87,0.12)', color: theme.red,
                fontSize: 13, fontWeight: 600, fontFamily: FONT,
              }}>
                <AlertTriangle size={14} />
                Member status: {selectedMember.status}
              </div>
            )}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 20 }}>
              <button
                onClick={() => setSelectedMember(null)}
                style={{
                  padding: '12px 28px', fontSize: 15, fontWeight: 600,
                  fontFamily: FONT, color: theme.textSec,
                  background: 'transparent', border: `1px solid ${theme.border}`,
                  borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => checkinMutation.mutate(selectedMember.id)}
                disabled={checkinMutation.isPending}
                style={{
                  padding: '12px 36px', fontSize: 15, fontWeight: 800,
                  fontFamily: FONT, color: '#fff',
                  background: theme.green, border: 'none', borderRadius: 12,
                  cursor: checkinMutation.isPending ? 'not-allowed' : 'pointer',
                  opacity: checkinMutation.isPending ? 0.6 : 1,
                  textTransform: 'uppercase', letterSpacing: '1px',
                  boxShadow: `0 0 30px rgba(0,214,143,0.3)`,
                  transition: 'all 0.2s',
                }}
              >
                {checkinMutation.isPending ? 'Checking in...' : 'Confirm Check-in'}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

/* ── QR Scanner Tab ── */
function QRScannerTab({ gymId }) {
  const { theme } = useTheme()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [scanning, setScanning] = useState(false)
  const [showSuccess, setShowSuccess] = useState(null)
  const [error, setError] = useState(null)
  const [manualToken, setManualToken] = useState('')
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const animFrameRef = useRef(null)
  const canvasRef = useRef(null)

  const checkinMutation = useMutation({
    mutationFn: (token) => api.post(`/gyms/${gymId}/checkin`, { token }),
    onSuccess: (res) => {
      const name = res.data?.checkin?.member_name || 'Member'
      setShowSuccess(name)
      stopCamera()
      queryClient.invalidateQueries({ queryKey: ['checkins'] })
      queryClient.invalidateQueries({ queryKey: ['gym-stats'] })
    },
    onError: (err) => {
      setError(err?.response?.data?.message || 'Invalid or expired QR code')
      setTimeout(() => setError(null), 3000)
    },
  })

  const hasBarcodeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window

  async function startCamera() {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setScanning(true)

      if (hasBarcodeDetector) {
        const detector = new BarcodeDetector({ formats: ['qr_code'] })
        const scan = async () => {
          if (!videoRef.current || videoRef.current.readyState !== 4) {
            animFrameRef.current = requestAnimationFrame(scan)
            return
          }
          try {
            const barcodes = await detector.detect(videoRef.current)
            if (barcodes.length > 0 && !checkinMutation.isPending) {
              const token = barcodes[0].rawValue
              if (token) checkinMutation.mutate(token)
            }
          } catch {}
          animFrameRef.current = requestAnimationFrame(scan)
        }
        animFrameRef.current = requestAnimationFrame(scan)
      }
    } catch (err) {
      setError('Camera access denied. Please allow camera permissions.')
      setScanning(false)
    }
  }

  function stopCamera() {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setScanning(false)
  }

  useEffect(() => {
    return () => stopCamera()
  }, [])

  function handleManualSubmit() {
    if (!manualToken.trim()) return
    checkinMutation.mutate(manualToken.trim())
    setManualToken('')
  }

  return (
    <>
      {showSuccess && <SuccessOverlay memberName={showSuccess} onDone={() => { setShowSuccess(null); startCamera() }} />}

      <div style={{ maxWidth: 540, margin: '0 auto', textAlign: 'center' }}>
        {/* Camera viewport */}
        <div style={{
          position: 'relative', width: '100%', aspectRatio: '4/3',
          borderRadius: 20, overflow: 'hidden', marginBottom: 24,
          background: '#000', border: `2px solid ${scanning ? theme.cyan : theme.border}`,
          boxShadow: scanning ? `0 0 40px rgba(0,212,255,0.15)` : 'none',
          transition: 'all 0.3s',
        }}>
          <video
            ref={videoRef}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: scanning ? 'block' : 'none' }}
            playsInline
            muted
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* Scan line animation */}
          {scanning && (
            <div style={{
              position: 'absolute', left: '10%', right: '10%', height: 2,
              background: `linear-gradient(90deg, transparent, ${theme.cyan}, transparent)`,
              boxShadow: `0 0 12px ${theme.cyan}`,
              animation: 'scanLine 2.5s ease-in-out infinite',
            }} />
          )}

          {/* Corner markers */}
          {scanning && (
            <>
              {[{ top: 20, left: 20 }, { top: 20, right: 20 }, { bottom: 20, left: 20 }, { bottom: 20, right: 20 }].map((pos, i) => (
                <div key={i} style={{
                  position: 'absolute', ...pos, width: 28, height: 28,
                  borderTop: i < 2 ? `3px solid ${theme.cyan}` : 'none',
                  borderBottom: i >= 2 ? `3px solid ${theme.cyan}` : 'none',
                  borderLeft: i % 2 === 0 ? `3px solid ${theme.cyan}` : 'none',
                  borderRight: i % 2 === 1 ? `3px solid ${theme.cyan}` : 'none',
                  borderRadius: 4, opacity: 0.8,
                }} />
              ))}
            </>
          )}

          {/* Idle state */}
          {!scanning && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', background: theme.bgSec,
            }}>
              <Camera size={48} color={theme.textTer} style={{ marginBottom: 16 }} />
              <p style={{ color: theme.textSec, fontSize: 15, margin: 0, fontFamily: FONT }}>
                Camera is off
              </p>
            </div>
          )}

          {/* Error overlay */}
          {error && (
            <div style={{
              position: 'absolute', bottom: 16, left: 16, right: 16,
              padding: '12px 16px', borderRadius: 12,
              background: 'rgba(255,71,87,0.9)', color: '#fff',
              fontSize: 13, fontWeight: 600, fontFamily: FONT,
              textAlign: 'center', backdropFilter: 'blur(8px)',
            }}>
              {error}
            </div>
          )}
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 28 }}>
          {!scanning ? (
            <button
              onClick={startCamera}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '14px 32px', fontSize: 16, fontWeight: 700,
                fontFamily: FONT, color: '#fff', background: theme.cyan,
                border: 'none', borderRadius: 14, cursor: 'pointer',
                textTransform: 'uppercase', letterSpacing: '1px',
                boxShadow: `0 0 30px rgba(0,212,255,0.3)`, transition: 'all 0.2s',
              }}
            >
              <Camera size={20} /> Start Scanner
            </button>
          ) : (
            <button
              onClick={stopCamera}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '14px 32px', fontSize: 16, fontWeight: 700,
                fontFamily: FONT, color: '#fff', background: theme.red,
                border: 'none', borderRadius: 14, cursor: 'pointer',
                textTransform: 'uppercase', letterSpacing: '1px',
                transition: 'all 0.2s',
              }}
            >
              <CameraOff size={20} /> Stop Scanner
            </button>
          )}
        </div>

        {/* Browser support note */}
        {!hasBarcodeDetector && (
          <div style={{
            padding: '14px 20px', borderRadius: 12, marginBottom: 20,
            background: 'rgba(255,176,32,0.08)', border: `1px solid rgba(255,176,32,0.2)`,
            fontSize: 13, color: theme.amber, fontFamily: FONT, textAlign: 'left',
          }}>
            <strong>Note:</strong> Your browser doesn't support automatic QR detection.
            Use Chrome/Edge for auto-scan, or paste the QR token below.
          </div>
        )}

        {/* Manual token input fallback */}
        <div style={{
          padding: 20, borderRadius: 16,
          background: 'rgba(255,255,255,0.02)', border: `1px solid ${theme.border}`,
        }}>
          <p style={{
            fontSize: 12, color: theme.textTer, margin: '0 0 10px',
            fontFamily: FONT, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700,
          }}>
            Or paste QR token manually
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              placeholder="Paste token here..."
              onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
              style={{
                flex: 1, padding: '12px 16px', fontSize: 14,
                fontFamily: FONT_MONO, color: theme.text,
                background: theme.bgTer, border: `1px solid ${theme.border}`,
                borderRadius: 10, outline: 'none', boxSizing: 'border-box',
              }}
            />
            <button
              onClick={handleManualSubmit}
              disabled={!manualToken.trim() || checkinMutation.isPending}
              style={{
                padding: '12px 20px', fontSize: 14, fontWeight: 700,
                fontFamily: FONT, color: '#fff', background: theme.brandAccent,
                border: 'none', borderRadius: 10, cursor: 'pointer',
                opacity: !manualToken.trim() || checkinMutation.isPending ? 0.5 : 1,
                textTransform: 'uppercase', transition: 'all 0.2s',
              }}
            >
              Submit
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

/* ── NFC Tap Tab ── */
function NFCTapTab({ gymId }) {
  const { theme } = useTheme()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [nfcSupported, setNfcSupported] = useState(false)
  const [nfcReading, setNfcReading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(null)
  const [error, setError] = useState(null)
  const [lastScan, setLastScan] = useState(null)
  const readerRef = useRef(null)
  const abortRef = useRef(null)

  // Write mode state
  const [writeMode, setWriteMode] = useState(false)
  const [writeId, setWriteId] = useState('')

  useEffect(() => {
    setNfcSupported('NDEFReader' in window)
  }, [])

  const checkinMutation = useMutation({
    mutationFn: (payload) => api.post(`/gyms/${gymId}/checkins/nfc`, { payload }),
    onSuccess: (res) => {
      const name = res.data?.checkin?.member_name || 'Member'
      setShowSuccess(name)
      setLastScan({ name, time: new Date() })
      queryClient.invalidateQueries({ queryKey: ['checkins'] })
      queryClient.invalidateQueries({ queryKey: ['gym-stats'] })
    },
    onError: (err) => {
      setError(err?.response?.data?.message || 'NFC check-in failed')
      setTimeout(() => setError(null), 4000)
    },
  })

  async function startNFC() {
    setError(null)
    try {
      const ndef = new NDEFReader()
      abortRef.current = new AbortController()

      await ndef.scan({ signal: abortRef.current.signal })
      setNfcReading(true)
      readerRef.current = ndef

      ndef.addEventListener('reading', ({ message, serialNumber }) => {
        // Extract text record from NFC tag
        let payload = null
        for (const record of message.records) {
          if (record.recordType === 'text') {
            const decoder = new TextDecoder(record.encoding || 'utf-8')
            payload = decoder.decode(record.data)
            break
          }
          if (record.recordType === 'url') {
            const decoder = new TextDecoder()
            payload = decoder.decode(record.data)
            // Extract member ID from URL if formatted as ivira://member/{id}
            const match = payload.match(/member\/([a-f0-9-]+)/i)
            if (match) payload = match[1]
            break
          }
        }

        // Fallback to serial number
        if (!payload && serialNumber && serialNumber !== '') {
          payload = serialNumber
        }

        if (payload && !checkinMutation.isPending) {
          checkinMutation.mutate(payload)
        }
      }, { signal: abortRef.current.signal })

      ndef.addEventListener('readingerror', () => {
        setError('Failed to read NFC tag. Try again.')
        setTimeout(() => setError(null), 3000)
      }, { signal: abortRef.current.signal })

    } catch (err) {
      if (err.name === 'AbortError') return
      setError('NFC permission denied or unavailable.')
      setNfcReading(false)
    }
  }

  function stopNFC() {
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
    setNfcReading(false)
  }

  async function writeNFCTag() {
    if (!writeId.trim()) return
    try {
      const ndef = new NDEFReader()
      await ndef.write({
        records: [{ recordType: 'text', data: writeId.trim() }],
      })
      toast.success('NFC tag written successfully!')
      setWriteMode(false)
      setWriteId('')
    } catch (err) {
      toast.error('Failed to write NFC tag. Hold the tag closer.')
    }
  }

  useEffect(() => {
    return () => stopNFC()
  }, [])

  if (!nfcSupported) {
    return (
      <div style={{ maxWidth: 500, margin: '0 auto', textAlign: 'center', padding: '40px 20px' }}>
        <div style={{
          width: 80, height: 80, borderRadius: 20, margin: '0 auto 24px',
          background: 'rgba(255,176,32,0.08)', border: `1px solid rgba(255,176,32,0.2)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Wifi size={36} color={theme.amber} />
        </div>
        <h3 style={{
          fontSize: 22, fontWeight: 800, color: theme.text, margin: '0 0 12px',
          fontFamily: FONT, textTransform: 'uppercase',
        }}>
          NFC Not Supported
        </h3>
        <p style={{ fontSize: 15, color: theme.textSec, margin: '0 0 8px', fontFamily: FONT, lineHeight: 1.6 }}>
          Web NFC is currently supported on <strong style={{ color: theme.text }}>Chrome for Android</strong> only.
        </p>
        <p style={{ fontSize: 14, color: theme.textTer, margin: '0 0 28px', fontFamily: FONT }}>
          Use the Quick Verify or QR Scanner tabs instead, or open this page on an Android device with Chrome.
        </p>

        <div style={{
          padding: 20, borderRadius: 16, textAlign: 'left',
          background: 'rgba(255,255,255,0.02)', border: `1px solid ${theme.border}`,
        }}>
          <p style={{
            fontSize: 11, fontWeight: 700, color: theme.textTer, margin: '0 0 12px',
            textTransform: 'uppercase', letterSpacing: '1px', fontFamily: FONT,
          }}>
            How NFC Check-in Works
          </p>
          {[
            'Program an NFC tag/card with the member\'s ID',
            'Member taps tag on the Android device at the entrance',
            'Check-in is recorded instantly — no phone needed',
          ].map((step, i) => (
            <div key={i} style={{
              display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 10,
            }}>
              <span style={{
                width: 22, height: 22, borderRadius: 7, flexShrink: 0,
                background: theme.accentSoft, color: theme.accent,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, fontFamily: FONT_MONO,
              }}>
                {i + 1}
              </span>
              <p style={{ fontSize: 13, color: theme.textSec, margin: 0, fontFamily: FONT }}>
                {step}
              </p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      {showSuccess && <SuccessOverlay memberName={showSuccess} onDone={() => setShowSuccess(null)} />}

      <div style={{ maxWidth: 500, margin: '0 auto', textAlign: 'center' }}>
        {/* NFC Reader Visual */}
        <div style={{
          position: 'relative', width: 200, height: 200, margin: '0 auto 32px',
        }}>
          {/* Pulse waves when reading */}
          {nfcReading && [0, 1, 2].map((i) => (
            <div key={i} style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              border: `2px solid ${theme.green}`,
              animation: `nfcWave 3s ease-out ${i * 0.8}s infinite`,
            }} />
          ))}

          <div style={{
            width: 200, height: 200, borderRadius: '50%',
            background: nfcReading
              ? `radial-gradient(circle, rgba(0,214,143,0.15) 0%, rgba(0,214,143,0.03) 70%)`
              : 'rgba(255,255,255,0.03)',
            border: `3px solid ${nfcReading ? theme.green : theme.border}`,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.4s',
            boxShadow: nfcReading ? `0 0 60px rgba(0,214,143,0.2)` : 'none',
            position: 'relative', zIndex: 1,
          }}>
            <Nfc size={48} color={nfcReading ? theme.green : theme.textTer} style={{
              animation: nfcReading ? 'kioskPulse 2s ease-in-out infinite' : 'none',
            }} />
            <p style={{
              fontSize: 12, fontWeight: 700, margin: '10px 0 0',
              color: nfcReading ? theme.green : theme.textTer,
              fontFamily: FONT, textTransform: 'uppercase', letterSpacing: '1px',
            }}>
              {nfcReading ? 'Tap Now' : 'NFC Off'}
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            padding: '12px 20px', borderRadius: 12, marginBottom: 20,
            background: 'rgba(255,71,87,0.12)', border: `1px solid rgba(255,71,87,0.2)`,
            color: theme.red, fontSize: 14, fontFamily: FONT, fontWeight: 600,
            animation: 'kioskFadeIn 0.3s ease-out',
          }}>
            {error}
          </div>
        )}

        {/* Last scan info */}
        {lastScan && !showSuccess && (
          <div style={{
            padding: '12px 20px', borderRadius: 12, marginBottom: 20,
            background: 'rgba(0,214,143,0.06)', border: `1px solid rgba(0,214,143,0.15)`,
            fontSize: 13, color: theme.textSec, fontFamily: FONT,
          }}>
            Last: <strong style={{ color: theme.green }}>{lastScan.name}</strong> at{' '}
            <span style={{ fontFamily: FONT_MONO }}>{lastScan.time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        )}

        {/* Controls */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 32 }}>
          {!nfcReading ? (
            <button
              onClick={startNFC}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '14px 36px', fontSize: 16, fontWeight: 700,
                fontFamily: FONT, color: '#fff', background: theme.green,
                border: 'none', borderRadius: 14, cursor: 'pointer',
                textTransform: 'uppercase', letterSpacing: '1px',
                boxShadow: `0 0 30px rgba(0,214,143,0.3)`, transition: 'all 0.2s',
              }}
            >
              <Nfc size={20} /> Start NFC Reader
            </button>
          ) : (
            <button
              onClick={stopNFC}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '14px 36px', fontSize: 16, fontWeight: 700,
                fontFamily: FONT, color: '#fff', background: theme.red,
                border: 'none', borderRadius: 14, cursor: 'pointer',
                textTransform: 'uppercase', letterSpacing: '1px', transition: 'all 0.2s',
              }}
            >
              Stop Reader
            </button>
          )}
        </div>

        {/* Write NFC Tag Section */}
        <div style={{
          padding: 20, borderRadius: 16, textAlign: 'left',
          background: 'rgba(255,255,255,0.02)', border: `1px solid ${theme.border}`,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: writeMode ? 14 : 0,
          }}>
            <p style={{
              fontSize: 12, fontWeight: 700, color: theme.textTer, margin: 0,
              textTransform: 'uppercase', letterSpacing: '1px', fontFamily: FONT,
            }}>
              Program NFC Card
            </p>
            <button
              onClick={() => setWriteMode(!writeMode)}
              style={{
                fontSize: 12, fontWeight: 600, color: theme.accent,
                background: theme.accentSoft,
                border: `1px solid ${theme.border}`,
                borderRadius: 8, padding: '4px 12px', cursor: 'pointer',
                fontFamily: FONT,
              }}
            >
              {writeMode ? 'Cancel' : 'Write Tag'}
            </button>
          </div>

          {writeMode && (
            <div style={{ animation: 'kioskFadeIn 0.2s ease-out' }}>
              <p style={{ fontSize: 12, color: theme.textTer, margin: '0 0 10px', fontFamily: FONT }}>
                Enter the member ID to write to an NFC card/tag. Hold the tag to the device when ready.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={writeId}
                  onChange={(e) => setWriteId(e.target.value)}
                  placeholder="Member ID (UUID)"
                  style={{
                    flex: 1, padding: '10px 14px', fontSize: 13,
                    fontFamily: FONT_MONO, color: theme.text,
                    background: theme.bgTer, border: `1px solid ${theme.border}`,
                    borderRadius: 10, outline: 'none', boxSizing: 'border-box',
                  }}
                />
                <button
                  onClick={writeNFCTag}
                  disabled={!writeId.trim()}
                  style={{
                    padding: '10px 18px', fontSize: 13, fontWeight: 700,
                    fontFamily: FONT, color: '#fff', background: theme.green,
                    border: 'none', borderRadius: 10, cursor: 'pointer',
                    opacity: !writeId.trim() ? 0.5 : 1,
                    textTransform: 'uppercase', transition: 'all 0.2s',
                  }}
                >
                  Write
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

/* ── Main Staff Check-in Page ── */
export default function StaffCheckin() {
  const { theme } = useTheme()
  const { gym } = useAuth()
  const gymId = gym?.id
  const [activeTab, setActiveTab] = useState('verify')

  const TABS = [
    { id: 'verify', label: 'Quick Verify', icon: ShieldCheck, color: theme.accent },
    { id: 'qr', label: 'QR Scanner', icon: QrCode, color: theme.cyan },
    { id: 'nfc', label: 'NFC Tap', icon: Nfc, color: theme.green },
  ]

  const hoverCSS = `
.kiosk-search-result:hover {
  background: ${theme.bgHover} !important;
  border-color: ${theme.borderFocus} !important;
}
`

  return (
    <div style={{ minHeight: '100vh', background: theme.bg, fontFamily: FONT }}>
      <style>{KEYFRAMES}{hoverCSS}</style>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
        {/* Header */}
        <div style={{ marginBottom: 32, animation: 'kioskFadeIn 0.4s ease-out' }}>
          <h1 style={{
            fontSize: 30, fontWeight: 800, color: theme.text, margin: 0, lineHeight: 1.1,
            fontFamily: FONT, textTransform: 'uppercase', letterSpacing: '-0.01em',
          }}>
            Staff Check-in
          </h1>
          <p style={{ fontSize: 14, color: theme.textTer, margin: '4px 0 0', fontWeight: 500 }}>
            Verify and check in members quickly
          </p>
        </div>

        {/* Tab Bar */}
        <div style={{
          display: 'flex', gap: 6, marginBottom: 36,
          background: 'rgba(255,255,255,0.02)',
          border: `1px solid ${theme.border}`, borderRadius: 16, padding: 6,
          animation: 'kioskFadeIn 0.4s ease-out 100ms both',
        }}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 10, padding: '14px 20px', borderRadius: 12, border: 'none',
                  fontSize: 15, fontWeight: isActive ? 700 : 500,
                  fontFamily: FONT, textTransform: 'uppercase', letterSpacing: '0.5px',
                  cursor: 'pointer', transition: 'all 0.25s',
                  background: isActive ? `${tab.color}15` : 'transparent',
                  color: isActive ? tab.color : theme.textTer,
                  boxShadow: isActive ? `inset 0 0 20px ${tab.color}08` : 'none',
                }}
              >
                <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        <div style={{ animation: 'kioskFadeIn 0.4s ease-out 200ms both' }}>
          {activeTab === 'verify' && <QuickVerifyTab gymId={gymId} />}
          {activeTab === 'qr' && <QRScannerTab gymId={gymId} />}
          {activeTab === 'nfc' && <NFCTapTab gymId={gymId} />}
        </div>
      </div>
    </div>
  )
}
