import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../../lib/api'

const TourContext = createContext(null)

const STORAGE_KEY = 'ivira_tour_seen'

export const TOUR_TARGETS = {
  'remote-unlock': {
    title: 'God Mode',
    description: 'Tap here to remotely open any synced door in your facility.',
  },
  'live-map': {
    title: 'Global Pulse',
    description: 'Watch your gym ecosystem live as check-ins happen.',
  },
  'add-product': {
    title: 'Revenue Engine',
    description: 'Upload your first supplement or gear item to start selling to members.',
  },
}

function loadSeenFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return new Set(JSON.parse(raw))
  } catch {}
  return new Set()
}

function saveSeenToStorage(seen) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...seen]))
  } catch {}
}

export function TourProvider({ children }) {
  const [seenTooltips, setSeenTooltips] = useState(() => loadSeenFromStorage())

  // Try to load seen state from server on mount
  useEffect(() => {
    let cancelled = false
    async function loadFromServer() {
      try {
        const gymRaw = localStorage.getItem('ivira_gym')
        if (!gymRaw) return
        const gym = JSON.parse(gymRaw)
        if (!gym?.id) return

        const { data } = await api.get(`/gyms/${gym.id}/settings`)
        const serverSeen = data?.settings?.tour_seen || data?.tour_seen
        if (serverSeen && Array.isArray(serverSeen) && !cancelled) {
          setSeenTooltips((prev) => {
            const merged = new Set([...prev, ...serverSeen])
            saveSeenToStorage(merged)
            return merged
          })
        }
      } catch {
        // Silently fail - localStorage is the primary source
      }
    }
    loadFromServer()
    return () => { cancelled = true }
  }, [])

  const isTooltipVisible = useCallback(
    (id) => !seenTooltips.has(id),
    [seenTooltips]
  )

  const dismissTooltip = useCallback((id) => {
    setSeenTooltips((prev) => {
      const next = new Set(prev)
      next.add(id)
      saveSeenToStorage(next)

      // Fire-and-forget save to server
      try {
        const gymRaw = localStorage.getItem('ivira_gym')
        if (gymRaw) {
          const gym = JSON.parse(gymRaw)
          if (gym?.id) {
            api.patch(`/gyms/${gym.id}/settings`, {
              tour_seen: [...next],
            }).catch(() => {})
          }
        }
      } catch {}

      return next
    })
  }, [])

  const resetTour = useCallback(() => {
    setSeenTooltips(new Set())
    saveSeenToStorage(new Set())

    // Fire-and-forget reset on server
    try {
      const gymRaw = localStorage.getItem('ivira_gym')
      if (gymRaw) {
        const gym = JSON.parse(gymRaw)
        if (gym?.id) {
          api.patch(`/gyms/${gym.id}/settings`, {
            tour_seen: [],
          }).catch(() => {})
        }
      }
    } catch {}
  }, [])

  const isTourActive = [...Object.keys(TOUR_TARGETS)].some(
    (id) => !seenTooltips.has(id)
  )

  return (
    <TourContext.Provider
      value={{
        isTooltipVisible,
        dismissTooltip,
        resetTour,
        isTourActive,
        TOUR_TARGETS,
      }}
    >
      {children}
    </TourContext.Provider>
  )
}

export function useTour() {
  const ctx = useContext(TourContext)
  if (!ctx) throw new Error('useTour must be used within TourProvider')
  return ctx
}
