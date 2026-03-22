import { useState, useEffect, useRef, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { formatPaise, formatDate, formatTime } from '../../lib/utils'
import api from '../../lib/api'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'
import { Users, QrCode, IndianRupee, AlertTriangle, Plus, Mail, Link, ChevronRight, TrendingUp, TrendingDown, Activity, MessageCircle, ExternalLink, Zap, ShieldAlert, ShoppingBag, Clock, PieChart as PieChartIcon, BarChart2 } from 'lucide-react'
import Avatar from '../../components/ui/Avatar'
import Badge from '../../components/ui/Badge'
import { useNavigate } from 'react-router-dom'

const FONT = "'Inter', -apple-system, sans-serif"
const FONT_D = "'Inter', -apple-system, sans-serif"
const FONT_M = "'JetBrains Mono', 'Fira Code', monospace"

/* ─── Financial Heartbeat Cards Config ─── */
const HEARTBEAT_CARDS = [
  { key: 'netRevenue', label: 'NET REVENUE', subLabel: 'Current Month', icon: IndianRupee, colorKey: 'green' },
  { key: 'overdue', label: 'OVERDUE PAYMENTS', subLabel: 'Pending Collection', icon: AlertTriangle, colorKey: 'brandAccent', alert: true },
  { key: 'activeMembers', label: 'ACTIVE MEMBERSHIPS', subLabel: 'Currently Active', icon: Users, colorKey: 'textSec' },
  { key: 'ownerProfit', label: 'AFFILIATE + STORE', subLabel: "Owner's 10% Cut", icon: ShoppingBag, colorKey: 'cyan' },
]

function AnimatedItem({ delay = 0, children, style }) {
  return (
    <div style={{ opacity: 0, animation: `dashFadeInUp 0.45s ease-out ${delay}ms forwards`, ...style }}>
      {children}
    </div>
  )
}

function CountUpNumber({ value, format }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef(null)

  useEffect(() => {
    const num = typeof value === 'number' ? value : parseInt(String(value).replace(/[^\d]/g, ''), 10) || 0
    if (num === 0) { setDisplay(0); return }
    const duration = 1200
    const startTime = Date.now()
    const tick = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 4)
      setDisplay(Math.round(num * eased))
      if (progress < 1) ref.current = requestAnimationFrame(tick)
    }
    ref.current = requestAnimationFrame(tick)
    return () => ref.current && cancelAnimationFrame(ref.current)
  }, [value])

  if (format) return format(display)
  return display
}

