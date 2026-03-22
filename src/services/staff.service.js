import db from '../config/database.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

// ── Staff CRUD ──────────────────────────────────────────────────────────────

export async function addStaff(gymId, data) {
  const {
    name, phone, email, role, salary_paise, join_date,
    notes, emergency_contact, id_proof_type, id_proof_number,
  } = data;

  if (!name || !phone || !role) {
    throw new ValidationError('name, phone, and role are required');
  }

  // Check duplicate phone within gym
  const existing = await db('gym_staff')
    .where({ gym_id: gymId, phone })
    .whereNot({ status: 'terminated' })
    .first();
  if (existing) {
    throw new ValidationError('Staff member with this phone already exists at this gym');
  }

  const [staff] = await db('gym_staff')
    .insert({
      gym_id: gymId,
      name,
      phone,
      email: email || null,
      role,
      salary_paise: salary_paise || 0,
      join_date: join_date || new Date().toISOString().slice(0, 10),
      notes: notes || null,
      emergency_contact: emergency_contact || null,
      id_proof_type: id_proof_type || null,
      id_proof_number: id_proof_number || null,
      status: 'active',
    })
    .returning('*');

  return staff;
}

export async function listStaff(gymId, { role, status } = {}) {
  const query = db('gym_staff').where({ gym_id: gymId });

  if (role) query.andWhere({ role });
  if (status) {
    query.andWhere({ status });
  } else {
    // By default exclude terminated staff
    query.whereNot({ status: 'terminated' });
  }

  const staff = await query.orderBy('name', 'asc');
  return { staff };
}

export async function getStaff(gymId, staffId) {
  const staff = await db('gym_staff')
    .where({ id: staffId, gym_id: gymId })
    .first();
  if (!staff) throw new NotFoundError('Staff member');

  // Attendance summary for current month
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const nextMonth = now.getMonth() === 11
    ? `${now.getFullYear() + 1}-01-01`
    : `${now.getFullYear()}-${String(now.getMonth() + 2).padStart(2, '0')}-01`;

  const attendanceRows = await db('staff_attendance')
    .where({ staff_id: staffId, gym_id: gymId })
    .where('date', '>=', monthStart)
    .where('date', '<', nextMonth);

  const attendanceSummary = {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    present: 0,
    absent: 0,
    half_day: 0,
    leave: 0,
    total_days: attendanceRows.length,
  };

  for (const row of attendanceRows) {
    if (attendanceSummary[row.status] !== undefined) {
      attendanceSummary[row.status]++;
    }
  }

  return { ...staff, attendance_summary: attendanceSummary };
}

export async function updateStaff(gymId, staffId, data) {
  const allowed = [
    'name', 'phone', 'email', 'role', 'salary_paise',
    'notes', 'emergency_contact', 'id_proof_type', 'id_proof_number',
  ];
  const filtered = Object.fromEntries(
    Object.entries(data).filter(([key]) => allowed.includes(key))
  );

  if (Object.keys(filtered).length === 0) {
    throw new ValidationError('No valid fields to update');
  }

  const [updated] = await db('gym_staff')
    .where({ id: staffId, gym_id: gymId })
    .whereNot({ status: 'terminated' })
    .update({ ...filtered, updated_at: new Date() })
    .returning('*');

  if (!updated) throw new NotFoundError('Staff member');
  return updated;
}

export async function terminateStaff(gymId, staffId) {
  const [updated] = await db('gym_staff')
    .where({ id: staffId, gym_id: gymId })
    .whereNot({ status: 'terminated' })
    .update({
      status: 'terminated',
      exit_date: new Date().toISOString().slice(0, 10),
      updated_at: new Date(),
    })
    .returning('*');

  if (!updated) throw new NotFoundError('Staff member');
  return updated;
}

// ── Attendance ──────────────────────────────────────────────────────────────

export async function markAttendance(gymId, staffId, { date, status, check_in, check_out, notes }) {
  if (!date || !status) {
    throw new ValidationError('date and status are required');
  }

  // Verify staff exists and belongs to gym
  const staff = await db('gym_staff')
    .where({ id: staffId, gym_id: gymId })
    .whereNot({ status: 'terminated' })
    .first();
  if (!staff) throw new NotFoundError('Staff member');

  // Upsert: update if exists for that date, else insert
  const existing = await db('staff_attendance')
    .where({ staff_id: staffId, gym_id: gymId, date })
    .first();

  if (existing) {
    const [updated] = await db('staff_attendance')
      .where({ id: existing.id })
      .update({
        status,
        check_in: check_in || existing.check_in,
        check_out: check_out || existing.check_out,
        notes: notes !== undefined ? notes : existing.notes,
        updated_at: new Date(),
      })
      .returning('*');
    return updated;
  }

  const [record] = await db('staff_attendance')
    .insert({
      staff_id: staffId,
      gym_id: gymId,
      date,
      status,
      check_in: check_in || null,
      check_out: check_out || null,
      notes: notes || null,
    })
    .returning('*');

  return record;
}

export async function getAttendance(gymId, { staffId, month, year } = {}) {
  const query = db('staff_attendance as a')
    .join('gym_staff as s', 'a.staff_id', 's.id')
    .where('a.gym_id', gymId)
    .select(
      'a.*',
      's.name as staff_name',
      's.role as staff_role',
    );

  if (staffId) query.andWhere('a.staff_id', staffId);

  if (month && year) {
    const monthStr = String(month).padStart(2, '0');
    const startDate = `${year}-${monthStr}-01`;
    const nextMonth = month === 12
      ? `${parseInt(year, 10) + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, '0')}-01`;
    query.where('a.date', '>=', startDate).where('a.date', '<', nextMonth);
  }

  const records = await query.orderBy('a.date', 'desc');
  return { attendance: records };
}

