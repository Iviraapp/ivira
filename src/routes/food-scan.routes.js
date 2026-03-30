import db from '../config/database.js';
import config from '../config/index.js';

const FOOD_ANALYSIS_PROMPT = `You are a nutrition analysis AI. Analyze the food in this image and identify each distinct food item visible.

For each item, provide:
- name: Common name of the food (be specific, e.g. "Premier Protein Chocolate Shake" not just "protein shake")
- calories: Estimated calories per serving shown
- protein: Grams of protein
- carbs: Grams of carbohydrates
- fat: Grams of fat
- serving: Serving description (e.g. "1 bottle", "1 bowl", "100g")
- confidence: Your confidence 0.0-1.0

If you can read nutrition labels in the image, use those exact values.
If it's a packaged product, identify the brand and use known nutrition data.
For home-cooked food, estimate based on typical Indian/global portions.

IMPORTANT: Return ONLY valid JSON, no markdown, no explanation. Format:
{
  "items": [
    { "name": "...", "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "serving": "...", "confidence": 0.0 }
  ]
}`;

async function analyzeWithVision(imageBase64) {
  // Try Gemini direct first (fastest, cheapest), then OpenRouter, then Anthropic
  if (config.gemini?.enabled) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${config.gemini.apiKey}`,
      {
        method: 'POST',
        signal: AbortSignal.timeout(30000),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: FOOD_ANALYSIS_PROMPT },
              { inline_data: { mime_type: 'image/jpeg', data: imageBase64 } },
            ],
          }],
          generationConfig: { maxOutputTokens: 1024 },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Gemini API error ${response.status}: ${err}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  // OpenRouter fallback
  if (config.openrouter.enabled) {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: AbortSignal.timeout(30000),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.openrouter.apiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-flash-1.5',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: FOOD_ANALYSIS_PROMPT },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenRouter API error ${response.status}: ${err}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  if (config.anthropic.enabled) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: AbortSignal.timeout(30000),
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.anthropic.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: FOOD_ANALYSIS_PROMPT },
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: imageBase64,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Anthropic API error ${response.status}: ${err}`);
    }

    const data = await response.json();
    return data.content?.[0]?.text || '';
  }

  throw new Error('No vision-capable AI provider configured');
}

