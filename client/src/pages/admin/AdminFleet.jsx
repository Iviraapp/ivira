import { useState, useEffect } from 'react'
import { Ship, Wifi, WifiOff, AlertTriangle, IndianRupee, Users, RefreshCw, Settings } from 'lucide-react'
import api from '../../lib/api'

const FONT = "'Inter', -apple-system, sans-serif"
const FONT_M = "'JetBrains Mono', 'Fira Code', monospace"
const N = {
  bg: '#0A0F1E', card: '#141C33', border: '#1E2A4A',
  text: '#E2E8F0', textSec: '#94A3B8', textTer: '#64748B',
  accent: '#7C3AED', green: '#22C55E', red: '#EF4444', amber: '#F59E0B',
}

export default function AdminFleet() {
  const [fleet, setFleet] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchFleet = async () => {
    try {
      const token = localStorage.getItem('ivira_admin_token')
      const { data } = await api.get('/super/fleet', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setFleet(data)
    } catch (err) {
      console.error('Fleet fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchFleet() }, [])

  const online = fleet.filter(f => f.computed_status === 'online').length
  const offline = fleet.filter(f => f.computed_status === 'offline').length
  const totalRevenue = fleet.reduce((s, f) => s + (f.monthly_revenue || 0), 0)

  const formatPaise = (p) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(p / 100)

  const statusIcon = (status) => {
    if (status === 'online') return <Wifi size={14} color={N.green} />
    if (status === 'offline') return <WifiOff size={14} color={N.red} />
    return <AlertTriangle size={14} color={N.amber} />
  }

  const statusColor = (status) => {
    if (status === 'online') return N.green
    if (status === 'offline') return N.red
    return N.amber
  }

  const stats = [
    { label: 'Total Kiosks', value: fleet.length, icon: Ship, color: N.accent },
    { label: 'Online', value: online, icon: Wifi, color: N.green },
    { label: 'Offline', value: offline, icon: WifiOff, color: N.red },
    { label: '30-Day Revenue', value: formatPaise(totalRevenue), icon: IndianRupee, color: N.accent },
  ]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: N.text, fontFamily: FONT, margin: 0 }}>Fleet Dashboard</h1>
          <p style={{ fontSize: 13, color: N.textSec, margin: '4px 0 0', fontFamily: FONT }}>Live kiosk status across all gyms</p>
        </div>
        <button
          onClick={() => { setLoading(true); fetchFleet() }}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
            borderRadius: 8, background: N.card, border: `1px solid ${N.border}`,
            color: N.textSec, fontSize: 13, fontFamily: FONT, cursor: 'pointer',
          }}
        >
          <RefreshCw size={14} className={loading ? 'spinning' : ''} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {stats.map((s, i) => (
          <div key={i} style={{
            background: N.card, borderRadius: 12, padding: '20px',
            border: `1px solid ${N.border}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <s.icon size={16} color={s.color} />
              <span style={{ fontSize: 12, color: N.textSec, fontFamily: FONT }}>{s.label}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: N.text, fontFamily: FONT_M }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Fleet Table */}
      <div style={{
        background: N.card, borderRadius: 12, border: `1px solid ${N.border}`, overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: FONT }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${N.border}` }}>
              {['Status', 'Gym', 'City', 'Members', 'Monthly Revenue', 'Last Ping', 'Actions'].map(h => (
                <th key={h} style={{
                  padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600,
                  color: N.textTer, textTransform: 'uppercase', letterSpacing: '0.5px',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fleet.length === 0 && !loading ? (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: N.textSec, fontSize: 14 }}>
                No kiosks registered yet. Kiosks auto-register on first heartbeat.
              </td></tr>
            ) : fleet.map((f, i) => (
              <tr key={f.id || i} style={{ borderBottom: `1px solid ${N.border}08` }}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {statusIcon(f.computed_status)}
                    <span style={{
                      fontSize: 11, fontWeight: 600, color: statusColor(f.computed_status),
                      textTransform: 'uppercase',
                    }}>{f.computed_status}</span>
                  </div>
                </td>
                <td style={{ padding: '12px 16px', color: N.text, fontSize: 14, fontWeight: 500 }}>{f.gym_name || '\u2014'}</td>
                <td style={{ padding: '12px 16px', color: N.textSec, fontSize: 13 }}>{f.city || '\u2014'}</td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Users size={13} color={N.textTer} />
                    <span style={{ color: N.text, fontSize: 13, fontFamily: FONT_M }}>{f.active_members_cached}</span>
                  </div>
                </td>
                <td style={{ padding: '12px 16px', color: N.green, fontSize: 13, fontFamily: FONT_M }}>
                  {formatPaise(f.monthly_revenue || 0)}
                </td>
                <td style={{ padding: '12px 16px', color: N.textSec, fontSize: 12, fontFamily: FONT_M }}>
                  {f.last_ping ? new Date(f.last_ping).toLocaleString('en-IN') : '\u2014'}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <button style={{
                    padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                    background: N.bg, border: `1px solid ${N.border}`, color: N.textSec,
                    cursor: 'pointer', fontFamily: FONT,
                  }}>
                    <Settings size={12} style={{ marginRight: 4 }} />
                    Manage
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
