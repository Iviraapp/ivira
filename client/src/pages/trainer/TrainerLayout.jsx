import { useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { CalendarDays, Users, Wallet, LayoutDashboard, LogOut } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

const FONT = "'Inter', -apple-system, sans-serif"

const NAV = [
  { to: '/trainer/dashboard', label: 'Today', icon: LayoutDashboard },
  { to: '/trainer/clients', label: 'Clients', icon: Users },
  { to: '/trainer/schedule', label: 'Schedule', icon: CalendarDays },
  { to: '/trainer/earnings', label: 'Earnings', icon: Wallet },
]

export default function TrainerLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { theme } = useTheme()

  useEffect(() => {
    const token = localStorage.getItem('ivira_trainer_token')
    if (!token) navigate('/trainer/login', { replace: true })
  }, [navigate, location.pathname])

  const handleLogout = () => {
    localStorage.removeItem('ivira_trainer_token')
    navigate('/trainer/login', { replace: true })
  }

  return (
    <div style={{ minHeight: '100vh', background: theme.bg, display: 'flex', fontFamily: FONT }}>
      {/* Sidebar */}
      <aside style={{
        width: 220, background: theme.bgSec, display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100,
        borderRight: `1px solid ${theme.border}`,
      }}>
        <div style={{ padding: '24px 20px', borderBottom: `1px solid ${theme.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: 'linear-gradient(135deg, #1A3A8F, #3B6FD4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: 16,
            }}>G</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: theme.text, letterSpacing: 2 }}>IVIRA</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: theme.brandAccent, letterSpacing: '1px', textTransform: 'uppercase' }}>
                TRAINER
              </div>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to} to={to}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 14px', borderRadius: 10, fontSize: 14, fontWeight: 500,
                textDecoration: 'none', minHeight: 48,
                background: isActive ? theme.brandAccentSoft : 'transparent',
                color: isActive ? theme.brandAccent : theme.textSec,
                borderLeft: isActive ? `3px solid ${theme.brandAccent}` : '3px solid transparent',
              })}
            >
              <Icon size={20} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div style={{ padding: '16px 12px', borderTop: `1px solid ${theme.border}` }}>
          <button onClick={handleLogout} style={{
            display: 'flex', alignItems: 'center', gap: 10, width: '100%',
            padding: '12px 14px', borderRadius: 10, fontSize: 14, fontWeight: 500,
            background: 'transparent', border: 'none', color: theme.red,
            cursor: 'pointer', fontFamily: FONT, minHeight: 48,
          }}>
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      <div style={{ marginLeft: 220, flex: 1, padding: 24, maxWidth: 1200 }}>
        <Outlet />
      </div>
    </div>
  )
}
