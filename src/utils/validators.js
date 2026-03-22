// Indian phone number: 10 digits, optionally prefixed with +91 or 91
const INDIAN_PHONE_REGEX = /^(?:\+?91)?[6-9]\d{9}$/;

export function normalizePhone(phone) {
  const digits = phone.replace(/\D/g, '');
  // Remove leading 91 country code if present
  const local = digits.length === 12 && digits.startsWith('91')
    ? digits.slice(2)
    : digits;
  if (!/^[6-9]\d{9}$/.test(local)) {
    throw new Error('Invalid Indian phone number');
  }
  return `+91${local}`;
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Haversine distance in meters between two lat/lng points
export function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function generateOTP(length = 6) {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
}
