import { useState, useRef, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useTheme } from '../../context/ThemeContext'
import { SkeletonTable } from '../../components/ui'
import Modal from '../../components/ui/Modal'
import { formatDate } from '../../lib/utils'
import api from '../../lib/api'
import {
  Mail, Sparkles, Send, Clock, Eye, Copy, Smartphone, Monitor,
  Bold, Italic, List, ListOrdered, Link2, Type, ChevronDown, Image as ImageIcon,
  Code, X, Plus, Calendar, Users, UserCheck, AlertTriangle, User, Search,
  Heading1, Heading2, Quote, Undo2, Redo2, Strikethrough, FlaskConical,
  Loader2,
} from 'lucide-react'

// Global UI font
const FONT = "'Inter', -apple-system, sans-serif"
const FONT_D = "'Inter', -apple-system, sans-serif"
const FONT_M = "'JetBrains Mono', monospace"

const TEMPLATES = [
  { id: 'welcome', name: 'Welcome', icon: '\u{1F44B}', subject: 'Welcome to {{gym_name}}!', body: 'Hi {{member_name}},\n\nWelcome to {{gym_name}}! We are thrilled to have you as part of our fitness family.\n\nYour membership is now active. Visit us anytime during our operating hours and our team will be happy to help you get started.\n\nSee you at the gym!\n\u2014 Team {{gym_name}}' },
  { id: 'renewal', name: 'Renewal', icon: '\u{1F504}', subject: 'Your membership is expiring soon', body: 'Hi {{member_name}},\n\nThis is a friendly reminder that your membership at {{gym_name}} is expiring soon.\n\nRenew now to continue enjoying uninterrupted access to all our facilities and classes. Visit the front desk or renew online.\n\nDon\'t let your fitness journey pause!\n\u2014 Team {{gym_name}}' },
  { id: 'motivation', name: 'Motivation', icon: '\u{1F4AA}', subject: 'Keep pushing \u2014 you\'re doing great!', body: 'Hi {{member_name}},\n\nJust a quick note to say \u2014 you\'re doing amazing! Consistency is the key to results, and we\'ve noticed your dedication.\n\nKeep showing up, keep pushing, and remember: every rep counts.\n\nSee you at {{gym_name}}!\n\u2014 Your Fitness Team' },
]

const TONES = ['friendly', 'professional', 'motivational', 'urgent']

const RECIPIENT_OPTIONS = [
  { value: 'all', label: 'All Members', icon: Users, desc: 'Every member with an email' },
  { value: 'active', label: 'Active Members', icon: UserCheck, desc: 'Currently active memberships' },
  { value: 'expiring', label: 'Expiring Soon', icon: AlertTriangle, desc: 'Memberships expiring within 7 days' },
  { value: 'individual', label: 'Individual', icon: User, desc: 'Send to specific emails' },
]

const VARIABLES = ['{{member_name}}', '{{gym_name}}', '{{owner_name}}', '{{expiry_date}}']

// HTML-escape a string to prevent breaking email HTML structure
function escapeHtml(str) {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// ── Pill Tag ─────────────────────────────────────────────────
function PillTag({ label, onRemove, theme, sp }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: `${sp ? sp(4) : 4}px ${sp ? sp(12) : 12}px`, borderRadius: 14,
      fontSize: 13, fontWeight: 500,
      background: theme.accentSoft, color: theme.accent, fontFamily: FONT,
    }}>
      {label}
      <X size={13} style={{ cursor: 'pointer', opacity: 0.7 }} onClick={onRemove} />
    </span>
  )
}

// ── Pill Input (for CC/BCC) ──────────────────────────────────
function PillInput({ pills, onChange, placeholder, theme, sp }) {
  const [val, setVal] = useState('')
  const handleKey = (e) => {
    if ((e.key === 'Enter' || e.key === ',') && val.trim()) {
      e.preventDefault()
      const email = val.trim().replace(/,$/, '')
      if (email && !pills.includes(email)) onChange([...pills, email])
      setVal('')
    }
    if (e.key === 'Backspace' && !val && pills.length) {
      onChange(pills.slice(0, -1))
    }
  }
  const s = sp || (v => v)
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 6, padding: `${s(8)}px ${s(12)}px`,
      background: theme.bgInput, borderRadius: 8, border: `1px solid ${theme.borderStrong || theme.border}`,
      minHeight: s(40), alignItems: 'center',
    }}>
      {pills.map(p => <PillTag key={p} label={p} onRemove={() => onChange(pills.filter(x => x !== p))} theme={theme} sp={sp} />)}
      <input
        value={val} onChange={e => setVal(e.target.value)} onKeyDown={handleKey}
        placeholder={pills.length ? '' : placeholder}
        style={{
          flex: 1, minWidth: 120, border: 'none', background: 'transparent',
          color: theme.text, fontSize: 14, fontFamily: FONT, outline: 'none', padding: 0,
        }}
      />
    </div>
  )
}

// ── Section Label ────────────────────────────────────────────
function SectionLabel({ children, theme, sp }) {
  const s = sp || (v => v)
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, color: theme.textTer,
      textTransform: 'uppercase', letterSpacing: 1.2,
      marginBottom: s(10), fontFamily: FONT_D,
    }}>{children}</div>
  )
}

