import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import {
  LayoutDashboard, Users, ScanLine, ClipboardList,
  LogOut, Activity, Menu, X, Globe, UserPlus, Settings,
} from 'lucide-react'
import { useState } from 'react'

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/scanner', icon: ScanLine, label: 'Scanner' },
  { to: '/members', icon: Users, label: 'Members' },
  { to: '/checkins', icon: ClipboardList, label: 'Check-ins' },
  { to: '/prospects', icon: UserPlus, label: 'Prospects' },
  { to: '/leads', icon: Globe, label: 'Lead Pool' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function Layout() {
  const { gym, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0f' }}>
      {/* Mobile menu button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        style={{
          position: 'fixed', top: 16, left: 16, zIndex: 50,
          background: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 8,
          padding: 8, color: '#fff', cursor: 'pointer',
          display: 'none',
        }}
        className="mobile-menu-btn"
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <aside
        style={{
          width: 240, background: '#0d0d14', borderRight: '1px solid #1a1a2e',
          display: 'flex', flexDirection: 'column', padding: '24px 0',
          position: 'fixed', top: 0, bottom: 0, left: 0, zIndex: 40,
          transform: sidebarOpen ? 'translateX(0)' : undefined,
        }}
        className="sidebar"
      >
        {/* Brand */}
        <div style={{ padding: '0 20px 24px', borderBottom: '1px solid #1a1a2e' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #10B981, #059669)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Activity size={18} color="#fff" />
            </div>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}><span style={{ opacity: 0.45 }}>I</span><span>VIRA</span></div>
              <div style={{ color: '#666', fontSize: 11 }}>Owner Dashboard</div>
            </div>
          </div>
          {gym && (
            <div style={{ marginTop: 14, padding: '8px 10px', background: '#1a1a2e', borderRadius: 8 }}>
              <div style={{ color: '#ccc', fontSize: 13, fontWeight: 600 }}>{gym.name}</div>
              <div style={{ color: '#666', fontSize: 11, marginTop: 2 }}>{gym.city}</div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '16px 10px' }}>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 8, marginBottom: 4,
                color: isActive ? '#fff' : '#888',
                background: isActive ? '#10B98115' : 'transparent',
                textDecoration: 'none', fontSize: 14, fontWeight: 500,
                transition: 'all 0.15s',
              })}
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div style={{ padding: '16px 10px', borderTop: '1px solid #1a1a2e' }}>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 8, width: '100%',
              background: 'transparent', border: 'none', color: '#888',
              cursor: 'pointer', fontSize: 14, fontWeight: 500,
            }}
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, marginLeft: 240, padding: '24px 32px', minHeight: '100vh' }} className="main-content">
        <Outlet />
      </main>

      <style>{`
        @media (max-width: 768px) {
          .sidebar { transform: translateX(-100%); transition: transform 0.2s; }
          .sidebar[style*="translateX(0)"] { transform: translateX(0) !important; }
          .main-content { margin-left: 0 !important; padding: 16px !important; padding-top: 56px !important; }
          .mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </div>
  )
}
