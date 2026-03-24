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
  // Try OpenRouter first (access to vision models), then DeepSeek
  if (config.openrouter.enabled) {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
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
  const parsed = JSON.parse(jsonStr);

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
  const authHooks = { preHandler: [fastify.verifyToken, fastify.verifyGymOwner] };

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
    const { limit = 20, offset = 0 } = request.query;

    const scans = await db('food_scan_logs')
      .where({ gym_id: gymId, member_id: memberId })
      .orderBy('created_at', 'desc')
      .limit(parseInt(limit))
      .offset(parseInt(offset));

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
