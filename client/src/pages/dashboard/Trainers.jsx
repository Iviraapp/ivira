import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useTheme } from '../../context/ThemeContext'
import api from '../../lib/api'
import Modal from '../../components/ui/Modal'
import {
  Plus, Star, Eye, Edit3, X, ChevronRight, ChevronLeft,
  Award, Phone, Mail, User, Briefcase, Heart, Activity,
  Calendar, IndianRupee, ToggleLeft, ToggleRight, Search,
} from 'lucide-react'

const FONT = "'Inter', -apple-system, sans-serif"

const TYPE_BADGES = {
  trainer: { label: 'Trainer', bg: 'rgba(26,58,143,0.12)', color: '#1A3A8F' },
  dietitian: { label: 'Dietitian', bg: 'rgba(52,168,83,0.12)', color: '#34A853' },
  physio: { label: 'Physio', bg: 'rgba(66,133,244,0.12)', color: '#4285F4' },
}

const SPECIALTIES_OPTIONS = [
  'Weight Training', 'Cardio', 'Yoga', 'CrossFit', 'Pilates', 'Zumba',
  'Boxing', 'MMA', 'Calisthenics', 'Nutrition', 'Rehab', 'Strength & Conditioning',
  'HIIT', 'Powerlifting', 'Functional Training', 'Sports Physio',
]

const SERVICE_TYPES = [
  { value: 'one_on_one', label: '1-on-1 Session' },
  { value: 'group', label: 'Group Session' },
  { value: 'package', label: 'Package' },
  { value: 'consultation', label: 'Consultation' },
]

const EMPTY_TRAINER = {
  name: '', phone: '', email: '', type: 'trainer', bio: '',
  specialties: [], photo_url: '', certifications: [],
}

const EMPTY_CERT = { name: '', issuer: '', year: '' }

const EMPTY_SERVICE = {
  title: '', trainer_id: '', price_paise: '', type: 'one_on_one',
  description: '', duration_minutes: 60, is_active: true,
}

// ── Style helpers ──────────────────────────────────────────────
const inputSty = (theme) => ({
  width: '100%', padding: '11px 14px', borderRadius: 10,
  border: `1px solid ${theme.border}`, background: theme.bgInput || theme.bg,
  color: theme.text, fontSize: 14, fontFamily: FONT, outline: 'none',
  boxSizing: 'border-box', transition: 'border-color 0.2s',
})

const labelSty = (theme) => ({
  display: 'block', fontSize: 11, fontWeight: 700, color: theme.textTer,
  marginBottom: 6, fontFamily: FONT, textTransform: 'uppercase', letterSpacing: 1,
})

const cardSty = (theme) => ({
  background: '#121212', border: '1px solid #1F1F1F', borderRadius: 14,
  padding: 20, fontFamily: FONT,
})

const btnPrimary = {
  display: 'inline-flex', alignItems: 'center', gap: 8,
  padding: '10px 20px', borderRadius: 10, border: 'none',
  background: '#1A3A8F', color: '#fff', fontSize: 14, fontWeight: 600,
  cursor: 'pointer', fontFamily: FONT, transition: 'all 0.3s',
}

const btnOutline = (theme) => ({
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '8px 14px', borderRadius: 8,
  border: `1px solid ${theme.border}`, background: 'transparent',
  color: theme.textSec, fontSize: 13, fontWeight: 500,
  cursor: 'pointer', fontFamily: FONT, transition: 'all 0.3s',
})

// ── Star Rating ────────────────────────────────────────────────
function StarRating({ rating = 0 }) {
  const stars = []
  for (let i = 1; i <= 5; i++) {
    const filled = i <= Math.round(rating)
    stars.push(
      <Star
        key={i}
        size={14}
        fill={filled ? '#FBBF24' : 'transparent'}
        stroke={filled ? '#FBBF24' : '#555'}
        strokeWidth={1.5}
      />
    )
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      {stars}
      {rating > 0 && (
        <span style={{ fontSize: 12, color: '#999', marginLeft: 4, fontFamily: FONT }}>
          {Number(rating).toFixed(1)}
        </span>
      )}
    </div>
  )
}

