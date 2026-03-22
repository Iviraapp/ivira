export function up(knex) {
  return knex.schema.alterTable('payments', table => {
    table.integer('platform_fee_paise').defaultTo(0);
    table.integer('net_amount_paise').defaultTo(0);
    table.string('settlement_status').defaultTo('pending'); // pending, settled, failed
  });
}

export function down(knex) {
  return knex.schema.alterTable('payments', table => {
    table.dropColumn('platform_fee_paise');
    table.dropColumn('net_amount_paise');
    table.dropColumn('settlement_status');
  });
}
