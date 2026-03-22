export async function up(knex) {
  await knex.schema
    // Challenges system
    .createTable('challenges', t => {
      t.uuid('id').primary().defaultTo(knex.fn.uuid());
      t.uuid('gym_id').nullable().references('id').inTable('gyms').onDelete('CASCADE');
      t.text('title').notNullable();
      t.text('description');
      t.text('type').notNullable().defaultTo('daily').checkIn(['daily', 'weekly']);
      t.text('category').defaultTo('general');
      t.integer('target_value').defaultTo(1);
      t.integer('reward_xp').defaultTo(50);
      t.text('difficulty').defaultTo('easy').checkIn(['easy', 'medium', 'hard']);
      t.text('icon');
      t.boolean('is_active').defaultTo(true);
      t.timestamp('created_at').defaultTo(knex.fn.now());
    })
    .createTable('member_challenges', t => {
      t.uuid('id').primary().defaultTo(knex.fn.uuid());
      t.uuid('gym_id').references('id').inTable('gyms').onDelete('CASCADE');
      t.uuid('member_id').references('id').inTable('members').onDelete('CASCADE');
      t.uuid('challenge_id').references('id').inTable('challenges').onDelete('CASCADE');
      t.integer('progress').defaultTo(0);
      t.boolean('completed').defaultTo(false);
      t.timestamp('completed_at');
      t.date('date').notNullable().defaultTo(knex.fn.now());
      t.timestamp('created_at').defaultTo(knex.fn.now());
      t.unique(['member_id', 'challenge_id', 'date']);
    })
    // XP & Levels
    .createTable('member_xp', t => {
      t.uuid('id').primary().defaultTo(knex.fn.uuid());
      t.uuid('gym_id').references('id').inTable('gyms').onDelete('CASCADE');
      t.uuid('member_id').references('id').inTable('members').onDelete('CASCADE');
      t.integer('total_xp').defaultTo(0);
      t.integer('level').defaultTo(1);
      t.integer('streak_days').defaultTo(0);
      t.date('last_activity_date');
      t.timestamp('updated_at').defaultTo(knex.fn.now());
      t.unique(['gym_id', 'member_id']);
    })
    // Achievements
    .createTable('achievements', t => {
      t.uuid('id').primary().defaultTo(knex.fn.uuid());
      t.text('name').notNullable();
      t.text('description');
      t.text('category').notNullable();
      t.text('icon');
      t.text('criteria_type').notNullable();
      t.integer('criteria_value').notNullable();
      t.text('rarity').defaultTo('common').checkIn(['common', 'rare', 'epic', 'legendary']);
      t.timestamp('created_at').defaultTo(knex.fn.now());
    })
    .createTable('member_achievements', t => {
      t.uuid('id').primary().defaultTo(knex.fn.uuid());
      t.uuid('gym_id').references('id').inTable('gyms').onDelete('CASCADE');
      t.uuid('member_id').references('id').inTable('members').onDelete('CASCADE');
      t.uuid('achievement_id').references('id').inTable('achievements').onDelete('CASCADE');
      t.timestamp('earned_at').defaultTo(knex.fn.now());
      t.unique(['member_id', 'achievement_id']);
    })
    // Recipes
    .createTable('recipes', t => {
      t.uuid('id').primary().defaultTo(knex.fn.uuid());
      t.text('title').notNullable();
      t.text('description');
      t.text('category').notNullable();
      t.integer('cook_time_minutes');
      t.text('difficulty').defaultTo('easy');
      t.integer('calories');
      t.decimal('protein_g', 6, 1);
      t.decimal('carbs_g', 6, 1);
      t.decimal('fat_g', 6, 1);
      t.jsonb('ingredients');
      t.jsonb('instructions');
      t.specificType('tags', 'text[]');
      t.boolean('is_active').defaultTo(true);
      t.timestamp('created_at').defaultTo(knex.fn.now());
    })
    .createTable('member_favorite_recipes', t => {
      t.uuid('id').primary().defaultTo(knex.fn.uuid());
      t.uuid('member_id').references('id').inTable('members').onDelete('CASCADE');
      t.uuid('recipe_id').references('id').inTable('recipes').onDelete('CASCADE');
      t.timestamp('created_at').defaultTo(knex.fn.now());
      t.unique(['member_id', 'recipe_id']);
    })
    // Food scan logs
    .createTable('food_scan_logs', t => {
      t.uuid('id').primary().defaultTo(knex.fn.uuid());
      t.uuid('gym_id').references('id').inTable('gyms').onDelete('CASCADE');
      t.uuid('member_id').references('id').inTable('members').onDelete('CASCADE');
      t.text('image_url');
      t.jsonb('detected_items');
      t.integer('total_calories');
      t.decimal('total_protein', 6, 1);
      t.decimal('total_carbs', 6, 1);
      t.decimal('total_fat', 6, 1);
      t.boolean('confirmed').defaultTo(false);
      t.boolean('logged_to_diary').defaultTo(false);
      t.timestamp('created_at').defaultTo(knex.fn.now());
    })
    // Sleep tracking
    .createTable('sleep_logs', t => {
      t.uuid('id').primary().defaultTo(knex.fn.uuid());
      t.uuid('gym_id').references('id').inTable('gyms').onDelete('CASCADE');
      t.uuid('member_id').references('id').inTable('members').onDelete('CASCADE');
      t.timestamp('bedtime').notNullable();
      t.timestamp('wake_time').notNullable();
      t.integer('duration_minutes');
      t.integer('quality_rating').checkBetween([1, 5]);
      t.integer('sleep_score');
      t.text('notes');
      t.date('date').notNullable().defaultTo(knex.fn.now());
      t.timestamp('created_at').defaultTo(knex.fn.now());
    });

  // --- SEED: Default Challenges ---
  await knex('challenges').insert([
    // Daily
    { gym_id: null, title: 'Drink 8 Glasses of Water', description: 'Stay hydrated throughout the day', type: 'daily', category: 'hydration', target_value: 8, reward_xp: 30, difficulty: 'easy', icon: 'water' },
    { gym_id: null, title: 'Complete a 16h Fast', description: 'Finish a full 16-hour intermittent fast', type: 'daily', category: 'fasting', target_value: 1, reward_xp: 100, difficulty: 'medium', icon: 'timer' },
    { gym_id: null, title: 'Walk 10,000 Steps', description: 'Hit your daily step goal', type: 'daily', category: 'cardio', target_value: 10000, reward_xp: 80, difficulty: 'medium', icon: 'steps' },
    { gym_id: null, title: 'Do 50 Pushups', description: 'Complete 50 pushups throughout the day', type: 'daily', category: 'strength', target_value: 50, reward_xp: 60, difficulty: 'medium', icon: 'pushup' },
    { gym_id: null, title: 'Eat 150g Protein', description: 'Hit your protein target for the day', type: 'daily', category: 'nutrition', target_value: 150, reward_xp: 70, difficulty: 'medium', icon: 'protein' },
    { gym_id: null, title: 'Log All Meals', description: 'Track breakfast, lunch, and dinner', type: 'daily', category: 'nutrition', target_value: 3, reward_xp: 40, difficulty: 'easy', icon: 'meal' },
    { gym_id: null, title: 'No Sugar Today', description: 'Avoid added sugars for the entire day', type: 'daily', category: 'nutrition', target_value: 1, reward_xp: 50, difficulty: 'easy', icon: 'no-sugar' },
    // Weekly
    { gym_id: null, title: 'Fast 5 Days This Week', description: 'Complete intermittent fasting 5 out of 7 days', type: 'weekly', category: 'fasting', target_value: 5, reward_xp: 250, difficulty: 'hard', icon: 'calendar' },
    { gym_id: null, title: 'Work Out 4 Times', description: 'Hit the gym at least 4 times this week', type: 'weekly', category: 'workout', target_value: 4, reward_xp: 200, difficulty: 'medium', icon: 'dumbbell' },
    { gym_id: null, title: 'Hit Calorie Goal Every Day', description: 'Stay within your calorie target all week', type: 'weekly', category: 'nutrition', target_value: 7, reward_xp: 300, difficulty: 'hard', icon: 'target' },
    { gym_id: null, title: 'Walk 50,000 Steps', description: 'Accumulate 50,000 steps over the week', type: 'weekly', category: 'cardio', target_value: 50000, reward_xp: 200, difficulty: 'medium', icon: 'steps' },
  ]);

  // --- SEED: Default Achievements ---
  await knex('achievements').insert([
    // Fasting
    { name: 'First Fast', description: 'Complete your first intermittent fast', category: 'fasting', icon: 'timer', criteria_type: 'fasting_count', criteria_value: 1, rarity: 'common' },
    { name: 'Week Warrior', description: 'Maintain a 7-day fasting streak', category: 'fasting', icon: 'fire', criteria_type: 'fasting_streak', criteria_value: 7, rarity: 'rare' },
    { name: 'Iron Will', description: 'Maintain a 30-day fasting streak', category: 'fasting', icon: 'shield', criteria_type: 'fasting_streak', criteria_value: 30, rarity: 'epic' },
    { name: 'Fasting Legend', description: 'Complete 100 fasts', category: 'fasting', icon: 'crown', criteria_type: 'fasting_count', criteria_value: 100, rarity: 'legendary' },
    // Workout
    { name: 'Gym Rat', description: 'Complete 5 workouts', category: 'workout', icon: 'dumbbell', criteria_type: 'workout_count', criteria_value: 5, rarity: 'common' },
    { name: 'Beast Mode', description: 'Complete 25 workouts', category: 'workout', icon: 'flame', criteria_type: 'workout_count', criteria_value: 25, rarity: 'rare' },
    { name: 'Century', description: 'Complete 100 workouts', category: 'workout', icon: 'medal', criteria_type: 'workout_count', criteria_value: 100, rarity: 'epic' },
    { name: 'Iron Legend', description: 'Complete 500 workouts', category: 'workout', icon: 'trophy', criteria_type: 'workout_count', criteria_value: 500, rarity: 'legendary' },
    // Nutrition
    { name: 'Clean Eater', description: 'Hit nutrition goals for 7 days', category: 'nutrition', icon: 'salad', criteria_type: 'nutrition_days', criteria_value: 7, rarity: 'common' },
    { name: 'Hydration Hero', description: 'Hit water goal for 14 days', category: 'nutrition', icon: 'water', criteria_type: 'hydration_days', criteria_value: 14, rarity: 'rare' },
    { name: 'Macro Master', description: 'Hit macro targets for 30 days', category: 'nutrition', icon: 'chart', criteria_type: 'macro_days', criteria_value: 30, rarity: 'epic' },
    // Social
    { name: 'Social Butterfly', description: 'Refer 3 friends to the gym', category: 'social', icon: 'people', criteria_type: 'referral_count', criteria_value: 3, rarity: 'common' },
    { name: 'Influencer', description: 'Refer 10 friends to the gym', category: 'social', icon: 'megaphone', criteria_type: 'referral_count', criteria_value: 10, rarity: 'rare' },
    { name: 'Ambassador', description: 'Refer 25 friends to the gym', category: 'social', icon: 'star', criteria_type: 'referral_count', criteria_value: 25, rarity: 'epic' },
    // Special
    { name: 'Early Bird', description: 'Complete a workout before 5 AM', category: 'special', icon: 'sunrise', criteria_type: 'early_workout', criteria_value: 1, rarity: 'common' },
    { name: 'Night Owl', description: 'Complete a workout after 10 PM', category: 'special', icon: 'moon', criteria_type: 'late_workout', criteria_value: 1, rarity: 'common' },
    { name: 'Consistency King', description: 'Maintain a 60-day activity streak', category: 'special', icon: 'crown', criteria_type: 'activity_streak', criteria_value: 60, rarity: 'legendary' },
  ]);

  // --- SEED: Recipes ---
  await knex('recipes').insert([
    {
      title: 'Paneer Tikka Salad',
      description: 'High-protein Indian salad with grilled paneer tikka on a bed of fresh greens',
      category: 'indian',
      cook_time_minutes: 25,
      difficulty: 'easy',
      calories: 380,
      protein_g: 28.0,
      carbs_g: 18.0,
      fat_g: 22.0,
      ingredients: JSON.stringify(['200g paneer cubes', '1 tbsp tikka masala paste', '1 tbsp yogurt', 'Mixed greens', 'Cherry tomatoes', 'Cucumber', 'Red onion', 'Lemon juice', 'Salt and pepper']),
      instructions: JSON.stringify(['Marinate paneer in yogurt and tikka paste for 15 minutes', 'Grill or pan-fry paneer until golden on all sides', 'Arrange mixed greens, tomatoes, cucumber on a plate', 'Top with grilled paneer tikka', 'Drizzle with lemon juice and season']),
      tags: ['high-protein', 'vegetarian', 'indian', 'salad'],
    },
    {
      title: 'Chicken Biryani (Lean)',
      description: 'Lighter version of the classic biryani using brown rice and lean chicken breast',
      category: 'indian',
      cook_time_minutes: 50,
      difficulty: 'medium',
      calories: 450,
      protein_g: 38.0,
      carbs_g: 52.0,
      fat_g: 10.0,
      ingredients: JSON.stringify(['300g chicken breast', '1 cup brown basmati rice', '1 onion sliced', '2 tbsp biryani masala', '1/2 cup yogurt', 'Mint leaves', 'Coriander', 'Whole spices (bay leaf, cardamom, cinnamon)', 'Saffron strands', 'Salt']),
      instructions: JSON.stringify(['Marinate chicken in yogurt and biryani masala for 30 minutes', 'Soak brown rice for 20 minutes and parboil', 'Sauté onions until golden, add marinated chicken', 'Cook chicken for 10 minutes', 'Layer rice over chicken, add saffron milk', 'Cover and cook on low heat (dum) for 20 minutes', 'Garnish with mint and coriander']),
      tags: ['high-protein', 'indian', 'meal-prep'],
    },
    {
      title: 'Dal Tadka',
      description: 'Protein-rich yellow lentils tempered with aromatic spices',
      category: 'indian',
      cook_time_minutes: 30,
      difficulty: 'easy',
      calories: 280,
      protein_g: 18.0,
      carbs_g: 42.0,
      fat_g: 6.0,
      ingredients: JSON.stringify(['1 cup yellow moong dal', '1 tomato chopped', '1 onion chopped', '2 cloves garlic', '1 tsp cumin seeds', '1 tsp turmeric', '1 tsp red chili powder', 'Ghee 1 tsp', 'Coriander leaves', 'Salt']),
      instructions: JSON.stringify(['Wash and pressure cook dal with turmeric until soft', 'Heat ghee in a pan, add cumin seeds', 'Add garlic and onions, sauté until golden', 'Add tomatoes and spices, cook until soft', 'Pour tempering over cooked dal', 'Garnish with fresh coriander']),
      tags: ['high-protein', 'vegetarian', 'vegan-option', 'indian'],
    },
    {
      title: 'Oats Upma',
      description: 'Quick and nutritious South Indian-style savory oats',
      category: 'indian',
      cook_time_minutes: 15,
      difficulty: 'easy',
      calories: 220,
      protein_g: 8.0,
      carbs_g: 34.0,
      fat_g: 7.0,
      ingredients: JSON.stringify(['1 cup rolled oats', '1 onion diced', '1 green chili', 'Curry leaves', '1 tsp mustard seeds', '1 tsp urad dal', 'Mixed vegetables (carrots, peas, beans)', 'Lemon juice', 'Coriander leaves', 'Salt']),
      instructions: JSON.stringify(['Dry roast oats in a pan for 2 minutes and set aside', 'Heat oil, add mustard seeds and urad dal', 'Add curry leaves, green chili, onion and sauté', 'Add mixed vegetables and cook for 3 minutes', 'Add water and salt, bring to boil', 'Add roasted oats, mix well and cook 2 minutes', 'Squeeze lemon juice and garnish with coriander']),
      tags: ['breakfast', 'vegetarian', 'quick', 'indian'],
    },
    {
      title: 'Ragi Dosa',
      description: 'High-calcium finger millet dosa, perfect for a fitness breakfast',
      category: 'indian',
      cook_time_minutes: 20,
      difficulty: 'easy',
      calories: 190,
      protein_g: 6.0,
      carbs_g: 36.0,
      fat_g: 3.0,
      ingredients: JSON.stringify(['1 cup ragi (finger millet) flour', '1/4 cup rice flour', '1 onion finely chopped', '1 green chili chopped', 'Cumin seeds', 'Coriander leaves', 'Salt', 'Water']),
      instructions: JSON.stringify(['Mix ragi flour and rice flour together', 'Add water gradually to form a thin batter', 'Add chopped onion, chili, cumin and coriander', 'Heat a non-stick tawa, pour batter in circular motion', 'Cook on medium heat until edges crisp up', 'Fold and serve with coconut chutney']),
      tags: ['breakfast', 'vegetarian', 'gluten-free', 'indian'],
    },
    {
      title: 'Sprouts Chaat',
      description: 'Crunchy and tangy mixed sprouts chaat packed with protein',
      category: 'indian',
      cook_time_minutes: 10,
      difficulty: 'easy',
      calories: 200,
      protein_g: 14.0,
      carbs_g: 30.0,
      fat_g: 3.0,
      ingredients: JSON.stringify(['2 cups mixed sprouts (moong, chana)', '1 onion diced', '1 tomato diced', '1 cucumber diced', 'Green chutney', 'Tamarind chutney', 'Chaat masala', 'Lemon juice', 'Coriander leaves', 'Sev for topping']),
      instructions: JSON.stringify(['Steam or boil sprouts until tender but crunchy', 'Mix with chopped onion, tomato and cucumber', 'Add green chutney and tamarind chutney', 'Sprinkle chaat masala and squeeze lemon', 'Toss everything together', 'Top with sev and coriander before serving']),
      tags: ['snack', 'vegetarian', 'high-protein', 'indian'],
    },
    {
      title: 'Egg Bhurji',
      description: 'Indian scrambled eggs with onions, tomatoes and spices',
      category: 'indian',
      cook_time_minutes: 10,
      difficulty: 'easy',
      calories: 250,
      protein_g: 18.0,
      carbs_g: 6.0,
      fat_g: 18.0,
      ingredients: JSON.stringify(['4 eggs', '1 onion finely chopped', '1 tomato chopped', '1 green chili', '1/2 tsp turmeric', '1/2 tsp red chili powder', 'Coriander leaves', '1 tsp oil or butter', 'Salt and pepper']),
      instructions: JSON.stringify(['Heat oil in a pan, sauté onions until translucent', 'Add green chili and tomatoes, cook 2 minutes', 'Add turmeric and chili powder', 'Crack eggs directly into the pan', 'Scramble on medium heat until just set', 'Garnish with coriander and serve hot']),
      tags: ['breakfast', 'high-protein', 'quick', 'indian', 'keto'],
    },
    {
      title: 'Greek Yogurt Bowl',
      description: 'Creamy Greek yogurt topped with berries, granola and honey',
      category: 'international',
      cook_time_minutes: 5,
      difficulty: 'easy',
      calories: 320,
      protein_g: 22.0,
      carbs_g: 40.0,
      fat_g: 8.0,
      ingredients: JSON.stringify(['200g Greek yogurt', '1/2 cup mixed berries', '1/4 cup granola', '1 tbsp honey', '1 tbsp chia seeds', '1 tbsp almond flakes']),
      instructions: JSON.stringify(['Spoon Greek yogurt into a bowl', 'Top with mixed berries', 'Add granola and chia seeds', 'Drizzle with honey', 'Sprinkle almond flakes on top']),
      tags: ['breakfast', 'high-protein', 'quick', 'vegetarian'],
    },
    {
      title: 'Grilled Chicken Breast',
      description: 'Simply seasoned and perfectly grilled chicken breast with steamed vegetables',
      category: 'international',
      cook_time_minutes: 25,
      difficulty: 'easy',
      calories: 350,
      protein_g: 42.0,
      carbs_g: 12.0,
      fat_g: 14.0,
      ingredients: JSON.stringify(['250g chicken breast', '1 tbsp olive oil', '1 tsp garlic powder', '1 tsp paprika', 'Mixed herbs (oregano, thyme)', 'Broccoli florets', 'Asparagus', 'Lemon wedge', 'Salt and pepper']),
      instructions: JSON.stringify(['Butterfly chicken breast for even cooking', 'Season with olive oil, garlic powder, paprika and herbs', 'Preheat grill or grill pan to medium-high', 'Grill chicken 5-6 minutes each side until cooked through', 'Steam broccoli and asparagus until tender-crisp', 'Serve chicken with vegetables and lemon wedge']),
      tags: ['high-protein', 'low-carb', 'meal-prep', 'keto'],
    },
    {
      title: 'Protein Pancakes',
      description: 'Fluffy pancakes made with protein powder and oats',
      category: 'international',
      cook_time_minutes: 15,
      difficulty: 'easy',
      calories: 340,
      protein_g: 30.0,
      carbs_g: 38.0,
      fat_g: 8.0,
      ingredients: JSON.stringify(['1 scoop whey protein powder', '1/2 cup rolled oats', '1 banana', '2 egg whites', '1/4 cup milk', '1 tsp baking powder', 'Pinch of cinnamon', 'Berries for topping']),
      instructions: JSON.stringify(['Blend oats into flour in a blender', 'Add protein powder, banana, egg whites, milk, baking powder', 'Blend until smooth batter forms', 'Heat non-stick pan on medium heat', 'Pour small circles of batter', 'Flip when bubbles form on surface', 'Stack and top with fresh berries']),
      tags: ['breakfast', 'high-protein', 'vegetarian'],
    },
    {
      title: 'Overnight Oats',
      description: 'No-cook oats soaked overnight with chia seeds and fruits',
      category: 'international',
      cook_time_minutes: 5,
      difficulty: 'easy',
      calories: 290,
      protein_g: 12.0,
      carbs_g: 48.0,
      fat_g: 7.0,
      ingredients: JSON.stringify(['1/2 cup rolled oats', '1/2 cup milk', '1/4 cup yogurt', '1 tbsp chia seeds', '1 tbsp honey', '1/2 banana sliced', 'Handful of berries', '1 tbsp peanut butter']),
      instructions: JSON.stringify(['Combine oats, milk, yogurt and chia seeds in a jar', 'Stir well and add honey', 'Cover and refrigerate overnight (at least 6 hours)', 'In the morning, top with sliced banana and berries', 'Add a dollop of peanut butter', 'Enjoy cold or microwave for 1 minute']),
      tags: ['breakfast', 'meal-prep', 'vegetarian', 'no-cook'],
    },
    {
      title: 'Quinoa Power Bowl',
      description: 'Nutrient-dense quinoa bowl with roasted vegetables and tahini dressing',
      category: 'international',
      cook_time_minutes: 30,
      difficulty: 'medium',
      calories: 420,
      protein_g: 16.0,
      carbs_g: 52.0,
      fat_g: 18.0,
      ingredients: JSON.stringify(['1 cup cooked quinoa', 'Sweet potato cubed', 'Chickpeas (canned, drained)', 'Baby spinach', 'Avocado sliced', 'Cherry tomatoes', '2 tbsp tahini', '1 tbsp lemon juice', '1 clove garlic minced', 'Salt and pepper']),
      instructions: JSON.stringify(['Cook quinoa according to package directions', 'Roast sweet potato and chickpeas at 200C for 20 minutes', 'Whisk tahini, lemon juice, garlic and water for dressing', 'Build bowl: quinoa base, roasted vegetables', 'Add fresh spinach, avocado and cherry tomatoes', 'Drizzle tahini dressing over the bowl']),
      tags: ['vegetarian', 'vegan', 'high-fiber', 'meal-prep'],
    },
    {
      title: 'Tuna Salad',
      description: 'Light and protein-packed tuna salad with lemon vinaigrette',
      category: 'international',
      cook_time_minutes: 10,
      difficulty: 'easy',
      calories: 280,
      protein_g: 32.0,
      carbs_g: 10.0,
      fat_g: 14.0,
      ingredients: JSON.stringify(['1 can tuna in water (drained)', 'Mixed salad greens', '1/2 cucumber diced', 'Cherry tomatoes halved', '1/4 red onion sliced', '1 boiled egg', 'Olive oil', 'Lemon juice', 'Dijon mustard', 'Salt and pepper']),
      instructions: JSON.stringify(['Drain tuna and flake into a bowl', 'Arrange mixed greens on a plate', 'Add cucumber, tomatoes and red onion', 'Top with flaked tuna and halved boiled egg', 'Whisk olive oil, lemon juice and mustard for dressing', 'Drizzle dressing over salad and season']),
      tags: ['high-protein', 'low-carb', 'quick', 'keto'],
    },
    {
      title: 'Smoothie Bowl',
      description: 'Thick blended smoothie bowl loaded with superfoods and toppings',
      category: 'international',
      cook_time_minutes: 10,
      difficulty: 'easy',
      calories: 310,
      protein_g: 14.0,
      carbs_g: 52.0,
      fat_g: 8.0,
      ingredients: JSON.stringify(['1 frozen banana', '1/2 cup frozen mixed berries', '1/2 cup spinach', '1 scoop protein powder', '1/4 cup almond milk', '1 tbsp granola', '1 tbsp coconut flakes', '1 tbsp pumpkin seeds', 'Fresh fruit for topping']),
      instructions: JSON.stringify(['Blend frozen banana, berries, spinach, protein powder and almond milk', 'Blend until thick and smooth (add minimal liquid)', 'Pour into a bowl', 'Arrange toppings: granola, coconut, pumpkin seeds', 'Add fresh fruit slices on top', 'Serve immediately']),
      tags: ['breakfast', 'vegetarian', 'high-fiber', 'post-workout'],
    },
    {
      title: 'Masala Egg White Omelette',
      description: 'Spiced egg white omelette with vegetables - zero guilt breakfast',
      category: 'indian',
      cook_time_minutes: 10,
      difficulty: 'easy',
      calories: 160,
      protein_g: 22.0,
      carbs_g: 6.0,
      fat_g: 4.0,
      ingredients: JSON.stringify(['5 egg whites', '1 onion finely chopped', '1 green chili chopped', '1 tomato diced', 'Capsicum diced', '1/4 tsp turmeric', 'Coriander leaves', '1 tsp oil', 'Salt and pepper']),
      instructions: JSON.stringify(['Whisk egg whites with salt, pepper and turmeric', 'Heat oil in a non-stick pan', 'Sauté onion, chili, capsicum for 1 minute', 'Pour egg whites evenly over vegetables', 'Cook on low heat until edges set', 'Fold omelette in half and cook 1 more minute', 'Garnish with coriander and serve']),
      tags: ['breakfast', 'high-protein', 'low-fat', 'indian', 'keto'],
    },
  ]);
}

export async function down(knex) {
  await knex.schema
    .dropTableIfExists('sleep_logs')
    .dropTableIfExists('food_scan_logs')
    .dropTableIfExists('member_favorite_recipes')
    .dropTableIfExists('recipes')
    .dropTableIfExists('member_achievements')
    .dropTableIfExists('achievements')
    .dropTableIfExists('member_xp')
    .dropTableIfExists('member_challenges')
    .dropTableIfExists('challenges');
}
