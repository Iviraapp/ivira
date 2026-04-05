/**
 * Triple Waterfall Barcode Scanner
 *
 * Tier 1 → Open Food Facts  (free, global, no key)
 * Tier 2 → USDA FDC         (free, US branded foods, API key)
 * Tier 3 → FatSecret         (OAuth 2.0, broad coverage)
 *
 * All three normalise into: { name, brand, barcode, image, source, per100g, serving_size }
 */

// ──────────────────────────────────────────────
// 🔑  Keys — loaded from .env
// ──────────────────────────────────────────────
const USDA_API_KEY            = process.env.EXPO_PUBLIC_USDA_API_KEY             || ''
const FATSECRET_CLIENT_ID     = process.env.EXPO_PUBLIC_FATSECRET_CLIENT_ID     || ''
const FATSECRET_CLIENT_SECRET = process.env.EXPO_PUBLIC_FATSECRET_CLIENT_SECRET || ''

if (!USDA_API_KEY && __DEV__) console.warn('[FoodApi] EXPO_PUBLIC_USDA_API_KEY not set — USDA lookups disabled')
if (!FATSECRET_CLIENT_ID && __DEV__) console.warn('[FoodApi] EXPO_PUBLIC_FATSECRET_CLIENT_ID not set — FatSecret lookups disabled')

// FatSecret bearer token cache
let _fsToken = null
let _fsTokenExpiry = 0

// ──────────────────────────────────────────────
// UPC-A 12 → EAN-13 padding
// ──────────────────────────────────────────────
export function padBarcode(raw) {
  return raw.length === 12 ? '0' + raw : raw
}

// ══════════════════════════════════════════════
//  TIER 1 — Open Food Facts
// ══════════════════════════════════════════════
async function fetchOpenFoodFacts(barcode) {
  const ean = padBarcode(barcode)
  const res = await fetch(
    `https://world.openfoodfacts.org/api/v0/product/${ean}.json`
  )
  const json = await res.json()

  if (json.status !== 1 || !json.product) return null
  return parseNutritionData(json, 'openfoodfacts', barcode)
}

// ══════════════════════════════════════════════
//  TIER 2 — USDA FoodData Central (Branded Foods)
// ══════════════════════════════════════════════
async function fetchUSDA(barcode) {
  if (!USDA_API_KEY) return null

  // USDA search by GTIN/UPC — try both raw and padded
  const queries = [barcode]
  const padded = padBarcode(barcode)
  if (padded !== barcode) queries.push(padded)

  for (const q of queries) {
    const res = await fetch(
      `https://api.nal.usda.gov/fdc/v1/foods/search?query=${q}&dataType=Branded&pageSize=1&api_key=${USDA_API_KEY}`
    )
    if (!res.ok) continue
    const json = await res.json()

    if (json.foods?.length > 0) {
      return parseNutritionData(json, 'usda', barcode)
    }
  }
  return null
}

// ══════════════════════════════════════════════
//  TIER 3 — FatSecret (OAuth 2.0 → REST)
// ══════════════════════════════════════════════

async function getFatSecretToken() {
  if (!FATSECRET_CLIENT_ID || !FATSECRET_CLIENT_SECRET) return null

  // Reuse cached token if still valid (refresh 1 min before expiry)
  if (_fsToken && Date.now() < _fsTokenExpiry - 60_000) return _fsToken

  const res = await fetch('https://oauth.fatsecret.com/connect/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=client_credentials&client_id=${FATSECRET_CLIENT_ID}&client_secret=${FATSECRET_CLIENT_SECRET}&scope=basic`,
  })

  if (!res.ok) return null
  const json = await res.json()
  _fsToken = json.access_token
  _fsTokenExpiry = Date.now() + (json.expires_in || 86400) * 1000
  return _fsToken
}

async function fetchFatSecret(barcode) {
  const token = await getFatSecretToken()
  if (!token) return null

  // food.barcode.get.v2 — single-call barcode lookup
  const res = await fetch(
    `https://platform.fatsecret.com/rest/food/barcode/find-by-id/v1?barcode=${barcode}&format=json`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) return null
  const idJson = await res.json()
  const foodId = idJson?.food_id?.value ?? idJson?.food_id
  if (!foodId) return null

  // Fetch full nutrition
  const foodRes = await fetch(
    `https://platform.fatsecret.com/rest/food/v4?food_id=${foodId}&format=json`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!foodRes.ok) return null
  const foodJson = await foodRes.json()
  return parseNutritionData(foodJson, 'fatsecret', barcode)
}

