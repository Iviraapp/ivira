/**
 * One-time script: Create a test gym at Bexley, Fort Worth for QA testing.
 * Run via: railway run node scripts/setup-test-gym.js
 */
import db from '../src/config/database.js';

const GYM_ID = 'e1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6';
const OWNER_EMAIL = 'admin@ivira.app';
const MEMBER_EMAIL = 'task261190@gmail.com';

async function main() {
  try {
    // 1. Create or update the test gym
    const existing = await db('gyms').where({ id: GYM_ID }).first();
    if (existing) {
      await db('gyms').where({ id: GYM_ID }).update({
        gym_name: 'IVIRA Test Gym — Fort Worth',
        address: '545 Harrold St, Fort Worth, TX 76107',
        city: 'Fort Worth',
        latitude: 32.75307193,
        longitude: -97.34792413,
        status: 'active',
        updated_at: new Date(),
      });
      console.log('✓ Updated existing test gym');
    } else {
      await db('gyms').insert({
        id: GYM_ID,
        owner_firebase_uid: 'test_bexley_fw_owner',
        owner_name: 'Niel (Test)',
        owner_phone: '+10000000000',
        owner_email: OWNER_EMAIL,
        gym_name: 'IVIRA Test Gym — Fort Worth',
        address: '545 Harrold St, Fort Worth, TX 76107',
        city: 'Fort Worth',
        latitude: 32.75307193,
        longitude: -97.34792413,
        status: 'active',
      });
      console.log('✓ Created test gym: IVIRA Test Gym — Fort Worth');
    }

    // 2. Generate invite code if not present
    const gym = await db('gyms').where({ id: GYM_ID }).first();
    if (!gym.invite_code) {
      const code = 'GYM-FWTX01';
      await db('gyms').where({ id: GYM_ID }).update({ invite_code: code });
      console.log(`✓ Invite code set: ${code}`);
    } else {
      console.log(`✓ Invite code already set: ${gym.invite_code}`);
    }

    // 3. Check if members exist for the test emails, link them to this gym
    const memberEmails = [OWNER_EMAIL, MEMBER_EMAIL];
    for (const email of memberEmails) {
      let member = await db('members').where({ email }).first();
      if (member) {
        // Update gym_id to this test gym
        await db('members').where({ id: member.id }).update({
          gym_id: GYM_ID,
          status: 'active',
          updated_at: new Date(),
        });
        console.log(`✓ Linked existing member ${email} (${member.name}) to test gym`);

        // Ensure active membership
        const hasMembership = await db('memberships')
          .where({ member_id: member.id, gym_id: GYM_ID })
          .whereIn('status', ['active'])
          .first();
        if (!hasMembership) {
          await db('memberships').insert({
            member_id: member.id,
            gym_id: GYM_ID,
            plan_name: 'QA Unlimited',
            amount_paise: 0,
            start_date: new Date().toISOString().split('T')[0],
            end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: 'active',
          });
          console.log(`  ✓ Created QA membership for ${email}`);
        } else {
          console.log(`  ✓ Active membership already exists for ${email}`);
        }
      } else {
        // Create a new member
        const name = email === OWNER_EMAIL ? 'Niel (Admin)' : 'Niel (Test)';
        const [newMember] = await db('members').insert({
          name,
          email,
          phone: email === OWNER_EMAIL ? '+10000000001' : '+10000000002',
          gym_id: GYM_ID,
          status: 'active',
          gender: 'male',
        }).returning('*');
        console.log(`✓ Created member: ${name} (${email}) — ID: ${newMember.id}`);

        await db('memberships').insert({
          member_id: newMember.id,
          gym_id: GYM_ID,
          plan_name: 'QA Unlimited',
          amount_paise: 0,
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'active',
        });
        console.log(`  ✓ Created QA membership for ${email}`);
      }
    }

    // 4. Print summary
    const finalGym = await db('gyms').where({ id: GYM_ID }).first();
    const members = await db('members').where({ gym_id: GYM_ID }).select('id', 'name', 'email', 'status');
    console.log('\n=== TEST GYM SETUP COMPLETE ===');
    console.log(`Gym: ${finalGym.gym_name}`);
    console.log(`ID: ${finalGym.id}`);
    console.log(`Invite Code: ${finalGym.invite_code}`);
    console.log(`Location: ${finalGym.latitude}, ${finalGym.longitude}`);
    console.log(`Address: ${finalGym.address}`);
    console.log(`Members (${members.length}):`);
    members.forEach(m => console.log(`  - ${m.name} (${m.email}) [${m.status}] ID: ${m.id}`));

  } catch (err) {
    console.error('Setup failed:', err);
  } finally {
    await db.destroy();
  }
}

main();
