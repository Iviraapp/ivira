import { useTheme } from '../../context/ThemeContext'

export default function Input({ label, error, helper, style, containerStyle, ...props }) {
  const { theme } = useTheme()

  const inputStyle = {
    width: '100%', padding: '10px 14px', border: `1px solid ${theme.border}`,
    borderRadius: '10px', fontSize: '15px', outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    background: theme.bgInput, color: theme.text, fontFamily: "'Inter', -apple-system, sans-serif",
    boxSizing: 'border-box',
  }

  const labelStyle = {
    display: 'block', fontSize: '13px', fontWeight: 600, color: theme.textSec,
    marginBottom: '6px', fontFamily: "'Inter', -apple-system, sans-serif",
    textTransform: 'uppercase', letterSpacing: '0.5px',
  }

  return (
    <div style={{ marginBottom: '16px', ...containerStyle }}>
      {label && <label style={labelStyle}>{label}</label>}
      <input
        style={{
          ...inputStyle,
          ...(error && { borderColor: theme.red, boxShadow: `0 0 0 3px rgba(234,67,53,0.15)` }),
          ...style,
        }}
        placeholder={props.placeholder}
        onFocus={(e) => {
          if (!error) {
            e.target.style.borderColor = theme.borderFocus
            e.target.style.boxShadow = `0 0 0 3px ${theme.accentSoft}`
          }
          props.onFocus?.(e)
        }}
        onBlur={(e) => {
          if (!error) {
            e.target.style.borderColor = theme.border
            e.target.style.boxShadow = 'none'
          }
          props.onBlur?.(e)
        }}
        {...props}
      />
      {error && <p style={{ color: theme.red, fontSize: '13px', marginTop: '4px' }}>{error}</p>}
      {helper && !error && <p style={{ color: theme.textTer, fontSize: '13px', marginTop: '4px' }}>{helper}</p>}
    </div>
  )
}

export function Select({ label, error, children, style, containerStyle, ...props }) {
  const { theme } = useTheme()

  const inputStyle = {
    width: '100%', padding: '10px 14px', border: `1px solid ${theme.border}`,
    borderRadius: '10px', fontSize: '15px', outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    background: theme.bgInput, color: theme.text, fontFamily: "'Inter', -apple-system, sans-serif",
    boxSizing: 'border-box',
  }

  const labelStyle = {
    display: 'block', fontSize: '13px', fontWeight: 600, color: theme.textSec,
    marginBottom: '6px', fontFamily: "'Inter', -apple-system, sans-serif",
    textTransform: 'uppercase', letterSpacing: '0.5px',
  }

  return (
    <div style={{ marginBottom: '16px', ...containerStyle }}>
      {label && <label style={labelStyle}>{label}</label>}
      <select
        style={{
          ...inputStyle,
          appearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%238B8BA3' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 12px center',
          paddingRight: '36px',
          ...(error && { borderColor: theme.red, boxShadow: `0 0 0 3px rgba(234,67,53,0.15)` }),
          ...style,
        }}
        onFocus={(e) => {
          if (!error) {
            e.target.style.borderColor = theme.borderFocus
            e.target.style.boxShadow = `0 0 0 3px ${theme.accentSoft}`
          }
          props.onFocus?.(e)
        }}
        onBlur={(e) => {
          if (!error) {
            e.target.style.borderColor = theme.border
            e.target.style.boxShadow = 'none'
          }
          props.onBlur?.(e)
        }}
        {...props}
      >
        {children}
      </select>
      {error && <p style={{ color: theme.red, fontSize: '13px', marginTop: '4px' }}>{error}</p>}
    </div>
  )
}

export function Textarea({ label, error, style, containerStyle, ...props }) {
  const { theme } = useTheme()

  const inputStyle = {
    width: '100%', padding: '10px 14px', border: `1px solid ${theme.border}`,
    borderRadius: '10px', fontSize: '15px', outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    background: theme.bgInput, color: theme.text, fontFamily: "'Inter', -apple-system, sans-serif",
    boxSizing: 'border-box',
  }

  const labelStyle = {
    display: 'block', fontSize: '13px', fontWeight: 600, color: theme.textSec,
    marginBottom: '6px', fontFamily: "'Inter', -apple-system, sans-serif",
    textTransform: 'uppercase', letterSpacing: '0.5px',
  }

  return (
    <div style={{ marginBottom: '16px', ...containerStyle }}>
      {label && <label style={labelStyle}>{label}</label>}
      <textarea
        style={{
          ...inputStyle, resize: 'vertical', minHeight: '80px',
          ...(error && { borderColor: theme.red, boxShadow: `0 0 0 3px rgba(234,67,53,0.15)` }),
          ...style,
        }}
        onFocus={(e) => {
          if (!error) {
            e.target.style.borderColor = theme.borderFocus
            e.target.style.boxShadow = `0 0 0 3px ${theme.accentSoft}`
          }
          props.onFocus?.(e)
        }}
        onBlur={(e) => {
          if (!error) {
            e.target.style.borderColor = theme.border
            e.target.style.boxShadow = 'none'
          }
          props.onBlur?.(e)
        }}
        {...props}
      />
      {error && <p style={{ color: theme.red, fontSize: '13px', marginTop: '4px' }}>{error}</p>}
    </div>
  )
}
