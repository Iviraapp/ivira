/**
 * Affiliate marketing module — brands, clicks, payouts
 */
export function up(knex) {
  return knex.schema
    .createTable('affiliate_brands', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.string('name').notNullable();
      t.string('category').notNullable();
      t.decimal('commission_rate_percent', 5, 2).notNullable().defaultTo(0);
      t.integer('commission_flat_paise').nullable(); // for flat-rate commissions
      t.string('base_url').notNullable();
      t.string('logo_url');
      t.text('description');
      t.boolean('active').defaultTo(true);
      t.timestamps(true, true);
      t.index(['category', 'active']);
    })
    .createTable('affiliate_clicks', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.uuid('gym_id').notNullable().references('gyms.id').onDelete('CASCADE');
      t.uuid('member_id').nullable().references('members.id').onDelete('SET NULL');
      t.uuid('brand_id').notNullable().references('affiliate_brands.id').onDelete('CASCADE');
      t.string('click_token', 16).notNullable().unique();
      t.string('product_url').notNullable();
      t.timestamp('clicked_at').nullable();
      t.boolean('converted').defaultTo(false);
      t.integer('commission_earned_paise').defaultTo(0);
      t.integer('commission_to_gym_paise').defaultTo(0);
      t.integer('commission_to_platform_paise').defaultTo(0);
      t.timestamps(true, true);
      t.index(['gym_id', 'brand_id']);
      t.index(['click_token']);
    })
    .createTable('affiliate_payouts', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.uuid('gym_id').notNullable().references('gyms.id').onDelete('CASCADE');
      t.integer('amount_paise').notNullable();
      t.enum('status', ['pending', 'paid', 'failed']).defaultTo('pending');
      t.date('period_start').notNullable();
      t.date('period_end').notNullable();
      t.timestamp('paid_at').nullable();
      t.text('notes');
      t.timestamps(true, true);
      t.index(['gym_id', 'status']);
    });
}

export function down(knex) {
  return knex.schema
    .dropTableIfExists('affiliate_payouts')
    .dropTableIfExists('affiliate_clicks')
    .dropTableIfExists('affiliate_brands');
}
