import { useState, useEffect, useCallback } from 'react'
import { QrCode } from 'lucide-react'
import { M, FONT, FONT_M } from './theme'
import api from '../../lib/api'

export default function QRCodeCard({ gymId, memberId }) {
  const [qrData, setQrData] = useState(null)
  const [countdown, setCountdown] = useState(90)

  const generateQR = useCallback(async () => {
    try {
      const token = localStorage.getItem('ivira_member_token')
      const { data } = await api.post(`/gyms/${gymId}/qr/generate`, { memberId }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setQrData(data)
      setCountdown(90)
    } catch { setQrData(null) }
  }, [gymId, memberId])

  useEffect(() => { if (gymId && memberId) generateQR() }, [generateQR, gymId, memberId])

  useEffect(() => {
    if (countdown <= 0) { generateQR(); return }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown, generateQR])

  const progress = countdown / 90
  const circumference = 2 * Math.PI * 52

  return (
    <div style={{
      background: M.card, borderRadius: 16, padding: 20,
      border: `1px solid ${M.border}`, textAlign: 'center',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
        <QrCode size={16} color={M.accent} />
        <span style={{ fontSize: 14, fontWeight: 600, color: M.text, fontFamily: FONT }}>Your Check-in QR</span>
      </div>
      <div style={{ padding: '20px 0', position: 'relative', display: 'inline-block' }}>
        <svg width={132} height={132} style={{ position: 'absolute', top: 14, left: -6 }}>
          <circle cx={66} cy={66} r={52} fill="none" stroke={M.border} strokeWidth={3} />
          <circle cx={66} cy={66} r={52} fill="none"
            stroke={countdown < 15 ? M.red : countdown < 30 ? M.amber : M.accent}
            strokeWidth={3} strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            transform="rotate(-90 66 66)"
            style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
          />
        </svg>
        <div style={{
          width: 120, height: 120, borderRadius: 16, background: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 40px ${M.accentGlow}`,
        }}>
          {qrData ? (
            <div style={{ fontSize: 10, color: '#333', padding: 8, wordBreak: 'break-all', fontFamily: FONT_M }}>
              {qrData.token?.slice(0, 20)}...
            </div>
          ) : (
            <QrCode size={60} color="#333" />
          )}
        </div>
      </div>
      <p style={{ fontSize: 12, color: M.textTer, marginTop: 8, fontFamily: FONT_M }}>
        Refreshes in {countdown}s
      </p>
      <p style={{ fontSize: 12, color: M.textSec, fontFamily: FONT }}>Show this at the kiosk</p>
    </div>
  )
}
