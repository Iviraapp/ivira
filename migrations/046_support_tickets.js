export async function up(knex) {
  await knex.schema.createTable('support_tickets', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    table.uuid('gym_id').notNullable().references('id').inTable('gyms').onDelete('CASCADE')
    table.string('subject', 200).notNullable()
    table.text('body').notNullable()
    table.string('category', 50).defaultTo('general') // general | billing | technical | feature
    table.string('priority', 20).defaultTo('normal')  // low | normal | high | urgent
    table.string('status', 30).defaultTo('open')      // open | in_progress | resolved | closed
    table.text('admin_reply').nullable()
    table.timestamp('replied_at').nullable()
    table.string('replied_by', 200).nullable()
    table.timestamps(true, true)
  })
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('support_tickets')
}
