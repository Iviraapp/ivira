import { QrCode } from 'lucide-react'
import { M, FONT } from './theme'

export default function BottomNav({ tabs, activeTab, onTabChange, onCheckin }) {
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
        color: activeTab === key ? M.accent : M.textTer,
        cursor: 'pointer', fontFamily: FONT, transition: 'color 0.2s',
        minHeight: 48, justifyContent: 'center',
      }}
    >
      <Icon size={20} />
      <span style={{ fontSize: 10, fontWeight: activeTab === key ? 600 : 400 }}>{label}</span>
      {activeTab === key && (
        <div style={{
          width: 4, height: 4, borderRadius: '50%',
          background: M.accent, marginTop: -1,
        }} />
      )}
    </button>
  )

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: `${M.card}F0`, borderTop: `1px solid ${M.border}`,
      display: 'flex', alignItems: 'flex-end',
      padding: '6px 0',
      paddingBottom: 'max(6px, env(safe-area-inset-bottom))',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      zIndex: 100,
    }}>
      {leftTabs.map(renderTab)}

      {/* Center FAB */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <button
          onClick={onCheckin}
          style={{
            width: 56, height: 56, borderRadius: '50%',
            background: `linear-gradient(135deg, ${M.accent}, #9F67FF)`,
            border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', marginTop: -24,
            boxShadow: `0 4px 20px ${M.accentGlow}, 0 0 40px ${M.accent}30`,
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          aria-label="Check In"
        >
          <QrCode size={24} color="#fff" />
        </button>
        <span style={{ fontSize: 9, color: M.accent, fontWeight: 600, marginTop: 2, fontFamily: FONT }}>Check In</span>
      </div>

      {rightTabs.map(renderTab)}
    </nav>
  )
}
