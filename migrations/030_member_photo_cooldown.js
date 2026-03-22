/**
 * Add photo_updated_at column to members table.
 * Used to enforce a 30-day cooldown on profile picture changes.
 */
export async function up(knex) {
  await knex.schema.alterTable('members', (t) => {
    t.timestamp('photo_updated_at').nullable();
  });
}

export async function down(knex) {
  await knex.schema.alterTable('members', (t) => {
    t.dropColumn('photo_updated_at');
  });
}
