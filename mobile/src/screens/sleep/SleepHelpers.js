// Pure helper functions for sleep calculations

export function calcDurationMinutes(bedHour, bedMin, wakeHour, wakeMin) {
  let bedTotal = bedHour * 60 + bedMin
  let wakeTotal = wakeHour * 60 + wakeMin
  if (wakeTotal <= bedTotal) wakeTotal += 24 * 60
  return wakeTotal - bedTotal
}

export function formatDuration(minutes) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}h ${m.toString().padStart(2, '0')}m`
}

export function formatTime12(hour, min) {
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const h = hour % 12 || 12
  return `${h}:${min.toString().padStart(2, '0')} ${ampm}`
}

export function getDayLabel(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function getDayOfWeekIdx(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.getDay() === 0 ? 6 : d.getDay() - 1
}

export function calcSleepScore(log, allLogs, goalHours) {
  const duration = calcDurationMinutes(log.bedHour, log.bedMin, log.wakeHour, log.wakeMin)
  const durationHours = duration / 60

  let durationScore = 0
  if (durationHours >= goalHours - 0.5 && durationHours <= goalHours + 1) {
    durationScore = 40
  } else if (durationHours < goalHours - 0.5) {
    durationScore = Math.max(0, 40 * (durationHours / goalHours))
  } else {
    durationScore = Math.max(0, 40 - (durationHours - goalHours - 1) * 8)
  }

  const qualityScore = ((log.quality - 1) / 4) * 30

  let consistencyScore = 15
  if (allLogs.length >= 3) {
    const bedtimes = allLogs.slice(0, 7).map(l => {
      let t = l.bedHour * 60 + l.bedMin
      if (t < 720) t += 1440
      return t
    })
    const avg = bedtimes.reduce((a, b) => a + b, 0) / bedtimes.length
    const variance = bedtimes.reduce((s, t) => s + Math.pow(t - avg, 2), 0) / bedtimes.length
    const stdDev = Math.sqrt(variance)
    consistencyScore = Math.max(0, Math.min(30, 30 * (1 - stdDev / 90)))
  }

  return Math.round(Math.min(100, durationScore + qualityScore + consistencyScore))
}

export function computeInsights(logs, goalHours) {
  if (logs.length === 0) return null
  const durations = logs.map(l => calcDurationMinutes(l.bedHour, l.bedMin, l.wakeHour, l.wakeMin))

  const bedtimes = logs.map(l => {
    let t = l.bedHour * 60 + l.bedMin
    if (t < 720) t += 1440
    return t
  })
  const avgBedtime = Math.round(bedtimes.reduce((a, b) => a + b, 0) / bedtimes.length)
  const avgBedHour = Math.floor((avgBedtime % 1440) / 60)
  const avgBedMin = avgBedtime % 60

  const waketimes = logs.map(l => l.wakeHour * 60 + l.wakeMin)
  const avgWaketime = Math.round(waketimes.reduce((a, b) => a + b, 0) / waketimes.length)
  const avgWakeHour = Math.floor(avgWaketime / 60)
  const avgWakeMin = avgWaketime % 60

  const avgDuration = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
  const bestIdx = durations.indexOf(Math.max(...durations))
  const worstIdx = durations.indexOf(Math.min(...durations))

  const scores = logs.map(l => calcSleepScore(l, logs, goalHours))
  const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)

  return {
    avgBedtime: formatTime12(avgBedHour, avgBedMin),
    avgWakeTime: formatTime12(avgWakeHour, avgWakeMin),
    avgDuration: formatDuration(avgDuration),
    avgDurationMin: avgDuration,
    avgScore,
    bestNight: logs[bestIdx] ? getDayLabel(logs[bestIdx].date) : '-',
    bestDuration: formatDuration(durations[bestIdx] || 0),
    worstNight: logs[worstIdx] ? getDayLabel(logs[worstIdx].date) : '-',
    worstDuration: formatDuration(durations[worstIdx] || 0),
  }
}

export function computeSleepDebt(logs, goalHours, days = 7) {
  const recent = logs.slice(0, days)
  const totalSlept = recent.reduce((sum, l) => {
    return sum + calcDurationMinutes(l.bedHour, l.bedMin, l.wakeHour, l.wakeMin)
  }, 0)
  const totalGoal = recent.length * goalHours * 60
  return Math.max(0, (totalGoal - totalSlept) / 60) // hours of debt
}

export function getWeeklyBarData(logs) {
  const bars = Array.from({ length: 7 }, () => ({ hours: 0, score: 0 }))
  const now = new Date()
  for (let i = 0; i < 7; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() - (6 - i))
    const dateStr = d.toISOString().split('T')[0]
    const log = logs.find(l => l.date === dateStr)
    if (log) {
      bars[i].hours = calcDurationMinutes(log.bedHour, log.bedMin, log.wakeHour, log.wakeMin) / 60
      bars[i].score = log.sleepScore || 0
      bars[i].date = dateStr
    }
  }
  return bars
}

export function generateDemoData() {
  const logs = []
  const now = new Date()
  for (let i = 0; i < 7; i++) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    const bedHour = 22 + Math.floor(Math.random() * 2)
    const bedMin = Math.floor(Math.random() * 60)
    const wakeHour = 5 + Math.floor(Math.random() * 2)
    const wakeMin = 30 + Math.floor(Math.random() * 30)
    const quality = Math.floor(Math.random() * 3) + 3
    logs.push({ id: `sleep-${dateStr}`, date: dateStr, bedHour, bedMin, wakeHour, wakeMin, quality, createdAt: date.toISOString() })
  }
  return logs
}

export function mapBackendLog(log) {
  const bedtime = log.bedtime ? new Date(log.bedtime) : null
  const wakeTime = log.wake_time ? new Date(log.wake_time) : null
  return {
    id: log.id,
    date: log.date || (bedtime ? bedtime.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
    bedHour: bedtime ? bedtime.getHours() : 22,
    bedMin: bedtime ? bedtime.getMinutes() : 0,
    wakeHour: wakeTime ? wakeTime.getHours() : 6,
    wakeMin: wakeTime ? wakeTime.getMinutes() : 0,
    quality: log.quality_rating || 3,
    sleepScore: log.sleep_score,
    deepMinutes: log.deep_minutes,
    remMinutes: log.rem_minutes,
    lightMinutes: log.light_minutes,
    awakeMinutes: log.awake_minutes,
    efficiency: log.efficiency,
    onsetLatency: log.onset_latency,
    awakenings: log.awakenings,
    sleepCycles: log.sleep_cycles,
    stageTimeline: log.stage_timeline,
    audioEvents: log.audio_events,
    source: log.source,
    notes: log.notes,
    tags: parseTags(log.notes),
    createdAt: log.created_at,
  }
}

export function parseTags(notes) {
  if (!notes) return []
  const match = notes.match(/\[tags:([^\]]+)\]/)
  return match ? match[1].split(',').filter(Boolean) : []
}

export function serializeTags(tags, existingNotes) {
  const base = (existingNotes || '').replace(/\[tags:[^\]]*\]/, '').trim()
  if (!tags || tags.length === 0) return base
  return `${base} [tags:${tags.join(',')}]`.trim()
}

export function buildBackendPayload(log) {
  const bedtime = new Date()
  bedtime.setHours(log.bedHour, log.bedMin, 0, 0)
  if (log.bedHour >= 12) bedtime.setDate(bedtime.getDate() - 1)
  const wakeTime = new Date()
  wakeTime.setHours(log.wakeHour, log.wakeMin, 0, 0)

  return {
    bedtime: bedtime.toISOString(),
    wake_time: wakeTime.toISOString(),
    quality_rating: log.quality,
    sleep_score: log.sleepScore,
    notes: log.notes || '',
    deep_minutes: log.deepMinutes,
    rem_minutes: log.remMinutes,
    light_minutes: log.lightMinutes,
    awake_minutes: log.awakeMinutes,
    efficiency: log.efficiency,
    onset_latency: log.onsetLatency,
    awakenings: log.awakenings,
    sleep_cycles: log.sleepCycles,
    stage_timeline: log.stageTimeline,
    audio_events: log.audioEvents,
    source: log.source || 'manual',
  }
}
