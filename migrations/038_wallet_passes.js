/**
 * Store wallet pass references for Apple Wallet and Google Wallet.
 * Allows pass updates (e.g., membership renewal) and revocation.
 */
export async function up(knex) {
  await knex.schema.createTable('wallet_passes', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('member_id').notNullable().references('members.id').onDelete('CASCADE');
    t.uuid('gym_id').notNullable().references('gyms.id').onDelete('CASCADE');
    t.text('platform').notNullable(); // 'google' or 'apple'
    t.text('pass_id');               // Google object ID or Apple serial
    t.text('class_id');              // Google class ID
    t.text('qr_token');             // JWT embedded in pass barcode
    t.boolean('is_active').defaultTo(true);
    t.timestamps(true, true);

    t.unique(['member_id', 'gym_id', 'platform']);
    t.index(['gym_id', 'platform']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('wallet_passes');
}
