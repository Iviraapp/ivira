// Migration for enterprise hardening
export function up(knex) {
  return knex.schema
    // 1. Audit Log table — records all admin actions
    .createTable('audit_logs', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.uuid('admin_id').references('id').inTable('super_admins');
      t.string('action').notNullable(); // e.g. 'login_as_owner', 'suspend_gym', 'toggle_feature'
      t.uuid('target_tenant').references('id').inTable('gyms');
      t.string('target_type'); // 'gym', 'member', 'payment', 'feature'
      t.string('target_id');
      t.jsonb('metadata').defaultTo('{}'); // extra context
      t.string('ip_address');
      t.string('user_agent');
      t.timestamp('created_at').defaultTo(knex.fn.now());
    })
    // 2. TOTP secrets for super admin 2FA
    .createTable('admin_totp_secrets', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.uuid('admin_id').references('id').inTable('super_admins').unique().notNullable();
      t.string('encrypted_secret').notNullable();
      t.boolean('is_verified').defaultTo(false);
      t.specificType('backup_codes', 'text[]');
      t.timestamp('created_at').defaultTo(knex.fn.now());
      t.timestamp('verified_at');
    })
    // 3. Proxy sessions — "Login as Owner" tracking
    .createTable('proxy_sessions', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.uuid('admin_id').references('id').inTable('super_admins').notNullable();
      t.uuid('target_gym_id').references('id').inTable('gyms').notNullable();
      t.string('proxy_token').notNullable().unique();
      t.string('reason').notNullable();
      t.boolean('is_active').defaultTo(true);
      t.timestamp('started_at').defaultTo(knex.fn.now());
      t.timestamp('ended_at');
      t.string('ip_address');
    })
    // 4. Proxy action log — every action taken during proxy session
    .createTable('proxy_action_logs', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.uuid('proxy_session_id').references('id').inTable('proxy_sessions').notNullable();
      t.string('method').notNullable(); // GET, POST, PUT, DELETE
      t.string('path').notNullable();
      t.jsonb('request_body');
      t.integer('response_status');
      t.timestamp('created_at').defaultTo(knex.fn.now());
    })
    // 5. Kiosk offline sync queue
    .createTable('kiosk_sync_queue', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.uuid('gym_id').references('id').inTable('gyms').notNullable();
      t.string('event_type').notNullable(); // 'checkin'
      t.jsonb('payload').notNullable();
      t.string('status').defaultTo('pending'); // pending, synced, failed
      t.string('client_id'); // kiosk device identifier
      t.timestamp('queued_at').notNullable();
      t.timestamp('synced_at');
      t.timestamp('created_at').defaultTo(knex.fn.now());
    })
    // 6. Marketplace payout ledger
    .createTable('marketplace_payouts', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.uuid('booking_id');
      t.uuid('gym_id').references('id').inTable('gyms').notNullable();
      t.uuid('professional_id');
      t.integer('total_amount_paise').notNullable();
      t.integer('platform_fee_paise').notNullable(); // 1% IVIRA
      t.integer('trainer_payout_paise').notNullable(); // 70% Trainer
      t.integer('gym_payout_paise').notNullable(); // 29% Gym
      t.string('razorpay_transfer_id');
      t.string('razorpay_route_id');
      t.string('payout_status').defaultTo('pending'); // pending, processing, paid, failed
      t.string('razorpay_payment_id');
      t.timestamp('paid_at');
      t.timestamp('created_at').defaultTo(knex.fn.now());
    })
    // 7. Gym config for feature provisioning
    .createTable('gym_feature_config', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.uuid('gym_id').references('id').inTable('gyms').unique().notNullable();
      t.boolean('whatsapp_api').defaultTo(false);
      t.boolean('marketplace_access').defaultTo(false);
      t.boolean('custom_domain').defaultTo(false);
      t.boolean('ai_nutritionist').defaultTo(false);
      t.boolean('advanced_analytics').defaultTo(false);
      t.boolean('white_label').defaultTo(false);
      t.jsonb('custom_features').defaultTo('{}');
      t.uuid('updated_by'); // admin who last changed
      t.timestamp('created_at').defaultTo(knex.fn.now());
      t.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    // 8. Global ad campaigns
    .createTable('global_ad_campaigns', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.string('title').notNullable();
      t.text('description');
      t.string('image_url');
      t.string('click_url');
      t.string('target_city'); // null = all cities
      t.string('target_tier'); // null = all tiers, or 'starter', 'growth', 'pro'
      t.timestamp('active_from').notNullable();
      t.timestamp('active_until').notNullable();
      t.boolean('is_active').defaultTo(true);
      t.integer('impressions').defaultTo(0);
      t.integer('clicks').defaultTo(0);
      t.uuid('created_by');
      t.timestamp('created_at').defaultTo(knex.fn.now());
    })
    // 9. Magic link tokens for owner/member recovery
    .createTable('magic_links', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.string('email').notNullable();
      t.string('token').notNullable().unique();
      t.string('target_role').notNullable(); // 'owner' or 'member'
      t.uuid('target_id'); // gym_id or member_id
      t.boolean('is_used').defaultTo(false);
      t.timestamp('expires_at').notNullable();
      t.timestamp('created_at').defaultTo(knex.fn.now());
    })
    // 10. Kiosk heartbeat tracking
    .createTable('kiosk_heartbeats', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.uuid('gym_id').references('id').inTable('gyms').unique().notNullable();
      t.string('device_id');
      t.string('status').defaultTo('online'); // online, offline, degraded
      t.integer('active_members_cached').defaultTo(0);
      t.timestamp('last_ping').defaultTo(knex.fn.now());
      t.timestamp('last_sync').defaultTo(knex.fn.now());
      t.jsonb('device_info').defaultTo('{}');
    })
    // Performance indexes
    .then(() => knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_members_gym_id ON members(gym_id)'))
    .then(() => knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_members_status ON members(status)'))
    .then(() => knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_checkins_gym_id ON checkins(gym_id)'))
    .then(() => knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_checkins_member_id ON checkins(member_id)'))
    .then(() => knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_checkins_created_at ON checkins(created_at)'))
    .then(() => knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_payments_gym_id ON payments(gym_id)'))
    .then(() => knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_payments_member_id ON payments(member_id)'))
    .then(() => knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status)'))
    .then(() => knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at)'))
    .then(() => knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_memberships_gym_id ON memberships(gym_id)'))
    .then(() => knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_memberships_member_id ON memberships(member_id)'))
    .then(() => knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON audit_logs(admin_id)'))
    .then(() => knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_audit_logs_target_tenant ON audit_logs(target_tenant)'))
    .then(() => knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)'))
    .then(() => knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_proxy_sessions_admin_id ON proxy_sessions(admin_id)'))
    .then(() => knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_marketplace_payouts_gym_id ON marketplace_payouts(gym_id)'))
    .then(() => knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_magic_links_token ON magic_links(token)'))
    .then(() => knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_magic_links_email ON magic_links(email)'))
    .then(() => knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_kiosk_heartbeats_gym_id ON kiosk_heartbeats(gym_id)'));
}

export function down(knex) {
  return knex.schema
    .dropTableIfExists('proxy_action_logs')
    .dropTableIfExists('proxy_sessions')
    .dropTableIfExists('admin_totp_secrets')
    .dropTableIfExists('audit_logs')
    .dropTableIfExists('kiosk_sync_queue')
    .dropTableIfExists('marketplace_payouts')
    .dropTableIfExists('gym_feature_config')
    .dropTableIfExists('global_ad_campaigns')
    .dropTableIfExists('magic_links')
    .dropTableIfExists('kiosk_heartbeats');
}
