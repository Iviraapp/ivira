export function up(knex) {
  return knex.schema
    .createTable('indian_food_atlas', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
      table.string('food_name').notNullable()
      table.string('regional_alias') // Hindi/regional name
      table.string('category') // grain, dal, sabzi, snack, drink, fruit, dairy, meat, sweet
      table.string('serving_unit').defaultTo('grams') // katori, piece, grams, cup, bowl, plate
      table.float('serving_size').defaultTo(100) // default serving size
      table.float('calories').notNullable()
      table.float('protein').defaultTo(0)
      table.float('carbs').defaultTo(0)
      table.float('fats').defaultTo(0)
      table.float('fiber').defaultTo(0)
      table.jsonb('tags').defaultTo('[]') // veg, non-veg, vegan, jain, gluten-free
      table.boolean('is_active').defaultTo(true)
      table.timestamps(true, true)
      table.index('food_name')
      table.index('category')
    })
    .createTable('daily_nutrition_logs', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
      table.uuid('member_id').notNullable().references('id').inTable('members').onDelete('CASCADE')
      table.uuid('gym_id').notNullable().references('id').inTable('gyms').onDelete('CASCADE')
      table.date('log_date').notNullable()
      table.string('meal_type') // breakfast, lunch, dinner, snack
      table.text('raw_input') // original text input
      table.jsonb('items').defaultTo('[]') // parsed items with macros
      table.float('total_calories').defaultTo(0)
      table.float('total_protein').defaultTo(0)
      table.float('total_carbs').defaultTo(0)
      table.float('total_fats').defaultTo(0)
      table.float('total_fiber').defaultTo(0)
      table.string('source').defaultTo('manual') // manual, ai, voice
      table.timestamps(true, true)
      table.index(['member_id', 'log_date'])
      table.index('gym_id')
    })
    .createTable('nutrition_goals', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
      table.uuid('member_id').notNullable().references('id').inTable('members').onDelete('CASCADE')
      table.uuid('gym_id').notNullable()
      table.integer('calorie_goal').defaultTo(2000)
      table.integer('protein_goal').defaultTo(120) // grams
      table.integer('carb_goal').defaultTo(250)
      table.integer('fat_goal').defaultTo(65)
      table.timestamps(true, true)
      table.unique(['member_id', 'gym_id'])
    })
}

export function down(knex) {
  return knex.schema
    .dropTableIfExists('nutrition_goals')
    .dropTableIfExists('daily_nutrition_logs')
    .dropTableIfExists('indian_food_atlas')
}
