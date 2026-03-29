import { useState, useEffect } from 'react'
import { CheckCircle2, Circle, ChevronDown, ChevronUp, X } from 'lucide-react'

const STEPS = [
  {
    id: 'plan',
    label: 'Create your first membership plan',
    description: 'Set up pricing so members can join',
    link: '/dashboard/plans',
    checkFn: async (api) => {
      const res = await api.get('/plans')
      return (res.data?.plans?.length || 0) > 0
    }
  },
  {
    id: 'staff',
    label: 'Add your first staff member',
    description: 'Invite managers, trainers, or front desk',
    link: '/dashboard/staff',
    checkFn: async (api) => {
      // check via localStorage flag or skip API (avoid extra calls)
      return !!localStorage.getItem('ivira_onboard_staff')
    }
  },
  {
    id: 'member',
    label: 'Add your first member',
    description: 'Register a member and collect payment',
    link: '/dashboard/members',
    checkFn: async (api) => {
      return !!localStorage.getItem('ivira_onboard_member')
    }
  },
  {
    id: 'checkin',
    label: 'Test the check-in flow',
    description: 'Try QR code or OTP check-in',
    link: '/dashboard/checkins',
    checkFn: async (api) => {
      return !!localStorage.getItem('ivira_onboard_checkin')
    }
  },
  {
    id: 'class',
    label: 'Schedule your first class',
    description: 'Add a group class to your timetable',
    link: '/dashboard/classes',
    checkFn: async (api) => {
      return !!localStorage.getItem('ivira_onboard_class')
    }
  },
]

export default function OnboardingChecklist({ api, gymId }) {
  const DISMISSED_KEY = `ivira_onboard_dismissed_${gymId}`
  const [steps, setSteps] = useState(STEPS.map(s => ({ ...s, done: false, loading: true })))
  const [collapsed, setCollapsed] = useState(false)
  const [dismissed, setDismissed] = useState(() => !!localStorage.getItem(DISMISSED_KEY))

  useEffect(() => {
    if (dismissed) return
    Promise.all(
      STEPS.map(async (step, i) => {
        try {
          const done = await step.checkFn(api)
          setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, done, loading: false } : s))
        } catch {
          setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, done: false, loading: false } : s))
        }
      })
    )
  }, [dismissed])

  if (dismissed) return null

  const doneCount = steps.filter(s => s.done).length
  const allDone = doneCount === steps.length
  const progress = Math.round((doneCount / steps.length) * 100)

  // Auto-dismiss when all steps complete
  useEffect(() => {
    if (allDone && doneCount > 0) {
      setTimeout(() => {
        localStorage.setItem(DISMISSED_KEY, '1')
        setDismissed(true)
      }, 2000)
    }
  }, [allDone])

  const accent = '#6C63FF'
  const card = '#16213E'
  const border = 'rgba(255,255,255,0.08)'
  const text = '#F0F0FF'
  const textSec = 'rgba(240,240,255,0.55)'

  return (
    <div style={{
      background: card,
      border: `1px solid ${border}`,
      borderRadius: 16,
      marginBottom: 24,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div
        onClick={() => setCollapsed(!collapsed)}
        style={{
          padding: '16px 20px',
          display: 'flex', alignItems: 'center', gap: 12,
          cursor: 'pointer',
          borderBottom: collapsed ? 'none' : `1px solid ${border}`,
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: text }}>
              🚀 Get your gym set up
            </span>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '2px 8px',
              borderRadius: 20, background: `${accent}20`, color: accent,
            }}>
              {doneCount}/{steps.length} done
            </span>
          </div>
          <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <div style={{
              width: `${progress}%`, height: '100%',
              background: `linear-gradient(90deg, ${accent}, #9F67FF)`,
              borderRadius: 2, transition: 'width 0.5s ease',
            }} />
          </div>
        </div>
        <button
          onClick={e => { e.stopPropagation(); localStorage.setItem(DISMISSED_KEY, '1'); setDismissed(true) }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: textSec, padding: 4 }}
          aria-label="Dismiss checklist"
        >
          <X size={16} />
        </button>
        {collapsed ? <ChevronDown size={16} color={textSec} /> : <ChevronUp size={16} color={textSec} />}
      </div>

      {/* Steps */}
      {!collapsed && (
        <div style={{ padding: '8px 20px 16px' }}>
          {steps.map((step, i) => (
            <div
              key={step.id}
              onClick={() => { window.location.href = step.link }}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '10px 0',
                borderBottom: i < steps.length - 1 ? `1px solid ${border}` : 'none',
                cursor: 'pointer', opacity: step.loading ? 0.5 : 1,
              }}
            >
              {step.done
                ? <CheckCircle2 size={20} color={accent} style={{ flexShrink: 0 }} />
                : <Circle size={20} color={textSec} style={{ flexShrink: 0 }} />
              }
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 13, fontWeight: step.done ? 400 : 600,
                  color: step.done ? textSec : text,
                  textDecoration: step.done ? 'line-through' : 'none',
                }}>
                  {step.label}
                </div>
                {!step.done && (
                  <div style={{ fontSize: 11, color: textSec, marginTop: 1 }}>{step.description}</div>
                )}
              </div>
              {!step.done && (
                <span style={{ fontSize: 11, color: accent, fontWeight: 600 }}>Start →</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
