export async function up(knex) {
  const has = await knex.schema.hasTable('vira_memory')
  if (!has) {
    await knex.schema.createTable('vira_memory', t => {
      t.uuid('id').primary().defaultTo(knex.fn.uuid())
      t.uuid('member_id').notNullable()
      t.string('key', 100).notNullable() // 'injury', 'preference', 'goal', 'pattern'
      t.text('value').notNullable()
      t.string('source', 50) // 'conversation', 'workout', 'sleep', 'nutrition'
      t.float('confidence').defaultTo(1.0)
      t.timestamp('learned_at').defaultTo(knex.fn.now())
      t.timestamp('expires_at').nullable()
      t.index(['member_id', 'key'])
    })
  }
}
export async function down(knex) {
  await knex.schema.dropTableIfExists('vira_memory')
}
