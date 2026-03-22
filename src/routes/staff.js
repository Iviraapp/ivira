import * as staffService from '../services/staff.service.js';

const addStaffSchema = {
  body: {
    type: 'object',
    required: ['name', 'phone', 'role'],
    properties: {
      name: { type: 'string', minLength: 2 },
      phone: { type: 'string', minLength: 10 },
      email: { type: 'string' },
      role: { type: 'string', enum: ['owner', 'manager', 'trainer', 'front_desk', 'cleaner'] },
      salary_paise: { type: 'integer', minimum: 0 },
      join_date: { type: 'string', format: 'date' },
      notes: { type: 'string' },
      emergency_contact: { type: 'string' },
      id_proof_type: { type: 'string', enum: ['aadhaar', 'pan', 'passport', 'driving_license', 'voter_id'] },
      id_proof_number: { type: 'string' },
    },
  },
};

const markAttendanceSchema = {
  body: {
    type: 'object',
    required: ['date', 'status'],
    properties: {
      date: { type: 'string', format: 'date' },
      status: { type: 'string', enum: ['present', 'absent', 'half_day', 'leave'] },
      check_in: { type: 'string', pattern: '^\\d{2}:\\d{2}(:\\d{2})?$' },
      check_out: { type: 'string', pattern: '^\\d{2}:\\d{2}(:\\d{2})?$' },
      notes: { type: 'string' },
    },
  },
};

const addCommissionSchema = {
  body: {
    type: 'object',
    required: ['staff_id', 'amount_paise', 'type'],
    properties: {
      staff_id: { type: 'string', format: 'uuid' },
      amount_paise: { type: 'integer', minimum: 1 },
      type: { type: 'string', enum: ['pt_session', 'referral', 'bonus', 'deduction'] },
      description: { type: 'string' },
      reference_id: { type: 'string' },
      date: { type: 'string', format: 'date' },
    },
  },
};

export default async function staffRoutes(fastify) {
  const authHooks = { preHandler: [fastify.verifyToken, fastify.verifyGymOwner] };

  // ── Staff CRUD ──────────────────────────────────────────────────────────

  fastify.post('/gyms/:gymId/staff', { schema: addStaffSchema, ...authHooks }, async (request, reply) => {
    const staff = await staffService.addStaff(request.params.gymId, request.body);
    return reply.code(201).send({ staff });
  });

  fastify.get('/gyms/:gymId/staff', authHooks, async (request) => {
    const { role, status } = request.query;
    return staffService.listStaff(request.params.gymId, { role, status });
  });

  fastify.get('/gyms/:gymId/staff/:staffId', authHooks, async (request) => {
    const staff = await staffService.getStaff(request.params.gymId, request.params.staffId);
    return { staff };
  });

  fastify.put('/gyms/:gymId/staff/:staffId', authHooks, async (request) => {
    const staff = await staffService.updateStaff(
      request.params.gymId,
      request.params.staffId,
      request.body,
    );
    return { staff };
  });

  fastify.delete('/gyms/:gymId/staff/:staffId', authHooks, async (request) => {
    const staff = await staffService.terminateStaff(request.params.gymId, request.params.staffId);
    return { staff, message: 'Staff member terminated' };
  });

  // ── Attendance ──────────────────────────────────────────────────────────

  fastify.post('/gyms/:gymId/staff/:staffId/attendance', { schema: markAttendanceSchema, ...authHooks }, async (request, reply) => {
    const record = await staffService.markAttendance(
      request.params.gymId,
      request.params.staffId,
      request.body,
    );
    return reply.code(201).send({ attendance: record });
  });

  fastify.get('/gyms/:gymId/staff/attendance', authHooks, async (request) => {
    const { staffId, month, year } = request.query;
    const parsedMonth = month ? parseInt(month, 10) : undefined;
    const parsedYear = year ? parseInt(year, 10) : undefined;
    return staffService.getAttendance(request.params.gymId, {
      staffId,
      month: parsedMonth,
      year: parsedYear,
    });
  });

  // ── Commissions ─────────────────────────────────────────────────────────

  fastify.post('/gyms/:gymId/staff/commissions', { schema: addCommissionSchema, ...authHooks }, async (request, reply) => {
    const commission = await staffService.addCommission(request.params.gymId, request.body);
    return reply.code(201).send({ commission });
  });

  fastify.get('/gyms/:gymId/staff/commissions', authHooks, async (request) => {
    const { staffId, isPaid, month } = request.query;
    const parsedIsPaid = isPaid !== undefined ? isPaid === 'true' : undefined;
    return staffService.getCommissions(request.params.gymId, {
      staffId,
      isPaid: parsedIsPaid,
      month,
    });
  });

  fastify.patch('/gyms/:gymId/staff/commissions/:commissionId/pay', authHooks, async (request) => {
    const commission = await staffService.markCommissionPaid(
      request.params.gymId,
      request.params.commissionId,
    );
    return { commission };
  });

  // ── Payroll ─────────────────────────────────────────────────────────────

  fastify.get('/gyms/:gymId/staff/payroll', authHooks, async (request) => {
    const { month, year } = request.query;
    return staffService.getPayroll(request.params.gymId, month, year);
  });
}
