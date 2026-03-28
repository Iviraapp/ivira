import db from '../config/database.js';

// ─── Shared Styles & Layout ────────────────────────────────────────────────────

const COLORS = {
  bg: '#0B0F19',
  surface: '#131825',
  border: '#1E2536',
  accent: '#1A3A8F',
  accentHover: '#2248A8',
  text: '#F1F5F9',
  textMuted: '#94A3B8',
  danger: '#EF4444',
  success: '#22C55E',
  warning: '#F59E0B',
};

function css() {
  return `
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; background:${COLORS.bg}; color:${COLORS.text}; min-height:100vh; display:flex; }
    a { color:${COLORS.accent}; text-decoration:none; }
    .sidebar { width:240px; background:${COLORS.surface}; border-right:1px solid ${COLORS.border}; min-height:100vh; position:fixed; top:0; left:0; display:flex; flex-direction:column; }
    .sidebar-brand { padding:24px 20px; font-size:18px; font-weight:700; letter-spacing:1px; border-bottom:1px solid ${COLORS.border}; color:${COLORS.accent}; }
    .sidebar-nav { flex:1; padding:12px 0; }
    .sidebar-nav a { display:flex; align-items:center; padding:10px 20px; color:${COLORS.textMuted}; font-size:14px; transition:all .15s; }
    .sidebar-nav a:hover, .sidebar-nav a.active { color:${COLORS.text}; background:rgba(26,58,143,.15); border-right:3px solid ${COLORS.accent}; }
    .sidebar-nav a .icon { width:20px; margin-right:12px; text-align:center; }
    .sidebar-logout { padding:16px 20px; border-top:1px solid ${COLORS.border}; }
    .sidebar-logout button { width:100%; padding:8px; background:transparent; border:1px solid ${COLORS.border}; color:${COLORS.textMuted}; border-radius:6px; cursor:pointer; font-size:13px; }
    .sidebar-logout button:hover { border-color:${COLORS.danger}; color:${COLORS.danger}; }
    .main { margin-left:240px; flex:1; min-height:100vh; }
    .topbar { padding:16px 32px; border-bottom:1px solid ${COLORS.border}; display:flex; align-items:center; justify-content:space-between; }
    .topbar h1 { font-size:20px; font-weight:600; }
    .content { padding:32px; }
    .stats-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:20px; margin-bottom:32px; }
    .stat-card { background:${COLORS.surface}; border:1px solid ${COLORS.border}; border-top:3px solid ${COLORS.accent}; border-radius:8px; padding:20px; }
    .stat-card .label { font-size:12px; text-transform:uppercase; color:${COLORS.textMuted}; letter-spacing:.5px; margin-bottom:8px; }
    .stat-card .value { font-size:28px; font-weight:700; }
    table { width:100%; border-collapse:collapse; background:${COLORS.surface}; border:1px solid ${COLORS.border}; border-radius:8px; overflow:hidden; }
    thead th { text-align:left; padding:12px 16px; font-size:12px; text-transform:uppercase; color:${COLORS.textMuted}; border-bottom:1px solid ${COLORS.border}; letter-spacing:.5px; }
    tbody td { padding:12px 16px; border-bottom:1px solid ${COLORS.border}; font-size:14px; }
    tbody tr:hover { background:rgba(26,58,143,.08); }
    .btn { display:inline-block; padding:8px 16px; border-radius:6px; font-size:13px; font-weight:500; cursor:pointer; border:none; transition:all .15s; }
    .btn-primary { background:${COLORS.accent}; color:#fff; }
    .btn-primary:hover { background:${COLORS.accentHover}; }
    .btn-danger { background:transparent; border:1px solid ${COLORS.danger}; color:${COLORS.danger}; }
    .btn-danger:hover { background:${COLORS.danger}; color:#fff; }
    .btn-sm { padding:5px 10px; font-size:12px; }
    input,select,textarea { background:${COLORS.bg}; border:1px solid ${COLORS.border}; color:${COLORS.text}; padding:10px 14px; border-radius:6px; font-size:14px; width:100%; }
    input:focus,select:focus,textarea:focus { outline:none; border-color:${COLORS.accent}; }
    .search-bar { max-width:400px; margin-bottom:20px; }
    .form-group { margin-bottom:16px; }
    .form-group label { display:block; font-size:13px; color:${COLORS.textMuted}; margin-bottom:6px; }
    .badge { display:inline-block; padding:3px 8px; border-radius:4px; font-size:11px; font-weight:600; text-transform:uppercase; }
    .badge-active { background:rgba(34,197,94,.15); color:${COLORS.success}; }
    .badge-suspended { background:rgba(239,68,68,.15); color:${COLORS.danger}; }
    .pagination { display:flex; gap:8px; margin-top:20px; justify-content:center; }
    .pagination button { padding:6px 12px; background:${COLORS.surface}; border:1px solid ${COLORS.border}; color:${COLORS.textMuted}; border-radius:4px; cursor:pointer; }
    .pagination button.active, .pagination button:hover { background:${COLORS.accent}; color:#fff; border-color:${COLORS.accent}; }
    .quick-links { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:16px; }
    .quick-link { background:${COLORS.surface}; border:1px solid ${COLORS.border}; border-radius:8px; padding:20px; text-align:center; color:${COLORS.textMuted}; transition:all .15s; }
    .quick-link:hover { border-color:${COLORS.accent}; color:${COLORS.text}; }
    .filter-row { display:flex; gap:12px; margin-bottom:20px; flex-wrap:wrap; }
    .filter-row select, .filter-row input { width:auto; min-width:180px; }
    .notification-form { background:${COLORS.surface}; border:1px solid ${COLORS.border}; border-radius:8px; padding:24px; max-width:600px; margin-bottom:32px; }
    .empty { text-align:center; padding:40px; color:${COLORS.textMuted}; }
  `;
}