// ── Trainer Avatar ─────────────────────────────────────────────
function TrainerAvatar({ name, photo_url, size = 56 }) {
  if (photo_url) {
    return (
      <img
        src={photo_url}
        alt={name}
        style={{
          width: size, height: size, borderRadius: '50%',
          objectFit: 'cover', flexShrink: 0,
        }}
      />
    )
  }
  const initial = (name || '?').charAt(0).toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'linear-gradient(135deg, #1A3A8F, #5B21B6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.4, fontWeight: 700, color: '#fff',
      fontFamily: FONT, flexShrink: 0,
    }}>
      {initial}
    </div>
  )
}

// ── Specialty Chip ─────────────────────────────────────────────
function SpecChip({ label, removable, onRemove }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: 'rgba(26,58,143,0.1)', color: '#3B6FD4',
      fontFamily: FONT, whiteSpace: 'nowrap',
    }}>
      {label}
      {removable && (
        <X
          size={12}
          style={{ cursor: 'pointer', marginLeft: 2 }}
          onClick={(e) => { e.stopPropagation(); onRemove?.() }}
        />
      )}
    </span>
  )
}

// ── Main Component ─────────────────────────────────────────────
export default function Trainers() {
  const { gym } = useAuth()
  const { addToast } = useToast()
  const { theme } = useTheme()
  const queryClient = useQueryClient()
  const gymId = gym?.id

  // UI state
  const [showTrainerModal, setShowTrainerModal] = useState(false)
  const [showServiceModal, setShowServiceModal] = useState(false)
  const [editingTrainer, setEditingTrainer] = useState(null)
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ ...EMPTY_TRAINER })
  const [serviceForm, setServiceForm] = useState({ ...EMPTY_SERVICE })
  const [searchQuery, setSearchQuery] = useState('')

  // ── Queries ────────────────────────────────────────────────
  const { data: trainersData, isLoading: loadingTrainers } = useQuery({
    queryKey: ['trainers', gymId],
    queryFn: () => api.get(`/gyms/${gymId}/trainers`).then(r => r.data),
    enabled: !!gymId,
  })

  const { data: servicesData, isLoading: loadingServices } = useQuery({
    queryKey: ['services', gymId],
    queryFn: () => api.get(`/gyms/${gymId}/services`).then(r => r.data),
    enabled: !!gymId,
  })

  const { data: bookingsData } = useQuery({
    queryKey: ['bookings', gymId],
    queryFn: () => api.get(`/gyms/${gymId}/bookings`).then(r => r.data),
    enabled: !!gymId,
  })

  const trainers = trainersData?.trainers || trainersData?.data || trainersData || []
  const services = servicesData?.services || servicesData?.data || servicesData || []
  const bookings = bookingsData?.bookings || bookingsData?.data || bookingsData || []

  // ── Mutations ──────────────────────────────────────────────
  const createTrainer = useMutation({
    mutationFn: (data) => api.post(`/gyms/${gymId}/trainers`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainers', gymId] })
      addToast('Trainer added successfully', 'success')
      closeTrainerModal()
    },
    onError: (err) => addToast(err.response?.data?.message || 'Failed to add trainer', 'error'),
  })

  const updateTrainer = useMutation({
    mutationFn: ({ id, ...data }) => api.patch(`/gyms/${gymId}/trainers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainers', gymId] })
      addToast('Trainer updated', 'success')
      closeTrainerModal()
    },
    onError: (err) => addToast(err.response?.data?.message || 'Failed to update trainer', 'error'),
  })

  const createService = useMutation({
    mutationFn: (data) => api.post(`/gyms/${gymId}/services`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services', gymId] })
      addToast('Service created', 'success')
      setShowServiceModal(false)
      setServiceForm({ ...EMPTY_SERVICE })
    },
    onError: (err) => addToast(err.response?.data?.message || 'Failed to create service', 'error'),
  })

  const toggleService = useMutation({
    mutationFn: ({ id, is_active }) => api.patch(`/gyms/${gymId}/services/${id}`, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['services', gymId] }),
    onError: (err) => addToast(err.response?.data?.message || 'Failed to toggle service', 'error'),
  })

  // ── Computed stats ─────────────────────────────────────────
  const totalTrainers = Array.isArray(trainers) ? trainers.length : 0
  const activeServices = Array.isArray(services) ? services.filter(s => s.is_active).length : 0
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const bookingsThisMonth = Array.isArray(bookings)
    ? bookings.filter(b => new Date(b.created_at) >= monthStart).length : 0
  const revenueThisMonth = Array.isArray(bookings)
    ? bookings
        .filter(b => new Date(b.created_at) >= monthStart && b.amount_paise)
        .reduce((sum, b) => sum + (b.amount_paise || 0), 0)
    : 0

  // ── Helpers ────────────────────────────────────────────────
  const closeTrainerModal = () => {
    setShowTrainerModal(false)
    setEditingTrainer(null)
    setStep(1)
    setForm({ ...EMPTY_TRAINER })
  }

  const openEdit = (trainer) => {
    setEditingTrainer(trainer)
    setForm({
      name: trainer.name || '',
      phone: trainer.phone || '',
      email: trainer.email || '',
      type: trainer.type || 'trainer',
      bio: trainer.bio || '',
      specialties: trainer.specialties || [],
      photo_url: trainer.photo_url || '',
      certifications: trainer.certifications || [],
    })
    setStep(1)
    setShowTrainerModal(true)
  }

  const handleSaveTrainer = () => {
    const payload = { ...form }
    if (editingTrainer) {
      updateTrainer.mutate({ id: editingTrainer.id, ...payload })
    } else {
      createTrainer.mutate(payload)
    }
  }

  const handleSaveService = () => {
    createService.mutate({
      ...serviceForm,
      price_paise: Number(serviceForm.price_paise) || 0,
      duration_minutes: Number(serviceForm.duration_minutes) || 60,
    })
  }

  const addCert = () => {
    setForm(f => ({ ...f, certifications: [...f.certifications, { ...EMPTY_CERT }] }))
  }

  const updateCert = (idx, field, value) => {
    setForm(f => {
      const certs = [...f.certifications]
      certs[idx] = { ...certs[idx], [field]: value }
      return { ...f, certifications: certs }
    })
  }

  const removeCert = (idx) => {
    setForm(f => ({ ...f, certifications: f.certifications.filter((_, i) => i !== idx) }))
  }

  const toggleSpecialty = (spec) => {
    setForm(f => {
      const has = f.specialties.includes(spec)
      return {
        ...f,
        specialties: has ? f.specialties.filter(s => s !== spec) : [...f.specialties, spec],
      }
    })
  }

  const filteredTrainers = Array.isArray(trainers)
    ? trainers.filter(t =>
        !searchQuery ||
        (t.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.type || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : []

  const formatPrice = (paise) => '₹' + (paise / 100).toLocaleString('en-IN')

  const isSaving = createTrainer.isPending || updateTrainer.isPending

  // ── Render ─────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: FONT }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 28, flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <h1 style={{
            fontSize: 24, fontWeight: 800, color: theme.text, margin: 0,
            fontFamily: FONT, letterSpacing: '-0.5px',
          }}>
            Trainers & Professionals
          </h1>
          <p style={{ fontSize: 14, color: theme.textSec, marginTop: 4, fontFamily: FONT }}>
            Manage trainers, dietitians, physiotherapists & their services
          </p>
        </div>
        <button
          style={btnPrimary}
          onClick={() => { setEditingTrainer(null); setForm({ ...EMPTY_TRAINER }); setStep(1); setShowTrainerModal(true) }}
          onMouseEnter={e => e.currentTarget.style.background = '#6D28D9'}
          onMouseLeave={e => e.currentTarget.style.background = '#1A3A8F'}
        >
          <Plus size={18} />
          Add Trainer
        </button>
      </div>

      {/* Stats Row */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16, marginBottom: 28,
      }}>
        {[
          { label: 'Total Trainers', value: totalTrainers, icon: User, color: '#1A3A8F' },
          { label: 'Active Services', value: activeServices, icon: Activity, color: '#34A853' },
          { label: 'Bookings This Month', value: bookingsThisMonth, icon: Calendar, color: '#4285F4' },
          { label: 'Revenue This Month', value: formatPrice(revenueThisMonth), icon: IndianRupee, color: '#FBBF24' },
        ].map(stat => {
          const Icon = stat.icon
          return (
            <div key={stat.label} style={cardSty(theme)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'rgba(255,255,255,0.05)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={18} color="rgba(255,255,255,0.7)" />
                </div>
                <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500 }}>
                  {stat.label}
                </span>
              </div>
              <div style={{
                fontSize: 28, fontWeight: 800, color: '#FFFFFF',
                fontFamily: "'JetBrains Mono', monospace", letterSpacing: '-1px',
              }}>
                {stat.value}
              </div>
            </div>
          )
        })}
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: 20, position: 'relative', maxWidth: 360 }}>
        <Search size={16} style={{
          position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
          color: theme.textTer,
        }} />
        <input
          placeholder="Search trainers..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{
            ...inputSty(theme), paddingLeft: 40,
            background: '#121212', border: '1px solid #1F1F1F',
          }}
          onFocus={e => e.target.style.borderColor = '#1A3A8F'}
          onBlur={e => e.target.style.borderColor = '#1F1F1F'}
        />
      </div>

      {/* Trainer Grid */}
      {loadingTrainers ? (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16,
        }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ ...cardSty(theme), height: 200, opacity: 0.5 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#1F1F1F', marginBottom: 12 }} />
              <div style={{ width: '60%', height: 14, background: '#1F1F1F', borderRadius: 6, marginBottom: 8 }} />
              <div style={{ width: '40%', height: 10, background: '#1F1F1F', borderRadius: 6 }} />
            </div>
          ))}
        </div>
      ) : filteredTrainers.length === 0 ? (
        <div style={{
          background: '#080808', border: '1px solid #1F1F1F', borderRadius: 16,
          textAlign: 'center', padding: 56, fontFamily: FONT,
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: 'rgba(255,255,255,0.03)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <User size={32} color="#334155" strokeWidth={1.25} />
          </div>
          <p style={{ color: theme.textSec, fontSize: 16, fontWeight: 600, margin: 0 }}>
            {searchQuery ? 'No trainers match your search' : 'No trainers added yet'}
          </p>
          <p style={{ color: theme.textTer, fontSize: 13, marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {!searchQuery && (
              <>
                <Plus size={14} color="#1A3A8F" />
                <span>Click "Add Trainer" to get started</span>
              </>
            )}
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16,
          marginBottom: 40,
        }}>
          {filteredTrainers.map(trainer => {
            const typeCfg = TYPE_BADGES[trainer.type] || TYPE_BADGES.trainer
            const specs = trainer.specialties || []
            return (
              <div key={trainer.id} style={{
                ...cardSty(theme),
                transition: 'border-color 0.2s, transform 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#1F1F1F'; e.currentTarget.style.transform = 'translateY(0)' }}
              >
                {/* Top row: avatar + info */}
                <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
                  <TrainerAvatar name={trainer.name} photo_url={trainer.photo_url} size={56} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: 16, fontWeight: 700, color: theme.text,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {trainer.name}
                      </span>
                      <span style={{
                        padding: '3px 10px', borderRadius: 16, fontSize: 10, fontWeight: 700,
                        background: typeCfg.bg, color: typeCfg.color,
                        textTransform: 'uppercase', letterSpacing: 0.5,
                      }}>
                        {typeCfg.label}
                      </span>
                    </div>

                    {trainer.is_verified && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 5, marginTop: 4,
                        fontSize: 11, color: '#34A853', fontWeight: 600,
                      }}>
                        <span style={{
                          width: 7, height: 7, borderRadius: '50%', background: '#34A853',
                          display: 'inline-block',
                        }} />
                        Verified Pro
                      </div>
                    )}

                    <StarRating rating={trainer.avg_rating} />
                  </div>
                </div>

                {/* Specialties */}
                {specs.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                    {specs.slice(0, 4).map(s => <SpecChip key={s} label={s} />)}
                    {specs.length > 4 && (
                      <span style={{
                        fontSize: 11, color: theme.textTer, padding: '4px 8px',
                        fontWeight: 500,
                      }}>
                        +{specs.length - 4} more
                      </span>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div style={{
                  display: 'flex', gap: 8, paddingTop: 14,
                  borderTop: '1px solid #1F1F1F',
                }}>
                  <button
                    style={btnOutline(theme)}
                    onClick={() => openEdit(trainer)}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#1A3A8F'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = theme.border}
                  >
                    <Eye size={14} />
                    View
                  </button>
                  <button
                    style={btnOutline(theme)}
                    onClick={() => openEdit(trainer)}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#1A3A8F'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = theme.border}
                  >
                    <Edit3 size={14} />
                    Edit
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Service Management Section ──────────────────────────── */}
      <div style={{ marginTop: 12 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 16, flexWrap: 'wrap', gap: 12,
        }}>
          <h2 style={{
            fontSize: 20, fontWeight: 700, color: theme.text, margin: 0,
            fontFamily: FONT, letterSpacing: '-0.3px',
          }}>
            Services
          </h2>
          <button
            style={btnPrimary}
            onClick={() => { setServiceForm({ ...EMPTY_SERVICE }); setShowServiceModal(true) }}
            onMouseEnter={e => e.currentTarget.style.background = '#6D28D9'}
            onMouseLeave={e => e.currentTarget.style.background = '#1A3A8F'}
          >
            <Plus size={16} />
            Create Service
          </button>
        </div>

        {loadingServices ? (
          <div style={{ ...cardSty(theme), height: 100, opacity: 0.5 }} />
        ) : !Array.isArray(services) || services.length === 0 ? (
          <div style={{
            background: '#080808', border: '1px solid #1F1F1F', borderRadius: 16,
            textAlign: 'center', padding: 44, fontFamily: FONT,
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              background: 'rgba(255,255,255,0.03)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 14px',
            }}>
              <Briefcase size={28} color="#334155" strokeWidth={1.25} />
            </div>
            <p style={{ color: theme.textSec, fontSize: 15, fontWeight: 600, margin: 0 }}>No services created yet</p>
            <p style={{ color: theme.textTer, fontSize: 12, marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Plus size={13} color="#1A3A8F" />
              <span>Create a service to start earning</span>
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {services.map(svc => {
              const svcType = SERVICE_TYPES.find(t => t.value === svc.type)
              const trainerName = Array.isArray(trainers)
                ? (trainers.find(t => t.id === svc.trainer_id)?.name || 'Unassigned')
                : 'Unassigned'
              return (
                <div key={svc.id} style={{
                  ...cardSty(theme),
                  display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
                  padding: '14px 20px',
                }}>
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div style={{
                      fontSize: 15, fontWeight: 600, color: theme.text, marginBottom: 2,
                    }}>
                      {svc.title}
                    </div>
                    <div style={{ fontSize: 12, color: theme.textTer }}>
                      {trainerName}
                    </div>
                  </div>

                  <div style={{
                    fontSize: 15, fontWeight: 700, color: theme.text,
                    fontFamily: "'JetBrains Mono', monospace", minWidth: 80,
                  }}>
                    {formatPrice(svc.price_paise || 0)}
                  </div>

                  {svcType && (
                    <span style={{
                      padding: '4px 12px', borderRadius: 16, fontSize: 11,
                      fontWeight: 600, background: 'rgba(26,58,143,0.1)',
                      color: '#3B6FD4', textTransform: 'uppercase', letterSpacing: 0.3,
                    }}>
                      {svcType.label}
                    </span>
                  )}

                  <button
                    onClick={() => toggleService.mutate({ id: svc.id, is_active: !svc.is_active })}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: svc.is_active ? '#34A853' : theme.textTer,
                      display: 'flex', alignItems: 'center', padding: 4,
                    }}
                    title={svc.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {svc.is_active
                      ? <ToggleRight size={28} />
                      : <ToggleLeft size={28} />
                    }
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Add/Edit Trainer Modal ──────────────────────────────── */}
      <Modal
        open={showTrainerModal}
        onClose={closeTrainerModal}
        title={`${editingTrainer ? 'Edit' : 'Add'} Trainer - Step ${step} of 3`}
        width={540}
      >
        {/* Step indicators */}
        <div style={{
          display: 'flex', gap: 8, marginBottom: 24,
        }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{
              flex: 1, height: 4, borderRadius: 4,
              background: s <= step ? '#1A3A8F' : '#1F1F1F',
              transition: 'background 0.2s',
            }} />
          ))}
        </div>

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={labelSty(theme)}>Full Name *</label>
              <input
                style={inputSty(theme)}
                placeholder="e.g. Rahul Sharma"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelSty(theme)}>Phone *</label>
                <input
                  style={inputSty(theme)}
                  placeholder="+1 (814) 895-7439"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div>
                <label style={labelSty(theme)}>Email</label>
                <input
                  style={inputSty(theme)}
                  placeholder="trainer@email.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label style={labelSty(theme)}>Type</label>
              <select
                style={{ ...inputSty(theme), cursor: 'pointer' }}
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              >
                <option value="trainer">Trainer</option>
                <option value="dietitian">Dietitian</option>
                <option value="physio">Physiotherapist</option>
              </select>
            </div>
            <div>
              <label style={labelSty(theme)}>Bio</label>
              <textarea
                style={{ ...inputSty(theme), minHeight: 80, resize: 'vertical' }}
                placeholder="Brief description, experience, approach..."
                value={form.bio}
                onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
              />
            </div>
          </div>
        )}

        {/* Step 2: Specialties & Photo */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={labelSty(theme)}>Specialties</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {SPECIALTIES_OPTIONS.map(spec => {
                  const selected = form.specialties.includes(spec)
                  return (
                    <button
                      key={spec}
                      onClick={() => toggleSpecialty(spec)}
                      style={{
                        padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                        border: selected ? '1px solid #1A3A8F' : '1px solid #1F1F1F',
                        background: selected ? 'rgba(26,58,143,0.15)' : 'transparent',
                        color: selected ? '#3B6FD4' : theme.textSec,
                        cursor: 'pointer', fontFamily: FONT, transition: 'all 0.15s',
                      }}
                    >
                      {spec}
                    </button>
                  )
                })}
              </div>
              {form.specialties.length > 0 && (
                <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  <span style={{ fontSize: 11, color: theme.textTer, marginRight: 4, alignSelf: 'center' }}>
                    Selected:
                  </span>
                  {form.specialties.map(s => (
                    <SpecChip key={s} label={s} removable onRemove={() => toggleSpecialty(s)} />
                  ))}
                </div>
              )}
            </div>
            <div>
              <label style={labelSty(theme)}>Photo URL</label>
              <input
                style={inputSty(theme)}
                placeholder="https://example.com/photo.jpg"
                value={form.photo_url}
                onChange={e => setForm(f => ({ ...f, photo_url: e.target.value }))}
              />
              {form.photo_url && (
                <div style={{ marginTop: 10 }}>
                  <img
                    src={form.photo_url}
                    alt="Preview"
                    style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '2px solid #1F1F1F' }}
                    onError={e => { e.target.style.display = 'none' }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Certifications */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ ...labelSty(theme), marginBottom: 0 }}>Certifications</label>
              <button
                onClick={addCert}
                style={{
                  ...btnOutline(theme), fontSize: 12, padding: '6px 12px',
                }}
              >
                <Plus size={14} />
                Add
              </button>
            </div>

            {form.certifications.length === 0 && (
              <p style={{ fontSize: 13, color: theme.textTer, textAlign: 'center', padding: 16 }}>
                No certifications added. Click "Add" to include credentials.
              </p>
            )}

            {form.certifications.map((cert, idx) => (
              <div key={idx} style={{
                padding: 14, borderRadius: 10, border: '1px solid #1F1F1F',
                background: '#0A0A0A', position: 'relative',
              }}>
                <button
                  onClick={() => removeCert(idx)}
                  style={{
                    position: 'absolute', top: 8, right: 8,
                    width: 24, height: 24, borderRadius: 6, border: 'none',
                    background: 'rgba(234,67,53,0.1)', color: '#EA4335',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', fontSize: 14,
                  }}
                >
                  <X size={14} />
                </button>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={{ ...labelSty(theme), fontSize: 10 }}>Certificate Name</label>
                    <input
                      style={{ ...inputSty(theme), fontSize: 13, padding: '8px 12px' }}
                      placeholder="e.g. ACE CPT"
                      value={cert.name}
                      onChange={e => updateCert(idx, 'name', e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ ...labelSty(theme), fontSize: 10 }}>Issuer</label>
                    <input
                      style={{ ...inputSty(theme), fontSize: 13, padding: '8px 12px' }}
                      placeholder="e.g. ACE Fitness"
                      value={cert.issuer}
                      onChange={e => updateCert(idx, 'issuer', e.target.value)}
                    />
                  </div>
                </div>
                <div style={{ maxWidth: 120 }}>
                  <label style={{ ...labelSty(theme), fontSize: 10 }}>Year</label>
                  <input
                    style={{ ...inputSty(theme), fontSize: 13, padding: '8px 12px' }}
                    placeholder="2024"
                    value={cert.year}
                    onChange={e => updateCert(idx, 'year', e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Navigation buttons */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', marginTop: 28,
          paddingTop: 20, borderTop: '1px solid #1F1F1F',
        }}>
          <button
            onClick={() => step > 1 ? setStep(step - 1) : closeTrainerModal()}
            style={btnOutline(theme)}
          >
            <ChevronLeft size={16} />
            {step > 1 ? 'Back' : 'Cancel'}
          </button>

          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              style={btnPrimary}
              disabled={step === 1 && !form.name.trim()}
            >
              Next
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleSaveTrainer}
              style={{
                ...btnPrimary,
                opacity: isSaving ? 0.6 : 1,
                pointerEvents: isSaving ? 'none' : 'auto',
              }}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : (editingTrainer ? 'Update Trainer' : 'Save Trainer')}
            </button>
          )}
        </div>
      </Modal>

      {/* ── Create Service Modal ────────────────────────────────── */}
      <Modal
        open={showServiceModal}
        onClose={() => { setShowServiceModal(false); setServiceForm({ ...EMPTY_SERVICE }) }}
        title="Create Service"
        width={480}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelSty(theme)}>Service Title *</label>
            <input
              style={inputSty(theme)}
              placeholder="e.g. Personal Training Session"
              value={serviceForm.title}
              onChange={e => setServiceForm(f => ({ ...f, title: e.target.value }))}
            />
          </div>

          <div>
            <label style={labelSty(theme)}>Assign Trainer</label>
            <select
              style={{ ...inputSty(theme), cursor: 'pointer' }}
              value={serviceForm.trainer_id}
              onChange={e => setServiceForm(f => ({ ...f, trainer_id: e.target.value }))}
            >
              <option value="">Select trainer...</option>
              {Array.isArray(trainers) && trainers.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelSty(theme)}>Price (paise) *</label>
              <input
                style={inputSty(theme)}
                type="number"
                placeholder="e.g. 100000 (= ₹1,000)"
                value={serviceForm.price_paise}
                onChange={e => setServiceForm(f => ({ ...f, price_paise: e.target.value }))}
              />
              {serviceForm.price_paise > 0 && (
                <span style={{ fontSize: 11, color: theme.textTer, marginTop: 4, display: 'block' }}>
                  = {formatPrice(Number(serviceForm.price_paise))}
                </span>
              )}
            </div>
            <div>
              <label style={labelSty(theme)}>Duration (mins)</label>
              <input
                style={inputSty(theme)}
                type="number"
                placeholder="60"
                value={serviceForm.duration_minutes}
                onChange={e => setServiceForm(f => ({ ...f, duration_minutes: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label style={labelSty(theme)}>Type</label>
            <select
              style={{ ...inputSty(theme), cursor: 'pointer' }}
              value={serviceForm.type}
              onChange={e => setServiceForm(f => ({ ...f, type: e.target.value }))}
            >
              {SERVICE_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelSty(theme)}>Description</label>
            <textarea
              style={{ ...inputSty(theme), minHeight: 70, resize: 'vertical' }}
              placeholder="What's included in this service..."
              value={serviceForm.description}
              onChange={e => setServiceForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>
        </div>

        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: 10,
          marginTop: 24, paddingTop: 20, borderTop: '1px solid #1F1F1F',
        }}>
          <button
            style={btnOutline(theme)}
            onClick={() => { setShowServiceModal(false); setServiceForm({ ...EMPTY_SERVICE }) }}
          >
            Cancel
          </button>
          <button
            style={{
              ...btnPrimary,
              opacity: createService.isPending ? 0.6 : 1,
              pointerEvents: createService.isPending ? 'none' : 'auto',
            }}
            onClick={handleSaveService}
            disabled={createService.isPending || !serviceForm.title.trim()}
          >
            {createService.isPending ? 'Creating...' : 'Create Service'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
