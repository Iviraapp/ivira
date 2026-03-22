import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { SkeletonTable } from '../../components/ui'
import { formatDate, formatTime } from '../../lib/utils'
import api from '../../lib/api'
import { QrCode, Clock, RefreshCw, Download, ExternalLink, Unlock, Wifi, WifiOff } from 'lucide-react'
import Avatar from '../../components/ui/Avatar'
import { useSearchParams } from 'react-router-dom'
import { useToast } from '../../context/ToastContext'
import { useMutation, useQueryClient } from '@tanstack/react-query'

const TODAY = new Date().toISOString().split('T')[0]

export default function Checkins() {
  const { gym } = useAuth()
  const { theme, isDark } = useTheme()
  const gymId = gym?.id
  const [searchParams] = useSearchParams()

  const fontBody = "'Inter', -apple-system, sans-serif"
  const fontDisplay = "'Inter', -apple-system, sans-serif"
  const fontMono = "'JetBrains Mono', monospace"

  const glassCard = {
    background: theme.bgSec,
    border: `1px solid ${theme.border}`,
    borderRadius: 14,
    overflow: 'hidden',
  }

  const toast = useToast()
  const queryClient = useQueryClient()
  const [date, setDate] = useState(searchParams.get('date') || TODAY)
  const [page, setPage] = useState(1)
  const [kioskOnline, setKioskOnline] = useState(true)
  const [unlockReason, setUnlockReason] = useState('')
  const [showUnlockModal, setShowUnlockModal] = useState(false)
  const [unlockMemberName, setUnlockMemberName] = useState('')
  const limit = 20

  // Check kiosk status periodically
  useEffect(() => {
    if (!gymId) return
    const checkKiosk = async () => {
      try {
        const { data } = await api.get(`/gyms/${gymId}/kiosk/status`)
        setKioskOnline(data.online !== false)
      } catch { setKioskOnline(false) }
    }
    checkKiosk()
    const interval = setInterval(checkKiosk, 30000)
    return () => clearInterval(interval)
  }, [gymId])

  const remoteUnlock = useMutation({
    mutationFn: ({ memberId, reason }) =>
      api.post(`/gyms/${gymId}/access/remote-unlock`, { member_id: memberId, reason }),
    onSuccess: () => {
      toast.success('Remote unlock sent — door opened')
      queryClient.invalidateQueries({ queryKey: ['checkins', gymId] })
      setShowUnlockModal(false)
      setUnlockReason('')
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Remote unlock failed'),
  })

  // Sync URL date param
  useEffect(() => {
    const urlDate = searchParams.get('date')
    if (urlDate && urlDate !== date) {
      setDate(urlDate)
      setPage(1)
    }
  }, [searchParams])

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['checkins', gymId, date, page],
    queryFn: () =>
      api.get(`/gyms/${gymId}/checkins`, {
        params: { page, limit, date },
      }).then((res) => res.data),
    enabled: !!gymId,
    refetchInterval: 30000,
    keepPreviousData: true,
  })

  const { data: statsData } = useQuery({
    queryKey: ['gym-stats', gymId],
    queryFn: () => api.get(`/gyms/${gymId}/stats`).then((r) => r.data),
    enabled: !!gymId,
  })

  const checkins = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / limit)
  const todayCount = data?.todayCount ?? 0
  const weekCount = data?.weekCount ?? 0

  function handleExportCSV() {
    if (!checkins.length) return
    const headers = ['Member', 'Method', 'Time', 'Date']
    const rows = checkins.map((c) => [
      c.member_name || '',
      c.method || '',
      formatTime(c.checked_in_at),
      formatDate(c.checked_in_at),
    ])
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `checkins-${date}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1200, margin: '0 auto', fontFamily: fontBody }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 28,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: theme.text,
              margin: 0,
              fontFamily: fontDisplay,
            }}
          >
            Check-ins
          </h1>
          <p style={{ fontSize: 14, color: theme.textSec, margin: '4px 0 0' }}>
            Live attendance tracking
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Kiosk Status */}
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 20,
              background: theme.bgTer, border: `1px solid ${theme.border}`,
              fontSize: 12, color: theme.textTer,
            }}
            title={kioskOnline ? 'Kiosk is online' : 'Kiosk is offline'}
          >
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: kioskOnline ? theme.green : theme.red,
              display: 'inline-block',
              animation: kioskOnline ? 'pulse-dot 2s ease-in-out infinite' : 'none',
            }} />
            {kioskOnline ? 'Kiosk Online' : 'Kiosk Offline'}
          </div>

          {/* Remote Unlock */}
          <button
            onClick={() => setShowUnlockModal(true)}
            disabled={!kioskOnline}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', fontSize: 13, fontWeight: 700,
              fontFamily: fontBody,
              color: kioskOnline ? (theme.bg === '#000000' ? '#000' : '#fff') : theme.textTer,
              background: kioskOnline ? theme.text : theme.bgTer,
              border: 'none', borderRadius: 10,
              cursor: kioskOnline ? 'pointer' : 'not-allowed',
              opacity: kioskOnline ? 1 : 0.5,
              transition: 'all 0.15s',
            }}
          >
            <Unlock size={14} /> Remote Unlock
          </button>

          {/* CSV Export */}
          <button
            onClick={handleExportCSV}
            disabled={checkins.length === 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              fontSize: 13,
              fontWeight: 600,
              fontFamily: fontBody,
              color: checkins.length === 0 ? theme.textTer : theme.textSec,
              background: theme.bgTer,
              border: `1px solid ${theme.border}`,
              borderRadius: 10,
              cursor: checkins.length === 0 ? 'not-allowed' : 'pointer',
              opacity: checkins.length === 0 ? 0.5 : 1,
              transition: 'all 0.2s',
            }}
          >
            <Download size={14} /> CSV
          </button>

          <input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value)
              setPage(1)
            }}
            style={{
              padding: '10px 14px',
              fontSize: 14,
              fontFamily: fontBody,
              color: theme.text,
              background: theme.bgTer,
              border: `1px solid ${theme.border}`,
              borderRadius: 10,
              outline: 'none',
              cursor: 'pointer',
              colorScheme: isDark ? 'dark' : 'light',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => (e.target.style.borderColor = theme.borderFocus)}
            onBlur={(e) => (e.target.style.borderColor = theme.border)}
          />

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              background: theme.bgTer,
              border: `1px solid ${theme.border}`,
              borderRadius: 10,
              cursor: isFetching ? 'not-allowed' : 'pointer',
              color: theme.textSec,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = theme.borderFocus
              e.currentTarget.style.color = theme.accent
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = theme.border
              e.currentTarget.style.color = theme.textSec
            }}
          >
            <RefreshCw
              size={16}
              style={{
                animation: isFetching ? 'spin 1s linear infinite' : 'none',
              }}
            />
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 28,
        }}
      >
        <div style={glassCard}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ color: theme.textSec, fontSize: 13, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Today's Check-ins
            </div>
            <div
              style={{
                fontSize: 44,
                fontWeight: 700,
                color: theme.accent,
                fontFamily: fontMono,
                lineHeight: 1,
              }}
            >
              {isLoading ? '--' : todayCount}
            </div>
          </div>
        </div>

        <div style={glassCard}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ color: theme.textSec, fontSize: 13, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              This Week
            </div>
            <div
              style={{
                fontSize: 44,
                fontWeight: 700,
                color: theme.text,
                fontFamily: fontMono,
                lineHeight: 1,
              }}
            >
              {isLoading ? '--' : weekCount}
            </div>
          </div>
        </div>

        <div style={glassCard}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ color: theme.textSec, fontSize: 13, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Viewing Date
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: date === TODAY ? theme.green : theme.cyan,
                fontFamily: fontMono,
                lineHeight: 1,
              }}
            >
              {date === TODAY ? 'Today' : formatDate(date)}
            </div>
          </div>
        </div>
      </div>

      {/* Check-ins Table */}
      <div style={glassCard}>
        <div style={{ padding: '20px 24px 0' }}>
          <h2
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: theme.text,
              margin: '0 0 16px 0',
              fontFamily: fontDisplay,
            }}
          >
            Check-in Log
          </h2>
        </div>

        {isLoading ? (
          <div style={{ padding: '0 24px 24px' }}>
            <SkeletonTable rows={5} cols={4} />
          </div>
        ) : checkins.length === 0 ? (
          <div
            style={{
              padding: '60px 40px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                background: theme.accentSoft,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <QrCode size={28} color={theme.cyan} />
            </div>
            <h3 style={{ color: theme.text, fontSize: 18, fontWeight: 700, margin: '0 0 8px', fontFamily: fontDisplay, textTransform: 'uppercase' }}>
              No check-ins {date === TODAY ? 'today' : 'on this date'}
            </h3>
            <p style={{ color: theme.textSec, fontSize: 14, margin: '0 0 20px', maxWidth: 340 }}>
              {date === TODAY
                ? 'Share your check-in QR code with members to get started.'
                : `No check-ins recorded for ${formatDate(date)}.`}
            </p>
            {date === TODAY && statsData?.checkinUrl && (
              <button
                onClick={() => window.open(statsData.checkinUrl, '_blank')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '10px 20px',
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: fontDisplay,
                  color: '#fff',
                  background: theme.brandAccent,
                  border: 'none',
                  borderRadius: 10,
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                <ExternalLink size={15} /> Share QR Check-in Page
              </button>
            )}
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: 14,
                  fontFamily: fontBody,
                }}
              >
                <thead>
                  <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
                    {['Member', 'Method', 'Time', 'Date'].map((col) => (
                      <th
                        key={col}
                        style={{
                          padding: '12px 24px',
                          fontWeight: 500,
                          fontSize: 11,
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          color: theme.textTer,
                          textAlign: 'left',
                          background: 'transparent',
                          border: 'none',
                        }}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {checkins.map((checkin) => {
                    const method = (checkin.method || 'manual').toLowerCase()
                    return (
                      <tr
                        key={checkin.id}
                        style={{ transition: 'background 0.2s ease' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = theme.bgHover)}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '14px 24px', border: 'none' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <Avatar name={checkin.member_name} size={34} />
                            <span style={{ color: theme.text, fontWeight: 500 }}>
                              {checkin.member_name}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '14px 24px', border: 'none' }}>
                          {method === 'qr' ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                padding: '4px 10px',
                                fontSize: 12,
                                fontWeight: 500,
                                borderRadius: 6,
                                background: theme.accentSoft,
                                color: theme.accent,
                              }}
                            >
                              <QrCode size={12} /> QR
                            </span>
                          ) : (
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '4px 10px',
                                fontSize: 12,
                                fontWeight: 500,
                                borderRadius: 6,
                                background: theme.accentSoft,
                                color: method === 'otp' ? theme.green : theme.cyan,
                                textTransform: 'uppercase',
                              }}
                            >
                              {checkin.method || 'manual'}
                            </span>
                          )}
                        </td>
                        <td
                          style={{
                            padding: '14px 24px',
                            border: 'none',
                            color: theme.text,
                            fontFamily: fontMono,
                            fontSize: 13,
                          }}
                        >
                          {formatTime(checkin.checked_in_at)}
                        </td>
                        <td
                          style={{
                            padding: '14px 24px',
                            border: 'none',
                            color: theme.textSec,
                            fontSize: 13,
                          }}
                        >
                          {formatDate(checkin.checked_in_at)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 24px',
                  borderTop: `1px solid ${theme.border}`,
                }}
              >
                <span style={{ color: theme.textSec, fontSize: 13 }}>
                  Page {page} of {totalPages} ({total} total)
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    style={{
                      padding: '6px 14px',
                      fontSize: 13,
                      fontFamily: fontBody,
                      color: page === 1 ? theme.textTer : theme.textSec,
                      background: theme.bgTer,
                      border: `1px solid ${theme.border}`,
                      borderRadius: 8,
                      cursor: page === 1 ? 'not-allowed' : 'pointer',
                      opacity: page === 1 ? 0.5 : 1,
                      transition: 'all 0.15s',
                    }}
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    style={{
                      padding: '6px 14px',
                      fontSize: 13,
                      fontFamily: fontBody,
                      color: page === totalPages ? theme.textTer : theme.textSec,
                      background: theme.bgTer,
                      border: `1px solid ${theme.border}`,
                      borderRadius: 8,
                      cursor: page === totalPages ? 'not-allowed' : 'pointer',
                      opacity: page === totalPages ? 0.5 : 1,
                      transition: 'all 0.15s',
                    }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Remote Unlock Modal */}
      {showUnlockModal && (
        <>
          <div onClick={() => setShowUnlockModal(false)} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)', zIndex: 1000,
          }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: '100%', maxWidth: 420, background: theme.bgSec,
            border: `1px solid ${theme.border}`, borderRadius: 16,
            zIndex: 1001, padding: 28,
            boxShadow: '0 24px 48px rgba(0,0,0,0.3)',
          }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: theme.text, margin: '0 0 4px', fontFamily: fontBody }}>
              Remote Unlock
            </h3>
            <p style={{ fontSize: 13, color: theme.textSec, margin: '0 0 20px', fontFamily: fontBody }}>
              Send an ACCESS_GRANTED signal to the gym kiosk
            </p>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: theme.textSec, marginBottom: 6, fontFamily: fontBody, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Member Name (optional)
              </label>
              <input value={unlockMemberName} onChange={(e) => setUnlockMemberName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                style={{
                  width: '100%', padding: '10px 14px', background: theme.bg,
                  border: `1px solid ${theme.border}`, borderRadius: 10,
                  fontSize: 14, color: theme.text, fontFamily: fontBody,
                  outline: 'none', boxSizing: 'border-box',
                }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: theme.textSec, marginBottom: 6, fontFamily: fontBody, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Reason *
              </label>
              <select value={unlockReason} onChange={(e) => setUnlockReason(e.target.value)} style={{
                width: '100%', padding: '10px 14px', background: theme.bg,
                border: `1px solid ${theme.border}`, borderRadius: 10,
                fontSize: 14, color: theme.text, fontFamily: fontBody,
                outline: 'none', cursor: 'pointer', appearance: 'none', boxSizing: 'border-box',
              }}>
                <option value="">Select reason...</option>
                <option value="Forgot Phone">Forgot Phone</option>
                <option value="QR Not Working">QR Not Working</option>
                <option value="Guest Pass">Guest Pass</option>
                <option value="Staff Override">Staff Override</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowUnlockModal(false)} style={{
                flex: 1, padding: '12px', borderRadius: 10,
                border: `1px solid ${theme.border}`, background: 'transparent',
                color: theme.textSec, fontSize: 14, fontWeight: 600,
                fontFamily: fontBody, cursor: 'pointer',
              }}>Cancel</button>
              <button
                onClick={() => remoteUnlock.mutate({ reason: unlockReason, memberName: unlockMemberName })}
                disabled={!unlockReason || remoteUnlock.isPending}
                style={{
                  flex: 1, padding: '12px', borderRadius: 10, border: 'none',
                  background: theme.text,
                  color: theme.bg === '#000000' ? '#000' : '#fff',
                  fontSize: 14, fontWeight: 700, fontFamily: fontBody,
                  cursor: (!unlockReason || remoteUnlock.isPending) ? 'not-allowed' : 'pointer',
                  opacity: (!unlockReason || remoteUnlock.isPending) ? 0.5 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                <Unlock size={14} />
                {remoteUnlock.isPending ? 'Unlocking...' : 'Unlock Door'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Keyframe for pulse dot */}
      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
