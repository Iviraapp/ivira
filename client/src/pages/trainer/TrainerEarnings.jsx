import { useState, useEffect } from 'react'
import { Wallet, TrendingUp, Clock, CheckCircle } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import api from '../../lib/api'

const FONT = "'Inter', -apple-system, sans-serif"
const FONT_M = "'JetBrains Mono', monospace"

export default function TrainerEarnings() {
  const { theme } = useTheme()
  const [earnings, setEarnings] = useState({ payouts: [], summary: { monthlyEarnings: 0, paidAmount: 0, pendingAmount: 0, totalSessions: 0 } })

  useEffect(() => {
    const fetchEarnings = async () => {
      try {
        const token = localStorage.getItem('ivira_trainer_token')
        const { data } = await api.get('/trainer/earnings', { headers: { Authorization: `Bearer ${token}` } })
        if (data?.summary) setEarnings(data)
      } catch {}
    }
    fetchEarnings()
  }, [])

  const formatPaise = (p) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(p / 100)
  const { summary } = earnings

  const stats = [
    { label: "This Month's Take-Home (70%)", value: formatPaise(summary.monthlyEarnings), icon: Wallet, color: '#FFFFFF' },
    { label: 'Paid', value: formatPaise(summary.paidAmount), icon: CheckCircle, color: theme.green },
    { label: 'Pending', value: formatPaise(summary.pendingAmount), icon: Clock, color: theme.amber || '#F59E0B' },
    { label: 'Sessions', value: summary.totalSessions, icon: TrendingUp, color: theme.brandAccent },
  ]

  return (
    <div style={{ fontFamily: FONT }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: theme.text, margin: '0 0 24px' }}>Earnings</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
        {stats.map((s, i) => (
          <div key={i} style={{
            background: i === 0 ? `linear-gradient(135deg, ${theme.brandAccent}20, ${theme.bg})` : (theme.cardBg || theme.bgSec),
            borderRadius: 14, padding: 20,
            border: `1px solid ${i === 0 ? theme.brandAccent + '40' : theme.border}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <s.icon size={16} color={s.color} />
              <span style={{ fontSize: 12, color: theme.textSec }}>{s.label}</span>
            </div>
            <div style={{ fontSize: i === 0 ? 32 : 24, fontWeight: 700, color: s.color, fontFamily: FONT_M }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Payout Table */}
      <h2 style={{ fontSize: 16, fontWeight: 600, color: theme.text, marginBottom: 16 }}>Recent Transactions</h2>
      <div style={{
        background: theme.cardBg || theme.bgSec, borderRadius: 14,
        border: `1px solid ${theme.border}`, overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: FONT }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
              {['Date', 'Total Paid', 'Your Cut (70%)', 'Status'].map(h => (
                <th key={h} style={{
                  padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600,
                  color: theme.textTer, textTransform: 'uppercase', letterSpacing: '0.5px',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {earnings.payouts.length === 0 ? (
              <tr><td colSpan={4} style={{ padding: 40, textAlign: 'center', color: theme.textSec }}>
                No transactions yet. Earnings appear here after clients book sessions.
              </td></tr>
            ) : earnings.payouts.map((p, i) => (
              <tr key={p.id || i} style={{ borderBottom: `1px solid ${theme.border}08` }}>
                <td style={{ padding: '12px 16px', fontSize: 13, color: theme.textSec, fontFamily: FONT_M }}>
                  {new Date(p.created_at).toLocaleDateString('en-IN')}
                </td>
                <td style={{ padding: '12px 16px', fontSize: 14, color: '#64748B', fontFamily: FONT_M }}>
                  {formatPaise(p.total_amount_paise)}
                </td>
                <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600, color: '#FFFFFF', fontFamily: FONT_M }}>
                  {formatPaise(p.trainer_payout_paise)}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 4,
                    background: p.payout_status === 'paid' ? theme.green + '18' : '#F59E0B18',
                    color: p.payout_status === 'paid' ? theme.green : '#F59E0B',
                  }}>{p.payout_status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
