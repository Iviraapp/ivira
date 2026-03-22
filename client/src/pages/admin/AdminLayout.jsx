import { useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, Building2, Package, TrendingUp, Link2, Megaphone, LogOut, MessageSquare, Wallet, Search, Target, Ship, ScrollText, Shield } from 'lucide-react'

const FONT = "'Inter', -apple-system, sans-serif"

// Deep Navy palette — distinct from standard IVIRA black
const N = {
  bg: '#0A0F1E',
  sidebar: '#0F1629',
  card: '#141C33',
  border: '#1E2A4A',
  borderLight: '#253352',
  text: '#E2E8F0',
  textSec: '#94A3B8',
  textTer: '#64748B',
  accent: '#1A3A8F',
  accentSoft: 'rgba(26,58,143,0.12)',
  accentGlow: 'rgba(26,58,143,0.25)',
  red: '#EF4444',
  green: '#22C55E',
  amber: '#F59E0B',
}

const NAV_ITEMS = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/fleet', label: 'Fleet', icon: Ship },
  { to: '/admin/leads', label: 'Leads', icon: Target },
  { to: '/admin/gyms', label: 'Gyms', icon: Building2 },
  { to: '/admin/packages', label: 'Packages', icon: Package },
  { to: '/admin/revenue', label: 'Revenue', icon: TrendingUp },
  { to: '/admin/payouts', label: 'Payouts', icon: Wallet },
  { to: '/admin/affiliate', label: 'Affiliate', icon: Link2 },
  { to: '/admin/performance', label: 'Performance', icon: TrendingUp },
  { to: '/admin/sponsors', label: 'Sponsors', icon: Megaphone },
  { to: '/admin/ads', label: 'Ad Manager', icon: Megaphone },
  { to: '/admin/audit', label: 'Audit Log', icon: ScrollText },
  { to: '/admin/support', label: 'Support', icon: MessageSquare },
]

export default function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const token = localStorage.getItem('ivira_admin_token')
    if (!token) navigate('/admin/login', { replace: true })
  }, [navigate, location.pathname])

  const handleLogout = () => {
    localStorage.removeItem('ivira_admin_token')
    navigate('/admin/login', { replace: true })
  }

  return (
    <div style={{ minHeight: '100vh', background: N.bg, display: 'flex', fontFamily: FONT }}>
      {/* Sidebar */}
      <aside style={{
        width: 240, background: N.sidebar, display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100,
        borderRight: `1px solid ${N.border}`,
      }}>
        {/* Brand */}
        <div style={{ padding: '24px 20px', borderBottom: `1px solid ${N.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: 'linear-gradient(135deg, #1A3A8F, #3B6FD4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: 16,
            }}>G</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: N.text, lineHeight: 1.2, letterSpacing: 2 }}>IVIRA</div>
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '1.5px',
                color: N.accent, textTransform: 'uppercase',
              }}>
                COMMAND CENTER
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                textDecoration: 'none', transition: 'all 0.15s',
                background: isActive ? N.accentSoft : 'transparent',
                color: isActive ? N.accent : N.textSec,
                borderLeft: isActive ? `3px solid ${N.accent}` : '3px solid transparent',
              })}
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div style={{ padding: '12px 10px', borderTop: `1px solid ${N.border}` }}>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: '9px 12px', borderRadius: 8, fontSize: 13, fontWeight: 500,
              background: 'transparent', border: 'none', color: N.red,
              cursor: 'pointer', fontFamily: FONT,
            }}
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div style={{ marginLeft: 240, flex: 1, minHeight: '100vh' }}>
        {/* Top Bar */}
        <header style={{
          height: 52, background: N.card, borderBottom: `1px solid ${N.border}`,
          display: 'flex', alignItems: 'center', padding: '0 24px',
          position: 'sticky', top: 0, zIndex: 50,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '4px 12px', borderRadius: 6,
            background: 'rgba(26,58,143,0.08)', border: `1px solid ${N.accent}40`,
          }}>
            <Shield size={13} color={N.accent} />
            <span style={{ fontSize: 11, fontWeight: 700, color: N.accent, letterSpacing: '1px', textTransform: 'uppercase' }}>
              System Mode
            </span>
          </div>
          <div style={{ flex: 1 }} />
          <button
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 14px', borderRadius: 8,
              background: 'transparent', border: `1px solid ${N.border}`,
              color: N.textSec, cursor: 'pointer',
              fontSize: 13, fontFamily: FONT,
            }}
          >
            <Search size={14} />
            <span>Search</span>
            <span style={{
              fontSize: 11, padding: '1px 6px', borderRadius: 4,
              border: `1px solid ${N.border}`, color: N.textTer,
              fontWeight: 500, marginLeft: 4,
            }}>
              {navigator.platform?.includes('Mac') ? '\u2318K' : 'Ctrl+K'}
            </span>
          </button>
        </header>

        {/* Page Content */}
        <main style={{ padding: 24, maxWidth: 1440 }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
