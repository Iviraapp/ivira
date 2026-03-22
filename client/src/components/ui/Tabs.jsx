import { useState } from 'react'
import { useTheme } from '../../context/ThemeContext'

export default function Tabs({ tabs, active, onChange }) {
  const { theme } = useTheme()
  const [hoveredTab, setHoveredTab] = useState(null)

  return (
    <div style={{
      display: 'inline-flex', gap: '4px', padding: '4px',
      background: theme.bgTer, borderRadius: '12px',
      marginBottom: '24px',
    }}>
      {tabs.map((tab) => {
        const isActive = active === tab.id
        const isHovered = hoveredTab === tab.id && !isActive

        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            onMouseEnter={() => setHoveredTab(tab.id)}
            onMouseLeave={() => setHoveredTab(null)}
            style={{
              padding: '8px 16px', fontSize: '13px', fontWeight: 600, border: 'none',
              cursor: 'pointer', position: 'relative', borderRadius: '8px',
              fontFamily: "'Inter', -apple-system, sans-serif",
              transition: 'all 0.2s ease',
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              ...(isActive
                ? {
                    background: theme.accent,
                    color: theme.bg,
                  }
                : {
                    background: isHovered ? theme.bgHover : 'transparent',
                    color: theme.textSec,
                  }),
            }}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 9999,
                fontFamily: "'JetBrains Mono', monospace",
                ...(isActive
                  ? { background: 'rgba(255,255,255,0.2)', color: theme.bg }
                  : { background: theme.accentSoft, color: theme.textTer }),
              }}>
                {tab.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
