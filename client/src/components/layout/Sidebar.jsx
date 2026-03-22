import { useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import api from '../../lib/api'
import {
  LayoutDashboard, Users, QrCode, CreditCard, Mail, Globe, BarChart3,
  Settings, LogOut, Dumbbell, UserCog, X, MapPin, ShieldCheck, ShoppingBag, Award, TrendingUp, Activity, Lock, Heart,
} from 'lucide-react'
import { useAllFeatures } from '../../hooks/useFeatureGate'

const FONT = "'Inter', -apple-system, sans-serif"

const navGroups = [
  {
    label: 'MANAGEMENT',
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/dashboard/pulse', label: 'Live Pulse', icon: Activity },
      { path: '/dashboard/members', label: 'Members', icon: Users },
      { path: '/dashboard/payments', label: 'Payments', icon: CreditCard, adminOnly: true },
      { path: '/dashboard/classes', label: 'Classes', icon: Dumbbell },
    ],
  },
  {
    label: 'GROWTH',
    items: [
      { path: '/dashboard/store', label: 'Store', icon: ShoppingBag },
      { path: '/dashboard/affiliate', label: 'Affiliate', icon: Globe, featureSlug: 'affiliate' },
      { path: '/dashboard/newsletter', label: 'Newsletter', icon: Mail, featureSlug: 'newsletter' },
      { path: '/dashboard/analytics', label: 'Analytics', icon: BarChart3, featureSlug: 'analytics' },
    ],
  },
  {
    label: 'HEALTH',
    items: [
      { path: '/dashboard/care-compass', label: 'Care Compass', icon: Heart, featureSlug: 'care-compass' },
    ],
  },
  {
    label: 'OPERATIONS',
    items: [
      { path: '/dashboard/checkins', label: 'Check-ins', icon: QrCode, badgeKey: 'todayCheckins' },
      { path: '/dashboard/staff', label: 'Staff', icon: UserCog, featureSlug: 'staff' },
      { path: '/dashboard/staff-checkin', label: 'Staff Check-in', icon: ShieldCheck, featureSlug: 'staff-checkin' },
      { path: '/dashboard/trainers', label: 'Trainers', icon: Award, featureSlug: 'trainers' },
      { path: '/dashboard/staff-performance', label: 'Performance', icon: TrendingUp, featureSlug: 'staff-performance' },
      { path: '/dashboard/settings', label: 'Settings', icon: Settings },
    ],
  },
]

