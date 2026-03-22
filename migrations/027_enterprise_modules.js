/**
 * Enterprise Health-Tech: Financial Ledger + Behavioral AI + Hardware Integrity
 *
 * 1. trainer_fees table — tracks per-session/monthly trainer commission
 * 2. affiliate_commissions table — explicit affiliate payout tracking
 * 3. contextual_reminders table — behavioral AI reminder log
 * 4. nfc_tags table — pre-linked NFC tag → member mapping for sub-500ms lookup
 * 5. Add 'trainer_fee' and 'affiliate_commission' to revenue ledger source options
 */

export async function up(knex) {
  // 1. Trainer Fees — commission per session or monthly flat fee
  await knex.schema.createTable('trainer_fees', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('gym_id').notNullable().references('id').inTable('gyms').onDelete('CASCADE');
    t.uuid('trainer_id').notNullable(); // members table or staff table reference
    t.string('fee_type', 20).notNullable(); // 'per_session' | 'monthly' | 'percentage'
    t.integer('amount_paise').notNullable();
    t.integer('percentage').nullable(); // for percentage-based (e.g. 30% of class revenue)
    t.string('reference_id').nullable(); // class booking ID, etc.
    t.string('reference_type', 50).nullable(); // 'class_booking' | 'personal_training'
    t.string('status', 20).notNullable().defaultTo('pending'); // pending | paid | cancelled
    t.timestamp('period_start').nullable();
    t.timestamp('period_end').nullable();
    t.timestamp('paid_at').nullable();
    t.timestamps(true, true);
    t.index(['gym_id', 'trainer_id']);
    t.index(['gym_id', 'status']);
  });

  // 2. Affiliate Commissions — explicit payout tracking per affiliate partner
  await knex.schema.createTable('affiliate_commissions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('gym_id').notNullable().references('id').inTable('gyms').onDelete('CASCADE');
    t.uuid('affiliate_id').notNullable(); // partner/brand reference
    t.string('affiliate_name', 100).nullable();
    t.integer('commission_paise').notNullable();
    t.integer('commission_rate_bps').nullable(); // basis points (e.g. 500 = 5%)
    t.string('trigger_event', 50).notNullable(); // 'click' | 'signup' | 'purchase' | 'checkin_promo'
    t.string('reference_id').nullable();
    t.string('reference_type', 50).nullable();
    t.string('status', 20).notNullable().defaultTo('pending'); // pending | approved | paid | rejected
    t.timestamp('approved_at').nullable();
    t.timestamp('paid_at').nullable();
    t.timestamps(true, true);
    t.index(['gym_id', 'affiliate_id']);
    t.index(['gym_id', 'status']);
  });

  // 3. Contextual Reminders — behavioral AI scheduled reminder log
  await knex.schema.createTable('contextual_reminders', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('gym_id').notNullable().references('id').inTable('gyms').onDelete('CASCADE');
    t.uuid('member_id').notNullable();
    t.string('reminder_type', 50).notNullable(); // 'hydration' | 'fasting_milestone' | 'at_risk_warning' | 'streak_nudge' | 'nutrition_gap'
    t.string('channel', 20).notNullable(); // 'push' | 'whatsapp' | 'in_app'
    t.string('title', 200).notNullable();
    t.text('body').notNullable();
    t.jsonb('context_data').nullable(); // the behavioral signals that triggered this
    t.string('status', 20).notNullable().defaultTo('scheduled'); // scheduled | sent | delivered | clicked | dismissed
    t.timestamp('scheduled_for').notNullable();
    t.timestamp('sent_at').nullable();
    t.timestamp('clicked_at').nullable();
    t.timestamps(true, true);
    t.index(['gym_id', 'member_id']);
    t.index(['status', 'scheduled_for']);
    t.index(['reminder_type', 'gym_id']);
  });

  // 4. NFC Tags — pre-linked tag → member for instant lookup (sub-500ms)
  await knex.schema.createTable('nfc_tags', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('gym_id').notNullable().references('id').inTable('gyms').onDelete('CASCADE');
    t.uuid('member_id').notNullable();
    t.string('tag_uid', 100).notNullable(); // NFC tag UID (hardware ID)
    t.string('tag_type', 20).defaultTo('ndef'); // ndef | mifare | iso14443
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamp('linked_at').notNullable().defaultTo(knex.fn.now());
    t.timestamps(true, true);
    t.unique(['gym_id', 'tag_uid']); // One tag per gym
    t.index(['gym_id', 'member_id']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('nfc_tags');
  await knex.schema.dropTableIfExists('contextual_reminders');
  await knex.schema.dropTableIfExists('affiliate_commissions');
  await knex.schema.dropTableIfExists('trainer_fees');
}
