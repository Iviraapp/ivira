// Web-safe haptics wrapper
// expo-haptics has a web shim, so we can import it directly
// but wrap calls in try/catch for safety
export async function impact(style) {
  try {
    const H = require('expo-haptics')
    await H.impactAsync(style || H.ImpactFeedbackStyle.Light)
  } catch {}
}

export async function notification(type) {
  try {
    const H = require('expo-haptics')
    await H.notificationAsync(type || H.NotificationFeedbackType.Success)
  } catch {}
}

export async function selection() {
  try {
    const H = require('expo-haptics')
    await H.selectionAsync()
  } catch {}
}

// Re-export types for convenience
export const ImpactFeedbackStyle = { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' }
export const NotificationFeedbackType = { Success: 'Success', Warning: 'Warning', Error: 'Error' }

const Haptics = {
  impactAsync: impact,
  notificationAsync: notification,
  selectionAsync: selection,
  ImpactFeedbackStyle,
  NotificationFeedbackType,
}

export default Haptics
