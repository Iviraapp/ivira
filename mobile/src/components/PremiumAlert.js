// PremiumAlert — Drop-in replacement for React Native Alert.alert
// Renders premium glass-morphism modals & animated toasts
// Usage: import { premiumAlert, PremiumAlertOverlay } from './PremiumAlert'
//        premiumAlert('Title', 'Message')  // toast
//        premiumAlert('Title', 'Message', [{ text: 'OK' }, { text: 'Cancel' }])  // modal

import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions,
  Modal, Platform,
} from 'react-native'
import { Feather } from '@expo/vector-icons'

const { width: SCREEN_W } = Dimensions.get('window')

// ── Event bus (module-level singleton) ──
let _listeners = []
function emit(payload) { _listeners.forEach(fn => fn(payload)) }
function subscribe(fn) { _listeners.push(fn); return () => { _listeners = _listeners.filter(f => f !== fn) } }

// ── Icon mapping for common titles ──
function getIcon(title) {
  const t = (title || '').toLowerCase()
  if (t.includes('success') || t.includes('saved') || t.includes('logged') || t.includes('checked') || t.includes('welcome') || t.includes('booked') || t.includes('reserved') || t.includes('notified') || t.includes('purchased')) return { name: 'check-circle', color: '#34D399' }
  if (t.includes('error') || t.includes('failed') || t.includes('invalid') || t.includes('cannot')) return { name: 'alert-circle', color: '#F87171' }
  if (t.includes('warning') || t.includes('missing') || t.includes('required') || t.includes('empty') || t.includes('too short')) return { name: 'alert-triangle', color: '#FBBF24' }
  if (t.includes('permission') || t.includes('denied')) return { name: 'shield-off', color: '#F87171' }
  if (t.includes('coming soon') || t.includes('not available') || t.includes('unavailable')) return { name: 'info', color: '#94A3B8' }
  if (t.includes('cancel')) return { name: 'x-circle', color: '#F87171' }
  if (t.includes('log out') || t.includes('logout')) return { name: 'log-out', color: '#F87171' }
  if (t.includes('delete')) return { name: 'trash-2', color: '#F87171' }
  if (t.includes('export')) return { name: 'download', color: '#3B82F6' }
  if (t.includes('remove') || t.includes('discard')) return { name: 'trash', color: '#F87171' }
  if (t.includes('nfc')) return { name: 'smartphone', color: '#3B82F6' }
  if (t.includes('location')) return { name: 'map-pin', color: '#3B82F6' }
  return { name: 'message-circle', color: '#3B82F6' }
}

// ── Public API (same signature as Alert.alert) ──
export function premiumAlert(title, message, buttons, options) {
  emit({ title, message, buttons, options })
}

// ── Overlay component (mount once in App.js) ──
export function PremiumAlertOverlay() {
  const [queue, setQueue] = useState([])
  const [current, setCurrent] = useState(null)

  useEffect(() => {
    return subscribe((payload) => {
      const hasButtons = payload.buttons && payload.buttons.length > 1
      if (hasButtons) {
        // Confirmation modal — show immediately
        setCurrent(payload)
      } else {
        // Toast notification
        setQueue(q => [...q, { ...payload, id: Date.now() + Math.random() }])
      }
    })
  }, [])

  const dismissModal = useCallback(() => setCurrent(null), [])

  return (
    <>
      {/* Toasts */}
      <View style={s.toastContainer} pointerEvents="box-none">
        {queue.map((item, i) => (
          <Toast
            key={item.id}
            title={item.title}
            message={item.message}
            button={item.buttons?.[0]}
            onDone={() => setQueue(q => q.filter(t => t.id !== item.id))}
          />
        ))}
      </View>

      {/* Confirmation Modal */}
      {current && (
        <ConfirmModal
          title={current.title}
          message={current.message}
          buttons={current.buttons}
          onDismiss={dismissModal}
        />
      )}
    </>
  )
}

