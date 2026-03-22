import { useState, useEffect } from 'react'
import { StatCard } from '../../components/ui/Card'
import { Badge, SkeletonTable } from '../../components/ui'
import { formatPaise, formatDate } from '../../lib/utils'
import api from '../../lib/api'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Building2, Users, IndianRupee, CreditCard } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [revenue, setRevenue] = useState([])
  const [recentGyms, setRecentGyms] = useState([])
  const [loading, setLoading] = useState(true)
  const { theme, isDark } = useTheme()

  const font = "'Inter', -apple-system, sans-serif"
  const fontMono = "'JetBrains Mono', monospace"

  const adminToken = localStorage.getItem('ivira_admin_token')
  const authHeaders = { headers: { Authorization: `Bearer ${adminToken}` } }

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [statsRes, revenueRes, gymsRes] = await Promise.all([
        api.get('/super/stats', authHeaders),
        api.get('/super/revenue?period=monthly', authHeaders),
        api.get('/super/gyms?limit=10', authHeaders),
      ])
      setStats(statsRes.data)
      setRevenue(revenueRes.data.revenue || revenueRes.data || [])
      setRecentGyms(gymsRes.data.gyms || gymsRes.data || [])
    } catch (err) {
      console.error('Failed to load admin dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  const statusBadge = (status) => {
    const colorMap = { active: 'success', trial: 'primary', suspended: 'error', expired: 'error' }
    return <Badge color={colorMap[status] || 'neutral'}>{status}</Badge>
  }

  const darkCard = {
    background: theme.bgSec,
    borderRadius: 12,
    border: `1px solid ${theme.border}`,
    padding: 24,
  }

  if (loading) {
    return (
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: theme.text, marginBottom: 24, fontFamily: font }}>Dashboard</h1>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{
              background: theme.bgSec, borderRadius: 12, border: `1px solid ${theme.border}`,
              padding: 24, height: 120,
            }} />
          ))}
        </div>
        <SkeletonTable rows={6} cols={5} />
      </div>
    )
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: theme.text, marginBottom: 24, fontFamily: font }}>Dashboard</h1>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        <StatCard
          label="Total Gyms"
          value={stats?.total_gyms ?? 0}
          icon={<Building2 size={20} />}
          color={theme.accent}
        />
        <StatCard
          label="Total Members"
          value={(stats?.total_members ?? 0).toLocaleString('en-IN')}
          icon={<Users size={20} />}
          color={theme.cyan}
        />
        <StatCard
          label="Total Revenue"
          value={formatPaise(stats?.total_revenue ?? 0)}
          icon={<IndianRupee size={20} />}
          color={theme.green}
        />
        <StatCard
          label="Active Subscriptions"
          value={stats?.active_subscriptions ?? 0}
          icon={<CreditCard size={20} />}
          color={theme.amber}
        />
      </div>

      {/* Revenue Chart */}
      <div style={{ ...darkCard, marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: theme.text, marginBottom: 20 }}>
          Monthly Revenue
        </h2>
        {revenue.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenue}>
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={theme.brandAccent} />
                  <stop offset="100%" stopColor={theme.cyan} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: theme.textTer }} axisLine={{ stroke: theme.border }} tickLine={false} />
              <YAxis
                tick={{ fontSize: 12, fill: theme.textTer }}
                tickFormatter={(v) => formatPaise(v)}
                axisLine={{ stroke: theme.border }}
                tickLine={false}
              />
              <Tooltip
                formatter={(value) => [formatPaise(value), 'Revenue']}
                contentStyle={{
                  borderRadius: 8, border: `1px solid ${theme.border}`,
                  background: theme.bgSec, color: theme.text,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                }}
                labelStyle={{ color: theme.textSec }}
                itemStyle={{ color: theme.text }}
              />
              <Bar dataKey="amount" fill="url(#barGrad)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p style={{ color: theme.textSec, fontSize: 14, textAlign: 'center', padding: 40 }}>
            No revenue data available yet.
          </p>
        )}
      </div>

      {/* Recent Gyms Table */}
      <div style={darkCard}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: theme.text, marginBottom: 20 }}>
          Recent Gyms
        </h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${theme.border}` }}>
                {['Gym Name', 'Owner', 'Members', 'Status', 'Joined'].map((h) => (
                  <th key={h} style={{
                    textAlign: 'left', padding: '10px 12px', fontSize: 13,
                    fontWeight: 600, color: theme.textTer, textTransform: 'uppercase',
                    letterSpacing: '0.3px',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentGyms.map((gym) => (
                <tr key={gym.id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                  <td style={{ padding: '12px', fontSize: 14, fontWeight: 500, color: theme.text }}>
                    {gym.gym_name}
                  </td>
                  <td style={{ padding: '12px', fontSize: 14, color: theme.textSec }}>
                    {gym.owner_name}
                  </td>
                  <td style={{ padding: '12px', fontSize: 14, color: theme.text, fontFamily: fontMono }}>
                    {gym.member_count ?? '\u2014'}
                  </td>
                  <td style={{ padding: '12px' }}>
                    {statusBadge(gym.status)}
                  </td>
                  <td style={{ padding: '12px', fontSize: 14, color: theme.textSec }}>
                    {formatDate(gym.created_at)}
                  </td>
                </tr>
              ))}
              {recentGyms.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: 32, textAlign: 'center', color: theme.textSec, fontSize: 14 }}>
                    No gyms registered yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
