import { V, FONT } from './theme'

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
        gap: 2, padding: '6px 0', background: 'none', border: 'none',
        color: activeTab === key ? V.accent : V.textTer,
        cursor: 'pointer', fontFamily: FONT, transition: 'color 0.2s',
        minHeight: 48, justifyContent: 'center',
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
      background: `${V.card}F2`, borderTop: `1px solid ${V.border}`,
      display: 'flex', alignItems: 'flex-end',
      padding: '6px 0',
      paddingBottom: 'max(6px, env(safe-area-inset-bottom))',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      zIndex: 100,
    }}>
      {leftTabs.map(renderTab)}

      {/* Center FAB — Vira AI */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <button
          onClick={onVira}
          style={{
            width: 56, height: 56, borderRadius: '50%',
            background: `linear-gradient(135deg, ${V.accent}, #EC4899)`,
            border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', marginTop: -24,
            boxShadow: `0 4px 20px ${V.accentGlow}, 0 0 40px ${V.accent}30`,
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          aria-label="Talk to Vira"
        >
          {/* Vira sparkle icon */}
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v1m0 16v1m-8-9H3m18 0h-1M5.6 5.6l.7.7m12.4 12.4l-.7-.7M5.6 18.4l.7-.7M18.7 5.6l-.7.7" />
            <circle cx="12" cy="12" r="4" fill="rgba(255,255,255,0.15)" />
          </svg>
        </button>
        <span style={{ fontSize: 9, color: V.accent, fontWeight: 600, marginTop: 2, fontFamily: FONT }}>Vira</span>
      </div>

      {rightTabs.map(renderTab)}
    </nav>
  )
}
