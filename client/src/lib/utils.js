export function formatPaise(paise) {
  const rupees = (paise || 0) / 100
  return '₹' + rupees.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatTime(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—'
  return formatDate(dateStr) + ', ' + formatTime(dateStr)
}

export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

export function getInitials(name) {
  if (!name) return '?'
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function statusColor(status) {
  const map = {
    active: 'success',
    expired: 'error',
    paused: 'warning',
    suspended: 'error',
    inactive: 'neutral',
    trial: 'primary',
    captured: 'success',
    pending: 'warning',
    failed: 'error',
    paid: 'success',
  }
  return map[status] || 'neutral'
}

export function debounce(fn, ms = 300) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }
}
