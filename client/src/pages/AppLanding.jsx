import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTheme } from '../context/ThemeContext'

// ── Brand Tokens ────────────────────────────────────────────
const IVIRA_BLUE   = '#10B981'
const ACCENT       = '#10B981'
const ACCENT_DARK  = '#059669'

const FONT_DISPLAY = "'Satoshi', 'General Sans', 'Inter', sans-serif"
const FONT_BODY    = "'General Sans', 'Inter', -apple-system, sans-serif"

// ── Helpers ─────────────────────────────────────────────────
function getMobilePlatform() {
  const ua = navigator.userAgent || ''
  if (/android/i.test(ua)) return 'android'
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios'
  return 'desktop'
}

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.6, delay: i * 0.08, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
}

function useScrollReveal(threshold = 0.15) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return [ref, visible]
}

// ── Feature Data ────────────────────────────────────────────
const memberFeatures = [
  {
    title: 'QR Check-in',
    desc: 'Scan your gym\'s QR code and check in instantly. No queues, no cards.',
    icon: 'M3 9h6V3H3v6zm2-4h2v2H5V5zm6-2v6h6V3h-6zm4 4h-2V5h2v2zM3 21h6v-6H3v6zm2-4h2v2H5v-2z',
    color: '#34A853',
  },
  {
    title: 'Membership Details',
    desc: 'View your plan, expiry date, payment history — all in one place.',
    icon: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
    color: ACCENT,
  },
  {
    title: 'Gym Store',
    desc: 'Browse supplements, merch, and gym accessories from your gym\'s store.',
    icon: 'M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0',
    color: '#FBBC05',
  },
  {
    title: 'Workout Tracking',
    desc: 'Log exercises, sets, reps, and personal records. Track your progress.',
    icon: 'M6.5 6.5h11M6.5 17.5h11M3 10h2v4H3zM19 10h2v4h-2zM5 12h14',
    color: '#EA4335',
  },
  {
    title: 'Nutrition & Fasting',
    desc: 'Track meals, macros, and intermittent fasting timers.',
    icon: 'M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3',
    color: '#34A853',
  },
  {
    title: 'Sleep Tracking',
    desc: 'Auto-sync sleep from Apple Health and Google Health Connect. Track quality and trends.',
    icon: 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z',
    color: '#8B5CF6',
  },
  {
    title: 'AI Coach',
    desc: 'Get personalized workout plans and nutrition advice from our AI coach.',
    icon: 'M12 2a4 4 0 0 1 4 4v2H8V6a4 4 0 0 1 4-4zM5 10h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2z',
    color: ACCENT,
  },
]

const existingMemberBenefits = [
  { icon: '✨', title: 'Instant check-in', desc: 'No more waiting at the front desk' },
  { icon: '📊', title: 'Track everything', desc: 'Workouts, nutrition, and progress' },
  { icon: '🛒', title: 'Gym store', desc: 'Buy supplements and gear from your gym' },
  { icon: '🏆', title: 'Leaderboards', desc: 'Compete with fellow gym members' },
]