// ── Toast (auto-dismiss in 3s, or tap to dismiss) ──
function Toast({ title, message, button, onDone }) {
  const anim = useRef(new Animated.Value(0)).current
  const icon = getIcon(title)

  useEffect(() => {
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 10 }).start()
    const timer = setTimeout(() => dismiss(), 3000)
    return () => clearTimeout(timer)
  }, [])

  function dismiss() {
    Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      button?.onPress?.()
      onDone()
    })
  }

  return (
    <Animated.View style={[s.toast, {
      opacity: anim,
      transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) },
                  { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }],
    }]}>
      <TouchableOpacity style={s.toastInner} activeOpacity={0.8} onPress={dismiss}>
        <View style={[s.toastIconWrap, { backgroundColor: icon.color + '18' }]}>
          <Feather name={icon.name} size={18} color={icon.color} />
        </View>
        <View style={s.toastText}>
          {title ? <Text style={s.toastTitle} numberOfLines={1}>{title}</Text> : null}
          {message ? <Text style={s.toastMessage} numberOfLines={2}>{message}</Text> : null}
        </View>
        <Feather name="x" size={14} color="#64748B" style={s.toastClose} />
      </TouchableOpacity>
    </Animated.View>
  )
}

// ── Confirmation Modal (glass-morphism) ──
function ConfirmModal({ title, message, buttons = [], onDismiss }) {
  const anim = useRef(new Animated.Value(0)).current
  const icon = getIcon(title)

  useEffect(() => {
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, tension: 100, friction: 12 }).start()
  }, [])

  function handlePress(btn) {
    Animated.timing(anim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      btn?.onPress?.()
      onDismiss()
    })
  }

  // Sort buttons: cancel/neutral on left, destructive/default on right
  const sorted = [...buttons].sort((a, b) => {
    if (a.style === 'cancel') return -1
    if (b.style === 'cancel') return 1
    return 0
  })

  return (
    <Modal transparent visible animationType="none" statusBarTranslucent>
      <View style={s.overlay}>
        <Animated.View style={[s.modalCard, {
          opacity: anim,
          transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }],
        }]}>
          {/* Icon */}
          <View style={[s.modalIconWrap, { backgroundColor: icon.color + '15' }]}>
            <Feather name={icon.name} size={28} color={icon.color} />
          </View>

          {/* Text */}
          {title ? <Text style={s.modalTitle}>{title}</Text> : null}
          {message ? <Text style={s.modalMessage}>{message}</Text> : null}

          {/* Buttons */}
          <View style={s.modalButtons}>
            {sorted.map((btn, i) => {
              const isCancel = btn.style === 'cancel'
              const isDestructive = btn.style === 'destructive'
              return (
                <TouchableOpacity
                  key={i}
                  style={[
                    s.modalBtn,
                    isCancel && s.modalBtnCancel,
                    isDestructive && s.modalBtnDestructive,
                    !isCancel && !isDestructive && s.modalBtnPrimary,
                    sorted.length === 1 && { flex: 0, minWidth: 140 },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => handlePress(btn)}
                >
                  <Text style={[
                    s.modalBtnText,
                    isCancel && s.modalBtnTextCancel,
                    isDestructive && s.modalBtnTextDestructive,
                  ]}>
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </Animated.View>
      </View>
    </Modal>
  )
}

// ── Styles ──
const s = StyleSheet.create({
  // Toast
  toastContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 16,
    right: 16,
    zIndex: 99999,
    elevation: 99999,
    alignItems: 'center',
    gap: 8,
  },
  toast: {
    width: '100%',
    maxWidth: 420,
  },
  toastInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A2236',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.1)',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16 },
      android: { elevation: 12 },
    }),
  },
  toastIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastText: {
    flex: 1,
    gap: 2,
  },
  toastTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
    letterSpacing: 0.1,
  },
  toastMessage: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 16,
  },
  toastClose: {
    padding: 4,
  },

  // Modal overlay
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },

  // Modal card
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#151B2E',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.08)',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.5, shadowRadius: 24 },
      android: { elevation: 20 },
    }),
  },
  modalIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  modalMessage: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },

  // Buttons
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  modalBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnPrimary: {
    backgroundColor: '#3B82F6',
  },
  modalBtnCancel: {
    backgroundColor: 'rgba(148,163,184,0.1)',
  },
  modalBtnDestructive: {
    backgroundColor: 'rgba(248,113,113,0.15)',
  },
  modalBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
  modalBtnTextCancel: {
    color: '#94A3B8',
  },
  modalBtnTextDestructive: {
    color: '#F87171',
  },
})
