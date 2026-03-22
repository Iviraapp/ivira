export function up(knex) {
  return knex.schema
    .createTable('referral_codes', t => {
      t.uuid('id').primary().defaultTo(knex.fn.uuid());
      t.uuid('gym_id').notNullable().references('id').inTable('gyms').onDelete('CASCADE');
      t.uuid('member_id').notNullable().references('id').inTable('members').onDelete('CASCADE');
      t.string('code', 8).notNullable().unique();
      t.enu('reward_type', ['free_days', 'discount_percent', 'discount_flat']).notNullable();
      t.integer('reward_value').notNullable(); // days count, percentage, or paise
      t.integer('max_uses').defaultTo(0); // 0 = unlimited
      t.integer('times_used').defaultTo(0);
      t.boolean('is_active').defaultTo(true);
      t.timestamp('expires_at').nullable();
      t.timestamps(true, true);

      t.index('code');
      t.index('member_id');
    })
    .createTable('referral_redemptions', t => {
      t.uuid('id').primary().defaultTo(knex.fn.uuid());
      t.uuid('referral_code_id').notNullable().references('id').inTable('referral_codes').onDelete('CASCADE');
      t.uuid('referrer_member_id').notNullable().references('id').inTable('members').onDelete('CASCADE');
      t.uuid('referred_member_id').notNullable().references('id').inTable('members').onDelete('CASCADE');
      t.uuid('gym_id').notNullable().references('id').inTable('gyms').onDelete('CASCADE');
      t.boolean('referrer_reward_applied').defaultTo(false);
      t.boolean('referred_reward_applied').defaultTo(false);
      t.enu('status', ['pending', 'completed', 'expired']).defaultTo('pending');
      t.timestamps(true, true);

      t.index('referral_code_id');
    });
}

export function down(knex) {
  return knex.schema
    .dropTableIfExists('referral_redemptions')
    .dropTableIfExists('referral_codes');
}