// ══════════════════════════════════════════════
//  NORMALIZER — 3 shapes → 1 IVIRA format
// ══════════════════════════════════════════════
export function parseNutritionData(response, source, barcode) {
  switch (source) {

    // ── Open Food Facts ──────────────────────
    case 'openfoodfacts': {
      const p = response.product
      const n = p.nutriments || {}
      const kcal = n['energy-kcal_100g']
        ?? (n['energy_100g'] ? Math.round(n['energy_100g'] / 4.184) : 0)
      return {
        name:    p.product_name || p.product_name_en || 'Unknown Product',
        brand:   p.brands || '',
        barcode: barcode || p.code || '',
        image:   p.image_url || p.image_small_url || p.image_front_small_url || null,
        source:  'openfoodfacts',
        per100g: {
          calories: Math.round(kcal),
          protein:  Math.round((n['proteins_100g']      || 0) * 10) / 10,
          carbs:    Math.round((n['carbohydrates_100g']  || 0) * 10) / 10,
          fats:     Math.round((n['fat_100g']            || 0) * 10) / 10,
        },
        serving_size: p.serving_size || '100g',
      }
    }

    // ── USDA FoodData Central ────────────────
    case 'usda': {
      const food = response.foods[0]
      const nuts = food.foodNutrients || []

      // USDA nutrient IDs: 1008=Energy(kcal), 1003=Protein, 1005=Carbs, 1004=Fat
      const findNutrient = (id) => {
        const n = nuts.find(n => n.nutrientId === id)
        return n ? (n.value || 0) : 0
      }

      // USDA values are per servingSize or per 100g depending on the entry
      // Branded foods are typically per 100g already
      const servingSizeG = food.servingSize || 100
      const servingSizeUnit = food.servingSizeUnit || 'g'
      const isPerServing = servingSizeUnit === 'g' && servingSizeG !== 100

      const rawCal  = findNutrient(1008)
      const rawProt = findNutrient(1003)
      const rawCarb = findNutrient(1005)
      const rawFat  = findNutrient(1004)

      // Normalise to per-100g
      const factor = isPerServing ? (100 / servingSizeG) : 1

      return {
        name:    food.description || food.brandName || 'Unknown Product',
        brand:   food.brandName || food.brandOwner || '',
        barcode: barcode || food.gtinUpc || '',
        image:   null,
        source:  'usda',
        per100g: {
          calories: Math.round(rawCal  * factor),
          protein:  Math.round(rawProt * factor * 10) / 10,
          carbs:    Math.round(rawCarb * factor * 10) / 10,
          fats:     Math.round(rawFat  * factor * 10) / 10,
        },
        serving_size: food.householdServingFullText
          || (servingSizeG !== 100 ? `${servingSizeG}${servingSizeUnit}` : '100g'),
      }
    }

    // ── FatSecret ────────────────────────────
    case 'fatsecret': {
      const food = response.food || response
      const servings = food.servings?.serving
      const s = Array.isArray(servings)
        ? (servings.find(sv => sv.metric_serving_unit === 'g' && Number(sv.metric_serving_amount) === 100) || servings[0])
        : servings
      if (!s) return null

      const metricG = parseFloat(s.metric_serving_amount) || 100
      const factor = 100 / metricG
      return {
        name:    food.food_name || 'Unknown Product',
        brand:   food.brand_name || '',
        barcode: barcode || '',
        image:   null,
        source:  'fatsecret',
        per100g: {
          calories: Math.round((parseFloat(s.calories)     || 0) * factor),
          protein:  Math.round((parseFloat(s.protein)      || 0) * factor * 10) / 10,
          carbs:    Math.round((parseFloat(s.carbohydrate) || 0) * factor * 10) / 10,
          fats:     Math.round((parseFloat(s.fat)          || 0) * factor * 10) / 10,
        },
        serving_size: s.serving_description || `${metricG}g`,
      }
    }

    default:
      return null
  }
}

// ══════════════════════════════════════════════
//  WATERFALL — fast, silent, tier-by-tier
// ══════════════════════════════════════════════
export async function waterfallLookup(rawBarcode) {
  // Tier 1 — Open Food Facts (free, global)
  try {
    const r = await fetchOpenFoodFacts(rawBarcode)
    if (r) return r
  } catch { /* silent fallthrough */ }

  // Tier 2 — USDA FDC (free, strong US branded coverage)
  try {
    const r = await fetchUSDA(rawBarcode)
    if (r) return r
  } catch { /* silent fallthrough */ }

  // Tier 3 — FatSecret (OAuth, broad)
  try {
    const r = await fetchFatSecret(rawBarcode)
    if (r) return r
  } catch { /* silent fallthrough */ }

  // All 3 tiers exhausted → caller triggers manual entry
  return null
}

// ══════════════════════════════════════════════
//  TEXT SEARCH (Open Food Facts + USDA combo)
// ══════════════════════════════════════════════
export async function searchByText(query) {
  const encoded = encodeURIComponent(query.trim())

  // Try OFF first
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encoded}&search_simple=1&action=process&json=1&page_size=5&fields=product_name,product_name_en,brands,image_url,image_small_url,image_front_small_url,nutriments,serving_size,code`
    )
    const json = await res.json()
    if (json.products?.length > 0) {
      const best = json.products.find(p => p.product_name || p.product_name_en) || json.products[0]
      return parseNutritionData({ product: best }, 'openfoodfacts', best.code)
    }
  } catch { /* fall through */ }

  // Fallback to USDA text search
  if (USDA_API_KEY) {
    try {
      const res = await fetch(
        `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encoded}&dataType=Branded&pageSize=1&api_key=${USDA_API_KEY}`
      )
      const json = await res.json()
      if (json.foods?.length > 0) {
        return parseNutritionData(json, 'usda', json.foods[0].gtinUpc || '')
      }
    } catch { /* fall through */ }
  }

  return null
}
