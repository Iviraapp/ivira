/**
 * Add 'gps' and 'nfc' to checkins.method enum
 */
export async function up(knex) {
  // PostgreSQL: alter enum type to add new values
  await knex.raw(`ALTER TYPE checkins_method_enum ADD VALUE IF NOT EXISTS 'nfc'`).catch(() => {});
  await knex.raw(`ALTER TYPE checkins_method_enum ADD VALUE IF NOT EXISTS 'gps'`).catch(() => {});

  // If the column isn't using a named enum (some knex versions use inline CHECK constraints),
  // drop the constraint and re-add it with all values
  await knex.raw(`
    DO $$
    BEGIN
      -- Try dropping any CHECK constraint on method
      ALTER TABLE checkins DROP CONSTRAINT IF EXISTS checkins_method_check;
      -- Re-add with all methods
      ALTER TABLE checkins ADD CONSTRAINT checkins_method_check
        CHECK (method IN ('qr', 'otp', 'manual', 'nfc', 'gps'));
    EXCEPTION WHEN others THEN
      -- Constraint might not exist or column uses enum type — ignore
      NULL;
    END $$;
  `);
}

export async function down(knex) {
  // Cannot remove enum values in PostgreSQL; just leave them
}
