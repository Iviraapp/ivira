/**
 * Seed 5 demo gyms in Bengaluru for GymFinder + 3 demo members
 */

const OWNER_GYM_ID = '3978a6cb-0ae4-4eae-9744-204fba055f08'

const DEMO_GYMS = [
  {
    id: OWNER_GYM_ID,
    owner_firebase_uid: 'demo_owner_koramangala',
    owner_name: 'Arjun Sharma',
    owner_phone: '+919876543210',
    owner_email: 'arjun@ironpulse.in',
    gym_name: 'Iron Pulse Fitness',
    city: 'Bengaluru',
    address: '1st Cross, 5th Block, Koramangala, Bengaluru 560095',
    latitude: 12.9352,
    longitude: 77.6245,
    status: 'active',
  },
  {
    id: undefined, // auto-generate
    owner_firebase_uid: 'demo_owner_indiranagar',
    owner_name: 'Priya Reddy',
    owner_phone: '+919876543211',
    owner_email: 'priya@zenfit.in',
    gym_name: 'ZenFit Studio',
    city: 'Bengaluru',
    address: '100 Feet Road, Indiranagar, Bengaluru 560038',
    latitude: 12.9784,
    longitude: 77.6408,
    status: 'active',
  },
  {
    id: undefined,
    owner_firebase_uid: 'demo_owner_hsr',
    owner_name: 'Karthik Nair',
    owner_phone: '+919876543212',
    owner_email: 'karthik@beastmode.in',
    gym_name: 'Beast Mode Gym',
    city: 'Bengaluru',
    address: '27th Main, HSR Layout Sector 1, Bengaluru 560102',
    latitude: 12.9116,
    longitude: 77.6474,
    status: 'active',
  },
  {
    id: undefined,
    owner_firebase_uid: 'demo_owner_whitefield',
    owner_name: 'Meera Joshi',
    owner_phone: '+919876543213',
    owner_email: 'meera@flexzone.in',
    gym_name: 'FlexZone Whitefield',
    city: 'Bengaluru',
    address: 'ITPL Main Road, Whitefield, Bengaluru 560066',
    latitude: 12.9698,
    longitude: 77.7500,
    status: 'active',
  },
  {
    id: undefined,
    owner_firebase_uid: 'demo_owner_jayanagar',
    owner_name: 'Vikram Rao',
    owner_phone: '+919876543214',
    owner_email: 'vikram@corestrength.in',
    gym_name: 'Core Strength Academy',
    city: 'Bengaluru',
    address: '11th Main, 4th Block, Jayanagar, Bengaluru 560011',
    latitude: 12.9250,
    longitude: 77.5938,
    status: 'active',
  },
]

const DEMO_PROFILES = [
  {
    gym_index: 0,
    description: 'Premium strength & conditioning gym in the heart of Koramangala. State-of-the-art equipment, expert trainers, and a motivating atmosphere.',
    amenities: ['AC', 'Parking', 'Locker', 'Sauna', 'Steam Room', 'Protein Bar'],
    photos: [
      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
      'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=800&q=80',
      'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800&q=80',
    ],
    timings: { open: '05:00', close: '23:00', days: 'Mon-Sat' },
    area: 'Koramangala',
    day_pass_paise: 39900,
    avg_rating: 4.7,
    review_count: 142,
  },
  {
    gym_index: 1,
    description: 'Boutique fitness studio offering yoga, HIIT, and functional training classes. A peaceful yet intense workout experience on 100 Feet Road.',
    amenities: ['AC', 'Locker', 'Yoga Studio', 'Shower', 'Parking'],
    photos: [
      'https://images.unsplash.com/photo-1558611848-73f7eb4001a1?w=800&q=80',
      'https://images.unsplash.com/photo-1593079831268-3381b0db4a77?w=800&q=80',
      'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80',
    ],
    timings: { open: '06:00', close: '22:00', days: 'Mon-Sat' },
    area: 'Indiranagar',
    day_pass_paise: 29900,
    avg_rating: 4.9,
    review_count: 89,
  },
  {
    gym_index: 2,
    description: 'Hardcore bodybuilding and powerlifting gym. Competition-grade equipment, chalk bowls, and a no-nonsense training environment.',
    amenities: ['AC', 'Locker', 'Parking', 'Supplement Store'],
    photos: [
      'https://images.unsplash.com/photo-1605296867304-46d5465a13f1?w=800&q=80',
      'https://images.unsplash.com/photo-1576678927484-cc907957088c?w=800&q=80',
      'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&q=80',
    ],
    timings: { open: '05:30', close: '22:30', days: 'Mon-Sat' },
    area: 'HSR Layout',
    day_pass_paise: 34900,
    avg_rating: 4.5,
    review_count: 203,
  },
  {
    gym_index: 3,
    description: 'Modern fitness center near ITPL with swimming pool, group classes, and personal training. Perfect for IT professionals.',
    amenities: ['AC', 'Pool', 'Locker', 'Sauna', 'Parking', 'Cafeteria'],
    photos: [
      'https://images.unsplash.com/photo-1570829460005-c840387bb1ca?w=800&q=80',
      'https://images.unsplash.com/photo-1519505907962-0a6cb0167c73?w=800&q=80',
      'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80',
    ],
    timings: { open: '05:00', close: '23:00', days: 'All Days' },
    area: 'Whitefield',
    day_pass_paise: 49900,
    avg_rating: 4.3,
    review_count: 67,
  },
  {
    gym_index: 4,
    description: 'Functional fitness and CrossFit box in Jayanagar. Group WODs, Olympic lifting coaching, and mobility sessions.',
    amenities: ['AC', 'Locker', 'Parking', 'Outdoor Area'],
    photos: [
      'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80',
      'https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=800&q=80',
      'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800&q=80',
    ],
    timings: { open: '06:00', close: '21:00', days: 'Mon-Sat' },
    area: 'Jayanagar',
    day_pass_paise: 29900,
    avg_rating: 3.8,
    review_count: 45,
  },
]

