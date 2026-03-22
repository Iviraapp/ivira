import { useState, useEffect, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet'
import L from 'leaflet'
import api from '../lib/api'
import { formatPaise } from '../lib/utils'
import { useTheme } from '../context/ThemeContext'
import {
  Search, MapPin, Star, X, Navigation, Clock, Dumbbell, Car, Waves,
  Snowflake, Lock, Flame, Coffee, Locate, AlertCircle, Loader2,
  ExternalLink, Phone, Globe as GlobeIcon, ChevronRight, Sparkles,
  Ticket, CheckCircle2, User, CreditCard,
} from 'lucide-react'
import 'leaflet/dist/leaflet.css'

// Fix Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// SVG map icons are module-level so they can't use theme — hardcoded with brand purple #7C3AED
const accentIcon = L.divIcon({
  className: '',
  html: `<svg width="32" height="42" viewBox="0 0 32 42" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 26 16 26s16-14 16-26C32 7.163 24.837 0 16 0z" fill="#7C3AED"/>
    <circle cx="16" cy="16" r="7" fill="#fff"/>
    <circle cx="16" cy="16" r="4" fill="#7C3AED"/>
  </svg>`,
  iconSize: [32, 42],
  iconAnchor: [16, 42],
  popupAnchor: [0, -42],
})

const googleIcon = L.divIcon({
  className: '',
  html: `<svg width="30" height="40" viewBox="0 0 30 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 0C6.716 0 0 6.716 0 15c0 11.25 15 25 15 25s15-13.75 15-25C30 6.716 23.284 0 15 0z" fill="#00D4FF"/>
    <circle cx="15" cy="15" r="6.5" fill="#fff"/>
    <circle cx="15" cy="15" r="3.5" fill="#00D4FF"/>
  </svg>`,
  iconSize: [30, 40],
  iconAnchor: [15, 40],
  popupAnchor: [0, -40],
})

const selectedIcon = L.divIcon({
  className: '',
  html: `<svg width="40" height="52" viewBox="0 0 40 52" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 0C8.954 0 0 8.954 0 20c0 15 20 32 20 32s20-17 20-32C40 8.954 31.046 0 20 0z" fill="#7C3AED"/>
    <circle cx="20" cy="20" r="9" fill="#fff"/>
    <circle cx="20" cy="20" r="5" fill="#7C3AED"/>
  </svg>`,
  iconSize: [40, 52],
  iconAnchor: [20, 52],
  popupAnchor: [0, -52],
})

const userIcon = L.divIcon({
  className: '',
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#34A853;border:3px solid #fff;box-shadow:0 0 12px rgba(52,168,83,0.6);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

const INDIA_CENTER = [20.5937, 78.9629]
const BENGALURU_CENTER = [12.9416, 77.6300]

const AMENITY_ICONS = {
  'AC': Snowflake, 'Pool': Waves, 'Parking': Car, 'Locker': Lock,
  'Sauna': Flame, 'Steam Room': Flame, 'Cafeteria': Coffee, 'Protein Bar': Coffee,
  'Yoga Studio': Dumbbell, 'Shower': Waves, 'Supplement Store': Coffee,
  'Outdoor Area': MapPin,
}

function FlyToMarker({ position, zoom }) {
  const map = useMap()
  useEffect(() => {
    if (position) {
      map.flyTo(position, zoom || 14, { duration: 0.8, easeLinearity: 0.4 })
    }
  }, [position, zoom, map])
  return null
}

function RatingStars({ rating }) {
  const { theme } = useTheme()
  const full = Math.floor(rating)
  const half = rating - full >= 0.5
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={14}
          fill={i < full ? theme.amber : i === full && half ? 'url(#halfStar)' : 'none'}
          stroke={i < full || (i === full && half) ? theme.amber : theme.textTer}
          strokeWidth={1.5}
        />
      ))}
      <span style={{
        fontSize: 13, fontWeight: 700, color: theme.amber, marginLeft: 4,
        fontFamily: "'Barlow Condensed', monospace",
      }}>
        {rating.toFixed(1)}
      </span>
    </div>
  )
}

// Build photo URL — Google Places photos go through our proxy
function getPhotoSrc(gym) {
  if (gym.source === 'google_places' && gym.photo_reference) {
    // photo_reference is like "places/PLACE_ID/photos/PHOTO_REF"
    return `/api/v1/external/gyms/photos/${gym.photo_reference}?maxwidth=400`
  }
  // Internal gym photos
  const photos = gym.photos
    ? (typeof gym.photos === 'string' ? JSON.parse(gym.photos) : gym.photos)
    : []
  return photos[0] || null
}

