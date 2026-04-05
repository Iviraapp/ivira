import * as nutritionService from '../services/nutrition.service.js';
import db from '../config/database.js';

export default async function nutritionRoutes(fastify) {
  const authHooks = { preHandler: [fastify.verifyToken, fastify.verifyGymOwner] };
  const memberAuth = { preHandler: [fastify.verifyToken, fastify.verifyMember] };

  // Search food atlas (public within gym context)
  fastify.get('/gyms/:gymId/nutrition/search', authHooks, async (request) => {
    const { q } = request.query;
    return nutritionService.searchFood(q);
  });

  // AI meal estimation
  fastify.post('/gyms/:gymId/nutrition/estimate', memberAuth, async (request) => {
    const { input, source } = request.body || {};
    if (!input) {
      return fastify.httpErrors.badRequest('input is required');
    }

    if (source === 'ai') {
      return nutritionService.estimateWithAI(input);
    }
    return nutritionService.parseIndianMeal(input);
  });

  // Log a meal
  fastify.post('/gyms/:gymId/members/:memberId/nutrition/log', memberAuth, async (request) => {
    const { gymId, memberId } = request.params;
    const { mealType, rawInput, items, source } = request.body || {};
    return nutritionService.logMeal(memberId, gymId, { mealType, rawInput, items, source });
  });

  // Get daily log
  fastify.get('/gyms/:gymId/members/:memberId/nutrition/daily', memberAuth, async (request) => {
    const { gymId, memberId } = request.params;
    const { date } = request.query;
    return nutritionService.getDailyLog(memberId, gymId, date);
  });

  // Get weekly trend
  fastify.get('/gyms/:gymId/members/:memberId/nutrition/weekly', memberAuth, async (request) => {
    const { gymId, memberId } = request.params;
    return nutritionService.getWeeklyTrend(memberId, gymId);
  });

  // Get nutrition goal
  fastify.get('/gyms/:gymId/members/:memberId/nutrition/goal', memberAuth, async (request) => {
    const { gymId, memberId } = request.params;
    return nutritionService.getNutritionGoal(memberId, gymId);
  });

  // Update nutrition goal
  fastify.patch('/gyms/:gymId/members/:memberId/nutrition/goal', memberAuth, async (request) => {
    const { gymId, memberId } = request.params;
    return nutritionService.updateNutritionGoal(memberId, gymId, request.body || {});
  });

  // GET /gyms/:gymId/members/:memberId/nutrition/suggestions
  // Returns personalized food suggestions based on location, time, preferences
  fastify.get('/gyms/:gymId/members/:memberId/nutrition/suggestions', memberAuth, async (request) => {
    const { gymId, memberId } = request.params
    const member = await db('members').where({ id: memberId, gym_id: gymId }).first()
    const gym = await db('gyms').where({ id: gymId }).select('city', 'country_code').first()

    const hour = new Date().getHours()
    const mealType = hour < 11 ? 'breakfast' : hour < 15 ? 'lunch' : hour < 20 ? 'dinner' : 'snack'
    const country = gym?.country_code || 'IN'

    // Get user's recent foods for personalization
    const recentFoods = await db('daily_nutrition_logs')
      .where({ member_id: memberId })
      .orderBy('created_at', 'desc')
      .limit(20)
      .select('raw_input', 'items')

    // Regional food suggestions by country + meal type
    const REGIONAL_FOODS = {
      IN: {
        breakfast: [
          { name: 'Idli Sambar', calories: 250, protein: 8, carbs: 45, fats: 4, region: 'South India' },
          { name: 'Poha', calories: 270, protein: 6, carbs: 48, fats: 7, region: 'West India' },
          { name: 'Aloo Paratha', calories: 320, protein: 8, carbs: 42, fats: 14, region: 'North India' },
          { name: 'Upma', calories: 230, protein: 6, carbs: 38, fats: 8, region: 'South India' },
          { name: 'Dosa with Chutney', calories: 280, protein: 7, carbs: 44, fats: 8, region: 'South India' },
          { name: 'Moong Dal Cheela', calories: 200, protein: 14, carbs: 25, fats: 5, region: 'North India' },
          { name: 'Oats with Banana', calories: 280, protein: 10, carbs: 50, fats: 5, region: 'Urban' },
          { name: 'Paneer Bhurji + Roti', calories: 380, protein: 20, carbs: 35, fats: 18, region: 'North India' },
        ],
        lunch: [
          { name: 'Dal Rice', calories: 400, protein: 14, carbs: 65, fats: 8, region: 'All India' },
          { name: 'Rajma Chawal', calories: 420, protein: 16, carbs: 68, fats: 8, region: 'North India' },
          { name: 'Chicken Curry + Rice', calories: 480, protein: 28, carbs: 55, fats: 14, region: 'All India' },
          { name: 'Curd Rice', calories: 280, protein: 8, carbs: 48, fats: 6, region: 'South India' },
          { name: 'Roti + Sabzi + Dal', calories: 450, protein: 16, carbs: 60, fats: 12, region: 'North India' },
          { name: 'Fish Curry + Rice', calories: 440, protein: 25, carbs: 55, fats: 12, region: 'East/South India' },
          { name: 'Paneer Butter Masala + Naan', calories: 550, protein: 22, carbs: 55, fats: 26, region: 'North India' },
          { name: 'Sambar Rice + Papad', calories: 380, protein: 12, carbs: 62, fats: 8, region: 'South India' },
        ],
        dinner: [
          { name: '2 Roti + Dal + Sabzi', calories: 400, protein: 14, carbs: 58, fats: 10, region: 'All India' },
          { name: 'Khichdi', calories: 300, protein: 12, carbs: 48, fats: 6, region: 'All India' },
          { name: 'Egg Bhurji + Roti', calories: 350, protein: 18, carbs: 35, fats: 16, region: 'All India' },
          { name: 'Daal Tadka + Rice', calories: 420, protein: 15, carbs: 62, fats: 10, region: 'North India' },
          { name: 'Grilled Chicken + Salad', calories: 350, protein: 35, carbs: 12, fats: 16, region: 'Urban/Fitness' },
          { name: 'Palak Paneer + Roti', calories: 400, protein: 18, carbs: 40, fats: 18, region: 'North India' },
        ],
        snack: [
          { name: 'Masala Chai + Biscuit', calories: 120, protein: 2, carbs: 18, fats: 4, region: 'All India' },
          { name: 'Roasted Chana', calories: 150, protein: 8, carbs: 22, fats: 3, region: 'All India' },
          { name: 'Banana + Peanut Butter', calories: 250, protein: 8, carbs: 30, fats: 12, region: 'Urban/Fitness' },
          { name: 'Protein Shake', calories: 200, protein: 25, carbs: 10, fats: 4, region: 'Fitness' },
          { name: 'Sprouts Chaat', calories: 180, protein: 10, carbs: 25, fats: 4, region: 'All India' },
          { name: 'Makhana (Fox Nuts)', calories: 100, protein: 4, carbs: 18, fats: 1, region: 'North India' },
        ],
      },
      AE: {
        breakfast: [
          { name: 'Shakshuka + Pita', calories: 380, protein: 18, carbs: 35, fats: 18, region: 'Middle East' },
          { name: 'Labneh + Zaatar + Bread', calories: 300, protein: 10, carbs: 35, fats: 14, region: 'Middle East' },
          { name: 'Foul Medames', calories: 350, protein: 16, carbs: 48, fats: 8, region: 'Middle East' },
        ],
        lunch: [
          { name: 'Chicken Shawarma Plate', calories: 550, protein: 35, carbs: 50, fats: 20, region: 'Middle East' },
          { name: 'Grilled Fish + Tabbouleh', calories: 400, protein: 30, carbs: 25, fats: 18, region: 'Middle East' },
          { name: 'Lamb Kofta + Hummus + Rice', calories: 600, protein: 28, carbs: 55, fats: 28, region: 'Middle East' },
        ],
        dinner: [
          { name: 'Grilled Chicken + Fattoush', calories: 420, protein: 32, carbs: 25, fats: 20, region: 'Middle East' },
          { name: 'Mixed Grill Platter', calories: 550, protein: 40, carbs: 15, fats: 35, region: 'Middle East' },
        ],
        snack: [
          { name: 'Dates + Almonds', calories: 200, protein: 5, carbs: 30, fats: 8, region: 'Middle East' },
          { name: 'Hummus + Veggies', calories: 180, protein: 6, carbs: 20, fats: 8, region: 'Middle East' },
        ],
      },
      US: {
        breakfast: [
          { name: 'Greek Yogurt + Granola', calories: 350, protein: 18, carbs: 45, fats: 10, region: 'US' },
          { name: 'Avocado Toast + Eggs', calories: 400, protein: 18, carbs: 30, fats: 24, region: 'US' },
          { name: 'Overnight Oats', calories: 300, protein: 12, carbs: 48, fats: 8, region: 'US' },
        ],
        lunch: [
          { name: 'Chicken Burrito Bowl', calories: 550, protein: 35, carbs: 55, fats: 18, region: 'US' },
          { name: 'Turkey Sandwich + Side Salad', calories: 450, protein: 28, carbs: 42, fats: 16, region: 'US' },
          { name: 'Poke Bowl', calories: 480, protein: 30, carbs: 55, fats: 14, region: 'US' },
        ],
        dinner: [
          { name: 'Grilled Salmon + Quinoa', calories: 500, protein: 38, carbs: 35, fats: 20, region: 'US' },
          { name: 'Chicken Stir Fry + Rice', calories: 480, protein: 30, carbs: 50, fats: 14, region: 'US' },
        ],
        snack: [
          { name: 'Protein Bar', calories: 220, protein: 20, carbs: 25, fats: 8, region: 'US' },
          { name: 'Apple + Almond Butter', calories: 200, protein: 5, carbs: 25, fats: 10, region: 'US' },
        ],
      },
      GB: {
        breakfast: [
          { name: 'Porridge + Berries', calories: 280, protein: 10, carbs: 48, fats: 6, region: 'UK' },
          { name: 'Eggs on Toast', calories: 320, protein: 18, carbs: 30, fats: 14, region: 'UK' },
        ],
        lunch: [
          { name: 'Jacket Potato + Tuna', calories: 450, protein: 25, carbs: 55, fats: 12, region: 'UK' },
          { name: 'Chicken + Veg Wrap', calories: 420, protein: 28, carbs: 40, fats: 16, region: 'UK' },
        ],
        dinner: [
          { name: 'Grilled Chicken + Sweet Potato', calories: 450, protein: 35, carbs: 40, fats: 12, region: 'UK' },
        ],
        snack: [
          { name: 'Rice Cakes + Peanut Butter', calories: 180, protein: 6, carbs: 22, fats: 8, region: 'UK' },
        ],
      },
    }

    // Default to US if country not found
    const foods = REGIONAL_FOODS[country] || REGIONAL_FOODS['US']
    const mealFoods = foods[mealType] || foods['snack'] || []

    // Get user's nutrition goal for smart filtering
    const goal = await db('nutrition_goals').where({ member_id: memberId, gym_id: gymId }).first()
    const calorieGoal = goal?.calorie_goal || 2000
    const proteinGoal = goal?.protein_goal || 120

    // Get today's consumed so far
    const today = new Date().toISOString().split('T')[0]
    const todayLogs = await db('daily_nutrition_logs')
      .where({ member_id: memberId, gym_id: gymId, log_date: today })
    const consumed = {
      calories: todayLogs.reduce((s, l) => s + (l.total_calories || 0), 0),
      protein: todayLogs.reduce((s, l) => s + (l.total_protein || 0), 0),
    }
    const remaining = {
      calories: Math.max(0, calorieGoal - consumed.calories),
      protein: Math.max(0, proteinGoal - consumed.protein),
    }

    // Score and sort foods — prefer those that fit remaining budget
    const scored = mealFoods.map(f => ({
      ...f,
      fits_budget: f.calories <= remaining.calories,
      protein_dense: f.protein >= 15,
      score: (f.calories <= remaining.calories ? 10 : 0) +
             (f.protein >= 15 ? 5 : 0) +
             (f.calories <= remaining.calories * 0.4 ? 3 : 0),
    })).sort((a, b) => b.score - a.score)

    return {
      meal_type: mealType,
      country,
      remaining,
      suggestions: scored.slice(0, 6),
      all: scored,
    }
  })
}
