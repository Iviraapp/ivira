import { useState, useEffect } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Clock, User, CheckCircle, XCircle, AlertCircle, MessageCircle, Plus } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import api from '../../lib/api'

const FONT = "'Inter', -apple-system, sans-serif"

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HOURS = Array.from({ length: 14 }, (_, i) => i + 6) // 6 AM – 7 PM

function getWeekDates(offset = 0) {
  const now = new Date()
  const day = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offset * 7)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function formatHour(h) {
  if (h === 0) return '12 AM'
  if (h < 12) return `${h} AM`
  if (h === 12) return '12 PM'
  return `${h - 12} PM`
}

const SESSION_COLORS = {
  pt: { bg: '#10B98118', border: '#10B981', text: '#10B981' },
  assessment: { bg: '#6366F118', border: '#6366F1', text: '#6366F1' },
  group: { bg: '#F59E0B18', border: '#F59E0B', text: '#F59E0B' },
  online: { bg: '#38BDF818', border: '#38BDF8', text: '#38BDF8' },
}

function AssignWorkoutSheet({ session, onClose, onDone, token, theme }) {
  const [form, setForm] = useState({
    title: `${session?.session_type?.toUpperCase() || 'Workout'} Plan`,
    description: '',
    exercises: '',
    scheduled_date: session?.date || '',
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const accent = '#10B981'

  async function handleSubmit() {
    if (!form.title.trim()) return
    setLoading(true)
    try {
      // Parse exercises from newline-separated text into array
      const exerciseList = form.exercises
        ? form.exercises.split('\n').filter(Boolean).map(line => {
            const [name, ...rest] = line.split('-')
            return { exercise_name: name.trim(), notes: rest.join('-').trim() }
          })
        : []

      await import('../../lib/api').then(({ default: apiModule }) =>
        apiModule.post(`/trainer/clients/${session.member_id}/assigned-workouts`, {
          title: form.title,
          description: form.description || null,
          exercises: exerciseList,
          scheduled_date: form.scheduled_date || null,
          notes: form.notes || null,
        }, {
          headers: { Authorization: `Bearer ${token}` }
        })
      )
      setDone(true)
      setTimeout(onDone, 1500)
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to assign workout')
    } finally {
      setLoading(false)
    }
  }

  if (done) return (
    <div style={{ padding: 32, textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
      <p style={{ color: accent, fontWeight: 700, fontFamily: FONT }}>Workout assigned!</p>
      <p style={{ color: theme.textSec, fontSize: 13, fontFamily: FONT }}>Member will receive a push notification</p>
    </div>
  )

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontWeight: 700, fontSize: 16, color: theme.text, fontFamily: FONT }}>Assign Workout</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: theme.textSec, fontSize: 20, cursor: 'pointer' }}>×</button>
      </div>
      <p style={{ fontSize: 12, color: theme.textSec, marginBottom: 16, fontFamily: FONT }}>
        For: {session?.member_name}
      </p>

      {[
        { key: 'title', label: 'Workout Title *', placeholder: 'e.g. Push Day A', type: 'text' },
        { key: 'description', label: 'Description', placeholder: 'Brief overview...', type: 'text' },
        { key: 'scheduled_date', label: 'Scheduled Date', placeholder: '', type: 'date' },
        { key: 'notes', label: 'Notes for member', placeholder: 'Focus on form, increase weight if...', type: 'text' },
      ].map(({ key, label, placeholder, type }) => (
        <div key={key} style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: theme.textSec, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: FONT }}>
            {label}
          </label>
          <input
            type={type}
            value={form[key]}
            onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
            placeholder={placeholder}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 8, marginTop: 4,
              background: theme.cardBg || theme.bgSec, border: `1px solid ${theme.border}`,
              color: theme.text, fontSize: 14, fontFamily: FONT, boxSizing: 'border-box',
              outline: 'none',
            }}
          />
        </div>
      ))}

      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: theme.textSec, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: FONT }}>
          Exercises (one per line, e.g. "Bench Press - 4x8")
        </label>
        <textarea
          value={form.exercises}
          onChange={e => setForm(f => ({ ...f, exercises: e.target.value }))}
          placeholder={'Bench Press - 4×8 @ 70kg\nIncline Dumbbell - 3×12\nCable Fly - 3×15'}
          rows={4}
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 8, marginTop: 4,
            background: theme.cardBg || theme.bgSec, border: `1px solid ${theme.border}`,
            color: theme.text, fontSize: 13, fontFamily: FONT, boxSizing: 'border-box',
            resize: 'vertical', outline: 'none',
          }}
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading || !form.title.trim()}
        style={{
          width: '100%', padding: '12px 0', borderRadius: 10,
          background: loading ? theme.border : accent,
          border: 'none', color: '#fff', fontSize: 14, fontWeight: 700,
          cursor: loading ? 'not-allowed' : 'pointer', fontFamily: FONT,
        }}
      >
        {loading ? 'Assigning...' : 'Assign Workout 💪'}
      </button>
    </div>
  )
}