// ── Commissions ─────────────────────────────────────────────────────────────

export async function addCommission(gymId, data) {
  const {
    staff_id, amount_paise, type, description, reference_id, date,
  } = data;

  if (!staff_id || !amount_paise || !type) {
    throw new ValidationError('staff_id, amount_paise, and type are required');
  }

  // Verify staff exists
  const staff = await db('gym_staff')
    .where({ id: staff_id, gym_id: gymId })
    .first();
  if (!staff) throw new NotFoundError('Staff member');

  const [commission] = await db('staff_commissions')
    .insert({
      staff_id,
      gym_id: gymId,
      amount_paise,
      type,
      description: description || null,
      reference_id: reference_id || null,
      date: date || new Date().toISOString().slice(0, 10),
      is_paid: false,
    })
    .returning('*');

  return commission;
}

export async function getCommissions(gymId, { staffId, isPaid, month } = {}) {
  const query = db('staff_commissions as c')
    .join('gym_staff as s', 'c.staff_id', 's.id')
    .where('c.gym_id', gymId)
    .select(
      'c.*',
      's.name as staff_name',
      's.role as staff_role',
    );

  if (staffId) query.andWhere('c.staff_id', staffId);
  if (isPaid !== undefined) query.andWhere('c.is_paid', isPaid);

  if (month) {
    // month in YYYY-MM format
    const [year, m] = month.split('-').map(Number);
    const monthStr = String(m).padStart(2, '0');
    const startDate = `${year}-${monthStr}-01`;
    const nextMonth = m === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(m + 1).padStart(2, '0')}-01`;
    query.where('c.date', '>=', startDate).where('c.date', '<', nextMonth);
  }

  const commissions = await query.orderBy('c.date', 'desc');
  return { commissions };
}

export async function markCommissionPaid(gymId, commissionId) {
  const [updated] = await db('staff_commissions')
    .where({ id: commissionId, gym_id: gymId, is_paid: false })
    .update({ is_paid: true, paid_at: new Date(), updated_at: new Date() })
    .returning('*');

  if (!updated) throw new NotFoundError('Commission (or already paid)');
  return updated;
}

// ── Payroll ─────────────────────────────────────────────────────────────────

export async function getPayroll(gymId, month, year) {
  if (!month || !year) {
    throw new ValidationError('month and year are required');
  }

  const monthNum = parseInt(month, 10);
  const yearNum = parseInt(year, 10);
  const monthStr = String(monthNum).padStart(2, '0');
  const startDate = `${yearNum}-${monthStr}-01`;
  const nextMonth = monthNum === 12
    ? `${yearNum + 1}-01-01`
    : `${yearNum}-${String(monthNum + 1).padStart(2, '0')}-01`;

  // Get all active (and recently terminated) staff
  const staff = await db('gym_staff')
    .where({ gym_id: gymId })
    .where(function () {
      this.whereNot({ status: 'terminated' })
        .orWhere('exit_date', '>=', startDate);
    })
    .orderBy('name', 'asc');

  const payroll = [];

  for (const member of staff) {
    // Attendance counts
    const attendance = await db('staff_attendance')
      .where({ staff_id: member.id, gym_id: gymId })
      .where('date', '>=', startDate)
      .where('date', '<', nextMonth);

    let presentDays = 0;
    let halfDays = 0;
    let absentDays = 0;
    let leaveDays = 0;

    for (const row of attendance) {
      switch (row.status) {
        case 'present': presentDays++; break;
        case 'half_day': halfDays++; break;
        case 'absent': absentDays++; break;
        case 'leave': leaveDays++; break;
      }
    }

    // Commissions for the month
    const commissions = await db('staff_commissions')
      .where({ staff_id: member.id, gym_id: gymId })
      .where('date', '>=', startDate)
      .where('date', '<', nextMonth);

    const totalCommissionPaise = commissions.reduce(
      (sum, c) => sum + (c.amount_paise || 0), 0
    );
    const paidCommissionPaise = commissions
      .filter((c) => c.is_paid)
      .reduce((sum, c) => sum + (c.amount_paise || 0), 0);
    const unpaidCommissionPaise = totalCommissionPaise - paidCommissionPaise;

    // Calculate working-day salary (pro-rata based on attendance)
    const totalWorkingDays = presentDays + halfDays + absentDays + leaveDays;
    const effectiveDays = presentDays + (halfDays * 0.5);
    const salaryPaise = member.salary_paise || 0;
    const earnedSalaryPaise = totalWorkingDays > 0
      ? Math.round((salaryPaise / totalWorkingDays) * effectiveDays)
      : salaryPaise;

    const totalPayablePaise = earnedSalaryPaise + unpaidCommissionPaise;

    payroll.push({
      staff_id: member.id,
      name: member.name,
      role: member.role,
      status: member.status,
      base_salary_paise: salaryPaise,
      earned_salary_paise: earnedSalaryPaise,
      attendance: {
        present: presentDays,
        half_day: halfDays,
        absent: absentDays,
        leave: leaveDays,
        total: totalWorkingDays,
      },
      commission_total_paise: totalCommissionPaise,
      commission_paid_paise: paidCommissionPaise,
      commission_unpaid_paise: unpaidCommissionPaise,
      total_payable_paise: totalPayablePaise,
    });
  }

  const grandTotal = payroll.reduce((sum, p) => sum + p.total_payable_paise, 0);

  return {
    month: monthNum,
    year: yearNum,
    payroll,
    grand_total_paise: grandTotal,
    staff_count: payroll.length,
  };
}
