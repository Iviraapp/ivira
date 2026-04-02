import config from '../config/index.js';

const AI_RATE_LIMIT_WINDOW_MS = 60_000;
const AI_RATE_LIMIT_DEFAULT = 20;
const AI_RATE_LIMIT_AUTH = 40;
const aiRateMap = new Map();

function checkAiRateLimit(request, reply) {
  const ip = request.ip;
  const now = Date.now();
  const isAuthenticated = !!request.user;
  const maxRequests = isAuthenticated ? AI_RATE_LIMIT_AUTH : AI_RATE_LIMIT_DEFAULT;
  let entry = aiRateMap.get(ip);
  if (!entry || now - entry.windowStart > AI_RATE_LIMIT_WINDOW_MS) {
    entry = { windowStart: now, count: 0 };
    aiRateMap.set(ip, entry);
  }
  entry.count++;
  if (entry.count > maxRequests) {
    reply.code(429).send({ error: 'RATE_LIMIT', message: `Too many AI requests. Max ${maxRequests}/minute.` });
    return false;
  }
  return true;
}

setInterval(() => {
  const cutoff = Date.now() - AI_RATE_LIMIT_WINDOW_MS * 2;
  for (const [ip, entry] of aiRateMap) {
    if (entry.windowStart < cutoff) aiRateMap.delete(ip);
  }
}, 300_000).unref();

async function optionalAuth(request) {
  try {
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const jwt = (await import('jsonwebtoken')).default;
      const decoded = jwt.verify(authHeader.slice(7), config.jwt.secret);
      request.user = decoded;
    }
  } catch {
    request.user = null;
  }
}

const BASE_SYSTEM_PROMPT = `You are Vira AI — a certified fitness, health, and wellness assistant embedded in a gym management app used across India.

ROLE & SCOPE:
- You ONLY answer questions related to: fitness, exercise, workouts, nutrition, diet, supplements, recovery, sleep, injury prevention, weight management, yoga, sports, mental health as it relates to fitness, and general wellness.
- You have deep knowledge of Indian dietary habits, foods (dal, roti, paneer, curd, etc.), and cultural context.
- You give practical, evidence-based advice tailored to the user's context.

STRICT BOUNDARIES — you MUST refuse (politely) any topic outside fitness/health:
- No politics, religion, current events, entertainment, coding, finance, legal advice, or general knowledge
- No medical diagnoses or prescriptions — always recommend consulting a doctor for medical concerns
- No mental health therapy — only general stress/sleep wellness tips related to fitness

COMPLIANCE & SAFETY:
- Always include a disclaimer when discussing supplements: "Consult your doctor before starting any supplement."
- For injury-related questions: "If pain persists, please visit a physiotherapist or doctor."
- Never recommend extreme diets, crash diets, or dangerous weight loss methods
- Never recommend steroids, PEDs, or banned substances
- Recommend professional supervision for heavy lifting, advanced exercises, or if the user mentions any medical condition
- Be inclusive — adapt advice for all genders, body types, and fitness levels

TONE:
- Friendly, encouraging, and concise
- Use short paragraphs (2-3 sentences max per paragraph)
- Use bullet points for lists
- Keep responses under 200 words unless the question requires detail
- Reference the user's personal data naturally when relevant — don't announce it, just use it
- Occasionally use relevant emoji (🎯 🏋️ 🥗 💧 😴) sparingly

PERSONALISATION:
When user context is provided, weave it naturally into responses:
- Address the member by first name
- Reference their streak, Circle rank, form scores, or health data to make advice specific
- If they have a high form score, acknowledge and push further
- If they slept poorly, factor that into workout recommendations
- If calories are low, mention fuelling before recommending intensity

OFF-TOPIC RESPONSE:
If the user asks anything outside fitness/health/wellness, respond with exactly:
"I'm your fitness coach, so I can only help with workout, nutrition, and wellness topics! 🎯 Got a fitness question? I'm all ears."`;