// ── Individual Email Search Input ────────────────────────────
function IndividualEmailInput({ emails, onChange, gymId, theme, sp }) {
  const [search, setSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const ref = useRef(null)
  const s = sp || (v => v)

  const { data: searchResults } = useQuery({
    queryKey: ['member-search-email', gymId, search],
    queryFn: () => api.get(`/gyms/${gymId}/members?search=${encodeURIComponent(search)}&limit=8`).then(r => r.data?.members || r.members || []),
    enabled: !!gymId && search.length >= 2,
    staleTime: 10_000,
  })

  useEffect(() => {
    if (!showDropdown) return
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setShowDropdown(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showDropdown])

  const addEmail = (email) => {
    if (email && !emails.includes(email)) onChange([...emails, email])
    setSearch('')
    setShowDropdown(false)
  }

  const handleKey = (e) => {
    if ((e.key === 'Enter' || e.key === ',') && search.trim()) {
      e.preventDefault()
      const email = search.trim().replace(/,$/, '')
      if (email.includes('@')) addEmail(email)
    }
  }

  const members = searchResults || []

  // Status color for member
  const statusColor = (status) => {
    if (status === 'active') return theme.statusActive || theme.green
    if (status === 'expired') return theme.statusExpired || theme.red
    return theme.statusInactive || theme.textTer
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 6, padding: `${s(8)}px ${s(12)}px`,
        background: theme.bgInput, borderRadius: 10, border: `1px solid ${theme.borderStrong || theme.border}`,
        minHeight: s(42), alignItems: 'center',
      }}>
        {emails.map(e => (
          <PillTag key={e} label={e} onRemove={() => onChange(emails.filter(x => x !== e))} theme={theme} sp={sp} />
        ))}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, minWidth: 160 }}>
          <Search size={15} color={theme.textTer} />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setShowDropdown(true) }}
            onFocus={() => search.length >= 2 && setShowDropdown(true)}
            onKeyDown={handleKey}
            placeholder="Search members or type email..."
            style={{
              flex: 1, border: 'none', background: 'transparent',
              color: theme.text, fontSize: 14, fontFamily: FONT,
              outline: 'none', padding: 0,
            }}
          />
        </div>
      </div>
      {showDropdown && members.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
          marginTop: 4, background: theme.bgSec,
          border: `1px solid ${theme.borderStrong || theme.border}`,
          borderRadius: 12, padding: 4, maxHeight: 320, overflowY: 'auto',
          boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
        }}>
          {members.filter(m => m.email).map(m => (
            <button key={m.id} onClick={() => addEmail(m.email)} style={{
              display: 'flex', alignItems: 'center', gap: 12, width: '100%',
              padding: `${s(10)}px ${s(14)}px`, borderRadius: 8, border: 'none', cursor: 'pointer',
              background: 'transparent', color: theme.text, fontSize: 14,
              fontFamily: FONT, textAlign: 'left',
              transition: 'background 0.15s',
              minHeight: 48,
            }}
              onMouseEnter={e => e.currentTarget.style.background = theme.bgHover}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {/* Avatar with status dot */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: '50%', background: theme.accentSoft,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 700, color: theme.accent,
                }}>
                  {(m.name || m.email)[0].toUpperCase()}
                </div>
                {/* Status indicator dot */}
                <div style={{
                  position: 'absolute', bottom: -1, right: -1,
                  width: 10, height: 10, borderRadius: '50%',
                  background: statusColor(m.status),
                  border: `2px solid ${theme.bgSec}`,
                }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: theme.text }}>{m.name}</div>
                <div style={{ fontSize: 12, color: theme.textSec, marginTop: 1 }}>{m.email}</div>
              </div>
              {/* Status label */}
              <span style={{
                fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                padding: '2px 8px', borderRadius: 6, flexShrink: 0,
                background: `${statusColor(m.status)}18`,
                color: statusColor(m.status),
                letterSpacing: 0.5,
              }}>
                {m.status || 'unknown'}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Rich Text Editor ─────────────────────────────────────────
function RichTextEditor({ value, onHtmlChange, theme, gymId }) {
  const editorRef = useRef(null)
  const fileInputRef = useRef(null)
  const [sourceMode, setSourceMode] = useState(false)
  const [htmlSource, setHtmlSource] = useState('')
  const [uploading, setUploading] = useState(false)

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      onHtmlChange(editorRef.current.innerHTML)
    }
  }, [onHtmlChange])

  // Set content when value changes externally (template/AI)
  useEffect(() => {
    if (editorRef.current && value !== undefined) {
      const currentHtml = editorRef.current.innerHTML
      const newHtml = value.includes('<') ? value : value.replace(/\n/g, '<br>')
      if (currentHtml !== newHtml) {
        editorRef.current.innerHTML = newHtml
      }
    }
  }, [value])

  useEffect(() => {
    if (sourceMode && editorRef.current) {
      setHtmlSource(editorRef.current.innerHTML)
    }
  }, [sourceMode])

  const execCmd = (cmd, val = null) => {
    editorRef.current?.focus()
    document.execCommand(cmd, false, val)
    handleInput()
  }

  const handleSourceChange = (html) => {
    setHtmlSource(html)
    if (editorRef.current) editorRef.current.innerHTML = html
    onHtmlChange(html)
  }

  const toggleSource = () => {
    if (sourceMode && editorRef.current) {
      editorRef.current.innerHTML = htmlSource
      onHtmlChange(htmlSource)
    }
    setSourceMode(!sourceMode)
  }

  const insertImage = () => fileInputRef.current?.click()

  const handleImageFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const url = res.data?.url || res.url
      if (url) {
        execCmd('insertHTML', `<img src="${escapeHtml(url)}" style="max-width:100%;border-radius:8px;margin:8px 0;" alt="newsletter image" />`)
      }
    } catch {
      // Fallback: insert as base64
      const reader = new FileReader()
      reader.onload = () => {
        execCmd('insertHTML', `<img src="${reader.result}" style="max-width:100%;border-radius:8px;margin:8px 0;" alt="newsletter image" />`)
      }
      reader.readAsDataURL(file)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const insertLink = () => {
    const url = prompt('Enter URL:')
    if (url) {
      const text = document.getSelection()?.toString() || url
      execCmd('insertHTML', `<a href="${escapeHtml(url)}" style="color:${theme.accent}">${escapeHtml(text)}</a>`)
    }
  }

  const ToolBtn = ({ icon: Icon, onClick, title, active, disabled }) => (
    <button onClick={onClick} title={title} disabled={disabled} style={{
      background: active ? theme.accentSoft : 'none', border: 'none',
      color: active ? theme.accent : disabled ? theme.textTer : theme.textSec,
      cursor: disabled ? 'not-allowed' : 'pointer',
      padding: '5px 7px', borderRadius: 5, display: 'flex', transition: 'all 0.15s',
      opacity: disabled ? 0.5 : 1,
    }}
      onMouseEnter={e => { if (!active && !disabled) e.currentTarget.style.background = theme.bgHover }}
      onMouseLeave={e => { if (!active && !disabled) e.currentTarget.style.background = 'none' }}
    >
      <Icon size={15} />
    </button>
  )

  return (
    <div>
      {/* Toolbar */}
      <div style={{
        display: 'flex', gap: 1, padding: '6px 8px', marginBottom: -1,
        background: theme.bgTer, borderRadius: '10px 10px 0 0',
        border: `1px solid ${theme.borderStrong}`, borderBottom: 'none',
        flexWrap: 'wrap', alignItems: 'center',
      }}>
        <ToolBtn icon={Bold} onClick={() => execCmd('bold')} title="Bold (Ctrl+B)" />
        <ToolBtn icon={Italic} onClick={() => execCmd('italic')} title="Italic (Ctrl+I)" />
        <ToolBtn icon={Strikethrough} onClick={() => execCmd('strikeThrough')} title="Strikethrough" />
        <div style={{ width: 1, height: 18, background: theme.border, margin: '0 4px' }} />
        <ToolBtn icon={Heading1} onClick={() => execCmd('formatBlock', 'h2')} title="Heading" />
        <ToolBtn icon={Heading2} onClick={() => execCmd('formatBlock', 'h3')} title="Subheading" />
        <div style={{ width: 1, height: 18, background: theme.border, margin: '0 4px' }} />
        <ToolBtn icon={List} onClick={() => execCmd('insertUnorderedList')} title="Bullet List" />
        <ToolBtn icon={ListOrdered} onClick={() => execCmd('insertOrderedList')} title="Numbered List" />
        <ToolBtn icon={Quote} onClick={() => execCmd('formatBlock', 'blockquote')} title="Quote" />
        <div style={{ width: 1, height: 18, background: theme.border, margin: '0 4px' }} />
        <ToolBtn icon={Link2} onClick={insertLink} title="Insert Link" />
        <ToolBtn icon={uploading ? Loader2 : ImageIcon} onClick={insertImage} title="Insert Image" disabled={uploading} />
        <div style={{ width: 1, height: 18, background: theme.border, margin: '0 4px' }} />
        <ToolBtn icon={Undo2} onClick={() => execCmd('undo')} title="Undo" />
        <ToolBtn icon={Redo2} onClick={() => execCmd('redo')} title="Redo" />
        <div style={{ flex: 1 }} />
        <button onClick={toggleSource} title="View Source" style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '4px 10px', borderRadius: 5, border: 'none', cursor: 'pointer',
          fontSize: 11, fontWeight: 600, fontFamily: FONT_M,
          background: sourceMode ? theme.accent : 'transparent',
          color: sourceMode ? '#fff' : theme.textSec,
          transition: 'all 0.2s',
        }}>
          <Code size={13} />
          HTML
        </button>
        <VariableDropdown onInsert={(v) => execCmd('insertText', v)} theme={theme} />
      </div>

      {sourceMode ? (
        <textarea
          value={htmlSource}
          onChange={e => handleSourceChange(e.target.value)}
          spellCheck={false}
          style={{
            width: '100%', minHeight: 260, padding: '14px 16px',
            background: theme.bgInput, color: theme.cyan,
            border: `1px solid ${theme.borderStrong}`, borderRadius: '0 0 10px 10px',
            fontSize: 13, fontFamily: FONT_M,
            lineHeight: 1.7, resize: 'vertical', outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      ) : (
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onKeyDown={e => {
            if (e.key === 'b' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); execCmd('bold') }
            if (e.key === 'i' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); execCmd('italic') }
          }}
          data-placeholder="Write your newsletter content here..."
          style={{
            minHeight: 260, padding: '14px 16px',
            background: theme.bgInput, color: theme.text,
            border: `1px solid ${theme.borderStrong}`, borderRadius: '0 0 10px 10px',
            fontSize: 14, fontFamily: FONT, lineHeight: 1.7,
            outline: 'none', overflowY: 'auto', whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
          suppressContentEditableWarning
        />
      )}

      <input ref={fileInputRef} type="file" hidden accept="image/*" onChange={handleImageFile} />

      <style>{`
        [data-placeholder]:empty::before {
          content: attr(data-placeholder);
          color: ${theme.textTer};
          pointer-events: none;
        }
        [contenteditable] blockquote {
          border-left: 3px solid ${theme.accent};
          margin: 8px 0; padding: 4px 12px;
          color: ${theme.textSec};
        }
        [contenteditable] h2 { font-size: 20px; font-weight: 700; margin: 12px 0 6px; }
        [contenteditable] h3 { font-size: 16px; font-weight: 600; margin: 10px 0 4px; }
        [contenteditable] a { color: ${theme.accent}; text-decoration: underline; }
        [contenteditable] img { max-width: 100%; border-radius: 8px; margin: 8px 0; }
        [contenteditable] ul, [contenteditable] ol { padding-left: 20px; margin: 6px 0; }
      `}</style>
    </div>
  )
}

