import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Search, UserPlus, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { format } from 'date-fns'
import api from '../lib/api'

export default function Members() {
  const { gymId } = useAuth()
  const [members, setMembers] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedMember, setSelectedMember] = useState(null)
  const [memberDetail, setMemberDetail] = useState(null)
  const [showDetail, setShowDetail] = useState(false)
  const limit = 20

  useEffect(() => {
    if (!gymId) return
    setLoading(true)
    const params = { page, limit }
    if (search) params.search = search

    api.get(`/gyms/${gymId}/members`, { params })
      .then((res) => {
        setMembers(res.data?.members || res.data?.data || [])
        setTotal(res.data?.total || res.data?.pagination?.total || 0)
      })
      .catch(() => setMembers([]))
      .finally(() => setLoading(false))
  }, [gymId, page, search])

  useEffect(() => { setPage(1) }, [search])

  const totalPages = Math.ceil(total / limit) || 1

  const handleMemberClick = async (member) => {
    setSelectedMember(member)
    setShowDetail(true)
    try {
      const [profileRes, checkinsRes] = await Promise.all([
        api.get(`/gyms/${gymId}/members/${member.id}`),
        api.get(`/gyms/${gymId}/checkins?memberId=${member.id}&limit=10`),
      ])
      setMemberDetail({
        ...profileRes.data,
        recentCheckins: checkinsRes.data?.checkins || [],
      })
    } catch {
      setMemberDetail(member)
    }
  }

  const exportCSV = () => {
    const headers = ['Name', 'Phone', 'Status', 'Plan', 'Expiry', 'Check-ins']
    const rows = members.map(m => [
      m.name, m.phone, m.status, m.membership_plan || m.plan_name || '',
      m.membership_end_date || '', m.checkin_count || ''
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ivira-members-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 700, margin: 0 }}>Members</h1>
          <p style={{ color: '#666', fontSize: 14, margin: '4px 0 0' }}>{total} total members</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={exportCSV} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
            background: '#1a1a2e', color: '#fff', border: '1px solid #2a2a3e', borderRadius: 8,
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            <Download size={16} /> Export CSV
          </button>
          <button style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
            background: '#10B981', color: '#fff', border: 'none', borderRadius: 8,
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            <UserPlus size={16} /> Add Member
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#555' }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or phone..."
          style={{
            width: '100%', maxWidth: 400, padding: '10px 12px 10px 36px',
            background: '#0d0d14', border: '1px solid #1a1a2e', borderRadius: 8,
            color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Table */}
      <div style={{
        background: '#0d0d14', border: '1px solid #1a1a2e', borderRadius: 12,
        overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#555' }}>Loading...</div>
        ) : members.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#555' }}>
            {search ? `No members matching "${search}"` : 'No members yet'}
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1a1a2e' }}>
                    {['Name', 'Phone', 'Status', 'Plan', 'Expires', 'Check-ins'].map((h) => (
                      <th key={h} style={{
                        padding: '10px 16px', textAlign: 'left', color: '#555',
                        fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.id} onClick={() => handleMemberClick(m)} style={{ borderBottom: '1px solid #111', cursor: 'pointer' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: 8, background: '#1a1a2e',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#666', fontSize: 12, fontWeight: 700,
                          }}>
                            {(m.name || '?')[0].toUpperCase()}
                          </div>
                          <div style={{ color: '#fff', fontSize: 14, fontWeight: 500 }}>
                            {m.name}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#888', fontSize: 13, fontFamily: 'monospace' }}>
                        {m.phone || '—'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                          background: m.status === 'active' ? '#22C55E20' : '#ef444420',
                          color: m.status === 'active' ? '#22C55E' : '#ef4444',
                          textTransform: 'capitalize',
                        }}>
                          {m.status || 'unknown'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#888', fontSize: 13 }}>
                        {m.plan_name || m.membership_plan || '—'}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#888', fontSize: 13 }}>
                        {m.membership_end || m.expires_at
                          ? format(new Date(m.membership_end || m.expires_at), 'dd MMM yy')
                          : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#888', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
                        {m.total_checkins ?? m.checkin_count ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div style={{
              padding: '12px 16px', borderTop: '1px solid #1a1a2e',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ color: '#555', fontSize: 12 }}>
                Page {page} of {totalPages}
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  style={pgBtnStyle(page === 1)}
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                  style={pgBtnStyle(page >= totalPages)}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Member Detail Slide-over */}
      {showDetail && selectedMember && (
        <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 420, maxWidth: '90vw', background: '#111827', borderLeft: '1px solid #1F2937', zIndex: 1000, overflowY: 'auto', padding: 24, boxShadow: '-4px 0 24px rgba(0,0,0,0.5)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h2 style={{ color: '#F9FAFB', fontSize: 20, fontWeight: 700 }}>{selectedMember.name}</h2>
            <button onClick={() => { setShowDetail(false); setSelectedMember(null); setMemberDetail(null) }} style={{ background: '#1F2937', border: 'none', color: '#9CA3AF', padding: '8px 12px', borderRadius: 8, cursor: 'pointer' }}>✕</button>
          </div>

          {/* Status badge */}
          <div style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 12, background: selectedMember.status === 'active' ? '#06521733' : '#7F1D1D33', color: selectedMember.status === 'active' ? '#22C55E' : '#EF4444', fontSize: 12, fontWeight: 600, marginBottom: 16 }}>
            {selectedMember.status?.toUpperCase()}
          </div>

          {/* Contact info */}
          <div style={{ background: '#0D1117', borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: '#6B7280', fontSize: 13 }}>Phone</span>
              <span style={{ color: '#F9FAFB', fontSize: 13 }}>{selectedMember.phone || '—'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: '#6B7280', fontSize: 13 }}>Email</span>
              <span style={{ color: '#F9FAFB', fontSize: 13 }}>{selectedMember.email || '—'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: '#6B7280', fontSize: 13 }}>Plan</span>
              <span style={{ color: '#F9FAFB', fontSize: 13 }}>{selectedMember.membership_plan || selectedMember.plan_name || '—'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6B7280', fontSize: 13 }}>Expiry</span>
              <span style={{ color: '#F9FAFB', fontSize: 13 }}>{selectedMember.membership_end_date ? new Date(selectedMember.membership_end_date).toLocaleDateString() : '—'}</span>
            </div>
          </div>

          {/* Quick actions */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button style={{ flex: 1, padding: '10px 16px', borderRadius: 8, background: '#10B981', color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Renew Plan</button>
            <button style={{ flex: 1, padding: '10px 16px', borderRadius: 8, background: '#1F2937', color: '#F9FAFB', border: '1px solid #374151', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Send Message</button>
          </div>

          {/* Recent check-ins */}
          <h3 style={{ color: '#9CA3AF', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>RECENT CHECK-INS</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {(memberDetail?.recentCheckins || []).map((c, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#0D1117', borderRadius: 8 }}>
                <span style={{ color: '#F9FAFB', fontSize: 13 }}>{c.method?.toUpperCase()}</span>
                <span style={{ color: '#6B7280', fontSize: 12 }}>{new Date(c.checked_in_at).toLocaleString()}</span>
              </div>
            ))}
            {(!memberDetail?.recentCheckins?.length) && (
              <span style={{ color: '#6B7280', fontSize: 13 }}>No recent check-ins</span>
            )}
          </div>
        </div>
      )}

      {/* Overlay */}
      {showDetail && (
        <div onClick={() => { setShowDetail(false); setSelectedMember(null) }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999 }} />
      )}
    </div>
  )
}

function pgBtnStyle(disabled) {
  return {
    padding: 6, background: '#1a1a2e', border: '1px solid #2a2a3e',
    borderRadius: 6, color: disabled ? '#333' : '#fff', cursor: disabled ? 'default' : 'pointer',
    display: 'flex', alignItems: 'center',
  }
}
