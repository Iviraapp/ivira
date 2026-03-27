export async function up(knex) {
  // Nutrition queries: WHERE member_id AND gym_id AND log_date
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_daily_nutrition_member_gym_date
    ON daily_nutrition_logs(member_id, gym_id, log_date)
  `)

  // Sleep queries: WHERE member_id AND gym_id ORDER BY date
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_sleep_logs_member_gym_date
    ON sleep_logs(member_id, gym_id, date DESC)
  `)

  // Step queries: WHERE member_id ORDER BY log_date
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_daily_step_logs_member_date
    ON daily_step_logs(member_id, log_date DESC)
  `)

  // Member lookup by email (B2C login)
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_members_email
    ON members(email)
  `)

  // OTP lookup: WHERE email AND purpose AND used AND expires_at
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_otp_codes_email_purpose
    ON otp_codes(email, purpose, used, expires_at DESC)
  `)

  // Check-ins: WHERE member_id AND gym_id ORDER BY checked_in_at
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_checkins_member_gym_date
    ON checkins(member_id, gym_id, checked_in_at DESC)
  `)

  // Members by gym (leaderboard, gym owner queries)
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_members_gym_status
    ON members(gym_id, status)
  `)

  // Workout sessions
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_workout_sessions_member_date
    ON workout_sessions(member_id, session_date DESC)
  `)
}

export async function down(knex) {
  await knex.raw('DROP INDEX IF EXISTS idx_daily_nutrition_member_gym_date')
  await knex.raw('DROP INDEX IF EXISTS idx_sleep_logs_member_gym_date')
  await knex.raw('DROP INDEX IF EXISTS idx_daily_step_logs_member_date')
  await knex.raw('DROP INDEX IF EXISTS idx_members_email')
  await knex.raw('DROP INDEX IF EXISTS idx_otp_codes_email_purpose')
  await knex.raw('DROP INDEX IF EXISTS idx_checkins_member_gym_date')
  await knex.raw('DROP INDEX IF EXISTS idx_members_gym_status')
  await knex.raw('DROP INDEX IF EXISTS idx_workout_sessions_member_date')
}
