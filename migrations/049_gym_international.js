export function up(knex) {
  return knex.schema.alterTable('gyms', (table) => {
    table.string('country_code', 2).defaultTo('IN');
    table.string('timezone', 50).defaultTo('Asia/Kolkata');
    table.string('currency', 3).defaultTo('INR');
    table.string('stripe_customer_id', 100).nullable();
    table.string('payment_gateway', 20).defaultTo('razorpay');
  });
}

export function down(knex) {
  return knex.schema.alterTable('gyms', (table) => {
    table.dropColumn('country_code');
    table.dropColumn('timezone');
    table.dropColumn('currency');
    table.dropColumn('stripe_customer_id');
    table.dropColumn('payment_gateway');
  });
}
