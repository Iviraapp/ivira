import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Bell, Dumbbell, CreditCard, Settings, LogOut,
  Calendar, UserPlus, Users, QrCode, Mail, Globe,
  ChevronRight, BarChart3, X, ShoppingBag, UserCog,
  Activity, TrendingUp, AlertTriangle, ShieldCheck, Award,
} from 'lucide-react'
import Avatar from '../ui/Avatar'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'

const FONT = "'Inter', -apple-system, sans-serif"

/* ─── Search Catalog — Gym Owner Commands ─── */
const SERVICES = [
  { id: 's1', label: 'Members', icon: Users, desc: 'View, search & manage all members', route: '/dashboard/members', category: 'Management' },
  { id: 's2', label: 'Payments', icon: CreditCard, desc: 'Collect payments & view transactions', route: '/dashboard/payments', category: 'Management' },
  { id: 's3', label: 'Check-ins', icon: QrCode, desc: 'Today\'s check-in log & analytics', route: '/dashboard/checkins', category: 'Management' },
  { id: 's4', label: 'Classes', icon: Calendar, desc: 'Schedule & manage group classes', route: '/dashboard/classes', category: 'Management' },
  { id: 's5', label: 'Live Pulse', icon: Activity, desc: 'Real-time gym activity monitor', route: '/dashboard/pulse', category: 'Management' },
  { id: 's6', label: 'Analytics', icon: BarChart3, desc: 'Revenue trends & member insights', route: '/dashboard/analytics', category: 'Growth' },
  { id: 's7', label: 'Store', icon: ShoppingBag, desc: 'Manage products & supplements', route: '/dashboard/store', category: 'Growth' },
  { id: 's8', label: 'Affiliate', icon: Globe, desc: 'Referral program & commissions', route: '/dashboard/affiliate', category: 'Growth' },
  { id: 's9', label: 'Newsletter', icon: Mail, desc: 'Send updates to your members', route: '/dashboard/newsletter', category: 'Growth' },
  { id: 's10', label: 'Staff', icon: UserCog, desc: 'Manage staff accounts & roles', route: '/dashboard/staff', category: 'Operations' },
  { id: 's11', label: 'Trainers', icon: Award, desc: 'Trainer profiles & assignments', route: '/dashboard/trainers', category: 'Operations' },
  { id: 's12', label: 'Staff Performance', icon: TrendingUp, desc: 'Track staff metrics & KPIs', route: '/dashboard/staff-performance', category: 'Operations' },
]

const APP_OPTIONS = [
  { id: 'a1', label: 'Settings', icon: Settings, desc: 'Account & gym settings', route: '/dashboard/settings', category: 'App Options' },
  { id: 'a2', label: 'Billing', icon: CreditCard, desc: 'Your IVIRA subscription & invoices', route: '/dashboard/payments', category: 'App Options' },
  { id: 'a3', label: 'Add Member', icon: UserPlus, desc: 'Register a new gym member', route: '/dashboard/members?action=add', category: 'App Options' },
  { id: 'a4', label: 'Log Out', icon: LogOut, desc: 'Sign out of your account', route: '__logout__', category: 'App Options' },
]

const QUICK_ACTIONS = [
  { id: 'q1', label: 'Add Member', icon: UserPlus, route: '/dashboard/members?action=add' },
  { id: 'q2', label: 'Collect Payment', icon: CreditCard, route: '/dashboard/payments' },
  { id: 'q3', label: 'View Check-ins', icon: QrCode, route: '/dashboard/checkins' },
]

const SUGGESTED_ACTIONS = [
  { id: 'sg1', label: 'Overdue Payments', icon: AlertTriangle, desc: 'View members with pending dues', route: '/dashboard/payments?status=overdue' },
  { id: 'sg2', label: 'Today\'s Check-ins', icon: ShieldCheck, desc: 'See who visited the gym today', route: '/dashboard/checkins' },
  { id: 'sg3', label: 'Send Reminders', icon: Mail, desc: 'Nudge members about expiring plans', route: '/dashboard/newsletter' },
  { id: 'sg4', label: 'Revenue Report', icon: TrendingUp, desc: 'This month\'s financial summary', route: '/dashboard/analytics' },
]

const ALL_ITEMS = [...SERVICES, ...APP_OPTIONS]

