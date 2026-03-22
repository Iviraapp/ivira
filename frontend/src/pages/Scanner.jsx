import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Html5Qrcode } from 'html5-qrcode'
import { ScanLine, CheckCircle2, XCircle, Loader2, Camera, CameraOff, Keyboard } from 'lucide-react'
import { format } from 'date-fns'
import api from '../lib/api'

export default function Scanner() {
  const { gymId } = useAuth()
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState(null) // { success, message, member, time }
  const [processing, setProcessing] = useState(false)
  const [history, setHistory] = useState([])
  const [manualMode, setManualMode] = useState(false)
  const [manualToken, setManualToken] = useState('')
  const scannerRef = useRef(null)
  const lastScannedRef = useRef('')

  const startScanner = async () => {
    try {
      const scanner = new Html5Qrcode('qr-reader')
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        (decodedText) => handleScan(decodedText),
        () => {},
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
    // Deduplicate rapid scans
    if (token === lastScannedRef.current || processing) return
    lastScannedRef.current = token
    setProcessing(true)
    setResult(null)

    try {
      const res = await api.post(`/gyms/${gymId}/checkin`, { token })
      const memberName = res.data?.member_name || res.data?.checkin?.member_name || 'Member'
      const entry = {
        success: true,
        message: `${memberName} checked in!`,
        member: memberName,
        time: new Date(),
        method: 'qr',
      }
      setResult(entry)
      setHistory((prev) => [entry, ...prev].slice(0, 20))

      // Clear dedup after 10 seconds
      setTimeout(() => { lastScannedRef.current = '' }, 10000)
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Check-in failed'
      setResult({ success: false, message: msg })
      // Allow retry after 3 seconds
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

  useEffect(() => {
    return () => { stopScanner() }
  }, [])

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 700, margin: 0 }}>QR Scanner</h1>
        <p style={{ color: '#666', fontSize: 14, margin: '4px 0 0' }}>
          Scan member QR codes to check them in
        </p>
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
                    <button onClick={startScanner} style={btnStyle('#0052FF')}>
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
                <button onClick={startScanner} style={btnStyle('#0052FF')}>
                  <Camera size={16} /> {manualMode ? 'Switch to Camera' : 'Start Camera'}
                </button>
              )}
              <button
                onClick={() => { setManualMode(!manualMode); if (scanning) stopScanner() }}
                style={btnStyle(manualMode ? '#0052FF' : '#333')}
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
                padding: '14px 20px', background: '#0052FF15', borderTop: '1px solid #1a1a2e',
                display: 'flex', alignItems: 'center', gap: 10, color: '#0052FF',
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
                  <div key={i} style={{
                    padding: '12px 20px', borderBottom: '1px solid #111',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}>
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
                      </div>
                    </div>
                    <span style={{
                      padding: '2px 6px', borderRadius: 4, fontSize: 10,
                      fontWeight: 600, textTransform: 'uppercase',
                      background: '#0052FF20', color: '#0052FF',
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
