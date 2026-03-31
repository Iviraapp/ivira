import Anthropic from '@anthropic-ai/sdk';
import db from '../config/database.js';
import config from '../config/index.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

// ---------------------------------------------------------------------------
// Food Atlas Search
// ---------------------------------------------------------------------------
export async function searchFood(query) {
  if (!query || query.trim().length < 2) {
    throw new ValidationError('Search query must be at least 2 characters');
  }

  const q = `%${query.trim()}%`;
  const results = await db('indian_food_atlas')
    .where('is_active', true)
    .andWhere(function () {
      this.whereILike('food_name', q).orWhereILike('regional_alias', q);
    })
    .orderBy('food_name')
    .limit(20);

  return { items: results, count: results.length };
}

// ---------------------------------------------------------------------------
// Simple regex-based Indian meal parser (offline fallback)
// ---------------------------------------------------------------------------
export async function parseIndianMeal(input) {
  if (!input || !input.trim()) {
    return { items: [], total: { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 } };
  }

  const text = input.trim().toLowerCase();

  // Load the full food atlas for matching
  const atlas = await db('indian_food_atlas').where('is_active', true);

  // Build lookup keyed by various name forms
  const foodLookup = [];
  for (const food of atlas) {
    const keys = [food.food_name.toLowerCase()];
    if (food.regional_alias) keys.push(food.regional_alias.toLowerCase());
    // Also add the short name without parenthetical
    const short = food.food_name.replace(/\s*\(.*?\)\s*/g, '').trim().toLowerCase();
    if (short && short !== keys[0]) keys.push(short);
    foodLookup.push({ food, keys });
  }

  // Sort by key length descending so longer names match first (e.g. "paneer butter masala" before "paneer")
  foodLookup.sort((a, b) => {
    const maxA = Math.max(...a.keys.map(k => k.length));
    const maxB = Math.max(...b.keys.map(k => k.length));
    return maxB - maxA;
  });

  const items = [];
  let remaining = text;

  // First pass: extract "N <unit> <food>" or "N <food>" patterns
  const quantityPattern = /(\d+(?:\.\d+)?)\s*(?:(katori|bowl|plate|glass|cup|scoop|piece|pieces|tablespoon|tablespoons)\s+)?/gi;
  let match;

  // Try to find quantity + food name pairs
  for (const { food, keys } of foodLookup) {
    for (const key of keys) {
      // Pattern: optional quantity before or after the food name
      const qtyBeforePattern = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(?:katori|bowl|plate|glass|cup|scoop|piece|pieces|tablespoon|tablespoons)?\\s*${escapeRegex(key)}`, 'gi');
      const qtyMatch = qtyBeforePattern.exec(remaining);
      if (qtyMatch) {
        const qty = parseFloat(qtyMatch[1]) || 1;
        const multiplier = qty / food.serving_size;
        items.push({
          name: food.food_name,
          quantity: qty,
          unit: food.serving_unit,
          calories: round(food.calories * multiplier),
          protein: round(food.protein * multiplier),
          carbs: round(food.carbs * multiplier),
          fats: round(food.fats * multiplier),
          fiber: round(food.fiber * multiplier),
          atlas_id: food.id,
        });
        remaining = remaining.replace(qtyMatch[0], ' ');
        break;
      }

      // Pattern: just food name (default qty = serving_size)
      const nameIdx = remaining.indexOf(key);
      if (nameIdx !== -1) {
        items.push({
          name: food.food_name,
          quantity: food.serving_size,
          unit: food.serving_unit,
          calories: round(food.calories),
          protein: round(food.protein),
          carbs: round(food.carbs),
          fats: round(food.fats),
          fiber: round(food.fiber),
          atlas_id: food.id,
        });
        remaining = remaining.slice(0, nameIdx) + ' ' + remaining.slice(nameIdx + key.length);
        break;
      }
    }
  }

  const total = {
    calories: items.reduce((s, i) => s + i.calories, 0),
    protein: items.reduce((s, i) => s + i.protein, 0),
    carbs: items.reduce((s, i) => s + i.carbs, 0),
    fats: items.reduce((s, i) => s + i.fats, 0),
    fiber: items.reduce((s, i) => s + i.fiber, 0),
  };

  return { items, total };
}

// ---------------------------------------------------------------------------
// AI-powered meal estimation via Anthropic API
// ---------------------------------------------------------------------------
const NUTRITION_SYSTEM_PROMPT = `You are a nutrition expert. Parse meal descriptions and return JSON with nutritional data. Use standard serving sizes. Return ONLY valid JSON, no extra text. Format: { "items": [{ "name": string, "quantity": number, "unit": string, "calories": number, "protein": number, "carbs": number, "fats": number, "fiber": number }], "total": { "calories": number, "protein": number, "carbs": number, "fats": number, "fiber": number } }`;

export async function estimateWithAI(input) {
  if (!input || !input.trim()) {
    throw new ValidationError('Meal description is required');
  }

  // Try Gemini first (we have the key), then Anthropic, then regex fallback
  if (config.gemini?.enabled) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${config.gemini.apiKey}`,
        {
          method: 'POST',
          signal: AbortSignal.timeout(15000),
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${NUTRITION_SYSTEM_PROMPT}\n\nParse this meal: "${input}"` }] }],
            generationConfig: { maxOutputTokens: 1024 },
          }),
        }
      );
      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const jsonMatch = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').match(/\{[\s\S]*\}/);
        if (jsonMatch) return JSON.parse(jsonMatch[0]);
      }
    } catch { /* fall through */ }
  }

  if (config.anthropic?.apiKey) {
    try {
      const client = new Anthropic({ apiKey: config.anthropic.apiKey });
      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: NUTRITION_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: `Parse this meal: "${input}"` }],
      });
      const text = response.content[0].text;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
    } catch { /* fall through */ }
  }

  // Fallback to regex parser
  return parseIndianMeal(input);
}

// ---------------------------------------------------------------------------
// Log a meal
// ---------------------------------------------------------------------------
export async function logMeal(memberId, gymId, { mealType, rawInput, items, source }) {
  // Verify member exists
  const member = await db('members').where({ id: memberId, gym_id: gymId }).first();
  if (!member) throw new NotFoundError('Member not found');

  const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
  if (mealType && !validMealTypes.includes(mealType)) {
    throw new ValidationError(`meal_type must be one of: ${validMealTypes.join(', ')}`);
  }

  const totalCalories = (items || []).reduce((s, i) => s + (i.calories || 0), 0);
  const totalProtein = (items || []).reduce((s, i) => s + (i.protein || 0), 0);
  const totalCarbs = (items || []).reduce((s, i) => s + (i.carbs || 0), 0);
  const totalFats = (items || []).reduce((s, i) => s + (i.fats || 0), 0);
  const totalFiber = (items || []).reduce((s, i) => s + (i.fiber || 0), 0);

  const today = new Date().toISOString().split('T')[0];

  const [log] = await db('daily_nutrition_logs')
    .insert({
      member_id: memberId,
      gym_id: gymId,
      log_date: today,
      meal_type: mealType || 'snack',
      raw_input: rawInput || '',
      items: JSON.stringify(items || []),
      total_calories: round(totalCalories),
      total_protein: round(totalProtein),
      total_carbs: round(totalCarbs),
      total_fats: round(totalFats),
      total_fiber: round(totalFiber),
      source: source || 'manual',
    })
    .returning('*');

  return log;
}

// ---------------------------------------------------------------------------
// Get daily nutrition log
// ---------------------------------------------------------------------------
export async function getDailyLog(memberId, gymId, date) {
  const logDate = date || new Date().toISOString().split('T')[0];

  const meals = await db('daily_nutrition_logs')
    .where({ member_id: memberId, gym_id: gymId, log_date: logDate })
    .orderBy('created_at', 'asc');

  const totals = {
    calories: meals.reduce((s, m) => s + (m.total_calories || 0), 0),
    protein: meals.reduce((s, m) => s + (m.total_protein || 0), 0),
    carbs: meals.reduce((s, m) => s + (m.total_carbs || 0), 0),
    fats: meals.reduce((s, m) => s + (m.total_fats || 0), 0),
    fiber: meals.reduce((s, m) => s + (m.total_fiber || 0), 0),
  };

  // Get goal for comparison
  const goal = await getNutritionGoal(memberId, gymId);

  return {
    date: logDate,
    meals,
    totals,
    goal,
    progress: {
      calories: goal.calorie_goal ? round((totals.calories / goal.calorie_goal) * 100) : 0,
      protein: goal.protein_goal ? round((totals.protein / goal.protein_goal) * 100) : 0,
      carbs: goal.carb_goal ? round((totals.carbs / goal.carb_goal) * 100) : 0,
      fats: goal.fat_goal ? round((totals.fats / goal.fat_goal) * 100) : 0,
    },
  };
}

// ---------------------------------------------------------------------------
// Get weekly nutrition trend (last 7 days)
// ---------------------------------------------------------------------------
export async function getWeeklyTrend(memberId, gymId) {
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 6);

  const startDate = sevenDaysAgo.toISOString().split('T')[0];
  const endDate = today.toISOString().split('T')[0];

  const dailyTotals = await db('daily_nutrition_logs')
    .select('log_date')
    .sum('total_calories as calories')
    .sum('total_protein as protein')
    .sum('total_carbs as carbs')
    .sum('total_fats as fats')
    .sum('total_fiber as fiber')
    .count('* as meal_count')
    .where({ member_id: memberId, gym_id: gymId })
    .whereBetween('log_date', [startDate, endDate])
    .groupBy('log_date')
    .orderBy('log_date', 'asc');

  // Fill in missing days with zeros
  const days = [];
  for (let d = new Date(sevenDaysAgo); d <= today; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const existing = dailyTotals.find(dt => dt.log_date === dateStr || (dt.log_date && dt.log_date.toISOString && dt.log_date.toISOString().split('T')[0] === dateStr));
    days.push({
      date: dateStr,
      calories: existing ? parseFloat(existing.calories) || 0 : 0,
      protein: existing ? parseFloat(existing.protein) || 0 : 0,
      carbs: existing ? parseFloat(existing.carbs) || 0 : 0,
      fats: existing ? parseFloat(existing.fats) || 0 : 0,
      fiber: existing ? parseFloat(existing.fiber) || 0 : 0,
      meal_count: existing ? parseInt(existing.meal_count) || 0 : 0,
    });
  }

  const avgCalories = days.reduce((s, d) => s + d.calories, 0) / 7;
  const avgProtein = days.reduce((s, d) => s + d.protein, 0) / 7;

  return {
    start_date: startDate,
    end_date: endDate,
    days,
    averages: {
      calories: round(avgCalories),
      protein: round(avgProtein),
    },
  };
}

// ---------------------------------------------------------------------------
// Nutrition Goals
// ---------------------------------------------------------------------------
export async function getNutritionGoal(memberId, gymId) {
  let goal = await db('nutrition_goals')
    .where({ member_id: memberId, gym_id: gymId })
    .first();

  if (!goal) {
    // Return defaults without creating a record
    goal = {
      member_id: memberId,
      gym_id: gymId,
      calorie_goal: 2000,
      protein_goal: 120,
      carb_goal: 250,
      fat_goal: 65,
    };
  }

  return goal;
}

export async function updateNutritionGoal(memberId, gymId, goals) {
  const member = await db('members').where({ id: memberId, gym_id: gymId }).first();
  if (!member) throw new NotFoundError('Member not found');

  const updates = {};
  if (goals.calorie_goal !== undefined) updates.calorie_goal = parseInt(goals.calorie_goal);
  if (goals.protein_goal !== undefined) updates.protein_goal = parseInt(goals.protein_goal);
  if (goals.carb_goal !== undefined) updates.carb_goal = parseInt(goals.carb_goal);
  if (goals.fat_goal !== undefined) updates.fat_goal = parseInt(goals.fat_goal);

  if (Object.keys(updates).length === 0) {
    throw new ValidationError('At least one goal field is required');
  }

  // Upsert
  const existing = await db('nutrition_goals')
    .where({ member_id: memberId, gym_id: gymId })
    .first();

  let result;
  if (existing) {
    [result] = await db('nutrition_goals')
      .where({ member_id: memberId, gym_id: gymId })
      .update({ ...updates, updated_at: db.fn.now() })
      .returning('*');
  } else {
    [result] = await db('nutrition_goals')
      .insert({ member_id: memberId, gym_id: gymId, ...updates })
      .returning('*');
  }

  return result;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function round(n) {
  return Math.round(n * 10) / 10;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
