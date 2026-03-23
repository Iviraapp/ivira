import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../lib/api'

const PACKAGES = [
  { value: 'standard', label: 'Standard' },
  { value: 'pro', label: 'Pro' },
  { value: 'enterprise', label: 'Enterprise' },
]

export default function LeadCaptureModal({ open, onClose }) {
  const [form, setForm] = useState({ name: '', gym_name: '', phone: '', email: '', package_interest: 'standard' })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)
  const [consent, setConsent] = useState(false)

  const handleChange = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const payload = { ...form, phone: form.phone.startsWith('+91') ? form.phone : `+91${form.phone.replace(/^0+/, '')}` }
      await api.post('/leads', payload)
      setSuccess(true)
    } catch (err) {
      setError(err?.response?.data?.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setSuccess(false)
    setError(null)
    setForm({ name: '', gym_name: '', phone: '', email: '', package_interest: 'standard' })
    onClose()
  }

  const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    background: '#141414',
    border: '1px solid #2A2A2A',
    borderRadius: 8,
    color: '#FFFFFF',
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
  }

  const labelStyle = {
    display: 'block',
    fontSize: 12,
    fontWeight: 500,
    color: '#999',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#0A0A0A',
              borderRadius: 16,
              border: '1px solid #1A1A1A',
              width: '100%',
              maxWidth: 440,
              padding: 32,
              position: 'relative',
            }}
          >
            {/* Close button */}
            <button
              onClick={handleClose}
              style={{
                position: 'absolute', top: 16, right: 16,
                background: 'none', border: 'none', color: '#666',
                cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 4,
              }}
            >
              &times;
            </button>

            {success ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>&#10003;</div>
                <h3 style={{ color: '#FFF', fontSize: 20, margin: '0 0 8px', fontWeight: 600 }}>
                  Thank you!
                </h3>
                <p style={{ color: '#999', fontSize: 14, margin: 0 }}>
                  Our team will reach out shortly.
                </p>
                <button
                  onClick={handleClose}
                  style={{
                    marginTop: 24, padding: '10px 32px',
                    background: '#1A3A8F', color: '#FFF', border: 'none',
                    borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500,
                  }}
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <h2 style={{ color: '#FFF', fontSize: 22, margin: '0 0 4px', fontWeight: 700 }}>
                  Get Started with I V I R A
                </h2>
                <p style={{ color: '#777', fontSize: 14, margin: '0 0 24px' }}>
                  Fill in your details and we'll get you set up.
                </p>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={labelStyle}>Your Name</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={handleChange('name')}
                      placeholder="Rahul Sharma"
                      required
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Gym Name</label>
                    <input
                      type="text"
                      value={form.gym_name}
                      onChange={handleChange('gym_name')}
                      placeholder="Iron Paradise Fitness"
                      required
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Phone</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <span style={{
                        ...inputStyle, width: 60, flexShrink: 0,
                        textAlign: 'center', color: '#666', cursor: 'default',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        +91
                      </span>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={handleChange('phone')}
                        placeholder="9876543210"
                        required
                        maxLength={10}
                        style={{ ...inputStyle, flex: 1 }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={labelStyle}>Email</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={handleChange('email')}
                      placeholder="rahul@ironparadise.com"
                      required
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Package Interest</label>
                    <select
                      value={form.package_interest}
                      onChange={handleChange('package_interest')}
                      style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}
                    >
                      {PACKAGES.map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>

                  <label style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    marginBottom: 20, cursor: 'pointer', fontSize: 12,
                    color: 'rgba(255,255,255,0.5)', fontFamily: "'Inter', -apple-system, sans-serif",
                    lineHeight: 1.5,
                  }}>
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={e => setConsent(e.target.checked)}
                      style={{ marginTop: 2, accentColor: '#1A3A8F', flexShrink: 0 }}
                    />
                    <span>
                      I consent to I V I R A processing my personal data as per the{' '}
                      <a href="/privacy" target="_blank" style={{ color: '#1A3A8F', textDecoration: 'none' }}>Privacy Policy</a>{' '}
                      and <a href="/terms" target="_blank" style={{ color: '#1A3A8F', textDecoration: 'none' }}>Terms of Service</a>,
                      in compliance with applicable privacy laws.
                    </span>
                  </label>

                  {error && (
                    <p style={{ color: '#EF4444', fontSize: 13, margin: 0 }}>{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={!consent || submitting}
                    style={{
                      width: '100%',
                      padding: '14px 0',
                      background: (!consent || submitting) ? '#5B21B6' : '#1A3A8F',
                      color: '#FFF',
                      border: 'none',
                      borderRadius: 10,
                      fontSize: 15,
                      fontWeight: 600,
                      cursor: (!consent || submitting) ? 'not-allowed' : 'pointer',
                      opacity: !consent ? 0.5 : 1,
                      transition: 'background 0.2s, opacity 0.2s',
                      marginTop: 4,
                    }}
                  >
                    {submitting ? 'Submitting...' : 'Request a Demo'}
                  </button>
                </form>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
