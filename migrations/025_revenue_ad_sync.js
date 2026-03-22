/**
 * Migration: Revenue Ledger & Ad Analytics
 *
 * - Creates gym_revenue_ledger for unified revenue tracking across all sources
 * - Creates ad_analytics for impression/click tracking on global ad campaigns
 */
export async function up(knex) {
  await knex.schema.createTable('gym_revenue_ledger', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('gym_id').notNullable().references('id').inTable('gyms').onDelete('CASCADE');
    t.string('source', 50).notNullable(); // membership, class_booking, affiliate, store, ad_revenue
    t.integer('amount_paise').notNullable().defaultTo(0);
    t.uuid('reference_id').nullable();
    t.string('reference_type', 50).nullable(); // payment, booking, affiliate_click, ad_campaign
    t.text('description').nullable();
    t.timestamp('recorded_at', { useTz: true }).defaultTo(knex.fn.now());
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());

    t.index(['gym_id', 'source']);
    t.index(['gym_id', 'recorded_at']);
  });

  await knex.schema.createTable('ad_analytics', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('gym_id').notNullable().references('id').inTable('gyms').onDelete('CASCADE');
    t.uuid('campaign_id').notNullable().references('id').inTable('global_ad_campaigns').onDelete('CASCADE');
    t.uuid('member_id').nullable();
    t.string('event_type', 20).notNullable(); // impression, click
    t.jsonb('metadata').nullable();
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());

    t.index(['gym_id', 'campaign_id']);
    t.index(['campaign_id', 'event_type']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('ad_analytics');
  await knex.schema.dropTableIfExists('gym_revenue_ledger');
}
