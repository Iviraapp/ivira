import { useState, useEffect, useRef, useCallback } from 'react'

const ALL_EVENT_TYPES = [
  'checkin', 'meal_logged', 'achievement', 'member_onboarded',
  'transformation_uploaded', 'payment', 'booking', 'booking_cancelled',
  'at_risk', 'milestone', 'fasting_milestone', 'revenue_update',
  'trainer_fee', 'affiliate_commission', 'transaction',
]

/**
 * General-purpose SSE hook for real-time gym events.
 * @param {string} gymId
 * @param {string} token
 * @param {object} options - { filter: string[], maxEvents: number }
 */
export default function useSSE(gymId, token, options = {}) {
  const { filter, maxEvents = 100 } = options
  const [connected, setConnected] = useState(false)
  const [events, setEvents] = useState([])
  const [lastEvent, setLastEvent] = useState(null)
  const esRef = useRef(null)
  const reconnectRef = useRef(null)

  const connect = useCallback(() => {
    if (!gymId || !token) return

    let url = `/api/v1/events/stream?gymId=${gymId}&token=${token}`
    if (filter?.length) {
      url += `&filter=${filter.join(',')}`
    }

    const es = new EventSource(url)
    esRef.current = es

    es.onopen = () => setConnected(true)
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        setLastEvent(data)
        setEvents(prev => [data, ...prev].slice(0, maxEvents))
      } catch {}
    }

    // Listen for specific event types
    const types = filter?.length ? filter : ALL_EVENT_TYPES
    types.forEach(type => {
      es.addEventListener(type, (e) => {
        try {
          const data = JSON.parse(e.data)
          setLastEvent(data)
          setEvents(prev => [data, ...prev].slice(0, maxEvents))
        } catch {}
      })
    })

    es.onerror = () => {
      setConnected(false)
      es.close()
      // Exponential backoff: 2s, 4s, 8s, max 30s
      const delay = Math.min(30000, 2000 * Math.pow(2, (reconnectRef.current || 0)))
      reconnectRef.current = (reconnectRef.current || 0) + 1
      setTimeout(() => {
        connect()
      }, delay)
    }

    // Reset backoff on successful connection
    reconnectRef.current = 0

    return () => {
      es.close()
      setConnected(false)
    }
  }, [gymId, token, filter?.join(','), maxEvents])

  useEffect(() => {
    const cleanup = connect()
    return () => { cleanup?.(); esRef.current?.close() }
  }, [connect])

  return { connected, events, lastEvent }
}

/**
 * Transaction-specific SSE hook for the financial dashboard.
 * Subscribes to the dedicated transaction feed endpoint.
 */
export function useTransactionFeed(gymId, token, options = {}) {
  const { maxEvents = 50 } = options
  const [connected, setConnected] = useState(false)
  const [transactions, setTransactions] = useState([])
  const [lastTransaction, setLastTransaction] = useState(null)
  const esRef = useRef(null)

  const connect = useCallback(() => {
    if (!gymId || !token) return

    const url = `/api/v1/events/transaction-feed?gymId=${gymId}&token=${token}`
    const es = new EventSource(url)
    esRef.current = es

    es.onopen = () => setConnected(true)

    const transactionTypes = ['payment', 'transaction', 'revenue_update', 'trainer_fee', 'affiliate_commission', 'booking']
    transactionTypes.forEach(type => {
      es.addEventListener(type, (e) => {
        try {
          const data = JSON.parse(e.data)
          setLastTransaction(data)
          setTransactions(prev => [data, ...prev].slice(0, maxEvents))
        } catch {}
      })
    })

    es.onerror = () => {
      setConnected(false)
      es.close()
      setTimeout(connect, 5000)
    }

    return () => {
      es.close()
      setConnected(false)
    }
  }, [gymId, token, maxEvents])

  useEffect(() => {
    const cleanup = connect()
    return () => { cleanup?.(); esRef.current?.close() }
  }, [connect])

  return { connected, transactions, lastTransaction }
}

/**
 * Check-in specific SSE hook.
 * Filters to only check-in events for real-time occupancy tracking.
 */
export function useCheckinFeed(gymId, token) {
  return useSSE(gymId, token, { filter: ['checkin'], maxEvents: 50 })
}
