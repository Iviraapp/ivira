export async function seed(knex) {
  await knex('credit_packs').del()
  await knex('credit_packs').insert([
    { name: 'Starter Pack', price_paise: 50000, credit_paise: 55000, bonus_paise: 5000, sort_order: 1 },
    { name: 'Value Pack', price_paise: 100000, credit_paise: 110000, bonus_paise: 10000, sort_order: 2 },
    { name: 'Pro Pack', price_paise: 200000, credit_paise: 230000, bonus_paise: 30000, sort_order: 3 },
    { name: 'Elite Pack', price_paise: 500000, credit_paise: 600000, bonus_paise: 100000, sort_order: 4 },
  ])
}