// ── Build personalised context block from user data ─────────────
function buildContextBlock(context) {
  if (!context || typeof context !== 'object') return '';
  const lines = [];

  if (context.member_name)        lines.push(`Member name: ${context.member_name}`);
  if (context.streak > 0)         lines.push(`Current streak: ${context.streak} days`);
  if (context.steps_today > 0)    lines.push(`Steps today: ${context.steps_today.toLocaleString()}`);
  if (context.sleep_score)        lines.push(`Last sleep score: ${context.sleep_score}/100`);
  if (context.sleep_hours)        lines.push(`Sleep last night: ${context.sleep_hours}h`);
  if (context.calories_today > 0) lines.push(`Calories consumed today: ${context.calories_today} kcal (goal: ${context.calorie_goal || 2000} kcal)`);
  if (context.protein_today > 0)  lines.push(`Protein today: ${context.protein_today}g`);
  if (context.last_checkin_today) lines.push(`Checked in at gym today: yes`);
  if (context.fasting_hours)      lines.push(`Currently ${context.fasting_hours}h into intermittent fast`);
  if (context.last_form_score)    lines.push(`Last AI workout form score: ${context.last_form_score}/100`);
  if (context.circle_name)        lines.push(`Circle (accountability group): ${context.circle_name}`);
  if (context.circle_rank)        lines.push(`Current Circle rank: #${context.circle_rank}`);
  if (context.circle_points)      lines.push(`Circle points today: ${context.circle_points}`);
  if (context.circle_members_active) lines.push(`Circle members active today: ${context.circle_members_active}`);
  if (context.gym_name)           lines.push(`Gym: ${context.gym_name}`);
  if (context.gym_city)           lines.push(`City: ${context.gym_city}`);

  if (lines.length === 0) return '';
  return `\n\nMEMBER CONTEXT (use this to personalise your response — reference it naturally, not robotically):\n${lines.join('\n')}`;
}

// ── Message schema — now accepts optional context object ─────────
const messageSchema = {
  body: {
    type: 'object',
    required: ['message'],
    properties: {
      message: { type: 'string', minLength: 1, maxLength: 2000 },
      history: {
        type: 'array',
        maxItems: 20,
        items: {
          type: 'object',
          properties: {
            role: { type: 'string', enum: ['user', 'assistant'] },
            content: { type: 'string' },
          },
        },
      },
      // ── NEW: rich user context from the mobile app ───────────
      context: {
        type: 'object',
        additionalProperties: true,
        properties: {
          member_name:           { type: 'string' },
          streak:                { type: 'number' },
          steps_today:           { type: 'number' },
          sleep_score:           { type: 'number' },
          sleep_hours:           { type: 'number' },
          calories_today:        { type: 'number' },
          calorie_goal:          { type: 'number' },
          protein_today:         { type: 'number' },
          last_checkin_today:    { type: 'boolean' },
          fasting_hours:         { type: 'number' },
          last_form_score:       { type: 'number' },
          circle_name:           { type: 'string' },
          circle_rank:           { type: 'number' },
          circle_points:         { type: 'number' },
          circle_members_active: { type: 'number' },
          gym_name:              { type: 'string' },
          gym_city:              { type: 'string' },
        },
      },
    },
  },
};

const workoutPlanSchema = {
  body: {
    type: 'object',
    required: ['goal', 'experience_level', 'days_per_week'],
    properties: {
      goal: { type: 'string', enum: ['muscle_gain', 'fat_loss', 'strength', 'endurance', 'general_fitness', 'flexibility'] },
      experience_level: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
      days_per_week: { type: 'integer', minimum: 1, maximum: 7 },
      equipment_available: { type: 'array', items: { type: 'string' } },
      focus_areas: { type: 'array', items: { type: 'string' } },
    },
  },
};

const WORKOUT_PLAN_PROMPT = `You are a certified personal trainer creating a structured weekly workout plan.
Return ONLY valid JSON, no markdown, no explanation outside the JSON.
Each exercise must have: exercise_name, sets (number), reps (string), rest_seconds (number), weight_suggestion (string), is_warmup (boolean).
Adapt volume/intensity to experience level. Group compound movements first. Include 1-2 warmup exercises per day.
Response format:
{
  "plan_name": "string",
  "description": "string",
  "days": [{ "day_number": 1, "day_name": "string", "focus": "string", "estimated_minutes": number, "exercises": [{ "exercise_name": "string", "sets": number, "reps": "string", "rest_seconds": number, "weight_suggestion": "string", "is_warmup": boolean }] }],
  "weekly_notes": "string"
}`;

