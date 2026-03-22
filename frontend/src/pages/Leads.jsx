// Superadmin — Global Lead Pool (/superadmin/leads)
import { useState } from 'react'
import {
  Globe, MapPin, Target, Clock, ArrowRight,
  Search, Filter, ChevronDown, X, Send, Building2,
  CheckCircle, AlertCircle, Users, Compass, KeyRound, Sparkles,
} from 'lucide-react'
import { format } from 'date-fns'

// ── Mock data ────────────────────────────────────────────────────────
const MOCK_LEADS = [
  {
    id: 'lead-001', name: 'Priya Sharma', email: 'priya.s@gmail.com',
    phone: '+919876543210', location: 'Koramangala, Bengaluru', zip: '560034',
    goals: ['Weight Loss', 'Yoga & Flexibility'], budget: '₹2,000–3,000/mo',
    status: 'pending', submitted_at: '2026-03-20T10:30:00Z',
    source: 'discovery',
    notes: 'Prefers morning batches, has a recurring knee injury.',
  },
  {
    id: 'lead-002', name: 'Rahul Desai', email: 'rahul.desai@outlook.com',
    phone: '+919123456789', location: 'Banjara Hills, Hyderabad', zip: '500034',
    goals: ['Muscle Gain', 'HIIT / Cardio'], budget: '₹3,000–5,000/mo',
    status: 'routed', submitted_at: '2026-03-19T14:15:00Z',
    routed_to: 'FitZone Pro Gym', routed_at: '2026-03-19T16:00:00Z',
    source: 'discovery',
    notes: 'Looking for a gym with powerlifting equipment.',
  },
  {
    id: 'lead-003', name: 'Ananya Iyer', email: 'ananya.iyer@yahoo.com',
    phone: '+919988776655', location: 'Adyar, Chennai', zip: '600020',
    goals: ['General Fitness'], budget: '₹1,500–2,500/mo',
    status: 'closed', submitted_at: '2026-03-17T09:00:00Z',
    routed_to: 'Iron Paradise', routed_at: '2026-03-17T11:30:00Z',
    closed_at: '2026-03-18T10:00:00Z',
    source: 'discovery',
    notes: 'Converted — joined Iron Paradise quarterly plan.',
  },
  {
    id: 'lead-004', name: 'Vikram Reddy', email: 'vikram.r@proton.me',
    phone: '+919871234567', location: 'Andheri West, Mumbai', zip: '400058',
    goals: ['Sports Training', 'HIIT / Cardio'], budget: '₹4,000–6,000/mo',
    status: 'pending', submitted_at: '2026-03-21T08:45:00Z',
    source: 'code_request',
    notes: 'Wants access to swimming pool and basketball court.',
  },
  {
    id: 'lead-005', name: 'Meera Kulkarni', email: 'meera.k@gmail.com',
    phone: '+919654321098', location: 'Whitefield, Bengaluru', zip: '560066',
    goals: ['Yoga & Flexibility', 'General Fitness'], budget: '₹2,500–4,000/mo',
    status: 'pending', submitted_at: '2026-03-21T07:20:00Z',
    source: 'discovery',
    notes: 'New to fitness, looking for guided classes.',
  },
]

const MOCK_PARTNER_GYMS = [
  { id: 'gym-001', name: 'FitZone Pro Gym', city: 'Bengaluru', area: 'Koramangala', members: 340 },
  { id: 'gym-002', name: 'Iron Paradise', city: 'Chennai', area: 'T. Nagar', members: 210 },
  { id: 'gym-003', name: 'PowerHouse Fitness', city: 'Hyderabad', area: 'Jubilee Hills', members: 480 },
  { id: 'gym-004', name: 'FitLife Studio', city: 'Mumbai', area: 'Andheri', members: 560 },
  { id: 'gym-005', name: 'Core Strength Academy', city: 'Bengaluru', area: 'Whitefield', members: 190 },
  { id: 'gym-006', name: 'FlexFit Hub', city: 'Bengaluru', area: 'Indiranagar', members: 310 },
]