const DEMO_MEMBERS = [
  {
    name: 'Rahul Menon',
    phone: '+919900112233',
    email: 'rahul.menon@gmail.com',
    gender: 'male',
    status: 'active',
  },
  {
    name: 'Sneha Kulkarni',
    phone: '+919900112234',
    email: 'sneha.k@gmail.com',
    gender: 'female',
    status: 'active',
  },
  {
    name: 'Deepak Gowda',
    phone: '+919900112235',
    email: 'deepak.g@gmail.com',
    gender: 'male',
    status: 'active',
  },
]

export async function seed(knex) {
  // Insert gyms (skip if already exists)
  for (const gym of DEMO_GYMS) {
    const payload = { ...gym }
    if (!payload.id) delete payload.id

    const exists = await knex('gyms')
      .where(payload.id ? { id: payload.id } : { owner_email: payload.owner_email })
      .first()

    if (!exists) {
      await knex('gyms').insert(payload)
    }
  }

  // Fetch inserted gym IDs
  const gymRows = await knex('gyms')
    .whereIn('owner_email', DEMO_GYMS.map(g => g.owner_email))
    .orderBy('owner_email')

  const gymIdMap = {}
  for (const row of gymRows) {
    const idx = DEMO_GYMS.findIndex(g => g.owner_email === row.owner_email)
    if (idx >= 0) gymIdMap[idx] = row.id
  }

  // Insert gym profiles
  for (const profile of DEMO_PROFILES) {
    const gymId = gymIdMap[profile.gym_index]
    if (!gymId) continue

    const exists = await knex('gym_profiles').where({ gym_id: gymId }).first()
    if (!exists) {
      await knex('gym_profiles').insert({
        gym_id: gymId,
        description: profile.description,
        amenities: JSON.stringify(profile.amenities),
        photos: JSON.stringify(profile.photos),
        timings: JSON.stringify(profile.timings),
        address: DEMO_GYMS[profile.gym_index].address,
        city: 'Bengaluru',
        area: profile.area,
        latitude: DEMO_GYMS[profile.gym_index].latitude,
        longitude: DEMO_GYMS[profile.gym_index].longitude,
        day_pass_paise: profile.day_pass_paise,
        accepts_day_pass: true,
        is_listed: true,
        avg_rating: profile.avg_rating,
        review_count: profile.review_count,
      })
    }
  }

  // Insert 3 demo members for the owner gym
  for (const member of DEMO_MEMBERS) {
    const exists = await knex('members')
      .where({ gym_id: OWNER_GYM_ID, phone: member.phone })
      .first()

    if (!exists) {
      await knex('members').insert({
        gym_id: OWNER_GYM_ID,
        ...member,
      })
    }
  }

  // Create gym plans for owner gym if not exists
  const plansExist = await knex('gym_plans').where({ gym_id: OWNER_GYM_ID }).first()
  if (!plansExist) {
    const plans = [
      { gym_id: OWNER_GYM_ID, name: 'Monthly', duration_days: 30, price: 200000, is_active: true },
      { gym_id: OWNER_GYM_ID, name: 'Quarterly', duration_days: 90, price: 500000, is_active: true },
      { gym_id: OWNER_GYM_ID, name: 'Annual', duration_days: 365, price: 1500000, is_active: true },
    ]
    await knex('gym_plans').insert(plans)
  }

  // Create memberships for demo members
  const memberRows = await knex('members').where({ gym_id: OWNER_GYM_ID })
  const monthlyPlan = await knex('gym_plans')
    .where({ gym_id: OWNER_GYM_ID, name: 'Monthly' })
    .first()

  if (monthlyPlan) {
    for (const member of memberRows) {
      const membershipExists = await knex('memberships')
        .where({ member_id: member.id, gym_id: OWNER_GYM_ID, status: 'active' })
        .first()

      if (!membershipExists) {
        const startDate = new Date()
        const endDate = new Date()
        endDate.setDate(endDate.getDate() + 30)

        await knex('memberships').insert({
          member_id: member.id,
          gym_id: OWNER_GYM_ID,
          plan_name: 'Monthly',
          plan_id: monthlyPlan.id,
          amount_paise: 200000,
          status: 'active',
          start_date: startDate.toISOString().slice(0, 10),
          end_date: endDate.toISOString().slice(0, 10),
        })
      }
    }
  }

  console.log('Seeded 5 demo gyms, profiles, and 3 demo members')
}
