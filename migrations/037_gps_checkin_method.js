/**
 * Add 'gps' and 'nfc' to checkins.method — handles both enum types and CHECK constraints
 */
export async function up(knex) {
  // Strategy: Drop the CHECK constraint and re-add with all methods.
  // Knex creates CHECK constraints (not named enums) for .enum() columns.

  // First, find and drop any existing CHECK constraint on the method column
  const constraintResult = await knex.raw(`
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(con.conkey)
    WHERE rel.relname = 'checkins'
      AND att.attname = 'method'
      AND con.contype = 'c'
  `);

  for (const row of constraintResult.rows) {
    await knex.raw(`ALTER TABLE checkins DROP CONSTRAINT IF EXISTS "${row.conname}"`);
  }

  // Re-add with all methods including nfc and gps
  await knex.raw(`
    ALTER TABLE checkins ADD CONSTRAINT checkins_method_check
    CHECK (method IN ('qr', 'otp', 'manual', 'nfc', 'gps'))
  `);
}

export async function down(knex) {
  // Revert to original methods
  await knex.raw(`ALTER TABLE checkins DROP CONSTRAINT IF EXISTS checkins_method_check`);
  await knex.raw(`
    ALTER TABLE checkins ADD CONSTRAINT checkins_method_check
    CHECK (method IN ('qr', 'otp', 'manual'))
  `);
}