function commonJS() {
  return `
    function getToken() { return localStorage.getItem('admin_token'); }
    function setToken(t) { localStorage.setItem('admin_token', t); }
    function clearToken() { localStorage.removeItem('admin_token'); }
    function requireAuth() { if (!getToken()) window.location.href = '/admin'; }

    async function api(path, opts = {}) {
      const token = getToken();
      const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) };
      const res = await fetch('/api/v1' + path, { ...opts, headers });
      if (res.status === 401) { clearToken(); window.location.href = '/admin'; return; }
      return res.json();
    }

    function logout() { clearToken(); window.location.href = '/admin'; }

    let _searchTimer;
    function debounce(fn, ms = 350) { clearTimeout(_searchTimer); _searchTimer = setTimeout(fn, ms); }

    function formatDate(d) { if (!d) return '—'; return new Date(d).toLocaleDateString('en-IN', { year:'numeric', month:'short', day:'numeric' }); }
  `;
}

function sidebar(activePage) {
  const links = [
    { href: '/admin/dashboard', icon: '&#9632;', label: 'Dashboard' },
    { href: '/admin/members', icon: '&#9733;', label: 'Members' },
    { href: '/admin/pods', icon: '&#11044;', label: 'Pods' },
    { href: '/admin/notifications', icon: '&#9993;', label: 'Notifications' },
    { href: '/admin/updates', icon: '&#8679;', label: 'Updates' },
  ];
  const items = links.map(l =>
    `<a href="${l.href}" class="${activePage === l.label.toLowerCase() ? 'active' : ''}"><span class="icon">${l.icon}</span>${l.label}</a>`
  ).join('');
  return `
    <aside class="sidebar">
      <div class="sidebar-brand">IVIRA Admin</div>
      <nav class="sidebar-nav">${items}</nav>
      <div class="sidebar-logout"><button onclick="logout()">Sign Out</button></div>
    </aside>
  `;
}

function renderPage(title, bodyContent, activePage) {
  const showSidebar = activePage !== 'login';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title} — IVIRA Admin</title>
  <style>${css()}</style>
