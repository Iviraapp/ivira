import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../../context/ThemeContext'
import { formatDate } from '../../lib/utils'
import api from '../../lib/api'
import { MessageSquare, Check, LogIn, Send } from 'lucide-react'

const FONT = "'Inter', -apple-system, sans-serif"
const FONT_M = "'JetBrains Mono', monospace"

export default function AdminSupport() {
  const { theme } = useTheme()
  const navigate = useNavigate()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [replyingTo, setReplyingTo] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const adminToken = localStorage.getItem('ivira_admin_token')
  const authHeaders = { headers: { Authorization: `Bearer ${adminToken}` } }

  useEffect(() => { fetchTickets() }, [filter])

  const fetchTickets = async () => {
    setLoading(true)
    try {
      const params = filter !== 'all' ? `?status=${filter}` : ''
      const { data } = await api.get(`/super/support-tickets${params}`, authHeaders)
      setTickets(data.tickets || data || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const handleReply = async (ticketId) => {
    if (!replyText.trim()) return
    setActionLoading(true)
    try {
      await api.post(`/super/support-tickets/${ticketId}/reply`, { message: replyText }, authHeaders)
      setReplyingTo(null)
      setReplyText('')
      fetchTickets()
    } catch (err) { console.error(err) }
    finally { setActionLoading(false) }
  }

  const handleResolve = async (ticketId) => {
    setActionLoading(true)
    try {
      await api.patch(`/super/support-tickets/${ticketId}`, { status: 'resolved' }, authHeaders)
      fetchTickets()
    } catch (err) { console.error(err) }
    finally { setActionLoading(false) }
  }

  const handleImpersonate = (ticket) => {
    localStorage.setItem('ivira_impersonate_gym_id', ticket.gym_id)
    localStorage.setItem('ivira_impersonate_gym', JSON.stringify({ id: ticket.gym_id, gym_name: ticket.gym_name }))
    navigate('/dashboard')
  }

  const priorityStyle = (p) => {
    const pr = (p || '').toLowerCase()
    if (pr === 'urgent') return { bg: `${theme.red}15`, color: theme.red }
    if (pr === 'medium') return { bg: `${theme.amber}15`, color: theme.amber }
    return { bg: `${theme.textTer}15`, color: theme.textTer }
  }

  const statusStyle = (s) => {
    const st = (s || '').toLowerCase()
    if (st === 'resolved') return { bg: `${theme.green}15`, color: theme.green }
    if (st === 'in-progress' || st === 'in_progress') return { bg: `${theme.cyan}15`, color: theme.cyan }
    return { bg: `${theme.amber}15`, color: theme.amber }
  }

  const FILTERS = ['all', 'open', 'in-progress', 'resolved']

  const darkCard = { background: theme.bgSec, borderRadius: 12, border: `1px solid ${theme.border}` }

  const filterLabel = (f) => f === 'all' ? 'All' : f === 'in-progress' ? 'In-Progress' : f.charAt(0).toUpperCase() + f.slice(1)

  return (
    <div style={{
      padding: '32px 40px', maxWidth: 1200, margin: '0 auto', fontFamily: FONT,
    }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          fontSize: 24, fontWeight: 600, color: theme.text, margin: 0, fontFamily: FONT,
        }}>
          Support Inbox
        </h1>
        <p style={{ fontSize: 14, color: theme.textSec, margin: '4px 0 0', fontWeight: 400 }}>
          Manage gym owner support tickets
        </p>
      </div>

      {/* Table Card */}
      <div style={darkCard}>
        {/* Filter bar */}
        <div style={{
          padding: '20px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 12,
          borderBottom: `1px solid ${theme.border}`,
        }}>
          <h2 style={{
            fontSize: 16, fontWeight: 600, color: theme.text, margin: 0, fontFamily: FONT,
          }}>
            Tickets
          </h2>
          <div style={{ display: 'flex', gap: 4 }}>
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '5px 12px', fontSize: 12, fontWeight: filter === f ? 600 : 400,
                  fontFamily: FONT,
                  color: filter === f ? (theme.bg === '#000000' ? '#000' : '#fff') : theme.textSec,
                  background: filter === f ? theme.text : 'transparent',
                  border: `1px solid ${filter === f ? theme.text : theme.border}`,
                  borderRadius: 6, cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {filterLabel(f)}
              </button>
            ))}
          </div>
        </div>

        {/* Loading skeleton */}
        {loading ? (
          <div style={{ padding: 24 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{
                height: 48, background: theme.bgTer, borderRadius: 8,
                marginBottom: 8, animation: 'pulse 1.5s ease-in-out infinite',
              }} />
            ))}
            <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
          </div>
        ) : tickets.length === 0 ? (
          /* Empty state */
          <div style={{
            padding: '60px 40px', display: 'flex', flexDirection: 'column',
            alignItems: 'center', textAlign: 'center',
          }}>
            <MessageSquare size={32} color={theme.textTer} style={{ marginBottom: 16 }} />
            <h3 style={{
              color: theme.text, fontSize: 16, fontWeight: 600, margin: '0 0 6px', fontFamily: FONT,
            }}>
              {filter !== 'all' ? `No ${filter} tickets` : 'No support tickets'}
            </h3>
            <p style={{ color: theme.textSec, fontSize: 14, margin: 0, fontFamily: FONT }}>
              {filter !== 'all' ? 'Try a different filter.' : 'Support tickets from gym owners will appear here.'}
            </p>
          </div>
        ) : (
          /* Table */
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%', borderCollapse: 'collapse', fontSize: 14, fontFamily: FONT,
            }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
                  {['Gym Name', 'Priority', 'Message', 'Status', 'Time Sent', 'Actions'].map((col) => (
                    <th key={col} style={{
                      padding: '12px 24px', fontWeight: 500,
                      fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em',
                      color: theme.textTer, textAlign: 'left',
                      background: 'transparent', border: 'none', fontFamily: FONT,
                    }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => {
                  const ps = priorityStyle(ticket.priority)
                  const ss = statusStyle(ticket.status)
                  const isReplying = replyingTo === ticket.id

                  return (
                    <React.Fragment key={ticket.id || ticket._id}>
                      <tr
                        style={{
                          transition: 'background 0.15s',
                          borderBottom: isReplying ? 'none' : `1px solid ${theme.border}`,
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = theme.bgHover}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        {/* Gym Name */}
                        <td style={{
                          padding: '14px 24px', border: 'none',
                          fontWeight: 600, color: theme.text, fontSize: 14, fontFamily: FONT,
                          whiteSpace: 'nowrap',
                        }}>
                          {ticket.gym_name || 'Unknown Gym'}
                        </td>

                        {/* Priority */}
                        <td style={{ padding: '14px 24px', border: 'none' }}>
                          <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '3px 10px', borderRadius: 6,
                            background: ps.bg, fontSize: 12, fontWeight: 500,
                            color: ps.color, fontFamily: FONT,
                          }}>
                            <span style={{
                              width: 6, height: 6, borderRadius: '50%',
                              background: ps.color, flexShrink: 0,
                            }} />
                            {(ticket.priority || 'low').charAt(0).toUpperCase() + (ticket.priority || 'low').slice(1)}
                          </div>
                        </td>

                        {/* Message Preview */}
                        <td style={{
                          padding: '14px 24px', border: 'none',
                          color: theme.textSec, fontSize: 13, fontFamily: FONT,
                          maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {ticket.message || ticket.subject || '—'}
                        </td>

                        {/* Status */}
                        <td style={{ padding: '14px 24px', border: 'none' }}>
                          <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '3px 10px', borderRadius: 6,
                            background: ss.bg, fontSize: 12, fontWeight: 500,
                            color: ss.color, fontFamily: FONT,
                          }}>
                            <span style={{
                              width: 6, height: 6, borderRadius: '50%',
                              background: ss.color, flexShrink: 0,
                            }} />
                            {(ticket.status || 'open').charAt(0).toUpperCase() + (ticket.status || 'open').slice(1)}
                          </div>
                        </td>

                        {/* Time Sent */}
                        <td style={{
                          padding: '14px 24px', border: 'none',
                          color: theme.textSec, fontSize: 13, fontFamily: FONT_M, whiteSpace: 'nowrap',
                        }}>
                          {formatDate(ticket.created_at)}
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '14px 24px', border: 'none' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {/* Reply */}
                            <button
                              onClick={() => {
                                if (isReplying) {
                                  setReplyingTo(null)
                                  setReplyText('')
                                } else {
                                  setReplyingTo(ticket.id)
                                  setReplyText('')
                                }
                              }}
                              title="Reply"
                              style={{
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                width: 30, height: 30, borderRadius: 6,
                                border: `1px solid ${theme.border}`, background: isReplying ? theme.text : 'transparent',
                                color: isReplying ? (theme.bg === '#000000' ? '#000' : '#fff') : theme.textSec,
                                cursor: 'pointer', transition: 'all 0.15s',
                              }}
                              onMouseEnter={(e) => { if (!isReplying) e.currentTarget.style.background = theme.bgTer }}
                              onMouseLeave={(e) => { if (!isReplying) e.currentTarget.style.background = 'transparent' }}
                            >
                              <MessageSquare size={14} />
                            </button>

                            {/* Resolve */}
                            {(ticket.status || '').toLowerCase() !== 'resolved' && (
                              <button
                                onClick={() => handleResolve(ticket.id)}
                                disabled={actionLoading}
                                title="Mark as Resolved"
                                style={{
                                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                  width: 30, height: 30, borderRadius: 6,
                                  border: `1px solid ${theme.border}`, background: 'transparent',
                                  color: theme.green, cursor: actionLoading ? 'not-allowed' : 'pointer',
                                  transition: 'all 0.15s', opacity: actionLoading ? 0.5 : 1,
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = `${theme.green}12`}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                              >
                                <Check size={14} />
                              </button>
                            )}

                            {/* Impersonate */}
                            <button
                              onClick={() => handleImpersonate(ticket)}
                              title="Impersonate Tenant"
                              style={{
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                width: 30, height: 30, borderRadius: 6,
                                border: `1px solid ${theme.border}`, background: 'transparent',
                                color: theme.textSec, cursor: 'pointer', transition: 'all 0.15s',
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = theme.bgTer}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                              <LogIn size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Inline Reply Form */}
                      {isReplying && (
                        <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
                          <td colSpan={6} style={{ padding: '0 24px 16px', border: 'none' }}>
                            <div style={{
                              display: 'flex', gap: 10, alignItems: 'flex-end',
                              padding: 16, background: theme.bg, borderRadius: 10,
                              border: `1px solid ${theme.border}`,
                            }}>
                              <textarea
                                autoFocus
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="Type your reply..."
                                rows={3}
                                style={{
                                  flex: 1, padding: '10px 14px',
                                  background: theme.bgSec, border: `1px solid ${theme.border}`,
                                  borderRadius: 8, fontSize: 14, color: theme.text,
                                  fontFamily: FONT, outline: 'none', resize: 'vertical',
                                  transition: 'border-color 0.15s', minHeight: 60,
                                }}
                                onFocus={(e) => e.target.style.borderColor = theme.textTer}
                                onBlur={(e) => e.target.style.borderColor = theme.border}
                              />
                              <button
                                onClick={() => handleReply(ticket.id)}
                                disabled={actionLoading || !replyText.trim()}
                                style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 6,
                                  padding: '10px 18px', fontSize: 13, fontWeight: 600,
                                  fontFamily: FONT,
                                  color: theme.bg === '#000000' ? '#000' : '#fff',
                                  background: theme.text,
                                  border: 'none', borderRadius: 8,
                                  cursor: (actionLoading || !replyText.trim()) ? 'not-allowed' : 'pointer',
                                  opacity: (actionLoading || !replyText.trim()) ? 0.5 : 1,
                                  transition: 'all 0.15s', flexShrink: 0,
                                }}
                              >
                                <Send size={14} />
                                Send
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
