import { useState, useEffect, useCallback } from 'react'
import { useTheme } from '../../context/ThemeContext'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'

const BRAND = '#1A3A8F'
const FONT = "'Inter', -apple-system, sans-serif"
const FONT_NUM = "'JetBrains Mono', monospace"

function MetricCard({ title, value, subtitle, trend, trendValue, icon, color, isDark }) {
  const trendColor = trend === 'up' ? '#22C55E' : trend === 'down' ? '#EA4335' : '#94A3B8'
  return (
    <div style={{
      background: isDark ? '#111114' : '#fff',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
      borderTop: `3px solid ${color || BRAND}`,
      borderRadius: 12,
      padding: '20px 22px',
      flex: 1,
      minWidth: 200,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: isDark ? 'rgba(255,255,255,0.45)' : '#64748B', fontFamily: FONT, fontWeight: 500 }}>
          {title}
        </span>
        {icon && <span style={{ fontSize: 18 }}>{icon}</span>}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, fontFamily: FONT_NUM, color: isDark ? '#fff' : '#111', letterSpacing: '-0.5px' }}>
        {value}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
        {trendValue != null && (
          <span style={{ fontSize: 12, fontWeight: 600, fontFamily: FONT_NUM, color: trendColor }}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {Math.abs(trendValue)}%
          </span>
        )}
        {subtitle && (
          <span style={{ fontSize: 11, color: isDark ? 'rgba(255,255,255,0.35)' : '#94A3B8', fontFamily: FONT }}>
            {subtitle}
          </span>
        )}
      </div>
    </div>
  )
}