</head>
<body>
  ${showSidebar ? sidebar(activePage) : ''}
  <div class="${showSidebar ? 'main' : ''}" style="${showSidebar ? '' : 'width:100%'}">
    ${showSidebar ? `<div class="topbar"><h1>${title}</h1></div>` : ''}
    <div class="content">${bodyContent}</div>
  </div>
  <script>${commonJS()}</script>
</body>
</html>`;
}

// ─── Plugin ────────────────────────────────────────────────────────────────────

export default async function adminDashboardRoutes(fastify) {

  // ── 1. Login Page ──────────────────────────────────────────────────────────

  fastify.get('/admin', async (_req, reply) => {
    const html = renderPage('Sign In', `
      <div style="max-width:380px;margin:80px auto;">
        <h2 style="text-align:center;margin-bottom:8px;font-size:28px;font-weight:700;color:${COLORS.accent}">IVIRA</h2>
        <p style="text-align:center;color:${COLORS.textMuted};margin-bottom:32px;font-size:14px;">Admin Dashboard</p>
        <div id="error" style="display:none;background:rgba(239,68,68,.12);border:1px solid ${COLORS.danger};color:${COLORS.danger};padding:10px;border-radius:6px;margin-bottom:16px;font-size:13px;"></div>
        <form id="loginForm">
          <div class="form-group"><label>Email</label><input type="email" id="email" required autofocus></div>
          <div class="form-group"><label>Password</label><input type="password" id="password" required></div>
          <button type="submit" class="btn btn-primary" style="width:100%;padding:12px;font-size:15px;">Sign In</button>
        </form>
      </div>
      <script>
        if (getToken()) window.location.href = '/admin/dashboard';
        document.getElementById('loginForm').addEventListener('submit', async e => {
          e.preventDefault();
          const errEl = document.getElementById('error');
          errEl.style.display = 'none';
          try {
            const res = await fetch('/api/v1/super/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: document.getElementById('email').value, password: document.getElementById('password').value })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Login failed');
            setToken(data.token);
            window.location.href = '/admin/dashboard';
          } catch (err) {
            errEl.textContent = err.message;
            errEl.style.display = 'block';
          }
        });
      </script>
    `, 'login');
    return reply.type('text/html').send(html);
  });

  // ── 2. Dashboard Overview ──────────────────────────────────────────────────

  fastify.get('/admin/dashboard', async (_req, reply) => {
    const html = renderPage('Dashboard', `
      <div class="stats-grid" id="statsGrid">
        <div class="stat-card"><div class="label">Total Gyms</div><div class="value" id="statGyms">—</div></div>
        <div class="stat-card"><div class="label">Total Members</div><div class="value" id="statMembers">—</div></div>
        <div class="stat-card"><div class="label">Active Pods</div><div class="value" id="statPods">—</div></div>
        <div class="stat-card"><div class="label">DAU (Today)</div><div class="value" id="statDau">—</div></div>
        <div class="stat-card"><div class="label">Pod Members</div><div class="value" id="statPodMembers">—</div></div>
      </div>
      <h3 style="margin-bottom:16px;">Quick Links</h3>
      <div class="quick-links">
        <a href="/admin/members" class="quick-link">&#9733; Members</a>
        <a href="/admin/pods" class="quick-link">&#11044; Pods</a>
        <a href="/admin/notifications" class="quick-link">&#9993; Push Notifications</a>
        <a href="/admin/updates" class="quick-link">&#8679; OTA Updates</a>
      </div>
      <script>
        requireAuth();
        (async () => {
          const stats = await api('/super/stats');
          if (stats) {
            document.getElementById('statGyms').textContent = stats.totalGyms ?? stats.total_gyms ?? '—';
            document.getElementById('statMembers').textContent = stats.totalMembers ?? stats.total_members ?? '—';
          }
          const extra = await api('/super/admin-extra-stats');
          if (extra) {
            document.getElementById('statPods').textContent = extra.activePods ?? '—';
            document.getElementById('statDau').textContent = extra.dau ?? '—';
            document.getElementById('statPodMembers').textContent = extra.podMembers ?? '—';
          }
        })();
      </script>
    `, 'dashboard');
    return reply.type('text/html').send(html);
  });

  // Internal API: extra stats for the dashboard
  fastify.get('/api/v1/super/admin-extra-stats', async (request, reply) => {
    const token = request.headers.authorization?.replace('Bearer ', '');
    if (!token) return reply.code(401).send({ error: 'Unauthorized' });
    try {
      const [pods, dau, podMembers] = await Promise.all([
        db('pods').where('is_active', true).count('* as count').first(),
        db('checkins').whereRaw("DATE(checked_in_at) = CURRENT_DATE").countDistinct('member_id as count').first(),
        db('pod_members').countDistinct('member_id as count').first(),
      ]);
      return {
        activePods: Number(pods?.count ?? 0),
        dau: Number(dau?.count ?? 0),
        podMembers: Number(podMembers?.count ?? 0),
      };
    } catch (err) {
      fastify.log.error(err);
      return { activePods: 0, dau: 0, podMembers: 0 };
    }
  });

  // ── 3. Members Page ────────────────────────────────────────────────────────

  fastify.get('/admin/members', async (_req, reply) => {
    const html = renderPage('Members', `
      <div class="search-bar">
        <input type="text" id="search" placeholder="Search by name, email or phone..." oninput="debounce(loadMembers)">
      </div>
      <div id="tableWrap"></div>
      <div class="pagination" id="pagination"></div>
      <script>
        requireAuth();
        let currentPage = 1;
        const limit = 20;

        async function loadMembers() {
          const q = document.getElementById('search').value;
          const data = await api('/super/admin-members?page=' + currentPage + '&limit=' + limit + '&search=' + encodeURIComponent(q));
          if (!data) return;
          const rows = (data.members || []).map(m =>
            '<tr>' +
            '<td>' + (m.name || '—') + '</td>' +
            '<td>' + (m.email || '—') + '</td>' +
            '<td>' + (m.gym_name || '—') + '</td>' +
            '<td>' + formatDate(m.created_at) + '</td>' +
            '<td><span class="badge ' + (m.status === 'suspended' ? 'badge-suspended' : 'badge-active') + '">' + (m.status || 'active') + '</span></td>' +
            '<td><button class="btn btn-sm btn-primary" onclick="viewMember(\\'' + m.id + '\\')">View</button></td>' +
            '</tr>'
          ).join('');
          document.getElementById('tableWrap').innerHTML = rows.length ?
            '<table><thead><tr><th>Name</th><th>Email</th><th>Gym</th><th>Joined</th><th>Status</th><th>Actions</th></tr></thead><tbody>' + rows + '</tbody></table>' :
            '<div class="empty">No members found</div>';
          // Pagination
          const total = data.total || 0;
          const pages = Math.ceil(total / limit);
          let phtml = '';
          for (let i = 1; i <= Math.min(pages, 10); i++) {
            phtml += '<button class="' + (i === currentPage ? 'active' : '') + '" onclick="goPage(' + i + ')">' + i + '</button>';
          }
          document.getElementById('pagination').innerHTML = phtml;
        }

        function goPage(p) { currentPage = p; loadMembers(); }
        function viewMember(id) { alert('Member ID: ' + id + '\\nFull profile view coming soon.'); }
        loadMembers();
      </script>
    `, 'members');
    return reply.type('text/html').send(html);
  });

  // Internal API: members list
  fastify.get('/api/v1/super/admin-members', async (request, reply) => {
    const token = request.headers.authorization?.replace('Bearer ', '');
    if (!token) return reply.code(401).send({ error: 'Unauthorized' });
    const { page = 1, limit = 20, search = '' } = request.query;
    const offset = (Math.max(1, Number(page)) - 1) * Number(limit);
    try {
      let query = db('members as m')
        .leftJoin('gyms as g', 'm.gym_id', 'g.id')
        .select('m.*', 'g.gym_name as gym_name');
      let countQuery = db('members as m');
      if (search) {
        const term = `%${search}%`;
        query = query.where(function () {
          this.where('m.name', 'ilike', term).orWhere('m.email', 'ilike', term).orWhere('m.phone', 'ilike', term);
        });
        countQuery = countQuery.where(function () {
          this.where('m.name', 'ilike', term).orWhere('m.email', 'ilike', term).orWhere('m.phone', 'ilike', term);
        });
      }
      const [members, totalRow] = await Promise.all([
        query.orderBy('m.created_at', 'desc').limit(Number(limit)).offset(offset),
        countQuery.count('* as count').first(),
      ]);
      return { members, total: Number(totalRow?.count ?? 0) };
    } catch (err) {
      fastify.log.error(err);
      return { members: [], total: 0 };
    }
  });

  // ── 4. Pods Page ───────────────────────────────────────────────────────────

  fastify.get('/admin/pods', async (_req, reply) => {
    const html = renderPage('Pods', `
      <div class="filter-row">
        <input type="text" id="podSearch" placeholder="Search pod name..." style="max-width:260px;" oninput="debounce(loadPods)">
        <select id="goalFilter" onchange="loadPods()"><option value="">All Goals</option></select>
        <select id="tierFilter" onchange="loadPods()"><option value="">All Tiers</option></select>
      </div>
      <div id="podsTable"></div>
      <script>
        requireAuth();
        async function loadPods() {
          const search = document.getElementById('podSearch').value;
          const goal = document.getElementById('goalFilter').value;
          const tier = document.getElementById('tierFilter').value;
          const data = await api('/super/admin-pods?search=' + encodeURIComponent(search) + '&goal=' + encodeURIComponent(goal) + '&tier=' + encodeURIComponent(tier));
          if (!data) return;
          // Populate filter dropdowns if empty
          if (document.getElementById('goalFilter').options.length <= 1 && data.filters) {
            (data.filters.goals || []).forEach(g => {
              const o = document.createElement('option'); o.value = g; o.textContent = g;
              document.getElementById('goalFilter').appendChild(o);
            });
            (data.filters.tiers || []).forEach(t => {
              const o = document.createElement('option'); o.value = t; o.textContent = t;
              document.getElementById('tierFilter').appendChild(o);
            });
          }
          const rows = (data.pods || []).map(p =>
            '<tr>' +
            '<td>' + (p.name || '—') + '</td>' +
            '<td>' + (p.gym_name || '—') + '</td>' +
            '<td>' + (p.goal_type || '—') + '</td>' +
            '<td>' + (p.member_count || 0) + '</td>' +
            '<td>' + (p.health_score != null ? p.health_score : '—') + '</td>' +
            '<td>' + (p.tier || '—') + '</td>' +
            '<td>' + formatDate(p.created_at) + '</td>' +
            '</tr>'
          ).join('');
          document.getElementById('podsTable').innerHTML = rows.length ?
            '<table><thead><tr><th>Name</th><th>Gym</th><th>Goal</th><th>Members</th><th>Health</th><th>Tier</th><th>Created</th></tr></thead><tbody>' + rows + '</tbody></table>' :
            '<div class="empty">No pods found</div>';
        }
        loadPods();
      </script>
    `, 'pods');
    return reply.type('text/html').send(html);
  });

  // Internal API: pods list
  fastify.get('/api/v1/super/admin-pods', async (request, reply) => {
    const token = request.headers.authorization?.replace('Bearer ', '');
    if (!token) return reply.code(401).send({ error: 'Unauthorized' });
    const { search = '', goal = '', tier = '' } = request.query;
    try {
      let query = db('pods as p')
        .leftJoin('gyms as g', 'p.gym_id', 'g.id')
        .leftJoin('pod_members as pm', 'p.id', 'pm.pod_id')
        .select('p.*', 'g.gym_name as gym_name')
        .count('pm.id as member_count')
        .where('p.is_active', true)
        .groupBy('p.id', 'g.gym_name')
        .orderBy('p.created_at', 'desc');
      if (search) query = query.where('p.name', 'ilike', `%${search}%`);
      if (goal) query = query.where('p.goal_type', goal);
      if (tier) query = query.where('p.tier', tier);
      const pods = await query.limit(100);
      // Get distinct filter values
      const [goals, tiers] = await Promise.all([
        db('pods').where('is_active', true).distinct('goal_type').pluck('goal_type'),
        db('pods').where('is_active', true).distinct('tier').pluck('tier'),
      ]);
      return { pods, filters: { goals: goals.filter(Boolean), tiers: tiers.filter(Boolean) } };
    } catch (err) {
      fastify.log.error(err);
      return { pods: [], filters: { goals: [], tiers: [] } };
    }
  });

  // ── 5. Notifications Page ──────────────────────────────────────────────────

  fastify.get('/admin/notifications', async (_req, reply) => {
    const html = renderPage('Push Notifications', `
      <div class="notification-form">
        <h3 style="margin-bottom:16px;">Send Push Notification</h3>
        <div class="form-group">
          <label>Target</label>
          <select id="target" onchange="onTargetChange()">
            <option value="all">All Users</option>
            <option value="gym">Specific Gym</option>
            <option value="pod">Specific Pod</option>
            <option value="individual">Individual Member</option>
          </select>
        </div>
        <div class="form-group" id="gymSelectWrap" style="display:none;">
          <label>Gym</label><select id="gymSelect"><option value="">Loading...</option></select>
        </div>
        <div class="form-group" id="podSelectWrap" style="display:none;">
          <label>Pod</label><select id="podSelect"><option value="">Loading...</option></select>
        </div>
        <div class="form-group" id="memberSearchWrap" style="display:none;">
          <label>Member Email</label><input type="email" id="memberEmail" placeholder="member@example.com">
        </div>
        <div class="form-group"><label>Title</label><input type="text" id="notifTitle" placeholder="Notification title" maxlength="100"></div>
        <div class="form-group"><label>Body</label><textarea id="notifBody" rows="3" placeholder="Notification message..."></textarea></div>
        <button class="btn btn-primary" onclick="sendNotification()" id="sendBtn">Send Push</button>
        <div id="sendResult" style="margin-top:12px;font-size:13px;"></div>
      </div>
      <h3 style="margin-bottom:16px;">Recent Notifications</h3>
      <div id="notifLog"></div>
      <script>
        requireAuth();
        let gymsLoaded = false;
        async function onTargetChange() {
          const t = document.getElementById('target').value;
          document.getElementById('gymSelectWrap').style.display = t === 'gym' ? 'block' : 'none';
          document.getElementById('podSelectWrap').style.display = t === 'pod' ? 'block' : 'none';
          document.getElementById('memberSearchWrap').style.display = t === 'individual' ? 'block' : 'none';
          if ((t === 'gym' || t === 'pod') && !gymsLoaded) {
            const data = await api('/super/gyms?limit=200');
            if (data && data.gyms) {
              const sel = document.getElementById('gymSelect');
              sel.innerHTML = '<option value="">Select gym</option>' + data.gyms.map(g => '<option value="' + g.id + '">' + (g.gym_name || g.name) + '</option>').join('');
              gymsLoaded = true;
            }
          }
          if (t === 'pod') {
            const podData = await api('/super/admin-pods');
            if (podData && podData.pods) {
              const sel = document.getElementById('podSelect');
              sel.innerHTML = '<option value="">Select pod</option>' + podData.pods.map(p => '<option value="' + p.id + '">' + p.name + '</option>').join('');
            }
          }
        }
        async function sendNotification() {
          const target = document.getElementById('target').value;
          const title = document.getElementById('notifTitle').value.trim();
          const body = document.getElementById('notifBody').value.trim();
          if (!title || !body) { document.getElementById('sendResult').innerHTML = '<span style="color:${COLORS.danger}">Title and body required</span>'; return; }
          const payload = { target, title, body };
          if (target === 'gym') payload.gymId = document.getElementById('gymSelect').value;
          if (target === 'pod') payload.podId = document.getElementById('podSelect').value;
          if (target === 'individual') payload.email = document.getElementById('memberEmail').value;
          document.getElementById('sendBtn').disabled = true;
          const res = await api('/super/admin-notify', { method: 'POST', body: JSON.stringify(payload) });
          document.getElementById('sendBtn').disabled = false;
          document.getElementById('sendResult').innerHTML = res && res.success
            ? '<span style="color:${COLORS.success}">Sent successfully (' + (res.count || 0) + ' recipients)</span>'
            : '<span style="color:${COLORS.danger}">' + (res?.error || 'Failed to send') + '</span>';
          loadNotifLog();
        }
        async function loadNotifLog() {
          const data = await api('/super/admin-notify-log');
          if (!data || !data.notifications || !data.notifications.length) {
            document.getElementById('notifLog').innerHTML = '<div class="empty">No notifications sent yet</div>';
            return;
          }
          const rows = data.notifications.map(n =>
            '<tr><td>' + (n.title || '') + '</td><td>' + (n.target || '') + '</td><td>' + (n.recipient_count || 0) + '</td><td>' + formatDate(n.created_at) + '</td></tr>'
          ).join('');
          document.getElementById('notifLog').innerHTML =
            '<table><thead><tr><th>Title</th><th>Target</th><th>Recipients</th><th>Sent</th></tr></thead><tbody>' + rows + '</tbody></table>';
        }
        loadNotifLog();
      </script>
    `, 'notifications');
    return reply.type('text/html').send(html);
  });

  // Internal API: send notification (stores log)
  fastify.post('/api/v1/super/admin-notify', async (request, reply) => {
    const token = request.headers.authorization?.replace('Bearer ', '');
    if (!token) return reply.code(401).send({ error: 'Unauthorized' });
    const { target, title, body, gymId, podId, email } = request.body || {};
    if (!title || !body) return reply.code(400).send({ error: 'Title and body required' });
    try {
      // Log the notification
      await db('admin_notification_log').insert({
        title,
        body,
        target,
        target_id: gymId || podId || email || null,
        recipient_count: 0,
        created_at: new Date(),
      }).catch(() => {
        // Table may not exist yet — create it on the fly
        return db.schema.hasTable('admin_notification_log').then(exists => {
          if (!exists) {
            return db.schema.createTable('admin_notification_log', t => {
              t.increments('id').primary();
              t.string('title');
              t.text('body');
              t.string('target');
              t.string('target_id');
              t.integer('recipient_count').defaultTo(0);
              t.timestamp('created_at').defaultTo(db.fn.now());
            }).then(() => db('admin_notification_log').insert({ title, body, target, target_id: gymId || podId || email || null, recipient_count: 0, created_at: new Date() }));
          }
        });
      });
      return { success: true, count: 0, message: 'Notification logged. Push delivery integration pending.' };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to send notification' });
    }
  });

  // Internal API: notification log
  fastify.get('/api/v1/super/admin-notify-log', async (request, reply) => {
    const token = request.headers.authorization?.replace('Bearer ', '');
    if (!token) return reply.code(401).send({ error: 'Unauthorized' });
    try {
      const exists = await db.schema.hasTable('admin_notification_log');
      if (!exists) return { notifications: [] };
      const notifications = await db('admin_notification_log').orderBy('created_at', 'desc').limit(50);
      return { notifications };
    } catch (err) {
      fastify.log.error(err);
      return { notifications: [] };
    }
  });

  // ── 6. Updates Page ────────────────────────────────────────────────────────

  fastify.get('/admin/updates', async (_req, reply) => {
    const html = renderPage('OTA Updates', `
      <div class="notification-form">
        <h3 style="margin-bottom:16px;">Log New Update</h3>
        <div class="form-group"><label>Version</label><input type="text" id="version" placeholder="e.g. 2.4.1"></div>
        <div class="form-group"><label>Platform</label>
          <select id="platform"><option value="all">All</option><option value="ios">iOS</option><option value="android">Android</option></select>
        </div>
        <div class="form-group"><label>Changelog</label><textarea id="changelog" rows="4" placeholder="What changed in this release..."></textarea></div>
        <button class="btn btn-primary" onclick="logUpdate()">Log Update</button>
        <div id="updateResult" style="margin-top:12px;font-size:13px;"></div>
      </div>
      <h3 style="margin-bottom:16px;">Update History</h3>
      <div id="updatesTable"></div>
      <script>
        requireAuth();
        async function logUpdate() {
          const version = document.getElementById('version').value.trim();
          const platform = document.getElementById('platform').value;
          const changelog = document.getElementById('changelog').value.trim();
          if (!version || !changelog) { document.getElementById('updateResult').innerHTML = '<span style="color:${COLORS.danger}">Version and changelog required</span>'; return; }
          const res = await api('/super/admin-updates', { method: 'POST', body: JSON.stringify({ version, platform, changelog }) });
          document.getElementById('updateResult').innerHTML = res && res.success
            ? '<span style="color:${COLORS.success}">Update logged</span>' : '<span style="color:${COLORS.danger}">' + (res?.error || 'Failed') + '</span>';
          document.getElementById('version').value = '';
          document.getElementById('changelog').value = '';
          loadUpdates();
        }
        async function loadUpdates() {
          const data = await api('/super/admin-updates');
          if (!data || !data.updates || !data.updates.length) {
            document.getElementById('updatesTable').innerHTML = '<div class="empty">No updates logged yet</div>';
            return;
          }
          const rows = data.updates.map(u =>
            '<tr><td><strong>' + u.version + '</strong></td><td>' + (u.platform || 'all') + '</td><td style="white-space:pre-wrap;max-width:400px;">' + u.changelog + '</td><td>' + formatDate(u.created_at) + '</td></tr>'
          ).join('');
          document.getElementById('updatesTable').innerHTML =
            '<table><thead><tr><th>Version</th><th>Platform</th><th>Changelog</th><th>Date</th></tr></thead><tbody>' + rows + '</tbody></table>';
        }
        loadUpdates();
      </script>
    `, 'updates');
    return reply.type('text/html').send(html);
  });

  // Internal API: updates CRUD
  fastify.get('/api/v1/super/admin-updates', async (request, reply) => {
    const token = request.headers.authorization?.replace('Bearer ', '');
    if (!token) return reply.code(401).send({ error: 'Unauthorized' });
    try {
      const exists = await db.schema.hasTable('admin_ota_updates');
      if (!exists) return { updates: [] };
      const updates = await db('admin_ota_updates').orderBy('created_at', 'desc').limit(50);
      return { updates };
    } catch (err) {
      fastify.log.error(err);
      return { updates: [] };
    }
  });

  fastify.post('/api/v1/super/admin-updates', async (request, reply) => {
    const token = request.headers.authorization?.replace('Bearer ', '');
    if (!token) return reply.code(401).send({ error: 'Unauthorized' });
    const { version, platform, changelog } = request.body || {};
    if (!version || !changelog) return reply.code(400).send({ error: 'Version and changelog required' });
    try {
      await db.schema.hasTable('admin_ota_updates').then(exists => {
        if (!exists) {
          return db.schema.createTable('admin_ota_updates', t => {
            t.increments('id').primary();
            t.string('version');
            t.string('platform').defaultTo('all');
            t.text('changelog');
            t.timestamp('created_at').defaultTo(db.fn.now());
          });
        }
      });
      await db('admin_ota_updates').insert({ version, platform: platform || 'all', changelog, created_at: new Date() });
      return { success: true };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to log update' });
    }
  });
}
