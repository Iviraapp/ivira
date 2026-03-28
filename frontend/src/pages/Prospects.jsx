// Gym Owner — Prospects Inbox (/owner/prospects)
import { useState } from 'react'
import {
  UserPlus, MapPin, Target, Send, Gift, X, Copy, CheckCircle,
  MessageSquare, Clock, Star, ChevronRight, Sparkles, Zap,
  Compass, KeyRound,
} from 'lucide-react'
import { format } from 'date-fns'

// ── Mock data ────────────────────────────────────────────────────────
const MOCK_PROSPECTS = [
  {
    id: 'p-001', first_name: 'Priya', goals: 'Weight Loss, Yoga & Flexibility',
    goal_detail: 'Wants morning yoga classes 4x a week with guided meditation',
    budget: '₹2,000–3,000/mo', distance_km: 1.2,
    submitted_at: '2026-03-20T10:30:00Z', status: 'new',
    source: 'discovery',
  },
  {
    id: 'p-002', first_name: 'Vikram', goals: 'Sports Training, HIIT / Cardio',
    goal_detail: 'Looking for HIIT sessions 3x a week plus basketball court access',
    budget: '₹4,000–6,000/mo', distance_km: 2.8,
    submitted_at: '2026-03-21T08:45:00Z', status: 'new',
    source: 'code_request',
  },
  {
    id: 'p-003', first_name: 'Meera', goals: 'Yoga & Flexibility, General Fitness',
    goal_detail: 'New to fitness, looking for beginner-friendly guided classes',
    budget: '₹2,500–4,000/mo', distance_km: 0.8,
    submitted_at: '2026-03-21T07:20:00Z', status: 'new',
    source: 'discovery',
  },
  {
    id: 'p-004', first_name: 'Arjun', goals: 'Muscle Gain',
    goal_detail: 'Wants access to powerlifting racks and personal trainer',
    budget: '₹3,000–5,000/mo', distance_km: 3.5,
    submitted_at: '2026-03-19T14:00:00Z', status: 'offered',
    source: 'discovery',
    offer: { tier: 'Pro Quarterly', code: 'GYM-AJ9K2X' },
  },
]

const MOCK_TIERS = [
  { id: 'tier-1', name: 'Monthly Starter', price: '₹1,999/mo', duration: '1 Month' },
  { id: 'tier-2', name: 'Quarterly Flex', price: '₹4,999/qtr', duration: '3 Months' },
  { id: 'tier-3', name: 'Pro Quarterly', price: '₹8,999/qtr', duration: '3 Months', popular: true },
  { id: 'tier-4', name: 'Annual Unlimited', price: '₹29,999/yr', duration: '12 Months' },
]

