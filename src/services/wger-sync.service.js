/**
 * wger Exercise Database Sync Service
 *
 * Fetches exercises, images, videos, and muscle data from wger.de public API
 * and upserts into our exercises table. No auth needed for read-only access.
 *
 * API docs: https://wger.de/api/v2/
 */

const WGER_BASE = 'https://wger.de/api/v2';
const LANGUAGE_EN = 2; // English language ID in wger

// wger category ID → our category mapping
const CATEGORY_MAP = {
  8:  'arms',       // Arms
  9:  'legs',       // Legs
  10: 'core',       // Abs
  11: 'chest',      // Chest
  12: 'back',       // Back
  13: 'shoulders',  // Shoulders
  14: 'legs',       // Calves → legs
  15: 'cardio',     // Cardio (if exists)
};

// wger equipment ID → our equipment mapping
const EQUIPMENT_MAP = {
  1: 'barbell',
  3: 'dumbbell',
  4: 'machine',    // Gym mat → bodyweight-ish, but map to general
  5: 'machine',    // Swiss Ball
  6: 'bodyweight', // Pull-up bar (bodyweight exercise)
  7: 'bodyweight', // none (bodyweight)
  8: 'machine',    // Bench
  9: 'machine',    // Incline bench
  10: 'kettlebell',
  // Not in their list but we support:
  // cable, band
};

/**
 * Fetch all pages from a wger paginated endpoint.
 */
async function fetchAllPages(endpoint, params = {}) {
  const results = [];
  let url = `${WGER_BASE}${endpoint}?format=json&limit=100`;
  for (const [k, v] of Object.entries(params)) {
    url += `&${k}=${v}`;
  }

  while (url) {
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) throw new Error(`wger API ${res.status}: ${url}`);
    const data = await res.json();
    results.push(...(data.results || []));
    url = data.next || null;
  }
  return results;
}

/**
 * Fetch muscle definitions (id, name, SVG image URLs).
 */
async function fetchMuscles() {
  const muscles = await fetchAllPages('/muscle/');
  const map = new Map();
  for (const m of muscles) {
    map.set(m.id, {
      id: m.id,
      name: m.name_en || m.name,
      image_url_front: m.image_url_main ? `https://wger.de${m.image_url_main}` : null,
      image_url_back: m.image_url_secondary ? `https://wger.de${m.image_url_secondary}` : null,
    });
  }
  return map;
}

/**
 * Fetch exercise images grouped by exercise ID.
 */
async function fetchImages() {
  const images = await fetchAllPages('/exerciseimage/', { is_main: 'True' });
  const secondaryImages = await fetchAllPages('/exerciseimage/', { is_main: 'False' });

  const map = new Map(); // exerciseBase → { main, secondary }
  for (const img of images) {
    const existing = map.get(img.exercise_base) || {};
    if (!existing.main) existing.main = img.image;
    map.set(img.exercise_base, existing);
  }
  for (const img of secondaryImages) {
    const existing = map.get(img.exercise_base) || {};
    if (!existing.secondary) existing.secondary = img.image;
    map.set(img.exercise_base, existing);
  }
  return map;
}

/**
 * Fetch exercise videos grouped by exercise ID.
 */
async function fetchVideos() {
  const videos = await fetchAllPages('/video/');
  const map = new Map();
  for (const v of videos) {
    if (!map.has(v.exercise_base)) {
      map.set(v.exercise_base, v.video);
    }
  }
  return map;
}

/**
 * Fetch exercise aliases grouped by exercise ID.
 */
async function fetchAliases() {
  const aliases = await fetchAllPages('/exercisealias/');
  const map = new Map();
  for (const a of aliases) {
    if (!map.has(a.exercise)) {
      map.set(a.exercise, []);
    }
    map.get(a.exercise).push(a.alias);
  }
  return map;
}

/**
 * Sync all wger exercises into our database.
 * Uses exerciseinfo endpoint for rich data per exercise.
 *
 * @param {import('knex').Knex} db - Knex database instance
 * @returns {{ inserted: number, updated: number, skipped: number }}
 */
