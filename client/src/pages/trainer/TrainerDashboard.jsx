import { useState, useEffect } from 'react'
import { Clock, User, CheckCircle, XCircle, AlertCircle, MessageCircle, IndianRupee, CalendarDays } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import api from '../../lib/api'

const FONT = "'Inter', -apple-system, sans-serif"
const FONT_M = "'JetBrains Mono', monospace"

export default function TrainerDashboard() {
  const { theme } = useTheme()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const token = localStorage.getItem('ivira_trainer_token')
        const { data } = await api.get('/trainer/sessions', {
          headers: { Authorization: `Bearer ${token}` }
        })
        setSessions(Array.isArray(data) ? data : [])
      } catch { setSessions([]) }
      finally { setLoading(false) }
    }
    fetchSessions()
  }, [])

  // Demo data for preview
  const demoSessions = sessions.length ? sessions : [
    { id: 1, member_name: 'Arjun Mehta', start_time: '06:30', end_time: '07:30', session_type: 'pt', status: 'completed', member_phone: '+919876543210' },
    { id: 2, member_name: 'Priya Sharma', start_time: '08:00', end_time: '09:00', session_type: 'pt', status: 'scheduled', member_phone: '+919876543211' },
    { id: 3, member_name: 'Vikram Singh', start_time: '10:00', end_time: '11:00', session_type: 'assessment', status: 'scheduled', member_phone: '+919876543212' },
    { id: 4, member_name: 'Ananya Patel', start_time: '16:00', end_time: '17:00', session_type: 'pt', status: 'scheduled', member_phone: '+919876543213' },
    { id: 5, member_name: 'Rahul Joshi', start_time: '18:00', end_time: '19:00', session_type: 'group', status: 'scheduled', member_phone: '+919876543214' },
  ]

  const statusIcon = (s) => {
    if (s === 'completed') return <CheckCircle size={16} color={theme.green} />
    if (s === 'cancelled' || s === 'no_show') return <XCircle size={16} color={theme.red} />
    return <AlertCircle size={16} color={theme.brandAccent} />
  }

  const now = new Date()
  const currentHour = now.getHours()
  const nextIdx = demoSessions.findIndex(s => {
    const [h] = s.start_time.split(':').map(Number)
    return h > currentHour && s.status === 'scheduled'
  })

  const stats = [
    { label: 'Today\'s Sessions', value: demoSessions.length, icon: CalendarDays, color: theme.brandAccent },
    { label: 'Completed', value: demoSessions.filter(s => s.status === 'completed').length, icon: CheckCircle, color: theme.green },
    { label: 'Remaining', value: demoSessions.filter(s => s.status === 'scheduled').length, icon: Clock, color: theme.amber || '#F59E0B' },
  ]

  return (
    <div style={{ fontFamily: FONT }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: theme.text, margin: '0 0 4px' }}>Today</h1>
      <p style={{ fontSize: 14, color: theme.textSec, margin: '0 0 24px' }}>
        {now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
      </p>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
        {stats.map((s, i) => (
          <div key={i} style={{
            background: theme.cardBg || theme.bgSec, borderRadius: 14, padding: 20,
            border: `1px solid ${theme.border}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <s.icon size={16} color={s.color} />
              <span style={{ fontSize: 12, color: theme.textSec }}>{s.label}</span>
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, color: theme.text, fontFamily: FONT_M }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Session Timeline */}
      <h2 style={{ fontSize: 16, fontWeight: 600, color: theme.text, marginBottom: 16 }}>Session Timeline</h2>
      <div style={{ position: 'relative', paddingLeft: 28 }}>
        {/* Timeline line */}
        <div style={{
          position: 'absolute', left: 8, top: 0, bottom: 0, width: 2,
          background: theme.border, borderRadius: 1,
        }} />

        {demoSessions.map((s, i) => {
          const isNext = i === nextIdx
          return (
            <div key={s.id || i} style={{
              position: 'relative', marginBottom: 16,
              background: theme.cardBg || theme.bgSec,
              borderRadius: 14, padding: '16px 20px',
              border: `1px solid ${isNext ? theme.brandAccent + '60' : theme.border}`,
              borderLeft: isNext ? `3px solid ${theme.brandAccent}` : `1px solid ${theme.border}`,
              boxShadow: isNext ? `0 0 20px rgba(26,58,143,0.15)` : 'none',
              minHeight: 48,
            }}>
              {/* Timeline dot */}
              <div style={{
                position: 'absolute', left: -24, top: 20,
                width: 12, height: 12, borderRadius: '50%',
                background: s.status === 'completed' ? theme.green : isNext ? theme.brandAccent : theme.border,
                border: `2px solid ${theme.bg}`,
              }} />

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {statusIcon(s.status)}
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: theme.text }}>{s.member_name}</div>
                    <div style={{ fontSize: 12, color: theme.textSec, marginTop: 2 }}>
                      {s.start_time} — {s.end_time} | {s.session_type.toUpperCase()}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {s.member_phone && (
                    <a
                      href={`https://wa.me/${s.member_phone.replace('+', '')}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: 40, height: 40, borderRadius: 10,
                        background: '#25D36620', border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <MessageCircle size={16} color="#25D366" />
                    </a>
                  )}
                </div>
              </div>

              {isNext && (
                <div style={{
                  marginTop: 8, fontSize: 11, fontWeight: 600,
                  color: theme.brandAccent, textTransform: 'uppercase', letterSpacing: '0.5px',
                }}>
                  Up Next
                </div>
              )}
            </div>
          )
        })}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{
              height: 72, borderRadius: 14, marginBottom: 12,
              background: theme.bgSec, animation: 'pulse 1.5s ease-in-out infinite',
            }} />
          ))}
        </div>
      )}
    </div>
  )
}
