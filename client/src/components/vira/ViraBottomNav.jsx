import { V, G, GR, FONT, glass } from './theme'

// Rule 2: Bottom Floating Bar for mWeb — 64px fixed
const NAV_H = G * 8

export default function ViraBottomNav({ tabs, activeTab, onTabChange, onVira }) {
  const mid = Math.floor(tabs.length / 2)
  const leftTabs = tabs.slice(0, mid)
  const rightTabs = tabs.slice(mid)

  const renderTab = ({ key, label, icon: Icon }) => (
    <button
      key={key}
      onClick={() => onTabChange(key)}
      style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: G / 4,
        padding: `${GR.xs}px 0`, background: 'none', border: 'none',
        color: activeTab === key ? V.accent : V.textTer,
        cursor: 'pointer', fontFamily: FONT, transition: 'color 0.2s',
        minHeight: G * 6,
        justifyContent: 'center',
      }}
    >
      <Icon size={20} />
      <span style={{ fontSize: 10, fontWeight: activeTab === key ? 600 : 400 }}>{label}</span>
      {activeTab === key && (
        <div style={{
          width: 4, height: 4, borderRadius: '50%',
          background: V.accent, marginTop: -1,
        }} />
      )}
    </button>
  )

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      height: NAV_H,
      ...glass(),
      borderRadius: 0,
      borderTop: `1px solid ${V.border}`,
      borderLeft: 'none', borderRight: 'none', borderBottom: 'none',
      display: 'flex', alignItems: 'flex-end',
      padding: `${GR.xs}px 0`,
      paddingBottom: 'max(6px, env(safe-area-inset-bottom))',
      zIndex: 100,
    }}>
      {leftTabs.map(renderTab)}

      {/* Center FAB — Vira AI */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <button
          onClick={onVira}
          style={{
            width: G * 7, height: G * 7,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${V.accent}, #EC4899)`,
            border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', marginTop: -(G * 3),
            boxShadow: `0 ${G / 2}px ${GR.md}px ${V.accentGlow}, 0 0 ${GR.lg}px ${V.accent}30`,
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          aria-label="Talk to Vira"
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v1m0 16v1m-8-9H3m18 0h-1M5.6 5.6l.7.7m12.4 12.4l-.7-.7M5.6 18.4l.7-.7M18.7 5.6l-.7.7" />
            <circle cx="12" cy="12" r="4" fill="rgba(255,255,255,0.15)" />
          </svg>
        </button>
        <span style={{ fontSize: 9, color: V.accent, fontWeight: 600, marginTop: G / 4, fontFamily: FONT }}>Vira</span>
      </div>

      {rightTabs.map(renderTab)}
    </nav>
  )
}
