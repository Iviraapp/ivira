import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useToast } from '../../context/ToastContext'
import api from '../../lib/api'
import { Megaphone, Pin, Trash2, Plus, X, Trophy, Calendar, Lightbulb, RefreshCw } from 'lucide-react'
import { formatDate } from '../../lib/utils'

const F  = "'Inter', -apple-system, sans-serif"
const FM = "'JetBrains Mono', monospace"

const POST_TYPES = [
  { value: 'announcement', label: 'Announcement', icon: Megaphone, color: '#10B981' },
  { value: 'challenge',    label: 'Challenge',    icon: Trophy,    color: '#FBBC05' },
  { value: 'event',        label: 'Event',        icon: Calendar,  color: '#4285F4' },
  { value: 'tip',          label: 'Tip',          icon: Lightbulb, color: '#9F67FF' },
]

const TYPE_ICONS = { announcement: '📢', challenge: '🏆', event: '📅', tip: '💡', milestone: '🎯', general: '📌' }

export default function GymFeedComposer() {
  const { gym } = useAuth()
  const { theme, sp } = useTheme()
  const toast = useToast()
  const qc = useQueryClient()
  const gymId = gym?.id

  const [showCompose, setShowCompose] = useState(false)
  const [form, setForm] = useState({ type: 'announcement', title: '', body: '', cta_label: '', cta_url: '', is_pinned: false })

  // Fetch feed
  const { data, isLoading } = useQuery({
    queryKey: ['gym-feed', gymId],
    queryFn: () => api.get(`/gyms/${gymId}/feed?limit=10`).then(r => r.data),
    enabled: !!gymId,
    refetchInterval: 60_000,
  })

  const posts = data?.feed || []

  // Create post
  const createPost = useMutation({
    mutationFn: (body) => api.post(`/gyms/${gymId}/feed`, body),
    onSuccess: () => {
      toast.success('Post published')
      qc.invalidateQueries({ queryKey: ['gym-feed', gymId] })
      setShowCompose(false)
      setForm({ type: 'announcement', title: '', body: '', cta_label: '', cta_url: '', is_pinned: false })
    },
    onError: () => toast.error('Failed to publish'),
  })

  // Delete post
  const deletePost = useMutation({
    mutationFn: (postId) => api.delete(`/gyms/${gymId}/feed/${postId}`),
    onSuccess: () => {
      toast.success('Post removed')
      qc.invalidateQueries({ queryKey: ['gym-feed', gymId] })
    },
    onError: () => toast.error('Failed to remove post'),
  })

  // Pin/unpin
  const pinPost = useMutation({
    mutationFn: ({ postId, is_pinned }) => api.patch(`/gyms/${gymId}/feed/${postId}/pin`, { is_pinned }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gym-feed', gymId] }),
    onError: () => toast.error('Failed to update pin'),
  })

  const input = {
    width: '100%', padding: '10px 14px', background: theme.bgTer,
    border: `1px solid ${theme.border}`, borderRadius: 10,
    color: theme.text, fontSize: 14, fontFamily: F,
    outline: 'none', boxSizing: 'border-box',
  }

  const btn = (variant = 'ghost') => ({
    display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
    borderRadius: 9, cursor: 'pointer', fontSize: 13, fontWeight: 600,
    fontFamily: F, border: 'none', transition: 'all 0.15s',
    ...(variant === 'primary' ? { background: theme.brandAccent, color: '#fff' }
      : variant === 'danger' ? { background: `${theme.red}10`, color: theme.red, border: `1px solid ${theme.red}20` }
      : { background: theme.bgTer, color: theme.textSec, border: `1px solid ${theme.border}` }),
  })

  return (
    <div style={{ background: theme.bgSec, borderRadius: 16, border: `1px solid ${theme.borderStrong}`, padding: sp(24) }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: sp(18) }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Megaphone size={16} style={{ color: theme.textSec }} />
          <h3 style={{ fontSize: 14, fontWeight: 700, color: theme.text, margin: 0, fontFamily: F, textTransform: 'uppercase', letterSpacing: '1px' }}>Gym Feed</h3>
        </div>
        <button style={btn('primary')} onClick={() => setShowCompose(!showCompose)}>
          {showCompose ? <X size={14} /> : <Plus size={14} />}
          {showCompose ? 'Cancel' : 'Post'}
        </button>
      </div>

      {/* Compose form */}
      {showCompose && (
        <div style={{ background: theme.bgTer, borderRadius: 14, padding: sp(18), marginBottom: sp(18), border: `1px solid ${theme.brandAccent}20` }}>
          {/* Type selector */}
          <div style={{ display: 'flex', gap: 7, marginBottom: sp(14), flexWrap: 'wrap' }}>
            {POST_TYPES.map(t => (
              <button key={t.value} onClick={() => setForm(f => ({ ...f, type: t.value }))}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 20, cursor: 'pointer', fontFamily: F, fontSize: 12, fontWeight: 600, border: 'none', background: form.type === t.value ? `${t.color}20` : theme.bgSec, color: form.type === t.value ? t.color : theme.textSec, border: `1px solid ${form.type === t.value ? t.color + '40' : theme.border}` }}>
                <t.icon size={12} />
                {t.label}
              </button>
            ))}
          </div>

          {/* Title */}
          <div style={{ marginBottom: sp(10) }}>
            <input style={input} placeholder="Title (required)" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} maxLength={200} />
          </div>

          {/* Body */}
          <div style={{ marginBottom: sp(10) }}>
            <textarea style={{ ...input, resize: 'vertical', minHeight: 80 }} placeholder="Message (optional)" value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} maxLength={2000} />
          </div>

          {/* Optional CTA */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: sp(14) }}>
            <input style={input} placeholder="CTA button label (e.g. Book Now)" value={form.cta_label} onChange={e => setForm(f => ({ ...f, cta_label: e.target.value }))} maxLength={80} />
            <input style={input} placeholder="CTA URL (optional)" value={form.cta_url} onChange={e => setForm(f => ({ ...f, cta_url: e.target.value }))} maxLength={500} />
          </div>

          {/* Pin toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: sp(16) }}>
            <button onClick={() => setForm(f => ({ ...f, is_pinned: !f.is_pinned }))}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontFamily: F, fontSize: 12, fontWeight: 600, border: 'none', background: form.is_pinned ? `${theme.brandAccent}15` : theme.bgSec, color: form.is_pinned ? theme.brandAccent : theme.textTer, border: `1px solid ${form.is_pinned ? theme.brandAccent + '30' : theme.border}` }}>
              <Pin size={12} />
              {form.is_pinned ? 'Pinned to top' : 'Pin to top'}
            </button>
          </div>

          <button style={{ ...btn('primary'), width: '100%', justifyContent: 'center', padding: '12px 0' }}
            onClick={() => { if (!form.title.trim()) { toast.error('Title is required'); return }; createPost.mutate(form) }}
            disabled={createPost.isPending}>
            {createPost.isPending ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Megaphone size={14} />}
            {createPost.isPending ? 'Publishing...' : 'Publish to Members'}
          </button>
        </div>
      )}

      {/* Posts list */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1,2,3].map(i => <div key={i} style={{ height: 60, background: theme.bgTer, borderRadius: 10 }} />)}
        </div>
      ) : posts.length === 0 ? (
        <div style={{ padding: '28px 0', textAlign: 'center' }}>
          <Megaphone size={26} style={{ color: theme.textTer, marginBottom: 10 }} />
          <p style={{ fontSize: 13, color: theme.textSec, margin: 0, fontFamily: F }}>No posts yet</p>
          <p style={{ fontSize: 11, color: theme.textTer, margin: '4px 0 0', fontFamily: F }}>Post announcements, challenges, and tips for your members</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {posts.map((post, i) => (
            <div key={post.id || i} style={{
              padding: '13px 15px', borderRadius: 12,
              background: theme.bgTer,
              border: `1px solid ${post.is_pinned ? theme.brandAccent + '25' : theme.border}`,
              position: 'relative',
            }}>
              {post.is_pinned && (
                <div style={{ position: 'absolute', top: 8, right: 8 }}>
                  <Pin size={11} style={{ color: theme.brandAccent }} />
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{TYPE_ICONS[post.type] || '📌'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: theme.text, margin: 0, fontFamily: F }}>{post.title}</p>
                  {post.body && <p style={{ fontSize: 12, color: theme.textSec, margin: '3px 0 0', fontFamily: F, lineHeight: 1.5 }}>{post.body}</p>}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
                    <span style={{ fontSize: 10, color: theme.textTer, fontFamily: FM }}>{formatDate(post.created_at)}</span>
                    {post.source === 'auto' && <span style={{ fontSize: 10, color: theme.textTer, fontFamily: F, background: theme.bgSec, padding: '2px 7px', borderRadius: 6 }}>auto</span>}
                  </div>
                </div>
                {/* Actions — only on owner posts */}
                {post.source !== 'auto' && (
                  <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                    <button style={{ ...btn('ghost'), padding: '5px 8px' }}
                      onClick={() => pinPost.mutate({ postId: post.id, is_pinned: !post.is_pinned })}
                      title={post.is_pinned ? 'Unpin' : 'Pin'}>
                      <Pin size={12} style={{ color: post.is_pinned ? theme.brandAccent : theme.textTer }} />
                    </button>
                    <button style={{ ...btn('danger'), padding: '5px 8px' }}
                      onClick={() => { if (window.confirm('Remove this post?')) deletePost.mutate(post.id) }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
