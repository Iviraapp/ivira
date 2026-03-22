/**
 * PART 1 — Full test gym setup
 * - Update owner gym with Fort Worth coordinates
 * - Add 8 demo members with proper memberships
 * - Add Quarterly + Annual plans
 * - Add gym profile
 * - Add 5 Bengaluru gyms for GymFinder
 */

const GYM_ID = '3978a6cb-0ae4-4eae-9744-204fba055f08'

export async function seed(knex) {
  // ─── 1. Update owner gym with Fort Worth coordinates ───
  await knex('gyms').where({ id: GYM_ID }).update({
    gym_name: 'Iron Temple Fitness — Fort Worth',
    address: 'Camp Bowie District, Fort Worth, TX 76107',
    city: 'Fort Worth',
    latitude: 32.753076,
    longitude: -97.347903,
    status: 'active',
  })
  console.log('Updated owner gym with Fort Worth coordinates')

  // ─── 2. Ensure all 3 plans exist ───
  const existingPlans = await knex('gym_plans').where({ gym_id: GYM_ID })
  const planNames = existingPlans.map(p => p.name)

  const plansToAdd = []
  if (!planNames.includes('Monthly')) {
    plansToAdd.push({ gym_id: GYM_ID, name: 'Monthly', duration_months: 1, price_paise: 200000, active: true })
  }
  if (!planNames.includes('Quarterly')) {
    plansToAdd.push({ gym_id: GYM_ID, name: 'Quarterly', duration_months: 3, price_paise: 500000, active: true })
  }
  if (!planNames.includes('Annual')) {
    plansToAdd.push({ gym_id: GYM_ID, name: 'Annual', duration_months: 12, price_paise: 1500000, active: true })
  }
  if (plansToAdd.length > 0) {
    await knex('gym_plans').insert(plansToAdd)
  }

  const plans = await knex('gym_plans').where({ gym_id: GYM_ID })
  const planMap = {}
  for (const p of plans) planMap[p.name] = p

  console.log('Plans ready:', plans.map(p => p.name).join(', '))

  // ─── 3. Add 8 demo members ───
  const today = new Date()
  const MEMBERS = [
    { name: 'Arjun Sharma',   phone: '+919845001001', email: 'arjun@test.com',    gender: 'male',   plan: 'Monthly',   status: 'active', daysLeft: 25 },
    { name: 'Priya Nair',     phone: '+919845001002', email: 'priya@test.com',     gender: 'female', plan: 'Quarterly', status: 'active', daysLeft: 68 },
    { name: 'Rahul Verma',    phone: '+919845001003', email: 'rahul@test.com',     gender: 'male',   plan: 'Annual',    status: 'active', daysLeft: 290 },
    { name: 'Sneha Reddy',    phone: '+919845001004', email: 'sneha@test.com',     gender: 'female', plan: 'Monthly',   status: 'active', daysLeft: 3 },
    { name: 'Kiran Patel',    phone: '+919845001005', email: 'kiran@test.com',     gender: 'male',   plan: 'Monthly',   status: 'expired', daysLeft: -5 },
    { name: 'Mohammed Ali',   phone: '+919845001006', email: 'mohammed@test.com',  gender: 'male',   plan: 'Quarterly', status: 'active', daysLeft: 45 },
    { name: 'Divya Menon',    phone: '+919845001007', email: 'divya@test.com',     gender: 'female', plan: 'Annual',    status: 'active', daysLeft: 180 },
    { name: 'Amit Singh',     phone: '+919845001008', email: 'amit@test.com',      gender: 'male',   plan: 'Monthly',   status: 'active', daysLeft: 12 },
  ]

  for (const m of MEMBERS) {
    let member = await knex('members').where({ gym_id: GYM_ID, phone: m.phone }).first()

    if (!member) {
      ;[member] = await knex('members').insert({
        gym_id: GYM_ID,
        name: m.name,
        phone: m.phone,
        email: m.email,
        gender: m.gender,
        status: m.status === 'expired' ? 'active' : m.status,
        current_plan_id: planMap[m.plan]?.id || null,
      }).returning('*')
    } else {
      await knex('members').where({ id: member.id }).update({
        name: m.name,
        email: m.email,
        gender: m.gender,
        status: m.status === 'expired' ? 'active' : m.status,
        current_plan_id: planMap[m.plan]?.id || null,
      })
      member = await knex('members').where({ id: member.id }).first()
    }

    // Create membership
    const endDate = new Date(today)
    endDate.setDate(endDate.getDate() + m.daysLeft)
    const startDate = new Date(endDate)
    const durationDays = m.plan === 'Monthly' ? 30 : m.plan === 'Quarterly' ? 90 : 365
    startDate.setDate(startDate.getDate() - durationDays)

    const membershipStatus = m.daysLeft < 0 ? 'expired' : 'active'

    // Delete existing active memberships for this member to avoid duplicates
    await knex('memberships').where({ member_id: member.id, gym_id: GYM_ID }).del()

    await knex('memberships').insert({
      member_id: member.id,
      gym_id: GYM_ID,
      plan_name: m.plan,
      plan_id: planMap[m.plan]?.id || null,
      amount_paise: planMap[m.plan]?.price_paise || 200000,
      status: membershipStatus,
      start_date: startDate.toISOString().slice(0, 10),
      end_date: endDate.toISOString().slice(0, 10),
    })
  }
  console.log('Seeded 8 demo members with memberships')

  // ─── 4. Add some check-ins for demo data ───
  const memberRows = await knex('members').where({ gym_id: GYM_ID }).whereIn('phone', ['+919845001001', '+919845001002', '+919845001003', '+919845001006', '+919845001007'])
  for (const member of memberRows) {
    // Add a check-in for today (early morning) if none exists
    const existing = await knex('checkins').where({ member_id: member.id, gym_id: GYM_ID }).whereRaw('DATE(checked_in_at) = CURRENT_DATE').first()
    if (!existing) {
      const checkinTime = new Date()
      checkinTime.setHours(7 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 60))
      await knex('checkins').insert({
        member_id: member.id,
        gym_id: GYM_ID,
        method: ['qr', 'otp', 'manual'][Math.floor(Math.random() * 3)],
        latitude: 32.753076 + (Math.random() - 0.5) * 0.001,
        longitude: -97.347903 + (Math.random() - 0.5) * 0.001,
        gps_valid: true,
        checked_in_at: checkinTime,
      })
    }
  }
  console.log('Seeded check-ins for today')

  // ─── 5. Add gym profile for owner gym ───
  const profileExists = await knex('gym_profiles').where({ gym_id: GYM_ID }).first()
  if (profileExists) {
    await knex('gym_profiles').where({ gym_id: GYM_ID }).update({
      description: 'Premium strength & conditioning gym in the Camp Bowie District. State-of-the-art equipment, expert trainers, and a motivating dark-themed atmosphere.',
      amenities: JSON.stringify(['AC', 'Parking', 'Locker', 'Shower']),
      photos: JSON.stringify([
        'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
        'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=800&q=80',
        'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800&q=80',
      ]),
      timings: JSON.stringify({ open: '05:00', close: '23:00', days: 'Mon-Sat' }),
      address: 'Camp Bowie District, Fort Worth, TX 76107',
      city: 'Fort Worth',
      area: 'Camp Bowie',
      latitude: 32.753076,
      longitude: -97.347903,
      day_pass_paise: 39900,
      accepts_day_pass: true,
      is_listed: true,
      avg_rating: 4.7,
      review_count: 42,
    })
  } else {
    await knex('gym_profiles').insert({
      gym_id: GYM_ID,
      description: 'Premium strength & conditioning gym in the Camp Bowie District. State-of-the-art equipment, expert trainers, and a motivating dark-themed atmosphere.',
      amenities: JSON.stringify(['AC', 'Parking', 'Locker', 'Shower']),
      photos: JSON.stringify([
        'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
        'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=800&q=80',
        'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800&q=80',
      ]),
      timings: JSON.stringify({ open: '05:00', close: '23:00', days: 'Mon-Sat' }),
      address: 'Camp Bowie District, Fort Worth, TX 76107',
      city: 'Fort Worth',
      area: 'Camp Bowie',
      latitude: 32.753076,
      longitude: -97.347903,
      day_pass_paise: 39900,
      accepts_day_pass: true,
      is_listed: true,
      avg_rating: 4.7,
      review_count: 42,
    })
  }
  console.log('Gym profile created for owner gym')

  // ─── 6. Add 5 Bengaluru gyms for GymFinder ───
  const BENGALURU_GYMS = [
    {
      firebase_uid: 'demo_powerzone_kor',
      owner_name: 'Vikram Rao', owner_phone: '+919845100001', owner_email: 'vikram@powerzone.in',
      gym_name: 'PowerZone Gym', city: 'Bengaluru',
      address: '1st Cross, 5th Block, Koramangala, Bengaluru 560095',
      latitude: 12.9352, longitude: 77.6245,
      profile: {
        description: 'Hardcore strength training gym in Koramangala. Competition-grade power racks, Olympic platforms, and a no-nonsense training environment.',
        amenities: ['AC', 'Parking', 'Locker', 'Supplement Store'],
        area: 'Koramangala', day_pass_paise: 34900, avg_rating: 4.5, review_count: 156,
      }
    },
    {
      firebase_uid: 'demo_fitlife_ind',
      owner_name: 'Priya Krishnan', owner_phone: '+919845100002', owner_email: 'priya@fitlife.in',
      gym_name: 'FitLife Studio', city: 'Bengaluru',
      address: '100 Feet Road, Indiranagar, Bengaluru 560038',
      latitude: 12.9784, longitude: 77.6408,
      profile: {
        description: 'Boutique fitness studio offering yoga, HIIT, and functional training. A peaceful yet intense workout experience.',
        amenities: ['AC', 'Locker', 'Yoga Studio', 'Shower', 'Parking'],
        area: 'Indiranagar', day_pass_paise: 39900, avg_rating: 4.8, review_count: 89,
      }
    },
    {
      firebase_uid: 'demo_muscle_hsr',
      owner_name: 'Karthik Nair', owner_phone: '+919845100003', owner_email: 'karthik@musclefactory.in',
      gym_name: 'The Muscle Factory', city: 'Bengaluru',
      address: '27th Main, HSR Layout Sector 1, Bengaluru 560102',
      latitude: 12.9121, longitude: 77.6446,
      profile: {
        description: 'Old-school bodybuilding gym with heavy iron. Chalk bowls, deadlift platforms, and a raw training atmosphere.',
        amenities: ['AC', 'Locker', 'Parking'],
        area: 'HSR Layout', day_pass_paise: 29900, avg_rating: 4.2, review_count: 203,
      }
    },
    {
      firebase_uid: 'demo_elite_wf',
      owner_name: 'Meera Joshi', owner_phone: '+919845100004', owner_email: 'meera@elitefitness.in',
      gym_name: 'Elite Fitness Club', city: 'Bengaluru',
      address: 'ITPL Main Road, Whitefield, Bengaluru 560066',
      latitude: 12.9698, longitude: 77.7499,
      profile: {
        description: 'Modern fitness center with swimming pool, group classes, and personal training. Perfect for IT professionals.',
        amenities: ['AC', 'Pool', 'Locker', 'Sauna', 'Parking', 'Cafeteria'],
        area: 'Whitefield', day_pass_paise: 44900, avg_rating: 4.6, review_count: 67,
      }
    },
    {
      firebase_uid: 'demo_golds_jay',
      owner_name: 'Suresh Kumar', owner_phone: '+919845100005', owner_email: 'suresh@goldszone.in',
      gym_name: "Gold's Zone", city: 'Bengaluru',
      address: '11th Main, 4th Block, Jayanagar, Bengaluru 560011',
      latitude: 12.9279, longitude: 77.5837,
      profile: {
        description: 'Premium fitness center with CrossFit area, Olympic lifting coaching, and mobility sessions. Top-rated in South Bengaluru.',
        amenities: ['AC', 'Locker', 'Parking', 'Outdoor Area', 'Sauna'],
        area: 'Jayanagar', day_pass_paise: 49900, avg_rating: 4.9, review_count: 312,
      }
    },
  ]

  for (const g of BENGALURU_GYMS) {
    let gym = await knex('gyms').where({ owner_email: g.owner_email }).first()
    if (!gym) {
      ;[gym] = await knex('gyms').insert({
        owner_firebase_uid: g.firebase_uid,
        owner_name: g.owner_name,
        owner_phone: g.owner_phone,
        owner_email: g.owner_email,
        gym_name: g.gym_name,
        city: g.city,
        address: g.address,
        latitude: g.latitude,
        longitude: g.longitude,
        status: 'active',
      }).returning('*')
    } else {
      await knex('gyms').where({ id: gym.id }).update({
        gym_name: g.gym_name,
        latitude: g.latitude,
        longitude: g.longitude,
        address: g.address,
      })
    }

    // Upsert gym profile
    const existingProfile = await knex('gym_profiles').where({ gym_id: gym.id }).first()
    const profileData = {
      gym_id: gym.id,
      description: g.profile.description,
      amenities: JSON.stringify(g.profile.amenities),
      photos: JSON.stringify([
        'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
        'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=800&q=80',
        'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800&q=80',
      ]),
      timings: JSON.stringify({ open: '05:30', close: '22:30', days: 'Mon-Sat' }),
      address: g.address,
      city: g.city,
      area: g.profile.area,
      latitude: g.latitude,
      longitude: g.longitude,
      day_pass_paise: g.profile.day_pass_paise,
      accepts_day_pass: true,
      is_listed: true,
      avg_rating: g.profile.avg_rating,
      review_count: g.profile.review_count,
    }

    if (existingProfile) {
      await knex('gym_profiles').where({ gym_id: gym.id }).update(profileData)
    } else {
      await knex('gym_profiles').insert(profileData)
    }
  }
  console.log('Seeded 5 Bengaluru gyms with profiles')

  // ─── 7. Add some payments for demo data ───
  const memberArjun = await knex('members').where({ gym_id: GYM_ID, phone: '+919845001001' }).first()
  const memberPriya = await knex('members').where({ gym_id: GYM_ID, phone: '+919845001002' }).first()
  const memberRahul = await knex('members').where({ gym_id: GYM_ID, phone: '+919845001003' }).first()

  if (memberArjun) {
    const ms = await knex('memberships').where({ member_id: memberArjun.id, gym_id: GYM_ID }).first()
    if (ms) {
      const payExists = await knex('payments').where({ membership_id: ms.id }).first()
      if (!payExists) {
        await knex('payments').insert({
          membership_id: ms.id, gym_id: GYM_ID, member_id: memberArjun.id,
          amount_paise: 200000, currency: 'INR', status: 'captured',
          method: 'upi', paid_at: new Date(),
        })
      }
    }
  }
  if (memberPriya) {
    const ms = await knex('memberships').where({ member_id: memberPriya.id, gym_id: GYM_ID }).first()
    if (ms) {
      const payExists = await knex('payments').where({ membership_id: ms.id }).first()
      if (!payExists) {
        await knex('payments').insert({
          membership_id: ms.id, gym_id: GYM_ID, member_id: memberPriya.id,
          amount_paise: 500000, currency: 'INR', status: 'captured',
          method: 'card', paid_at: new Date(),
        })
      }
    }
  }
  if (memberRahul) {
    const ms = await knex('memberships').where({ member_id: memberRahul.id, gym_id: GYM_ID }).first()
    if (ms) {
      const payExists = await knex('payments').where({ membership_id: ms.id }).first()
      if (!payExists) {
        await knex('payments').insert({
          membership_id: ms.id, gym_id: GYM_ID, member_id: memberRahul.id,
          amount_paise: 1500000, currency: 'INR', status: 'captured',
          method: 'card', paid_at: new Date(),
        })
      }
    }
  }
  console.log('Seeded sample payments')

  console.log('\n✅ PART 1 COMPLETE — Test gym fully set up')
  console.log(`   Gym: Iron Temple Fitness — Fort Worth`)
  console.log(`   ID:  ${GYM_ID}`)
  console.log(`   GPS: 32.753076, -97.347903`)
  console.log(`   Members: 8 (with memberships and check-ins)`)
  console.log(`   Bengaluru gyms: 5 (for GymFinder)`)
}
