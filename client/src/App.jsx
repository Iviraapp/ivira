import { Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import DashboardLayout from './components/layout/DashboardLayout'
import Skeleton from './components/ui/Skeleton'
import { useTheme } from './context/ThemeContext'
import CommandBar from './components/CommandBar'
import PWAInstallPrompt from './components/PWAInstallPrompt'
import WellbeingWidget from './components/WellbeingWidget'
import CookieConsent from './components/CookieConsent'

// Pages
import Login from './pages/Login'
import Onboarding from './pages/Onboarding'
import Home from './pages/dashboard/Home'
import Members from './pages/dashboard/Members'
import Checkins from './pages/dashboard/Checkins'
import Payments from './pages/dashboard/Payments'
import Newsletter from './pages/dashboard/Newsletter'
import Affiliate from './pages/dashboard/Affiliate'
import Analytics from './pages/dashboard/Analytics'
import SettingsPage from './pages/dashboard/Settings'
import Classes from './pages/dashboard/Classes'
import Staff from './pages/dashboard/Staff'
import StaffCheckin from './pages/dashboard/StaffCheckin'
import MemberPortal from './pages/member/MemberPortal'
import MemberLogin from './pages/member/MemberLogin'
import MemberDashboard from './pages/member/MemberDashboard'
import CheckinPage from './pages/public/CheckinPage'
import StorePage from './pages/public/StorePage'
import GymFinder from './pages/GymFinder'
import FirstTimeSetup from './pages/FirstTimeSetup'
import Store from './pages/dashboard/Store'
import Trainers from './pages/dashboard/Trainers'
import MemberProfile from './pages/dashboard/MemberProfile'
import StaffPerformance from './pages/dashboard/StaffPerformance'
import LivePulse from './pages/dashboard/LivePulse'
import MemberOnboarding from './pages/member/MemberOnboarding'
import Landing from './pages/Landing'
import AppLanding from './pages/AppLanding'
import Privacy from './pages/legal/Privacy'
import Terms from './pages/legal/Terms'
import Contact from './pages/legal/Contact'

// Trainer pages
import TrainerLogin from './pages/trainer/TrainerLogin'
import TrainerLayout from './pages/trainer/TrainerLayout'
import TrainerDashboard from './pages/trainer/TrainerDashboard'
import TrainerClients from './pages/trainer/TrainerClients'
import TrainerEarnings from './pages/trainer/TrainerEarnings'
import TrainerSchedule from './pages/trainer/TrainerSchedule'

// Vira AI (Health/Wellness)
import ViraLayout from './pages/vira/ViraLayout'

// Care Compass
import CareCompass from './pages/dashboard/CareCompass'

// Financial Intelligence
import Finance from './pages/dashboard/Finance'

// Admin pages
import AdminLogin from './pages/admin/AdminLogin'
import AdminLayout from './pages/admin/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminGyms from './pages/admin/AdminGyms'
import AdminPackages from './pages/admin/AdminPackages'
import AdminRevenue from './pages/admin/AdminRevenue'
import AdminAffiliate from './pages/admin/AdminAffiliate'
import AdminSponsors from './pages/admin/AdminSponsors'
import AdminSupport from './pages/admin/AdminSupport'
import AdminPerformance from './pages/admin/AdminPerformance'
import AdminPayouts from './pages/admin/AdminPayouts'
import AdminLeads from './pages/admin/AdminLeads'
import AdminFleet from './pages/admin/AdminFleet'
import AdminAudit from './pages/admin/AdminAudit'
import AdminAds from './pages/admin/AdminAds'

function PageLoader() {
  return (
    <div style={{ padding: 40 }}>
      <Skeleton width={200} height={28} style={{ marginBottom: 16 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[1,2,3,4].map(i => <Skeleton key={i} height={100} radius={12} />)}
      </div>
      <Skeleton height={300} radius={12} />
    </div>
  )
}

function NotFound() {
  const { theme } = useTheme()
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', background: theme.bg,
    }}>
      <div style={{
        fontSize: 80, fontWeight: 900, letterSpacing: '-2px',
        color: theme.text,
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}>404</div>
      <p style={{ fontSize: 16, color: theme.textSec, marginBottom: 24, fontFamily: "'Inter', -apple-system, sans-serif" }}>Page not found</p>
      <a href="/dashboard" style={{
        color: theme.text, fontWeight: 600, fontSize: 14,
        fontFamily: "'Inter', -apple-system, sans-serif",
        padding: '10px 24px', borderRadius: 10,
        border: `1px solid ${theme.border}`,
        background: theme.accentSoft,
        transition: 'all 0.15s ease',
      }}>
        Go to Dashboard
      </a>
    </div>
  )
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/setup" element={<FirstTimeSetup />} />

        {/* Dashboard (auth required) */}
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<Home />} />
          <Route path="members" element={<Members />} />
          <Route path="checkins" element={<Checkins />} />
          <Route path="payments" element={<Payments />} />
          <Route path="classes" element={<Classes />} />
          <Route path="staff" element={<Staff />} />
          <Route path="staff-checkin" element={<StaffCheckin />} />
          <Route path="newsletter" element={<Newsletter />} />
          <Route path="affiliate" element={<Affiliate />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="store" element={<Store />} />
          <Route path="trainers" element={<Trainers />} />
          <Route path="members/:memberId" element={<MemberProfile />} />
          <Route path="staff-performance" element={<StaffPerformance />} />
          <Route path="pulse" element={<LivePulse />} />
          <Route path="care-compass" element={<CareCompass />} />
          <Route path="finance" element={<Finance />} />
        </Route>

        {/* Super Admin */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="gyms" element={<AdminGyms />} />
          <Route path="packages" element={<AdminPackages />} />
          <Route path="revenue" element={<AdminRevenue />} />
          <Route path="affiliate" element={<AdminAffiliate />} />
          <Route path="sponsors" element={<AdminSponsors />} />
          <Route path="support" element={<AdminSupport />} />
          <Route path="performance" element={<AdminPerformance />} />
          <Route path="payouts" element={<AdminPayouts />} />
          <Route path="leads" element={<AdminLeads />} />
          <Route path="fleet" element={<AdminFleet />} />
          <Route path="audit" element={<AdminAudit />} />
          <Route path="ads" element={<AdminAds />} />
        </Route>

        {/* Member Hub */}
        <Route path="/member/login" element={<MemberLogin />} />
        <Route path="/member/onboarding" element={<MemberOnboarding />} />
        <Route path="/member/dashboard" element={<MemberDashboard />} />

        {/* Trainer Portal */}
        <Route path="/trainer/login" element={<TrainerLogin />} />
        <Route path="/trainer" element={<TrainerLayout />}>
          <Route index element={<Navigate to="/trainer/dashboard" replace />} />
          <Route path="dashboard" element={<TrainerDashboard />} />
          <Route path="clients" element={<TrainerClients />} />
          <Route path="earnings" element={<TrainerEarnings />} />
          <Route path="schedule" element={<TrainerSchedule />} />
        </Route>

        {/* Vira AI Health Portal */}
        <Route path="/vira" element={<ViraLayout />} />

        {/* Public pages */}
        <Route path="/find-gym" element={<GymFinder />} />
        <Route path="/member/:gymId" element={<MemberPortal />} />
        <Route path="/checkin/:gymId" element={<CheckinPage />} />
        <Route path="/store/:gymId" element={<StorePage />} />

        {/* Legal */}
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/contact" element={<Contact />} />

        {/* Landing */}
        <Route path="/landing" element={<Landing />} />
        <Route path="/app" element={<AppLanding />} />

        {/* Redirects — app.ivira.app shows AppLanding, ivira.app shows Landing */}
        <Route path="/" element={
          window.location.hostname.startsWith('app.') ? <AppLanding /> : <Landing />
        } />
        <Route path="*" element={<NotFound />} />
      </Routes>

      <CommandBar />
      <PWAInstallPrompt />
      <WellbeingWidget />
      <CookieConsent />

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  )
}