export default function TrainerSchedule() {
  const { theme } = useTheme()
  const [weekOffset, setWeekOffset] = useState(0)
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [view, setView] = useState('week') // 'week' | 'day'
  const [assignSheet, setAssignSheet] = useState(false)
  const [assignForm, setAssignForm] = useState({ title: '', description: '', exercises: '', scheduled_date: '', notes: '' })
  const [assigning, setAssigning] = useState(false)
  const [assignDone, setAssignDone] = useState(false)

  const weekDates = getWeekDates(weekOffset)
  const today = new Date()

  const accent = '#10B981'

  useEffect(() => {
    const fetchSessions = async () => {
      setLoading(true)
      try {
        const token = localStorage.getItem('ivira_trainer_token')
        const { data } = await api.get('/trainer/sessions', {
          headers: { Authorization: `Bearer ${token}` }
        })
        setSessions(Array.isArray(data) ? data : [])
      } catch {
        // Use demo data
        setSessions([
          { id: 1, member_name: 'Arjun Mehta', date: weekDates[0].toISOString().split('T')[0], start_time: '06:30', end_time: '07:30', session_type: 'pt', status: 'completed', member_phone: '+919876543210' },
          { id: 2, member_name: 'Priya Sharma', date: weekDates[0].toISOString().split('T')[0], start_time: '08:00', end_time: '09:00', session_type: 'pt', status: 'scheduled', member_phone: '+919876543211' },
          { id: 3, member_name: 'Vikram Singh', date: weekDates[1].toISOString().split('T')[0], start_time: '10:00', end_time: '11:00', session_type: 'assessment', status: 'scheduled', member_phone: '+919876543212' },
          { id: 4, member_name: 'Ananya Patel', date: weekDates[2].toISOString().split('T')[0], start_time: '07:00', end_time: '08:00', session_type: 'pt', status: 'scheduled', member_phone: '+919876543213' },
          { id: 5, member_name: 'Rahul Joshi', date: weekDates[2].toISOString().split('T')[0], start_time: '18:00', end_time: '19:00', session_type: 'group', status: 'scheduled', member_phone: '+919876543214' },
          { id: 6, member_name: 'Kavita Nair', date: weekDates[3].toISOString().split('T')[0], start_time: '09:00', end_time: '10:00', session_type: 'online', status: 'scheduled', member_phone: '+919876543215' },
          { id: 7, member_name: 'Siddharth Rao', date: weekDates[4].toISOString().split('T')[0], start_time: '17:00', end_time: '18:00', session_type: 'pt', status: 'scheduled', member_phone: '+919876543216' },
        ])
      }
      setLoading(false)
    }
    fetchSessions()
  }, [weekOffset])

  const getSessionsForSlot = (date, hour) => {
    const dateStr = date.toISOString().split('T')[0]
    return sessions.filter(s => {
      if (s.date !== dateStr) return false
      const [h] = s.start_time.split(':').map(Number)
      return h === hour
    })
  }

  const statusIcon = (s) => {
    if (s === 'completed') return <CheckCircle size={12} color={theme.green} />
    if (s === 'cancelled' || s === 'no_show') return <XCircle size={12} color={theme.red} />
    return <AlertCircle size={12} color={theme.brandAccent} />
  }

  const isToday = (date) =>
    date.toDateString() === today.toDateString()

  const weekLabel = () => {
    const start = weekDates[0]
    const end = weekDates[6]
    const opts = { day: 'numeric', month: 'short' }
    if (start.getMonth() === end.getMonth())
      return `${start.getDate()} – ${end.toLocaleDateString('en-IN', opts)}, ${end.getFullYear()}`
    return `${start.toLocaleDateString('en-IN', opts)} – ${end.toLocaleDateString('en-IN', opts)}`
  }

  const totalThisWeek = sessions.length
  const completedThisWeek = sessions.filter(s => s.status === 'completed').length
  const upcomingThisWeek = sessions.filter(s => s.status === 'scheduled').length

  return (
    <div style={{ fontFamily: FONT }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: theme.text, margin: '0 0 2px' }}>Schedule</h1>
          <p style={{ fontSize: 13, color: theme.textSec, margin: 0 }}>{weekLabel()}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setWeekOffset(0)}
            style={{
              padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
              background: weekOffset === 0 ? theme.brandAccentSoft : theme.bgSec,
              border: `1px solid ${weekOffset === 0 ? theme.brandAccent + '60' : theme.border}`,
              color: weekOffset === 0 ? theme.brandAccent : theme.textSec,
              cursor: 'pointer', fontFamily: FONT,
            }}
          >Today</button>
          <button
            onClick={() => setWeekOffset(w => w - 1)}
            style={{
              width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: theme.bgSec, border: `1px solid ${theme.border}`, cursor: 'pointer',
            }}
          ><ChevronLeft size={16} color={theme.textSec} /></button>
          <button
            onClick={() => setWeekOffset(w => w + 1)}
            style={{
              width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: theme.bgSec, border: `1px solid ${theme.border}`, cursor: 'pointer',
            }}
          ><ChevronRight size={16} color={theme.textSec} /></button>
        </div>
      </div>

      {/* Week summary strip */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'This week', value: totalThisWeek, color: theme.text },
          { label: 'Completed', value: completedThisWeek, color: theme.green },
          { label: 'Upcoming', value: upcomingThisWeek, color: theme.brandAccent },
        ].map((s, i) => (
          <div key={i} style={{
            flex: 1, padding: '12px 16px', borderRadius: 12,
            background: theme.cardBg || theme.bgSec, border: `1px solid ${theme.border}`,
          }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color, fontFamily: "'JetBrains Mono', monospace" }}>{s.value}</div>
            <div style={{ fontSize: 11, color: theme.textTer, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Day headers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '48px repeat(7, 1fr)',
        gap: 0,
        marginBottom: 0,
        borderRadius: '12px 12px 0 0',
        overflow: 'hidden',
        border: `1px solid ${theme.border}`,
        borderBottom: 'none',
        background: theme.cardBg || theme.bgSec,
      }}>
        <div style={{ padding: '12px 0', borderRight: `1px solid ${theme.border}` }} />
        {weekDates.map((date, i) => (
          <div key={i} style={{
            padding: '10px 8px', textAlign: 'center',
            borderRight: i < 6 ? `1px solid ${theme.border}` : 'none',
            background: isToday(date) ? theme.brandAccentSoft : 'transparent',
          }}>
            <div style={{ fontSize: 11, color: theme.textTer, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {DAYS[i]}
            </div>
            <div style={{
              fontSize: 18, fontWeight: 700,
              color: isToday(date) ? theme.brandAccent : theme.text,
              lineHeight: 1.2,
            }}>{date.getDate()}</div>
          </div>
        ))}
      </div>

      {/* Time grid */}
      <div style={{
        border: `1px solid ${theme.border}`,
        borderRadius: '0 0 12px 12px',
        overflow: 'hidden',
        maxHeight: 560,
        overflowY: 'auto',
        background: theme.bg,
      }}>
        {HOURS.map((hour, hi) => (
          <div key={hour} style={{
            display: 'grid',
            gridTemplateColumns: '48px repeat(7, 1fr)',
            borderBottom: hi < HOURS.length - 1 ? `1px solid ${theme.border}08` : 'none',
            minHeight: 56,
          }}>
            {/* Hour label */}
            <div style={{
              padding: '6px 6px 0',
              fontSize: 10, color: theme.textTer, textAlign: 'right',
              borderRight: `1px solid ${theme.border}`,
              paddingTop: 6,
            }}>{formatHour(hour)}</div>

            {/* Day cells */}
            {weekDates.map((date, di) => {
              const slotSessions = getSessionsForSlot(date, hour)
              return (
                <div key={di} style={{
                  borderRight: di < 6 ? `1px solid ${theme.border}08` : 'none',
                  padding: 3,
                  background: isToday(date) ? theme.brandAccent + '04' : 'transparent',
                  minHeight: 56,
                }}>
                  {slotSessions.map((s, si) => {
                    const c = SESSION_COLORS[s.session_type] || SESSION_COLORS.pt
                    return (
                      <button
                        key={s.id || si}
                        onClick={() => setSelected(s)}
                        style={{
                          width: '100%', textAlign: 'left', padding: '5px 7px',
                          borderRadius: 6, marginBottom: 2,
                          background: c.bg, border: `1px solid ${c.border}40`,
                          borderLeft: `3px solid ${c.border}`,
                          cursor: 'pointer', fontFamily: FONT,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          {statusIcon(s.status)}
                          <span style={{ fontSize: 11, fontWeight: 600, color: c.text, lineHeight: 1.2 }}>
                            {s.member_name?.split(' ')[0]}
                          </span>
                        </div>
                        <div style={{ fontSize: 10, color: theme.textTer, marginTop: 1 }}>
                          {s.start_time}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
        {Object.entries(SESSION_COLORS).map(([type, c]) => (
          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: c.border }} />
            <span style={{ fontSize: 11, color: theme.textSec, textTransform: 'capitalize' }}>{type === 'pt' ? 'Personal Training' : type.charAt(0).toUpperCase() + type.slice(1)}</span>
          </div>
        ))}
      </div>

      {/* Session Detail Drawer */}
      {selected && (
        <>
          <div
            onClick={() => { setSelected(null); setAssignSheet(false) }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200 }}
          />
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, width: 360,
            background: theme.bg, borderLeft: `1px solid ${theme.border}`,
            zIndex: 201, padding: 24, overflowY: 'auto',
            animation: 'slideInRight 0.25s ease',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: theme.text, margin: 0 }}>Session</h2>
              <button
                onClick={() => { setSelected(null); setAssignSheet(false) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.textSec }}
              >✕</button>
            </div>

            {/* Member */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: `linear-gradient(135deg, ${theme.brandAccent}, #3B6FD4)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{selected.member_name?.[0]}</span>
              </div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, color: theme.text }}>{selected.member_name}</div>
                <div style={{ fontSize: 13, color: theme.textSec, marginTop: 2 }}>
                  {selected.start_time} – {selected.end_time}
                </div>
              </div>
            </div>

            {/* Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              {[
                { label: 'Type', value: selected.session_type?.toUpperCase() },
                { label: 'Status', value: selected.status },
                { label: 'Date', value: selected.date ? new Date(selected.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }) : '—' },
              ].map(({ label, value }) => (
                <div key={label} style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '10px 14px', borderRadius: 8,
                  background: theme.cardBg || theme.bgSec,
                  border: `1px solid ${theme.border}`,
                }}>
                  <span style={{ fontSize: 13, color: theme.textSec }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: theme.text, textTransform: 'capitalize' }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Actions */}
            {selected.member_phone && (
              <a
                href={`https://wa.me/${selected.member_phone.replace('+', '')}`}
                target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '12px', borderRadius: 10, width: '100%',
                  background: '#25D36618', border: `1px solid #25D36640`,
                  color: '#25D366', fontSize: 14, fontWeight: 600,
                  textDecoration: 'none', fontFamily: FONT,
                }}
              >
                <MessageCircle size={16} /> Message on WhatsApp
              </a>
            )}

            {/* Assign Workout button */}
            <button
              onClick={() => setAssignSheet(true)}
              style={{
                width: '100%', padding: '10px 0', borderRadius: 8, marginTop: 8,
                background: accent + '18', border: `1px solid ${accent}`,
                color: accent, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: FONT,
              }}
            >
              💪 Assign Workout
            </button>

            {/* Success banner */}
            {assignDone && (
              <div style={{
                marginTop: 12, padding: '10px 14px', borderRadius: 8,
                background: accent + '18', border: `1px solid ${accent}40`,
                color: accent, fontSize: 13, fontWeight: 600, textAlign: 'center', fontFamily: FONT,
              }}>
                ✅ Workout assigned!
              </div>
            )}
          </div>
        </>
      )}

      {/* Assign Workout Sheet overlay */}
      {assignSheet && selected && (
        <div
          style={{
            position: 'fixed', inset: 0, background: '#00000080', zIndex: 300,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
          onClick={() => setAssignSheet(false)}
        >
          <div
            style={{
              background: theme.bg, borderRadius: '20px 20px 0 0',
              width: '100%', maxWidth: 480,
              maxHeight: '85vh', overflowY: 'auto',
            }}
            onClick={e => e.stopPropagation()}
          >
            <AssignWorkoutSheet
              session={selected}
              token={localStorage.getItem('ivira_trainer_token')}
              theme={theme}
              onClose={() => setAssignSheet(false)}
              onDone={() => {
                setAssignSheet(false)
                setAssignDone(true)
                setTimeout(() => setAssignDone(false), 3000)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
