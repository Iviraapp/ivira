export async function seed(knex) {
  await knex('affiliate_brands').del();
  await knex('affiliate_brands').insert([
    {
      name: 'MuscleBlaze',
      category: 'Protein Supplements',
      commission_rate_percent: 15,
      base_url: 'https://muscleblaze.com',
      description: 'India\'s #1 sports nutrition brand. Protein powders, pre-workouts, and more.',
    },
    {
      name: 'Optimum Nutrition',
      category: 'Protein Supplements',
      commission_rate_percent: 12,
      base_url: 'https://optimumnutrition.com',
      description: 'Gold standard whey protein and premium supplements trusted worldwide.',
    },
    {
      name: 'MyFitness',
      category: 'Peanut Butter & Supplements',
      commission_rate_percent: 14,
      base_url: 'https://myfitness.in',
      description: 'High-protein peanut butter and health supplements made in India.',
    },
    {
      name: 'Decathlon India',
      category: 'Sports Apparel',
      commission_rate_percent: 10,
      base_url: 'https://decathlon.in',
      description: 'Affordable sports gear, gym wear, and fitness equipment.',
    },
    {
      name: 'Puma India',
      category: 'Sports Apparel',
      commission_rate_percent: 8,
      base_url: 'https://in.puma.com',
      description: 'Premium sportswear, running shoes, and training apparel.',
    },
    {
      name: 'HealthifyMe',
      category: 'Nutrition Plans',
      commission_rate_percent: 20,
      base_url: 'https://healthifyme.com',
      description: 'AI-powered diet plans and calorie tracking for Indian diets.',
    },
    {
      name: 'Fittr',
      category: 'Coaching Plans',
      commission_rate_percent: 18,
      base_url: 'https://fittr.com',
      description: 'Expert fitness coaching and transformation programs.',
    },
    {
      name: 'Yoga Bar',
      category: 'Health Foods',
      commission_rate_percent: 12,
      base_url: 'https://yogabar.in',
      description: 'Protein bars, muesli, and healthy snacks for active lifestyles.',
    },
    {
      name: 'Noise',
      category: 'Fitness Wearables',
      commission_rate_percent: 8,
      base_url: 'https://gonoise.com',
      description: 'Smart watches, fitness trackers, and audio gear.',
    },
    {
      name: 'Niva Bupa',
      category: 'Health Insurance',
      commission_rate_percent: 0,
      commission_flat_paise: 100000, // ₹1000 per lead
      base_url: 'https://nivabupa.com',
      description: 'Comprehensive health insurance plans for fitness-conscious individuals.',
    },
  ]);
}