// ── Variable Dropdown ────────────────────────────────────────
function VariableDropdown({ onInsert, theme }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)} style={{
        display: 'flex', alignItems: 'center', gap: 3,
        background: 'none', border: 'none', color: theme.textSec, cursor: 'pointer',
        padding: '4px 6px', borderRadius: 4, fontSize: 11, fontFamily: FONT,
      }}>
        <Type size={13} /> Variables <ChevronDown size={10} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, zIndex: 10,
          background: theme.bgSec, border: `1px solid ${theme.borderStrong}`, borderRadius: 8,
          padding: 4, minWidth: 160, boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          {VARIABLES.map(v => (
            <button key={v} onClick={() => { onInsert(v); setOpen(false) }} style={{
              display: 'block', width: '100%', textAlign: 'left',
              background: 'none', border: 'none', color: theme.textSec, cursor: 'pointer',
              padding: '7px 10px', borderRadius: 4, fontSize: 12,
              fontFamily: FONT_M,
            }}
              onMouseEnter={e => e.currentTarget.style.background = theme.bgHover}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >{v}</button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────
export default function Newsletter() {
  const { gym } = useAuth()
  const gymId = gym?.id
  const toast = useToast()
  const qc = useQueryClient()
  const { theme, sp } = useTheme()

  // Compose state
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [subject, setSubject] = useState('')
  const [bodyHtml, setBodyHtml] = useState('')
  const [language, setLanguage] = useState('en')
  const [recipients, setRecipients] = useState('all')
  const [individualEmails, setIndividualEmails] = useState([])
  const [cc, setCc] = useState([])
  const [bcc, setBcc] = useState([])
  const [replyTo, setReplyTo] = useState('')
  const [fromName, setFromName] = useState('')
  const [showCcBcc, setShowCcBcc] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [scheduleMode, setScheduleMode] = useState(false)
  const [scheduledAt, setScheduledAt] = useState('')
  const [editorContent, setEditorContent] = useState('')

  // AI state
  const [aiTopic, setAiTopic] = useState('')
  const [aiTone, setAiTone] = useState('friendly')

  // Preview
  const [previewMode, setPreviewMode] = useState('desktop')
  const [showConfirm, setShowConfirm] = useState(false)

  // ── Queries ──────────────────────────────────────────────
  const { data: newslettersData, isLoading: nlLoading } = useQuery({
    queryKey: ['newsletters', gymId],
    queryFn: () => api.get(`/gyms/${gymId}/newsletters`).then(r => r.data || r),
    enabled: !!gymId,
  })

  // Fetch recipient counts for confirmation
  const { data: recipientCounts } = useQuery({
    queryKey: ['newsletter-counts', gymId],
    queryFn: () => api.get(`/gyms/${gymId}/newsletters/recipient-counts`).then(r => r.data || r),
    enabled: !!gymId,
    staleTime: 60_000,
  })

  const generateMut = useMutation({
    mutationFn: (p) => api.post(`/gyms/${gymId}/newsletters/generate`, p).then(r => r.data || r),
    onSuccess: (data) => {
      setSubject(data.subject || '')
      const newBody = data.body || ''
      setEditorContent(newBody)
      setSelectedTemplate(null)
      toast.success('AI content generated')
    },
    onError: () => toast.error('Failed to generate content'),
  })

  const sendMut = useMutation({
    mutationFn: (p) => api.post(`/gyms/${gymId}/newsletters/send`, p).then(r => r.data || r),
    onSuccess: (data) => {
      toast.success(data.message || `Newsletter sent to ${data.sentCount || 0} recipients`)
      qc.invalidateQueries({ queryKey: ['newsletters', gymId] })
      qc.invalidateQueries({ queryKey: ['newsletter-counts', gymId] })
      resetComposer()
      setShowConfirm(false)
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to send newsletter')
      setShowConfirm(false)
    },
  })

  const testMut = useMutation({
    mutationFn: (p) => api.post(`/gyms/${gymId}/newsletters/test`, p).then(r => r.data || r),
    onSuccess: (data) => {
      toast.success(`Test email sent to your inbox (${data.sentCount || 1} delivered)`)
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to send test email')
    },
  })

  const resetComposer = useCallback(() => {
    setSubject(''); setBodyHtml(''); setEditorContent('')
    setSelectedTemplate(null); setCc([]); setBcc([]); setIndividualEmails([])
    setReplyTo(''); setFromName(''); setScheduleMode(false); setScheduledAt('')
  }, [])

  const handleSelectTemplate = (tpl) => {
    setSelectedTemplate(tpl.id)
    setSubject(tpl.subject)
    setEditorContent(tpl.body)
  }

  const handleGenerate = () => {
    if (!aiTopic.trim()) return toast.error('Enter a topic first')
    generateMut.mutate({ topic: aiTopic.trim(), tone: aiTone })
  }

  const buildPayload = () => ({
    subject: subject.trim(),
    body: bodyHtml || '',
    isHtml: true,
    language,
    template: selectedTemplate || 'custom',
    recipients,
    ...(recipients === 'individual' && { individualEmails }),
    ...(cc.length && { cc }),
    ...(bcc.length && { bcc }),
    ...(replyTo.trim() && { replyTo: replyTo.trim() }),
    ...(fromName.trim() && { fromName: fromName.trim() }),
    ...(scheduleMode && scheduledAt && { scheduledAt }),
  })

  const handleSend = () => {
    if (!subject.trim()) return toast.error('Subject is required')
    if (!bodyHtml.trim()) return toast.error('Body is required')
    if (recipients === 'individual' && individualEmails.length === 0) return toast.error('Add at least one recipient email')
    setShowConfirm(true)
  }

  const confirmSend = () => {
    sendMut.mutate(buildPayload())
  }

  const handleSendTest = () => {
    if (!subject.trim()) return toast.error('Subject is required')
    if (!bodyHtml.trim()) return toast.error('Body is required')
    testMut.mutate(buildPayload())
  }

  const newsletters = newslettersData?.newsletters || []
  const gymName = gym?.gym_name || gym?.name || 'Your Gym'

  // Get recipient count for current selection
  const getRecipientCount = () => {
    if (recipients === 'individual') return individualEmails.length
    if (!recipientCounts) return '...'
    return recipientCounts[recipients] ?? '...'
  }

  // Render preview HTML with sanitized variable substitution
  const renderPreview = () => {
    const vars = {
      gym_name: escapeHtml(gymName),
      member_name: escapeHtml('John'),
      owner_name: escapeHtml(gym?.owner_name || 'Owner'),
      expiry_date: escapeHtml(new Date().toLocaleDateString('en-IN')),
    }
    const replaceVars = (str) => str
      .replace(/\{\{gym_name\}\}/gi, vars.gym_name)
      .replace(/\{\{member_name\}\}/gi, vars.member_name)
      .replace(/\{\{owner_name\}\}/gi, vars.owner_name)
      .replace(/\{\{expiry_date\}\}/gi, vars.expiry_date)
    return {
      subject: replaceVars(subject),
      body: bodyHtml ? replaceVars(bodyHtml) : '',
    }
  }

  const preview = renderPreview()

  const copyHtml = () => {
    const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px"><h2>${preview.subject}</h2><div>${preview.body}</div></div>`
    navigator.clipboard.writeText(html).then(() => toast.success('HTML copied'))
  }

  const inputSty = {
    width: '100%', padding: `${sp(12)}px ${sp(16)}px`, borderRadius: 10,
    border: `1px solid ${theme.borderStrong || theme.border}`, background: theme.bgInput, color: theme.text,
    fontSize: 14, fontFamily: FONT, outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  }

  const canSend = subject.trim() && bodyHtml.trim() &&
    (recipients !== 'individual' || individualEmails.length > 0)

  return (
    <div style={{ fontFamily: FONT }}>
      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: sp(28) }}>
        <div style={{
          width: 42, height: 42, borderRadius: 12,
          background: theme.accentSoft,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Mail size={22} color={theme.accent} />
        </div>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: theme.text, margin: 0, fontFamily: FONT_D }}>Newsletter</h1>
          <p style={{ fontSize: 13, color: theme.textSec, margin: 0, fontFamily: FONT }}>Compose & send emails to your members</p>
        </div>
      </div>

      {/* ── Template Cards ─────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <SectionLabel theme={theme} sp={sp}>Quick Templates</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {TEMPLATES.map(tpl => {
            const sel = selectedTemplate === tpl.id
            return (
              <div key={tpl.id} onClick={() => handleSelectTemplate(tpl)} style={{
                cursor: 'pointer', padding: 2, borderRadius: 14,
                background: sel ? theme.grad : 'transparent', transition: 'all 0.25s',
              }}>
                <div style={{
                  background: sel ? theme.bgTer : theme.bgSec, borderRadius: 12,
                  border: sel ? 'none' : `1px solid ${theme.border}`,
                  padding: '18px 16px', transition: 'all 0.25s',
                }}>
                  <div style={{ fontSize: 26, marginBottom: 8 }}>{tpl.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: theme.text, fontFamily: FONT_D }}>{tpl.name}</div>
                  <div style={{ fontSize: 12, color: theme.textSec, marginTop: 4, lineHeight: 1.4 }}>{tpl.subject}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── AI Generate ────────────────────────────────────── */}
      <div style={{
        background: theme.bgSec, borderRadius: 14, border: `1px solid ${theme.borderStrong}`,
        padding: '20px 22px', marginBottom: 24, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: -40, right: -40, width: 140, height: 140,
          borderRadius: '50%', background: 'rgba(108,92,231,0.06)', filter: 'blur(50px)', pointerEvents: 'none',
        }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, position: 'relative' }}>
          <Sparkles size={16} color={theme.accent} />
          <span style={{ fontSize: 14, fontWeight: 700, color: theme.text, fontFamily: FONT_D, textTransform: 'uppercase', letterSpacing: 0.5 }}>Generate with AI</span>
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap', position: 'relative' }}>
          <input
            placeholder="Topic, e.g. Summer fitness challenge..."
            value={aiTopic} onChange={e => setAiTopic(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleGenerate()}
            style={{ ...inputSty, flex: 1, minWidth: 180 }}
          />
          <button
            onClick={handleGenerate} disabled={generateMut.isPending}
            style={{
              background: theme.grad, color: '#fff', border: 'none', borderRadius: 8,
              padding: '10px 20px', fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 13, fontFamily: FONT_D, textTransform: 'uppercase', letterSpacing: 0.5,
              opacity: generateMut.isPending ? 0.6 : 1, transition: 'opacity 0.2s',
            }}
          >
            <Sparkles size={14} />
            {generateMut.isPending ? 'Generating...' : 'Generate'}
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', position: 'relative' }}>
          {TONES.map(t => (
            <button key={t} onClick={() => setAiTone(t)} style={{
              padding: `${sp(7)}px ${sp(16)}px`, borderRadius: 16, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, fontFamily: FONT, textTransform: 'capitalize',
              background: aiTone === t ? theme.accent : theme.bgTer,
              color: aiTone === t ? '#fff' : theme.textSec,
              transition: 'all 0.2s',
            }}>{t}</button>
          ))}
        </div>
      </div>

      {/* ── TWO-COLUMN: Compose + Preview ──────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 32, alignItems: 'start' }}>

        {/* ── LEFT: Compose Panel ──────────────────────────── */}
        <div style={{
          background: theme.bgSec, borderRadius: 16, border: `1px solid ${theme.borderStrong}`,
          padding: 24, display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Send size={16} color={theme.cyan} />
            <span style={{ fontSize: 15, fontWeight: 700, color: theme.text, fontFamily: FONT_D, textTransform: 'uppercase', letterSpacing: 0.5 }}>Compose</span>
          </div>

          {/* Recipients */}
          <div>
            <SectionLabel theme={theme} sp={sp}>To</SectionLabel>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {RECIPIENT_OPTIONS.map(opt => {
                const Icon = opt.icon
                const sel = recipients === opt.value
                return (
                  <button key={opt.value} onClick={() => setRecipients(opt.value)} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: `${sp(9)}px ${sp(16)}px`, borderRadius: 10, border: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: 600, fontFamily: FONT,
                    background: sel ? theme.accentSoft : theme.bgTer,
                    color: sel ? theme.accent : theme.textSec,
                    transition: 'all 0.2s',
                  }}>
                    <Icon size={13} />
                    {opt.label}
                    {/* Show count badge for non-individual */}
                    {opt.value !== 'individual' && recipientCounts && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10,
                        background: sel ? theme.accent : theme.bgHover,
                        color: sel ? '#fff' : theme.textTer,
                        marginLeft: 2,
                      }}>
                        {recipientCounts[opt.value] ?? 0}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
            {recipients === 'individual' && (
              <div style={{ marginTop: 10 }}>
                <IndividualEmailInput
                  emails={individualEmails}
                  onChange={setIndividualEmails}
                  gymId={gymId}
                  theme={theme}
                  sp={sp}
                />
                <div style={{ fontSize: 11, color: theme.textTer, marginTop: 4 }}>
                  Search members by name or type any email address
                </div>
              </div>
            )}
          </div>

          {/* CC/BCC toggle */}
          {!showCcBcc ? (
            <button onClick={() => setShowCcBcc(true)} style={{
              background: 'none', border: 'none', color: theme.textTer, fontSize: 12,
              cursor: 'pointer', fontFamily: FONT, textAlign: 'left', padding: 0,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <Plus size={12} /> Add CC / BCC
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <SectionLabel theme={theme} sp={sp}>CC</SectionLabel>
                <PillInput pills={cc} onChange={setCc} placeholder="Add CC emails..." theme={theme} sp={sp} />
              </div>
              <div>
                <SectionLabel theme={theme} sp={sp}>BCC</SectionLabel>
                <PillInput pills={bcc} onChange={setBcc} placeholder="Add BCC emails..." theme={theme} sp={sp} />
              </div>
            </div>
          )}

          {/* Advanced: Reply-To, From Name */}
          {!showAdvanced ? (
            <button onClick={() => setShowAdvanced(true)} style={{
              background: 'none', border: 'none', color: theme.textTer, fontSize: 12,
              cursor: 'pointer', fontFamily: FONT, textAlign: 'left', padding: 0,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <Plus size={12} /> Reply-To / From Name
            </button>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <SectionLabel theme={theme} sp={sp}>Reply-To</SectionLabel>
                <input value={replyTo} onChange={e => setReplyTo(e.target.value)}
                  placeholder="reply@gym.com" style={inputSty} />
              </div>
              <div>
                <SectionLabel theme={theme} sp={sp}>From Name</SectionLabel>
                <input value={fromName} onChange={e => setFromName(e.target.value)}
                  placeholder={gymName} style={inputSty} />
              </div>
            </div>
          )}

          {/* Subject */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <SectionLabel theme={theme} sp={sp}>Subject</SectionLabel>
              <span style={{ fontSize: 11, color: subject.length > 60 ? theme.amber : theme.textTer, fontFamily: FONT_M }}>
                {subject.length}/80
              </span>
            </div>
            <input
              placeholder="Your newsletter subject line..."
              value={subject} onChange={e => setSubject(e.target.value)}
              maxLength={120}
              style={inputSty}
            />
          </div>

          {/* Body with Rich Text Editor */}
          <div>
            <SectionLabel theme={theme} sp={sp}>Body</SectionLabel>
            <RichTextEditor
              value={editorContent}
              onHtmlChange={setBodyHtml}
              theme={theme}
              gymId={gymId}
            />
          </div>

          {/* Language */}
          <div>
            <SectionLabel theme={theme} sp={sp}>Language</SectionLabel>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[
                { code: 'en', label: 'English' },
                { code: 'hi', label: 'Hindi' },
                { code: 'te', label: 'Telugu' },
                { code: 'ta', label: 'Tamil' },
                { code: 'kn', label: 'Kannada' },
              ].map(l => (
                <button key={l.code} onClick={() => setLanguage(l.code)} style={{
                  padding: `${sp(7)}px ${sp(16)}px`, borderRadius: 16, border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 600, fontFamily: FONT,
                  background: language === l.code ? theme.accent : theme.bgTer,
                  color: language === l.code ? '#fff' : theme.textSec,
                  transition: 'all 0.2s',
                }}>{l.label}</button>
              ))}
            </div>
          </div>

          {/* Schedule toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <label style={{
              display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
              fontSize: 13, color: theme.textSec, fontFamily: FONT,
            }}>
              <div onClick={() => setScheduleMode(!scheduleMode)} style={{
                width: 36, height: 20, borderRadius: 10, position: 'relative', cursor: 'pointer',
                background: scheduleMode ? theme.accent : theme.bgTer, transition: 'background 0.2s',
                border: `1px solid ${scheduleMode ? theme.accent : theme.border}`,
              }}>
                <div style={{
                  width: 16, height: 16, borderRadius: '50%', background: '#fff',
                  position: 'absolute', top: 1, left: scheduleMode ? 17 : 1,
                  transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                }} />
              </div>
              <Calendar size={14} />
              Schedule for later
            </label>
            {scheduleMode && (
              <input
                type="datetime-local"
                value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
                style={{ ...inputSty, width: 'auto', fontSize: 12, padding: '6px 10px' }}
              />
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            {/* Send Test */}
            <button
              onClick={handleSendTest}
              disabled={testMut.isPending || !canSend}
              title="Send a test to your own email"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: `${sp(14)}px ${sp(18)}px`, borderRadius: 10, cursor: canSend ? 'pointer' : 'not-allowed',
                background: theme.bgTer, border: `1px solid ${theme.borderStrong}`,
                color: canSend ? theme.cyan : theme.textTer,
                fontSize: 13, fontWeight: 600, fontFamily: FONT_D,
                textTransform: 'uppercase', letterSpacing: 0.5,
                opacity: testMut.isPending ? 0.6 : 1, transition: 'all 0.2s',
                whiteSpace: 'nowrap',
              }}
            >
              {testMut.isPending ? <Loader2 size={14} className="spin" /> : <FlaskConical size={14} />}
              {testMut.isPending ? 'Sending...' : 'Send Test'}
            </button>
            {/* Send Newsletter */}
            <button
              onClick={handleSend}
              disabled={sendMut.isPending || !canSend}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: `${sp(14)}px ${sp(24)}px`, borderRadius: 10, border: 'none', cursor: canSend ? 'pointer' : 'not-allowed',
                background: canSend ? theme.grad : theme.bgTer,
                color: canSend ? '#fff' : theme.textTer,
                fontSize: 15, fontWeight: 700, fontFamily: FONT_D,
                textTransform: 'uppercase', letterSpacing: 1,
                opacity: sendMut.isPending ? 0.6 : 1, transition: 'all 0.2s',
              }}
            >
              <Send size={16} />
              {scheduleMode ? 'Schedule' : 'Send Newsletter'}
            </button>
            <button onClick={resetComposer} title="Clear" style={{
              padding: '14px 16px', borderRadius: 10, cursor: 'pointer',
              background: theme.bgTer, border: `1px solid ${theme.borderStrong}`, color: theme.textTer,
              display: 'flex', alignItems: 'center',
            }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── RIGHT: Live Preview ──────────────────────────── */}
        <div style={{
          background: theme.bgSec, borderRadius: 16, border: `1px solid ${theme.borderStrong}`,
          padding: 24, position: 'sticky', top: 80,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Eye size={16} color={theme.cyan} />
              <span style={{ fontSize: 15, fontWeight: 700, color: theme.text, fontFamily: FONT_D, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Preview
              </span>
            </div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              {[
                { mode: 'desktop', icon: Monitor, label: 'Desktop' },
                { mode: 'mobile', icon: Smartphone, label: 'Mobile' },
              ].map(({ mode, icon: Icon, label }) => (
                <button key={mode} onClick={() => setPreviewMode(mode)} title={label} style={{
                  padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  background: previewMode === mode ? theme.accentSoft : 'transparent',
                  color: previewMode === mode ? theme.accent : theme.textTer,
                  display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: 11, fontWeight: 600, fontFamily: FONT,
                }}>
                  <Icon size={14} />
                  {label}
                </button>
              ))}
              <div style={{ width: 1, height: 16, background: theme.border, margin: '0 4px' }} />
              <button onClick={copyHtml} title="Copy HTML" style={{
                padding: '5px 8px', borderRadius: 6, border: 'none', cursor: 'pointer',
                background: 'transparent', color: theme.textTer, display: 'flex',
              }}>
                <Copy size={14} />
              </button>
            </div>
          </div>

          {/* Email Preview Frame */}
          <div style={{
            background: '#ffffff', borderRadius: 10, overflow: 'hidden',
            maxWidth: previewMode === 'mobile' ? 375 : '100%',
            margin: previewMode === 'mobile' ? '0 auto' : 0,
            transition: 'max-width 0.3s ease',
            border: previewMode === 'mobile'
              ? '8px solid #222'
              : '1px solid rgba(0,0,0,0.1)',
            borderRadius: previewMode === 'mobile' ? 20 : 10,
          }}>
            {/* Phone notch for mobile preview */}
            {previewMode === 'mobile' && (
              <div style={{
                height: 24, background: '#222', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{
                  width: 60, height: 6, borderRadius: 3, background: '#444',
                }} />
              </div>
            )}

            {/* Email header bar */}
            <div style={{
              background: '#f5f5f5', padding: previewMode === 'mobile' ? '10px 12px' : '12px 16px',
              borderBottom: '1px solid #e0e0e0',
            }}>
              <div style={{ fontSize: 12, color: '#999', marginBottom: 4, fontFamily: "'Inter', sans-serif" }}>
                From: <strong style={{ color: '#333' }}>{fromName || gymName}</strong>
              </div>
              <div style={{ fontSize: 12, color: '#999', marginBottom: 4, fontFamily: "'Inter', sans-serif" }}>
                To: <span style={{ color: '#666' }}>{
                  recipients === 'individual'
                    ? (individualEmails.length
                      ? individualEmails.slice(0, 2).join(', ') + (individualEmails.length > 2 ? ` +${individualEmails.length - 2} more` : '')
                      : 'No recipients yet')
                    : (RECIPIENT_OPTIONS.find(o => o.value === recipients)?.label || 'All Members')
                }</span>
                {cc.length > 0 && <span> &middot; CC: {cc.length}</span>}
              </div>
              <div style={{
                fontSize: previewMode === 'mobile' ? 14 : 15,
                fontWeight: 700, color: '#111', fontFamily: "'Inter', sans-serif",
              }}>
                {preview.subject || 'Subject line preview...'}
              </div>
            </div>

            {/* Email body */}
            <div style={{
              padding: previewMode === 'mobile' ? '16px 14px' : '24px 28px',
              minHeight: previewMode === 'mobile' ? 320 : 260,
              color: '#333', fontFamily: "'Inter', -apple-system, sans-serif",
              fontSize: previewMode === 'mobile' ? 15 : 16,
              lineHeight: 1.7,
            }}>
              {preview.body ? (
                <div dangerouslySetInnerHTML={{ __html: preview.body }} />
              ) : (
                <div style={{ color: '#bbb', fontStyle: 'italic', textAlign: 'center', paddingTop: 60 }}>
                  Your email content will appear here...
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '12px 16px', borderTop: '1px solid #e0e0e0',
              background: '#fafafa', textAlign: 'center',
            }}>
              <div style={{ fontSize: 11, color: '#aaa' }}>
                Sent via I V I R A &middot; <span style={{ textDecoration: 'underline', cursor: 'pointer' }}>Unsubscribe</span>
              </div>
            </div>
          </div>

          {/* Preview info */}
          <div style={{
            marginTop: 12, padding: '8px 12px', borderRadius: 8,
            background: theme.bgTer, fontSize: 11, color: theme.textTer,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span>Viewing: {previewMode === 'mobile' ? '375px (iPhone)' : 'Full width'}</span>
            <span>{recipients !== 'individual' && recipientCounts
              ? `${recipientCounts[recipients] ?? 0} recipients`
              : recipients === 'individual'
                ? `${individualEmails.length} recipient${individualEmails.length !== 1 ? 's' : ''}`
                : ''
            }</span>
          </div>
        </div>
      </div>

      {/* ── Confirm Send Modal ─────────────────────────────── */}
      <Modal open={showConfirm} onClose={() => setShowConfirm(false)} title="Confirm Send">
        <div style={{ padding: '4px 0' }}>
          {/* Warning banner */}
          <div style={{
            padding: '14px 16px', borderRadius: 10, marginBottom: 16,
            background: `${theme.amber}10`, border: `1px solid ${theme.amber}30`,
            display: 'flex', alignItems: 'flex-start', gap: 10,
          }}>
            <AlertTriangle size={18} color={theme.amber} style={{ marginTop: 1, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: theme.text, marginBottom: 4 }}>
                You are about to send this newsletter
              </div>
              <div style={{ fontSize: 13, color: theme.textSec, lineHeight: 1.5 }}>
                This will send to{' '}
                <strong style={{ color: theme.text, fontSize: 15 }}>
                  {getRecipientCount()}
                </strong>{' '}
                {recipients === 'individual'
                  ? `recipient${individualEmails.length !== 1 ? 's' : ''}`
                  : (RECIPIENT_OPTIONS.find(o => o.value === recipients)?.label?.toLowerCase() || 'members')
                }
                {' '}with email addresses. This action cannot be undone.
              </div>
            </div>
          </div>

          {scheduleMode && scheduledAt && (
            <div style={{
              padding: '10px 14px', background: theme.bgTer, borderRadius: 8,
              border: `1px solid ${theme.borderStrong}`, marginBottom: 12,
              fontSize: 13, color: theme.textSec,
            }}>
              Scheduled for: <strong style={{ color: theme.amber }}>{new Date(scheduledAt).toLocaleString()}</strong>
            </div>
          )}

          <div style={{
            padding: '12px 14px', background: theme.bgTer, borderRadius: 8,
            border: `1px solid ${theme.borderStrong}`, marginBottom: 12,
          }}>
            <div style={{ fontSize: 11, color: theme.textTer, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Subject</div>
            <div style={{ color: theme.text, fontSize: 14, fontWeight: 500 }}>{subject}</div>
          </div>

          {recipients === 'individual' && (
            <div style={{
              padding: '12px 14px', background: theme.bgTer, borderRadius: 8,
              border: `1px solid ${theme.borderStrong}`, marginBottom: 12,
            }}>
              <div style={{ fontSize: 11, color: theme.textTer, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Recipients</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {individualEmails.map(e => (
                  <span key={e} style={{
                    padding: '2px 8px', borderRadius: 6, fontSize: 12,
                    background: theme.accentSoft, color: theme.accent,
                  }}>{e}</span>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20 }}>
            <button onClick={() => setShowConfirm(false)} style={{
              background: theme.bgTer, color: theme.textSec, border: `1px solid ${theme.borderStrong}`,
              borderRadius: 10, padding: '10px 22px', fontWeight: 600, cursor: 'pointer',
              fontSize: 14, fontFamily: FONT_D,
            }}>Cancel</button>
            <button onClick={confirmSend} disabled={sendMut.isPending} style={{
              background: theme.grad, color: '#fff', border: 'none', borderRadius: 10,
              padding: '10px 22px', fontWeight: 600, cursor: 'pointer',
              fontSize: 14, fontFamily: FONT_D,
              opacity: sendMut.isPending ? 0.6 : 1,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {sendMut.isPending ? <Loader2 size={14} className="spin" /> : <Send size={14} />}
              {sendMut.isPending ? 'Sending...' : scheduleMode ? 'Schedule Now' : `Yes, Send to ${getRecipientCount()}`}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Sent History ───────────────────────────────────── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Clock size={16} color={theme.textSec} />
          <span style={{ fontSize: 15, fontWeight: 700, color: theme.text, fontFamily: FONT_D, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Sent History
          </span>
        </div>

        {nlLoading ? <SkeletonTable rows={4} cols={4} /> : newsletters.length === 0 ? (
          <div style={{
            background: theme.bgSec, borderRadius: 14, border: `1px solid ${theme.borderStrong}`,
            padding: 48, textAlign: 'center',
          }}>
            <Mail size={36} color={theme.textTer} style={{ marginBottom: 12 }} />
            <div style={{ fontSize: 16, fontWeight: 600, color: theme.textSec, fontFamily: FONT_D }}>No newsletters sent yet</div>
            <div style={{ fontSize: 13, color: theme.textTer, marginTop: 4 }}>Compose your first newsletter above</div>
          </div>
        ) : (
          <div style={{
            background: theme.bgSec, borderRadius: 14, border: `1px solid ${theme.borderStrong}`, overflow: 'hidden',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
                  {['Subject', 'Template', 'Recipients', 'Sent Date'].map(h => (
                    <th key={h} style={{
                      padding: '12px 16px', fontSize: 11, fontWeight: 600, color: theme.textTer,
                      textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'left',
                      fontFamily: FONT, background: theme.bgTer,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {newsletters.map((nl, i) => (
                  <tr key={nl.id} style={{
                    borderBottom: i < newsletters.length - 1 ? `1px solid ${theme.border}` : 'none',
                    transition: 'background 0.15s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = theme.bgHover}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '14px 16px', color: theme.text, fontWeight: 500, fontSize: 14 }}>
                      {nl.subject}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {nl.template && nl.template !== 'custom' ? (
                        <span style={{
                          background: theme.accentSoft, color: theme.accent,
                          fontSize: 11, padding: '3px 10px', borderRadius: 6, fontWeight: 600,
                        }}>{nl.template}</span>
                      ) : (
                        <span style={{ color: theme.textTer, fontSize: 12 }}>custom</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', color: theme.textSec, fontFamily: FONT_M, fontSize: 13 }}>
                      {nl.recipients_count || nl.recipients || 0}
                    </td>
                    <td style={{ padding: '14px 16px', color: theme.textTer, fontSize: 13 }}>
                      {formatDate(nl.sent_at || nl.sentAt || nl.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Spin animation */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  )
}
