import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { useTheme } from './ThemeContext'

const ToastContext = createContext(null)

let toastId = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})

  const removeToast = useCallback((id) => {
    clearTimeout(timers.current[id])
    delete timers.current[id]
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback((message, type = 'success', duration = 4000) => {
    const id = ++toastId
    setToasts((prev) => [...prev, { id, message, type }])
    timers.current[id] = setTimeout(() => removeToast(id), duration)
    return id
  }, [removeToast])

  const toast = {
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error', 6000),
    warning: (msg) => addToast(msg, 'warning'),
    info: (msg) => addToast(msg, 'info'),
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-container">
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onClose={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function Toast({ toast, onClose }) {
  const { theme } = useTheme()

  const colors = {
    success: { border: theme.green, icon: '\u2713' },
    error: { border: theme.red, icon: '\u2715' },
    warning: { border: theme.amber, icon: '!' },
    info: { border: theme.accent, icon: 'i' },
  }
  const c = colors[toast.type] || colors.info

  return (
    <div
      style={{
        background: theme.bgSec,
        color: theme.text,
        padding: '12px 20px',
        borderRadius: '12px',
        fontSize: '14px',
        fontWeight: 500,
        fontFamily: "'Inter', -apple-system, sans-serif",
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        boxShadow: `0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px ${c.border}33`,
        animation: 'slideIn 0.3s ease',
        maxWidth: '400px',
        borderLeft: `3px solid ${c.border}`,
      }}
    >
      <span style={{
        width: 22, height: 22, borderRadius: '50%', background: theme.bgTer,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0,
        color: c.border,
      }}>
        {c.icon}
      </span>
      <span style={{ flex: 1 }}>{toast.message}</span>
      <button
        onClick={onClose}
        style={{ background: 'none', border: 'none', color: theme.textSec, opacity: 0.7, fontSize: 16, padding: 0, cursor: 'pointer' }}
      >
        ×
      </button>
    </div>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
