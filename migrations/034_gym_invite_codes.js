export async function up(knex) {
  // Add invite_code column to gyms table
  await knex.schema.alterTable('gyms', (table) => {
    table.string('invite_code', 10).unique().nullable();
  });

  // Generate invite codes for existing gyms
  const gyms = await knex('gyms').select('id');
  for (const gym of gyms) {
    const code = 'GYM-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    await knex('gyms').where('id', gym.id).update({ invite_code: code });
  }

  // Make gym_id nullable on members for floating B2C members
  // (may already be nullable from earlier changes — safe to run)
  await knex.schema.alterTable('members', (table) => {
    table.uuid('gym_id').nullable().alter();
  });
}

export async function down(knex) {
  await knex.schema.alterTable('gyms', (table) => {
    table.dropColumn('invite_code');
  });
}
