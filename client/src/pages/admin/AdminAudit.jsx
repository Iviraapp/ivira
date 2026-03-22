import { useState, useEffect } from 'react'
import { ScrollText, Filter, ChevronLeft, ChevronRight } from 'lucide-react'
import api from '../../lib/api'

const FONT = "'Inter', -apple-system, sans-serif"
const FONT_M = "'JetBrains Mono', 'Fira Code', monospace"
const N = {
  bg: '#0A0F1E', card: '#141C33', border: '#1E2A4A',
  text: '#E2E8F0', textSec: '#94A3B8', textTer: '#64748B',
  accent: '#1A3A8F', green: '#22C55E', red: '#EF4444', amber: '#F59E0B',
}

const ACTION_COLORS = {
  login_as_owner: '#F59E0B',
  suspend_gym: '#EF4444',
  activate_gym: '#22C55E',
  toggle_feature: '#1A3A8F',
  create_ad_campaign: '#3B82F6',
  end_proxy_session: '#94A3B8',
}

export default function AdminAudit() {
  const [logs, setLogs] = useState([])
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 })
  const [loading, setLoading] = useState(true)
  const [actionFilter, setActionFilter] = useState('')

  const fetchLogs = async (page = 1) => {
    setLoading(true)
    try {
      const token = localStorage.getItem('ivira_admin_token')
      const params = { page, limit: 30 }
      if (actionFilter) params.action = actionFilter
      const { data } = await api.get('/super/audit', { params, headers: { Authorization: `Bearer ${token}` } })
      setLogs(data.logs || [])
      setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchLogs() }, [actionFilter])

  const actions = ['login_as_owner', 'suspend_gym', 'activate_gym', 'toggle_feature', 'create_ad_campaign', 'end_proxy_session']

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <ScrollText size={22} color={N.accent} />
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: N.text, fontFamily: FONT, margin: 0 }}>Audit Log</h1>
          <p style={{ fontSize: 13, color: N.textSec, margin: '2px 0 0', fontFamily: FONT }}>{pagination.total} total actions recorded</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <button
          onClick={() => setActionFilter('')}
          style={{
            padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 500,
            background: !actionFilter ? N.accent : N.card,
            border: `1px solid ${!actionFilter ? N.accent : N.border}`,
            color: !actionFilter ? '#fff' : N.textSec,
            cursor: 'pointer', fontFamily: FONT,
          }}
        >All</button>
        {actions.map(a => (
          <button
            key={a}
            onClick={() => setActionFilter(a)}
            style={{
              padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 500,
              background: actionFilter === a ? (ACTION_COLORS[a] || N.accent) + '20' : N.card,
              border: `1px solid ${actionFilter === a ? ACTION_COLORS[a] || N.accent : N.border}`,
              color: actionFilter === a ? ACTION_COLORS[a] || N.accent : N.textSec,
              cursor: 'pointer', fontFamily: FONT,
            }}
          >{a.replace(/_/g, ' ')}</button>
        ))}
      </div>

      {/* Log Table */}
      <div style={{ background: N.card, borderRadius: 12, border: `1px solid ${N.border}`, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: FONT }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${N.border}` }}>
              {['Timestamp', 'Admin', 'Action', 'Target', 'IP', 'Details'].map(h => (
                <th key={h} style={{
                  padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600,
                  color: N.textTer, textTransform: 'uppercase', letterSpacing: '0.5px',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: N.textSec }}>
                {loading ? 'Loading...' : 'No audit logs found'}
              </td></tr>
            ) : logs.map((log) => (
              <tr key={log.id} style={{ borderBottom: `1px solid ${N.border}08` }}>
                <td style={{ padding: '10px 16px', color: N.textSec, fontSize: 12, fontFamily: FONT_M }}>
                  {new Date(log.created_at).toLocaleString('en-IN')}
                </td>
                <td style={{ padding: '10px 16px', color: N.text, fontSize: 13, fontWeight: 500 }}>
                  {log.admin_name || log.admin_email || '\u2014'}
                </td>
                <td style={{ padding: '10px 16px' }}>
                  <span style={{
                    display: 'inline-block', padding: '3px 10px', borderRadius: 4,
                    fontSize: 11, fontWeight: 600,
                    background: (ACTION_COLORS[log.action] || N.textTer) + '18',
                    color: ACTION_COLORS[log.action] || N.textSec,
                  }}>
                    {log.action?.replace(/_/g, ' ')}
                  </span>
                </td>
                <td style={{ padding: '10px 16px', color: N.textSec, fontSize: 13 }}>
                  {log.target_gym_name || log.target_type || '\u2014'}
                </td>
                <td style={{ padding: '10px 16px', color: N.textTer, fontSize: 12, fontFamily: FONT_M }}>
                  {log.ip_address || '\u2014'}
                </td>
                <td style={{ padding: '10px 16px', color: N.textTer, fontSize: 12 }}>
                  {log.metadata && Object.keys(JSON.parse(typeof log.metadata === 'string' ? log.metadata : JSON.stringify(log.metadata))).length > 0
                    ? JSON.stringify(typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata).slice(0, 60)
                    : '\u2014'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
          <button
            onClick={() => fetchLogs(pagination.page - 1)}
            disabled={pagination.page <= 1}
            style={{
              padding: '6px 12px', borderRadius: 6, background: N.card,
              border: `1px solid ${N.border}`, color: N.textSec, cursor: 'pointer',
              opacity: pagination.page <= 1 ? 0.4 : 1, fontFamily: FONT, fontSize: 13,
            }}
          ><ChevronLeft size={14} /></button>
          <span style={{ padding: '6px 16px', color: N.textSec, fontSize: 13, fontFamily: FONT }}>
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => fetchLogs(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages}
            style={{
              padding: '6px 12px', borderRadius: 6, background: N.card,
              border: `1px solid ${N.border}`, color: N.textSec, cursor: 'pointer',
              opacity: pagination.page >= pagination.totalPages ? 0.4 : 1, fontFamily: FONT, fontSize: 13,
            }}
          ><ChevronRight size={14} /></button>
        </div>
      )}
    </div>
  )
}
