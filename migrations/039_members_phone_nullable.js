// B2C email-only login doesn't require a phone number
export async function up(knex) {
  await knex.raw('ALTER TABLE members ALTER COLUMN phone DROP NOT NULL');
}

export async function down(knex) {
  await knex.raw("UPDATE members SET phone = '' WHERE phone IS NULL");
  await knex.raw('ALTER TABLE members ALTER COLUMN phone SET NOT NULL');
}
