import { useRef } from 'react'
import { useAuthTheme } from './AuthLayout'

export default function PinInput({ value, onChange, onComplete, error, shaking }) {
  const refs = useRef([])
  const { isDark, accent } = useAuthTheme()

  const boxBg = isDark ? '#121212' : '#F8FAFC'
  const boxBorder = isDark ? '#1F1F1F' : '#E2E8F0'
  const boxText = isDark ? '#FFFFFF' : '#0F172A'
  const errorBorder = '#EA4335'

  const handleChange = (idx, val) => {
    if (!/^\d*$/.test(val)) return
    const next = [...value]
    next[idx] = val.slice(-1)
    onChange(next)
    if (val && idx < 5) refs.current[idx + 1]?.focus()
    if (next.every((d) => d !== '')) onComplete(next.join(''))
  }

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !value[idx] && idx > 0) {
      refs.current[idx - 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    const data = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (data.length === 6) {
      onChange(data.split(''))
      refs.current[5]?.focus()
      onComplete(data)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        justifyContent: 'center',
        animation: shaking ? 'authShake 0.5s ease-in-out' : 'none',
      }}
    >
      {value.map((digit, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={i === 0 ? handlePaste : undefined}
          autoFocus={i === 0}
          style={{
            width: 48,
            height: 56,
            textAlign: 'center',
            fontSize: 24,
            fontWeight: 700,
            fontFamily: "'Inter', -apple-system, sans-serif",
            background: boxBg,
            border: `2px solid ${shaking || error ? errorBorder : boxBorder}`,
            borderRadius: 12,
            outline: 'none',
            color: boxText,
            transition: 'border-color 0.2s, box-shadow 0.2s',
            caretColor: accent,
          }}
          onFocus={(e) => {
            e.target.style.borderColor = accent
            e.target.style.boxShadow = `0 0 0 3px rgba(16,185,129,0.2), 0 0 12px rgba(16,185,129,0.15)`
            e.target.select()
          }}
          onBlur={(e) => {
            e.target.style.borderColor = shaking || error ? errorBorder : boxBorder
            e.target.style.boxShadow = 'none'
          }}
        />
      ))}
    </div>
  )
}
