import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useToast } from '../../context/ToastContext'
import api from '../../lib/api'
import { Wifi, Plus, Trash2, User, Tag, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'

const FONT = "'Inter', -apple-system, sans-serif"
const FONT_M = "'JetBrains Mono', monospace"

const TAG_TYPES = [
  { value: 'ndef',     label: 'NDEF (most common)' },
  { value: 'mifare',   label: 'MIFARE Classic' },
  { value: 'iso14443', label: 'ISO 14443-A' },
]

export default function NFCTagManager() {
  const { gym } = useAuth()
  const { theme, sp } = useTheme()
  const toast = useToast()
  const qc = useQueryClient()
  const gymId = gym?.id

  const [showAdd, setShowAdd]     = useState(false)
  const [memberId, setMemberId]   = useState('')
  const [tagUid, setTagUid]       = useState('')
  const [tagType, setTagType]     = useState('ndef')
  const [memberSearch, setMemberSearch] = useState('')

  // Fetch NFC tags
  const { data: tagsData, isLoading } = useQuery({
    queryKey: ['nfc-tags', gymId],
    queryFn: () => api.get(`/gyms/${gymId}/nfc-tags`).then(r => r.data),
    enabled: !!gymId,
  })

  // Search members for linking
  const { data: membersData } = useQuery({
    queryKey: ['members-search', gymId, memberSearch],
    queryFn: () => api.get(`/gyms/${gymId}/members`, { params: { search: memberSearch, limit: 10 } }).then(r => r.data),
    enabled: !!gymId && memberSearch.length >= 2,
  })

  // Link tag mutation
  const linkTag = useMutation({
    mutationFn: ({ memberId, tagUid, tagType }) =>
      api.post(`/gyms/${gymId}/nfc-tags/link`, { memberId, tagUid, tagType }),
    onSuccess: () => {
      toast.success('NFC tag linked successfully')
      qc.invalidateQueries({ queryKey: ['nfc-tags', gymId] })
      setShowAdd(false)
      setMemberId(''); setTagUid(''); setTagType('ndef'); setMemberSearch('')
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Failed to link tag'),
  })

  // Deactivate tag mutation
  const deactivateTag = useMutation({
    mutationFn: (tagId) => api.delete(`/gyms/${gymId}/nfc-tags/${tagId}`),
    onSuccess: () => {
      toast.success('NFC tag removed')
      qc.invalidateQueries({ queryKey: ['nfc-tags', gymId] })
    },
    onError: () => toast.error('Failed to remove tag'),
  })

  const tags = tagsData?.tags || []
  const members = membersData?.members || membersData || []

  const card = {
    background: theme.bgSec,
    border: `1px solid ${theme.borderStrong}`,
    borderRadius: 14,
    padding: sp(20),
  }

  const input = {
    width: '100%', padding: '10px 14px',
    background: theme.bgTer, border: `1px solid ${theme.border}`,
    borderRadius: 10, color: theme.text, fontSize: 14, fontFamily: FONT,
    outline: 'none', boxSizing: 'border-box',
  }

  const btn = (variant = 'ghost') => ({
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '9px 16px', borderRadius: 10, cursor: 'pointer',
    fontSize: 13, fontWeight: 600, fontFamily: FONT,
    border: 'none', transition: 'all 0.15s ease',
    ...(variant === 'primary' ? {
      background: theme.brandAccent, color: '#fff',
    } : variant === 'danger' ? {
      background: 'rgba(234,67,53,0.08)', color: theme.red, border: `1px solid rgba(234,67,53,0.2)`,
    } : {
      background: theme.bgTer, color: theme.textSec, border: `1px solid ${theme.border}`,
    }),
  })

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: sp(16) }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `${theme.brandAccent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Wifi size={18} style={{ color: theme.brandAccent }} />
          </div>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: theme.text, margin: 0, fontFamily: FONT }}>NFC Tags</h3>
            <p style={{ fontSize: 12, color: theme.textTer, margin: 0, fontFamily: FONT }}>Tap-and-go check-in for members</p>
          </div>
        </div>
        <button style={btn('primary')} onClick={() => setShowAdd(!showAdd)}>
          <Plus size={14} />
          Link Tag
        </button>
      </div>

      {/* How it works */}
      <div style={{ background: `${theme.brandAccent}08`, border: `1px solid ${theme.brandAccent}20`, borderRadius: 10, padding: '12px 16px', marginBottom: sp(16) }}>
        <p style={{ fontSize: 12, color: theme.textSec, margin: 0, fontFamily: FONT, lineHeight: 1.6 }}>
          <strong style={{ color: theme.text }}>How NFC check-in works:</strong> Each member gets their own NFC tag (keyfob or sticker). 
          When they tap it on a reader at your gym entrance, IVIRA instantly checks them in — no phone needed. 
          Register each tag UID below by linking it to a member.
        </p>
      </div>

      {/* Add tag form */}
      {showAdd && (
        <div style={{ ...card, marginBottom: sp(16), border: `1px solid ${theme.brandAccent}30` }}>
          <h4 style={{ fontSize: 14, fontWeight: 600, color: theme.text, margin: `0 0 ${sp(14)}px`, fontFamily: FONT }}>
            Link New NFC Tag
          </h4>

          {/* Member search */}
          <div style={{ marginBottom: sp(12) }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: theme.textSec, marginBottom: 6, fontFamily: FONT }}>
              Member
            </label>
            <input
              style={input}
              placeholder="Search member name or phone..."
              value={memberSearch}
              onChange={e => setMemberSearch(e.target.value)}
            />
            {members.length > 0 && memberSearch.length >= 2 && (
              <div style={{
                background: theme.bgSec, border: `1px solid ${theme.border}`,
                borderRadius: 10, marginTop: 4, overflow: 'hidden', maxHeight: 200, overflowY: 'auto',
              }}>
                {members.map(m => (
                  <div
                    key={m.id}
                    onClick={() => { setMemberId(m.id); setMemberSearch(m.name) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 14px', cursor: 'pointer',
                      background: memberId === m.id ? `${theme.brandAccent}10` : 'transparent',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = theme.bgTer}
                    onMouseLeave={e => e.currentTarget.style.background = memberId === m.id ? `${theme.brandAccent}10` : 'transparent'}
                  >
                    <User size={14} style={{ color: theme.textTer, flexShrink: 0 }} />
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 500, color: theme.text, margin: 0, fontFamily: FONT }}>{m.name}</p>
                      <p style={{ fontSize: 11, color: theme.textTer, margin: 0, fontFamily: FONT }}>{m.phone}</p>
                    </div>
                    {memberId === m.id && <CheckCircle size={14} style={{ color: theme.brandAccent, marginLeft: 'auto' }} />}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tag UID */}
          <div style={{ marginBottom: sp(12) }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: theme.textSec, marginBottom: 6, fontFamily: FONT }}>
              Tag UID
              <span style={{ fontSize: 11, color: theme.textTer, fontWeight: 400, marginLeft: 6 }}>
                (scan the tag or read it from the back of the keyfob)
              </span>
            </label>
            <input
              style={{ ...input, fontFamily: FONT_M, letterSpacing: '0.05em' }}
              placeholder="e.g. 04:A1:B2:C3:D4:E5:F6"
              value={tagUid}
              onChange={e => setTagUid(e.target.value)}
            />
          </div>

          {/* Tag type */}
          <div style={{ marginBottom: sp(16) }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: theme.textSec, marginBottom: 6, fontFamily: FONT }}>
              Tag Type
            </label>
            <select
              style={{ ...input, cursor: 'pointer' }}
              value={tagType}
              onChange={e => setTagType(e.target.value)}
            >
              {TAG_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              style={btn('primary')}
              onClick={() => {
                if (!memberId) { toast.error('Select a member first'); return }
                if (!tagUid.trim()) { toast.error('Enter the tag UID'); return }
                linkTag.mutate({ memberId, tagUid: tagUid.trim(), tagType })
              }}
              disabled={linkTag.isPending}
            >
              {linkTag.isPending ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={14} />}
              {linkTag.isPending ? 'Linking...' : 'Link Tag'}
            </button>
            <button style={btn('ghost')} onClick={() => { setShowAdd(false); setMemberId(''); setTagUid(''); setMemberSearch('') }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Tags list */}
      <div style={card}>
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ height: 56, background: theme.bgTer, borderRadius: 10, opacity: 0.6 + i * 0.1 }} />
            ))}
          </div>
        ) : tags.length === 0 ? (
          <div style={{ padding: '32px 0', textAlign: 'center' }}>
            <Wifi size={32} style={{ color: theme.textTer, marginBottom: 12 }} />
            <p style={{ fontSize: 14, color: theme.textSec, margin: 0, fontFamily: FONT }}>No NFC tags registered yet</p>
            <p style={{ fontSize: 12, color: theme.textTer, margin: '4px 0 0', fontFamily: FONT }}>
              Link a tag above to enable tap-and-go check-in for your members
            </p>
          </div>
        ) : (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px 120px 80px', gap: 8, padding: '0 8px 10px', borderBottom: `1px solid ${theme.border}` }}>
              {['Member', 'Tag UID', 'Type', ''].map(h => (
                <span key={h} style={{ fontSize: 10, fontWeight: 600, color: theme.textTer, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: FONT }}>{h}</span>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {tags.map((tag, i) => (
                <div key={tag.id} style={{
                  display: 'grid', gridTemplateColumns: '1fr 180px 120px 80px',
                  gap: 8, padding: `${sp(12)}px 8px`, alignItems: 'center',
                  borderBottom: i < tags.length - 1 ? `1px solid ${theme.border}` : 'none',
                }}>
                  {/* Member */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: `${theme.brandAccent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: theme.brandAccent }}>{(tag.member_name || '?').charAt(0).toUpperCase()}</span>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: theme.text, margin: 0, fontFamily: FONT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tag.member_name || 'Unknown'}</p>
                      <p style={{ fontSize: 11, color: theme.textTer, margin: 0, fontFamily: FONT }}>{tag.member_phone}</p>
                    </div>
                  </div>

                  {/* UID */}
                  <span style={{ fontSize: 12, color: theme.textSec, fontFamily: FONT_M, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {tag.tag_uid}
                  </span>

                  {/* Type */}
                  <span style={{ fontSize: 11, fontWeight: 500, color: theme.textTer, fontFamily: FONT, background: theme.bgTer, padding: '3px 8px', borderRadius: 6, display: 'inline-block' }}>
                    {tag.tag_type?.toUpperCase() || 'NDEF'}
                  </span>

                  {/* Delete */}
                  <button
                    style={{ ...btn('danger'), padding: '6px 10px', justifySelf: 'end' }}
                    onClick={() => {
                      if (window.confirm(`Remove NFC tag for ${tag.member_name}?`)) {
                        deactivateTag.mutate(tag.id)
                      }
                    }}
                    disabled={deactivateTag.isPending}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
