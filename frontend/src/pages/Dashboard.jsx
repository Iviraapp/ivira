import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Link } from 'react-router-dom'
import { Users, ScanLine, TrendingUp, Clock, UserCheck, IndianRupee } from 'lucide-react'
import { format } from 'date-fns'
import api from '../lib/api'

function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div style={{
      background: '#0d0d14', border: '1px solid #1a1a2e', borderRadius: 12,
      padding: 20, flex: '1 1 200px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={18} color={color} />
        </div>
        <span style={{ color: '#888', fontSize: 13, fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ color: '#fff', fontSize: 28, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
      {sub && <div style={{ color: '#555', fontSize: 12, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

export default function Dashboard() {
  const { gymId, gym } = useAuth()
  const [stats, setStats] = useState(null)
  const [recentCheckins, setRecentCheckins] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!gymId) return
    Promise.all([
      api.get(`/gyms/${gymId}/stats`).catch(() => ({ data: null })),
      api.get(`/gyms/${gymId}/checkins?limit=10`).catch(() => ({ data: { checkins: [] } })),
    ]).then(([statsRes, checkinsRes]) => {
      setStats(statsRes.data)
      setRecentCheckins(checkinsRes.data?.checkins || [])
    }).finally(() => setLoading(false))
  }, [gymId])

  if (loading) {
    return <div style={{ color: '#666', padding: 40, textAlign: 'center' }}>Loading dashboard...</div>
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 700, margin: 0 }}>
          {gym?.name || 'Dashboard'}
        </h1>
        <p style={{ color: '#666', fontSize: 14, margin: '4px 0 0' }}>
          {format(new Date(), 'EEEE, d MMMM yyyy')}
        </p>
      </div>

      {/* Quick Action */}
      <Link to="/scanner" style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px',
        background: 'linear-gradient(135deg, #0052FF, #0040CC)', borderRadius: 12,
        textDecoration: 'none', marginBottom: 24, transition: 'opacity 0.15s',
      }}>
        <ScanLine size={24} color="#fff" />
        <div>
          <div style={{ color: '#fff', fontSize: 16, fontWeight: 600 }}>Scan Member QR</div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>Open camera to check in members</div>
        </div>
      </Link>

      {/* Stats */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 32 }}>
        <StatCard
          icon={Users}
          label="Total Members"
          value={stats?.totalMembers ?? stats?.members?.total ?? '—'}
          color="#0052FF"
          sub="Active members"
        />
        <StatCard
          icon={UserCheck}
          label="Today's Check-ins"
          value={stats?.todayCheckins ?? stats?.checkins?.today ?? recentCheckins.length}
          color="#22C55E"
          sub={format(new Date(), 'dd MMM yyyy')}
        />
        <StatCard
          icon={IndianRupee}
          label="Monthly Revenue"
          value={stats?.monthlyRevenue ? `₹${(stats.monthlyRevenue / 100).toLocaleString()}` : '—'}
          color="#F97316"
          sub="This month"
        />
        <StatCard
          icon={TrendingUp}
          label="Active Memberships"
          value={stats?.activeMemberships ?? stats?.members?.active ?? '—'}
          color="#8B5CF6"
        />
      </div>

      {/* Recent Check-ins */}
      <div style={{
        background: '#0d0d14', border: '1px solid #1a1a2e', borderRadius: 12,
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid #1a1a2e',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <h2 style={{ color: '#fff', fontSize: 16, fontWeight: 600, margin: 0 }}>Recent Check-ins</h2>
          <Link to="/checkins" style={{ color: '#0052FF', fontSize: 13, textDecoration: 'none' }}>
            View all →
          </Link>
        </div>

        {recentCheckins.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#555' }}>
            No check-ins today. Open the scanner to start.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1a1a2e' }}>
                {['Member', 'Method', 'Time'].map((h) => (
                  <th key={h} style={{
                    padding: '10px 20px', textAlign: 'left', color: '#555',
                    fontSize: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentCheckins.map((ci) => (
                <tr key={ci.id} style={{ borderBottom: '1px solid #111' }}>
                  <td style={{ padding: '12px 20px' }}>
                    <div style={{ color: '#fff', fontSize: 14, fontWeight: 500 }}>
                      {ci.member_name || 'Unknown'}
                    </div>
                    <div style={{ color: '#555', fontSize: 12 }}>{ci.member_phone || ''}</div>
                  </td>
                  <td style={{ padding: '12px 20px' }}>
                    <span style={{
                      padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                      textTransform: 'uppercase', letterSpacing: 0.5,
                      background: ci.method === 'qr' ? '#0052FF20' : ci.method === 'nfc' ? '#22C55E20' : '#F9731620',
                      color: ci.method === 'qr' ? '#0052FF' : ci.method === 'nfc' ? '#22C55E' : '#F97316',
                    }}>
                      {ci.method}
                    </span>
                  </td>
                  <td style={{ padding: '12px 20px', color: '#888', fontSize: 13 }}>
                    {ci.checked_in_at ? format(new Date(ci.checked_in_at), 'hh:mm a') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