/* ─── Click-outside hook ─── */
function useClickOutside(ref, handler) {
  useEffect(() => {
    const listener = (e) => {
      if (ref.current && !ref.current.contains(e.target)) handler()
    }
    document.addEventListener('mousedown', listener)
    return () => document.removeEventListener('mousedown', listener)
  }, [ref, handler])
}

/* ─── Notification Bell (standalone) ─── */
function HeaderBell({ hasNotifications }) {
  return (
    <button
      className="cc-bell-btn"
      style={{
        width: 48, height: 48, borderRadius: 14, border: 'none',
        background: 'rgba(255,255,255,0.10)',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', position: 'relative',
        transition: 'all 0.2s ease', flexShrink: 0,
      }}
    >
      <Bell size={20} color="#FFFFFF" strokeWidth={1.8} />
      {hasNotifications && (
        <div style={{
          position: 'absolute', top: 10, right: 10,
          width: 9, height: 9, borderRadius: '50%',
          background: '#EA4335',
          border: '2px solid #0B0F19',
        }} />
      )}
    </button>
  )
}

/* ─── Search Results Overlay ─── */
function SearchOverlay({ query, activeIndex, onSelect, onHover, items }) {
  const management = items.filter(i => i.category === 'Management')
  const growth = items.filter(i => i.category === 'Growth')
  const operations = items.filter(i => i.category === 'Operations')
  const appOptions = items.filter(i => i.category === 'App Options')
  let idx = 0

  const renderSection = (title, sectionItems) => {
    if (!sectionItems.length) return null
    return (
      <div key={title}>
        <div style={{
          padding: '12px 20px 8px', fontSize: 10, fontWeight: 700,
          letterSpacing: '0.1em', color: 'rgba(0,0,0,0.4)',
          textTransform: 'uppercase', fontFamily: FONT,
        }}>
          {title}
        </div>
        {sectionItems.map((item) => {
          const Icon = item.icon
          const currentIdx = idx++
          const isActive = currentIdx === activeIndex
          return (
            <div
              key={item.id}
              onClick={() => onSelect(item)}
              onMouseEnter={() => onHover(currentIdx)}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '12px 16px', margin: '0 8px',
                cursor: 'pointer', borderRadius: 14,
                background: isActive ? '#F1F5F9' : 'transparent',
                transition: 'background 0.12s ease',
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: isActive ? '#E2E8F0' : '#F8FAFC',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'background 0.12s ease',
              }}>
                <Icon size={18} color={isActive ? '#0052FF' : '#64748B'} strokeWidth={1.8} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 14, fontWeight: 600, color: '#0F172A',
                  fontFamily: FONT,
                }}>
                  {item.label}
                </div>
                <div style={{
                  fontSize: 12, color: '#94A3B8', fontFamily: FONT,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {item.desc}
                </div>
              </div>
              <ChevronRight size={16} color={isActive ? '#0052FF' : '#CBD5E1'} />
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
      style={{
        position: 'absolute', top: '100%', left: 0, right: 0,
        marginTop: 8, zIndex: 500,
        background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
        borderRadius: 20, overflow: 'hidden',
        boxShadow: '0 25px 60px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05)',
        maxHeight: 420, overflowY: 'auto',
        paddingBottom: 8,
      }}
    >
      {items.length === 0 ? (
        <div style={{
          padding: '28px 20px', textAlign: 'center',
          fontSize: 13, color: '#94A3B8', fontFamily: FONT,
        }}>
          No results for "<strong style={{ color: '#64748B' }}>{query}</strong>"
        </div>
      ) : (
        <>
          {renderSection('Management', management)}
          {renderSection('Growth', growth)}
          {renderSection('Operations', operations)}
          {renderSection('App Options', appOptions)}
        </>
      )}
    </motion.div>
  )
}

/* ─── Suggested Actions (on focus, empty query) ─── */
function SuggestedActions({ onSelect }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
      style={{
        position: 'absolute', top: '100%', left: 0, right: 0,
        marginTop: 8, zIndex: 500,
        background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
        borderRadius: 20, overflow: 'hidden',
        boxShadow: '0 25px 60px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05)',
        padding: '16px 12px',
      }}
    >
      {/* Quick Actions Row */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 16, padding: '0 4px',
      }}>
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon
          return (
            <button
              key={action.id}
              onClick={() => onSelect(action)}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 8,
                padding: '16px 8px', borderRadius: 16, border: 'none',
                background: '#F8FAFC', cursor: 'pointer',
                transition: 'all 0.2s ease', fontFamily: FONT,
              }}
              className="cc-quick-action"
            >
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: '#0052FF12', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={18} color="#0052FF" strokeWidth={1.8} />
              </div>
              <span style={{
                fontSize: 12, fontWeight: 600, color: '#334155',
              }}>
                {action.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Suggested Actions */}
      <div style={{
        padding: '0 4px 4px', fontSize: 10, fontWeight: 700,
        letterSpacing: '0.1em', color: 'rgba(0,0,0,0.35)',
        textTransform: 'uppercase', fontFamily: FONT,
        marginBottom: 6,
      }}>
        Suggested Actions
      </div>
      {SUGGESTED_ACTIONS.map((action) => {
        const Icon = action.icon
        return (
          <div
            key={action.id}
            onClick={() => onSelect(action)}
            className="cc-suggested-row"
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 12px', borderRadius: 12,
              cursor: 'pointer', transition: 'background 0.12s',
            }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: '#F1F5F9', display: 'flex',
              alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Icon size={16} color="#64748B" strokeWidth={1.8} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: 13, fontWeight: 600, color: '#1E293B', fontFamily: FONT,
              }}>
                {action.label}
              </div>
              <div style={{
                fontSize: 11, color: '#94A3B8', fontFamily: FONT,
              }}>
                {action.desc}
              </div>
            </div>
            <ChevronRight size={14} color="#CBD5E1" />
          </div>
        )
      })}
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════
   ██  COMMAND CENTER HEADER  ██
   ═══════════════════════════════════════════════════ */