const STATUS_STYLES = {
  pending:   { bg: '#F9731620', color: '#F97316', label: 'Pending' },
  routed:    { bg: '#0052FF20', color: '#0052FF', label: 'Routed' },
  closed:    { bg: '#22C55E20', color: '#22C55E', label: 'Closed' },
  suggested: { bg: '#8B5CF620', color: '#8B5CF6', label: 'Suggested' },
}

const SOURCE_STYLES = {
  discovery:    { bg: '#8B5CF620', color: '#A78BFA', label: 'Discovery' },
  code_request: { bg: '#F9731620', color: '#F97316', label: 'Code Request' },
}

// ── Route Modal ──────────────────────────────────────────────────────
function RouteModal({ lead, gyms, onClose, onRoute }) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)

  const filtered = gyms.filter(g =>
    !search || g.name.toLowerCase().includes(search.toLowerCase()) ||
    g.city.toLowerCase().includes(search.toLowerCase()) ||
    g.area.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 520, background: '#0d0d14',
        border: '1px solid #1a1a2e', borderRadius: 16, overflow: 'hidden',
        maxHeight: '80vh', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid #1a1a2e',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 700, margin: 0 }}>
              Route Lead to Partner Gym
            </h3>
            <p style={{ color: '#888', fontSize: 13, margin: '4px 0 0' }}>
              {lead.name} — {lead.location}
            </p>
          </div>
          <button onClick={onClose} style={{
            background: '#1a1a2e', border: 'none', borderRadius: 8,
            padding: 6, cursor: 'pointer', color: '#888',
          }}>
            <X size={16} />
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '16px 24px 8px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#1a1a2e', borderRadius: 10, padding: '0 12px',
            border: '1px solid #2a2a3e',
          }}>
            <Search size={16} color="#555" />
            <input
              type="text"
              placeholder="Search partner gyms..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: '#fff', fontSize: 14, padding: '10px 0',
              }}
            />
          </div>
        </div>

        {/* Gym list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 24px 16px' }}>
          {filtered.map(gym => {
            const isSelected = selected?.id === gym.id
            return (
              <button key={gym.id} onClick={() => setSelected(gym)} style={{
                display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                padding: '12px 14px', borderRadius: 10, marginBottom: 6,
                background: isSelected ? '#0052FF15' : '#111118',
                border: isSelected ? '1px solid #0052FF40' : '1px solid transparent',
                cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: isSelected ? '#0052FF20' : '#1a1a2e',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Building2 size={18} color={isSelected ? '#0052FF' : '#555'} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>{gym.name}</div>
                  <div style={{ color: '#888', fontSize: 12 }}>{gym.area}, {gym.city}</div>
                </div>
                <div style={{ color: '#555', fontSize: 12 }}>{gym.members} members</div>
                {isSelected && <CheckCircle size={18} color="#0052FF" />}
              </button>
            )
          })}
          {filtered.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: '#555', fontSize: 13 }}>
              No gyms match your search.
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
            disabled={!selected}
            onClick={() => { onRoute(lead, selected); onClose() }}
            style={{
              padding: '10px 24px', borderRadius: 10,
              background: selected ? '#0052FF' : '#1a1a2e',
              border: 'none', color: '#fff', fontSize: 13, fontWeight: 600,
              cursor: selected ? 'pointer' : 'not-allowed',
              opacity: selected ? 1 : 0.5, display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <Send size={14} />
            Route Lead
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Suggest Modal ────────────────────────────────────────────────────
function SuggestModal({ lead, gyms, onClose, onSuggest }) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState([])
  const [message, setMessage] = useState(
    `Hi ${lead.name.split(' ')[0]}! We found some great gym options near you. Check them out and pick the one that fits you best.`
  )

  const filtered = gyms.filter(g =>
    !search || g.name.toLowerCase().includes(search.toLowerCase()) ||
    g.city.toLowerCase().includes(search.toLowerCase()) ||
    g.area.toLowerCase().includes(search.toLowerCase())
  )

  const toggleGym = (gym) => {
    setSelected(prev => {
      const exists = prev.find(g => g.id === gym.id)
      if (exists) return prev.filter(g => g.id !== gym.id)
      if (prev.length >= 3) return prev
      return [...prev, gym]
    })
  }

  const generatedLink = `https://ivira.app/s/${lead.id.replace('lead-', '')}${Math.random().toString(36).slice(2, 6).toUpperCase()}`

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
              <Sparkles size={18} color="#8B5CF6" />
              Suggest Gyms to {lead.name.split(' ')[0]}
            </h3>
            <p style={{ color: '#888', fontSize: 13, margin: '4px 0 0' }}>
              Select up to 3 partner gyms and send a personalized suggestion
            </p>
          </div>
          <button onClick={onClose} style={{
            background: '#1a1a2e', border: 'none', borderRadius: 8,
            padding: 6, cursor: 'pointer', color: '#888',
          }}>
            <X size={16} />
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '16px 24px 8px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#1a1a2e', borderRadius: 10, padding: '0 12px',
            border: '1px solid #2a2a3e',
          }}>
            <Search size={16} color="#555" />
            <input
              type="text"
              placeholder="Search partner gyms..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: '#fff', fontSize: 14, padding: '10px 0',
              }}
            />
          </div>
          <div style={{ color: '#555', fontSize: 11, marginTop: 6 }}>
            {selected.length}/3 gyms selected
          </div>
        </div>

        {/* Gym list with checkboxes */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 24px 16px' }}>
          {filtered.map(gym => {
            const isSelected = selected.some(g => g.id === gym.id)
            const isDisabled = !isSelected && selected.length >= 3
            return (
              <button key={gym.id} onClick={() => !isDisabled && toggleGym(gym)} style={{
                display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                padding: '12px 14px', borderRadius: 10, marginBottom: 6,
                background: isSelected ? '#8B5CF612' : '#111118',
                border: isSelected ? '1px solid #8B5CF640' : '1px solid transparent',
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                textAlign: 'left', transition: 'all 0.15s',
                opacity: isDisabled ? 0.4 : 1,
              }}>
                <div style={{
                  width: 20, height: 20, borderRadius: 4,
                  border: isSelected ? '2px solid #8B5CF6' : '2px solid #333',
                  background: isSelected ? '#8B5CF6' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  {isSelected && <CheckCircle size={12} color="#fff" />}
                </div>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: isSelected ? '#8B5CF620' : '#1a1a2e',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Building2 size={18} color={isSelected ? '#8B5CF6' : '#555'} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>{gym.name}</div>
                  <div style={{ color: '#888', fontSize: 12 }}>{gym.area}, {gym.city}</div>
                </div>
                <div style={{ color: '#555', fontSize: 12 }}>{gym.members} members</div>
              </button>
            )
          })}
          {filtered.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: '#555', fontSize: 13 }}>
              No gyms match your search.
            </div>
          )}
        </div>

        {/* Message textarea */}
        <div style={{ padding: '0 24px 16px' }}>
          <p style={{ color: '#888', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 0 }}>
            Personalized message
          </p>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={3}
            style={{
              width: '100%', background: '#111118', border: '1px solid #1a1a2e',
              borderRadius: 10, padding: 14, color: '#fff', fontSize: 14,
              resize: 'vertical', outline: 'none', lineHeight: 1.5,
              fontFamily: 'inherit', boxSizing: 'border-box',
            }}
          />

          {/* Shareable link preview */}
          {selected.length > 0 && (
            <div style={{
              marginTop: 12, padding: 12, background: '#8B5CF608',
              border: '1px solid #8B5CF620', borderRadius: 10,
            }}>
              <p style={{ color: '#888', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 6px' }}>
                Shareable link (auto-generated)
              </p>
              <code style={{ color: '#8B5CF6', fontSize: 13, fontWeight: 600, fontFamily: 'monospace' }}>
                {generatedLink}
              </code>
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
            disabled={selected.length === 0}
            onClick={() => { onSuggest(lead, selected, message, generatedLink); onClose() }}
            style={{
              padding: '10px 24px', borderRadius: 10,
              background: selected.length > 0 ? '#8B5CF6' : '#1a1a2e',
              border: 'none', color: '#fff', fontSize: 13, fontWeight: 600,
              cursor: selected.length > 0 ? 'pointer' : 'not-allowed',
              opacity: selected.length > 0 ? 1 : 0.5,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <Sparkles size={14} />
            Send Suggestions
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────
export default function Leads() {
  const [leads, setLeads] = useState(MOCK_LEADS)
  const [statusFilter, setStatusFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [routeModal, setRouteModal] = useState(null) // lead to route
  const [suggestModal, setSuggestModal] = useState(null) // lead to suggest

  const filteredLeads = leads.filter(l => {
    if (statusFilter !== 'all' && l.status !== statusFilter) return false
    if (sourceFilter !== 'all' && l.source !== sourceFilter) return false
    if (searchQuery && !l.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !l.location.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const counts = {
    all: leads.length,
    pending: leads.filter(l => l.status === 'pending').length,
    routed: leads.filter(l => l.status === 'routed').length,
    closed: leads.filter(l => l.status === 'closed').length,
    suggested: leads.filter(l => l.status === 'suggested').length,
  }

  const handleRoute = (lead, gym) => {
    setLeads(prev => prev.map(l =>
      l.id === lead.id
        ? { ...l, status: 'routed', routed_to: gym.name, routed_at: new Date().toISOString() }
        : l
    ))
  }

  const handleSuggest = (lead, gyms, message, link) => {
    setLeads(prev => prev.map(l =>
      l.id === lead.id
        ? { ...l, status: 'suggested', suggested_gyms: gyms.map(g => g.name), suggested_link: link }
        : l
    ))
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #0052FF, #0040CC)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Globe size={16} color="#fff" />
          </div>
          <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 700, margin: 0 }}>
            Global Lead Pool
          </h1>
        </div>
        <p style={{ color: '#666', fontSize: 14, margin: '4px 0 0' }}>
          Concierge requests from B2C users looking for a gym
        </p>
      </div>

      {/* Stat pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        {[
          { key: 'all', label: 'All Leads', icon: Users, color: '#fff' },
          { key: 'pending', label: 'Pending', icon: AlertCircle, color: '#F97316' },
          { key: 'routed', label: 'Routed', icon: Send, color: '#0052FF' },
          { key: 'closed', label: 'Closed', icon: CheckCircle, color: '#22C55E' },
          { key: 'suggested', label: 'Suggested', icon: Sparkles, color: '#8B5CF6' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 16px', borderRadius: 10,
              background: statusFilter === f.key ? `${f.color}15` : '#0d0d14',
              border: statusFilter === f.key ? `1px solid ${f.color}30` : '1px solid #1a1a2e',
              color: statusFilter === f.key ? f.color : '#888',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <f.icon size={14} />
            {f.label}
            <span style={{
              background: statusFilter === f.key ? `${f.color}20` : '#1a1a2e',
              padding: '2px 7px', borderRadius: 6, fontSize: 11, fontWeight: 700,
              color: statusFilter === f.key ? f.color : '#555',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {counts[f.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Source filter */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
        {[
          { key: 'all', label: 'All Sources', icon: Users, color: '#fff' },
          { key: 'discovery', label: 'Discovery', icon: Compass, color: '#A78BFA' },
          { key: 'code_request', label: 'Code Request', icon: KeyRound, color: '#F97316' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setSourceFilter(f.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 8,
              background: sourceFilter === f.key ? `${f.color}15` : '#0d0d14',
              border: sourceFilter === f.key ? `1px solid ${f.color}30` : '1px solid #1a1a2e',
              color: sourceFilter === f.key ? f.color : '#888',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <f.icon size={13} />
            {f.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: '#0d0d14', border: '1px solid #1a1a2e', borderRadius: 10,
        padding: '0 14px', marginBottom: 20,
      }}>
        <Search size={16} color="#555" />
        <input
          type="text"
          placeholder="Search by name or location..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            color: '#fff', fontSize: 14, padding: '12px 0',
          }}
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: '#555', padding: 4,
          }}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* Lead cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filteredLeads.map(lead => {
          const st = STATUS_STYLES[lead.status]
          return (
            <div key={lead.id} style={{
              background: '#0d0d14', border: '1px solid #1a1a2e', borderRadius: 14,
              padding: 20, transition: 'border-color 0.15s',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                {/* Left info */}
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 10,
                      background: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#888', fontSize: 15, fontWeight: 700,
                    }}>
                      {lead.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <div style={{ color: '#fff', fontSize: 15, fontWeight: 600 }}>{lead.name}</div>
                      <div style={{ color: '#555', fontSize: 12 }}>{lead.email}</div>
                    </div>
                    <span style={{
                      padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: 0.5,
                      background: st.bg, color: st.color, marginLeft: 4,
                    }}>
                      {st.label}
                    </span>
                    {lead.source && SOURCE_STYLES[lead.source] && (
                      <span style={{
                        padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: 0.5,
                        background: SOURCE_STYLES[lead.source].bg,
                        color: SOURCE_STYLES[lead.source].color,
                        marginLeft: 2,
                      }}>
                        {SOURCE_STYLES[lead.source].label}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#888', fontSize: 13 }}>
                      <MapPin size={13} />
                      {lead.location} ({lead.zip})
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#888', fontSize: 13 }}>
                      <Clock size={13} />
                      {format(new Date(lead.submitted_at), 'dd MMM yyyy, hh:mm a')}
                    </div>
                  </div>

                  {/* Goals */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                    {lead.goals.map(g => (
                      <span key={g} style={{
                        padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                        background: '#8B5CF620', color: '#A78BFA',
                      }}>
                        {g}
                      </span>
                    ))}
                    {lead.budget && (
                      <span style={{
                        padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                        background: '#22C55E20', color: '#22C55E',
                      }}>
                        {lead.budget}
                      </span>
                    )}
                  </div>

                  {lead.notes && (
                    <p style={{ color: '#666', fontSize: 12, margin: 0, lineHeight: 1.5 }}>
                      {lead.notes}
                    </p>
                  )}

                  {lead.routed_to && (
                    <div style={{
                      marginTop: 8, display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 10px', background: '#0052FF10', borderRadius: 8,
                      width: 'fit-content',
                    }}>
                      <Building2 size={13} color="#0052FF" />
                      <span style={{ color: '#0052FF', fontSize: 12, fontWeight: 600 }}>
                        Routed to {lead.routed_to}
                      </span>
                      {lead.routed_at && (
                        <span style={{ color: '#555', fontSize: 11 }}>
                          — {format(new Date(lead.routed_at), 'dd MMM, hh:mm a')}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Action */}
                {lead.status === 'pending' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button
                      onClick={() => setRouteModal(lead)}
                      style={{
                        padding: '10px 20px', borderRadius: 10,
                        background: '#0052FF', border: 'none',
                        color: '#fff', fontSize: 13, fontWeight: 600,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                        whiteSpace: 'nowrap', transition: 'opacity 0.15s',
                      }}
                    >
                      Route to Gym
                      <ArrowRight size={14} />
                    </button>
                    <button
                      onClick={() => setSuggestModal(lead)}
                      style={{
                        padding: '10px 20px', borderRadius: 10,
                        background: '#8B5CF615', border: '1px solid #8B5CF630',
                        color: '#A78BFA', fontSize: 13, fontWeight: 600,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                        whiteSpace: 'nowrap', transition: 'opacity 0.15s',
                      }}
                    >
                      Respond with Suggestion
                      <Sparkles size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {filteredLeads.length === 0 && (
          <div style={{
            padding: 48, textAlign: 'center', color: '#555',
            background: '#0d0d14', border: '1px solid #1a1a2e', borderRadius: 14,
          }}>
            No leads match your filters.
          </div>
        )}
      </div>

      {/* Route Modal */}
      {routeModal && (
        <RouteModal
          lead={routeModal}
          gyms={MOCK_PARTNER_GYMS}
          onClose={() => setRouteModal(null)}
          onRoute={handleRoute}
        />
      )}

      {/* Suggest Modal */}
      {suggestModal && (
        <SuggestModal
          lead={suggestModal}
          gyms={MOCK_PARTNER_GYMS}
          onClose={() => setSuggestModal(null)}
          onSuggest={handleSuggest}
        />
      )}
    </div>
  )
}
