export async function seed(knex) {
  await knex('subscription_plans').del();
  await knex('subscription_plans').insert([
    {
      name: 'Starter',
      slug: 'starter',
      price_yearly_paise: 1200000, // ₹12,000
      max_members: 100,
      features: JSON.stringify({
        qr_checkin: true,
        otp_checkin: true,
        payment_collection: true,
        whatsapp: false,
        reports: 'basic',
      }),
    },
    {
      name: 'Growth',
      slug: 'growth',
      price_yearly_paise: 2400000, // ₹24,000
      max_members: 500,
      features: JSON.stringify({
        qr_checkin: true,
        otp_checkin: true,
        payment_collection: true,
        whatsapp: true,
        reports: 'advanced',
        dunning: true,
      }),
    },
    {
      name: 'Pro',
      slug: 'pro',
      price_yearly_paise: 4800000, // ₹48,000
      max_members: 2000,
      features: JSON.stringify({
        qr_checkin: true,
        otp_checkin: true,
        payment_collection: true,
        whatsapp: true,
        reports: 'advanced',
        dunning: true,
        api_access: true,
        white_label: true,
      }),
    },
  ]);
}
