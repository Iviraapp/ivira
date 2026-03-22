import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Calendar, Filter, ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import api from '../lib/api'

const METHOD_COLORS = {
  qr: { bg: '#0052FF20', text: '#0052FF' },
  nfc: { bg: '#22C55E20', text: '#22C55E' },
  otp: { bg: '#F9731620', text: '#F97316' },
  manual: { bg: '#8B5CF620', text: '#8B5CF6' },
}

export default function Checkins() {
  const { gymId } = useAuth()
  const [checkins, setCheckins] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [dateFilter, setDateFilter] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [loading, setLoading] = useState(true)
  const limit = 30

  useEffect(() => {
    if (!gymId) return
    setLoading(true)
    api.get(`/gyms/${gymId}/checkins`, {
      params: { page, limit, date: dateFilter },
    })
      .then((res) => {
        setCheckins(res.data?.checkins || [])
        setTotal(res.data?.total || 0)
      })
      .catch(() => setCheckins([]))
      .finally(() => setLoading(false))
  }, [gymId, page, dateFilter])

  useEffect(() => { setPage(1) }, [dateFilter])

  const totalPages = Math.ceil(total / limit) || 1

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 700, margin: 0 }}>Check-in Log</h1>
          <p style={{ color: '#666', fontSize: 14, margin: '4px 0 0' }}>{total} check-ins</p>
        </div>
      </div>

      {/* Date filter */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center' }}>
        <Calendar size={16} color="#555" />
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          style={{
            padding: '8px 12px', background: '#0d0d14', border: '1px solid #1a1a2e',
            borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none',
            colorScheme: 'dark',
          }}
        />
        <button
          onClick={() => setDateFilter(format(new Date(), 'yyyy-MM-dd'))}
          style={{
            padding: '8px 14px', background: '#1a1a2e', border: '1px solid #2a2a3e',
            borderRadius: 8, color: '#999', fontSize: 13, cursor: 'pointer',
          }}
        >
          Today
        </button>
      </div>

      {/* Table */}
      <div style={{
        background: '#0d0d14', border: '1px solid #1a1a2e', borderRadius: 12,
        overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#555' }}>Loading...</div>
        ) : checkins.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#555' }}>
            No check-ins for {format(new Date(dateFilter + 'T00:00:00'), 'dd MMMM yyyy')}
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1a1a2e' }}>
                    {['#', 'Member', 'Method', 'Time', 'GPS'].map((h) => (
                      <th key={h} style={{
                        padding: '10px 16px', textAlign: 'left', color: '#555',
                        fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {checkins.map((ci, i) => {
                    const mc = METHOD_COLORS[ci.method] || METHOD_COLORS.manual
                    return (
                      <tr key={ci.id} style={{ borderBottom: '1px solid #111' }}>
                        <td style={{ padding: '10px 16px', color: '#444', fontSize: 12 }}>
                          {(page - 1) * limit + i + 1}
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <div style={{ color: '#fff', fontSize: 14, fontWeight: 500 }}>
                            {ci.member_name || 'Unknown'}
                          </div>
                          <div style={{ color: '#555', fontSize: 12 }}>{ci.member_phone || ''}</div>
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <span style={{
                            padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                            textTransform: 'uppercase', letterSpacing: 0.5,
                            background: mc.bg, color: mc.text,
                          }}>
                            {ci.method}
                          </span>
                        </td>
                        <td style={{ padding: '10px 16px', color: '#888', fontSize: 13, fontFamily: 'monospace' }}>
                          {ci.checked_in_at ? format(new Date(ci.checked_in_at), 'hh:mm:ss a') : '—'}
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          {ci.gps_valid === true ? (
                            <span style={{ color: '#22C55E', fontSize: 12 }}>
                              ✓ {ci.distance_meters ? `${Math.round(ci.distance_meters)}m` : 'Valid'}
                            </span>
                          ) : ci.gps_valid === false ? (
                            <span style={{ color: '#ef4444', fontSize: 12 }}>✗ Out of range</span>
                          ) : (
                            <span style={{ color: '#444', fontSize: 12 }}>—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div style={{
              padding: '12px 16px', borderTop: '1px solid #1a1a2e',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ color: '#555', fontSize: 12 }}>
                Page {page} of {totalPages} · {total} total
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