export async function syncExercises(db) {
  console.log('[wger-sync] Starting exercise sync...');

  // Fetch supporting data in parallel
  const [muscleMap, imageMap, videoMap, aliasMap] = await Promise.all([
    fetchMuscles(),
    fetchImages(),
    fetchVideos(),
    fetchAliases(),
  ]);

  console.log(`[wger-sync] Loaded ${muscleMap.size} muscles, ${imageMap.size} images, ${videoMap.size} videos`);

  // Fetch all exercises (English translations)
  const translations = await fetchAllPages('/exercise-translation/', { language: LANGUAGE_EN });

  // Also fetch exercise base data for category, equipment, muscles
  const exerciseBases = await fetchAllPages('/exercise/');
  const baseMap = new Map();
  for (const base of exerciseBases) {
    baseMap.set(base.id, base);
  }

  console.log(`[wger-sync] Fetched ${translations.length} English exercises, ${exerciseBases.length} bases`);

  let inserted = 0, updated = 0, skipped = 0;

  for (const trans of translations) {
    const baseId = trans.exercise;
    const base = baseMap.get(baseId);
    if (!base) { skipped++; continue; }

    // Skip if no English name
    const name = (trans.name || '').trim();
    if (!name) { skipped++; continue; }

    // Map category
    const category = CATEGORY_MAP[base.category] || 'full_body';

    // Map equipment (take first)
    const equipmentIds = base.equipment || [];
    const equipment = equipmentIds.length > 0
      ? (EQUIPMENT_MAP[equipmentIds[0]] || 'bodyweight')
      : 'bodyweight';

    // Map muscles
    const primaryMuscles = (base.muscles || [])
      .map(id => muscleMap.get(id))
      .filter(Boolean);
    const secondaryMuscles = (base.muscles_secondary || [])
      .map(id => muscleMap.get(id))
      .filter(Boolean);

    // Primary muscle group name
    const muscleGroup = primaryMuscles.length > 0
      ? primaryMuscles[0].name.toLowerCase()
      : category;

    // Images and videos
    const images = imageMap.get(baseId) || {};
    const videoUrl = videoMap.get(baseId) || null;
    const aliases = aliasMap.get(baseId) || [];

    // Strip HTML tags for plain instructions, keep HTML for description_html
    const descHtml = (trans.description || '').trim();
    const instructions = descHtml.replace(/<[^>]*>/g, '').trim() || null;

    const exerciseData = {
      name,
      category,
      equipment,
      muscle_group: muscleGroup,
      instructions,
      is_default: true,
      gym_id: null,
      wger_id: baseId,
      image_url: images.main || null,
      image_url_secondary: images.secondary || null,
      video_url: videoUrl,
      muscles_primary: JSON.stringify(primaryMuscles),
      muscles_secondary: JSON.stringify(secondaryMuscles),
      description_html: descHtml || null,
      aliases: JSON.stringify(aliases),
    };

    // Upsert by wger_id
    const existing = await db('exercises').where({ wger_id: baseId }).first();
    if (existing) {
      await db('exercises').where({ id: existing.id }).update({
        ...exerciseData,
        updated_at: new Date(),
      });
      updated++;
    } else {
      await db('exercises').insert(exerciseData);
      inserted++;
    }
  }

  console.log(`[wger-sync] Done: ${inserted} inserted, ${updated} updated, ${skipped} skipped`);
  return { inserted, updated, skipped };
}

/**
 * Get exercise categories with muscle SVG data.
 */
export async function getExerciseCategories(db) {
  const exercises = await db('exercises')
    .where({ is_default: true })
    .whereNotNull('wger_id')
    .select('category')
    .groupBy('category')
    .count('* as count');

  return exercises;
}

/**
 * Get all unique muscles from synced exercises.
 */
export async function getMuscleList(db) {
  const exercises = await db('exercises')
    .whereNotNull('wger_id')
    .whereNotNull('muscles_primary')
    .select('muscles_primary');

  const muscleMap = new Map();
  for (const ex of exercises) {
    const muscles = typeof ex.muscles_primary === 'string'
      ? JSON.parse(ex.muscles_primary)
      : ex.muscles_primary;
    for (const m of muscles) {
      if (!muscleMap.has(m.id)) muscleMap.set(m.id, m);
    }
  }
  return Array.from(muscleMap.values());
}
