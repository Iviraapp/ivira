import config from '../config/index.js';

/**
 * Geocode an address string to lat/lng using the Google Geocoding API.
 * Returns null if the API is not configured or the address cannot be resolved.
 *
 * The `region` bias defaults to 'in' (India) since that is the primary market,
 * but the function works globally — pass a different regionBias if needed.
 */
export async function geocodeAddress(address, regionBias = 'in') {
  if (!config.googlePlaces.enabled || !config.googlePlaces.apiKey) return null;
  if (!address || !address.trim()) return null;

  const url =
    `https://maps.googleapis.com/maps/api/geocode/json` +
    `?address=${encodeURIComponent(address.trim())}` +
    `&key=${config.googlePlaces.apiKey}` +
    `&region=${regionBias}`;

  let data;
  try {
    const res = await fetch(url);
    data = await res.json();
  } catch {
    return null;
  }

  if (data.status !== 'OK' || !data.results?.[0]) return null;

  const result = data.results[0];
  const loc = result.geometry?.location;
  if (!loc) return null;

  let city = null;
  let state = null;
  let country = null;

  for (const comp of result.address_components || []) {
    if (comp.types.includes('locality')) city = comp.long_name;
    else if (comp.types.includes('administrative_area_level_2') && !city) city = comp.long_name;
    if (comp.types.includes('administrative_area_level_1')) state = comp.long_name;
    if (comp.types.includes('country')) country = comp.short_name; // e.g. "IN", "US"
  }

  return {
    lat: loc.lat,
    lng: loc.lng,
    city: city ? city.toLowerCase().trim() : null,
    state: state || null,
    country: country || null,
    formattedAddress: result.formatted_address || null,
  };
}
