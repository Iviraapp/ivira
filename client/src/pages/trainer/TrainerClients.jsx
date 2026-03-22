import { useState, useEffect } from 'react'
import { Search, User, Phone, Target, Camera, X, ChevronRight, MessageCircle, Dumbbell } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import api from '../../lib/api'

const FONT = "'Inter', -apple-system, sans-serif"
const FONT_M = "'JetBrains Mono', monospace"

export default function TrainerClients() {
  const { theme } = useTheme()
  const [clients, setClients] = useState([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const token = localStorage.getItem('ivira_trainer_token')
        const { data } = await api.get('/trainer/clients', {
          headers: { Authorization: `Bearer ${token}` }
        })
        setClients(Array.isArray(data) ? data : [])
      } catch { setClients([]) }
      finally { setLoading(false) }
    }
    fetchClients()
  }, [])

  const demoClients = clients.length ? clients : [
    { id: '1', name: 'Arjun Mehta', phone: '+919876543210', status: 'active', primary_goal: 'build_muscle' },
    { id: '2', name: 'Priya Sharma', phone: '+919876543211', status: 'active', primary_goal: 'lose_weight' },
    { id: '3', name: 'Vikram Singh', phone: '+919876543212', status: 'active', primary_goal: 'stay_fit' },
    { id: '4', name: 'Ananya Patel', phone: '+919876543213', status: 'active', primary_goal: 'build_muscle' },
  ]

  const filtered = demoClients.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase())
  )

  const goalLabel = (g) => {
    if (g === 'build_muscle') return 'Build Muscle'
    if (g === 'lose_weight') return 'Lose Weight'
    return 'Stay Fit'
  }

  const openDrawer = async (client) => {
    setSelected(client)
    try {
      const token = localStorage.getItem('ivira_trainer_token')
      const { data } = await api.get(`/trainer/clients/${client.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setDetail(data)
    } catch { setDetail(null) }
  }

  return (
    <div style={{ fontFamily: FONT, position: 'relative' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: theme.text, margin: '0 0 24px' }}>My Clients</h1>

      {/* Search */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 16px', borderRadius: 12, marginBottom: 20,
        background: theme.bgSec, border: `1px solid ${theme.border}`,
      }}>
        <Search size={16} color={theme.textSec} />
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search clients..."
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            color: theme.text, fontSize: 14, fontFamily: FONT,
          }}
        />
      </div>

      {/* Client Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {filtered.map(c => (
          <button
            key={c.id}
            onClick={() => openDrawer(c)}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '16px 18px', borderRadius: 14,
              background: theme.cardBg || theme.bgSec,
              border: `1px solid ${theme.border}`,
              cursor: 'pointer', fontFamily: FONT, textAlign: 'left',
              minHeight: 48, width: '100%',
              transition: 'border-color 0.15s',
            }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: `linear-gradient(135deg, ${theme.brandAccent}, #3B6FD4)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{c.name?.[0]}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>{c.name}</div>
              <div style={{ fontSize: 12, color: theme.textSec, marginTop: 2 }}>
                {goalLabel(c.primary_goal)}
              </div>
            </div>
            <ChevronRight size={16} color={theme.textTer} />
          </button>
        ))}
      </div>

      {/* Client Drawer */}
      {selected && (
        <>
          <div
            onClick={() => setSelected(null)}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.5)', zIndex: 200,
            }}
          />
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, width: 420,
            background: theme.bg, borderLeft: `1px solid ${theme.border}`,
            zIndex: 201, overflowY: 'auto', padding: 24,
            animation: 'slideInRight 0.3s ease',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: theme.text, margin: 0 }}>Client Profile</h2>
              <button onClick={() => setSelected(null)} style={{
                background: 'none', border: 'none', color: theme.textSec, cursor: 'pointer',
              }}><X size={20} /></button>
            </div>

            {/* Profile Header */}
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: `linear-gradient(135deg, ${theme.brandAccent}, #3B6FD4)`,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 12,
              }}>
                <span style={{ fontSize: 28, fontWeight: 700, color: '#fff' }}>{selected.name?.[0]}</span>
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: theme.text, margin: '0 0 4px' }}>{selected.name}</h3>
              <p style={{ fontSize: 13, color: theme.textSec }}>{selected.phone}</p>
              <div style={{
                display: 'inline-block', marginTop: 8, padding: '4px 12px',
                borderRadius: 20, fontSize: 11, fontWeight: 600,
                background: theme.brandAccentSoft, color: theme.brandAccent,
              }}>{goalLabel(selected.primary_goal)}</div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
              <a
                href={`https://wa.me/${selected.phone?.replace('+', '')}`}
                target="_blank" rel="noopener noreferrer"
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 8, padding: '12px', borderRadius: 10,
                  background: '#25D36618', border: `1px solid #25D36640`,
                  color: '#25D366', fontSize: 13, fontWeight: 600,
                  textDecoration: 'none', fontFamily: FONT, minHeight: 48,
                }}
              >
                <MessageCircle size={16} /> Message
              </a>
              <button style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 8, padding: '12px', borderRadius: 10,
                background: theme.brandAccentSoft, border: `1px solid ${theme.brandAccent}40`,
                color: theme.brandAccent, fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: FONT, minHeight: 48,
              }}>
                <Dumbbell size={16} /> Update Plan
              </button>
            </div>

            {/* Recent Checkins */}
            <h4 style={{ fontSize: 13, fontWeight: 600, color: theme.textSec, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Recent Check-ins
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 24 }}>
              {(detail?.recentCheckins || []).slice(0, 5).map((c, i) => (
                <div key={i} style={{
                  padding: '10px 14px', borderRadius: 8,
                  background: theme.bgSec, fontSize: 13, color: theme.textSec,
                  fontFamily: FONT_M,
                }}>
                  {new Date(c.checked_in_at).toLocaleString('en-IN')}
                </div>
              ))}
              {(!detail?.recentCheckins || detail.recentCheckins.length === 0) && (
                <p style={{ fontSize: 13, color: theme.textTer }}>No recent check-ins</p>
              )}
            </div>

            {/* Photos */}
            <h4 style={{ fontSize: 13, fontWeight: 600, color: theme.textSec, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Progress Photos
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 24 }}>
              {(detail?.photos || []).map((p, i) => (
                <div key={i} style={{
                  aspectRatio: '1', borderRadius: 8, overflow: 'hidden',
                  background: theme.bgSec, border: `1px solid ${theme.border}`,
                }}>
                  <img src={p.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
              {(!detail?.photos || detail.photos.length === 0) && (
                <div style={{
                  gridColumn: 'span 3', textAlign: 'center', padding: 20,
                  borderRadius: 8, background: theme.bgSec, border: `1px dashed ${theme.border}`,
                }}>
                  <Camera size={24} color={theme.textTer} style={{ marginBottom: 4 }} />
                  <p style={{ fontSize: 12, color: theme.textTer }}>No shared photos</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
