import { Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import DashboardLayout from './components/layout/DashboardLayout'
import Skeleton from './components/ui/Skeleton'
import { useTheme } from './context/ThemeContext'
import CommandBar from './components/CommandBar'
import PWAInstallPrompt from './components/PWAInstallPrompt'
import WellbeingWidget from './components/WellbeingWidget'
import CookieConsent from './components/CookieConsent'

// Pages — lazy loaded for faster initial bundle
const Login = lazy(() => import('./pages/Login'))
const Onboarding = lazy(() => import('./pages/Onboarding'))
const Home = lazy(() => import('./pages/dashboard/Home'))
const Members = lazy(() => import('./pages/dashboard/Members'))
const Checkins = lazy(() => import('./pages/dashboard/Checkins'))
const Payments = lazy(() => import('./pages/dashboard/Payments'))
const Newsletter = lazy(() => import('./pages/dashboard/Newsletter'))
const Affiliate = lazy(() => import('./pages/dashboard/Affiliate'))
const Analytics = lazy(() => import('./pages/dashboard/Analytics'))
const SettingsPage = lazy(() => import('./pages/dashboard/Settings'))
const Classes = lazy(() => import('./pages/dashboard/Classes'))
const Staff = lazy(() => import('./pages/dashboard/Staff'))
const StaffCheckin = lazy(() => import('./pages/dashboard/StaffCheckin'))
const MemberPortal = lazy(() => import('./pages/member/MemberPortal'))
const MemberLogin = lazy(() => import('./pages/member/MemberLogin'))
const MemberDashboard = lazy(() => import('./pages/member/MemberDashboard'))
const CheckinPage = lazy(() => import('./pages/public/CheckinPage'))
const StorePage = lazy(() => import('./pages/public/StorePage'))
const GymFinder = lazy(() => import('./pages/GymFinder'))
const FirstTimeSetup = lazy(() => import('./pages/FirstTimeSetup'))
const Store = lazy(() => import('./pages/dashboard/Store'))
const Trainers = lazy(() => import('./pages/dashboard/Trainers'))
const MemberProfile = lazy(() => import('./pages/dashboard/MemberProfile'))
const StaffPerformance = lazy(() => import('./pages/dashboard/StaffPerformance'))
const LivePulse = lazy(() => import('./pages/dashboard/LivePulse'))
const MemberOnboarding = lazy(() => import('./pages/member/MemberOnboarding'))
const Landing = lazy(() => import('./pages/Landing'))
const AppLanding = lazy(() => import('./pages/AppLanding'))
const Privacy = lazy(() => import('./pages/legal/Privacy'))
const Terms = lazy(() => import('./pages/legal/Terms'))
const Contact = lazy(() => import('./pages/legal/Contact'))

// Trainer pages
const TrainerLogin = lazy(() => import('./pages/trainer/TrainerLogin'))
const TrainerLayout = lazy(() => import('./pages/trainer/TrainerLayout'))
const TrainerDashboard = lazy(() => import('./pages/trainer/TrainerDashboard'))
const TrainerClients = lazy(() => import('./pages/trainer/TrainerClients'))
const TrainerEarnings = lazy(() => import('./pages/trainer/TrainerEarnings'))
const TrainerSchedule = lazy(() => import('./pages/trainer/TrainerSchedule'))

// Vira AI (Health/Wellness)
const ViraLayout = lazy(() => import('./pages/vira/ViraLayout'))

// Care Compass
const CareCompass = lazy(() => import('./pages/dashboard/CareCompass'))

// Financial Intelligence
const Finance = lazy(() => import('./pages/dashboard/Finance'))

// Admin pages
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'))
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminGyms = lazy(() => import('./pages/admin/AdminGyms'))
const AdminPackages = lazy(() => import('./pages/admin/AdminPackages'))
const AdminRevenue = lazy(() => import('./pages/admin/AdminRevenue'))
const AdminAffiliate = lazy(() => import('./pages/admin/AdminAffiliate'))
const AdminSponsors = lazy(() => import('./pages/admin/AdminSponsors'))
const AdminSupport = lazy(() => import('./pages/admin/AdminSupport'))
const AdminPerformance = lazy(() => import('./pages/admin/AdminPerformance'))
const AdminPayouts = lazy(() => import('./pages/admin/AdminPayouts'))
const AdminLeads = lazy(() => import('./pages/admin/AdminLeads'))
const AdminFleet = lazy(() => import('./pages/admin/AdminFleet'))
const AdminAudit = lazy(() => import('./pages/admin/AdminAudit'))
const AdminAds = lazy(() => import('./pages/admin/AdminAds'))

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
      <Suspense fallback={<PageLoader />}>
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
      </Suspense>

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