// ── Component ───────────────────────────────────────────────
export default function AppLanding() {
  const navigate = useNavigate()
  const { isDark, setMode, mode } = useTheme()
  const platform = getMobilePlatform()
  const [heroRef, heroVisible] = useScrollReveal(0.1)
  const [memberRef, memberVisible] = useScrollReveal(0.1)
  const [featRef, featVisible] = useScrollReveal(0.1)
  const [dlRef, dlVisible] = useScrollReveal(0.1)

  // Theme-adaptive colors
  const t = {
    bg:        isDark ? '#0A0A0A' : '#FFFFFF',
    bgAlt:     isDark ? '#111111' : '#F8F9FA',
    bgCard:    isDark ? '#161616' : '#FFFFFF',
    text:      isDark ? '#FFFFFF' : '#111111',
    textSec:   isDark ? '#999999' : '#555555',
    textDim:   isDark ? '#444444' : '#AAAAAA',
    border:    isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)',
    borderCard:isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.08)',
    cardShadow:isDark ? 'none' : '0 2px 12px rgba(0,0,0,0.06)',
    navBg:     isDark ? 'rgba(10,10,10,0.88)' : 'rgba(255,255,255,0.92)',
    navBorder: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)',
    accentGlow:isDark ? 'rgba(16,185,129,0.10)' : 'rgba(16,185,129,0.06)',
    hoverBorder: isDark ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.15)',
    btnOutline:isDark ? '#444444' : 'rgba(0,0,0,0.15)',
    webBtnBorder: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)',
  }

  const cycleTheme = () => {
    const next = mode === 'dark' ? 'light' : mode === 'light' ? 'system' : 'dark'
    setMode(next)
  }

  return (
    <div style={{
      minHeight: '100vh', background: t.bg, color: t.text,
      fontFamily: FONT_BODY, overflowX: 'hidden',
    }}>
      {/* ── Nav ──────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: t.navBg, backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${t.navBorder}`,
      }}>
        <div style={{
          maxWidth: 1120, margin: '0 auto', padding: '0 24px',
          height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <Link to="/" style={{
            fontFamily: FONT_DISPLAY, fontWeight: 900, fontSize: 22,
            color: t.text, textDecoration: 'none',
          }}>
            <span style={{ opacity: 0.45 }}>I</span><span>VIRA</span>
          </Link>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Link to="/member/login" style={{
              color: t.textSec, textDecoration: 'none', fontSize: 14,
              fontFamily: FONT_BODY, padding: '8px 16px',
            }}>
              Member Login
            </Link>
            {platform === 'android' ? (
              <a href="https://api.ivira.app/downloads/ivira-latest.apk" download style={{
                background: IVIRA_BLUE, color: '#FFFFFF', border: 'none', borderRadius: 8,
                padding: '8px 18px', fontSize: 14, fontWeight: 600, fontFamily: FONT_BODY,
                textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Get APK
              </a>
            ) : (
              <Link to="/member/login" style={{
                background: IVIRA_BLUE, color: '#FFFFFF', border: 'none', borderRadius: 8,
                padding: '8px 18px', fontSize: 14, fontWeight: 600, fontFamily: FONT_BODY,
                textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6,
              }}>
                Open Web App
              </Link>
            )}
            {/* Theme toggle */}
            <button onClick={cycleTheme} style={{
              background: 'none', border: `1px solid ${t.borderCard}`, borderRadius: 8,
              padding: '6px 8px', cursor: 'pointer', color: t.textSec,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {mode === 'dark' ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
              ) : mode === 'light' ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────── */}
      <section ref={heroRef} style={{
        maxWidth: 1120, margin: '0 auto', padding: '140px 24px 60px',
        textAlign: 'center',
      }}>
        <motion.div
          variants={fadeUp} initial="hidden" animate={heroVisible ? 'visible' : 'hidden'} custom={0}
          style={{ marginBottom: 20 }}
        >
          <span style={{
            display: 'inline-block', fontSize: 12, fontWeight: 600, color: ACCENT,
            background: t.accentGlow, padding: '6px 14px', borderRadius: 100,
            border: `1px solid ${isDark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.12)'}`, fontFamily: FONT_BODY,
          }}>
            {platform === 'android' ? 'Download now for Android' : 'Available on Android — iOS coming soon'}
          </span>
        </motion.div>

        <motion.h1
          variants={fadeUp} initial="hidden" animate={heroVisible ? 'visible' : 'hidden'} custom={1}
          style={{
            fontSize: 'clamp(36px, 7vw, 64px)', fontWeight: 800, letterSpacing: '-0.04em',
            lineHeight: 1.05, fontFamily: FONT_DISPLAY, margin: '0 auto 20px',
            maxWidth: 680, color: t.text,
          }}
        >
          Your gym. Your coach. Your circle. One app.
        </motion.h1>

        <motion.p
          variants={fadeUp} initial="hidden" animate={heroVisible ? 'visible' : 'hidden'} custom={2}
          style={{
            fontSize: 'clamp(16px, 2.5vw, 18px)', color: t.textSec, lineHeight: 1.6,
            maxWidth: 500, margin: '0 auto 36px', fontFamily: FONT_BODY,
          }}
        >
          Check in with QR, get AI workout plans, track sleep, compete with your gym squad — IVIRA does it all.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          variants={fadeUp} initial="hidden" animate={heroVisible ? 'visible' : 'hidden'} custom={3}
          style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 48 }}
        >
          {platform === 'android' ? (
            <a href="https://api.ivira.app/downloads/ivira-latest.apk" download style={{
              background: IVIRA_BLUE, color: '#FFFFFF', border: 'none', borderRadius: 10,
              padding: '14px 28px', fontSize: 15, fontWeight: 600, fontFamily: FONT_BODY,
              textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8,
              transition: 'transform 0.2s',
            }}>
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download APK (Beta)
            </a>
          ) : (
            <Link to="/member/login" style={{
              background: IVIRA_BLUE, color: '#FFFFFF', border: 'none', borderRadius: 10,
              padding: '14px 28px', fontSize: 15, fontWeight: 600, fontFamily: FONT_BODY,
              textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8,
              transition: 'transform 0.2s',
            }}>
              Open Member Hub
            </Link>
          )}
          <button
            onClick={() => navigate('/member/login')}
            style={{
              background: 'transparent', color: t.text, borderRadius: 10,
              padding: '14px 28px', fontSize: 15, fontWeight: 600, fontFamily: FONT_BODY,
              border: `1px solid ${t.btnOutline}`, cursor: 'pointer',
              transition: 'border-color 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = ACCENT}
            onMouseLeave={e => e.currentTarget.style.borderColor = t.btnOutline}
          >
            Sign In as Member
          </button>
        </motion.div>

        <p style={{ fontSize: 13, color: t.textSec, marginTop: 16, letterSpacing: '0.5px' }}>
          Used by members at gyms across India, UAE, USA, UK & Australia
        </p>

        {/* Store badges */}
        <motion.div
          variants={fadeUp} initial="hidden" animate={heroVisible ? 'visible' : 'hidden'} custom={4}
          style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}
        >
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 12, color: t.textDim, fontFamily: FONT_BODY,
          }}>
            <svg width="16" height="16" fill={t.textDim} viewBox="0 0 24 24">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83" />
              <path d="M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11" />
            </svg>
            App Store — coming soon
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 12, color: t.textDim, fontFamily: FONT_BODY,
          }}>
            <svg width="16" height="16" fill={t.textDim} viewBox="0 0 24 24">
              <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zM14.852 13.06l2.37 1.37-3.09 1.78-2.37-1.37 3.09-1.78zm3.848-2.22l1.87 1.08a1 1 0 0 1 0 1.74l-1.87 1.08-2.59-1.49 2.59-1.41zM5.09.56l9.49 5.48-2.59 2.59L5.09.56z" />
            </svg>
            Google Play — coming soon
          </div>
        </motion.div>
      </section>

      {/* ── Already a member? ────────────────────────────── */}
      <section ref={memberRef} style={{
        background: t.bgAlt,
        borderTop: `1px solid ${t.border}`,
        borderBottom: `1px solid ${t.border}`,
      }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '80px 24px' }}>
          <motion.div
            variants={fadeUp} initial="hidden" animate={memberVisible ? 'visible' : 'hidden'} custom={0}
            style={{ textAlign: 'center', marginBottom: 48 }}
          >
            <div style={{
              fontSize: 12, fontWeight: 600, color: IVIRA_BLUE, letterSpacing: '0.1em',
              textTransform: 'uppercase', marginBottom: 12, fontFamily: FONT_BODY,
            }}>
              Already a gym member?
            </div>
            <h2 style={{
              fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 700, letterSpacing: '-0.03em',
              lineHeight: 1.15, color: t.text, fontFamily: FONT_DISPLAY, marginBottom: 12,
            }}>
              Your gym is on IVIRA
            </h2>
            <p style={{
              fontSize: 16, color: t.textSec, lineHeight: 1.6, maxWidth: 480,
              margin: '0 auto', fontFamily: FONT_BODY,
            }}>
              If your gym uses IVIRA, sign in to access your membership, check-in with QR, and manage everything from your phone.
            </p>
          </motion.div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 16, marginBottom: 40,
          }}>
            {existingMemberBenefits.map((b, i) => (
              <motion.div
                key={b.title}
                variants={fadeUp} initial="hidden" animate={memberVisible ? 'visible' : 'hidden'} custom={i + 1}
                style={{
                  background: t.bgCard, borderRadius: 14, padding: 24,
                  border: `1px solid ${t.borderCard}`,
                  position: 'relative', overflow: 'hidden',
                  boxShadow: t.cardShadow,
                }}
              >
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: ['#10B981', '#EF4444', '#22C55E', '#F59E0B'][i] }} />
                <div style={{ fontSize: 28, marginBottom: 12 }}>{b.icon}</div>
                <div style={{
                  fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 15,
                  color: t.text, marginBottom: 4,
                }}>
                  {b.title}
                </div>
                <div style={{ fontSize: 13, color: t.textSec, fontFamily: FONT_BODY }}>
                  {b.desc}
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            variants={fadeUp} initial="hidden" animate={memberVisible ? 'visible' : 'hidden'} custom={5}
            style={{ textAlign: 'center' }}
          >
            <button
              onClick={() => navigate('/member/login')}
              style={{
                background: IVIRA_BLUE, color: '#FFFFFF', border: 'none', borderRadius: 10,
                padding: '14px 36px', fontSize: 16, fontWeight: 600, fontFamily: FONT_BODY,
                cursor: 'pointer', transition: 'opacity 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              Sign In to Your Gym
            </button>
            <div style={{
              fontSize: 13, color: t.textDim, marginTop: 12, fontFamily: FONT_BODY,
            }}>
              Use the same phone number or email your gym registered you with
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Features Grid ────────────────────────────────── */}
      <section ref={featRef} style={{ maxWidth: 1120, margin: '0 auto', padding: '80px 24px' }}>
        <motion.div variants={fadeUp} initial="hidden" animate={featVisible ? 'visible' : 'hidden'} custom={0}>
          <div style={{
            fontSize: 12, fontWeight: 600, color: ACCENT, letterSpacing: '0.04em',
            marginBottom: 12, fontFamily: FONT_BODY,
          }}>
            What you get
          </div>
          <h2 style={{
            fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 700, letterSpacing: '-0.03em',
            lineHeight: 1.15, color: t.text, fontFamily: FONT_DISPLAY, marginBottom: 16,
          }}>
            Everything in one app
          </h2>
          <p style={{
            fontSize: 16, color: t.textSec, lineHeight: 1.6, maxWidth: 520,
            marginBottom: 48, fontFamily: FONT_BODY,
          }}>
            From scanning your QR to tracking your macros — IVIRA is your complete fitness companion.
          </p>
        </motion.div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 16,
        }}>
          {memberFeatures.map((f, i) => (
            <motion.div
              key={f.title}
              variants={fadeUp} initial="hidden" animate={featVisible ? 'visible' : 'hidden'} custom={i * 0.5}
              style={{
                background: t.bgAlt, borderRadius: 14, padding: 24,
                border: `1px solid ${t.borderCard}`,
                transition: 'border-color 0.2s', position: 'relative', overflow: 'hidden',
                boxShadow: t.cardShadow,
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = t.hoverBorder}
              onMouseLeave={e => e.currentTarget.style.borderColor = t.borderCard}
            >
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                background: f.color,
              }} />
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: `${f.color}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 16, border: `1px solid ${f.color}20`,
              }}>
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke={f.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d={f.icon} />
                </svg>
              </div>
              <div style={{
                fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 16,
                letterSpacing: '-0.01em', color: t.text, marginBottom: 6,
              }}>
                {f.title}
              </div>
              <div style={{ fontSize: 14, color: t.textSec, lineHeight: 1.5, fontFamily: FONT_BODY }}>
                {f.desc}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Download Section ─────────────────────────────── */}
      <section id="download" ref={dlRef} style={{
        background: t.bgAlt, textAlign: 'center',
        borderTop: `1px solid ${t.border}`,
      }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '80px 24px' }}>
          <motion.div variants={fadeUp} initial="hidden" animate={dlVisible ? 'visible' : 'hidden'} custom={0}>
            <h2 style={{
              fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 700, letterSpacing: '-0.03em',
              lineHeight: 1.15, color: t.text, fontFamily: FONT_DISPLAY,
              maxWidth: 480, margin: '0 auto 12px',
            }}>
              Get the IVIRA app
            </h2>
            <p style={{
              fontSize: 16, color: t.textSec, lineHeight: 1.6,
              maxWidth: 420, margin: '0 auto 36px', fontFamily: FONT_BODY,
            }}>
              Download the demo APK now. App Store and Google Play listings are on the way.
            </p>
          </motion.div>

          <motion.div
            variants={fadeUp} initial="hidden" animate={dlVisible ? 'visible' : 'hidden'} custom={1}
            style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}
          >
            {platform === 'android' ? (
              <a
                href="https://api.ivira.app/downloads/ivira-latest.apk"
                download
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 10,
                  background: IVIRA_BLUE, color: '#FFFFFF', borderRadius: 12,
                  padding: '14px 28px', fontSize: 15, fontWeight: 600,
                  fontFamily: FONT_BODY, textDecoration: 'none', transition: 'opacity 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download APK (Beta)
              </a>
            ) : (
              <Link to="/member/login" style={{
                display: 'inline-flex', alignItems: 'center', gap: 10,
                background: IVIRA_BLUE, color: '#FFFFFF', borderRadius: 12,
                padding: '14px 28px', fontSize: 15, fontWeight: 600,
                fontFamily: FONT_BODY, textDecoration: 'none', transition: 'opacity 0.2s',
              }}>
                Open Member Hub
              </Link>
            )}

            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              background: isDark ? '#161616' : '#F1F3F5', border: `1px solid ${t.borderCard}`, borderRadius: 12,
              padding: '14px 24px', fontSize: 13, color: t.textSec, fontFamily: FONT_BODY,
            }}>
              <svg width="18" height="18" fill={t.textDim} viewBox="0 0 24 24">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83" />
                <path d="M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11" />
              </svg>
              App Store — coming soon
            </div>

            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              background: isDark ? '#161616' : '#F1F3F5', border: `1px solid ${t.borderCard}`, borderRadius: 12,
              padding: '14px 24px', fontSize: 13, color: t.textSec, fontFamily: FONT_BODY,
            }}>
              <svg width="18" height="18" fill={t.textDim} viewBox="0 0 24 24">
                <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zM14.852 13.06l2.37 1.37-3.09 1.78-2.37-1.37 3.09-1.78zm3.848-2.22l1.87 1.08a1 1 0 0 1 0 1.74l-1.87 1.08-2.59-1.49 2.59-1.41zM5.09.56l9.49 5.48-2.59 2.59L5.09.56z" />
              </svg>
              Google Play — coming soon
            </div>
          </motion.div>

          {/* Feedback + web login */}
          <motion.div
            variants={fadeUp} initial="hidden" animate={dlVisible ? 'visible' : 'hidden'} custom={2}
            style={{ marginTop: 32, paddingTop: 32, borderTop: `1px solid ${t.border}` }}
          >
            <div style={{
              padding: '14px 20px', borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 10,
              background: isDark ? 'rgba(16,185,129,0.06)' : 'rgba(16,185,129,0.04)',
              border: `1px solid ${isDark ? 'rgba(16,185,129,0.12)' : 'rgba(16,185,129,0.08)'}`,
              marginBottom: 20,
            }}>
              <span style={{ fontSize: 16 }}>💬</span>
              <span style={{ fontSize: 13, color: t.textSec, fontFamily: FONT_BODY }}>
                Tried the APK?{' '}
                <Link to="/contact" style={{ color: ACCENT, fontWeight: 600, textDecoration: 'none' }}>
                  Share your feedback
                </Link>
              </span>
            </div>
            <div>
              <p style={{ fontSize: 14, color: t.textDim, marginBottom: 12, fontFamily: FONT_BODY }}>
                Prefer the web? Access your member hub from any browser.
              </p>
              <button
                onClick={() => navigate('/member/login')}
                style={{
                  background: 'transparent', color: t.textSec, border: `1px solid ${t.webBtnBorder}`,
                  borderRadius: 8, padding: '10px 24px', fontSize: 14, fontWeight: 500,
                  fontFamily: FONT_BODY, cursor: 'pointer', transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.color = t.text }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = t.webBtnBorder; e.currentTarget.style.color = t.textSec }}
              >
                Open Member Hub in Browser
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer style={{
        borderTop: `1px solid ${t.border}`,
        background: t.bg,
      }}>
        <div style={{
          maxWidth: 1120, margin: '0 auto', padding: '40px 24px',
          display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between',
          alignItems: 'center', gap: 20,
        }}>
          <Link to="/" style={{
            fontFamily: FONT_DISPLAY, fontWeight: 900, fontSize: 22,
            color: t.text, textDecoration: 'none',
          }}>
            <span style={{ opacity: 0.45 }}>I</span><span>VIRA</span>
          </Link>

          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {[
              { href: 'https://ivira.app', label: 'For Gyms' },
              { to: '/member/login', label: 'Member Login' },
              { to: '/privacy', label: 'Privacy' },
              { to: '/terms', label: 'Terms' },
              { to: '/contact', label: 'Contact' },
            ].map(link => link.href ? (
              <a key={link.href} href={link.href} style={{
                color: t.textSec, textDecoration: 'none', fontSize: 13, fontFamily: FONT_BODY,
              }}>{link.label}</a>
            ) : (
              <Link key={link.to} to={link.to} style={{
                color: t.textSec, textDecoration: 'none', fontSize: 13, fontFamily: FONT_BODY,
              }}>{link.label}</Link>
            ))}
          </div>

          <div style={{ fontSize: 12, color: t.textDim, fontFamily: FONT_BODY }}>
            &copy; {new Date().getFullYear()} IVIRA. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
