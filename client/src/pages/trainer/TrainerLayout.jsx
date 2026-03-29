import { useEffect, useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { CalendarDays, Users, Wallet, LayoutDashboard, LogOut, Menu, X } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

const FONT = "'Inter', -apple-system, sans-serif"

const NAV = [
  { to: '/trainer/dashboard', label: 'Today', icon: LayoutDashboard },
  { to: '/trainer/clients', label: 'Clients', icon: Users },
  { to: '/trainer/schedule', label: 'Schedule', icon: CalendarDays },
  { to: '/trainer/earnings', label: 'Earnings', icon: Wallet },
]

/** Decode a JWT payload without verifying the signature (server verifies). */
function decodeJWT(token) {
  try {
    const payload = token.split('.')[1]
    const padded = payload.replace(/-/g, '+').replace(/_/g, '/').padEnd(
      payload.length + (4 - payload.length % 4) % 4, '='
    )
    return JSON.parse(atob(padded))
  } catch {
    return null
  }
}

export default function TrainerLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { theme } = useTheme()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [trainerInfo, setTrainerInfo] = useState({ name: '', role: '' })
  const isMobile = window.innerWidth < 768

  useEffect(() => {
    const token = localStorage.getItem('ivira_trainer_token')
    if (!token) { navigate('/trainer/login', { replace: true }); return }
    const payload = decodeJWT(token)
    if (payload) {
      const name = payload.name || payload.staff_name || payload.email?.split('@')[0] || 'Trainer'
      const role = payload.role || 'trainer'
      setTrainerInfo({ name, role })
    }
  }, [navigate, location.pathname])

  // Close sidebar on route change (mobile)
  useEffect(() => { setSidebarOpen(false) }, [location.pathname])

  const handleLogout = () => {
    localStorage.removeItem('ivira_trainer_token')
    navigate('/trainer/login', { replace: true })
  }

  const sidebarContent = (
    <>
      <div style={{ padding: '24px 20px', borderBottom: `1px solid ${theme.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: `linear-gradient(135deg, ${theme.brandAccent}, #3B6FD4)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: 16,
            }}>{trainerInfo.name ? trainerInfo.name[0].toUpperCase() : 'T'}</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: theme.text, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {trainerInfo.name || 'Trainer'}
              </div>
              <div style={{ fontSize: 10, fontWeight: 600, color: theme.brandAccent, letterSpacing: '1px', textTransform: 'uppercase' }}>
                {trainerInfo.role || 'TRAINER'}
              </div>
            </div>
          </div>
          {isMobile && (
            <button
              onClick={() => setSidebarOpen(false)}
              style={{ background: 'none', border: 'none', color: theme.textSec, cursor: 'pointer', padding: 4 }}
            ><X size={20} /></button>
          )}
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
              transition: 'all 0.15s',
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
    </>
  )

  return (
    <div style={{ minHeight: '100vh', background: theme.bg, display: 'flex', fontFamily: FONT }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            zIndex: 99, display: isMobile ? 'block' : 'none',
          }}
        />
      )}

      {/* Desktop sidebar */}
      <aside style={{
        width: 220, background: theme.bgSec, display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100,
        borderRight: `1px solid ${theme.border}`,
        transform: isMobile ? (sidebarOpen ? 'translateX(0)' : 'translateX(-100%)') : 'translateX(0)',
        transition: 'transform 0.25s ease',
      }}>
        {sidebarContent}
      </aside>

      {/* Main content */}
      <div style={{
        marginLeft: isMobile ? 0 : 220,
        flex: 1,
        padding: isMobile ? '0 0 80px' : 24,
        maxWidth: isMobile ? '100%' : 1200,
        minWidth: 0,
      }}>
        {/* Mobile top bar */}
        {isMobile && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '16px 20px', borderBottom: `1px solid ${theme.border}`,
            background: theme.bgSec, position: 'sticky', top: 0, zIndex: 50,
          }}>
            <button
              onClick={() => setSidebarOpen(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.text, padding: 4 }}
            ><Menu size={22} /></button>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: theme.text }}>
                {trainerInfo.name || <><span style={{ opacity: 0.4 }}>I</span>VIRA</>}
              </div>
              {trainerInfo.role && (
                <div style={{ fontSize: 10, color: theme.brandAccent, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>
                  {trainerInfo.role}
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ padding: isMobile ? '20px 16px' : 0 }}>
          <Outlet />
        </div>
      </div>

      {/* Mobile bottom nav */}
      {isMobile && (
        <nav style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: theme.bgSec, borderTop: `1px solid ${theme.border}`,
          display: 'flex', zIndex: 100,
        }}>
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to} to={to}
              style={({ isActive }) => ({
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', padding: '10px 0', gap: 4,
                textDecoration: 'none',
                color: isActive ? theme.brandAccent : theme.textTer,
                borderTop: isActive ? `2px solid ${theme.brandAccent}` : '2px solid transparent',
              })}
            >
              <Icon size={20} />
              <span style={{ fontSize: 10, fontWeight: 500 }}>{label}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  )
}
