import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../lib/api'

const TYPE_STYLES = {
  gym: { label: 'GYM', bg: 'rgba(139, 92, 246, 0.15)', color: '#A78BFA' },
  member: { label: 'MEMBER', bg: 'rgba(34, 197, 94, 0.15)', color: '#4ADE80' },
  transaction: { label: 'TXN', bg: 'rgba(245, 158, 11, 0.15)', color: '#FBBF24' },
}

const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)

const ArrowIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
)

const GymIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="10" width="16" height="4" rx="1" />
    <line x1="2" y1="12" x2="4" y2="12" />
    <line x1="20" y1="12" x2="22" y2="12" />
    <line x1="6" y1="8" x2="6" y2="16" />
    <line x1="18" y1="8" x2="18" y2="16" />
  </svg>
)

const MemberIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)

const TxnIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
)

const TYPE_ICONS = { gym: GymIcon, member: MemberIcon, transaction: TxnIcon }

function formatAmount(paise) {
  if (!paise && paise !== 0) return ''
  return `Rs ${(paise / 100).toLocaleString('en-IN')}`
}

function getSubtitle(item) {
  switch (item.type) {
    case 'gym':
      return `${item.city || 'Unknown city'} - ${item.owner_email || ''} - ${item.status}`
    case 'member':
      return `${item.gym_name} - ${item.phone || ''} - ${item.status}`
    case 'transaction':
      return `${item.gym_name} - ${item.member_name || 'Unknown'} - ${formatAmount(item.amount_paise)} - ${item.status}`
    default:
      return ''
  }
}

function getName(item) {
  switch (item.type) {
    case 'gym': return item.gym_name
    case 'member': return item.name
    case 'transaction': return item.razorpay_payment_id || `Payment #${item.id?.slice(0, 8)}`
    default: return ''
  }
}

export default function CommandBar() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState({ gyms: [], members: [], transactions: [] })
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef(null)
  const debounceRef = useRef(null)
  const overlayRef = useRef(null)
  const navigate = useNavigate()

  // Flatten results for keyboard navigation
  const flatResults = [
    ...results.gyms,
    ...results.members,
    ...results.transactions,
  ]

  // Global CMD+K / Ctrl+K listener
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setQuery('')
      setResults({ gyms: [], members: [], transactions: [] })
      setActiveIndex(0)
    }
  }, [open])

  // Debounced search
  const doSearch = useCallback(async (q) => {
    if (!q || q.length < 2) {
      setResults({ gyms: [], members: [], transactions: [] })
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const token = localStorage.getItem('ivira_admin_token')
      const res = await api.get('/super/search', {
        params: { q },
        headers: { Authorization: `Bearer ${token}` },
      })
      setResults(res.data.results || { gyms: [], members: [], transactions: [] })
      setActiveIndex(0)
    } catch {
      setResults({ gyms: [], members: [], transactions: [] })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(query), 300)
    return () => clearTimeout(debounceRef.current)
  }, [query, doSearch])

  // Navigate to result
  const handleSelect = useCallback((item) => {
    setOpen(false)
    switch (item.type) {
      case 'gym':
        navigate(`/admin/gyms?id=${item.id}`)
        break
      case 'member':
        navigate(`/dashboard/members?id=${item.id}`)
        break
      case 'transaction':
        navigate(`/dashboard/payments?id=${item.id}`)
        break
    }
  }, [navigate])

  // Keyboard navigation
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      setOpen(false)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(prev => Math.min(prev + 1, flatResults.length - 1))
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(prev => Math.max(prev - 1, 0))
    }
    if (e.key === 'Enter' && flatResults[activeIndex]) {
      e.preventDefault()
      handleSelect(flatResults[activeIndex])
    }
  }, [flatResults, activeIndex, handleSelect])

  // Click outside to close
  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) setOpen(false)
  }

  const font = "'Inter', -apple-system, sans-serif"

  // Render grouped results
  const renderCategory = (label, items, startIndex) => {
    if (!items.length) return null
    return (
      <div key={label}>
        <div style={{
          padding: '10px 16px 6px',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.5px',
          color: '#666',
          textTransform: 'uppercase',
          fontFamily: font,
        }}>
          {label}
        </div>
        {items.map((item, i) => {
          const globalIndex = startIndex + i
          const isActive = globalIndex === activeIndex
          const Icon = TYPE_ICONS[item.type]
          const badge = TYPE_STYLES[item.type]

          return (
            <div
              key={item.id}
              onClick={() => handleSelect(item)}
              onMouseEnter={() => setActiveIndex(globalIndex)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 16px',
                cursor: 'pointer',
                background: isActive ? '#1F1F1F' : 'transparent',
                transition: 'background 0.1s',
                borderRadius: 8,
                margin: '0 8px',
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: badge.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Icon />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 14, fontWeight: 500, color: '#FFFFFF',
                  fontFamily: font, whiteSpace: 'nowrap',
                  overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {getName(item)}
                </div>
                <div style={{
                  fontSize: 12, color: '#A1A1AA', fontFamily: font,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {getSubtitle(item)}
                </div>
              </div>

              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.5px',
                padding: '3px 8px', borderRadius: 4,
                background: badge.bg, color: badge.color,
                fontFamily: font, flexShrink: 0,
              }}>
                {badge.label}
              </span>

              <ArrowIcon />
            </div>
          )
        })}
      </div>
    )
  }

  let gymsStart = 0
  let membersStart = results.gyms.length
  let txnStart = results.gyms.length + results.members.length

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={overlayRef}
          onClick={handleOverlayClick}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            justifyContent: 'center',
            paddingTop: '20vh',
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15 }}
            style={{
              width: '100%',
              maxWidth: 600,
              maxHeight: '60vh',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Search Input */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: '#0A0A0A',
              border: '1px solid #1F1F1F',
              borderRadius: 16,
              padding: '14px 20px',
              ...(flatResults.length > 0 || loading ? { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 } : {}),
            }}>
              <SearchIcon />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search gyms, members, transactions..."
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: 20,
                  color: '#FFFFFF',
                  fontFamily: font,
                  fontWeight: 400,
                }}
              />
              <div style={{
                fontSize: 11, color: '#666', fontFamily: font,
                padding: '3px 8px', borderRadius: 6,
                border: '1px solid #333', fontWeight: 500,
              }}>
                ESC
              </div>
            </div>

            {/* Results */}
            {(flatResults.length > 0 || loading) && (
              <div style={{
                background: '#0A0A0A',
                border: '1px solid #1F1F1F',
                borderTop: 'none',
                borderBottomLeftRadius: 16,
                borderBottomRightRadius: 16,
                overflowY: 'auto',
                padding: '8px 0',
              }}>
                {loading && flatResults.length === 0 && (
                  <div style={{
                    padding: '20px 16px',
                    textAlign: 'center',
                    fontSize: 13,
                    color: '#666',
                    fontFamily: font,
                  }}>
                    Searching...
                  </div>
                )}
                {renderCategory('Gyms', results.gyms, gymsStart)}
                {renderCategory('Members', results.members, membersStart)}
                {renderCategory('Transactions', results.transactions, txnStart)}
              </div>
            )}

            {/* No results */}
            {!loading && query.length >= 2 && flatResults.length === 0 && (
              <div style={{
                background: '#0A0A0A',
                border: '1px solid #1F1F1F',
                borderTop: 'none',
                borderBottomLeftRadius: 16,
                borderBottomRightRadius: 16,
                padding: '24px 16px',
                textAlign: 'center',
                fontSize: 13,
                color: '#666',
                fontFamily: font,
              }}>
                No results found for "{query}"
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
