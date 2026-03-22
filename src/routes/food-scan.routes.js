import db from '../config/database.js';
import crypto from 'crypto';

// Mock food detection based on a hash of the input for deterministic but varied results
function generateMockFoodAnalysis(imageData) {
  const hash = crypto.createHash('md5').update(imageData || 'default').digest('hex');
  const hashNum = parseInt(hash.slice(0, 8), 16);

  const foodDatabase = [
    { name: 'Grilled Chicken Breast', calories: 165, protein: 31.0, carbs: 0.0, fat: 3.6, serving: '100g' },
    { name: 'Steamed Rice', calories: 130, protein: 2.7, carbs: 28.0, fat: 0.3, serving: '100g' },
    { name: 'Dal Tadka', calories: 140, protein: 9.0, carbs: 21.0, fat: 3.0, serving: '1 bowl' },
    { name: 'Roti (Whole Wheat)', calories: 120, protein: 3.5, carbs: 18.0, fat: 3.7, serving: '1 piece' },
    { name: 'Paneer Tikka', calories: 220, protein: 14.0, carbs: 5.0, fat: 16.0, serving: '100g' },
    { name: 'Mixed Vegetable Curry', calories: 95, protein: 3.0, carbs: 12.0, fat: 4.0, serving: '1 bowl' },
    { name: 'Banana', calories: 89, protein: 1.1, carbs: 23.0, fat: 0.3, serving: '1 medium' },
    { name: 'Curd (Yogurt)', calories: 60, protein: 3.5, carbs: 5.0, fat: 3.3, serving: '100g' },
    { name: 'Egg Bhurji', calories: 180, protein: 13.0, carbs: 4.0, fat: 13.0, serving: '2 eggs' },
    { name: 'Idli', calories: 39, protein: 2.0, carbs: 8.0, fat: 0.1, serving: '1 piece' },
    { name: 'Chicken Biryani', calories: 250, protein: 16.0, carbs: 30.0, fat: 8.0, serving: '1 serving' },
    { name: 'Sambar', calories: 75, protein: 4.0, carbs: 12.0, fat: 1.5, serving: '1 bowl' },
    { name: 'Masala Dosa', calories: 168, protein: 3.5, carbs: 28.0, fat: 5.0, serving: '1 piece' },
    { name: 'Protein Shake', calories: 150, protein: 25.0, carbs: 8.0, fat: 2.0, serving: '1 glass' },
    { name: 'Chapati with Ghee', calories: 150, protein: 3.5, carbs: 18.0, fat: 7.0, serving: '1 piece' },
    { name: 'Green Salad', calories: 35, protein: 2.0, carbs: 6.0, fat: 0.5, serving: '1 bowl' },
  ];

  // Select 2-4 items based on hash
  const itemCount = 2 + (hashNum % 3);
  const items = [];
  for (let i = 0; i < itemCount; i++) {
    const idx = (hashNum + i * 7) % foodDatabase.length;
    const food = foodDatabase[idx];
    const quantity = 1 + ((hashNum + i) % 2);
    items.push({
      ...food,
      quantity,
      total_calories: food.calories * quantity,
      total_protein: +(food.protein * quantity).toFixed(1),
      total_carbs: +(food.carbs * quantity).toFixed(1),
      total_fat: +(food.fat * quantity).toFixed(1),
      confidence: +(0.75 + (((hashNum + i * 3) % 25) / 100)).toFixed(2),
    });
  }

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

  // POST /gyms/:gymId/members/:memberId/food/scan — mock AI food analysis
  fastify.post('/gyms/:gymId/members/:memberId/food/scan', authHooks, async (request, reply) => {
    const { gymId, memberId } = request.params;
    const { image } = request.body || {};

    if (!image) {
      return reply.code(400).send({ error: 'image (base64) is required' });
    }

    const analysis = generateMockFoodAnalysis(image);

    // Save scan to database
    const [scan] = await db('food_scan_logs')
      .insert({
        gym_id: gymId,
        member_id: memberId,
        image_url: null, // In production, upload to S3 first
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