/* ─── Financial Heartbeat Card ─── */
function HeartbeatCard({ config, value, subText, count, trend, delay, onClick, theme }) {
  const [hovered, setHovered] = useState(false)
  const Icon = config.icon
  const color = theme[config.colorKey] || theme.textSec
  const isAlert = config.alert && (count > 0 || (typeof value === 'number' && value > 0))
  const borderColor = isAlert ? theme.brandAccent : (hovered ? theme.borderStrong : theme.border)

  return (
    <div style={{ opacity: 0, animation: `statPop 0.5s ease-out ${delay}ms forwards` }}>
      <div
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: theme.bgSec,
          borderRadius: 14, padding: '22px 24px 18px',
          border: `1px solid ${borderColor}`,
          position: 'relative', overflow: 'hidden',
          transition: 'all 0.2s ease',
          transform: hovered ? 'translateY(-2px)' : 'none',
          cursor: onClick ? 'pointer' : 'default',
        }}
      >
        {/* Alert glow */}
        {isAlert && (
          <div style={{
            position: 'absolute', top: -40, right: -40,
            width: 100, height: 100, borderRadius: '50%',
            background: `${theme.brandAccent}08`,
            filter: 'blur(20px)',
          }} />
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{
              fontSize: 10, fontWeight: 600, color: isAlert ? theme.brandAccent : theme.textTer,
              letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0, fontFamily: FONT,
            }}>
              {config.label}
            </p>
            <p style={{
              fontSize: 30, fontWeight: 700, color: isAlert ? theme.brandAccent : theme.text,
              margin: '8px 0 0', lineHeight: 1, fontFamily: FONT, letterSpacing: '-0.02em',
            }}>
              {typeof value === 'string' ? value : <CountUpNumber value={value} />}
            </p>
          </div>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: isAlert ? `${theme.brandAccent}12` : theme.bgTer,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: isAlert ? theme.brandAccent : theme.textTer,
          }}>
            <Icon size={18} />
          </div>
        </div>

        {subText && (
          <p style={{
            fontSize: 12, color: theme.textTer, margin: '8px 0 0',
            fontFamily: FONT, fontWeight: 400,
          }}>
            {subText}
          </p>
        )}

        {count !== undefined && count > 0 && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10,
            background: `${theme.brandAccent}10`, padding: '4px 10px', borderRadius: 8,
          }}>
            <ShieldAlert size={12} style={{ color: theme.brandAccent }} />
            <span style={{
              fontSize: 11, fontWeight: 600, color: theme.brandAccent, fontFamily: FONT,
            }}>
              {count} overdue
            </span>
          </div>
        )}

        {trend !== undefined && !config.alert && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 10 }}>
            {trend >= 0
              ? <TrendingUp size={13} style={{ color: theme.green }} />
              : <TrendingDown size={13} style={{ color: theme.red }} />
            }
            <span style={{
              fontSize: 12, fontWeight: 500,
              color: trend >= 0 ? theme.green : theme.red,
              fontFamily: FONT,
            }}>
              {Math.abs(trend)}% vs last month
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── At-Risk Retention Table ─── */
function AtRiskTable({ gymId, theme, sp }) {
  const { data, isLoading } = useQuery({
    queryKey: ['at-risk-members', gymId],
    queryFn: () => api.get(`/gyms/${gymId}/members`, {
      params: { status: 'active', sort: 'last_checkin', limit: 20 }
    }).then((r) => r.data),
    enabled: !!gymId,
    refetchInterval: 120_000,
  })

  const atRisk = useMemo(() => {
    const members = data?.members || data || []
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    return members.filter(m => {
      if (!m.last_checkin_at && !m.last_check_in) return true
      const lastCheckin = new Date(m.last_checkin_at || m.last_check_in)
      return lastCheckin < sevenDaysAgo
    }).slice(0, 8)
  }, [data])

  const getDaysSince = (date) => {
    if (!date) return '—'
    const days = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24))
    return days
  }

  return (
    <div style={{
      background: theme.bgSec, borderRadius: 16, padding: sp(24),
      border: `1px solid ${theme.borderStrong}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: sp(18) }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%', background: theme.amber,
            boxShadow: `0 0 8px ${theme.amber}60`,
          }} />
          <h3 style={{
            fontSize: 14, fontWeight: 700, color: theme.text, margin: 0,
            fontFamily: FONT_D, textTransform: 'uppercase', letterSpacing: '1px',
          }}>
            At-Risk Members
          </h3>
        </div>
        <span style={{
          fontSize: 10, color: theme.amber, fontFamily: FONT_M,
          padding: '3px 8px', borderRadius: 6, background: `${theme.amber}12`,
          fontWeight: 600,
        }}>
          {atRisk.length} FLAGGED
        </span>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{
              height: 48, background: theme.bgTer, borderRadius: 10,
              animation: 'dashFadeInUp 1s ease-in-out infinite alternate',
            }} />
          ))}
        </div>
      ) : atRisk.length > 0 ? (
        <>
          {/* Table header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 100px 100px 90px',
            padding: '0 8px 10px', borderBottom: `1px solid ${theme.border}`,
            gap: 8,
          }}>
            {['Member', 'Last Visit', 'Days Absent', 'Action'].map(h => (
              <span key={h} style={{
                fontSize: 10, fontWeight: 600, color: theme.textTer,
                letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: FONT,
              }}>
                {h}
              </span>
            ))}
          </div>

          {/* Rows */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {atRisk.map((m, i) => {
              const lastDate = m.last_checkin_at || m.last_check_in
              const daysSince = getDaysSince(lastDate)
              const severity = daysSince === '—' ? 'high' : daysSince > 14 ? 'high' : 'medium'
              const sevColor = severity === 'high' ? theme.red : theme.amber

              return (
                <div key={m.id || i} style={{
                  display: 'grid', gridTemplateColumns: '1fr 100px 100px 90px',
                  padding: `${sp(10)}px 8px`, alignItems: 'center',
                  borderBottom: i < atRisk.length - 1 ? `1px solid ${theme.border}` : 'none',
                  gap: 8,
                }}>
                  {/* Member */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <Avatar name={m.name} src={m.photo_url} size={32} />
                    <div style={{ minWidth: 0 }}>
                      <p style={{
                        fontSize: 13, fontWeight: 500, color: theme.text, margin: 0,
                        fontFamily: FONT, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden',
                      }}>
                        {m.name}
                      </p>
                      <p style={{ fontSize: 11, color: theme.textTer, margin: 0, fontFamily: FONT }}>
                        {m.phone}
                      </p>
                    </div>
                  </div>

                  {/* Last Visit */}
                  <span style={{ fontSize: 12, color: theme.textSec, fontFamily: FONT_M }}>
                    {lastDate ? formatDate(lastDate) : 'Never'}
                  </span>

                  {/* Days Absent */}
                  <span style={{
                    fontSize: 12, fontWeight: 700, color: sevColor,
                    fontFamily: FONT_M,
                  }}>
                    {daysSince === '—' ? 'Never' : `${daysSince}d`}
                  </span>

                  {/* WhatsApp Nudge */}
                  <button
                    onClick={() => {
                      const phone = (m.phone || '').replace(/[^0-9]/g, '')
                      const msg = encodeURIComponent(`Hi ${m.name}! We haven't seen you at the gym in a while. Your fitness journey is waiting! Come back and let's crush those goals together 💪`)
                      window.open(`https://wa.me/${phone}?text=${msg}`, '_blank')
                    }}
                    className="whatsapp-nudge-btn"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 12px', borderRadius: 8,
                      background: 'rgba(37,211,102,0.08)', border: '1px solid rgba(37,211,102,0.2)',
                      color: '#25D366', cursor: 'pointer',
                      fontSize: 11, fontWeight: 600, fontFamily: FONT,
                      transition: 'all 0.15s ease', whiteSpace: 'nowrap',
                    }}
                  >
                    <MessageCircle size={13} />
                    Nudge
                  </button>
                </div>
              )
            })}
          </div>
        </>
      ) : (
        <div style={{
          padding: '40px 0', textAlign: 'center',
        }}>
          <Users size={28} style={{ color: theme.textTer, marginBottom: 10 }} />
          <p style={{ color: theme.textSec, fontSize: 13, margin: 0, fontFamily: FONT }}>
            All members are active!
          </p>
          <p style={{ color: theme.textTer, fontSize: 11, margin: '4px 0 0', fontFamily: FONT }}>
            No members have been absent for more than 7 days
          </p>
        </div>
      )}
    </div>
  )
}