export default function CommandCenterHeader() {
  const { gym, logout } = useAuth()
  const { theme, isDark } = useTheme()
  const navigate = useNavigate()

  const [focused, setFocused] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [expanded, setExpanded] = useState(false)

  const inputRef = useRef(null)
  const containerRef = useRef(null)

  const ownerName = gym?.owner_name || 'Owner'
  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }, [])

  // Click outside to close
  useClickOutside(containerRef, useCallback(() => {
    setFocused(false)
    setExpanded(false)
    setQuery('')
  }, []))

  // Filter search results
  const filteredItems = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return ALL_ITEMS.filter(item =>
      item.label.toLowerCase().includes(q) ||
      item.desc.toLowerCase().includes(q)
    )
  }, [query])

  // Reset active index on results change
  useEffect(() => {
    setActiveIndex(0)
  }, [filteredItems.length])

  // Handle focus
  const handleFocus = () => {
    setFocused(true)
    setExpanded(true)
  }

  // Navigate to item
  const handleSelect = useCallback((item) => {
    setFocused(false)
    setExpanded(false)
    setQuery('')
    if (item.route === '__logout__') {
      logout()
      navigate('/login')
    } else {
      navigate(item.route)
    }
  }, [navigate, logout])

  // Keyboard navigation
  const handleKeyDown = useCallback((e) => {
    const items = query.trim() ? filteredItems : []
    if (e.key === 'Escape') {
      setFocused(false)
      setExpanded(false)
      setQuery('')
      inputRef.current?.blur()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(prev => Math.min(prev + 1, items.length - 1))
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(prev => Math.max(prev - 1, 0))
    }
    if (e.key === 'Enter' && items[activeIndex]) {
      e.preventDefault()
      handleSelect(items[activeIndex])
    }
  }, [query, filteredItems, activeIndex, handleSelect])

  const showResults = focused && query.trim().length > 0
  const showSuggested = focused && !query.trim()

  return (
    <div
      ref={containerRef}
      style={{
        background: '#0B0F19',
        borderRadius: '0 0 48px 48px',
        padding: '0 32px',
        paddingTop: 20,
        paddingBottom: expanded ? 32 : 24,
        position: 'relative', zIndex: 200,
        transition: 'padding-bottom 0.35s cubic-bezier(0.23, 1, 0.32, 1)',
        overflow: 'visible',
      }}
    >
      {/* ─── Top Row: Logo + Profile (COCA anchor) ─── */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
        minHeight: 52,
      }}>
        {/* Left: IVIRA logo — fixed h-8 (32px), vertically center-aligned with profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            height: 32, display: 'flex', alignItems: 'center',
          }}>
            <span style={{
              fontFamily: FONT, fontWeight: 800, fontSize: 22,
              letterSpacing: '-0.5px', color: '#FFFFFF',
              lineHeight: 1,
            }}>
              IVIRA
            </span>
          </div>
          <div style={{
            width: 1, height: 24, background: 'rgba(255,255,255,0.12)',
          }} />
          <div>
            <div style={{
              fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.5)',
              fontFamily: FONT, lineHeight: 1.2,
            }}>
              {greeting},
            </div>
            <div style={{
              fontSize: 16, fontWeight: 700, color: '#FFFFFF',
              fontFamily: FONT, letterSpacing: '-0.02em', lineHeight: 1.2,
            }}>
              {ownerName}
            </div>
          </div>
        </div>

        {/* Right: profile photo — vertically center-aligned with logo */}
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          border: '2.5px solid rgba(0,82,255,0.5)',
          padding: 2, flexShrink: 0,
        }}>
          <Avatar name={ownerName} size={36} style={{ borderRadius: '50%' }} />
        </div>
      </div>

      {/* ─── Search Bar + Bell Row ─── */}
      <div style={{
        display: 'flex', gap: 12, alignItems: 'center',
        position: 'relative',
      }}>
        {/* Search input container */}
        <div style={{
          flex: 1, position: 'relative',
          display: 'flex', alignItems: 'center',
          background: 'rgba(255,255,255,0.10)',
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          borderRadius: 16,
          border: focused
            ? '1.5px solid rgba(0,82,255,0.5)'
            : '1.5px solid rgba(255,255,255,0.06)',
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          boxShadow: focused ? '0 0 0 4px rgba(0,82,255,0.12)' : 'none',
          padding: '0 16px',
        }}>
          <Search size={18} color="rgba(255,255,255,0.45)" strokeWidth={2} style={{ flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            placeholder="Search members, payments, settings..."
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              height: 48, fontSize: 14, fontWeight: 400,
              color: '#FFFFFF', fontFamily: FONT,
              padding: '0 12px',
            }}
          />
          {query && (
            <button
              onClick={() => { setQuery(''); inputRef.current?.focus() }}
              style={{
                width: 24, height: 24, borderRadius: 8,
                background: 'rgba(255,255,255,0.12)', border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', flexShrink: 0,
              }}
            >
              <X size={12} color="rgba(255,255,255,0.6)" />
            </button>
          )}
          {!focused && (
            <div style={{
              fontSize: 11, color: 'rgba(255,255,255,0.3)',
              padding: '3px 8px', borderRadius: 6,
              border: '1px solid rgba(255,255,255,0.12)',
              fontWeight: 500, fontFamily: FONT, flexShrink: 0,
              whiteSpace: 'nowrap',
            }}>
              ⌘K
            </div>
          )}

          {/* ─── Search Results Dropdown ─── */}
          <AnimatePresence>
            {showResults && (
              <SearchOverlay
                query={query}
                activeIndex={activeIndex}
                onSelect={handleSelect}
                onHover={setActiveIndex}
                items={filteredItems}
              />
            )}
            {showSuggested && (
              <SuggestedActions onSelect={handleSelect} />
            )}
          </AnimatePresence>
        </div>

        {/* Notification Bell */}
        <HeaderBell hasNotifications={true} />
      </div>

      {/* ─── Keyboard shortcut listener ─── */}
      <KeyboardShortcut onOpen={() => { setFocused(true); setExpanded(true); inputRef.current?.focus() }} />

      {/* Hover styles */}
      <style>{`
        .cc-bell-btn:hover {
          background: rgba(255,255,255,0.18) !important;
          transform: scale(1.04);
        }
        .cc-quick-action:hover {
          background: #F1F5F9 !important;
          transform: translateY(-2px);
        }
        .cc-suggested-row:hover {
          background: #F1F5F9;
        }
        input::placeholder {
          color: rgba(255,255,255,0.35);
        }
      `}</style>
    </div>
  )
}

/* ─── Cmd+K Global Shortcut ─── */
function KeyboardShortcut({ onOpen }) {
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        onOpen()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onOpen])
  return null
}
