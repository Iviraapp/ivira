import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const ARROW_SIZE = 6

const positionStyles = {
  top: {
    container: { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 10 },
    arrow: {
      bottom: -ARROW_SIZE,
      left: '50%',
      transform: 'translateX(-50%)',
      borderLeft: `${ARROW_SIZE}px solid transparent`,
      borderRight: `${ARROW_SIZE}px solid transparent`,
      borderTop: `${ARROW_SIZE}px solid #1F1F1F`,
    },
  },
  bottom: {
    container: { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 10 },
    arrow: {
      top: -ARROW_SIZE,
      left: '50%',
      transform: 'translateX(-50%)',
      borderLeft: `${ARROW_SIZE}px solid transparent`,
      borderRight: `${ARROW_SIZE}px solid transparent`,
      borderBottom: `${ARROW_SIZE}px solid #1F1F1F`,
    },
  },
  left: {
    container: { right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: 10 },
    arrow: {
      right: -ARROW_SIZE,
      top: '50%',
      transform: 'translateY(-50%)',
      borderTop: `${ARROW_SIZE}px solid transparent`,
      borderBottom: `${ARROW_SIZE}px solid transparent`,
      borderLeft: `${ARROW_SIZE}px solid #1F1F1F`,
    },
  },
  right: {
    container: { left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: 10 },
    arrow: {
      left: -ARROW_SIZE,
      top: '50%',
      transform: 'translateY(-50%)',
      borderTop: `${ARROW_SIZE}px solid transparent`,
      borderBottom: `${ARROW_SIZE}px solid transparent`,
      borderRight: `${ARROW_SIZE}px solid #1F1F1F`,
    },
  },
}

export default function TourTooltip({ id, title, description, position = 'bottom', visible, onDismiss }) {
  const [btnHover, setBtnHover] = useState(false)
  const pos = positionStyles[position] || positionStyles.bottom

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            zIndex: 1000,
            background: '#000000',
            border: '1px solid #1F1F1F',
            borderRadius: 12,
            padding: '16px 20px',
            maxWidth: 280,
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            fontFamily: "'Inter', sans-serif",
            ...pos.container,
          }}
        >
          {/* Arrow */}
          <div
            style={{
              position: 'absolute',
              width: 0,
              height: 0,
              ...pos.arrow,
            }}
          />

          {title && (
            <div
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: '#FFFFFF',
                marginBottom: 6,
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {title}
            </div>
          )}

          {description && (
            <div
              style={{
                fontSize: 13,
                fontWeight: 400,
                color: 'rgba(255,255,255,0.6)',
                lineHeight: 1.5,
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {description}
            </div>
          )}

          <button
            onClick={() => onDismiss?.(id)}
            onMouseEnter={() => setBtnHover(true)}
            onMouseLeave={() => setBtnHover(false)}
            style={{
              background: btnHover ? '#1F1F1F' : 'transparent',
              border: '1px solid #333',
              color: '#FFFFFF',
              fontSize: 12,
              fontWeight: 500,
              fontFamily: "'Inter', sans-serif",
              padding: '6px 16px',
              borderRadius: 6,
              marginTop: 12,
              cursor: 'pointer',
              transition: 'background 0.15s ease',
            }}
          >
            Got it
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
