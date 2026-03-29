import { useState, useEffect } from 'react'
import { Check, Lock, Zap } from 'lucide-react'

const PLAN_FEATURES = {
  starter: {
    label: 'Starter',
    color: '#64748B',
    features: ['Members (up to 50)', 'Check-ins', 'Basic payments', 'Email support'],
    locked: ['Classes', 'Staff management', 'Analytics', 'AI Coach', 'Marketplace'],
  },
  growth: {
    label: 'Growth',
    color: '#6C63FF',
    features: ['Members (up to 500)', 'Check-ins', 'Payments + Dunning', 'Classes', 'Staff management', 'Basic analytics', 'AI Coach'],
    locked: ['White-label', 'Advanced analytics', 'Marketplace', 'Multiple locations'],
  },
  pro: {
    label: 'Pro',
    color: '#F59E0B',
    features: ['Unlimited members', 'All features', 'White-label', 'Advanced analytics', 'Marketplace', 'Priority support', 'Multiple locations'],
    locked: [],
  },
}

export default function PlanFeatures({ api, gymId }) {
  const [sub, setSub] = useState(null)
  const [loading, setLoading] = useState(true)
  const [trialDaysLeft, setTrialDaysLeft] = useState(null)

  useEffect(() => {
    api.get(`/gyms/${gymId}/subscriptions/current`)
      .then(r => setSub(r.data))
      .catch(() => {/* no subscription */})
      .finally(() => setLoading(false))

    // Check trial from gym created_at in localStorage
    const gymData = JSON.parse(localStorage.getItem('ivira_gym') || '{}')
    if (gymData.created_at) {
      const createdAt = new Date(gymData.created_at)
      const trialEnd = new Date(createdAt)
      trialEnd.setDate(trialEnd.getDate() + 14)
      const daysLeft = Math.ceil((trialEnd - Date.now()) / (1000 * 60 * 60 * 24))
      setTrialDaysLeft(Math.max(0, daysLeft))
    }
  }, [gymId])

  const planKey = sub?.plan_name?.toLowerCase() || 'starter'
  const plan = PLAN_FEATURES[planKey] || PLAN_FEATURES.starter
  const isTrial = !sub || sub.status === 'trial'

  const accent = '#6C63FF'
  const card = '#16213E'
  const border = 'rgba(255,255,255,0.08)'
  const text = '#F0F0FF'
  const textSec = 'rgba(240,240,255,0.55)'

  if (loading) return null

  return (
    <div style={{
      background: card,
      border: `1px solid ${isTrial ? '#F59E0B40' : border}`,
      borderRadius: 16, padding: '20px',
      marginBottom: 24,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap size={16} color={plan.color} />
            <span style={{ fontSize: 14, fontWeight: 700, color: text }}>
              {plan.label} Plan
            </span>
            {isTrial && (
              <span style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 20,
                background: '#F59E0B20', color: '#F59E0B', fontWeight: 600,
              }}>
                Trial{trialDaysLeft !== null ? ` — ${trialDaysLeft}d left` : ''}
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: textSec, marginTop: 4 }}>
            {isTrial ? 'Upgrade to keep full access after trial' : 'Your active subscription'}
          </div>
        </div>
        {isTrial && (
          <a href="/dashboard/billing" style={{
            fontSize: 12, fontWeight: 600, color: '#fff',
            background: `linear-gradient(135deg, ${accent}, #9F67FF)`,
            padding: '8px 16px', borderRadius: 8, textDecoration: 'none',
          }}>
            Upgrade
          </a>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {plan.features.map(f => (
          <div key={f} style={{
            display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 12, color: text,
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${border}`,
            borderRadius: 6, padding: '4px 10px',
          }}>
            <Check size={12} color={plan.color} />
            {f}
          </div>
        ))}
        {plan.locked.map(f => (
          <div key={f} style={{
            display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 12, color: textSec,
            background: 'rgba(255,255,255,0.02)',
            border: `1px solid ${border}`,
            borderRadius: 6, padding: '4px 10px',
            opacity: 0.6,
          }}>
            <Lock size={11} color={textSec} />
            {f}
          </div>
        ))}
      </div>
    </div>
  )
}
