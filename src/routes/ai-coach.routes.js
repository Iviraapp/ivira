import config from '../config/index.js';

const SYSTEM_PROMPT = `You are IVIRA AI Coach — a certified fitness, health, and wellness assistant embedded in a gym management app used across India.

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
- Occasionally use relevant emoji (💪 🏋️ 🥗 💧 😴) sparingly

OFF-TOPIC RESPONSE:
If the user asks anything outside fitness/health/wellness, respond with exactly:
"I'm your fitness coach, so I can only help with workout, nutrition, and wellness topics! 💪 Got a fitness question? I'm all ears."`;

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
      equipment_available: {
        type: 'array',
        items: { type: 'string', enum: ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'band', 'kettlebell'] },
      },
      focus_areas: {
        type: 'array',
        items: { type: 'string', enum: ['chest', 'back', 'shoulders', 'arms', 'legs', 'core', 'cardio', 'full_body'] },
      },
    },
  },
};

const WORKOUT_PLAN_PROMPT = `You are a certified personal trainer creating a structured weekly workout plan.

RULES:
- Return ONLY valid JSON, no markdown, no explanation text outside the JSON
- Structure the plan as a weekly schedule based on the number of training days
- Include rest days where appropriate
- Each exercise must have: exercise_name, sets (number), reps (number or range string like "8-12"), rest_seconds (number), and optional weight_suggestion (string like "moderate" or "bodyweight" or a kg suggestion based on experience)
- Group exercises logically (compound movements first, isolation after)
- Include warm-up exercises (1-2) at the start of each day
- Include a brief note for each day explaining the focus
- Adapt volume and intensity to the experience level:
  - Beginner: 3-4 exercises per session, 2-3 sets each, higher reps (10-15)
  - Intermediate: 5-6 exercises per session, 3-4 sets each, moderate reps (8-12)
  - Advanced: 6-8 exercises per session, 4-5 sets each, varied rep ranges (4-15)

RESPONSE FORMAT:
{
  "plan_name": "string",
  "description": "string (1-2 sentences)",
  "days": [
    {
      "day_number": 1,
      "day_name": "string (e.g. Push Day, Upper Body, etc.)",
      "focus": "string (brief note)",
      "estimated_minutes": number,
      "exercises": [
        {
          "exercise_name": "string",
          "sets": number,
          "reps": "string",
          "rest_seconds": number,
          "weight_suggestion": "string",
          "is_warmup": boolean
        }
      ]
    }
  ],
  "weekly_notes": "string (recovery tips, progression advice)"
}`;