function parseAIResponse(text) {
  // Strip markdown code fences if present
  const jsonStr = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  let parsed;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    const err = new Error('AI returned invalid JSON');
    err.code = 'AI_PARSE_ERROR';
    err.responsePreview = text.substring(0, 200);
    throw err;
  }

  const items = (parsed.items || []).map(item => ({
    name: item.name || 'Unknown Item',
    calories: Math.round(Number(item.calories) || 0),
    protein: +(Number(item.protein) || 0).toFixed(1),
    carbs: +(Number(item.carbs) || 0).toFixed(1),
    fat: +(Number(item.fat) || 0).toFixed(1),
    serving: item.serving || '1 serving',
    confidence: +(Math.min(1, Math.max(0, Number(item.confidence) || 0.8))).toFixed(2),
    quantity: 1,
    total_calories: Math.round(Number(item.calories) || 0),
    total_protein: +(Number(item.protein) || 0).toFixed(1),
    total_carbs: +(Number(item.carbs) || 0).toFixed(1),
    total_fat: +(Number(item.fat) || 0).toFixed(1),
  }));

  const totals = items.reduce(
    (acc, item) => ({
      calories: acc.calories + item.total_calories,
      protein: +(acc.protein + item.total_protein).toFixed(1),
      carbs: +(acc.carbs + item.total_carbs).toFixed(1),
      fat: +(acc.fat + item.total_fat).toFixed(1),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return { items, totals };
}

export default async function foodScanRoutes(fastify) {
  const authHooks = { preHandler: [fastify.verifyToken] };

  // GET /gyms/:gymId/members/:memberId/food/barcode/:barcode — Look up food by barcode
  fastify.get('/gyms/:gymId/members/:memberId/food/barcode/:barcode', authHooks, async (request, reply) => {
    const { barcode } = request.params;

    try {
      // Open Food Facts API — free, no key needed
      const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) {
        return reply.code(404).send({ error: 'Product not found' });
      }

      const data = await response.json();
      if (data.status !== 1 || !data.product) {
        return reply.code(404).send({ error: 'Product not found in database' });
      }

      const p = data.product;
      const nutriments = p.nutriments || {};
      const serving = p.serving_size || p.quantity || '100g';

      return {
        found: true,
        source: 'open_food_facts',
        product: {
          name: p.product_name || p.generic_name || 'Unknown Product',
          brand: p.brands || '',
          barcode,
          serving,
          calories: Math.round(nutriments['energy-kcal_serving'] || nutriments['energy-kcal_100g'] || 0),
          protein: +(nutriments.proteins_serving || nutriments.proteins_100g || 0).toFixed(1),
          carbs: +(nutriments.carbohydrates_serving || nutriments.carbohydrates_100g || 0).toFixed(1),
          fat: +(nutriments.fat_serving || nutriments.fat_100g || 0).toFixed(1),
          fiber: +(nutriments.fiber_serving || nutriments.fiber_100g || 0).toFixed(1),
          sodium: +(nutriments.sodium_serving || nutriments.sodium_100g || 0).toFixed(3),
          image_url: p.image_front_url || p.image_url || null,
          confidence: 0.95,
        },
      };
    } catch (err) {
      request.log.error(err, 'Barcode lookup failed');
      return reply.code(502).send({ error: 'Barcode lookup service unavailable' });
    }
  });

  // GET /gyms/:gymId/members/:memberId/food/search?q=chicken — Search food database
  fastify.get('/gyms/:gymId/members/:memberId/food/search', authHooks, async (request, reply) => {
    const { q } = request.query;
    if (!q || q.length < 2) {
      return reply.code(400).send({ error: 'Search query must be at least 2 characters' });
    }

    try {
      const response = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=10`, { signal: AbortSignal.timeout(10000) });
      const data = await response.json();

      const products = (data.products || []).map(p => {
        const n = p.nutriments || {};
        return {
          name: p.product_name || p.generic_name || 'Unknown',
          brand: p.brands || '',
          barcode: p.code || '',
          serving: p.serving_size || '100g',
          calories: Math.round(n['energy-kcal_serving'] || n['energy-kcal_100g'] || 0),
          protein: +(n.proteins_serving || n.proteins_100g || 0).toFixed(1),
          carbs: +(n.carbohydrates_serving || n.carbohydrates_100g || 0).toFixed(1),
          fat: +(n.fat_serving || n.fat_100g || 0).toFixed(1),
          image_url: p.image_front_small_url || null,
        };
      }).filter(p => p.name !== 'Unknown' && p.calories > 0);

      return { results: products, total: products.length };
    } catch (err) {
      request.log.error(err, 'Food search failed');
      return reply.code(502).send({ error: 'Food search service unavailable' });
    }
  });

  // POST /gyms/:gymId/members/:memberId/food/scan — AI-powered food analysis
  fastify.post('/gyms/:gymId/members/:memberId/food/scan', authHooks, async (request, reply) => {
    const { gymId, memberId } = request.params;
    const { image } = request.body || {};

    if (!image) {
      return reply.code(400).send({ error: 'image (base64) is required' });
    }

    let analysis;
    try {
      const aiText = await analyzeWithVision(image);
      analysis = parseAIResponse(aiText);
    } catch (err) {
      if (err.code === 'AI_PARSE_ERROR') {
        request.log.warn({ text: err.responsePreview }, 'AI returned invalid JSON');
        return reply.code(502).send({ error: 'AI_PARSE_ERROR', message: 'Could not parse nutrition data from image' });
      }
      request.log.error(err, 'AI food analysis failed');
      return reply.code(502).send({
        error: 'ANALYSIS_FAILED',
        message: 'Could not analyze the food image. Please try again with a clearer photo.',
      });
    }

    if (analysis.items.length === 0) {
      return reply.code(422).send({
        error: 'NO_FOOD_DETECTED',
        message: 'No food items were detected in the image. Please try a clearer photo.',
      });
    }

    // Save scan to database
    const [scan] = await db('food_scan_logs')
      .insert({
        gym_id: gymId,
        member_id: memberId,
        image_url: null,
        detected_items: JSON.stringify(analysis.items),
        total_calories: analysis.totals.calories,
        total_protein: analysis.totals.protein,
        total_carbs: analysis.totals.carbs,
        total_fat: analysis.totals.fat,
        confirmed: false,
        logged_to_diary: false,
      })
      .returning('*');

    return reply.code(201).send({
      scan_id: scan.id,
      detected_items: analysis.items,
      totals: analysis.totals,
      message: 'Food detected successfully. Confirm to log to your diary.',
    });
  });

  // GET /gyms/:gymId/members/:memberId/food/scans — list past scans
  fastify.get('/gyms/:gymId/members/:memberId/food/scans', authHooks, async (request) => {
    const { gymId, memberId } = request.params;
    const limit = Math.min(Math.max(parseInt(request.query.limit) || 20, 1), 100);
    const offset = Math.max(parseInt(request.query.offset) || 0, 0);

    const scans = await db('food_scan_logs')
      .where({ gym_id: gymId, member_id: memberId })
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    return { scans };
  });

  // POST /gyms/:gymId/members/:memberId/food/scans/:scanId/confirm — confirm scan
  fastify.post('/gyms/:gymId/members/:memberId/food/scans/:scanId/confirm', authHooks, async (request, reply) => {
    const { gymId, memberId, scanId } = request.params;

    const scan = await db('food_scan_logs')
      .where({ id: scanId, gym_id: gymId, member_id: memberId })
      .first();

    if (!scan) {
      return reply.code(404).send({ error: 'Scan not found' });
    }

    if (scan.confirmed) {
      return reply.code(409).send({ error: 'Scan already confirmed' });
    }

    const [updated] = await db('food_scan_logs')
      .where('id', scanId)
      .update({
        confirmed: true,
        logged_to_diary: true,
      })
      .returning('*');

    return {
      scan: updated,
      message: 'Scan confirmed and logged to nutrition diary',
    };
  });
}
