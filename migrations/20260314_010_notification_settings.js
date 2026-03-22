/**
 * Add notification_settings JSONB column to gyms table
 * to persist per-gym notification preferences.
 */
export async function up(knex) {
  await knex.schema.alterTable('gyms', (t) => {
    t.jsonb('notification_settings').defaultTo(JSON.stringify({
      whatsapp_enabled: true,
      sms_enabled: true,
      email_enabled: true,
      payment_reminders: true,
      expiry_alerts: true,
      checkin_summary: false,
      marketing: false,
      day_pass_alerts: true,
    }));
  });
}

export async function down(knex) {
  await knex.schema.alterTable('gyms', (t) => {
    t.dropColumn('notification_settings');
  });
}
