/**
 * Add email column to otp_codes for email-based OTP login
 */
export function up(knex) {
  return knex.schema.alterTable('otp_codes', (t) => {
    t.string('email').nullable();
    t.string('phone', 15).nullable().alter(); // phone is now optional (email OR phone)
    t.index(['email', 'code', 'purpose']);
  });
}

export function down(knex) {
  return knex.schema.alterTable('otp_codes', (t) => {
    t.dropIndex(['email', 'code', 'purpose']);
    t.dropColumn('email');
    t.string('phone', 15).notNullable().alter();
  });
}
