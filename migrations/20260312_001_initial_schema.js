/**
 * IVIRA initial database schema
 * Tables: gyms, subscription_plans, gym_subscriptions, members,
 *         memberships, checkins, payments, payment_reminders, otp_codes
 */
export function up(knex) {
  return knex.schema
    // --- Subscription Plans (Starter / Growth / Pro) ---
    .createTable('subscription_plans', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.string('name').notNullable(); // Starter, Growth, Pro
      t.string('slug').notNullable().unique();
      t.integer('price_yearly_paise').notNullable(); // in paise (1200000 = ₹12,000)
      t.integer('max_members').notNullable();
      t.jsonb('features').defaultTo('{}');
      t.boolean('active').defaultTo(true);
      t.timestamps(true, true);
    })

    // --- Gyms ---
    .createTable('gyms', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.string('owner_firebase_uid').notNullable().unique();
      t.string('owner_name').notNullable();
      t.string('owner_phone', 15).notNullable();
      t.string('owner_email').notNullable();
      t.string('gym_name').notNullable();
      t.string('city').notNullable();
      t.string('address');
      t.decimal('latitude', 10, 7);
      t.decimal('longitude', 10, 7);
      t.string('logo_url');
      t.string('qr_code_url');
      t.enum('status', ['trial', 'active', 'expired', 'suspended']).defaultTo('trial');
      t.timestamp('trial_ends_at');
      t.timestamps(true, true);
    })

    // --- Gym Subscriptions (gym owner paying for IVIRA) ---
    .createTable('gym_subscriptions', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.uuid('gym_id').notNullable().references('gyms.id').onDelete('CASCADE');
      t.uuid('plan_id').notNullable().references('subscription_plans.id');
      t.enum('status', ['active', 'past_due', 'cancelled', 'expired']).defaultTo('active');
      t.string('razorpay_subscription_id');
      t.timestamp('current_period_start');
      t.timestamp('current_period_end');
      t.timestamps(true, true);
    })

    // --- Members (gym members, invited by gym owner) ---
    .createTable('members', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.uuid('gym_id').notNullable().references('gyms.id').onDelete('CASCADE');
      t.string('name').notNullable();
      t.string('phone', 15).notNullable();
      t.string('email');
      t.date('date_of_birth');
      t.enum('gender', ['male', 'female', 'other']);
      t.string('photo_url');
      t.enum('status', ['active', 'inactive', 'suspended']).defaultTo('active');
      t.timestamps(true, true);
      t.unique(['gym_id', 'phone']); // same phone can be member at different gyms
    })

    // --- Memberships (member subscription to a gym plan) ---
    .createTable('memberships', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.uuid('member_id').notNullable().references('members.id').onDelete('CASCADE');
      t.uuid('gym_id').notNullable().references('gyms.id').onDelete('CASCADE');
      t.string('plan_name').notNullable(); // "Monthly", "Quarterly", "Annual"
      t.integer('amount_paise').notNullable();
      t.enum('status', ['active', 'expired', 'cancelled']).defaultTo('active');
      t.string('razorpay_subscription_id');
      t.date('start_date').notNullable();
      t.date('end_date').notNullable();
      t.boolean('auto_renew').defaultTo(true);
      t.timestamps(true, true);
    })

    // --- Check-ins ---
    .createTable('checkins', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.uuid('member_id').notNullable().references('members.id').onDelete('CASCADE');
      t.uuid('gym_id').notNullable().references('gyms.id').onDelete('CASCADE');
      t.enum('method', ['qr', 'otp', 'manual']).notNullable();
      t.decimal('latitude', 10, 7);
      t.decimal('longitude', 10, 7);
      t.decimal('distance_meters', 10, 2);
      t.boolean('gps_valid');
      t.timestamp('checked_in_at').defaultTo(knex.fn.now());
      t.timestamps(true, true);

      t.index(['gym_id', 'checked_in_at']);
      t.index(['member_id', 'checked_in_at']);
    })

    // --- Payments ---
    .createTable('payments', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.uuid('membership_id').notNullable().references('memberships.id').onDelete('CASCADE');
      t.uuid('gym_id').notNullable().references('gyms.id').onDelete('CASCADE');
      t.uuid('member_id').notNullable().references('members.id').onDelete('CASCADE');
      t.integer('amount_paise').notNullable();
      t.string('currency', 3).defaultTo('INR');
      t.enum('status', ['pending', 'authorized', 'captured', 'failed', 'refunded']).defaultTo('pending');
      t.string('razorpay_payment_id');
      t.string('razorpay_order_id');
      t.string('method'); // upi, card, netbanking, etc.
      t.jsonb('razorpay_data').defaultTo('{}');
      t.timestamp('paid_at');
      t.timestamps(true, true);

      t.index(['gym_id', 'status']);
    })

    // --- Payment Reminders (dunning engine) ---
    .createTable('payment_reminders', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.uuid('payment_id').notNullable().references('payments.id').onDelete('CASCADE');
      t.uuid('member_id').notNullable().references('members.id').onDelete('CASCADE');
      t.integer('attempt_number').notNullable().defaultTo(1);
      t.enum('channel', ['whatsapp', 'sms', 'email']).notNullable();
      t.enum('status', ['sent', 'delivered', 'failed']).defaultTo('sent');
      t.timestamp('sent_at').defaultTo(knex.fn.now());
      t.timestamps(true, true);
    })

    // --- OTP Codes (for check-in / login) ---
    .createTable('otp_codes', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.string('phone', 15).notNullable();
      t.string('code', 6).notNullable();
      t.enum('purpose', ['checkin', 'login']).notNullable();
      t.uuid('gym_id').references('gyms.id').onDelete('CASCADE');
      t.boolean('used').defaultTo(false);
      t.timestamp('expires_at').notNullable();
      t.timestamps(true, true);

      t.index(['phone', 'code', 'purpose']);
    });
}

export function down(knex) {
  return knex.schema
    .dropTableIfExists('otp_codes')
    .dropTableIfExists('payment_reminders')
    .dropTableIfExists('payments')
    .dropTableIfExists('checkins')
    .dropTableIfExists('memberships')
    .dropTableIfExists('members')
    .dropTableIfExists('gym_subscriptions')
    .dropTableIfExists('subscription_plans')
    .dropTableIfExists('gyms');
}