/* ─── Peak Hour Heatmap ─── */
function PeakHourChart({ gymId, theme, sp }) {
  const { data: checkinData } = useQuery({
    queryKey: ['checkin-hours', gymId],
    queryFn: () => api.get(`/gyms/${gymId}/checkins`, {
      params: { limit: 200 }
    }).then((r) => r.data),
    enabled: !!gymId,
    refetchInterval: 300_000,
  })

  const hourlyData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      label: i === 0 ? '12a' : i < 12 ? `${i}a` : i === 12 ? '12p' : `${i - 12}p`,
      count: 0,
    }))

    const checkins = checkinData?.checkins || checkinData || []
    checkins.forEach(c => {
      const date = new Date(c.checked_in_at)
      const hour = date.getHours()
      if (hours[hour]) hours[hour].count++
    })

    // Filter to gym hours (5am - 11pm)
    return hours.filter(h => h.hour >= 5 && h.hour <= 22)
  }, [checkinData])

  const maxCount = Math.max(...hourlyData.map(h => h.count), 1)

  const getBarColor = (count) => {
    const ratio = count / maxCount
    if (ratio > 0.75) return theme.brandAccent
    if (ratio > 0.5) return theme.accent || theme.cyan
    if (ratio > 0.25) return theme.textTer
    return theme.border
  }

  const peakHour = hourlyData.reduce((max, h) => h.count > max.count ? h : max, hourlyData[0])

  return (
    <div style={{
      background: theme.bgSec, borderRadius: 16, padding: sp(24),
      border: `1px solid ${theme.borderStrong}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: sp(18) }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Clock size={16} style={{ color: theme.textSec }} />
          <h3 style={{
            fontSize: 14, fontWeight: 700, color: theme.text, margin: 0,
            fontFamily: FONT_D, textTransform: 'uppercase', letterSpacing: '1px',
          }}>
            Gym Traffic
          </h3>
        </div>
        {peakHour && peakHour.count > 0 && (
          <span style={{
            fontSize: 11, color: theme.textSec, fontFamily: FONT,
          }}>
            Peak: <span style={{ color: theme.brandAccent, fontWeight: 700 }}>{peakHour.label}</span>
          </span>
        )}
      </div>

      {/* Bar chart */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: 3, height: 100,
        padding: '0 4px',
      }}>
        {hourlyData.map(h => (
          <div key={h.hour} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          }}>
            <div style={{
              width: '100%', maxWidth: 28,
              height: Math.max((h.count / maxCount) * 80, 3),
              backgroundColor: getBarColor(h.count),
              borderRadius: 3,
              transition: 'height 0.3s ease, background-color 0.3s ease',
            }} />
          </div>
        ))}
      </div>

      {/* Labels */}
      <div style={{
        display: 'flex', gap: 3, marginTop: 6, padding: '0 4px',
      }}>
        {hourlyData.map((h, i) => (
          <div key={h.hour} style={{
            flex: 1, textAlign: 'center',
            fontSize: 9, color: theme.textTer, fontFamily: FONT_M,
            display: i % 2 === 0 ? 'block' : 'none',
          }}>
            {h.label}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16, marginTop: 14,
        paddingTop: 12, borderTop: `1px solid ${theme.border}`,
      }}>
        {[
          { label: 'Quiet', color: theme.border },
          { label: 'Moderate', color: theme.textTer },
          { label: 'Busy', color: theme.accent || theme.cyan },
          { label: 'Peak', color: theme.brandAccent },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: l.color }} />
            <span style={{ fontSize: 10, color: theme.textTer, fontFamily: FONT }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Live Activity Feed ─── */
function LiveActivityFeed({ gymId, theme, sp }) {
  const { data, isLoading } = useQuery({
    queryKey: ['live-checkins', gymId],
    queryFn: () => api.get(`/gyms/${gymId}/checkins`, { params: { limit: 10 } }).then((r) => r.data),
    enabled: !!gymId,
    refetchInterval: 10_000,
  })

  const checkins = data?.checkins ?? []
  const [prevIds, setPrevIds] = useState(new Set())
  const [flashIds, setFlashIds] = useState(new Set())

  useEffect(() => {
    if (checkins.length === 0) return
    const currentIds = new Set(checkins.map((c) => c.id))
    const newIds = new Set()
    currentIds.forEach((id) => { if (!prevIds.has(id)) newIds.add(id) })
    if (newIds.size > 0 && prevIds.size > 0) {
      setFlashIds(newIds)
      const timer = setTimeout(() => setFlashIds(new Set()), 2000)
      return () => clearTimeout(timer)
    }
    setPrevIds(currentIds)
  }, [checkins])

  useEffect(() => {
    if (checkins.length > 0) {
      setPrevIds(new Set(checkins.map((c) => c.id)))
    }
  }, [JSON.stringify(checkins.map((c) => c.id))])

  const methodColor = (method) => {
    if (method === 'qr') return theme.accent
    if (method === 'otp') return theme.green
    if (method === 'nfc') return theme.cyan
    return theme.textSec
  }

  const methodBg = (method) => {
    if (method === 'qr') return theme.accentSoft
    if (method === 'otp') return `${theme.green}15`
    if (method === 'nfc') return `${theme.cyan}15`
    return `${theme.textSec}12`
  }

  return (
    <div style={{
      background: theme.bgSec, borderRadius: 16, padding: sp(24),
      border: `1px solid ${theme.borderStrong}`, height: '100%',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: sp(18) }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%', background: theme.green,
            boxShadow: `0 0 8px ${theme.green}60`,
            animation: 'livePulse 2s ease-in-out infinite',
          }} />
          <h3 style={{
            fontSize: 14, fontWeight: 700, color: theme.text, margin: 0,
            fontFamily: FONT_D, textTransform: 'uppercase', letterSpacing: '1px',
          }}>
            Live Activity
          </h3>
        </div>
        <span style={{
          fontSize: 10, color: theme.textTer, fontFamily: FONT_M,
          padding: '3px 8px', borderRadius: 6, background: theme.bgTer,
        }}>
          LIVE
        </span>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={{
              height: 52, background: theme.bgTer, borderRadius: 10,
              animation: 'dashFadeInUp 1s ease-in-out infinite alternate',
            }} />
          ))}
        </div>
      ) : checkins.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {checkins.map((c, i) => {
            const isNew = flashIds.has(c.id)
            return (
              <div key={c.id || i} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: `${sp(10)}px ${sp(8)}px`,
                borderRadius: 10,
                background: isNew ? `${theme.green}08` : 'transparent',
                borderLeft: isNew ? `3px solid ${theme.green}` : '3px solid transparent',
                transition: 'all 0.4s ease',
                animation: isNew ? 'feedFlash 0.5s ease-out' : undefined,
              }}>
                <Avatar name={c.member_name} src={c.member_photo} size={34} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 600, color: theme.text,
                    fontFamily: FONT, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden',
                  }}>
                    {c.member_name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                      padding: '2px 7px', borderRadius: 6,
                      background: methodBg(c.method),
                      color: methodColor(c.method),
                      fontFamily: FONT_M, letterSpacing: '0.5px',
                    }}>
                      {c.method || 'manual'}
                    </span>
                  </div>
                </div>
                <span style={{
                  fontSize: 11, color: theme.textTer, fontFamily: FONT_M,
                  whiteSpace: 'nowrap', flexShrink: 0,
                }}>
                  {formatTime(c.checked_in_at)}
                </span>
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ padding: '40px 0', textAlign: 'center' }}>
          <Zap size={28} style={{ color: theme.textTer, marginBottom: 10 }} />
          <p style={{ color: theme.textSec, fontSize: 13, margin: 0, fontFamily: FONT }}>
            No check-ins yet today
          </p>
          <p style={{ color: theme.textTer, fontSize: 11, margin: '4px 0 0', fontFamily: FONT }}>
            Activity will appear here in real-time
          </p>
        </div>
      )}
    </div>
  )
}

function ActivityTicker({ checkins, theme }) {
  if (!checkins || checkins.length === 0) return null
  const items = [...checkins, ...checkins]

  return (
    <div style={{
      overflow: 'hidden', borderRadius: 12,
      background: theme.bgSec,
      border: `1px solid ${theme.border}`,
      padding: '10px 0', marginBottom: 24,
    }}>
      <div style={{
        display: 'flex', gap: 32, whiteSpace: 'nowrap',
        animation: `tickerScroll ${checkins.length * 4}s linear infinite`,
        width: 'max-content',
      }}>
        {items.map((c, i) => (
          <div key={i} style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            fontSize: 13, color: theme.textSec, fontFamily: FONT,
          }}>
            <Activity size={13} style={{ color: theme.green, flexShrink: 0 }} />
            <span style={{ color: theme.text, fontWeight: 600 }}>{c.member_name}</span>
            <span>checked in via</span>
            <Badge color={c.method === 'qr' ? 'primary' : c.method === 'otp' ? 'success' : 'neutral'}>
              {c.method || 'manual'}
            </Badge>
            <span style={{ color: theme.textTer, fontFamily: FONT_M, fontSize: 11 }}>
              {formatTime(c.checked_in_at)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function GlassCard({ children, style, theme, ...props }) {
  return (
    <div style={{
      background: theme.bgSec,
      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      borderRadius: 16, padding: 24,
      border: `1px solid ${theme.borderStrong}`,
      ...style,
    }} {...props}>
      {children}
    </div>
  )
}

function CustomTooltip({ active, payload, label, theme }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: theme?.bgSec || 'rgba(18,18,26,0.95)', backdropFilter: 'blur(12px)',
      border: `1px solid ${theme?.border || 'rgba(255,255,255,0.06)'}`, borderRadius: 10,
      padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
    }}>
      <p style={{ color: theme?.textTer || '#8B8BA3', fontSize: 11, margin: 0, fontFamily: FONT_M }}>{label}</p>
      <p style={{ color: theme?.text || '#F0F0F5', fontSize: 18, fontWeight: 700, margin: '4px 0 0', fontFamily: FONT_D }}>
        {payload[0].value} check-ins
      </p>
    </div>
  )
}

function ActionCard({ icon: Icon, label, onClick, delay, theme }) {
  const [hovered, setHovered] = useState(false)
  return (
    <AnimatedItem delay={delay}>
      <div
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: theme.bgSec,
          backdropFilter: 'blur(12px)', borderRadius: 14,
          padding: '18px 22px',
          border: `1px solid ${hovered ? `${theme.accent}30` : theme.borderStrong}`,
          cursor: 'pointer', transition: 'all 0.25s ease',
          transform: hovered ? 'translateY(-2px)' : 'none',
          boxShadow: hovered ? `0 8px 24px ${theme.accent}15` : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: theme.accentSoft,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.accent,
          }}>
            <Icon size={18} />
          </div>
          <span style={{ fontSize: 14, fontWeight: 600, color: theme.text, fontFamily: FONT }}>
            {label}
          </span>
        </div>
        <ChevronRight size={16} style={{
          color: theme.textTer, transition: 'transform 0.2s, color 0.2s',
          transform: hovered ? 'translateX(3px)' : 'none',
        }} />
      </div>
    </AnimatedItem>
  )
}

/* ─── Revenue Breakdown Widget ─── */
const SOURCE_LABELS = {
  membership: 'Memberships',
  class_booking: 'Class Bookings',
  affiliate: 'Affiliate',
  store: 'Store',
  ad_revenue: 'Ad Revenue',
}
const SOURCE_COLORS = {
  membership: '#22C55E',
  class_booking: '#3B82F6',
  affiliate: '#1A3A8F',
  store: '#F59E0B',
  ad_revenue: '#06B6D4',
}

function RevenueSummaryWidget({ gymId, theme, sp }) {
  const [period, setPeriod] = useState('month')
  const { data, isLoading } = useQuery({
    queryKey: ['revenue-summary', gymId, period],
    queryFn: () => api.get(`/gyms/${gymId}/revenue/summary`, { params: { period } }).then(r => r.data),
    enabled: !!gymId,
    refetchInterval: 120_000,
  })

  const bySource = data?.bySource || {}
  const total = data?.total || 0
  const trendPct = data?.trendPct

  const pieData = Object.entries(bySource)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({ name: SOURCE_LABELS[key] || key, value, color: SOURCE_COLORS[key] || '#6B7280' }))

  return (
    <div style={{
      background: theme.bgSec, borderRadius: 16, padding: sp(24),
      border: `1px solid ${theme.borderStrong}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: sp(18) }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <PieChartIcon size={16} style={{ color: theme.textSec }} />
          <h3 style={{
            fontSize: 14, fontWeight: 700, color: theme.text, margin: 0,
            fontFamily: FONT_D, textTransform: 'uppercase', letterSpacing: '1px',
          }}>
            Revenue Breakdown
          </h3>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {['today', 'week', 'month'].map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              fontSize: 10, fontWeight: 600, fontFamily: FONT_M,
              padding: '3px 8px', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: period === p ? `${theme.accent}20` : theme.bgTer,
              color: period === p ? theme.accent : theme.textTer,
              transition: 'all 0.15s ease',
            }}>
              {p.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: theme.textSec, fontSize: 13 }}>Loading...</span>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          {/* Mini donut */}
          <div style={{ width: 120, height: 120, flexShrink: 0 }}>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={32} outerRadius={52} paddingAngle={3} dataKey="value" stroke="none">
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{
                width: 120, height: 120, borderRadius: '50%', border: `3px solid ${theme.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: theme.textTer, fontSize: 12, fontFamily: FONT,
              }}>No data</div>
            )}
          </div>

          {/* Breakdown list */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ marginBottom: 4 }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: theme.text, fontFamily: FONT_D }}>
                {formatPaise(total)}
              </span>
              {trendPct !== undefined && trendPct !== null && (
                <span style={{
                  fontSize: 12, fontWeight: 500, marginLeft: 8,
                  color: trendPct >= 0 ? theme.green : theme.red,
                  fontFamily: FONT,
                }}>
                  {trendPct >= 0 ? '+' : ''}{trendPct}%
                </span>
              )}
            </div>
            {Object.entries(bySource).filter(([, v]) => v > 0).map(([key, value]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: SOURCE_COLORS[key] || '#6B7280', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: theme.textSec, fontFamily: FONT, flex: 1 }}>
                  {SOURCE_LABELS[key] || key}
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: theme.text, fontFamily: FONT_M }}>
                  {formatPaise(value)}
                </span>
              </div>
            ))}
            {Object.values(bySource).every(v => !v) && (
              <span style={{ fontSize: 12, color: theme.textTer, fontFamily: FONT }}>
                No revenue recorded this {period}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Ad Revenue Chart ─── */
function AdRevenueChart({ gymId, theme, sp }) {
  const { data, isLoading } = useQuery({
    queryKey: ['ad-analytics', gymId],
    queryFn: () => api.get(`/gyms/${gymId}/ads/analytics`, { params: { days: 30 } }).then(r => r.data),
    enabled: !!gymId,
    refetchInterval: 300_000,
  })

  const campaigns = data?.campaigns || []
  const daily = data?.daily || []
  const totalImpressions = campaigns.reduce((s, c) => s + (c.impressions || 0), 0)
  const totalClicks = campaigns.reduce((s, c) => s + (c.clicks || 0), 0)
  const avgCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : '0.0'

  return (
    <div style={{
      background: theme.bgSec, borderRadius: 16, padding: sp(24),
      border: `1px solid ${theme.borderStrong}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: sp(18) }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BarChart2 size={16} style={{ color: theme.textSec }} />
          <h3 style={{
            fontSize: 14, fontWeight: 700, color: theme.text, margin: 0,
            fontFamily: FONT_D, textTransform: 'uppercase', letterSpacing: '1px',
          }}>
            Ad Performance
          </h3>
        </div>
        <span style={{ fontSize: 10, color: theme.textTer, fontFamily: FONT_M, padding: '3px 8px', borderRadius: 6, background: theme.bgTer }}>
          30 DAYS
        </span>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 16, marginBottom: sp(18) }}>
        {[
          { label: 'Impressions', value: totalImpressions.toLocaleString(), color: theme.cyan },
          { label: 'Clicks', value: totalClicks.toLocaleString(), color: theme.accent },
          { label: 'CTR', value: `${avgCtr}%`, color: theme.green },
        ].map(s => (
          <div key={s.label} style={{
            flex: 1, background: theme.bgTer, borderRadius: 10, padding: '10px 14px',
          }}>
            <p style={{ fontSize: 10, color: theme.textTer, margin: 0, fontFamily: FONT, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {s.label}
            </p>
            <p style={{ fontSize: 18, fontWeight: 700, color: s.color, margin: '4px 0 0', fontFamily: FONT_M }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: theme.textSec, fontSize: 13 }}>Loading...</span>
        </div>
      ) : daily.length > 0 ? (
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={daily}>
            <XAxis dataKey="date" axisLine={false} tickLine={false}
              tick={{ fontSize: 10, fill: theme.textTer, fontFamily: FONT_M }}
              tickFormatter={(v) => { const d = new Date(v); return `${d.getDate()}/${d.getMonth()+1}` }}
              interval={Math.max(Math.floor(daily.length / 7), 0)}
            />
            <YAxis axisLine={false} tickLine={false} allowDecimals={false}
              tick={{ fontSize: 10, fill: theme.textTer, fontFamily: FONT_M }}
            />
            <Tooltip
              contentStyle={{
                background: theme.bgSec, border: `1px solid ${theme.border}`,
                borderRadius: 8, fontSize: 11, fontFamily: FONT_M,
              }}
            />
            <Bar dataKey="impressions" fill={`${theme.cyan}60`} radius={[3, 3, 0, 0]} name="Impressions" />
            <Bar dataKey="clicks" fill={theme.accent} radius={[3, 3, 0, 0]} name="Clicks" />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div style={{
          height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: theme.textTer, fontSize: 13, fontFamily: FONT,
        }}>
          No ad data yet
        </div>
      )}
    </div>
  )
}

