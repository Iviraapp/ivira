import { useState } from 'react'

const FONT = "'Inter', -apple-system, sans-serif"

// Generate a deterministic color from name
function nameToColor(name) {
  if (!name) return '#10B981'
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const colors = ['#10B981', '#34A853', '#4285F4', '#FBBC05', '#EA4335', '#FF6D00', '#00BCD4']
  return colors[Math.abs(hash) % colors.length]
}

export default function OptimizedAvatar({
  src,
  name = '',
  size = 40,
  style = {},
}) {
  const [imgError, setImgError] = useState(false)
  const showImage = src && !imgError
  const initial = (name || '?').charAt(0).toUpperCase()
  const bg = nameToColor(name)

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      overflow: 'hidden', flexShrink: 0,
      background: showImage ? '#121212' : `${bg}20`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative',
      ...style,
    }}>
      {showImage ? (
        <img
          src={src}
          alt={name}
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          onError={() => setImgError(true)}
          style={{
            width: '100%', height: '100%',
            objectFit: 'cover', display: 'block',
            opacity: 1,
            transition: 'opacity 0.3s ease',
          }}
        />
      ) : (
        <span style={{
          fontSize: size * 0.4,
          fontWeight: 700,
          color: bg,
          fontFamily: FONT,
          lineHeight: 1,
          userSelect: 'none',
        }}>
          {initial}
        </span>
      )}
    </div>
  )
}
