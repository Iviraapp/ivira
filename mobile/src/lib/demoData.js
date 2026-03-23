// Demo data for testing all screens without a backend

export const DEMO_INVOICES = [
  { id: '1', amount: 350000, status: 'captured', method: 'upi', created_at: '2026-03-10T10:30:00Z', description: 'Pro Quarterly - Mar 2026' },
  { id: '2', amount: 150000, status: 'captured', method: 'card', created_at: '2026-02-15T09:00:00Z', description: 'Monthly Add-on' },
  { id: '3', amount: 350000, status: 'captured', method: 'upi', created_at: '2026-01-10T11:00:00Z', description: 'Pro Quarterly - Jan 2026' },
  { id: '4', amount: 85000, status: 'pending', method: 'cash', created_at: '2026-03-12T14:00:00Z', description: 'Protein Shake (5 pack)' },
  { id: '5', amount: 250000, status: 'failed', method: 'card', created_at: '2026-03-01T08:30:00Z', description: 'Personal Training - March' },
  { id: '6', amount: 350000, status: 'captured', method: 'netbanking', created_at: '2025-12-10T10:00:00Z', description: 'Pro Quarterly - Dec 2025' },
]

export const DEMO_PRODUCTS = [
  { id: '1', name: 'Whey Protein (1kg)', price: 289900, category: 'Supplement', stock: 12, image_url: null },
  { id: '2', name: 'Gym Gloves', price: 79900, category: 'Gear', stock: 25, image_url: null },
  { id: '3', name: 'Shaker Bottle', price: 49900, category: 'Accessories', stock: 3, image_url: null },
  { id: '4', name: 'BCAA Powder', price: 189900, category: 'Supplement', stock: 8, image_url: null },
  { id: '5', name: 'Resistance Bands', price: 69900, category: 'Gear', stock: 0, image_url: null },
  { id: '6', name: 'Gym T-Shirt', price: 99900, category: 'Apparel', stock: 15, image_url: null },
  { id: '7', name: 'Pre-Workout', price: 219900, category: 'Supplement', stock: 6, image_url: null },
  { id: '8', name: 'Energy Bar (Box)', price: 45000, category: 'Food & Beverage', stock: 20, image_url: null },
]

export const DEMO_CHECKINS = [
  { id: '1', checked_in_at: '2026-03-15T07:15:00Z', method: 'qr' },
  { id: '2', checked_in_at: '2026-03-14T06:45:00Z', method: 'qr' },
  { id: '3', checked_in_at: '2026-03-13T07:30:00Z', method: 'nfc' },
  { id: '4', checked_in_at: '2026-03-12T18:00:00Z', method: 'qr' },
  { id: '5', checked_in_at: '2026-03-11T07:00:00Z', method: 'qr' },
  { id: '6', checked_in_at: '2026-03-10T06:30:00Z', method: 'qr' },
  { id: '7', checked_in_at: '2026-03-09T17:45:00Z', method: 'nfc' },
]

export const DEMO_LIVE_MEMBERS = [
  { id: 'lm1', name: 'Ravi K.', avatar: null },
  { id: 'lm2', name: 'Ananya S.', avatar: null },
  { id: 'lm3', name: 'Karthik M.', avatar: null },
  { id: 'lm4', name: 'Divya P.', avatar: null },
  { id: 'lm5', name: 'Suresh R.', avatar: null },
  { id: 'lm6', name: 'Meera G.', avatar: null },
]

export const DEMO_LEADERBOARD = [
  { rank: 1, name: 'Arjun M.', value: '26 days', avatar: null },
  { rank: 2, name: 'Priya S.', value: '24 days', avatar: null },
  { rank: 3, name: 'Rahul K.', value: '22 days', avatar: null },
  { rank: 4, name: 'Sneha R.', value: '19 days', avatar: null },
  { rank: 5, name: 'Vikram D.', value: '17 days', avatar: null },
]

export const DEMO_FEED = [
  { id: '1', title: 'New Equipment Alert', body: 'Premium cable crossover machine arriving next week!', likes: 24, timestamp: '2026-03-14T10:00:00Z', liked: false },
  { id: '2', title: 'Holiday Hours', body: 'We will be open 6AM-8PM during Holi weekend.', likes: 12, timestamp: '2026-03-13T09:00:00Z', liked: true },
  { id: '3', title: 'Protein Bar Promo', body: 'Buy 2 get 1 free on all protein bars this week!', likes: 31, timestamp: '2026-03-12T15:00:00Z', liked: false },
]

export const DEMO_BADGES = [
  { badge_type: 'streak_7', badge_name: '7-Day Warrior', badge_icon: '🔥' },
  { badge_type: 'early_bird', badge_name: '5 AM Club', badge_icon: '🌅' },
  { badge_type: 'first_checkin', badge_name: 'First Step', badge_icon: '👟' },
]

export const DEMO_NUTRITION_GOAL = {
  calorie_goal: 2000,
  protein_goal: 120,
  carb_goal: 250,
  fat_goal: 65,
}