// ── Send Offer Modal ─────────────────────────────────────────────────
function OfferModal({ prospect, onClose, onSend }) {
  const [selectedTier, setSelectedTier] = useState(null)
  const [message, setMessage] = useState(
    `Hi ${prospect.first_name}! 🎉 We'd love to have you at our gym. Here's an exclusive offer just for you — tap the link to activate your membership instantly.`
  )
  const [sent, setSent] = useState(false)

  const [generatedCode] = useState(() => `GYM-${prospect.first_name.slice(0, 2).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`)

  const handleSend = () => {
    setSent(true)
    setTimeout(() => {
      onSend(prospect, selectedTier, generatedCode)
      onClose()
    }, 1500)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 540, background: '#0d0d14',
        border: '1px solid #1a1a2e', borderRadius: 16, overflow: 'hidden',
        maxHeight: '85vh', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid #1a1a2e',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Gift size={18} color="#10B981" />
              Send Offer to {prospect.first_name}
            </h3>
            <p style={{ color: '#888', fontSize: 13, margin: '4px 0 0' }}>
              Select a plan and customize your message
            </p>
          </div>
          <button onClick={onClose} style={{
            background: '#1a1a2e', border: 'none', borderRadius: 8,
            padding: 6, cursor: 'pointer', color: '#888',
          }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {/* Tier selection */}
          <p style={{ color: '#888', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 0 }}>
            Select membership tier
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {MOCK_TIERS.map(tier => {
              const isSelected = selectedTier?.id === tier.id
              return (
                <button key={tier.id} onClick={() => setSelectedTier(tier)} style={{
                  display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                  padding: '14px 16px', borderRadius: 10,
                  background: isSelected ? '#10B98112' : '#111118',
                  border: isSelected ? '1px solid #10B98140' : '1px solid #1a1a2e',
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>{tier.name}</span>
                      {tier.popular && (
                        <span style={{
                          padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                          background: '#F9731620', color: '#F97316', textTransform: 'uppercase',
                        }}>
                          Popular
                        </span>
                      )}
                    </div>
                    <span style={{ color: '#555', fontSize: 12 }}>{tier.duration}</span>
                  </div>
                  <span style={{ color: isSelected ? '#10B981' : '#888', fontSize: 15, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    {tier.price}
                  </span>
                  {isSelected && <CheckCircle size={16} color="#10B981" />}
                </button>
              )
            })}
          </div>

          {/* Custom message */}
          <p style={{ color: '#888', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 0 }}>
            Custom message
          </p>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={4}
            style={{
              width: '100%', background: '#111118', border: '1px solid #1a1a2e',
              borderRadius: 10, padding: 14, color: '#fff', fontSize: 14,
              resize: 'vertical', outline: 'none', lineHeight: 1.5,
              fontFamily: 'inherit', boxSizing: 'border-box',
            }}
          />

          {/* Generated code preview */}
          {selectedTier && (
            <div style={{
              marginTop: 16, padding: 14, background: '#10B98108',
              border: '1px solid #10B98120', borderRadius: 10,
            }}>
              <p style={{ color: '#888', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 8px' }}>
                Invite code (auto-generated)
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <code style={{
                  color: '#10B981', fontSize: 18, fontWeight: 800,
                  letterSpacing: 2, fontFamily: 'monospace',
                }}>
                  {generatedCode}
                </code>
                <button
                  onClick={() => navigator.clipboard?.writeText(generatedCode)}
                  style={{
                    background: '#1a1a2e', border: 'none', borderRadius: 6,
                    padding: '4px 8px', cursor: 'pointer', color: '#888',
                    display: 'flex', alignItems: 'center', gap: 4, fontSize: 11,
                  }}
                >
                  <Copy size={12} /> Copy
                </button>
              </div>
              <p style={{ color: '#555', fontSize: 11, margin: '6px 0 0' }}>
                {prospect.first_name} can enter this code in the IVIRA app to instantly activate their {selectedTier.name} membership.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid #1a1a2e',
          display: 'flex', gap: 10, justifyContent: 'flex-end',
        }}>
          <button onClick={onClose} style={{
            padding: '10px 20px', borderRadius: 10,
            background: '#1a1a2e', border: '1px solid #2a2a3e',
            color: '#888', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            Cancel
          </button>
          <button
            disabled={!selectedTier || sent}
            onClick={handleSend}
            style={{
              padding: '10px 24px', borderRadius: 10,
              background: selectedTier && !sent ? '#10B981' : '#1a1a2e',
              border: 'none', color: '#fff', fontSize: 13, fontWeight: 600,
              cursor: selectedTier && !sent ? 'pointer' : 'not-allowed',
              opacity: selectedTier && !sent ? 1 : 0.5,
              display: 'flex', alignItems: 'center', gap: 6,
              minWidth: 130, justifyContent: 'center',
            }}
          >
            {sent ? (
              <>
                <CheckCircle size={14} />
                Sent!
              </>
            ) : (
              <>
                <Send size={14} />
                Send Offer
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Prospect Card ────────────────────────────────────────────────────
function ProspectCard({ prospect, onSendOffer }) {
  const isNew = prospect.status === 'new'
  const distLabel = prospect.distance_km < 1
    ? `${Math.round(prospect.distance_km * 1000)}m away`
    : `${prospect.distance_km.toFixed(1)} km away`

  return (
    <div style={{
      background: '#0d0d14', border: '1px solid #1a1a2e', borderRadius: 14,
      padding: 22, transition: 'border-color 0.15s',
      borderLeft: isNew ? '3px solid #10B981' : '3px solid #22C55E',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        {/* Left */}
        <div style={{ flex: 1, minWidth: 220 }}>
          {/* Name row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 21,
              background: isNew ? '#10B98115' : '#22C55E15',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: isNew ? '#10B981' : '#22C55E',
              fontSize: 16, fontWeight: 700,
            }}>
              {prospect.first_name[0]}
            </div>
            <div>
              <div style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>
                {prospect.first_name}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#888', fontSize: 12 }}>
                <MapPin size={11} />
                {distLabel}
                <span style={{ color: '#333' }}>·</span>
                <Clock size={11} />
                {format(new Date(prospect.submitted_at), 'dd MMM, hh:mm a')}
              </div>
            </div>
            {isNew && (
              <span style={{
                padding: '3px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                background: '#10B98120', color: '#10B981',
                textTransform: 'uppercase', letterSpacing: 0.5,
                animation: 'pulse 2s infinite',
              }}>
                New
              </span>
            )}
            {prospect.source === 'discovery' && (
              <span style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '3px 9px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                background: '#8B5CF615', color: '#A78BFA',
                textTransform: 'uppercase', letterSpacing: 0.3,
              }}>
                <Compass size={10} />
                IVIRA Discovery
              </span>
            )}
            {prospect.source === 'code_request' && (
              <span style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '3px 9px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                background: '#F9731615', color: '#F97316',
                textTransform: 'uppercase', letterSpacing: 0.3,
              }}>
                <KeyRound size={10} />
                Code Request
              </span>
            )}
          </div>

          {/* Goals card */}
          <div style={{
            background: '#111118', borderRadius: 10, padding: 14, marginBottom: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Target size={13} color="#8B5CF6" />
              <span style={{ color: '#888', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                Goals
              </span>
            </div>
            <p style={{ color: '#ccc', fontSize: 14, margin: 0, lineHeight: 1.5, fontWeight: 500 }}>
              {prospect.goal_detail}
            </p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              {prospect.goals.split(', ').map(g => (
                <span key={g} style={{
                  padding: '3px 9px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                  background: '#8B5CF615', color: '#A78BFA',
                }}>
                  {g}
                </span>
              ))}
            </div>
          </div>

          {/* Budget */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#22C55E', fontSize: 13, fontWeight: 600 }}>
            <Sparkles size={13} />
            Budget: {prospect.budget}
          </div>

          {/* Existing offer */}
          {prospect.offer && (
            <div style={{
              marginTop: 10, display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px', background: '#22C55E10', borderRadius: 8,
              border: '1px solid #22C55E20',
            }}>
              <CheckCircle size={14} color="#22C55E" />
              <span style={{ color: '#22C55E', fontSize: 12, fontWeight: 600 }}>
                Offer sent — {prospect.offer.tier}
              </span>
              <code style={{ color: '#888', fontSize: 11, fontFamily: 'monospace' }}>
                {prospect.offer.code}
              </code>
            </div>
          )}
        </div>

        {/* Action */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {isNew ? (
            <button
              onClick={() => onSendOffer(prospect)}
              style={{
                padding: '12px 24px', borderRadius: 10,
                background: '#10B981', border: 'none',
                color: '#fff', fontSize: 14, fontWeight: 700,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                whiteSpace: 'nowrap', transition: 'opacity 0.15s',
                boxShadow: '0 4px 16px rgba(0,82,255,0.3)',
              }}
            >
              <Gift size={16} />
              Send Offer
            </button>
          ) : (
            <button style={{
              padding: '10px 20px', borderRadius: 10,
              background: '#1a1a2e', border: '1px solid #2a2a3e',
              color: '#888', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <MessageSquare size={14} />
              Follow Up
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────
export default function Prospects() {
  const [prospects, setProspects] = useState(MOCK_PROSPECTS)
  const [offerModal, setOfferModal] = useState(null)
  const [sourceFilter, setSourceFilter] = useState('all')

  const filteredProspects = prospects.filter(p => {
    if (sourceFilter !== 'all' && p.source !== sourceFilter) return false
    return true
  })

  const newCount = prospects.filter(p => p.status === 'new').length

  const handleSendOffer = (prospect, tier, code) => {
    setProspects(prev => prev.map(p =>
      p.id === prospect.id
        ? { ...p, status: 'offered', offer: { tier: tier.name, code } }
        : p
    ))
  }

  return (
    <div>
      {/* Header with count highlight */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #10B981, #059669)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <UserPlus size={18} color="#fff" />
          </div>
          <div>
            <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 700, margin: 0 }}>
              New Prospects
            </h1>
            <p style={{ color: '#666', fontSize: 14, margin: '2px 0 0' }}>
              Hot leads matched to your gym by IVIRA Concierge
            </p>
          </div>
        </div>
      </div>

      {/* Motivating banner */}
      {newCount > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #10B98110, #8B5CF610)',
          border: '1px solid #10B98120', borderRadius: 14,
          padding: '18px 22px', marginBottom: 24,
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: '#10B98120', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={22} color="#10B981" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#fff', fontSize: 15, fontWeight: 700 }}>
              {newCount} new prospect{newCount !== 1 ? 's' : ''} in your area!
            </div>
            <div style={{ color: '#888', fontSize: 13 }}>
              Send them an exclusive offer before they choose another gym.
            </div>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            color: '#F97316', fontSize: 13, fontWeight: 600,
          }}>
            <Star size={14} fill="#F97316" />
            Respond quickly for best conversion
          </div>
        </div>
      )}

      {/* Source filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[
          { key: 'all', label: 'All' },
          { key: 'discovery', label: 'Discovery' },
          { key: 'code_request', label: 'Code Requests' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setSourceFilter(f.key)}
            style={{
              padding: '7px 16px', borderRadius: 8,
              background: sourceFilter === f.key ? '#ffffff10' : '#0d0d14',
              border: sourceFilter === f.key ? '1px solid #ffffff30' : '1px solid #1a1a2e',
              color: sourceFilter === f.key ? '#fff' : '#666',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Prospect list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {filteredProspects.map(prospect => (
          <ProspectCard
            key={prospect.id}
            prospect={prospect}
            onSendOffer={setOfferModal}
          />
        ))}

        {filteredProspects.length === 0 && (
          <div style={{
            padding: 48, textAlign: 'center', color: '#555',
            background: '#0d0d14', border: '1px solid #1a1a2e', borderRadius: 14,
          }}>
            <UserPlus size={32} color="#333" style={{ marginBottom: 12 }} />
            <div style={{ color: '#888', fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
              No prospects yet
            </div>
            <div style={{ color: '#555', fontSize: 13 }}>
              New leads will appear here when matched to your gym.
            </div>
          </div>
        )}
      </div>

      {/* Send Offer Modal */}
      {offerModal && (
        <OfferModal
          prospect={offerModal}
          onClose={() => setOfferModal(null)}
          onSend={handleSendOffer}
        />
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  )
}
