import config from '../config/index.js';
import { ValidationError } from '../utils/errors.js';

const API_KEY = config.googlePlaces.apiKey;
const PLACES_V1 = 'https://places.googleapis.com/v1/places';

/**
 * Search for nearby gyms using Places API (New) — Nearby Search.
 */
export async function searchNearbyGyms({ lat, lng, radius = 5000, pageToken } = {}) {
  if (!API_KEY) {
    throw new ValidationError(
      'Google Places API key not configured. Set GOOGLE_PLACES_API_KEY in your .env file.'
    );
  }
  if (!lat || !lng) {
    throw new ValidationError('Latitude and longitude are required');
  }

  const body = {
    includedTypes: ['gym'],
    maxResultCount: 20,
    locationRestriction: {
      circle: {
        center: { latitude: parseFloat(lat), longitude: parseFloat(lng) },
        radius: Math.min(50000, Math.max(500, parseInt(radius, 10) || 5000)),
      },
    },
  };

  if (pageToken) {
    body.pageToken = pageToken;
  }

  const res = await fetch(`${PLACES_V1}:searchNearby`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.currentOpeningHours,places.photos,places.businessStatus,places.shortFormattedAddress',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ValidationError(
      `Google Places API error: ${err.error?.message || res.status}`
    );
  }

  const data = await res.json();
  const gyms = (data.places || []).map((place) => normalizePlaceNew(place, lat, lng));

  return {
    gyms,
    nextPageToken: data.nextPageToken || null,
    total: gyms.length,
    source: 'google_places',
  };
}

/**
 * Get detailed info about a specific place (New API).
 */
export async function getPlaceDetails(placeId) {
  if (!API_KEY) throw new ValidationError('Google Places API key not configured');
  if (!placeId) throw new ValidationError('Place ID is required');

  const res = await fetch(`${PLACES_V1}/${placeId}`, {
    headers: {
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': 'id,displayName,formattedAddress,nationalPhoneNumber,location,rating,userRatingCount,currentOpeningHours,photos,reviews,websiteUri,types,businessStatus',
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ValidationError(`Place not found: ${err.error?.message || res.status}`);
  }

  const place = await res.json();

  return {
    place_id: place.id,
    gym_name: place.displayName?.text || '',
    address: place.formattedAddress || '',
    phone: place.nationalPhoneNumber || null,
    website: place.websiteUri || null,
    latitude: place.location?.latitude,
    longitude: place.location?.longitude,
    avg_rating: place.rating || 0,
    review_count: place.userRatingCount || 0,
    business_status: place.businessStatus || 'OPERATIONAL',
    opening_hours: (place.currentOpeningHours?.weekdayDescriptions) || [],
    is_open_now: place.currentOpeningHours?.openNow ?? null,
    photos: (place.photos || []).slice(0, 5).map((p) => ({
      reference: p.name, // e.g. "places/PLACE_ID/photos/PHOTO_REF"
      width: p.widthPx,
      height: p.heightPx,
    })),
    reviews: (place.reviews || []).slice(0, 5).map((r) => ({
      author: r.authorAttribution?.displayName || 'Anonymous',
      rating: r.rating,
      text: r.text?.text || '',
      time: r.relativePublishTimeDescription || '',
    })),
    source: 'google_places',
  };
}

/**
 * Get a photo URL via the new Places API photo endpoint.
 * New API format: GET https://places.googleapis.com/v1/{photo_name}/media?maxWidthPx=400&key=KEY
 */
export function getPhotoUrl(photoName, maxWidth = 400) {
  if (!API_KEY) throw new ValidationError('Google Places API key not configured');
  if (!photoName) throw new ValidationError('Photo name is required');

  return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidth}&key=${API_KEY}&skipHttpRedirect=true`;
}

/**
 * Search gyms by text query (New API — Text Search).
 */
export async function textSearchGyms({ query, lat, lng }) {
  if (!API_KEY) throw new ValidationError('Google Places API key not configured');
  if (!query) throw new ValidationError('Search query is required');

  const body = {
    textQuery: `gyms in ${query}`,
    includedType: 'gym',
    languageCode: 'en',
  };

  if (lat && lng) {
    body.locationBias = {
      circle: {
        center: { latitude: parseFloat(lat), longitude: parseFloat(lng) },
        radius: 10000,
      },
    };
  }

  const res = await fetch(`${PLACES_V1}:searchText`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.currentOpeningHours,places.photos,places.businessStatus,places.shortFormattedAddress',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ValidationError(
      `Google Places API error: ${err.error?.message || res.status}`
    );
  }

  const data = await res.json();
  const gyms = (data.places || []).map((place) => normalizePlaceNew(place, lat, lng));

  return {
    gyms,
    nextPageToken: data.nextPageToken || null,
    total: gyms.length,
    source: 'google_places',
  };
}

/**
 * Normalize a new Places API result into our internal gym format.
 */
function normalizePlaceNew(place, userLat, userLng) {
  const lat = place.location?.latitude;
  const lng = place.location?.longitude;

  let distance_km = null;
  if (userLat && userLng && lat && lng) {
    distance_km = haversineKm(parseFloat(userLat), parseFloat(userLng), lat, lng);
  }

  return {
    id: place.id,
    place_id: place.id,
    gym_name: place.displayName?.text || '',
    address: place.formattedAddress || '',
    city: extractCityNew(place),
    area: place.shortFormattedAddress || '',
    latitude: lat,
    longitude: lng,
    avg_rating: place.rating || 0,
    review_count: place.userRatingCount || 0,
    is_open_now: place.currentOpeningHours?.openNow ?? null,
    photo_reference: place.photos?.[0]?.name || null,
    business_status: place.businessStatus || 'OPERATIONAL',
    distance_km,
    amenities: [],
    photos: [],
    description: null,
    day_pass_paise: 0,
    accepts_day_pass: false,
    source: 'google_places',
  };
}

function extractCityNew(place) {
  if (place.formattedAddress) {
    const parts = place.formattedAddress.split(',').map((s) => s.trim());
    if (parts.length >= 3) return parts[parts.length - 3];
  }
  return '';
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (v) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