export default async function aiCoachRoutes(fastify) {
  fastify.post('/ai/coach', {
    schema: messageSchema,
    preHandler: [fastify.verifyToken],
  }, async (request, reply) => {
    const { message, history = [] } = request.body;

    // Support DeepSeek or Anthropic (prefer DeepSeek if available)
    const useDeepSeek = config.deepseek.enabled;
    const useAnthropic = config.anthropic.enabled;

    if (!useDeepSeek && !useAnthropic) {
      return reply.code(503).send({
        error: 'AI_NOT_CONFIGURED',
        message: 'AI Coach is not available at this time.',
      });
    }

    // Build messages array with conversation history
    const messages = [];
    for (const msg of history.slice(-16)) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        messages.push({ role: msg.role, content: msg.content });
      }
    }
    messages.push({ role: 'user', content: message });

    try {
      let text;

      if (useDeepSeek) {
        const response = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.deepseek.apiKey}`,
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            max_tokens: 512,
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              ...messages,
            ],
          }),
        });

        if (!response.ok) {
          const err = await response.text();
          request.log.error({ status: response.status, err }, 'DeepSeek API error');
          return reply.code(502).send({
            error: 'AI_ERROR',
            message: 'AI Coach is temporarily unavailable. Please try again.',
          });
        }

        const data = await response.json();
        text = data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response. Please try again.';
      } else {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': config.anthropic.apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 512,
            system: SYSTEM_PROMPT,
            messages,
          }),
        });

        if (!response.ok) {
          const err = await response.text();
          request.log.error({ status: response.status, err }, 'Anthropic API error');
          return reply.code(502).send({
            error: 'AI_ERROR',
            message: 'AI Coach is temporarily unavailable. Please try again.',
          });
        }

        const data = await response.json();
        text = data.content?.[0]?.text || 'Sorry, I could not generate a response. Please try again.';
      }

      return { reply: text };
    } catch (err) {
      request.log.error(err, 'AI Coach request failed');
      return reply.code(502).send({
        error: 'AI_ERROR',
        message: 'AI Coach is temporarily unavailable. Please try again.',
      });
    }
  });

  // POST /ai/workout-plan - Generate a weekly workout plan using Claude
  fastify.post('/ai/workout-plan', {
    schema: workoutPlanSchema,
    preHandler: [fastify.verifyToken],
  }, async (request, reply) => {
    const { goal, experience_level, days_per_week, equipment_available, focus_areas } = request.body;

    const useDeepSeek = config.deepseek.enabled;
    const useAnthropic = config.anthropic.enabled;

    if (!useDeepSeek && !useAnthropic) {
      return reply.code(503).send({
        error: 'AI_NOT_CONFIGURED',
        message: 'AI workout planner is not available at this time.',
      });
    }

    const equipmentList = (equipment_available && equipment_available.length > 0)
      ? equipment_available.join(', ')
      : 'all standard gym equipment';

    const focusList = (focus_areas && focus_areas.length > 0)
      ? focus_areas.join(', ')
      : 'balanced full body';

    const userMessage = `Create a ${days_per_week}-day weekly workout plan with the following parameters:
- Goal: ${goal.replace(/_/g, ' ')}
- Experience level: ${experience_level}
- Days per week: ${days_per_week}
- Available equipment: ${equipmentList}
- Focus areas: ${focusList}

Return the plan as JSON following the exact format specified.`;

    try {
      let text;

      if (useDeepSeek) {
        const response = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.deepseek.apiKey}`,
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            max_tokens: 4096,
            messages: [
              { role: 'system', content: WORKOUT_PLAN_PROMPT },
              { role: 'user', content: userMessage },
            ],
          }),
        });

        if (!response.ok) {
          const err = await response.text();
          request.log.error({ status: response.status, err }, 'DeepSeek API error (workout plan)');
          return reply.code(502).send({
            error: 'AI_ERROR',
            message: 'AI workout planner is temporarily unavailable. Please try again.',
          });
        }

        const data = await response.json();
        text = data.choices?.[0]?.message?.content || '';
      } else {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': config.anthropic.apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 4096,
            system: WORKOUT_PLAN_PROMPT,
            messages: [{ role: 'user', content: userMessage }],
          }),
        });

        if (!response.ok) {
          const err = await response.text();
          request.log.error({ status: response.status, err }, 'Anthropic API error (workout plan)');
          return reply.code(502).send({
            error: 'AI_ERROR',
            message: 'AI workout planner is temporarily unavailable. Please try again.',
          });
        }

        const data = await response.json();
        text = data.content?.[0]?.text || '';
      }

      // Parse the JSON response from Claude
      let plan;
      try {
        // Strip any markdown code fences if present
        const jsonStr = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        plan = JSON.parse(jsonStr);
      } catch (parseErr) {
        request.log.error({ text, parseErr }, 'Failed to parse workout plan JSON');
        return reply.code(502).send({
          error: 'AI_PARSE_ERROR',
          message: 'Failed to generate a valid workout plan. Please try again.',
        });
      }

      return {
        plan,
        metadata: {
          goal,
          experience_level,
          days_per_week,
          equipment_available: equipment_available || [],
          focus_areas: focus_areas || [],
          generated_at: new Date().toISOString(),
        },
      };
    } catch (err) {
      request.log.error(err, 'AI workout plan request failed');
      return reply.code(502).send({
        error: 'AI_ERROR',
        message: 'AI workout planner is temporarily unavailable. Please try again.',
      });
    }
  });
}