export const DEMO_DAILY_NUTRITION = {
  date: '2026-03-15',
  meals: [
    {
      id: 'n1',
      meal_type: 'breakfast',
      raw_input: '2 idli, sambar, coconut chutney',
      items: [
        { name: 'Idli', quantity: 2, unit: 'piece', calories: 116, protein: 4, carbs: 24, fats: 1, fiber: 2 },
        { name: 'Sambar', quantity: 1, unit: 'katori', calories: 95, protein: 5, carbs: 12, fats: 3, fiber: 3 },
        { name: 'Coconut Chutney', quantity: 1, unit: 'tbsp', calories: 40, protein: 1, carbs: 2, fats: 3, fiber: 1 },
      ],
      total_calories: 251,
      total_protein: 10,
      total_carbs: 38,
      total_fats: 7,
      logged_at: '2026-03-15T07:30:00Z',
    },
    {
      id: 'n2',
      meal_type: 'lunch',
      raw_input: '2 roti, dal fry, aloo gobi',
      items: [
        { name: 'Roti', quantity: 2, unit: 'piece', calories: 220, protein: 6, carbs: 44, fats: 4, fiber: 3 },
        { name: 'Dal Fry', quantity: 1, unit: 'katori', calories: 150, protein: 9, carbs: 18, fats: 5, fiber: 4 },
        { name: 'Aloo Gobi', quantity: 1, unit: 'katori', calories: 140, protein: 3, carbs: 18, fats: 7, fiber: 3 },
      ],
      total_calories: 510,
      total_protein: 18,
      total_carbs: 80,
      total_fats: 16,
      logged_at: '2026-03-15T13:00:00Z',
    },
  ],
  totals: {
    calories: 761,
    protein: 28,
    carbs: 118,
    fats: 23,
    fiber: 16,
  },
}

export const DEMO_WEEKLY_NUTRITION = {
  start_date: '2026-03-09',
  end_date: '2026-03-15',
  days: [
    { date: '2026-03-09', calories: 1850, protein: 95, carbs: 220, fats: 58, fiber: 28, meal_count: 3 },
    { date: '2026-03-10', calories: 2100, protein: 115, carbs: 260, fats: 70, fiber: 30, meal_count: 4 },
    { date: '2026-03-11', calories: 1950, protein: 108, carbs: 235, fats: 62, fiber: 26, meal_count: 3 },
    { date: '2026-03-12', calories: 1700, protein: 88, carbs: 200, fats: 55, fiber: 22, meal_count: 2 },
    { date: '2026-03-13', calories: 2200, protein: 125, carbs: 270, fats: 72, fiber: 32, meal_count: 4 },
    { date: '2026-03-14', calories: 1980, protein: 110, carbs: 240, fats: 64, fiber: 28, meal_count: 3 },
    { date: '2026-03-15', calories: 761, protein: 28, carbs: 118, fats: 23, fiber: 16, meal_count: 2 },
  ],
  averages: {
    calories: 1791,
    protein: 96,
    carbs: 220,
    fats: 58,
    fiber: 26,
  },
}

export const DEMO_PROFESSIONALS = [
  {
    id: 'demo-t1', name: 'Arjun Mehta', type: 'trainer',
    specialties: ['Weight Training', 'HIIT', 'Functional'],
    rating: 4.8, photo_url: null, bio: 'Certified PT with 5 years experience',
    services: [
      { id: 's1', title: 'Fat Loss Program', type: 'package', price_paise: 500000, duration_minutes: 60, description: '12-week personalized fat loss program' },
      { id: 's2', title: '1-on-1 Training', type: 'one_on_one', price_paise: 80000, duration_minutes: 60, description: 'Personal training session' },
    ],
  },
  {
    id: 'demo-t2', name: 'Priya Sharma', type: 'dietitian',
    specialties: ['Sports Nutrition', 'Weight Management'],
    rating: 4.9, photo_url: null, bio: 'Sports nutritionist, MSc Nutrition',
    services: [
      { id: 's3', title: 'Diet Consultation', type: 'consultation', price_paise: 150000, duration_minutes: 45, description: 'Personalized diet plan consultation' },
      { id: 's4', title: 'Monthly Meal Plan', type: 'package', price_paise: 300000, duration_minutes: 30, description: 'Custom monthly meal planning' },
    ],
  },
  {
    id: 'demo-t3', name: 'Vikram Singh', type: 'trainer',
    specialties: ['Strength & Conditioning', 'Powerlifting'],
    rating: 4.7, photo_url: null, bio: 'National level powerlifter, NSCA certified',
    services: [
      { id: 's5', title: 'Strength Training', type: 'one_on_one', price_paise: 100000, duration_minutes: 75, description: 'Focused strength training session' },
    ],
  },
  {
    id: 'demo-t4', name: 'Sneha Reddy', type: 'physio',
    specialties: ['Sports Physio', 'Rehab'],
    rating: 4.6, photo_url: null, bio: 'Physiotherapist specializing in sports injuries',
    services: [
      { id: 's6', title: 'Physio Assessment', type: 'consultation', price_paise: 120000, duration_minutes: 45, description: 'Injury assessment and recovery plan' },
    ],
  },
]

export const DEMO_PROGRAMS = [
  { id: '1', title: '12-Week Transformation', trainer: 'Coach Arjun', price: 499900, duration: '12 weeks', type: 'PT', description: 'Complete body recomposition program with weekly check-ins.' },
  { id: '2', title: 'Beginner Strength', trainer: 'Coach Priya', price: 299900, duration: '8 weeks', type: 'PT', description: 'Learn the fundamentals of strength training.' },
  { id: '3', title: 'Custom Diet Plan', trainer: 'Dr. Sneha (Nutritionist)', price: 199900, duration: '4 weeks', type: 'Diet', description: 'Personalized meal plan based on your goals and preferences.' },
  { id: '4', title: 'Yoga Foundations', trainer: 'Meera G.', price: 149900, duration: '6 weeks', type: 'Yoga', description: 'Build flexibility and mindfulness from scratch.' },
]
