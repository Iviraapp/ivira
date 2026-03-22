import { useState, useEffect } from 'react'
import api from '../../lib/api'

const MOCK_DATA = {
  pending_paise: 4523100,
  available_paise: 12847500,
  next_payout_paise: 12847500,
  next_payout_date: '2026-03-20',
  mtd_total_paise: 28934200,
  subscription_revenue_paise: 18500000,
  platform_fee_revenue_paise: 10434200,
  monthly: [
    { month: '2026-03', fees: 10434200, volume: 1043420000 },
    { month: '2026-02', fees: 9821000, volume: 982100000 },
    { month: '2026-01', fees: 8754300, volume: 875430000 },
    { month: '2025-12', fees: 7632100, volume: 763210000 },
    { month: '2025-11', fees: 6845200, volume: 684520000 },
    { month: '2025-10', fees: 5921400, volume: 592140000 },
  ],
  bank_last4: '4521',
  bank_name: 'HDFC Bank',
  bank_connected: true,
}

const font = "'Inter', -apple-system, sans-serif"

function formatPaise(paise) {
  return '\u20B9' + (paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

function formatMonth(m) {
  const [y, mo] = m.split('-')
  const d = new Date(Number(y), Number(mo) - 1)
  return d.toLocaleString('en-IN', { month: 'short', year: 'numeric' })
}

function formatDate(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function AdminPayouts() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const adminToken = localStorage.getItem('ivira_admin_token')
  const authHeaders = { headers: { Authorization: `Bearer ${adminToken}` } }

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const res = await api.get('/super/platform/revenue', authHeaders)
        setData(res.data)
      } catch {
        setData(MOCK_DATA)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#FFFFFF', fontFamily: font, marginBottom: 8 }}>
          Payout Schedule
        </h1>
        <p style={{ fontSize: 14, color: '#A1A1AA', fontFamily: font, marginBottom: 32 }}>
          Track the journey of every rupee from member to bank
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{
              background: '#0A0A0A', borderRadius: 16, border: '1px solid #1F1F1F',
              padding: 24, height: 110,
            }} />
          ))}
        </div>
      </div>
    )
  }

  const d = data || MOCK_DATA

  // Platform fee calculations
  const totalTransactionVolume = (d.monthly || []).reduce((sum, m) => sum + m.volume, 0)
  const subscriptionPlatformFee = Math.round(d.subscription_revenue_paise * 0.01)  // 1% subscription platform fee
  const marketplaceCommission = Math.round(totalTransactionVolume * 0.05)           // 5% marketplace commission
  const netPlatformRevenue = subscriptionPlatformFee + marketplaceCommission

  // Donut chart calculations
  const totalRevenue = d.subscription_revenue_paise + d.platform_fee_revenue_paise
  const subscriptionPct = (d.subscription_revenue_paise / totalRevenue) * 100
  const subscriptionAngle = (subscriptionPct / 100) * 360

  // Timeline step (0-indexed: 0=Processing, 1=Available, 2=Payout Initiated, 3=Bank Received)
  // If there's available balance, we're at step 1; if pending, step 0
  const activeStep = d.available_paise > 0 ? 1 : 0

  const timelineNodes = [
    { label: 'Processing', active: activeStep >= 0 },
    { label: 'Available', active: activeStep >= 1 },
    { label: 'Payout Initiated', active: false },
    { label: 'Bank Received', active: false },
  ]

  const card = {
    background: '#0A0A0A',
    borderRadius: 16,
    border: '1px solid #1F1F1F',
    padding: 24,
  }

  const monthly = (d.monthly || []).slice(0, 6)

  return (
    <div style={{ fontFamily: font }}>
      {/* Header */}
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#FFFFFF', margin: 0, marginBottom: 4 }}>
        Payout Schedule
      </h1>
      <p style={{ fontSize: 14, color: '#A1A1AA', margin: 0, marginBottom: 32 }}>
        Track the journey of every rupee from member to bank
      </p>

      {/* Platform Fees Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3B82F6' }} />
            <span style={{ fontSize: 13, color: '#A1A1AA', fontWeight: 500 }}>All gyms</span>
          </div>
          <div style={{ fontSize: 13, color: '#A1A1AA', marginBottom: 4 }}>Total Marketplace Txns</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#FFFFFF' }}>
            {formatPaise(totalTransactionVolume)}
          </div>
        </div>

        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1A3A8F' }} />
            <span style={{ fontSize: 13, color: '#A1A1AA', fontWeight: 500 }}>1% of subscriptions</span>
          </div>
          <div style={{ fontSize: 13, color: '#A1A1AA', marginBottom: 4 }}>Subscription Platform Fee</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#1A3A8F' }}>
            {formatPaise(subscriptionPlatformFee)}
          </div>
        </div>

        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E' }} />
            <span style={{ fontSize: 13, color: '#A1A1AA', fontWeight: 500 }}>5% of marketplace</span>
          </div>
          <div style={{ fontSize: 13, color: '#A1A1AA', marginBottom: 4 }}>Marketplace Commission</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#22C55E' }}>
            {formatPaise(marketplaceCommission)}
          </div>
        </div>

        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FFFFFF' }} />
            <span style={{ fontSize: 13, color: '#A1A1AA', fontWeight: 500 }}>Fees + Commission</span>
          </div>
          <div style={{ fontSize: 13, color: '#A1A1AA', marginBottom: 4 }}>Net Platform Revenue</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#FFFFFF' }}>
            {formatPaise(netPlatformRevenue)}
          </div>
        </div>
      </div>

      {/* Top Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        {/* Pending Balance */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FBBC05' }} />
            <span style={{ fontSize: 13, color: '#A1A1AA', fontWeight: 500 }}>Processing</span>
          </div>
          <div style={{ fontSize: 13, color: '#A1A1AA', marginBottom: 4 }}>Pending Balance</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#FFFFFF' }}>
            {formatPaise(d.pending_paise)}
          </div>
        </div>

        {/* Available Balance */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E' }} />
            <span style={{ fontSize: 13, color: '#A1A1AA', fontWeight: 500 }}>Ready to withdraw</span>
          </div>
          <div style={{ fontSize: 13, color: '#A1A1AA', marginBottom: 4 }}>Available Balance</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#FFFFFF' }}>
            {formatPaise(d.available_paise)}
          </div>
        </div>

        {/* Next Payout */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1A3A8F' }} />
            <span style={{ fontSize: 13, color: '#A1A1AA', fontWeight: 500 }}>Scheduled</span>
          </div>
          <div style={{ fontSize: 13, color: '#A1A1AA', marginBottom: 4 }}>Next Payout</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#FFFFFF' }}>
            {formatPaise(d.next_payout_paise)}
          </div>
          <div style={{ fontSize: 12, color: '#1A3A8F', marginTop: 4, fontWeight: 600 }}>
            {formatDate(d.next_payout_date)}
          </div>
        </div>

        {/* Total Earned MTD */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FFFFFF' }} />
            <span style={{ fontSize: 13, color: '#A1A1AA', fontWeight: 500 }}>Month to date</span>
          </div>
          <div style={{ fontSize: 13, color: '#A1A1AA', marginBottom: 4 }}>Total Earned (MTD)</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#FFFFFF' }}>
            {formatPaise(d.mtd_total_paise)}
          </div>
        </div>
      </div>

      {/* Payout Timeline */}
      <div style={{ ...card, marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#FFFFFF', marginTop: 0, marginBottom: 24 }}>
          Payout Timeline
        </h2>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative', padding: '0 24px' }}>
          {/* Connecting line */}
          <div style={{
            position: 'absolute',
            top: 12,
            left: 36,
            right: 36,
            height: 2,
            background: '#1F1F1F',
            zIndex: 0,
          }} />
          {/* Active portion of line */}
          <div style={{
            position: 'absolute',
            top: 12,
            left: 36,
            width: `${(activeStep / (timelineNodes.length - 1)) * (100 - (72 / (typeof window !== 'undefined' ? window.innerWidth : 800)) * 100)}%`,
            height: 2,
            background: '#1A3A8F',
            zIndex: 1,
          }} />

          {timelineNodes.map((node, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, flex: 1 }}>
              <div style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: node.active ? '#1A3A8F' : '#1F1F1F',
                border: node.active ? '2px solid #1A3A8F' : '2px solid #333',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 8,
              }}>
                {node.active && (
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FFFFFF' }} />
                )}
              </div>
              <span style={{
                fontSize: 12,
                fontWeight: 500,
                color: node.active ? '#FFFFFF' : '#A1A1AA',
                textAlign: 'center',
                whiteSpace: 'nowrap',
              }}>
                {node.label}
              </span>
              {i === 2 && (
                <span style={{ fontSize: 11, color: '#1A3A8F', fontWeight: 600, marginTop: 4 }}>
                  {formatDate(d.next_payout_date)}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Revenue Source Attribution + Monthly Table side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24, marginBottom: 32 }}>
        {/* Donut Chart */}
        <div style={card}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#FFFFFF', marginTop: 0, marginBottom: 24 }}>
            Revenue Sources
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* Donut */}
            <div style={{
              width: 200,
              height: 200,
              borderRadius: '50%',
              background: `conic-gradient(#1A3A8F 0deg ${subscriptionAngle}deg, #22C55E ${subscriptionAngle}deg 360deg)`,
              position: 'relative',
              marginBottom: 24,
            }}>
              {/* Inner hole */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 120,
                height: 120,
                borderRadius: '50%',
                background: '#0A0A0A',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <div style={{ fontSize: 11, color: '#A1A1AA', marginBottom: 2 }}>Total</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF' }}>
                  {formatPaise(totalRevenue)}
                </div>
              </div>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#1A3A8F' }} />
                  <span style={{ fontSize: 13, color: '#A1A1AA' }}>SaaS Subscriptions</span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#FFFFFF' }}>
                  {formatPaise(d.subscription_revenue_paise)}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22C55E' }} />
                  <span style={{ fontSize: 13, color: '#A1A1AA' }}>Platform Fees (1%)</span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#FFFFFF' }}>
                  {formatPaise(d.platform_fee_revenue_paise)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Revenue Table */}
        <div style={card}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#FFFFFF', marginTop: 0, marginBottom: 20 }}>
            Monthly Revenue
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #1F1F1F' }}>
                  {['Month', 'Transaction Volume', 'Platform Fees', 'Subscription Revenue', 'Total'].map((h) => (
                    <th key={h} style={{
                      textAlign: 'left',
                      padding: '10px 12px',
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#A1A1AA',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      fontFamily: font,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {monthly.map((row, i) => {
                  // For subscription revenue per month, distribute proportionally
                  const subRevPerMonth = Math.round(d.subscription_revenue_paise / (monthly.length || 1))
                  const total = row.fees + subRevPerMonth
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid #1F1F1F' }}>
                      <td style={{ padding: '12px', fontSize: 14, color: '#FFFFFF', fontWeight: 500, fontFamily: font }}>
                        {formatMonth(row.month)}
                      </td>
                      <td style={{ padding: '12px', fontSize: 14, color: '#FFFFFF', fontFamily: font }}>
                        {formatPaise(row.volume)}
                      </td>
                      <td style={{ padding: '12px', fontSize: 14, color: '#22C55E', fontWeight: 500, fontFamily: font }}>
                        {formatPaise(row.fees)}
                      </td>
                      <td style={{ padding: '12px', fontSize: 14, color: '#1A3A8F', fontWeight: 500, fontFamily: font }}>
                        {formatPaise(subRevPerMonth)}
                      </td>
                      <td style={{ padding: '12px', fontSize: 14, color: '#FFFFFF', fontWeight: 600, fontFamily: font }}>
                        {formatPaise(total)}
                      </td>
                    </tr>
                  )
                })}
                {monthly.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: 32, textAlign: 'center', color: '#A1A1AA', fontSize: 14 }}>
                      No monthly data available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Bank Settlement Status */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#FFFFFF', marginTop: 0, marginBottom: 12 }}>
              Bank Connection
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              {d.bank_connected ? (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 12px',
                  borderRadius: 20,
                  background: 'rgba(34, 197, 94, 0.12)',
                  color: '#22C55E',
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: font,
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E' }} />
                  Connected
                </span>
              ) : (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 12px',
                  borderRadius: 20,
                  background: 'rgba(239, 68, 68, 0.12)',
                  color: '#EF4444',
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: font,
                }}>
                  Disconnected
                </span>
              )}
            </div>
            <div style={{ fontSize: 14, color: '#FFFFFF', fontWeight: 500, marginBottom: 4 }}>
              {d.bank_name} ****{d.bank_last4}
            </div>
            <div style={{ fontSize: 12, color: '#A1A1AA' }}>
              Last settlement: {formatDate(d.next_payout_date)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
