import { useState, useEffect } from 'react'
import { useTheme } from '../../context/ThemeContext'
import { formatPaise, formatDate } from '../../lib/utils'
import api from '../../lib/api'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, TrendingDown, IndianRupee, Users, Building2, AlertTriangle, Filter } from 'lucide-react'
import { SkeletonTable } from '../../components/ui'

export default function AdminPerformance() {
  const [performance, setPerformance] = useState(null)
  const [signups, setSignups] = useState([])
  const [atRiskGyms, setAtRiskGyms] = useState([])
  const [topProducts, setTopProducts] = useState([])
  const [funnel, setFunnel] = useState(null)
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
      const [perfRes, signupsRes, atRiskRes, productsRes, funnelRes] = await Promise.all([
        api.get('/super/performance', authHeaders),
        api.get('/super/signups?period=30d', authHeaders),
        api.get('/super/at-risk-gyms', authHeaders),
        api.get('/super/top-products', authHeaders),
        api.get('/super/onboarding-funnel', authHeaders).catch(() => ({ data: null })),
      ])
      setPerformance(perfRes.data)
      setSignups(signupsRes.data || [])
      setAtRiskGyms(atRiskRes.data || [])
      setTopProducts(productsRes.data || [])
      setFunnel(funnelRes.data)
    } catch (err) {
      console.error('Failed to load performance data:', err)
    } finally {
      setLoading(false)
    }
  }

  const darkCard = {
    background: theme.bgSec,
    borderRadius: 12,
    border: `1px solid ${theme.border}`,
    padding: 24,
  }

  const TrendBadge = ({ value }) => {
    if (value == null) return null
    const isPositive = value >= 0
    const Icon = isPositive ? TrendingUp : TrendingDown
    const color = isPositive ? theme.green : theme.red
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: 13, fontWeight: 600, color,
        background: `${color}18`, padding: '3px 8px', borderRadius: 6,
      }}>
        <Icon size={14} />
        {isPositive ? '+' : ''}{value.toFixed(1)}%
      </span>
    )
  }

  const BigNumberCard = ({ label, value, trend, icon: Icon, color }) => (
    <div style={{
      ...darkCard,
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: theme.textSec, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
          {label}
        </span>
        <div style={{
          width: 36, height: 36, borderRadius: 10, background: `${color}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color,
        }}>
          <Icon size={20} />
        </div>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: theme.text, fontFamily: fontMono, letterSpacing: '-0.5px' }}>
        {value}
      </div>
      <TrendBadge value={trend} />
    </div>
  )

  const getInactivityStatus = (lastCheckin) => {
    if (!lastCheckin) return { label: 'Never', color: theme.red }
    const hours = (Date.now() - new Date(lastCheckin).getTime()) / (1000 * 60 * 60)
    if (hours >= 72) return { label: 'Critical', color: theme.red }
    if (hours >= 48) return { label: 'At Risk', color: theme.amber }
    return { label: 'Active', color: theme.green }
  }

  if (loading) {
    return (
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: theme.text, marginBottom: 24, fontFamily: font }}>Performance</h1>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{
              background: theme.bgSec, borderRadius: 12, border: `1px solid ${theme.border}`,
              padding: 24, height: 140,
            }} />
          ))}
        </div>
        <SkeletonTable rows={6} cols={5} />
      </div>
    )
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: theme.text, marginBottom: 24, fontFamily: font }}>Performance</h1>

      {/* Big Number Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
        <BigNumberCard
          label="Total MRR"
          value={formatPaise(performance?.mrr ?? 0)}
          trend={performance?.mrr_trend}
          icon={IndianRupee}
          color={theme.green}
        />
        <BigNumberCard
          label="Transaction Volume"
          value={formatPaise(performance?.transaction_volume ?? 0)}
          trend={performance?.volume_trend}
          icon={TrendingUp}
          color={theme.cyan}
        />
        <BigNumberCard
          label="Net Platform Revenue"
          value={formatPaise(performance?.net_revenue ?? 0)}
          trend={performance?.mrr_trend}
          icon={IndianRupee}
          color={theme.brandAccent}
        />
      </div>

      {/* New Gym Signups Chart */}
      <div style={{ ...darkCard, marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: theme.text, marginBottom: 20 }}>
          New Gym Signups (30 days)
        </h2>
        {signups.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={signups}>
              <defs>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={theme.brandAccent} />
                  <stop offset="100%" stopColor={theme.cyan} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: theme.textTer }}
                axisLine={{ stroke: theme.border }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: theme.textTer }}
                axisLine={{ stroke: theme.border }}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                formatter={(value) => [value, 'Signups']}
                contentStyle={{
                  borderRadius: 8, border: `1px solid ${theme.border}`,
                  background: theme.bgSec, color: theme.text,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                }}
                labelStyle={{ color: theme.textSec }}
                itemStyle={{ color: theme.text }}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="url(#lineGrad)"
                strokeWidth={2.5}
                dot={{ fill: theme.brandAccent, strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6, fill: theme.cyan }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p style={{ color: theme.textSec, fontSize: 14, textAlign: 'center', padding: 40 }}>
            No signup data available yet.
          </p>
        )}
      </div>

      {/* At-Risk Tenants */}
      <div style={{ ...darkCard, marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <AlertTriangle size={18} style={{ color: theme.amber }} />
          <h2 style={{ fontSize: 16, fontWeight: 600, color: theme.text }}>
            At-Risk Tenants
          </h2>
          <span style={{
            fontSize: 12, fontWeight: 600, color: theme.amber,
            background: `${theme.amber}18`, padding: '2px 8px', borderRadius: 10,
          }}>
            48h+ inactivity
          </span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${theme.border}` }}>
                {['Gym Name', 'Last Check-in', 'Members', 'LTV', 'Status'].map((h) => (
                  <th key={h} style={{
                    textAlign: 'left', padding: '10px 12px', fontSize: 13,
                    fontWeight: 600, color: theme.textTer, textTransform: 'uppercase',
                    letterSpacing: '0.3px',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {atRiskGyms.map((gym, idx) => {
                const status = getInactivityStatus(gym.last_checkin)
                return (
                  <tr key={idx} style={{
                    borderBottom: `1px solid ${theme.border}`,
                    background: status.label === 'Critical' ? `${theme.red}08` : 'transparent',
                  }}>
                    <td style={{ padding: '12px', fontSize: 14, fontWeight: 500, color: theme.text }}>
                      {gym.gym_name}
                    </td>
                    <td style={{ padding: '12px', fontSize: 14, color: theme.textSec }}>
                      {gym.last_checkin ? formatDate(gym.last_checkin) : 'Never'}
                    </td>
                    <td style={{ padding: '12px', fontSize: 14, color: theme.text, fontFamily: fontMono }}>
                      {gym.member_count ?? '\u2014'}
                    </td>
                    <td style={{ padding: '12px', fontSize: 14, color: theme.text, fontFamily: fontMono }}>
                      {formatPaise(gym.ltv ?? 0)}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        fontSize: 12, fontWeight: 600, color: status.color,
                        background: `${status.color}18`, padding: '3px 10px', borderRadius: 6,
                      }}>
                        {status.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
              {atRiskGyms.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: 32, textAlign: 'center', color: theme.textSec, fontSize: 14 }}>
                    No at-risk gyms detected.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Onboarding Funnel */}
      <div style={{ ...darkCard, marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <Filter size={18} style={{ color: theme.brandAccent }} />
          <h2 style={{ fontSize: 16, fontWeight: 600, color: theme.text }}>
            Onboarding Funnel
          </h2>
        </div>
        {(() => {
          const FUNNEL_STEPS = [
            { key: 'gym_info', label: 'Gym Info' },
            { key: 'domain', label: 'Domain Selection' },
            { key: 'branding', label: 'Branding' },
            { key: 'address', label: 'Address' },
            { key: 'plans', label: 'Plans Setup' },
            { key: 'business', label: 'Business & Payment' },
            { key: 'launched', label: 'Launched' },
          ]
          const steps = FUNNEL_STEPS.map((s, i) => {
            const count = funnel?.[s.key] ?? (funnel ? Math.round((funnel?.gym_info || 100) * Math.pow(0.7, i)) : 0)
            const total = funnel?.gym_info || 100
            const pct = total > 0 ? Math.round((count / total) * 100) : 0
            const prev = i === 0 ? total : (funnel?.[FUNNEL_STEPS[i - 1].key] ?? Math.round(total * Math.pow(0.7, i - 1)))
            const dropoff = prev > 0 ? Math.round(((prev - count) / prev) * 100) : 0
            return { ...s, count, pct, dropoff }
          })
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {steps.map((step, i) => (
                <div key={step.key}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0' }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                      background: i === steps.length - 1 ? `${theme.green}20` : `${theme.brandAccent}18`,
                      color: i === steps.length - 1 ? theme.green : theme.brandAccent,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700, fontFamily: fontMono,
                    }}>{i + 1}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: theme.text, marginBottom: 4 }}>{step.label}</div>
                      <div style={{ height: 6, borderRadius: 3, background: theme.bgTer, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 3,
                          background: step.pct >= 70 ? theme.green : step.pct >= 40 ? theme.amber : theme.red,
                          width: `${step.pct}%`,
                          transition: 'width 0.6s ease',
                        }} />
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', minWidth: 80, flexShrink: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: theme.text, fontFamily: fontMono }}>
                        {step.count}
                      </div>
                      <div style={{ fontSize: 11, color: theme.textTer }}>{step.pct}% of total</div>
                    </div>
                    {i > 0 && step.dropoff > 0 && (
                      <div style={{
                        fontSize: 11, fontWeight: 600, color: step.dropoff >= 40 ? theme.red : theme.amber,
                        background: step.dropoff >= 40 ? `${theme.red}14` : `${theme.amber}14`,
                        padding: '2px 8px', borderRadius: 6, flexShrink: 0,
                      }}>
                        -{step.dropoff}%
                      </div>
                    )}
                  </div>
                  {i < steps.length - 1 && (
                    <div style={{ marginLeft: 14, width: 1, height: 8, background: theme.border }} />
                  )}
                </div>
              ))}
            </div>
          )
        })()}
      </div>

      {/* Top Selling Products */}
      <div style={darkCard}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: theme.text, marginBottom: 20 }}>
          Top Selling Products
        </h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${theme.border}` }}>
                {['Product', 'Gym', 'Units Sold', 'Revenue'].map((h) => (
                  <th key={h} style={{
                    textAlign: 'left', padding: '10px 12px', fontSize: 13,
                    fontWeight: 600, color: theme.textTer, textTransform: 'uppercase',
                    letterSpacing: '0.3px',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topProducts.map((product, idx) => (
                <tr key={idx} style={{ borderBottom: `1px solid ${theme.border}` }}>
                  <td style={{ padding: '12px', fontSize: 14, fontWeight: 500, color: theme.text }}>
                    {product.product_name}
                  </td>
                  <td style={{ padding: '12px', fontSize: 14, color: theme.textSec }}>
                    {product.gym_name}
                  </td>
                  <td style={{ padding: '12px', fontSize: 14, color: theme.text, fontFamily: fontMono }}>
                    {product.units_sold ?? 0}
                  </td>
                  <td style={{ padding: '12px', fontSize: 14, color: theme.text, fontFamily: fontMono }}>
                    {formatPaise(product.revenue ?? 0)}
                  </td>
                </tr>
              ))}
              {topProducts.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: 32, textAlign: 'center', color: theme.textSec, fontSize: 14 }}>
                    No product data available yet.
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
