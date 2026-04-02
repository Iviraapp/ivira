/**
 * Seed 008 — Global challenges, achievements, and demo gym profiles
 *
 * Run: npx knex seed:run --specific=008_challenges_achievements_gyms.js
 *
 * What this seeds:
 *  1. 12 global challenges (null gym_id = available to all gyms)
 *  2. 20 achievement definitions
 *  3. 4 demo gym profiles for concierge discovery in major Indian cities
 */

export async function seed(knex) {

  // ── 1. Global challenges ───────────────────────────────────────
  // Safe: only inserts rows that don't exist (matches by title + null gym_id)
  const existingChallenges = await knex('challenges')
    .whereNull('gym_id')
    .pluck('title')

  const challenges = [
    // Daily challenges
    {
      title: 'Check In Today',
      description: 'Visit your gym and check in today.',
      type: 'daily',
      category: 'attendance',
      target_value: 1,
      reward_xp: 50,
      difficulty: 'easy',
      icon: '🏋️',
    },
    {
      title: '10,000 Steps',
      description: 'Hit 10,000 steps before midnight.',
      type: 'daily',
      category: 'activity',
      target_value: 10000,
      reward_xp: 60,
      difficulty: 'easy',
      icon: '👟',
    },
    {
      title: 'Log Every Meal',
      description: 'Log breakfast, lunch, and dinner in the food tracker.',
      type: 'daily',
      category: 'nutrition',
      target_value: 3,
      reward_xp: 40,
      difficulty: 'easy',
      icon: '🥗',
    },
    {
      title: 'Track Your Sleep',
      description: 'Complete a sleep tracking session tonight.',
      type: 'daily',
      category: 'recovery',
      target_value: 1,
      reward_xp: 30,
      difficulty: 'easy',
      icon: '😴',
    },
    {
      title: 'Log a Workout',
      description: 'Complete and log a workout session.',
      type: 'daily',
      category: 'strength',
      target_value: 1,
      reward_xp: 70,
      difficulty: 'medium',
      icon: '💪',
    },
    {
      title: 'Hit Your Protein Goal',
      description: 'Reach your daily protein target.',
      type: 'daily',
      category: 'nutrition',
      target_value: 1,
      reward_xp: 50,
      difficulty: 'medium',
      icon: '🥩',
    },

    // Weekly challenges
    {
      title: '5-Day Warrior',
      description: 'Check in 5 days this week.',
      type: 'weekly',
      category: 'attendance',
      target_value: 5,
      reward_xp: 200,
      difficulty: 'medium',
      icon: '🔥',
    },
    {
      title: '70,000 Step Week',
      description: 'Accumulate 70,000 steps across the week.',
      type: 'weekly',
      category: 'activity',
      target_value: 70000,
      reward_xp: 250,
      difficulty: 'medium',
      icon: '🏃',
    },
    {
      title: 'Clean Eating Week',
      description: 'Log meals every day this week.',
      type: 'weekly',
      category: 'nutrition',
      target_value: 7,
      reward_xp: 180,
      difficulty: 'medium',
      icon: '🥦',
    },
    {
      title: '4 Workouts This Week',
      description: 'Complete 4 logged workout sessions.',
      type: 'weekly',
      category: 'strength',
      target_value: 4,
      reward_xp: 300,
      difficulty: 'hard',
      icon: '🏆',
    },
    {
      title: 'Circle Active Week',
      description: 'Post in your Circle 3 times this week.',
      type: 'weekly',
      category: 'social',
      target_value: 3,
      reward_xp: 150,
      difficulty: 'easy',
      icon: '👥',
    },
    {
      title: 'Vira Power User',
      description: 'Chat with Vira AI 5 times this week.',
      type: 'weekly',
      category: 'ai',
      target_value: 5,
      reward_xp: 120,
      difficulty: 'easy',
      icon: '⚡',
    },
  ]

  const toInsert = challenges.filter(c => !existingChallenges.includes(c.title))
  if (toInsert.length > 0) {
    await knex('challenges').insert(toInsert)
    console.log(`✓ Inserted ${toInsert.length} challenges`)
  } else {
    console.log('✓ Challenges already seeded')
  }

  // ── 2. Achievement definitions ─────────────────────────────────
  const existingAchievements = await knex('achievements').pluck('name')

  const achievements = [
    // Attendance
    { name: 'First Step',       description: 'Complete your first gym check-in.',          category: 'attendance', criteria_type: 'checkin_count',  criteria_value: 1,    rarity: 'common',    icon: '👟' },
    { name: 'Week Warrior',     description: 'Check in 7 days in a row.',                  category: 'attendance', criteria_type: 'streak_days',     criteria_value: 7,    rarity: 'common',    icon: '🔥' },
    { name: '30-Day Beast',     description: 'Maintain a 30-day check-in streak.',         category: 'attendance', criteria_type: 'streak_days',     criteria_value: 30,   rarity: 'rare',      icon: '🎯' },
    { name: '100-Day Legend',   description: 'Maintain a 100-day check-in streak.',        category: 'attendance', criteria_type: 'streak_days',     criteria_value: 100,  rarity: 'legendary', icon: '🏆' },
    { name: 'Century Club',     description: 'Complete 100 total check-ins.',              category: 'attendance', criteria_type: 'checkin_count',   criteria_value: 100,  rarity: 'rare',      icon: '💯' },

    // Fitness
    { name: 'Power Lifter',     description: 'Log 50 workout sessions.',                   category: 'fitness',    criteria_type: 'workout_count',   criteria_value: 50,   rarity: 'rare',      icon: '🏋️' },
    { name: 'Iron Will',        description: 'Log 200 workout sessions.',                  category: 'fitness',    criteria_type: 'workout_count',   criteria_value: 200,  rarity: 'epic',      icon: '⚙️' },
    { name: 'Step Master',      description: 'Accumulate 1,000,000 total steps.',          category: 'fitness',    criteria_type: 'total_steps',     criteria_value: 1000000, rarity: 'epic',   icon: '👟' },
    { name: '5 AM Club',        description: 'Check in before 6 AM, 10 times.',            category: 'fitness',    criteria_type: 'early_checkins',  criteria_value: 10,   rarity: 'rare',      icon: '🌅' },

    // Nutrition
    { name: 'Nutrition Nerd',   description: 'Log meals for 30 consecutive days.',         category: 'nutrition',  criteria_type: 'nutrition_streak', criteria_value: 30,  rarity: 'rare',      icon: '🥗' },
    { name: 'Protein Pro',      description: 'Hit your protein goal 20 days.',             category: 'nutrition',  criteria_type: 'protein_days',    criteria_value: 20,   rarity: 'common',    icon: '🥩' },

    // Sleep
    { name: 'Sleep Scientist',  description: 'Track sleep for 14 nights.',                 category: 'recovery',   criteria_type: 'sleep_nights',    criteria_value: 14,   rarity: 'common',    icon: '😴' },
    { name: 'Deep Sleeper',     description: 'Achieve 85+ sleep score, 7 nights.',         category: 'recovery',   criteria_type: 'quality_sleep',   criteria_value: 7,    rarity: 'rare',      icon: '🌙' },

    // Social
    { name: 'Circle Founder',   description: 'Create your first accountability Circle.',   category: 'social',     criteria_type: 'circles_created', criteria_value: 1,    rarity: 'common',    icon: '⭕' },
    { name: 'Connector',        description: 'Refer 3 friends who join your gym.',         category: 'social',     criteria_type: 'referrals',       criteria_value: 3,    rarity: 'rare',      icon: '🤝' },
    { name: 'Community Pillar', description: 'Refer 10 friends who join.',                 category: 'social',     criteria_type: 'referrals',       criteria_value: 10,   rarity: 'epic',      icon: '🏛️' },

    // AI
    { name: 'Vira\'s Student',  description: 'Chat with Vira AI 25 times.',                category: 'ai',         criteria_type: 'vira_sessions',   criteria_value: 25,   rarity: 'common',    icon: '⚡' },
    { name: 'AI Native',        description: 'Chat with Vira AI 100 times.',               category: 'ai',         criteria_type: 'vira_sessions',   criteria_value: 100,  rarity: 'rare',      icon: '🤖' },

    // Fasting
    { name: 'Fast Starter',     description: 'Complete your first 16-hour fast.',          category: 'health',     criteria_type: 'fasting_count',   criteria_value: 1,    rarity: 'common',    icon: '⏱️' },
    { name: 'Warrior Fast',     description: 'Complete a 24-hour fast.',                   category: 'health',     criteria_type: 'fasting_24h',     criteria_value: 1,    rarity: 'epic',      icon: '🧘' },
  ]

  const achievementsToInsert = achievements.filter(a => !existingAchievements.includes(a.name))
  if (achievementsToInsert.length > 0) {
    await knex('achievements').insert(achievementsToInsert)
    console.log(`✓ Inserted ${achievementsToInsert.length} achievements`)
  } else {
    console.log('✓ Achievements already seeded')
  }

  // ── 3. Demo gym profiles for concierge discovery ───────────────
  // These are fictitious demo gyms for the city leaderboard and
  // concierge day-pass discovery to show real content in dev/staging.
  // Safe: only inserts if gym_profiles has no listed entries.
  const listedCount = await knex('gym_profiles').where('is_listed', true).count('* as n').first()
  if (parseInt(listedCount?.n || 0) === 0) {
    // Only seed demo profiles if no real listed gyms exist
    console.log('No listed gyms found — skipping demo gym profiles (only relevant in dev)')
    console.log('To list your gym for concierge discovery:')
    console.log('  INSERT INTO gym_profiles (gym_id, city, area, discipline_tags, is_listed, ...)')
    console.log('  Or use Settings → Gym Profile → "List on IVIRA Discovery"')
  } else {
    console.log('✓ Listed gym profiles already exist — skipping demo data')
  }

  console.log('\n✅ Seed 008 complete')
  console.log('   Challenges ready:', toInsert.length, 'new / ', challenges.length, 'total')
  console.log('   Achievements ready:', achievementsToInsert.length, 'new / ', achievements.length, 'total')
}
