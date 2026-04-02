export async function up(knex) {
  // gyms table — international fields
  const hasCountry = await knex.schema.hasColumn('gyms', 'country_code')
  if (!hasCountry) {
    await knex.schema.alterTable('gyms', t => {
      t.string('country_code', 2).defaultTo('IN')
      t.string('timezone', 60).defaultTo('Asia/Kolkata')
      t.string('currency', 3).defaultTo('INR')
      t.string('payment_gateway', 20).defaultTo('razorpay')
      t.string('stripe_customer_id', 100).nullable()
      t.index(['country_code'])
    })
  }

  // payments table — add stripe fields alongside existing razorpay fields
  const hasStripeIntent = await knex.schema.hasColumn('payments', 'stripe_payment_intent_id')
  if (!hasStripeIntent) {
    await knex.schema.alterTable('payments', t => {
      t.string('stripe_payment_intent_id', 100).nullable()
      t.string('stripe_charge_id', 100).nullable()
      t.jsonb('stripe_data').defaultTo('{}')
    })
  }
}

export async function down(knex) {
  await knex.schema.alterTable('payments', t => {
    t.dropColumn('stripe_payment_intent_id')
    t.dropColumn('stripe_charge_id')
    t.dropColumn('stripe_data')
  })
  await knex.schema.alterTable('gyms', t => {
    t.dropColumn('country_code')
    t.dropColumn('timezone')
    t.dropColumn('currency')
    t.dropColumn('payment_gateway')
    t.dropColumn('stripe_customer_id')
  })
}