export default function GymFinder() {
  const { theme, isDark } = useTheme()

  const [internalGyms, setInternalGyms] = useState([])
  const [googleGyms, setGoogleGyms] = useState([])
  const [loading, setLoading] = useState(true)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [selectedGym, setSelectedGym] = useState(null)
  const [detailData, setDetailData] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [userLocation, setUserLocation] = useState(null)
  const [locationStatus, setLocationStatus] = useState('pending') // pending | granted | denied | unavailable
  const [flyTo, setFlyTo] = useState(null)
  const [flyZoom, setFlyZoom] = useState(null)
  const [cardVisible, setCardVisible] = useState(false)
  const [activeSource, setActiveSource] = useState('all') // all | internal | google
  const [dayPassMatch, setDayPassMatch] = useState(null) // { matched, gym_id, day_pass_paise, ... }
  const [dayPassLoading, setDayPassLoading] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [checkoutForm, setCheckoutForm] = useState({ buyerName: '', buyerPhone: '', validDate: '' })
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false)
  const [checkoutResult, setCheckoutResult] = useState(null) // { success, message }
  const searchTimeoutRef = useRef(null)

  // All gyms combined
  const allGyms = activeSource === 'internal' ? internalGyms
    : activeSource === 'google' ? googleGyms
    : [...internalGyms, ...googleGyms]

  // CSS with theme tokens
  const CSS = `
@keyframes slideUp {
  from { transform: translateY(100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
@keyframes slideDown {
  from { transform: translateY(0); opacity: 1; }
  to { transform: translateY(100%); opacity: 0; }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes pulse-ring {
  0% { transform: scale(0.8); opacity: 0.5; }
  50% { transform: scale(1.2); opacity: 0; }
  100% { transform: scale(0.8); opacity: 0.5; }
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.gymfinder-map-container .leaflet-container {
  width: 100%; height: 100%; background: ${theme.bg};
}
.gymfinder-map-container .leaflet-control-zoom {
  border: none !important; margin: 16px !important;
}
.gymfinder-map-container .leaflet-control-zoom a {
  background: ${theme.bgSec} !important; color: ${theme.text} !important;
  border: 1px solid ${theme.border} !important;
  backdrop-filter: blur(12px); width: 36px !important; height: 36px !important;
  line-height: 36px !important; font-size: 16px !important;
}
.gymfinder-map-container .leaflet-control-zoom a:first-child {
  border-radius: 10px 10px 0 0 !important;
}
.gymfinder-map-container .leaflet-control-zoom a:last-child {
  border-radius: 0 0 10px 10px !important;
}
.gym-card-scroll::-webkit-scrollbar { display: none; }
@media (max-width: 640px) {
  .gym-detail-panel { max-height: 70vh !important; }
}
`

  // Request geolocation on mount
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus('unavailable')
      fetchInternalGyms()
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = [pos.coords.latitude, pos.coords.longitude]
        setUserLocation(loc)
        setLocationStatus('granted')
        setFlyTo(loc)
        setFlyZoom(13)
        fetchInternalGyms(loc)
        fetchNearbyGyms(loc[0], loc[1])
      },
      () => {
        setLocationStatus('denied')
        fetchInternalGyms()
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [])

  async function fetchInternalGyms(loc, q = '') {
    setLoading(true)
    try {
      const params = { limit: 50 }
      if (q) params.q = q
      if (loc) {
        params.lat = loc[0]
        params.lng = loc[1]
      }
      const { data } = await api.get('/discover/gyms', { params })
      setInternalGyms((data.gyms || []).map(g => ({ ...g, source: 'internal' })))
    } catch {
      setInternalGyms([])
    } finally {
      setLoading(false)
    }
  }

  async function fetchNearbyGyms(lat, lng, radius = 5000) {
    setGoogleLoading(true)
    try {
      const { data } = await api.get('/external/gyms/nearby', {
        params: { lat, lng, radius },
      })
      setGoogleGyms(data.gyms || [])
    } catch {
      // Google Places might not be configured — that's fine
      setGoogleGyms([])
    } finally {
      setGoogleLoading(false)
    }
  }

  async function searchGoogleGyms(query, lat, lng) {
    setGoogleLoading(true)
    try {
      const params = { query }
      if (lat && lng) { params.lat = lat; params.lng = lng }
      const { data } = await api.get('/external/gyms/search', { params })
      setGoogleGyms(data.gyms || [])
    } catch {
      setGoogleGyms([])
    } finally {
      setGoogleLoading(false)
    }
  }

  const handleSearch = useCallback((e) => {
    const val = e.target.value
    setSearch(val)

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)

    searchTimeoutRef.current = setTimeout(() => {
      if (val.length >= 2) {
        fetchInternalGyms(userLocation, val)
        searchGoogleGyms(val, userLocation?.[0], userLocation?.[1])
      } else if (val.length === 0) {
        fetchInternalGyms(userLocation)
        if (userLocation) {
          fetchNearbyGyms(userLocation[0], userLocation[1])
        } else {
          setGoogleGyms([])
        }
      }
    }, 400)
  }, [userLocation])

  async function selectGym(gym) {
    setSelectedGym(gym)
    setCardVisible(true)
    setDetailData(null)
    setDayPassMatch(null)
    setShowCheckout(false)
    setCheckoutResult(null)

    const lat = parseFloat(gym.latitude)
    const lng = parseFloat(gym.longitude)
    if (!isNaN(lat) && !isNaN(lng)) {
      setFlyTo([lat, lng])
      setFlyZoom(15)
    }

    // Fetch details for Google Places gyms
    if (gym.source === 'google_places' && gym.place_id) {
      setDetailLoading(true)
      try {
        const { data } = await api.get(`/external/gyms/${gym.place_id}`)
        setDetailData(data)
      } catch {
        setDetailData(null)
      } finally {
        setDetailLoading(false)
      }

      // Check if this Google gym is registered on IVIRA for day passes
      setDayPassLoading(true)
      try {
        const { data } = await api.get(`/external/gyms/match/${gym.place_id}`)
        setDayPassMatch(data)
      } catch {
        setDayPassMatch(null)
      } finally {
        setDayPassLoading(false)
      }
    }
  }

  function closeCard() {
    setCardVisible(false)
    setTimeout(() => {
      setSelectedGym(null)
      setDetailData(null)
      setDayPassMatch(null)
      setShowCheckout(false)
      setCheckoutResult(null)
    }, 300)
  }

  async function handleDayPassPurchase(e) {
    e.preventDefault()
    const { buyerName, buyerPhone, validDate } = checkoutForm
    if (!buyerName || !buyerPhone || !validDate) return

    setCheckoutSubmitting(true)
    try {
      const placeId = selectedGym.place_id
      const { data } = await api.post(`/external/gyms/match/${placeId}/day-pass`, {
        buyerName: buyerName.trim(),
        buyerPhone: buyerPhone.trim(),
        validDate,
      })

      if (data.devMode || data.razorpayOrder) {
        setCheckoutResult({
          success: true,
          message: data.devMode
            ? 'Day pass purchased successfully! (Dev mode — auto-confirmed)'
            : 'Day pass created! Complete payment to confirm.',
          dayPass: data.dayPass,
          razorpayOrder: data.razorpayOrder,
        })

        // If Razorpay order exists, open checkout
        if (data.razorpayOrder && window.Razorpay) {
          const rzp = new window.Razorpay({
            key: data.razorpayOrder.notes?.key_id || '',
            amount: data.razorpayOrder.amount,
            currency: 'INR',
            name: dayPassMatch.gym_name || 'IVIRA',
            description: `Day Pass — ${validDate}`,
            order_id: data.razorpayOrder.id,
            handler: async (response) => {
              try {
                await api.post(`/discover/day-pass/${data.dayPass.id}/verify`, {
                  paymentId: response.razorpay_payment_id,
                })
                setCheckoutResult({
                  success: true,
                  message: 'Payment confirmed! Your day pass is active.',
                })
              } catch {
                setCheckoutResult({
                  success: false,
                  message: 'Payment received but verification failed. Contact the gym.',
                })
              }
            },
            theme: { color: '#7C3AED' },
          })
          rzp.open()
        }
      }
    } catch (err) {
      setCheckoutResult({
        success: false,
        message: err.response?.data?.message || 'Failed to purchase day pass. Please try again.',
      })
    } finally {
      setCheckoutSubmitting(false)
    }
  }

  function retryLocation() {
    setLocationStatus('pending')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = [pos.coords.latitude, pos.coords.longitude]
        setUserLocation(loc)
        setLocationStatus('granted')
        setFlyTo(loc)
        setFlyZoom(13)
        fetchNearbyGyms(loc[0], loc[1])
      },
      () => setLocationStatus('denied'),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  // Parse gym detail fields
  const amenities = selectedGym?.amenities
    ? (typeof selectedGym.amenities === 'string' ? JSON.parse(selectedGym.amenities) : selectedGym.amenities)
    : []

  const photos = selectedGym?.photos
    ? (typeof selectedGym.photos === 'string' ? JSON.parse(selectedGym.photos) : selectedGym.photos)
    : []

  const timings = selectedGym?.timings
    ? (typeof selectedGym.timings === 'string' ? JSON.parse(selectedGym.timings) : selectedGym.timings)
    : {}

  // Detail data (from Google Places detail fetch)
  const detail = detailData || {}
  const openingHours = detail.opening_hours || []
  const detailPhotos = (detail.photos || []).map(
    p => `/api/v1/external/gyms/photos/${p.reference}?maxwidth=400`
  )
  const reviews = detail.reviews || []

  const isGoogleGym = selectedGym?.source === 'google_places'
  const photoUrl = selectedGym ? getPhotoSrc(selectedGym) : null

  return (
    <div style={{ position: 'fixed', inset: 0, background: theme.bg, overflow: 'hidden' }} className="gymfinder-map-container">
      <style>{CSS}</style>

      {/* ── Search bar (floating) ── */}
      <div style={{
        position: 'absolute', top: 16, left: 16, right: 16, zIndex: 1000,
        maxWidth: 520,
      }}>
        <div style={{
          background: theme.bgSec, backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)', borderRadius: 14,
          border: `1px solid ${theme.border}`,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', gap: 10, padding: '4px 4px 4px 16px',
        }}>
          <Search size={18} style={{ color: theme.textTer, flexShrink: 0 }} />
          <input
            value={search}
            onChange={handleSearch}
            placeholder={userLocation ? 'Search gyms nearby...' : 'Search gyms by city or area...'}
            style={{
              flex: 1, padding: '12px 4px', fontSize: 15, fontWeight: 500,
              fontFamily: "'Inter', -apple-system, sans-serif",
              background: 'transparent', border: 'none', outline: 'none',
              color: theme.text,
            }}
          />
          {search && (
            <button onClick={() => {
              setSearch('')
              fetchInternalGyms(userLocation)
              if (userLocation) fetchNearbyGyms(userLocation[0], userLocation[1])
              else setGoogleGyms([])
            }} style={{
              width: 32, height: 32, borderRadius: 8, background: theme.accentSoft,
              border: 'none', color: theme.textSec, cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <X size={14} />
            </button>
          )}
          {userLocation && (
            <button
              onClick={() => { setFlyTo(userLocation); setFlyZoom(14) }}
              title="My location"
              style={{
                width: 36, height: 36, borderRadius: 10,
                background: theme.brandAccentSoft, border: 'none',
                color: theme.brandAccent, cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Navigation size={16} />
            </button>
          )}
        </div>

        {/* Result count + source tabs */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          marginTop: 8, flexWrap: 'wrap',
        }}>
          {!loading && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: theme.bgSec, backdropFilter: 'blur(12px)',
              borderRadius: 20, padding: '6px 14px',
              border: `1px solid ${theme.border}`,
              animation: 'fadeIn 0.3s ease',
            }}>
              <MapPin size={12} style={{ color: theme.brandAccent }} />
              <span style={{
                fontSize: 12, fontWeight: 600, color: theme.textSec,
                fontFamily: "'Inter', -apple-system, sans-serif",
              }}>
                {allGyms.length} gyms found
              </span>
              {googleLoading && (
                <Loader2 size={12} style={{ color: theme.cyan, animation: 'spin 1s linear infinite' }} />
              )}
            </div>
          )}

          {/* Source filter pills */}
          {(internalGyms.length > 0 || googleGyms.length > 0) && (
            <div style={{ display: 'flex', gap: 4 }}>
              {[
                { key: 'all', label: 'All' },
                ...(internalGyms.length > 0 ? [{ key: 'internal', label: `IVIRA (${internalGyms.length})` }] : []),
                ...(googleGyms.length > 0 ? [{ key: 'google', label: `Nearby (${googleGyms.length})` }] : []),
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveSource(tab.key)}
                  style={{
                    padding: '5px 12px', borderRadius: 16, fontSize: 11, fontWeight: 600,
                    fontFamily: "'Inter', -apple-system, sans-serif",
                    background: activeSource === tab.key ? theme.brandAccentSoft : theme.bgSec,
                    color: activeSource === tab.key ? theme.brandAccent : theme.textTer,
                    border: `1px solid ${activeSource === tab.key ? theme.brandAccent + '4d' : theme.border}`,
                    cursor: 'pointer', backdropFilter: 'blur(12px)',
                    transition: 'all 0.15s',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Location denied banner */}
        {locationStatus === 'denied' && (
          <div style={{
            marginTop: 8, display: 'flex', alignItems: 'center', gap: 10,
            background: `${theme.amber}14`, backdropFilter: 'blur(12px)',
            borderRadius: 12, padding: '10px 14px',
            border: `1px solid ${theme.amber}26`,
            animation: 'fadeIn 0.3s ease',
          }}>
            <AlertCircle size={16} style={{ color: theme.amber, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: theme.amber, fontFamily: "'Inter', -apple-system, sans-serif", flex: 1 }}>
              Location access denied — search by city name instead
            </span>
            <button onClick={retryLocation} style={{
              padding: '4px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600,
              background: `${theme.amber}26`, color: theme.amber,
              border: `1px solid ${theme.amber}33`, cursor: 'pointer',
              fontFamily: "'Inter', -apple-system, sans-serif",
            }}>
              Retry
            </button>
          </div>
        )}
      </div>

      {/* ── Full-screen map ── */}
      <MapContainer
        center={BENGALURU_CENTER}
        zoom={12}
        style={{ width: '100%', height: '100%' }}
        zoomControl={true}
      >
        <TileLayer
          attribution=""
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        {flyTo && <FlyToMarker position={flyTo} zoom={flyZoom} />}

        {/* User location marker */}
        {userLocation && (
          <>
            <Marker position={userLocation} icon={userIcon} />
            <Circle
              center={userLocation}
              radius={100}
              pathOptions={{
                fillColor: theme.green, fillOpacity: 0.08,
                color: theme.green, weight: 1, opacity: 0.2,
              }}
            />
          </>
        )}

        {/* Gym markers */}
        {allGyms.map((gym) => {
          const lat = parseFloat(gym.latitude)
          const lng = parseFloat(gym.longitude)
          if (isNaN(lat) || isNaN(lng)) return null

          const key = gym.place_id || gym.id || gym.gym_id
          const isSelected = selectedGym && (
            selectedGym.place_id === gym.place_id ||
            selectedGym.id === gym.id ||
            selectedGym.gym_id === gym.gym_id
          )
          const icon = isSelected ? selectedIcon
            : gym.source === 'google_places' ? googleIcon
            : accentIcon

          return (
            <Marker
              key={key}
              position={[lat, lng]}
              icon={icon}
              eventHandlers={{ click: () => selectGym(gym) }}
            />
          )
        })}
      </MapContainer>

      {/* ── Bottom gym list carousel ── */}
      {!selectedGym && allGyms.length > 0 && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 1000,
          background: `linear-gradient(transparent, ${theme.bg}f2 30%)`,
          padding: '48px 16px 16px',
        }}>
          <div style={{
            display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4,
            scrollSnapType: 'x mandatory',
          }} className="gym-card-scroll">
            {allGyms.map((gym) => {
              const key = gym.place_id || gym.id || gym.gym_id
              const thumb = getPhotoSrc(gym)
              return (
                <div
                  key={key}
                  onClick={() => selectGym(gym)}
                  style={{
                    flex: '0 0 280px', scrollSnapAlign: 'start',
                    background: theme.bgSec, backdropFilter: 'blur(12px)',
                    borderRadius: 14, overflow: 'hidden', cursor: 'pointer',
                    border: `1px solid ${theme.border}`,
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = theme.brandAccent + '4d'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = theme.border
                    e.currentTarget.style.transform = 'none'
                  }}
                >
                  {/* Photo strip */}
                  {thumb && (
                    <div style={{
                      height: 80, background: `url(${thumb}) center/cover`,
                      borderBottom: `1px solid ${theme.border}`,
                    }} />
                  )}
                  <div style={{ padding: 14 }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4,
                    }}>
                      <div style={{
                        fontSize: 15, fontWeight: 700, color: theme.text,
                        fontFamily: "'Inter', -apple-system, sans-serif",
                        textTransform: 'uppercase', whiteSpace: 'nowrap',
                        overflow: 'hidden', textOverflow: 'ellipsis', flex: 1,
                      }}>
                        {gym.gym_name}
                      </div>
                      {/* Source badge */}
                      {gym.source === 'google_places' && (
                        <span style={{
                          fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 6,
                          background: `${theme.cyan}1a`, color: theme.cyan,
                          border: `1px solid ${theme.cyan}26`,
                          fontFamily: "'JetBrains Mono', monospace",
                          textTransform: 'uppercase', letterSpacing: '0.5px', flexShrink: 0,
                        }}>
                          Google
                        </span>
                      )}
                    </div>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8, fontSize: 12,
                      color: theme.textSec, fontFamily: "'Inter', -apple-system, sans-serif",
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Star size={11} fill={theme.amber} stroke={theme.amber} />
                        <span style={{ fontWeight: 600, color: theme.amber }}>
                          {(gym.avg_rating || 0).toFixed(1)}
                        </span>
                        {gym.review_count > 0 && (
                          <span style={{ color: theme.textTer }}>({gym.review_count})</span>
                        )}
                      </div>
                      <span style={{ color: theme.textTer }}>|</span>
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {gym.area || gym.city || gym.address?.split(',')[0]}
                      </span>
                      {gym.distance_km && (
                        <>
                          <span style={{ color: theme.textTer }}>|</span>
                          <span style={{ color: theme.green, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, flexShrink: 0 }}>
                            {gym.distance_km < 1
                              ? `${Math.round(gym.distance_km * 1000)}m`
                              : `${gym.distance_km.toFixed(1)}km`}
                          </span>
                        </>
                      )}
                    </div>
                    {/* Day pass for internal gyms */}
                    {gym.source !== 'google_places' && gym.day_pass_paise > 0 && (
                      <div style={{
                        marginTop: 6, fontSize: 12, color: theme.green, fontWeight: 600,
                        fontFamily: "'Inter', -apple-system, sans-serif",
                      }}>
                        Day Pass: {formatPaise(gym.day_pass_paise)}
                      </div>
                    )}
                    {/* Open/Closed status */}
                    {gym.is_open_now !== null && gym.is_open_now !== undefined && (
                      <div style={{
                        marginTop: 4, fontSize: 11, fontWeight: 600,
                        color: gym.is_open_now ? theme.green : theme.red,
                        fontFamily: "'Inter', -apple-system, sans-serif",
                      }}>
                        {gym.is_open_now ? 'Open Now' : 'Closed'}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Slide-up detail card ── */}
      {selectedGym && (
        <>
          {/* Backdrop */}
          <div
            onClick={closeCard}
            style={{
              position: 'absolute', inset: 0, zIndex: 1001,
              background: 'rgba(0,0,0,0.3)',
              animation: cardVisible ? 'fadeIn 0.2s ease' : 'none',
              opacity: cardVisible ? 1 : 0,
              transition: 'opacity 0.3s',
            }}
          />

          {/* Detail panel */}
          <div
            className="gym-detail-panel"
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 1002,
              maxHeight: '80vh', overflowY: 'auto',
              background: `linear-gradient(180deg, ${theme.bgSec} 0%, ${theme.bg} 100%)`,
              borderRadius: '20px 20px 0 0',
              border: `1px solid ${theme.border}`,
              borderBottom: 'none',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
              animation: cardVisible ? 'slideUp 0.35s ease-out' : 'slideDown 0.3s ease-in',
            }}
          >
            {/* Drag handle */}
            <div style={{
              display: 'flex', justifyContent: 'center', padding: '12px 0 4px',
              cursor: 'pointer',
            }} onClick={closeCard}>
              <div style={{
                width: 36, height: 4, borderRadius: 2,
                background: theme.textTer,
              }} />
            </div>

            <div style={{ padding: '8px 24px 32px' }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h2 style={{
                      fontSize: 28, fontWeight: 800, color: theme.text, margin: 0,
                      fontFamily: "'Inter', -apple-system, sans-serif",
                      textTransform: 'uppercase', letterSpacing: '-0.01em', lineHeight: 1.1,
                    }}>
                      {selectedGym.gym_name}
                    </h2>
                    {isGoogleGym && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                        background: `${theme.cyan}1a`, color: theme.cyan,
                        border: `1px solid ${theme.cyan}26`,
                        fontFamily: "'JetBrains Mono', monospace",
                        textTransform: 'uppercase',
                      }}>
                        Google
                      </span>
                    )}
                  </div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8, marginTop: 8,
                    fontSize: 13, color: theme.textSec, fontFamily: "'Inter', -apple-system, sans-serif",
                  }}>
                    <MapPin size={14} style={{ color: theme.brandAccent }} />
                    <span>{selectedGym.address || selectedGym.area || selectedGym.city}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                    <RatingStars rating={selectedGym.avg_rating || 0} />
                    {selectedGym.review_count > 0 && (
                      <span style={{ fontSize: 12, color: theme.textTer, fontFamily: "'Inter', -apple-system, sans-serif" }}>
                        ({selectedGym.review_count} reviews)
                      </span>
                    )}
                    {selectedGym.distance_km && (
                      <span style={{
                        fontSize: 12, color: theme.green, fontWeight: 600,
                        fontFamily: "'JetBrains Mono', monospace",
                      }}>
                        {selectedGym.distance_km < 1
                          ? `${Math.round(selectedGym.distance_km * 1000)}m away`
                          : `${selectedGym.distance_km.toFixed(1)}km away`}
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={closeCard} style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: theme.accentSoft, border: 'none',
                  color: theme.textSec, cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <X size={16} />
                </button>
              </div>

              {/* Loading detail */}
              {detailLoading && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 10, padding: '24px 0',
                }}>
                  <Loader2 size={20} style={{ color: theme.brandAccent, animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: 13, color: theme.textTer, fontFamily: "'Inter', -apple-system, sans-serif" }}>
                    Loading details...
                  </span>
                </div>
              )}

              {/* Detail photos (Google Places) */}
              {detailPhotos.length > 0 && (
                <div style={{
                  display: 'flex', gap: 10, overflowX: 'auto', marginBottom: 20,
                  scrollSnapType: 'x mandatory', paddingBottom: 4,
                }} className="gym-card-scroll">
                  {detailPhotos.map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt={`${selectedGym.gym_name} photo ${i + 1}`}
                      loading="lazy"
                      style={{
                        flex: '0 0 200px', height: 140, objectFit: 'cover',
                        borderRadius: 12, scrollSnapAlign: 'start',
                        border: `1px solid ${theme.border}`,
                        background: theme.bgTer,
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Internal gym photos */}
              {!isGoogleGym && photos.length > 0 && (
                <div style={{
                  display: 'flex', gap: 10, overflowX: 'auto', marginBottom: 20,
                  scrollSnapType: 'x mandatory', paddingBottom: 4,
                }} className="gym-card-scroll">
                  {photos.map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt={`${selectedGym.gym_name} photo ${i + 1}`}
                      style={{
                        flex: '0 0 200px', height: 140, objectFit: 'cover',
                        borderRadius: 12, scrollSnapAlign: 'start',
                        border: `1px solid ${theme.border}`,
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Contact buttons (Google Places) */}
              {isGoogleGym && (detail.phone || detail.website) && (
                <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                  {detail.phone && (
                    <a href={`tel:${detail.phone}`} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '10px 16px', borderRadius: 12,
                      background: `${theme.green}14`, color: theme.green,
                      border: `1px solid ${theme.green}26`,
                      fontSize: 13, fontWeight: 600, fontFamily: "'Inter', -apple-system, sans-serif",
                      textDecoration: 'none', transition: 'all 0.15s',
                    }}>
                      <Phone size={15} />
                      {detail.phone}
                    </a>
                  )}
                  {detail.website && (
                    <a href={detail.website} target="_blank" rel="noopener noreferrer" style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '10px 16px', borderRadius: 12,
                      background: theme.brandAccentSoft, color: theme.brandAccent,
                      border: `1px solid ${theme.brandAccent}26`,
                      fontSize: 13, fontWeight: 600, fontFamily: "'Inter', -apple-system, sans-serif",
                      textDecoration: 'none', transition: 'all 0.15s',
                    }}>
                      <GlobeIcon size={15} />
                      Website
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              )}

              {/* Opening hours (Google Places) */}
              {openingHours.length > 0 && (
                <div style={{
                  padding: '14px 16px', borderRadius: 12,
                  background: theme.accentSoft,
                  border: `1px solid ${theme.border}`,
                  marginBottom: 16,
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
                  }}>
                    <Clock size={14} style={{ color: theme.green }} />
                    <span style={{
                      fontSize: 12, fontWeight: 700, color: theme.textTer,
                      textTransform: 'uppercase', letterSpacing: '1px',
                      fontFamily: "'Inter', -apple-system, sans-serif",
                    }}>
                      Hours
                    </span>
                    {detail.is_open_now !== null && detail.is_open_now !== undefined && (
                      <span style={{
                        marginLeft: 'auto', fontSize: 11, fontWeight: 700,
                        color: detail.is_open_now ? theme.green : theme.red,
                        padding: '2px 8px', borderRadius: 6,
                        background: detail.is_open_now ? `${theme.green}1a` : `${theme.red}1a`,
                      }}>
                        {detail.is_open_now ? 'Open Now' : 'Closed'}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {openingHours.map((line, i) => {
                      const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })
                      const isToday = line.toLowerCase().startsWith(today.toLowerCase())
                      return (
                        <div key={i} style={{
                          fontSize: 12, color: isToday ? theme.text : theme.textSec,
                          fontFamily: "'Inter', -apple-system, sans-serif",
                          fontWeight: isToday ? 600 : 400,
                          padding: '2px 0',
                        }}>
                          {line}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Internal gym timings */}
              {!isGoogleGym && timings.open && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 16px', borderRadius: 12,
                  background: theme.accentSoft,
                  border: `1px solid ${theme.border}`,
                  marginBottom: 16,
                }}>
                  <Clock size={16} style={{ color: theme.green }} />
                  <span style={{
                    fontSize: 14, color: theme.text, fontWeight: 600,
                    fontFamily: "'Barlow Condensed', monospace",
                  }}>
                    {timings.open} - {timings.close}
                  </span>
                  {timings.days && (
                    <span style={{ fontSize: 12, color: theme.textTer, fontFamily: "'Inter', -apple-system, sans-serif" }}>
                      ({timings.days})
                    </span>
                  )}
                </div>
              )}

              {/* Description */}
              {selectedGym.description && (
                <p style={{
                  fontSize: 14, color: theme.textSec, lineHeight: 1.6, marginBottom: 20,
                  fontFamily: "'Inter', -apple-system, sans-serif",
                }}>
                  {selectedGym.description}
                </p>
              )}

              {/* Amenities */}
              {amenities.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <h4 style={{
                    fontSize: 12, fontWeight: 700, color: theme.textTer,
                    textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 10,
                    fontFamily: "'Inter', -apple-system, sans-serif",
                  }}>
                    Amenities
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {amenities.map((a) => {
                      const Icon = AMENITY_ICONS[a] || Dumbbell
                      return (
                        <div key={a} style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                          background: theme.brandAccentSoft, color: theme.textSec,
                          border: `1px solid ${theme.brandAccent}1f`,
                          fontFamily: "'Inter', -apple-system, sans-serif",
                        }}>
                          <Icon size={13} style={{ color: theme.brandAccent }} />
                          {a}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Google Places reviews */}
              {reviews.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <h4 style={{
                    fontSize: 12, fontWeight: 700, color: theme.textTer,
                    textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 10,
                    fontFamily: "'Inter', -apple-system, sans-serif",
                  }}>
                    Reviews
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {reviews.map((r, i) => (
                      <div key={i} style={{
                        padding: '12px 14px', borderRadius: 12,
                        background: theme.accentSoft,
                        border: `1px solid ${theme.border}`,
                      }}>
                        <div style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          marginBottom: 6,
                        }}>
                          <span style={{
                            fontSize: 13, fontWeight: 600, color: theme.text,
                            fontFamily: "'Inter', -apple-system, sans-serif",
                          }}>
                            {r.author}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            {Array.from({ length: 5 }).map((_, j) => (
                              <Star key={j} size={11}
                                fill={j < r.rating ? theme.amber : 'none'}
                                stroke={j < r.rating ? theme.amber : theme.textTer}
                                strokeWidth={1.5}
                              />
                            ))}
                          </div>
                        </div>
                        {r.text && (
                          <p style={{
                            fontSize: 12, color: theme.textSec, lineHeight: 1.5, margin: 0,
                            fontFamily: "'Inter', -apple-system, sans-serif",
                          }}>
                            {r.text.length > 200 ? r.text.slice(0, 200) + '...' : r.text}
                          </p>
                        )}
                        {r.time && (
                          <span style={{
                            fontSize: 10, color: theme.textTer, marginTop: 4, display: 'block',
                            fontFamily: "'Inter', -apple-system, sans-serif",
                          }}>
                            {r.time}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CTA buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Day Pass CTA — for Google gyms matched in our DB */}
                {isGoogleGym && dayPassMatch?.matched && dayPassMatch.accepts_day_pass && dayPassMatch.day_pass_paise > 0 && !showCheckout && !checkoutResult && (
                  <button
                    onClick={() => {
                      setShowCheckout(true)
                      setCheckoutForm(f => ({ ...f, validDate: new Date().toISOString().split('T')[0] }))
                    }}
                    style={{
                      width: '100%', padding: '16px 24px', fontSize: 16,
                      fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px',
                      fontFamily: "'Inter', -apple-system, sans-serif",
                      background: `linear-gradient(135deg, ${theme.green}, #00B87A)`,
                      color: '#fff', border: 'none', borderRadius: 14,
                      cursor: 'pointer', transition: 'all 0.2s',
                      boxShadow: `0 4px 24px ${theme.green}59`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = `0 8px 32px ${theme.green}80`
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'none'
                      e.currentTarget.style.boxShadow = `0 4px 24px ${theme.green}59`
                    }}
                  >
                    <Ticket size={18} />
                    <span>Buy Daily Pass</span>
                    <span style={{
                      background: 'rgba(255,255,255,0.2)', padding: '4px 12px',
                      borderRadius: 8, fontSize: 14, fontWeight: 700,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      {formatPaise(dayPassMatch.day_pass_paise)}
                    </span>
                  </button>
                )}

                {/* Day Pass loading indicator */}
                {isGoogleGym && dayPassLoading && (
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: '12px', borderRadius: 12,
                    background: `${theme.green}0d`,
                    border: `1px solid ${theme.green}1a`,
                  }}>
                    <Loader2 size={14} style={{ color: theme.green, animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontSize: 12, color: theme.green, fontFamily: "'Inter', -apple-system, sans-serif" }}>
                      Checking day pass availability...
                    </span>
                  </div>
                )}

                {/* Day Pass Checkout Form */}
                {showCheckout && !checkoutResult && (
                  <form onSubmit={handleDayPassPurchase} style={{
                    padding: '20px', borderRadius: 14,
                    background: `${theme.green}0a`,
                    border: `1px solid ${theme.green}1f`,
                    animation: 'fadeIn 0.25s ease',
                  }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      marginBottom: 16,
                    }}>
                      <h4 style={{
                        fontSize: 14, fontWeight: 700, color: theme.green, margin: 0,
                        fontFamily: "'Inter', -apple-system, sans-serif",
                        textTransform: 'uppercase', letterSpacing: '1px',
                        display: 'flex', alignItems: 'center', gap: 8,
                      }}>
                        <Ticket size={16} />
                        Daily Pass — {formatPaise(dayPassMatch.day_pass_paise)}
                      </h4>
                      <button type="button" onClick={() => setShowCheckout(false)} style={{
                        width: 28, height: 28, borderRadius: 8,
                        background: theme.accentSoft, border: 'none',
                        color: theme.textSec, cursor: 'pointer', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <X size={14} />
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {/* Name */}
                      <div style={{ position: 'relative' }}>
                        <User size={15} style={{
                          position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                          color: theme.textTer,
                        }} />
                        <input
                          required
                          placeholder="Your name"
                          value={checkoutForm.buyerName}
                          onChange={e => setCheckoutForm(f => ({ ...f, buyerName: e.target.value }))}
                          style={{
                            width: '100%', padding: '12px 14px 12px 40px', fontSize: 14,
                            fontFamily: "'Inter', -apple-system, sans-serif", fontWeight: 500,
                            background: theme.bgInput, color: theme.text,
                            border: `1px solid ${theme.border}`, borderRadius: 10,
                            outline: 'none', transition: 'border-color 0.15s',
                            boxSizing: 'border-box',
                          }}
                          onFocus={e => e.target.style.borderColor = theme.borderFocus}
                          onBlur={e => e.target.style.borderColor = theme.border}
                        />
                      </div>

                      {/* Phone */}
                      <div style={{ position: 'relative' }}>
                        <Phone size={15} style={{
                          position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                          color: theme.textTer,
                        }} />
                        <input
                          required
                          type="tel"
                          placeholder="Phone number"
                          value={checkoutForm.buyerPhone}
                          onChange={e => setCheckoutForm(f => ({ ...f, buyerPhone: e.target.value }))}
                          style={{
                            width: '100%', padding: '12px 14px 12px 40px', fontSize: 14,
                            fontFamily: "'Inter', -apple-system, sans-serif", fontWeight: 500,
                            background: theme.bgInput, color: theme.text,
                            border: `1px solid ${theme.border}`, borderRadius: 10,
                            outline: 'none', transition: 'border-color 0.15s',
                            boxSizing: 'border-box',
                          }}
                          onFocus={e => e.target.style.borderColor = theme.borderFocus}
                          onBlur={e => e.target.style.borderColor = theme.border}
                        />
                      </div>

                      {/* Date */}
                      <div style={{ position: 'relative' }}>
                        <Clock size={15} style={{
                          position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                          color: theme.textTer,
                        }} />
                        <input
                          required
                          type="date"
                          value={checkoutForm.validDate}
                          min={new Date().toISOString().split('T')[0]}
                          onChange={e => setCheckoutForm(f => ({ ...f, validDate: e.target.value }))}
                          style={{
                            width: '100%', padding: '12px 14px 12px 40px', fontSize: 14,
                            fontFamily: "'Inter', -apple-system, sans-serif", fontWeight: 500,
                            background: theme.bgInput, color: theme.text,
                            border: `1px solid ${theme.border}`, borderRadius: 10,
                            outline: 'none', transition: 'border-color 0.15s',
                            boxSizing: 'border-box',
                            colorScheme: isDark ? 'dark' : 'light',
                          }}
                          onFocus={e => e.target.style.borderColor = theme.borderFocus}
                          onBlur={e => e.target.style.borderColor = theme.border}
                        />
                      </div>

                      {/* Submit */}
                      <button
                        type="submit"
                        disabled={checkoutSubmitting}
                        style={{
                          width: '100%', padding: '14px 24px', fontSize: 15,
                          fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px',
                          fontFamily: "'Inter', -apple-system, sans-serif",
                          background: checkoutSubmitting
                            ? `${theme.green}4d`
                            : `linear-gradient(135deg, ${theme.green}, #00B87A)`,
                          color: '#fff', border: 'none', borderRadius: 12,
                          cursor: checkoutSubmitting ? 'wait' : 'pointer',
                          transition: 'all 0.2s',
                          boxShadow: `0 4px 20px ${theme.green}4d`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                        }}
                      >
                        {checkoutSubmitting ? (
                          <>
                            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                            Processing...
                          </>
                        ) : (
                          <>
                            <CreditCard size={16} />
                            Pay {formatPaise(dayPassMatch.day_pass_paise)}
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}

                {/* Checkout result */}
                {checkoutResult && (
                  <div style={{
                    padding: '20px', borderRadius: 14, textAlign: 'center',
                    background: checkoutResult.success
                      ? `${theme.green}0f` : `${theme.red}0f`,
                    border: `1px solid ${checkoutResult.success
                      ? `${theme.green}26` : `${theme.red}26`}`,
                    animation: 'fadeIn 0.3s ease',
                  }}>
                    {checkoutResult.success ? (
                      <CheckCircle2 size={36} style={{ color: theme.green, marginBottom: 10 }} />
                    ) : (
                      <AlertCircle size={36} style={{ color: theme.red, marginBottom: 10 }} />
                    )}
                    <div style={{
                      fontSize: 15, fontWeight: 700, marginBottom: 4,
                      color: checkoutResult.success ? theme.green : theme.red,
                      fontFamily: "'Inter', -apple-system, sans-serif",
                      textTransform: 'uppercase',
                    }}>
                      {checkoutResult.success ? 'Pass Confirmed!' : 'Purchase Failed'}
                    </div>
                    <div style={{
                      fontSize: 13, color: theme.textSec, fontFamily: "'Inter', -apple-system, sans-serif",
                      lineHeight: 1.5,
                    }}>
                      {checkoutResult.message}
                    </div>
                    {checkoutResult.success && checkoutResult.dayPass && (
                      <div style={{
                        marginTop: 12, padding: '10px 16px', borderRadius: 10,
                        background: `${theme.green}14`,
                        fontSize: 12, color: theme.green, fontWeight: 600,
                        fontFamily: "'JetBrains Mono', monospace",
                      }}>
                        Pass ID: {checkoutResult.dayPass.id?.slice(0, 8)}
                      </div>
                    )}
                  </div>
                )}

                {/* Directions — always shown for Google gyms */}
                {isGoogleGym && (
                  <a
                    href={`https://www.google.com/maps/place/?q=place_id:${selectedGym.place_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                      width: '100%', padding: dayPassMatch?.matched ? '12px 24px' : '16px 24px',
                      fontSize: dayPassMatch?.matched ? 14 : 16,
                      fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px',
                      fontFamily: "'Inter', -apple-system, sans-serif",
                      background: dayPassMatch?.matched
                        ? `${theme.cyan}14`
                        : `linear-gradient(135deg, ${theme.cyan}, ${theme.brandAccent})`,
                      color: dayPassMatch?.matched ? theme.cyan : '#fff',
                      border: dayPassMatch?.matched ? `1px solid ${theme.cyan}26` : 'none',
                      borderRadius: 14,
                      cursor: 'pointer', transition: 'all 0.2s',
                      boxShadow: dayPassMatch?.matched ? 'none' : `0 4px 24px ${theme.cyan}4d`,
                      textDecoration: 'none',
                    }}
                  >
                    <Navigation size={dayPassMatch?.matched ? 15 : 18} />
                    Get Directions
                  </a>
                )}

                {/* Internal gym day pass */}
                {!isGoogleGym && selectedGym.accepts_day_pass && selectedGym.day_pass_paise > 0 && (
                  <button style={{
                    width: '100%', padding: '16px 24px', fontSize: 16,
                    fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px',
                    fontFamily: "'Inter', -apple-system, sans-serif",
                    background: `linear-gradient(135deg, ${theme.brandAccent}, ${theme.cyan})`,
                    color: '#fff', border: 'none', borderRadius: 14,
                    cursor: 'pointer', transition: 'all 0.2s',
                    boxShadow: `0 4px 24px ${theme.brandAccent}59`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  }}>
                    <span>Buy Day Pass</span>
                    <span style={{
                      background: 'rgba(255,255,255,0.2)', padding: '4px 12px',
                      borderRadius: 8, fontSize: 14, fontWeight: 700,
                    }}>
                      {formatPaise(selectedGym.day_pass_paise)}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Loading overlay ── */}
      {loading && allGyms.length === 0 && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 999,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: `${theme.bg}b3`, backdropFilter: 'blur(8px)',
          pointerEvents: 'none',
        }}>
          <Loader2 size={32} style={{ color: theme.brandAccent, animation: 'spin 1s linear infinite', marginBottom: 12 }} />
          <span style={{
            fontSize: 14, color: theme.textSec, fontFamily: "'Inter', -apple-system, sans-serif",
            fontWeight: 500,
          }}>
            Finding gyms near you...
          </span>
        </div>
      )}
    </div>
  )
}
