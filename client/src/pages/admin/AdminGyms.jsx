import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Input from '../../components/ui/Input'
import { Select } from '../../components/ui/Input'
import { SlideOver } from '../../components/ui/Modal'
import { SkeletonTable } from '../../components/ui'
import { formatPaise, formatDate, debounce, statusColor } from '../../lib/utils'
import api from '../../lib/api'
import { Search, ChevronLeft, ChevronRight, LogIn, Ban, Building2, Users, IndianRupee } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

export default function AdminGyms() {
  const [gyms, setGyms] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [selectedGym, setSelectedGym] = useState(null)
  const [gymDetail, setGymDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [platformStats, setPlatformStats] = useState(null)
  const limit = 15
  const { theme, isDark } = useTheme()
  const navigate = useNavigate()

  const font = "'Inter', -apple-system, sans-serif"
  const fontMono = "'JetBrains Mono', monospace"

  const adminToken = localStorage.getItem('ivira_admin_token')
  const authHeaders = { headers: { Authorization: `Bearer ${adminToken}` } }

  const fetchGyms = useCallback(async (searchVal, statusVal, pageVal) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: pageVal, limit })
      if (searchVal) params.set('search', searchVal)
      if (statusVal && statusVal !== 'all') params.set('status', statusVal)
      const { data } = await api.get(`/super/gyms?${params}`, authHeaders)
      setGyms(data.gyms || data || [])
      setTotal(data.total || 0)
    } catch (err) {
      console.error('Failed to fetch gyms:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchPlatformStats = useCallback(async () => {
    try {
      const { data } = await api.get('/super/stats', authHeaders)
      setPlatformStats(data)
    } catch (err) {
      console.error('Failed to fetch platform stats:', err)
    }
  }, [])

  useEffect(() => {
    fetchPlatformStats()
  }, [])

  useEffect(() => {
    fetchGyms(search, statusFilter, page)
  }, [statusFilter, page])

  const handleImpersonate = (gym) => {
    localStorage.setItem('ivira_impersonate_gym_id', gym.id)
    localStorage.setItem('ivira_impersonate_gym', JSON.stringify(gym))
    navigate('/dashboard')
  }

  const debouncedSearch = useCallback(
    debounce((val) => {
      setPage(1)
      fetchGyms(val, statusFilter, 1)
    }, 400),
    [statusFilter]
  )

  const handleSearchChange = (e) => {
    setSearch(e.target.value)
    debouncedSearch(e.target.value)
  }

  const openGymDetail = async (gym) => {
    setSelectedGym(gym)
    setGymDetail(null)
    setDetailLoading(true)
    try {
      const { data } = await api.get(`/super/gyms/${gym.id}`, authHeaders)
      setGymDetail(data.gym || data)
    } catch (err) {
      console.error('Failed to fetch gym detail:', err)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleStatusAction = async (gymId, action) => {
    setActionLoading(true)
    try {
      await api.patch(`/super/gyms/${gymId}/${action}`, {}, authHeaders)
      const { data } = await api.get(`/super/gyms/${gymId}`, authHeaders)
      setGymDetail(data.gym || data)
      fetchGyms(search, statusFilter, page)
    } catch (err) {
      console.error(`Failed to ${action} gym:`, err)
    } finally {
      setActionLoading(false)
    }
  }

  const totalPages = Math.ceil(total / limit) || 1
  const statusBadge = (status) => <Badge color={statusColor(status)}>{status}</Badge>

  const darkCard = {
    background: theme.bgSec,
    borderRadius: 12,
    border: `1px solid ${theme.border}`,
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: theme.text, marginBottom: 24, fontFamily: font }}>Gym Management</h1>

      {/* God-View Stats */}
      {platformStats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
          <div style={{ background: theme.bgSec, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <IndianRupee size={18} style={{ color: theme.green }} />
              <span style={{ fontSize: 13, color: theme.textSec, fontFamily: font }}>Total Platform Revenue</span>
            </div>
            <span style={{ fontSize: 28, fontWeight: 700, color: theme.text, fontFamily: fontMono }}>
              {formatPaise(platformStats.total_revenue || 0)}
            </span>
          </div>
          <div style={{ background: theme.bgSec, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Building2 size={18} style={{ color: theme.amber }} />
              <span style={{ fontSize: 13, color: theme.textSec, fontFamily: font }}>Total Active Gyms</span>
            </div>
            <span style={{ fontSize: 28, fontWeight: 700, color: theme.text, fontFamily: fontMono }}>
              {platformStats.active_gyms ?? 0}
            </span>
          </div>
          <div style={{ background: theme.bgSec, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Users size={18} style={{ color: theme.textSec }} />
              <span style={{ fontSize: 13, color: theme.textSec, fontFamily: font }}>Total Members Managed</span>
            </div>
            <span style={{ fontSize: 28, fontWeight: 700, color: theme.text, fontFamily: fontMono }}>
              {platformStats.total_members ?? 0}
            </span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ ...darkCard, padding: '20px', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <Input
              label="Search"
              placeholder="Search by gym name or owner..."
              value={search}
              onChange={handleSearchChange}
              containerStyle={{ marginBottom: 0 }}
              style={{ paddingLeft: 36 }}
            />
            <Search
              size={16}
              style={{
                position: 'relative', top: -34, left: 12,
                color: theme.textTer, pointerEvents: 'none', marginBottom: -16,
              }}
            />
          </div>
          <div style={{ minWidth: 180 }}>
            <Select
              label="Status"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
              containerStyle={{ marginBottom: 0 }}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="trial">Trial</option>
              <option value="suspended">Suspended</option>
            </Select>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <SkeletonTable rows={8} cols={6} />
      ) : (
        <div style={{ ...darkCard, padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${theme.border}` }}>
                  {['Gym Name', 'Owner', 'Owner Email', 'Members', 'Status', 'Monthly Revenue', 'Subscription', 'Actions'].map((h) => (
                    <th key={h} style={{
                      textAlign: 'left', padding: '12px 16px', fontSize: 13,
                      fontWeight: 600, color: theme.textTer, textTransform: 'uppercase',
                      letterSpacing: '0.3px',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gyms.map((gym) => (
                  <tr
                    key={gym.id}
                    onClick={() => openGymDetail(gym)}
                    style={{
                      borderBottom: `1px solid ${theme.border}`, cursor: 'pointer',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = theme.bgHover)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '14px 16px', fontSize: 14, fontWeight: 500, color: theme.text }}>
                      {gym.gym_name}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 14, color: theme.textSec }}>
                      {gym.owner_name}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 14, color: theme.textSec }}>
                      {gym.email || '\u2014'}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 14, color: theme.text, fontFamily: fontMono }}>
                      {gym.member_count ?? '\u2014'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {statusBadge(gym.status)}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 14, color: theme.text, fontFamily: fontMono }}>
                      {gym.monthly_revenue != null ? formatPaise(gym.monthly_revenue) : '\u2014'}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 14, color: theme.textSec }}>
                      {gym.subscription_plan || '\u2014'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); openGymDetail(gym) }}
                        >
                          View
                        </Button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleImpersonate(gym) }}
                          title="Login as Owner"
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '4px 10px', borderRadius: 6, border: `1px solid ${theme.border}`,
                            background: 'transparent', color: theme.amber, fontSize: 12, fontWeight: 600,
                            cursor: 'pointer', fontFamily: font, whiteSpace: 'nowrap',
                          }}
                        >
                          <LogIn size={13} /> Impersonate
                        </button>
                        {(gym.status === 'active' || gym.status === 'trial') && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleStatusAction(gym.id, 'suspend') }}
                            disabled={actionLoading}
                            title="Suspend Gym"
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              padding: '4px 10px', borderRadius: 6, border: 'none',
                              background: theme.red, color: '#fff', fontSize: 12, fontWeight: 600,
                              cursor: actionLoading ? 'not-allowed' : 'pointer',
                              opacity: actionLoading ? 0.6 : 1, fontFamily: font, whiteSpace: 'nowrap',
                            }}
                          >
                            <Ban size={13} /> Suspend
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {gyms.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ padding: 40, textAlign: 'center', color: theme.textSec, fontSize: 14 }}>
                      No gyms found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > limit && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px', borderTop: `1px solid ${theme.border}`,
            }}>
              <span style={{ fontSize: 13, color: theme.textSec }}>
                Showing {(page - 1) * limit + 1}&ndash;{Math.min(page * limit, total)} of {total}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft size={16} /> Prev
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SlideOver Detail */}
      <SlideOver
        open={!!selectedGym}
        onClose={() => setSelectedGym(null)}
        title={selectedGym?.gym_name || 'Gym Details'}
        width={520}
      >
        {detailLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} style={{ height: 20, background: theme.bgTer, borderRadius: 6 }} />
            ))}
          </div>
        ) : gymDetail ? (
          <div>
            {/* Status & Actions */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 24, paddingBottom: 16, borderBottom: `1px solid ${theme.border}`,
            }}>
              <div>
                <span style={{ fontSize: 13, color: theme.textSec, display: 'block', marginBottom: 4 }}>Status</span>
                {statusBadge(gymDetail.status)}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => handleImpersonate(gymDetail)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '8px 16px', borderRadius: 8, border: `1px solid ${theme.border}`,
                    background: 'transparent', color: theme.amber, fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', fontFamily: font,
                  }}
                >
                  <LogIn size={14} /> Login as Owner
                </button>
                {gymDetail.status === 'active' || gymDetail.status === 'trial' ? (
                  <button
                    disabled={actionLoading}
                    onClick={() => handleStatusAction(gymDetail.id, 'suspend')}
                    style={{
                      padding: '8px 16px', borderRadius: 8, border: 'none',
                      background: theme.red, color: '#fff', fontSize: 13, fontWeight: 600,
                      cursor: actionLoading ? 'not-allowed' : 'pointer', opacity: actionLoading ? 0.6 : 1,
                      fontFamily: font,
                    }}
                  >
                    Suspend
                  </button>
                ) : (
                  <button
                    disabled={actionLoading}
                    onClick={() => handleStatusAction(gymDetail.id, 'activate')}
                    style={{
                      padding: '8px 16px', borderRadius: 8, border: 'none',
                      background: theme.green, color: '#fff', fontSize: 13, fontWeight: 600,
                      cursor: actionLoading ? 'not-allowed' : 'pointer', opacity: actionLoading ? 0.6 : 1,
                      fontFamily: font,
                    }}
                  >
                    Activate
                  </button>
                )}
              </div>
            </div>

            {/* Detail Fields */}
            {[
              ['Gym Name', gymDetail.gym_name],
              ['Owner', gymDetail.owner_name],
              ['Email', gymDetail.email],
              ['Phone', gymDetail.phone],
              ['City', gymDetail.city],
              ['Members', gymDetail.member_count ?? '\u2014'],
              ['Subscription', gymDetail.subscription_plan || '\u2014'],
              ['Revenue', formatPaise(gymDetail.total_revenue || 0)],
              ['Joined', formatDate(gymDetail.created_at)],
            ].map(([label, value]) => (
              <div key={label} style={{
                display: 'flex', justifyContent: 'space-between', padding: '10px 0',
                borderBottom: `1px solid ${theme.border}`,
              }}>
                <span style={{ fontSize: 14, color: theme.textSec }}>{label}</span>
                <span style={{ fontSize: 14, fontWeight: 500, color: theme.text }}>{value}</span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: theme.textSec, fontSize: 14 }}>Failed to load gym details.</p>
        )}
      </SlideOver>
    </div>
  )
}
