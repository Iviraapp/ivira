import db from '../config/database.js'

export default async function passportRoutes(fastify) {
  const memberAuth = { preHandler: [fastify.verifyToken] }

  // GET /passport/partner-gyms — gyms I can visit with my membership
  fastify.get('/passport/partner-gyms', memberAuth, async (request) => {
    const memberId = request.user.memberId
    const member = await db('members').where({ id: memberId }).first()
    if (!member?.gym_id) return { gyms: [] }

    const partners = await db('gym_partnerships')
      .where(function() {
        this.where('gym_a_id', member.gym_id).orWhere('gym_b_id', member.gym_id)
      })
      .where('is_active', true)

    const partnerGymIds = partners.map(p =>
      p.gym_a_id === member.gym_id ? p.gym_b_id : p.gym_a_id
    )

    if (partnerGymIds.length === 0) return { gyms: [] }

    const gyms = await db('gyms')
      .whereIn('id', partnerGymIds)
      .where('is_suspended', false)
      .select('id', 'gym_name', 'city', 'address', 'latitude', 'longitude', 'logo_url')

    return {
      gyms: gyms.map(g => {
        const p = partners.find(p => p.gym_a_id === g.id || p.gym_b_id === g.id)
        return { ...g, day_pass_price: p?.day_pass_price_paise || 0, partnership_type: p?.type }
      })
    }
  })

  // POST /passport/visit — book a visit to a partner gym
  fastify.post('/passport/visit', memberAuth, async (request) => {
    const memberId = request.user.memberId
    const { gym_id, date } = request.body
    const member = await db('members').where({ id: memberId }).first()

    const validUntil = new Date(date || Date.now())
    validUntil.setHours(23, 59, 59)

    const [visit] = await db('gym_passport_visits').insert({
      member_id: memberId,
      home_gym_id: member.gym_id,
      visited_gym_id: gym_id,
      valid_from: new Date(),
      valid_until: validUntil,
    }).returning('*')

    return { visit, message: 'Day pass activated! Show your QR code at the gym.' }
  })

  // GET /passport/my-visits — history of gym visits
  fastify.get('/passport/my-visits', memberAuth, async (request) => {
    const visits = await db('gym_passport_visits')
      .where({ member_id: request.user.memberId })
      .leftJoin('gyms', 'gym_passport_visits.visited_gym_id', 'gyms.id')
      .select('gym_passport_visits.*', 'gyms.gym_name', 'gyms.city')
      .orderBy('created_at', 'desc')
      .limit(20)
    return { visits }
  })
}