function InsightCard({ insight, isDark }) {
  const colors = {
    warning: { bg: '#FEF3C7', border: '#F59E0B', icon: '⚠️', text: '#92400E' },
    alert: { bg: '#FEE2E2', border: '#EA4335', icon: '🚨', text: '#991B1B' },
    success: { bg: '#D1FAE5', border: '#22C55E', icon: '✅', text: '#065F46' },
    info: { bg: '#DBEAFE', border: BRAND, icon: '💡', text: '#1E3A8A' },
    compliance: { bg: '#EDE9FE', border: '#7C3AED', icon: '📋', text: '#5B21B6' },
  }
  const c = colors[insight.type] || colors.info
  if (isDark) {
    c.bg = c.border + '12'
    c.text = '#fff'
  }

  return (
    <div style={{
      background: c.bg,
      border: `1px solid ${c.border}30`,
      borderLeft: `4px solid ${c.border}`,
      borderRadius: 10,
      padding: '14px 18px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span>{c.icon}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: c.text, fontFamily: FONT }}>{insight.title}</span>
        <span style={{
          marginLeft: 'auto', fontSize: 10, fontWeight: 600,
          padding: '2px 8px', borderRadius: 10,
          background: insight.priority === 'critical' ? '#DC262620' : insight.priority === 'high' ? '#F59E0B20' : '#22C55E20',
          color: insight.priority === 'critical' ? '#DC2626' : insight.priority === 'high' ? '#F59E0B' : '#22C55E',
          fontFamily: FONT, textTransform: 'uppercase',
        }}>
          {insight.priority}
        </span>
      </div>
      <p style={{ fontSize: 13, color: isDark ? 'rgba(255,255,255,0.7)' : c.text, lineHeight: '19px', margin: 0, fontFamily: FONT }}>
        {insight.message}
      </p>
      {insight.action && (
        <div style={{ marginTop: 10, fontSize: 12, fontWeight: 600, color: c.border, fontFamily: FONT, cursor: 'pointer' }}>
          → {insight.action}
        </div>
      )}
    </div>
  )
}

function LeakageCard({ leakage, isDark }) {
  const priorityColors = { critical: '#DC2626', high: '#F59E0B', medium: '#3B82F6', low: '#22C55E' }
  const color = priorityColors[leakage.priority] || '#94A3B8'

  return (
    <div style={{
      background: isDark ? '#111114' : '#fff',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
      borderRadius: 10,
      padding: '16px 18px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: isDark ? '#fff' : '#111', fontFamily: FONT }}>{leakage.title}</span>
        <span style={{ fontSize: 16, fontWeight: 800, color, fontFamily: FONT_NUM }}>{leakage.amount_formatted}</span>
      </div>
      <p style={{ fontSize: 12, color: isDark ? 'rgba(255,255,255,0.5)' : '#64748B', lineHeight: '17px', margin: '0 0 10px', fontFamily: FONT }}>
        {leakage.description}
      </p>
      <div style={{
        fontSize: 12, fontWeight: 600, color: BRAND, fontFamily: FONT,
        padding: '8px 14px', borderRadius: 8,
        background: isDark ? BRAND + '15' : BRAND + '08',
        cursor: 'pointer',
      }}>
        {leakage.action}
      </div>
    </div>
  )
}

function NudgeRow({ nudge, isDark }) {
  const urgencyColors = { critical: '#DC2626', high: '#F59E0B', medium: '#3B82F6', low: '#22C55E' }
  const channelIcons = { whatsapp: '💬', sms: '📱', call: '📞', email: '✉️' }
  const color = urgencyColors[nudge.urgency]

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 0',
      borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}`,
    }}>
      <div style={{ width: 36, height: 36, borderRadius: 18, background: color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color, fontFamily: FONT }}>
        {nudge.days_overdue}d
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: isDark ? '#fff' : '#111', fontFamily: FONT }}>{nudge.name}</div>
        <div style={{ fontSize: 11, color: isDark ? 'rgba(255,255,255,0.4)' : '#94A3B8', fontFamily: FONT }}>{nudge.plan} · {nudge.amount}</div>
      </div>
      <span style={{ fontSize: 18 }} title={nudge.suggested_channel}>{channelIcons[nudge.suggested_channel]}</span>
      <span style={{
        fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 10,
        background: color + '15', color, fontFamily: FONT, textTransform: 'uppercase',
      }}>
        {nudge.urgency}
      </span>
    </div>
  )
}

export default function Finance() {
  const { isDark } = useTheme()
  const { gymId } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeSection, setActiveSection] = useState('overview')

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.get(`/gyms/${gymId}/finance/summary`)
      setData(res.data?.data || res.data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [gymId])

  useEffect(() => { if (gymId) fetchData() }, [fetchData, gymId])

  const bg = isDark ? '#0A0A0C' : '#F8FAFC'
  const text = isDark ? '#fff' : '#111'
  const textSec = isDark ? 'rgba(255,255,255,0.5)' : '#64748B'

  if (loading) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: textSec, fontFamily: FONT }}>
        Loading financial intelligence...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: '#EA4335', fontFamily: FONT }}>
        {error}
      </div>
    )
  }

  const sections = [
    { key: 'overview', label: 'Overview', icon: '📊' },
    { key: 'leakage', label: 'Revenue Leaks', icon: '🔍' },
    { key: 'nudges', label: 'Payment Nudges', icon: '💬' },
    { key: 'tax', label: 'Tax Compliance', icon: '📋' },
  ]

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 22 }}>🧠</span>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: text, fontFamily: FONT, margin: 0, letterSpacing: '-0.5px' }}>
            Financial Intelligence
          </h1>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 10,
            background: BRAND + '15', color: BRAND, fontFamily: FONT, textTransform: 'uppercase',
          }}>
            Powered by Vira
          </span>
        </div>
        <p style={{ fontSize: 13, color: textSec, fontFamily: FONT, margin: 0 }}>
          AI-powered revenue insights, leakage detection, and compliance monitoring
        </p>
      </div>

      {/* Section Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {sections.map(s => (
          <button
            key={s.key}
            onClick={() => setActiveSection(s.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 10,
              border: `1px solid ${activeSection === s.key ? BRAND : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
              background: activeSection === s.key ? BRAND + '12' : 'transparent',
              color: activeSection === s.key ? BRAND : textSec,
              fontSize: 13, fontWeight: 600, fontFamily: FONT,
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            <span>{s.icon}</span> {s.label}
          </button>
        ))}
      </div>

      {/* Metric Cards */}
      {activeSection === 'overview' && data && (
        <>
          <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
            <MetricCard
              title="Monthly Recurring Revenue"
              value={data.mrr?.mrr_formatted || '₹0'}
              trend={data.mrr?.trend}
              trendValue={data.mrr?.change_pct}
              subtitle="vs last month"
              icon="💰"
              color="#22C55E"
              isDark={isDark}
            />
            <MetricCard
              title="Revenue Per Member"
              value={data.arpu?.arpu_formatted || '₹0'}
              trend={data.arpu?.trend}
              trendValue={data.arpu?.change_pct}
              subtitle={`${data.arpu?.active_members || 0} active members`}
              icon="👤"
              color={BRAND}
              isDark={isDark}
            />
            <MetricCard
              title="Payment Recovery"
              value={`${data.payment_recovery?.recovery_rate || 0}%`}
              subtitle={`${data.payment_recovery?.total_failed || 0} failed, ${data.payment_recovery?.total_recovered || 0} recovered`}
              icon="🔄"
              color={data.payment_recovery?.recovery_rate >= 70 ? '#22C55E' : '#F59E0B'}
              isDark={isDark}
            />
            <MetricCard
              title="Revenue at Risk"
              value={data.revenue_leakage?.total_formatted || '₹0'}
              subtitle={`${data.revenue_leakage?.leakages?.length || 0} active leaks`}
              icon="⚠️"
              color={data.revenue_leakage?.health_score?.color || '#EA4335'}
              isDark={isDark}
            />
          </div>

          {/* Financial Health Score */}
          {data.revenue_leakage?.health_score && (
            <div style={{
              background: isDark ? '#111114' : '#fff',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
              borderRadius: 12, padding: '20px 24px', marginBottom: 20,
              display: 'flex', alignItems: 'center', gap: 20,
            }}>
              <div style={{
                width: 60, height: 60, borderRadius: 30,
                background: data.revenue_leakage.health_score.color + '15',
                border: `3px solid ${data.revenue_leakage.health_score.color}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 20, fontWeight: 900, color: data.revenue_leakage.health_score.color, fontFamily: FONT_NUM }}>
                  {data.revenue_leakage.health_score.score}
                </span>
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: text, fontFamily: FONT }}>
                  Financial Health: {data.revenue_leakage.health_score.label}
                </div>
                <div style={{ fontSize: 12, color: textSec, fontFamily: FONT, marginTop: 2 }}>
                  Based on revenue leakage, payment recovery, and member retention
                </div>
              </div>
            </div>
          )}

          {/* AI Insights */}
          {data.insights?.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: text, fontFamily: FONT, marginBottom: 12 }}>
                AI Insights
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {data.insights.map((insight, i) => (
                  <InsightCard key={i} insight={insight} isDark={isDark} />
                ))}
              </div>
            </div>
          )}

          {/* Overdue Summary */}
          {data.pending_nudges?.total_count > 0 && (
            <div style={{
              background: isDark ? '#111114' : '#fff',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
              borderRadius: 12, padding: '20px 24px', marginBottom: 20,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: text, fontFamily: FONT, margin: 0 }}>
                  Overdue Payments
                </h3>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#EA4335', fontFamily: FONT_NUM }}>
                  {data.pending_nudges.total_overdue_formatted}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {Object.entries(data.pending_nudges.urgency_breakdown || {}).map(([level, count]) => (
                  count > 0 && (
                    <span key={level} style={{
                      fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 8,
                      background: level === 'critical' ? '#DC262615' : level === 'high' ? '#F59E0B15' : level === 'medium' ? '#3B82F615' : '#22C55E15',
                      color: level === 'critical' ? '#DC2626' : level === 'high' ? '#F59E0B' : level === 'medium' ? '#3B82F6' : '#22C55E',
                      fontFamily: FONT,
                    }}>
                      {count} {level}
                    </span>
                  )
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Leakage Section */}
      {activeSection === 'leakage' && data?.revenue_leakage && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {data.revenue_leakage.leakages.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#22C55E', fontFamily: FONT, fontSize: 15, fontWeight: 600 }}>
              No revenue leaks detected. Your finances look healthy!
            </div>
          ) : (
            data.revenue_leakage.leakages.map((leak, i) => (
              <LeakageCard key={i} leakage={leak} isDark={isDark} />
            ))
          )}
        </div>
      )}

      {/* Nudges Section */}
      {activeSection === 'nudges' && data?.pending_nudges && (
        <div style={{
          background: isDark ? '#111114' : '#fff',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
          borderRadius: 12, padding: '20px 24px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: text, fontFamily: FONT, margin: 0 }}>
                Members Needing Payment Follow-up
              </h3>
              <p style={{ fontSize: 12, color: textSec, fontFamily: FONT, margin: '4px 0 0' }}>
                Suggested channels and messages based on overdue duration
              </p>
            </div>
            <button style={{
              padding: '8px 16px', borderRadius: 8, border: 'none',
              background: BRAND, color: '#fff', fontSize: 12, fontWeight: 700,
              fontFamily: FONT, cursor: 'pointer',
            }}>
              Send All Nudges
            </button>
          </div>
          {data.pending_nudges.members.length === 0 ? (
            <div style={{ padding: 30, textAlign: 'center', color: '#22C55E', fontFamily: FONT }}>
              All members are up to date with payments!
            </div>
          ) : (
            data.pending_nudges.members.slice(0, 20).map((nudge, i) => (
              <NudgeRow key={i} nudge={nudge} isDark={isDark} />
            ))
          )}
        </div>
      )}

      {/* Tax Compliance Section */}
      {activeSection === 'tax' && data?.tax_compliance && (
        <div style={{
          background: isDark ? '#111114' : '#fff',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
          borderRadius: 12, padding: '24px 28px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <span style={{ fontSize: 28 }}>🏛️</span>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: text, fontFamily: FONT, margin: 0 }}>
                {data.tax_compliance.tax_label}
              </h3>
              <p style={{ fontSize: 12, color: textSec, fontFamily: FONT, margin: 0 }}>
                {data.tax_compliance.country} · {data.tax_compliance.currency}
              </p>
            </div>
            <div style={{
              marginLeft: 'auto', fontSize: 28, fontWeight: 900, fontFamily: FONT_NUM,
              color: BRAND,
            }}>
              {data.tax_compliance.rate}%
            </div>
          </div>

          {/* Tax Components */}
          {Object.keys(data.tax_compliance.components || {}).length > 0 && (
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
              {Object.entries(data.tax_compliance.components).map(([key, val]) => (
                <div key={key} style={{
                  padding: '12px 20px', borderRadius: 10,
                  background: isDark ? 'rgba(255,255,255,0.04)' : '#F1F5F9',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: text, fontFamily: FONT_NUM }}>{val}%</div>
                  <div style={{ fontSize: 11, color: textSec, fontFamily: FONT, fontWeight: 600, marginTop: 2 }}>{key}</div>
                </div>
              ))}
            </div>
          )}

          {/* HSN Code */}
          {data.tax_compliance.hsn_code && (
            <div style={{
              padding: '10px 16px', borderRadius: 8,
              background: isDark ? 'rgba(255,255,255,0.04)' : '#FFF7ED',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#FED7AA'}`,
              marginBottom: 16,
            }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: isDark ? '#F59E0B' : '#92400E', fontFamily: FONT }}>
                HSN Code: <span style={{ fontFamily: FONT_NUM }}>{data.tax_compliance.hsn_code}</span> — Fitness Services
              </span>
            </div>
          )}

          {/* Compliance Notes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(data.tax_compliance.compliance_notes || []).map((note, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ fontSize: 12, marginTop: 2 }}>✓</span>
                <span style={{ fontSize: 13, color: isDark ? 'rgba(255,255,255,0.65)' : '#374151', fontFamily: FONT, lineHeight: '19px' }}>
                  {note}
                </span>
              </div>
            ))}
          </div>

          {/* Gateway Recommendation */}
          <div style={{
            marginTop: 20, padding: '14px 18px', borderRadius: 10,
            background: BRAND + '08', border: `1px solid ${BRAND}20`,
          }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: BRAND, fontFamily: FONT }}>
              Recommended Gateway: {data.tax_compliance.recommended_gateway === 'razorpay' ? 'Razorpay (UPI, Cards, Net Banking)' : 'Stripe (Cards, ACH, SEPA)'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