async function callAI({ systemPrompt, messages, maxTokens = 512, useDeepSeek, useAnthropic, request, reply }) {
  let text;

  if (useDeepSeek) {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      signal: AbortSignal.timeout(30000),
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.deepseek.apiKey}` },
      body: JSON.stringify({ model: 'deepseek-chat', max_tokens: maxTokens, messages: [{ role: 'system', content: systemPrompt }, ...messages] }),
    });
    if (!response.ok) {
      const err = await response.text();
      request.log.error({ status: response.status, err }, 'DeepSeek API error');
      return reply.code(502).send({ error: 'AI_ERROR', message: 'Vira AI is temporarily unavailable.' });
    }
    const data = await response.json();
    text = data.choices?.[0]?.message?.content || '';
  } else {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: AbortSignal.timeout(30000),
      headers: { 'Content-Type': 'application/json', 'x-api-key': config.anthropic.apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: maxTokens, system: systemPrompt, messages }),
    });
    if (!response.ok) {
      const err = await response.text();
      request.log.error({ status: response.status, err }, 'Anthropic API error');
      return reply.code(502).send({ error: 'AI_ERROR', message: 'Vira AI is temporarily unavailable.' });
    }
    const data = await response.json();
    text = data.content?.[0]?.text || '';
  }
  return text;
}

export default async function aiCoachRoutes(fastify) {
  fastify.post('/ai/coach', {
    schema: messageSchema,
    preHandler: [
      async (request, reply) => { await optionalAuth(request); },
      async (request, reply) => { if (!checkAiRateLimit(request, reply)) return; },
      fastify.verifyToken,
    ],
  }, async (request, reply) => {
    const { message, history = [], context = {} } = request.body;

    const useDeepSeek = config.deepseek.enabled;
    const useAnthropic = config.anthropic.enabled;
    if (!useDeepSeek && !useAnthropic) {
      return reply.code(503).send({ error: 'AI_NOT_CONFIGURED', message: 'Vira AI is not available.' });
    }

    // Build personalised system prompt with context block injected
    const contextBlock = buildContextBlock(context);
    const systemPrompt = BASE_SYSTEM_PROMPT + contextBlock;

    const messages = [];
    for (const msg of history.slice(-16)) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        messages.push({ role: msg.role, content: msg.content });
      }
    }
    messages.push({ role: 'user', content: message });

    try {
      const text = await callAI({ systemPrompt, messages, maxTokens: 512, useDeepSeek, useAnthropic, request, reply });
      if (typeof text !== 'string') return; // reply already sent in callAI
      return { reply: text };
    } catch (err) {
      request.log.error(err, 'Vira AI request failed');
      return reply.code(502).send({ error: 'AI_ERROR', message: 'Vira AI is temporarily unavailable.' });
    }
  });

  fastify.post('/ai/workout-plan', {
    schema: workoutPlanSchema,
    preHandler: [
      async (request, reply) => { await optionalAuth(request); },
      async (request, reply) => { if (!checkAiRateLimit(request, reply)) return; },
      fastify.verifyToken,
    ],
  }, async (request, reply) => {
    const { goal, experience_level, days_per_week, equipment_available, focus_areas } = request.body;
    const useDeepSeek = config.deepseek.enabled;
    const useAnthropic = config.anthropic.enabled;
    if (!useDeepSeek && !useAnthropic) {
      return reply.code(503).send({ error: 'AI_NOT_CONFIGURED', message: 'Vira AI workout planner is not available.' });
    }

    const equipmentList = equipment_available?.length > 0 ? equipment_available.join(', ') : 'all standard gym equipment';
    const focusList = focus_areas?.length > 0 ? focus_areas.join(', ') : 'balanced full body';
    const userMessage = `Create a ${days_per_week}-day weekly workout plan: Goal: ${goal.replace(/_/g, ' ')}, Experience: ${experience_level}, Equipment: ${equipmentList}, Focus: ${focusList}. Return as JSON.`;

    try {
      const text = await callAI({ systemPrompt: WORKOUT_PLAN_PROMPT, messages: [{ role: 'user', content: userMessage }], maxTokens: 4096, useDeepSeek, useAnthropic, request, reply });
      if (typeof text !== 'string') return;
      const jsonStr = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const plan = JSON.parse(jsonStr);
      return { plan, metadata: { goal, experience_level, days_per_week, equipment_available: equipment_available || [], focus_areas: focus_areas || [], generated_at: new Date().toISOString() } };
    } catch (err) {
      request.log.error(err, 'AI workout plan failed');
      return reply.code(502).send({ error: 'AI_ERROR', message: 'Failed to generate workout plan.' });
    }
  });
}
