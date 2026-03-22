import { motion } from 'framer-motion'

export default function FeaturePulse({ children, active = true, size, onClick }) {
  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: onClick ? 'pointer' : undefined,
      }}
      onClick={onClick}
    >
      {children}
      {active && (
        <motion.div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: size || '100%',
            height: size || '100%',
            transform: 'translate(-50%, -50%)',
            border: '2px solid #7C3AED',
            borderRadius: '50%',
            boxShadow: '0 0 16px rgba(124,58,237,0.4)',
            pointerEvents: 'none',
          }}
          animate={{
            opacity: [0.4, 1.0, 0.4],
            scale: [1.0, 1.08, 1.0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatType: 'reverse',
            ease: 'easeInOut',
          }}
        />
      )}
    </div>
  )
}
