import { useState, useEffect } from 'react'
import api from '../../lib/api'
import { StatCard } from '../../components/ui/Card'
import { Badge, SkeletonTable } from '../../components/ui'
import Button from '../../components/ui/Button'
import { formatPaise, formatDate } from '../../lib/utils'
import { TrendingUp, DollarSign, Building2, BarChart3 } from 'lucide-react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { useTheme } from '../../context/ThemeContext'

export default function AdminRevenue() {
  const [stats, setStats] = useState(null)
  const [revenueByCity, setRevenueByCity] = useState([])
  const [revenueByPackage, setRevenueByPackage] = useState([])
  const [monthlyTrend, setMonthlyTrend] = useState([])
  const [topGyms, setTopGyms] = useState([])
  const [loading, setLoading] = useState(true)
  const { theme, isDark } = useTheme()

  const font = "'Inter', -apple-system, sans-serif"
  const fontMono = "'JetBrains Mono', monospace"

  const PACKAGE_COLORS = { Starter: theme.green, Growth: theme.amber, Pro: theme.brandAccent }
  const CITY_COLORS = [theme.brandAccent, theme.cyan, theme.amber, theme.green]

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
        api.get('/super/revenue?period=6months', authHeaders),
        api.get('/super/gyms?limit=10&sort=revenue', authHeaders),
      ])

      const data = statsRes.data
      setStats(data)

      const rev = revenueRes.data
      setRevenueByCity(rev.by_city || [])
      setRevenueByPackage(rev.by_package || [])
      setMonthlyTrend(rev.monthly || rev.revenue || [])

      setTopGyms(gymsRes.data.gyms || gymsRes.data || [])
    } catch (err) {
      console.error('Failed to load revenue data:', err)
    } finally {
      setLoading(false)
    }
  }

  const exportCSV = () => {
    if (!topGyms.length) return
    const headers = ['Gym Name', 'City', 'Package', 'Members', 'Revenue (Paise)']
    const rows = topGyms.map((g) => [
      g.gym_name || g.name,
      g.city || '',
      g.package || g.plan_name || '',
      g.member_count ?? '',
      g.revenue ?? g.total_revenue ?? 0,
    ])
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `top-gyms-revenue-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const darkCard = {
    background: theme.bgSec,
    borderRadius: 12,
    border: `1px solid ${theme.border}`,
    padding: 24,
  }

  const tooltipStyle = {
    borderRadius: 8, border: `1px solid ${theme.border}`,
    background: theme.bgSec, color: theme.text,
    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
  }

  if (loading) {
    return (
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: theme.text, marginBottom: 24, fontFamily: font }}>Revenue Analytics</h1>
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

  const mrr = stats?.mrr ?? 0
  const arr = stats?.arr ?? (mrr * 12)
  const activeGyms = stats?.active_gyms ?? stats?.total_gyms ?? 0
  const churnedThisMonth = stats?.churned_this_month ?? 0

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: theme.text, fontFamily: font }}>Revenue Analytics</h1>
        <Button onClick={exportCSV} variant="secondary" style={{ fontSize: 13 }}>
          Export CSV
        </Button>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        <StatCard
          label="MRR"
          value={formatPaise(mrr)}
          icon={<DollarSign size={20} />}
          color={theme.accent}
        />
        <StatCard
          label="ARR"
          value={formatPaise(arr)}
          icon={<TrendingUp size={20} />}
          color={theme.cyan}
        />
        <StatCard
          label="Active Gyms"
          value={activeGyms.toLocaleString('en-IN')}
          icon={<Building2 size={20} />}
          color={theme.green}
        />
        <StatCard
          label="Churned This Month"
          value={churnedThisMonth}
          icon={<BarChart3 size={20} />}
          color={theme.red}
        />
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
        {/* Gyms by Package - Pie Chart */}
        <div style={darkCard}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: theme.text, marginBottom: 20 }}>
            Gyms by Package
          </h2>
          {revenueByPackage.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={revenueByPackage}
                  dataKey="count"
                  nameKey="package"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ package: pkg, count }) => `${pkg}: ${count}`}
                  stroke={theme.bgSec}
                  strokeWidth={2}
                >
                  {revenueByPackage.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={PACKAGE_COLORS[entry.package] || CITY_COLORS[index % CITY_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: theme.textSec }} itemStyle={{ color: theme.text }} />
                <Legend wrapperStyle={{ color: theme.textSec, fontSize: 13 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ color: theme.textSec, fontSize: 14, textAlign: 'center', padding: 40 }}>
              No package data available.
            </p>
          )}
        </div>

        {/* Revenue by City - Bar Chart */}
        <div style={darkCard}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: theme.text, marginBottom: 20 }}>
            Revenue by City
          </h2>
          {revenueByCity.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={revenueByCity}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
                <XAxis dataKey="city" tick={{ fontSize: 12, fill: theme.textTer }} axisLine={{ stroke: theme.border }} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: theme.textTer }} tickFormatter={(v) => formatPaise(v)} axisLine={{ stroke: theme.border }} tickLine={false} />
                <Tooltip
                  formatter={(value) => [formatPaise(value), 'Revenue']}
                  contentStyle={tooltipStyle}
                  labelStyle={{ color: theme.textSec }}
                  itemStyle={{ color: theme.text }}
                />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                  {revenueByCity.map((_, index) => (
                    <Cell key={index} fill={CITY_COLORS[index % CITY_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ color: theme.textSec, fontSize: 14, textAlign: 'center', padding: 40 }}>
              No city data available.
            </p>
          )}
        </div>
      </div>

      {/* Monthly Revenue Trend - Line Chart */}
      <div style={{ ...darkCard, marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: theme.text, marginBottom: 20 }}>
          Monthly Revenue Trend (Last 6 Months)
        </h2>
        {monthlyTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyTrend}>
              <defs>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={theme.brandAccent} />
                  <stop offset="100%" stopColor={theme.cyan} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: theme.textTer }} axisLine={{ stroke: theme.border }} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: theme.textTer }} tickFormatter={(v) => formatPaise(v)} axisLine={{ stroke: theme.border }} tickLine={false} />
              <Tooltip
                formatter={(value) => [formatPaise(value), 'Revenue']}
                contentStyle={tooltipStyle}
                labelStyle={{ color: theme.textSec }}
                itemStyle={{ color: theme.text }}
              />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="url(#lineGrad)"
                strokeWidth={2}
                dot={{ fill: theme.brandAccent, r: 4, stroke: theme.bgSec, strokeWidth: 2 }}
                activeDot={{ r: 6, fill: theme.cyan }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p style={{ color: theme.textSec, fontSize: 14, textAlign: 'center', padding: 40 }}>
            No trend data available yet.
          </p>
        )}
      </div>

      {/* Top 10 Revenue Gyms Table */}
      <div style={darkCard}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: theme.text, marginBottom: 20 }}>
          Top 10 Revenue Gyms
        </h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${theme.border}` }}>
                {['#', 'Gym Name', 'City', 'Package', 'Members', 'Revenue'].map((h) => (
                  <th key={h} style={{
                    textAlign: 'left', padding: '10px 12px', fontSize: 13,
                    fontWeight: 600, color: theme.textTer, textTransform: 'uppercase',
                    letterSpacing: '0.3px',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topGyms.map((gym, i) => (
                <tr key={gym.id || i} style={{ borderBottom: `1px solid ${theme.border}` }}>
                  <td style={{ padding: '12px', fontSize: 14, color: theme.textTer, fontWeight: 500, fontFamily: fontMono }}>
                    {i + 1}
                  </td>
                  <td style={{ padding: '12px', fontSize: 14, fontWeight: 500, color: theme.text }}>
                    {gym.gym_name || gym.name}
                  </td>
                  <td style={{ padding: '12px', fontSize: 14, color: theme.textSec }}>
                    {gym.city || '\u2014'}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <Badge color={
                      (gym.package || gym.plan_name) === 'Pro' ? 'primary' :
                      (gym.package || gym.plan_name) === 'Growth' ? 'warning' : 'success'
                    }>
                      {gym.package || gym.plan_name || '\u2014'}
                    </Badge>
                  </td>
                  <td style={{ padding: '12px', fontSize: 14, color: theme.text, fontFamily: fontMono }}>
                    {(gym.member_count ?? 0).toLocaleString('en-IN')}
                  </td>
                  <td style={{ padding: '12px', fontSize: 14, fontWeight: 600, color: theme.green, fontFamily: fontMono }}>
                    {formatPaise(gym.revenue ?? gym.total_revenue ?? 0)}
                  </td>
                </tr>
              ))}
              {topGyms.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: 32, textAlign: 'center', color: theme.textSec, fontSize: 14 }}>
                    No gym revenue data available yet.
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
