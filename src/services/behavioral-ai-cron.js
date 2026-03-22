import db from '../config/database.js';
import { runBehavioralEngine } from './behavioral-ai.service.js';

/**
 * Cron wrapper: runs the behavioral AI engine for all active gyms.
 */
export async function runBehavioralEngineForAllGyms() {
  const gyms = await db('gyms').where({ status: 'active' }).select('id', 'gym_name');

  const results = [];

  for (const gym of gyms) {
    try {
      const result = await runBehavioralEngine(gym.id);
      results.push({ gym_id: gym.id, gym_name: gym.gym_name, ...result });
    } catch (err) {
      console.error(`[behavioral-ai] Failed for gym ${gym.gym_name}:`, err.message);
      results.push({ gym_id: gym.id, gym_name: gym.gym_name, error: err.message });
    }
  }

  return { gyms_processed: results.length, results };
}
