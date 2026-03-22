import { useState } from 'react'
import { Outlet, Navigate, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import Navbar from './Navbar'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'

export default function DashboardLayout() {
  const { isAuthenticated } = useAuth()
  const { theme } = useTheme()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const impersonateGymId = localStorage.getItem('ivira_impersonate_gym_id')
  const impersonateGymName = localStorage.getItem('ivira_impersonate_gym_name')
  const isImpersonating = !!impersonateGymId

  const handleExitImpersonation = () => {
    localStorage.removeItem('ivira_impersonate_gym_id')
    localStorage.removeItem('ivira_impersonate_gym_name')
    navigate('/admin/gyms')
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />

  return (
    <div style={{
      minHeight: '100vh',
      background: theme.bg,
      fontFamily: "'Inter', -apple-system, sans-serif",
      color: theme.text,
      transition: 'background 0.3s, color 0.3s',
      paddingTop: isImpersonating ? 40 : 0,
    }}>
      {isImpersonating && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, height: 40,
          background: theme.amber, color: '#000',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 12, fontSize: 13, fontWeight: 600, zIndex: 9999,
          fontFamily: "'Inter', -apple-system, sans-serif",
        }}>
          You are viewing as: {impersonateGymName || impersonateGymId}
          <button
            onClick={handleExitImpersonation}
            style={{
              padding: '4px 14px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.3)',
              background: 'rgba(0,0,0,0.15)', color: '#000', fontSize: 12, fontWeight: 700,
              cursor: 'pointer', fontFamily: "'Inter', -apple-system, sans-serif",
            }}
          >
            Back to Super Admin
          </button>
        </div>
      )}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div style={{ marginLeft: 260 }} className="main-content">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />
        <main style={{
          padding: '24px 32px', maxWidth: 1400,
          animation: 'dashFadeInUp 0.35s ease both',
        }}>
          <Outlet />
        </main>
      </div>

      <style>{`
        @keyframes dashFadeInUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @media (max-width: 768px) {
          .main-content { margin-left: 0 !important; }
          .main-content main { padding: 16px !important; }
        }
      `}</style>
    </div>
  )
}