export default function Sidebar({ open, onClose }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { logout, gym, isAdmin } = useAuth()
  const { theme, isDark, sp } = useTheme()
  const { featureMap: features } = useAllFeatures()

  const { data: statsData } = useQuery({
    queryKey: ['gym-stats', gym?.id],
    queryFn: () => api.get(`/gyms/${gym.id}/stats`).then((r) => r.data),
    enabled: !!gym?.id,
    refetchInterval: 30_000,
  })

  const isActive = (path) => {
    if (path === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(path)
  }

  const handleNav = (path) => { navigate(path); onClose?.() }
  const handleNavItem = (item) => {
    if (item.featureSlug && !features[item.featureSlug]?.allowed) return
    handleNav(item.path)
  }
  const ownerInitial = (gym?.owner_name || gym?.gym_name || 'G').charAt(0).toUpperCase()

  return (
    <>
      {open && (
        <div onClick={onClose} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)', zIndex: 199, display: 'none',
        }} className="sidebar-overlay" />
      )}

      <aside style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, width: 260,
        background: theme.sidebarBg,
        borderRight: `1px solid ${theme.border}`,
        display: 'flex', flexDirection: 'column', zIndex: 200,
        transition: 'transform 0.2s ease',
        fontFamily: FONT,
      }} className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        {/* Brand */}
        <div style={{ padding: `${sp(24)}px ${sp(20)}px ${sp(20)}px` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{
                fontFamily: FONT,
                fontWeight: 700, fontSize: 20, letterSpacing: '-0.5px',
                color: theme.text,
              }}>IVIRA</div>
              <div style={{ fontSize: 12, color: theme.textTer, marginTop: 2, fontWeight: 400, fontFamily: FONT }}>
                {gym?.gym_name || 'Dashboard'}
              </div>
            </div>
            <button onClick={onClose} className="sidebar-close" style={{
              display: 'none', width: 28, height: 28, borderRadius: 8, border: 'none',
              background: theme.bgTer, color: theme.textSec, alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer',
            }}>
              <X size={16} />
            </button>
          </div>
          <div style={{
            marginTop: 16, height: 1,
            background: theme.border,
          }} />
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: `4px ${sp(12)}px`, overflow: 'auto' }}>
          {navGroups.map((group) => (
            <div key={group.label} style={{ marginBottom: 8 }}>
              <div style={{
                fontSize: 10, fontWeight: 600, color: theme.textTer,
                letterSpacing: '1.2px', textTransform: 'uppercase',
                padding: `${sp(12)}px ${sp(16)}px 6px`, userSelect: 'none',
                fontFamily: FONT,
              }}>{group.label}</div>
              {group.items.filter((item) => !item.adminOnly || isAdmin).map((item) => {
                const active = isActive(item.path)
                const Icon = item.icon
                const badgeValue = item.badgeKey && statsData?.[item.badgeKey]
                const featureLocked = item.featureSlug && !features[item.featureSlug]?.allowed
                return (
                  <button key={item.path} onClick={() => handleNavItem(item)}
                    className="sidebar-nav-item"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                      padding: `${sp(10)}px ${sp(16)}px`, borderRadius: 8, border: 'none',
                      cursor: featureLocked ? 'default' : 'pointer',
                      fontSize: 14, fontWeight: active ? 600 : 400, marginBottom: 2,
                      background: active && !featureLocked ? theme.brandAccentSoft : 'transparent',
                      color: active && !featureLocked ? theme.brandAccent : theme.textSec,
                      opacity: featureLocked ? 0.4 : 1,
                      transition: 'all 0.15s ease', textAlign: 'left', position: 'relative',
                      fontFamily: FONT,
                    }}
                  >
                    <Icon size={18} strokeWidth={active && !featureLocked ? 2 : 1.5}
                      style={{ color: active && !featureLocked ? theme.brandAccent : theme.textTer, transition: 'all 0.15s ease', flexShrink: 0 }}
                    />
                    {item.label}
                    {featureLocked && (
                      <Lock size={12} style={{ marginLeft: 'auto', opacity: 0.5 }} />
                    )}
                    {!featureLocked && badgeValue > 0 && (
                      <span style={{
                        marginLeft: 'auto', fontSize: 10, fontWeight: 600,
                        fontFamily: "'JetBrains Mono', monospace",
                        color: isDark ? '#000' : '#fff',
                        background: theme.text, padding: '2px 7px', borderRadius: 10,
                        lineHeight: 1.3, minWidth: 18, textAlign: 'center',
                      }}>{badgeValue}</span>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Bottom section */}
        <div style={{ padding: `${sp(12)}px` }}>
          <div style={{ height: 1, marginBottom: 12, background: theme.border }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: `${sp(8)}px ${sp(12)}px`, marginBottom: 4 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: theme.bgTer,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: theme.text, fontWeight: 600, fontSize: 13,
              fontFamily: FONT, flexShrink: 0,
            }}>{ownerInitial}</div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: theme.text, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', fontFamily: FONT }}>
                {gym?.owner_name || 'Owner'}
              </div>
              <div style={{ fontSize: 11, color: theme.textTer, marginTop: -1, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', fontFamily: FONT }}>
                {gym?.gym_name || 'Gym'}
              </div>
            </div>
          </div>

          {/* Tier-based Support Button */}
          {(() => {
            const plan = (gym?.subscription_plan || gym?.plan_name || '').toLowerCase()
            const isEnterprise = plan.includes('enterprise') || plan.includes('pro')
            const isGrowth = !isEnterprise && (plan.includes('growth'))
            const ownerName = encodeURIComponent(gym?.owner_name || 'Owner')
            const gymName = encodeURIComponent(gym?.gym_name || 'Gym')

            if (isEnterprise) {
              return (
                <button
                  className="sidebar-support-btn"
                  onClick={() => {
                    api.post(`/gyms/${gym?.id}/support/priority`, { type: 'emergency', source: 'sidebar' }).catch(() => {})
                    window.open(`https://wa.me/919876543210?text=Hi%20IVIRA%20Team,%20this%20is%20${ownerName}%20from%20${gymName}.%20I%20need%20priority%20assistance%20with%20[Subject]`, '_blank')
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                    padding: `${sp(9)}px ${sp(12)}px`, borderRadius: 8,
                    border: '1px solid #1A3A8F', cursor: 'pointer',
                    fontSize: 13, fontWeight: 500, background: '#0A0A0A',
                    color: '#1A3A8F', transition: 'all 0.15s ease',
                    textAlign: 'left', fontFamily: FONT, marginBottom: 4,
                    textShadow: '0 0 8px rgba(26,58,143,0.4)',
                  }}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#1A3A8F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M12 2l2.09 6.26L20.18 9l-5 4.27L16.82 20 12 16.77 7.18 20l1.64-6.73L3.82 9l6.09-.74z" />
                  </svg>
                  <span style={{ flex: 1 }}>Priority Support</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#22C55E', fontWeight: 600 }}>
                    <span className="sidebar-pulse-dot" style={{
                      width: 6, height: 6, borderRadius: '50%', background: '#22C55E',
                      display: 'inline-block',
                    }} />
                    Live Now
                  </span>
                </button>
              )
            }

            if (isGrowth) {
              return (
                <button
                  className="sidebar-support-btn"
                  onClick={() => {
                    api.post(`/gyms/${gym?.id}/support/priority`, { type: 'vip', source: 'sidebar' }).catch(() => {})
                    window.open(`https://wa.me/919876543210?text=Hi%20IVIRA%20Team,%20this%20is%20${ownerName}%20from%20${gymName}.%20I%20need%20help%20with%20[Subject]`, '_blank')
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                    padding: `${sp(9)}px ${sp(12)}px`, borderRadius: 8,
                    border: `1px solid ${theme.border}`, cursor: 'pointer',
                    fontSize: 13, fontWeight: 400, background: 'transparent',
                    color: theme.textSec, transition: 'all 0.15s ease',
                    textAlign: 'left', fontFamily: FONT, marginBottom: 4,
                  }}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  VIP Help Desk
                </button>
              )
            }

            // Default: Starter / Standard tier
            return (
              <button
                className="sidebar-support-btn"
                onClick={() => window.open('#', '_self')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                  padding: `${sp(9)}px ${sp(12)}px`, borderRadius: 8,
                  border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 400, background: 'transparent',
                  color: theme.textTer, transition: 'all 0.15s ease',
                  textAlign: 'left', fontFamily: FONT, marginBottom: 4,
                }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                Documentation
              </button>
            )
          })()}

          <button onClick={() => { logout(); navigate('/login') }}
            className="sidebar-logout-btn"
            style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: `${sp(9)}px ${sp(12)}px`, borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 400, background: 'transparent', color: theme.textSec,
              transition: 'all 0.15s ease', textAlign: 'left', fontFamily: FONT,
            }}>
            <LogOut size={17} strokeWidth={1.5} />
            Logout
          </button>
        </div>
      </aside>

      <style>{`
        .sidebar-nav-item:hover {
          background: ${theme.bgHover} !important;
          color: ${theme.text} !important;
        }
        .sidebar-nav-item:hover svg {
          color: ${theme.text} !important;
        }
        .sidebar-logout-btn:hover {
          background: ${theme.red}10 !important;
          color: ${theme.red} !important;
        }
        .sidebar-logout-btn:hover svg {
          color: ${theme.red} !important;
        }
        .sidebar-support-btn:hover {
          background: ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'} !important;
        }
        @keyframes sidebarPulseDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.75); }
        }
        .sidebar-pulse-dot {
          animation: sidebarPulseDot 2s ease-in-out infinite;
        }
        .sidebar nav::-webkit-scrollbar { width: 4px; }
        .sidebar nav::-webkit-scrollbar-track { background: transparent; }
        .sidebar nav::-webkit-scrollbar-thumb { background: ${theme.border}; border-radius: 4px; }
        @media (max-width: 768px) {
          .sidebar { transform: translateX(-100%); }
          .sidebar.sidebar-open { transform: translateX(0); }
          .sidebar-overlay { display: block !important; }
          .sidebar-close { display: flex !important; }
        }
      `}</style>
    </>
  )
}