export default function Home() {
  const { gym } = useAuth()
  const { theme, sp } = useTheme()
  const navigate = useNavigate()
  const gymId = gym?.id

  const { data: stats, isLoading } = useQuery({
    queryKey: ['gym-stats', gymId],
    queryFn: () => api.get(`/gyms/${gymId}/stats`).then((r) => r.data),
    enabled: !!gymId,
    refetchInterval: 60_000,
  })

  const { data: affiliate } = useQuery({
    queryKey: ['affiliate-earnings', gymId],
    queryFn: () => api.get(`/gyms/${gymId}/affiliate/earnings`).then((r) => r.data),
    enabled: !!gymId,
    retry: false,
  })

  const ownerName = gym?.owner_name || gym?.name || 'there'
  const gymName = gym?.gym_name || gym?.name || ''

  const todayCheckins = stats?.todayCheckins ?? 0
  const activeMembers = stats?.activeMembers ?? 0
  const monthRevenue = stats?.monthRevenue ?? 0
  const expiringSoon = stats?.expiringSoon ?? []
  const recentCheckins = stats?.recentCheckins ?? []
  const weeklyCheckins = stats?.weeklyCheckins ?? []
  const overdueCount = stats?.overdueCount ?? 0
  const overdueValue = stats?.overdueValue ?? 0
  const ownerProfit = (affiliate?.totalEarnings ?? 0) + (stats?.storeProfit ?? 0)

  const heartbeatValues = [
    {
      config: HEARTBEAT_CARDS[0],
      value: formatPaise(monthRevenue),
      subText: `Today: ${formatPaise(stats?.todayRevenue ?? 0)}`,
      trend: stats?.revenueTrend,
      onClick: () => navigate('/dashboard/payments'),
    },
    {
      config: HEARTBEAT_CARDS[1],
      value: formatPaise(overdueValue),
      count: overdueCount,
      subText: overdueCount > 0 ? `${overdueCount} payments pending` : 'All payments collected',
      onClick: () => navigate('/dashboard/payments?status=overdue'),
    },
    {
      config: HEARTBEAT_CARDS[2],
      value: activeMembers,
      subText: `${stats?.totalMembers ?? 0} total members`,
      trend: stats?.memberTrend,
      onClick: () => navigate('/dashboard/members?status=active'),
    },
    {
      config: HEARTBEAT_CARDS[3],
      value: formatPaise(ownerProfit),
      subText: affiliate?.pendingPayout > 0 ? `${formatPaise(affiliate.pendingPayout)} pending` : 'Affiliate + Store earnings',
      onClick: () => navigate('/dashboard/affiliate'),
    },
  ]

  const CSS = `
@keyframes dashFadeInUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes tickerScroll {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
@keyframes statPop {
  0% { opacity: 0; transform: scale(0.8) translateY(8px); }
  60% { transform: scale(1.05) translateY(-2px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes livePulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.3); }
}
@keyframes feedFlash {
  0% { opacity: 0; transform: translateX(-8px); }
  100% { opacity: 1; transform: translateX(0); }
}
.dash-container {
  max-width: 1200px; margin: 0 auto; padding: ${sp(32)}px ${sp(24)}px;
}
.dash-heartbeat-grid {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: ${sp(16)}px;
}
.dash-two-col {
  display: grid; grid-template-columns: 1fr 1fr; gap: ${sp(20)}px;
}
.dash-two-col-wide {
  display: grid; grid-template-columns: 2fr 1fr; gap: ${sp(20)}px;
}
.dash-actions-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: ${sp(14)}px;
}
.whatsapp-nudge-btn:hover {
  background: rgba(37,211,102,0.18) !important;
  border-color: rgba(37,211,102,0.4) !important;
}
@media (max-width: 1024px) {
  .dash-heartbeat-grid { grid-template-columns: repeat(2, 1fr); }
  .dash-two-col, .dash-two-col-wide { grid-template-columns: 1fr; }
  .dash-actions-grid { grid-template-columns: 1fr; }
}
@media (max-width: 640px) {
  .dash-heartbeat-grid { grid-template-columns: 1fr; }
  .dash-container { padding: 20px 16px; }
}
`

  return (
    <div style={{ minHeight: '100vh', background: theme.bg }}>
      <style>{CSS}</style>
      <div className="dash-container">

        {/* Header */}
        <AnimatedItem delay={0} style={{ marginBottom: 8 }}>
          <h1 style={{
            fontSize: 32, fontWeight: 800, color: theme.text, margin: 0, lineHeight: 1.1,
            fontFamily: FONT_D, textTransform: 'uppercase', letterSpacing: '-0.01em',
          }}>
            Welcome back, {ownerName}
          </h1>
          {gymName && (
            <p style={{
              fontSize: 14, color: theme.textTer, margin: '4px 0 0',
              fontFamily: FONT, fontWeight: 500,
            }}>
              {gymName}
            </p>
          )}
        </AnimatedItem>

        {/* Activity Ticker */}
        <AnimatedItem delay={100} style={{ marginTop: 20 }}>
          <ActivityTicker checkins={recentCheckins} theme={theme} />
        </AnimatedItem>

        {/* Financial Heartbeat Cards */}
        <div className="dash-heartbeat-grid" style={{ marginBottom: sp(28) }}>
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <AnimatedItem key={i} delay={i * 50}>
                <GlassCard theme={theme}>
                  <div style={{
                    height: 80, background: theme.bgTer, borderRadius: 8,
                    animation: 'dashFadeInUp 1s ease-in-out infinite alternate',
                  }} />
                </GlassCard>
              </AnimatedItem>
            ))
          ) : (
            heartbeatValues.map((s, i) => (
              <HeartbeatCard
                key={s.config.key}
                config={s.config}
                value={s.value}
                subText={s.subText}
                count={s.count}
                trend={s.trend}
                delay={200 + i * 80}
                onClick={s.onClick}
                theme={theme}
              />
            ))
          )}
        </div>

        {/* At-Risk + Peak Hour */}
        <div className="dash-two-col-wide" style={{ marginBottom: sp(28) }}>
          <AnimatedItem delay={560}>
            <AtRiskTable gymId={gymId} theme={theme} sp={sp} />
          </AnimatedItem>
          <AnimatedItem delay={620}>
            <PeakHourChart gymId={gymId} theme={theme} sp={sp} />
          </AnimatedItem>
        </div>

        {/* Weekly Check-in Chart + Live Feed */}
        <div className="dash-two-col" style={{ marginBottom: sp(28) }}>
          {/* Weekly Check-ins */}
          <AnimatedItem delay={680}>
            <GlassCard theme={theme} style={{ height: '100%' }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20,
              }}>
                <h3 style={{
                  fontSize: 14, fontWeight: 700, color: theme.text, margin: 0,
                  fontFamily: FONT_D, textTransform: 'uppercase', letterSpacing: '1px',
                }}>
                  Weekly Check-ins
                </h3>
                <span style={{ fontSize: 11, color: theme.textTer, fontFamily: FONT_M }}>
                  Last 7 days
                </span>
              </div>
              {isLoading ? (
                <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: theme.textSec, fontSize: 14 }}>Loading...</span>
                </div>
              ) : weeklyCheckins.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={weeklyCheckins}>
                    <defs>
                      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={theme.accent} stopOpacity={0.4} />
                        <stop offset="100%" stopColor={theme.accent} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="day" axisLine={false} tickLine={false}
                      tick={{ fontSize: 11, fill: theme.textTer, fontFamily: FONT_M }}
                    />
                    <YAxis
                      axisLine={false} tickLine={false} allowDecimals={false}
                      tick={{ fontSize: 11, fill: theme.textTer, fontFamily: FONT_M }}
                    />
                    <Tooltip content={<CustomTooltip theme={theme} />} cursor={{ stroke: `${theme.accent}30`, strokeWidth: 1 }} />
                    <Area
                      type="monotone" dataKey="count"
                      stroke={theme.accent} strokeWidth={2.5}
                      fill="url(#areaGrad)" dot={false}
                      activeDot={{ r: 5, fill: theme.accent, stroke: theme.bg, strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div style={{
                  height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: theme.textSec, fontSize: 14, fontFamily: FONT,
                }}>
                  No check-in data this week
                </div>
              )}
            </GlassCard>
          </AnimatedItem>

          {/* Live Activity Feed */}
          <AnimatedItem delay={740}>
            <LiveActivityFeed gymId={gymId} theme={theme} sp={sp} />
          </AnimatedItem>
        </div>

        {/* Revenue Breakdown + Ad Performance */}
        <div className="dash-two-col" style={{ marginBottom: sp(28) }}>
          <AnimatedItem delay={800}>
            <RevenueSummaryWidget gymId={gymId} theme={theme} sp={sp} />
          </AnimatedItem>
          <AnimatedItem delay={860}>
            <AdRevenueChart gymId={gymId} theme={theme} sp={sp} />
          </AnimatedItem>
        </div>

        {/* Quick Actions */}
        <div className="dash-actions-grid" style={{ marginBottom: sp(32) }}>
          <ActionCard icon={Plus} label="Add Member" onClick={() => navigate('/dashboard/members')} delay={920} theme={theme} />
          <ActionCard icon={Mail} label="Send Newsletter" onClick={() => navigate('/dashboard/newsletter')} delay={980} theme={theme} />
          <ActionCard icon={Link} label={
            affiliate?.pendingPayout > 0
              ? `Affiliate (${formatPaise(affiliate.pendingPayout)})`
              : 'Affiliate Dashboard'
          } onClick={() => navigate('/dashboard/affiliate')} delay={920} theme={theme} />
        </div>

      </div>
    </div>
  )
}
