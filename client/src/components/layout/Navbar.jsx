import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Menu, Bell, Sun, Moon, Monitor, Settings, Palette, LogOut, ChevronDown, X, IndianRupee, UserPlus, AlertTriangle, Check, Search, Users, QrCode, CreditCard, Calendar, BarChart3, ShoppingBag, Mail, Globe, UserCog, Award, TrendingUp, Activity, ShieldCheck } from 'lucide-react'
import Avatar from '../ui/Avatar'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useAllFeatures } from '../../hooks/useFeatureGate'
import api from '../../lib/api'
import { formatPaise, formatDate } from '../../lib/utils'

const FONT = "'Inter', -apple-system, sans-serif"
const FONT_M = "'JetBrains Mono', monospace"

const THEME_OPTS = [
  { value: 'light', icon: Sun, label: 'Light' },
  { value: 'dark', icon: Moon, label: 'Dark' },
  { value: 'system', icon: Monitor, label: 'System' },
]

function useClickOutside(ref, handler) {
  useEffect(() => {
    const listener = (e) => {
      if (ref.current && !ref.current.contains(e.target)) handler()
    }
    document.addEventListener('mousedown', listener)
    return () => document.removeEventListener('mousedown', listener)
  }, [ref, handler])
}

/* ─── Theme Toggle (3-state) ─── */
function ThemeToggle({ mode, setMode, theme, isDark, gymId }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useClickOutside(ref, () => setOpen(false))

  // Persist theme preference to backend
  const savePref = useMutation({
    mutationFn: (newMode) => api.patch(`/gyms/${gymId}/notification-settings`, {
      theme_preference: newMode,
    }).catch(() => {}), // silent fail — localStorage is primary
  })

  const handleSelect = (value) => {
    setMode(value)
    setOpen(false)
    if (gymId) savePref.mutate(value)
  }

  const CurrentIcon = mode === 'light' ? Sun : mode === 'dark' ? Moon : Monitor

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        className="navbar-icon-btn"
        style={{
          width: 36, height: 36, borderRadius: 8, border: 'none',
          background: 'transparent', color: theme.textSec, display: 'flex',
          alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
        title={`Theme: ${mode}`}
      >
        <CurrentIcon size={17} strokeWidth={1.5} />
      </button>

      <div style={{
        position: 'absolute', top: '100%', right: 0, marginTop: 6,
        background: theme.bgSec, border: `1px solid ${theme.border}`,
        borderRadius: 10, padding: 4, minWidth: 160, zIndex: 300,
        boxShadow: isDark ? '0 8px 30px rgba(0,0,0,0.6)' : '0 8px 30px rgba(0,0,0,0.12)',
        opacity: open ? 1 : 0,
        transform: open ? 'translateY(0) scale(1)' : 'translateY(-4px) scale(0.97)',
        pointerEvents: open ? 'auto' : 'none',
        transition: 'opacity 0.2s ease, transform 0.2s ease',
      }}>
        {THEME_OPTS.map(opt => {
          const Icon = opt.icon
          const active = mode === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => handleSelect(opt.value)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                padding: '9px 12px', borderRadius: 7, border: 'none', cursor: 'pointer',
                background: active ? theme.accentSoft : 'transparent',
                color: active ? theme.text : theme.textSec,
                fontSize: 13, fontWeight: active ? 600 : 400,
                fontFamily: FONT, transition: 'all 0.15s', textAlign: 'left',
              }}
            >
              <Icon size={15} />
              <span style={{ flex: 1 }}>{opt.label}</span>
              {active && <Check size={14} style={{ color: theme.green }} />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Notification Bell ─── */
function NotificationBell({ gymId, theme, isDark }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useClickOutside(ref, () => setOpen(false))

  // Fetch failed payments (last 30 days)
  const { data: failedPayments } = useQuery({
    queryKey: ['failed-payments', gymId],
    queryFn: () => api.get(`/gyms/${gymId}/payments`, {
      params: { status: 'failed', limit: 5 },
    }).then(r => r.data),
    enabled: !!gymId,
    refetchInterval: 60_000,
  })

  // Fetch recent member signups (last 7 days)
  const { data: recentMembers } = useQuery({
    queryKey: ['recent-members', gymId],
    queryFn: () => api.get(`/gyms/${gymId}/members`, {
      params: { limit: 5, sort: 'newest' },
    }).then(r => r.data),
    enabled: !!gymId,
    refetchInterval: 60_000,
  })

  const failed = failedPayments?.data ?? []
  const newMembers = recentMembers?.members ?? []
  const totalCount = failed.length + newMembers.length
  const hasNotifications = totalCount > 0

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        className="navbar-icon-btn"
        style={{
          width: 36, height: 36, borderRadius: 8, border: 'none',
          background: 'transparent', color: theme.textSec, display: 'flex',
          alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          position: 'relative', transition: 'all 0.2s ease',
        }}
      >
        <Bell size={17} strokeWidth={1.5} />
        {hasNotifications && (
          <div style={{
            position: 'absolute', top: 6, right: 6,
            minWidth: 8, height: 8, borderRadius: '50%',
            background: theme.red,
            border: `2px solid ${isDark ? '#000' : '#fff'}`,
          }} />
        )}
      </button>

      <div style={{
        position: 'absolute', top: '100%', right: 0, marginTop: 6,
        background: theme.bgSec, border: `1px solid ${theme.border}`,
        borderRadius: 12, minWidth: 320, maxWidth: 380, zIndex: 300,
        boxShadow: isDark ? '0 12px 40px rgba(0,0,0,0.7)' : '0 12px 40px rgba(0,0,0,0.15)',
        opacity: open ? 1 : 0,
        transform: open ? 'translateY(0) scale(1)' : 'translateY(-4px) scale(0.97)',
        pointerEvents: open ? 'auto' : 'none',
        transition: 'opacity 0.2s ease, transform 0.2s ease',
        maxHeight: 420, overflow: 'hidden', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 16px', borderBottom: `1px solid ${theme.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{
            fontSize: 14, fontWeight: 600, color: theme.text, fontFamily: FONT,
          }}>
            Notifications
          </span>
          {hasNotifications && (
            <span style={{
              fontSize: 11, fontWeight: 600, color: isDark ? '#000' : '#fff',
              background: theme.text, padding: '2px 7px', borderRadius: 10,
              fontFamily: FONT_M,
            }}>
              {totalCount}
            </span>
          )}
        </div>

        {/* Body */}
        <div style={{ overflow: 'auto', flex: 1 }}>
          {!hasNotifications ? (
            <div style={{
              padding: '32px 16px', textAlign: 'center',
            }}>
              <Bell size={24} color={theme.textTer} style={{ marginBottom: 8 }} />
              <p style={{
                fontSize: 13, color: theme.textSec, margin: 0, fontFamily: FONT,
              }}>
                No new notifications
              </p>
            </div>
          ) : (
            <>
              {/* Failed Payments */}
              {failed.length > 0 && (
                <div>
                  <div style={{
                    padding: '10px 16px 6px', fontSize: 10, fontWeight: 600,
                    color: theme.textTer, textTransform: 'uppercase', letterSpacing: '0.08em',
                    fontFamily: FONT,
                  }}>
                    Failed Payments
                  </div>
                  {failed.map((p) => (
                    <div key={p.id} style={{
                      padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10,
                      borderBottom: `1px solid ${theme.border}`,
                      transition: 'background 0.15s',
                      cursor: 'pointer',
                    }}
                      onMouseEnter={(e) => e.currentTarget.style.background = theme.bgHover}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{
                        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                        background: `${theme.red}12`, display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <IndianRupee size={14} color={theme.red} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 13, fontWeight: 500, color: theme.text,
                          fontFamily: FONT, whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis', overflow: 'hidden',
                        }}>
                          {p.member_name || 'Unknown'}
                        </div>
                        <div style={{
                          fontSize: 11, color: theme.red, fontFamily: FONT,
                          fontWeight: 500,
                        }}>
                          {formatPaise(p.amount_paise || p.amount)} failed
                        </div>
                      </div>
                      <span style={{
                        fontSize: 10, color: theme.textTer, fontFamily: FONT_M,
                        whiteSpace: 'nowrap',
                      }}>
                        {formatDate(p.paid_at || p.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* New Members */}
              {newMembers.length > 0 && (
                <div>
                  <div style={{
                    padding: '10px 16px 6px', fontSize: 10, fontWeight: 600,
                    color: theme.textTer, textTransform: 'uppercase', letterSpacing: '0.08em',
                    fontFamily: FONT,
                  }}>
                    New Members
                  </div>
                  {newMembers.map((m) => (
                    <div key={m.id} style={{
                      padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10,
                      borderBottom: `1px solid ${theme.border}`,
                      transition: 'background 0.15s',
                      cursor: 'pointer',
                    }}
                      onMouseEnter={(e) => e.currentTarget.style.background = theme.bgHover}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{
                        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                        background: `${theme.green}12`, display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <UserPlus size={14} color={theme.green} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 13, fontWeight: 500, color: theme.text,
                          fontFamily: FONT, whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis', overflow: 'hidden',
                        }}>
                          {m.name}
                        </div>
                        <div style={{
                          fontSize: 11, color: theme.green, fontFamily: FONT,
                          fontWeight: 500,
                        }}>
                          New signup
                        </div>
                      </div>
                      <span style={{
                        fontSize: 10, color: theme.textTer, fontFamily: FONT_M,
                        whiteSpace: 'nowrap',
                      }}>
                        {m.created_at ? formatDate(m.created_at) : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Profile Dropdown ─── */
function ProfileDropdown({ gym, theme, isDark, onLogout }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()
  useClickOutside(ref, () => setOpen(false))

  const ownerName = gym?.owner_name || 'Owner'
  const gymName = gym?.gym_name || 'Gym'
  const ownerEmail = gym?.owner_email || ''

  const menuItems = [
    { icon: Settings, label: 'Account Settings', action: () => navigate('/dashboard/settings') },
    { icon: Palette, label: 'Gym Branding', action: () => navigate('/dashboard/settings?tab=profile') },
  ]

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        className="navbar-profile-btn"
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px 4px 4px',
          borderRadius: 8, border: 'none', cursor: 'pointer',
          background: 'transparent', transition: 'all 0.15s ease',
        }}
      >
        <Avatar name={ownerName} size={32} />
        <div className="navbar-name" style={{ lineHeight: 1.2, textAlign: 'left' }}>
          <div style={{
            fontSize: 13, fontWeight: 600, color: theme.text, fontFamily: FONT,
          }}>
            {ownerName}
          </div>
          <div style={{
            fontSize: 11, color: theme.textTer, fontWeight: 400, fontFamily: FONT,
          }}>
            {gymName}
          </div>
        </div>
        <ChevronDown size={14} color={theme.textTer} style={{
          transition: 'transform 0.2s',
          transform: open ? 'rotate(180deg)' : 'rotate(0)',
        }} />
      </button>

      <div style={{
        position: 'absolute', top: '100%', right: 0, marginTop: 6,
        background: theme.bgSec, border: `1px solid ${theme.border}`,
        borderRadius: 12, minWidth: 220, zIndex: 300,
        boxShadow: isDark ? '0 12px 40px rgba(0,0,0,0.7)' : '0 12px 40px rgba(0,0,0,0.15)',
        opacity: open ? 1 : 0,
        transform: open ? 'translateY(0) scale(1)' : 'translateY(-4px) scale(0.97)',
        pointerEvents: open ? 'auto' : 'none',
        transition: 'opacity 0.2s ease, transform 0.2s ease',
        overflow: 'hidden',
      }}>
        {/* User info header */}
        <div style={{
          padding: '14px 16px', borderBottom: `1px solid ${theme.border}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar name={ownerName} size={36} />
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: 14, fontWeight: 600, color: theme.text, fontFamily: FONT,
                whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden',
              }}>
                {ownerName}
              </div>
              {ownerEmail && (
                <div style={{
                  fontSize: 12, color: theme.textSec, fontFamily: FONT,
                  whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden',
                }}>
                  {ownerEmail}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Menu items */}
        <div style={{ padding: '4px' }}>
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.label}
                onClick={() => { item.action(); setOpen(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                  padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: 'transparent', color: theme.textSec,
                  fontSize: 13, fontWeight: 400, fontFamily: FONT,
                  transition: 'all 0.15s', textAlign: 'left',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = theme.bgHover; e.currentTarget.style.color = theme.text }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = theme.textSec }}
              >
                <Icon size={16} />
                {item.label}
              </button>
            )
          })}
        </div>

        {/* Logout */}
        <div style={{
          padding: '4px', borderTop: `1px solid ${theme.border}`,
        }}>
          <button
            onClick={() => { onLogout(); setOpen(false) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: 'transparent', color: theme.red,
              fontSize: 13, fontWeight: 500, fontFamily: FONT,
              transition: 'all 0.15s', textAlign: 'left',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = `${theme.red}08`}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Command Palette (⌘K) — Gym Owner Commands ─── */
const CMD_ITEMS = [
  { id: 'c1', label: 'Members', icon: Users, desc: 'View & manage all members', route: '/dashboard/members', group: 'Management' },
  { id: 'c2', label: 'Payments', icon: CreditCard, desc: 'Collect payments & transactions', route: '/dashboard/payments', group: 'Management' },
  { id: 'c3', label: 'Check-ins', icon: QrCode, desc: 'Today\'s check-in log', route: '/dashboard/checkins', group: 'Management' },
  { id: 'c4', label: 'Classes', icon: Calendar, desc: 'Schedule & manage classes', route: '/dashboard/classes', group: 'Management' },
  { id: 'c5', label: 'Live Pulse', icon: Activity, desc: 'Real-time gym activity', route: '/dashboard/pulse', group: 'Management' },
  { id: 'c6', label: 'Analytics', icon: BarChart3, desc: 'Revenue trends & insights', route: '/dashboard/analytics', group: 'Growth', featureSlug: 'analytics' },
  { id: 'c7', label: 'Store', icon: ShoppingBag, desc: 'Products & supplements', route: '/dashboard/store', group: 'Growth' },
  { id: 'c8', label: 'Affiliate', icon: Globe, desc: 'Referral commissions', route: '/dashboard/affiliate', group: 'Growth', featureSlug: 'affiliate' },
  { id: 'c9', label: 'Newsletter', icon: Mail, desc: 'Send member updates', route: '/dashboard/newsletter', group: 'Growth', featureSlug: 'newsletter' },
  { id: 'c10', label: 'Staff', icon: UserCog, desc: 'Staff accounts & roles', route: '/dashboard/staff', group: 'Operations', featureSlug: 'staff' },
  { id: 'c11', label: 'Trainers', icon: Award, desc: 'Trainer profiles', route: '/dashboard/trainers', group: 'Operations', featureSlug: 'trainers' },
  { id: 'c12', label: 'Performance', icon: TrendingUp, desc: 'Staff metrics & KPIs', route: '/dashboard/staff-performance', group: 'Operations', featureSlug: 'staff-performance' },
  { id: 'c13', label: 'Add Member', icon: UserPlus, desc: 'Register a new member', route: '/dashboard/members?action=add', group: 'Quick Actions' },
  { id: 'c14', label: 'Overdue Payments', icon: AlertTriangle, desc: 'Members with pending dues', route: '/dashboard/payments?status=overdue', group: 'Quick Actions' },
  { id: 'c15', label: 'Settings', icon: Settings, desc: 'Account & gym settings', route: '/dashboard/settings', group: 'Settings' },
]

function CommandPalette({ theme, isDark, onNavigate, features }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef(null)
  const overlayRef = useRef(null)

  const filtered = useMemo(() => {
    let items = CMD_ITEMS
    if (query.trim()) {
      const q = query.toLowerCase()
      items = items.filter(i => i.label.toLowerCase().includes(q) || i.desc.toLowerCase().includes(q))
    }
    return items
  }, [query])

  useEffect(() => { setActiveIndex(0) }, [filtered.length])

  // ⌘K global shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
        setTimeout(() => inputRef.current?.focus(), 50)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Click outside to close
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (overlayRef.current && !overlayRef.current.contains(e.target)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const isLocked = useCallback((item) => {
    return item.featureSlug && features && !features[item.featureSlug]?.allowed
  }, [features])

  const handleSelect = useCallback((item) => {
    if (isLocked(item)) return
    setOpen(false)
    setQuery('')
    onNavigate(item.route)
  }, [onNavigate, isLocked])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') { setOpen(false); setQuery(''); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, filtered.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && filtered[activeIndex]) { e.preventDefault(); handleSelect(filtered[activeIndex]) }
  }, [filtered, activeIndex, handleSelect])

  // Group items for display
  const groups = useMemo(() => {
    const map = {}
    filtered.forEach(item => {
      if (!map[item.group]) map[item.group] = []
      map[item.group].push(item)
    })
    return map
  }, [filtered])

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50) }}
        className="navbar-icon-btn cmd-trigger"
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          height: 34, padding: '0 10px 0 10px',
          borderRadius: 8, border: `1px solid ${theme.border}`,
          background: 'transparent', color: theme.textTer,
          cursor: 'pointer', transition: 'all 0.15s',
          fontFamily: FONT, fontSize: 13,
        }}
      >
        <Search size={14} strokeWidth={2} />
        <span className="cmd-trigger-text" style={{ color: theme.textTer, fontWeight: 400 }}>Search...</span>
        <span style={{
          fontSize: 11, color: theme.textTer, padding: '1px 6px',
          borderRadius: 4, border: `1px solid ${theme.border}`,
          fontWeight: 500, fontFamily: FONT, marginLeft: 8,
        }}>
          ⌘K
        </span>
      </button>

      {/* Modal overlay */}
      {open && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          paddingTop: 120,
        }}>
          <div ref={overlayRef} style={{
            width: '100%', maxWidth: 560,
            background: isDark ? '#111' : '#fff',
            border: `1px solid ${theme.border}`,
            borderRadius: 16, overflow: 'hidden',
            boxShadow: isDark ? '0 25px 60px rgba(0,0,0,0.8)' : '0 25px 60px rgba(0,0,0,0.2)',
          }}>
            {/* Search input */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 18px', borderBottom: `1px solid ${theme.border}`,
            }}>
              <Search size={18} color={theme.textTer} strokeWidth={2} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search members, payments, settings..."
                style={{
                  flex: 1, border: 'none', outline: 'none', background: 'transparent',
                  fontSize: 15, color: theme.text, fontFamily: FONT,
                }}
              />
              <button onClick={() => { setOpen(false); setQuery('') }} style={{
                width: 24, height: 24, borderRadius: 6, border: `1px solid ${theme.border}`,
                background: 'transparent', display: 'flex', alignItems: 'center',
                justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
              }}>
                <span style={{ fontSize: 10, color: theme.textTer, fontWeight: 600 }}>ESC</span>
              </button>
            </div>

            {/* Results */}
            <div style={{ maxHeight: 380, overflowY: 'auto', padding: '8px 0' }}>
              {filtered.length === 0 ? (
                <div style={{
                  padding: '28px 20px', textAlign: 'center',
                  fontSize: 13, color: theme.textTer, fontFamily: FONT,
                }}>
                  No results for "{query}"
                </div>
              ) : (
                (() => {
                  let globalIdx = 0
                  return Object.entries(groups).map(([groupName, items]) => (
                    <div key={groupName}>
                      <div style={{
                        padding: '8px 18px 4px', fontSize: 10, fontWeight: 600,
                        color: theme.textTer, letterSpacing: '0.08em',
                        textTransform: 'uppercase', fontFamily: FONT,
                      }}>
                        {groupName}
                      </div>
                      {items.map((item) => {
                        const Icon = item.icon
                        const thisIdx = globalIdx++
                        const isActive = thisIdx === activeIndex
                        const locked = isLocked(item)
                        return (
                          <div
                            key={item.id}
                            onClick={() => handleSelect(item)}
                            onMouseEnter={() => setActiveIndex(thisIdx)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 12,
                              padding: '10px 18px',
                              cursor: locked ? 'default' : 'pointer',
                              opacity: locked ? 0.4 : 1,
                              background: !locked && isActive ? (isDark ? theme.bgHover : '#F1F5F9') : 'transparent',
                              transition: 'background 0.1s, opacity 0.1s',
                            }}
                          >
                            <Icon size={16} color={locked ? theme.textTer : (isActive ? theme.brandAccent : theme.textTer)} strokeWidth={1.8} style={{ flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                fontSize: 13, fontWeight: 500, color: locked ? theme.textTer : theme.text, fontFamily: FONT,
                              }}>{item.label}</div>
                              <div style={{
                                fontSize: 11, color: theme.textTer, fontFamily: FONT,
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                              }}>{locked ? 'Upgrade to Pro to unlock' : item.desc}</div>
                            </div>
                            {locked && (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={theme.textTer} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                              </svg>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ))
                })()
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/* ─── Main Navbar ─── */
export default function Navbar({ onMenuClick }) {
  const { gym, logout } = useAuth()
  const { mode, setMode, theme, isDark } = useTheme()
  const { featureMap: features } = useAllFeatures()
  const navigate = useNavigate()
  const gymId = gym?.id

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header style={{
      height: 56, background: 'transparent',
      borderBottom: `1px solid ${theme.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', position: 'sticky', top: 0, zIndex: 100,
      backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
      backgroundColor: theme.navBg, fontFamily: FONT,
      transition: 'background-color 0.3s ease, border-color 0.3s ease',
    }}>
      {/* Left: hamburger (mobile only) */}
      <button
        onClick={onMenuClick}
        className="menu-button"
        style={{
          display: 'none', width: 36, height: 36, borderRadius: 8, border: 'none',
          background: theme.bgTer, color: theme.textSec, alignItems: 'center',
          justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s',
        }}
      >
        <Menu size={20} />
      </button>

      <div style={{ flex: 1 }} />

      {/* Right section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <CommandPalette theme={theme} isDark={isDark} onNavigate={(route) => navigate(route)} features={features} />

        {/* Separator */}
        <div style={{ width: 1, height: 24, background: theme.border, margin: '0 4px' }} />

        <ThemeToggle mode={mode} setMode={setMode} theme={theme} isDark={isDark} gymId={gymId} />
        <NotificationBell gymId={gymId} theme={theme} isDark={isDark} />

        {/* Separator */}
        <div style={{
          width: 1, height: 24, background: theme.border, margin: '0 6px',
        }} />

        <ProfileDropdown gym={gym} theme={theme} isDark={isDark} onLogout={handleLogout} />
      </div>

      <style>{`
        .navbar-icon-btn:hover {
          background: ${theme.bgTer} !important;
          color: ${theme.text} !important;
        }
        .navbar-profile-btn:hover {
          background: ${theme.bgHover} !important;
        }
        .menu-button:hover {
          background: ${theme.bgHover} !important;
          color: ${theme.text} !important;
        }
        .cmd-trigger:hover {
          border-color: ${theme.borderFocus} !important;
          color: ${theme.textSec} !important;
        }
        @media (max-width: 768px) {
          .menu-button { display: flex !important; }
          .navbar-name { display: none; }
          .cmd-trigger-text { display: none; }
        }
      `}</style>
    </header>
  )
}
