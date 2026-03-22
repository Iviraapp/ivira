import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Search, UserPlus, ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import api from '../lib/api'

export default function Members() {
  const { gymId } = useAuth()
  const [members, setMembers] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 700, margin: 0 }}>Members</h1>
          <p style={{ color: '#666', fontSize: 14, margin: '4px 0 0' }}>{total} total members</p>
        </div>
        <button style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
          background: '#0052FF', color: '#fff', border: 'none', borderRadius: 8,
          fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}>
          <UserPlus size={16} /> Add Member
        </button>
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
                    <tr key={m.id} style={{ borderBottom: '1px solid #111' }}>
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
