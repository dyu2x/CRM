import express from 'express';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { paginateRecords, buildFinancialReconciliation } from './src/utils/serverData.mjs';

const { Pool } = pg;
const app = express();
const port = Number(process.env.PORT || 3000);
const pool = new Pool({
  host: process.env.PGHOST || 'db',
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE || process.env.POSTGRES_DB || 'mesina_crm',
  user: process.env.PGUSER || process.env.POSTGRES_USER || 'crm_user',
  password: process.env.PGPASSWORD ?? process.env.POSTGRES_PASSWORD,
  max: 15,
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
});
const secret = process.env.JWT_SECRET;
if (!secret || secret.length < 32 || secret.startsWith('CHANGE_ME')) throw new Error('Set a unique JWT_SECRET of at least 32 characters in .env.');
if (!process.env.POSTGRES_PASSWORD || process.env.POSTGRES_PASSWORD.startsWith('CHANGE_ME')) throw new Error('Set a unique POSTGRES_PASSWORD in .env before startup.');
app.disable('x-powered-by');
app.use((req,res,next)=>{ res.setHeader('X-Content-Type-Options','nosniff'); res.setHeader('X-Frame-Options','DENY'); res.setHeader('Referrer-Policy','strict-origin-when-cross-origin'); res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()'); res.setHeader('Content-Security-Policy', "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self'; upgrade-insecure-requests"); next(); });
app.use(express.json({ limit: '25mb' }));

const tableKeys = ['branding','agents','marketPrices','farmRegistries','contactPeople','opportunities','orders','followUpOrders','invoices','deliveries','revenues','histories','opportunityStatuses','followUpStatuses','followUpMethods','deliveryStatuses','paymentStatuses','paymentMethods','orderStatuses','rolePermissions','overviewVisibility','onlineInquiries','onlineInquirySources'];
const tabToState = { dashboard: null, opportunities:'opportunities', orders:'orders', follow_up_orders:'followUpOrders', invoices:'invoices', deliveries:'deliveries', revenues:'revenues', farm_registries:'farmRegistries', contact_people:'contactPeople', agents:'agents', catalog:'marketPrices', histories:'histories', status_tables:['opportunityStatuses','followUpStatuses','followUpMethods','deliveryStatuses','paymentStatuses','paymentMethods'], online_inquiry:'onlineInquiries', online_inquiry_sources:'onlineInquirySources' };
const defaultPermissions = {
  Admin: Object.keys(tabToState),
  'Sales Agent':['dashboard','opportunities','orders','follow_up_orders','farm_registries','contact_people','catalog','online_inquiry'],
  Manager:['dashboard','agents'],
  'Booking Agent':['dashboard','opportunities','orders','follow_up_orders','farm_registries','contact_people','catalog','online_inquiry'],
  'Delivery Agent':['dashboard','orders','deliveries','farm_registries','contact_people'],
};
async function init() {
  // Keep branding fields queryable on databases created by earlier v2.05 builds.
  await pool.query(`ALTER TABLE crm_branding ADD COLUMN IF NOT EXISTS login_heading varchar(255), ADD COLUMN IF NOT EXISTS login_description text, ADD COLUMN IF NOT EXISTS login_footer varchar(255), ADD COLUMN IF NOT EXISTS login_background_image text, ADD COLUMN IF NOT EXISTS table_icon_config jsonb NOT NULL DEFAULT '{}'::jsonb`);
  await pool.query(`SELECT 1 FROM crm_state, crm_state_records, crm_branding, roles, agents, crm_sessions, auth_login_attempts, crm_audit_events, market_price, opportunity_statuses, fu_orders_statuses, fu_orders_method, delivery_statuses, payment_statuses, paymemt_methods, farm_registries, contact_people, opportunities, online_inquiry_sources, online_inquiry, orders, follow_up_orders, invoices, deliveries, revenues, histories, employees, attendance, obligations_list, obligations, farm_maintenance_list, farm_maintenance, extra_expenses LIMIT 0`);
  // Add the percentage column safely for existing PostgreSQL installations. Fresh installs already include it in the single schema script.
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (discount_percent >= 0 AND discount_percent <= 100)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS crm_backup_exports (export_id VARCHAR(36) PRIMARY KEY, admin_agent_id INTEGER NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), downloaded_at TIMESTAMPTZ, consumed_at TIMESTAMPTZ)`);
  await pool.query("DELETE FROM auth_login_attempts WHERE window_started_at < now()-interval '2 days'");
  const adminCheck = await pool.query("SELECT agent_id FROM agents WHERE username='admin'");
  if (!adminCheck.rowCount) {
    const initialPassword = String(process.env.ADMIN_INITIAL_PASSWORD || '');
    if (initialPassword.length < 12 || initialPassword.startsWith('CHANGE_ME')) throw new Error('Set ADMIN_INITIAL_PASSWORD to a unique password of at least 12 characters before first startup.');
    await pool.query(`INSERT INTO agents (name,email,status,role,username,password,date_started) VALUES ($1,$2,'Active','Admin','admin',$3,now())`, ['Administrator', 'admin@localhost', await bcrypt.hash(initialPassword, 12)]);
  }
  // Reconcile roles saved in the CRM document with the dedicated account table.
  const savedState = await pool.query('SELECT state FROM crm_state WHERE id=1');
  // One-time and ongoing reconciliation: migrate the currently saved CRM
  // document into real PostgreSQL tables on startup, including existing data.
  if (savedState.rows[0]?.state) {
    const syncClient = await pool.connect();
    try {
      await syncClient.query('BEGIN');
      await syncRelationalCollections(syncClient, savedState.rows[0].state);
      await syncClient.query('COMMIT');
    } catch (error) {
      await syncClient.query('ROLLBACK');
      throw error;
    } finally { syncClient.release(); }
  }
  const savedRoleNames = Object.keys(savedState.rows[0]?.state?.rolePermissions || {});
  // Ensure reserved baseline roles exist in the normalized roles table too.
  if (!savedRoleNames.some((name) => name.toLowerCase() === 'agent')) savedRoleNames.push('Agent');
  for (const roleName of savedRoleNames) {
    const cleanName = String(roleName).trim();
    if (cleanName) await pool.query('INSERT INTO roles(name) VALUES($1) ON CONFLICT(name) DO NOTHING',[cleanName]);
  }
  const savedAgents = savedState.rows[0]?.state?.agents;
  if (Array.isArray(savedAgents)) {
    for (const agent of savedAgents) {
      if (!agent.agent_id || !agent.username || !agent.name || !agent.role) continue;
      const existingAgent = await pool.query('SELECT agent_id,password FROM agents WHERE agent_id=$1 OR lower(username)=lower($2) LIMIT 1',[agent.agent_id,agent.username]);
      if (existingAgent.rowCount) {
        await pool.query(`UPDATE agents SET name=$1,address=$2,phone=$3,email=$4,status=$5,role=$6,username=$7,
          password=CASE WHEN $8<>'' THEN $8 ELSE password END,date_started=$9,avatar_url=COALESCE($10,avatar_url)
          WHERE agent_id=$11`,[agent.name,agent.address||null,agent.phone||null,agent.email||null,agent.status||'Active',agent.role,agent.username,agent.password||'',agent.date_started||new Date().toISOString(),agent.avatar_url||null,existingAgent.rows[0].agent_id]);
      } else if (agent.password) {
        await pool.query(`INSERT INTO agents(agent_id,name,address,phone,email,status,role,username,password,date_started,avatar_url)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,[agent.agent_id,agent.name,agent.address||null,agent.phone||null,agent.email||null,agent.status||'Active',agent.role,agent.username,agent.password,agent.date_started||new Date().toISOString(),agent.avatar_url||null]);
      }
    }
    await pool.query(`SELECT setval(pg_get_serial_sequence('agents','agent_id')::regclass,
      GREATEST(COALESCE((SELECT MAX(agent_id) FROM agents WHERE agent_id < 1000000000000),1),1),true)`);
  }
}
async function signToken(agent) {
  const jti = crypto.randomUUID();
  const exp = Math.floor(Date.now()/1000)+60*60*12;
  const payload = Buffer.from(JSON.stringify({ sub: agent.agent_id, role: agent.role, jti, exp })).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  await pool.query('INSERT INTO crm_sessions(token_id,agent_id,expires_at) VALUES($1,$2,to_timestamp($3))',[jti,agent.agent_id,exp]);
  return `${payload}.${sig}`;
}
async function auth(req,res,next) {
  try {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i,'');
    const [payload,sig] = token.split('.');
    if (!payload || !sig) return res.status(401).json({error:'Authentication required'});
    const expected = crypto.createHmac('sha256',secret).update(payload).digest();
    const actual = Buffer.from(sig,'base64url');
    if (actual.length !== expected.length || !crypto.timingSafeEqual(actual,expected)) return res.status(401).json({error:'Invalid session'});
    const data = JSON.parse(Buffer.from(payload,'base64url').toString());
    if (data.exp < Date.now()/1000) return res.status(401).json({error:'Session expired'});
    const session = await pool.query('SELECT 1 FROM crm_sessions WHERE token_id=$1 AND agent_id=$2 AND expires_at>now()',[data.jti,data.sub]);
    if (!session.rowCount) return res.status(401).json({error:'Session expired or revoked'});
    const { rows } = await pool.query('SELECT agent_id,name,role,username,status,email,phone,address,date_started,avatar_url FROM agents WHERE agent_id=$1 AND status=$2',[data.sub,'Active']);
    if (!rows[0]) return res.status(401).json({error:'Account unavailable'});
    req.user = rows[0]; req.token = token; next();
  } catch { return res.status(401).json({error:'Invalid session'}); }
}
async function getState() { const r=await pool.query('SELECT state FROM crm_state WHERE id=1'); return r.rows[0]?.state || null; }
const mirroredCollections = ['agents','marketPrices','farmRegistries','contactPeople','opportunities','orders','followUpOrders','invoices','deliveries','revenues','histories','opportunityStatuses','followUpStatuses','followUpMethods','deliveryStatuses','paymentStatuses','paymentMethods','orderStatuses','onlineInquiries','onlineInquirySources'];
async function refreshStateRecordMirror(client, state) {
  await client.query('DELETE FROM crm_state_records');
  for (const key of mirroredCollections) {
    const rows = Array.isArray(state?.[key]) ? state[key] : [];
    for (let i=0; i<rows.length; i++) {
      const row = rows[i] || {};
      const idField = Object.keys(row).find(k => /(^id$|_id$)/i.test(k));
      const recordKey = String(idField && row[idField] != null ? row[idField] : i+1);
      await client.query('INSERT INTO crm_state_records(table_name,record_key,data) VALUES($1,$2,$3::jsonb)', [key,recordKey,JSON.stringify(row)]);
    }
  }
}


// Persist the JSON state snapshot into the normalized PostgreSQL tables as well.
// The CRM UI still uses its state document, but pgAdmin users can inspect and
// query the same records in the corresponding relational tables.
const relationalCollections = [
  { key:'branding', table:'crm_branding', pk:'id', object:true, fields:{ id:'id', company_name:'company_name', company_logo:'company_logo', tagline:'tagline', subtitle:'subtitle', login_heading:'login_heading', login_description:'login_description', login_footer:'login_footer', login_background_image:'login_background_image', favicon:'favicon', table_icon_config:'table_icon_config', updated_at:'updated_at' }, json:['table_icon_config'] },
  { key:'marketPrices', table:'market_price', pk:'market_price_id', id:'market_price_id', fields:{ market_price_id:'market_price_id', name:'name', description:'description', price:'price', unit:'unit', notes:'notes' } },
  { key:'farmRegistries', table:'farm_registries', pk:'farm_id', id:'farm_id', fields:{ farm_id:'farm_id', farm_name:'farm_name', farm_address:'farm_address', coordinates_lat_lng:'coordinates_lat_lng', designated_point_person:'designated_point_person', farm_phone:'farm_phone', farm_email:'farm_email', date_created:'date_created', assigned_agent:'assigned_agent' } },
  { key:'contactPeople', table:'contact_people', pk:'contact_id', id:'contact_id', fields:{ contact_id:'contact_id', contact_person_name:'contact_person_name', farm_name:'farm_name', is_point_person:'is_point_person', phone_number:'phone_number', email_address:'email_address', address:'address', is_active:'is_active', date_created:'date_created', assigned_agent:'assigned_agent' } },
  { key:'opportunities', table:'opportunities', pk:'opportunity_id', id:'opportunity_id', fields:{ opportunity_id:'opportunity_id', contact_id:'contact_id', contact_person:'contact_person', phone:'phone', fish_category:'fish_category', quantity:'quantity', status:'status', contacted_by:'contacted_by', source:'source', date_created:'date_created', notes:'notes' } },
  { key:'orders', table:'orders', pk:'order_id', id:'order_id', fields:{ order_id:'order_id', opportunity_id:'opportunity_id', farm_name:'farm_name', contact_person:'contact_person', fish_category:'fish_category', quantity:'quantity', price:'price', price_unit:'price_unit', discount:'discount', discount_percent:'discount_percent', discount_enabled:'discount_enabled', total_price:'total_price', order_date:'order_date', delivery_date:'delivery_date', status:'status', booking_agent:'booking_agent', notes:'notes' } },
  { key:'followUpOrders', table:'follow_up_orders', pk:'follow_up_orders_id', id:'follow_up_orders_id', fields:{ follow_up_orders_id:'follow_up_orders_id', order_id:'order_id', opportunity_id:'opportunity_id', farm_name:'farm_name', contact_person_name:'contact_person_name', contact_number:'contact_number', contact_email:'contact_email', date_of_inquiry:'date_of_inquiry', fish_category:'fish_category', quantity:'quantity', status:'status', verified_up_by:'verified_up_by', delivery_date:'delivery_date', landmarks:'landmarks', notes:'notes' } },
  { key:'invoices', table:'invoices', pk:'invoice_id', id:'invoice_id', fields:{ invoice_id:'invoice_id', follow_up_orders_id:'follow_up_orders_id', order_id:'order_id', official_receipt_id:'official_receipt_id', farm_name:'farm_name', contact_person_name:'contact_person_name', fish_category:'fish_category', quantity:'quantity', item_price_per_piece:'item_price_per_piece', item_unit:'item_unit', subtotal:'subtotal', discount:'discount', discount_enabled:'discount_enabled', pricing_snapshot:'pricing_snapshot', total_price:'total_price', or_issued_by:'or_issued_by', payment_received_by:'payment_received_by', payment_method:'payment_method', payment_status:'payment_status', date_created:'date_created', delivery_date:'delivery_date', notes:'notes' }, json:['pricing_snapshot'] },
  { key:'deliveries', table:'deliveries', pk:'delivery_id', id:'delivery_id', fields:{ delivery_id:'delivery_id', invoice_id:'invoice_id', farm_name:'farm_name', farm_address:'farm_address', farm_phone:'farm_phone', farm_gps_coordinates:'farm_gps_coordinates', delivered_by:'delivered_by', status:'status', payment_collected_by:'payment_collected_by', payment_method:'payment_method', payment_status:'payment_status', fulfillment_accepted_by:'fulfillment_accepted_by', landmarks:'landmarks', delivery_notes:'delivery_notes', date_created:'date_created', delivery_date:'delivery_date', delivered_date:'delivered_date' } },
  { key:'revenues', table:'revenues', pk:'revenue_id', id:'revenue_id', fields:{ revenue_id:'revenue_id', invoice_id:'invoice_id', delivery_id:'delivery_id', delivery_status:'delivery_status', payment_collected_by:'payment_collected_by', revenue_amount:'revenue_amount', payment_method:'payment_method', delivered_date:'delivered_date' } },
  { key:'histories', table:'histories', pk:'history_id', id:'history_id', fields:{ history_id:'history_id', table_name:'table_name', modified_field:'modified_field', old_value:'old_value', new_value:'new_value', action_type:'action_type', date_and_time:'date_and_time', modifying_agent:'modifying_agent' } },
  { key:'opportunityStatuses', table:'opportunity_statuses', pk:'opportunity_status_id', id:'id', fields:{ opportunity_status_id:'id', name:'name', description:'description' } },
  { key:'followUpStatuses', table:'fu_orders_statuses', pk:'fu_opportunities_status_id', id:'id', fields:{ fu_opportunities_status_id:'id', name:'name', description:'description' } },
  { key:'followUpMethods', table:'fu_orders_method', pk:'fu_orders_method_id', id:'id', fields:{ fu_orders_method_id:'id', name:'name', description:'description' } },
  { key:'deliveryStatuses', table:'delivery_statuses', pk:'delivery_status_id', id:'id', fields:{ delivery_status_id:'id', name:'name', description:'description' } },
  { key:'paymentStatuses', table:'payment_statuses', pk:'payment_status_id', id:'id', fields:{ payment_status_id:'id', name:'name', description:'description' } },
  { key:'paymentMethods', table:'paymemt_methods', pk:'payment_methods_id', id:'id', fields:{ payment_methods_id:'id', name:'name', description:'description' } },
  { key:'orderStatuses', table:'order_statuses', pk:'id', id:'id', fields:{ id:'id', name:'name', description:'description' } },
];
async function syncRelationalCollections(client, state) {
  // Parent/reference records are upserted first so FK-backed rows can follow.
  const priority = ['branding','marketPrices','opportunityStatuses','followUpStatuses','followUpMethods','deliveryStatuses','paymentStatuses','paymentMethods','orderStatuses','farmRegistries','contactPeople','opportunities','orders','followUpOrders','invoices','deliveries','revenues','histories'];
  const syncOrder = [...relationalCollections].sort((a,b) => priority.indexOf(a.key) - priority.indexOf(b.key));
  for (const cfg of syncOrder) {
    if (!Object.hasOwn(state || {}, cfg.key)) continue;
    const source = cfg.object ? (state[cfg.key] ? [state[cfg.key]] : []) : (Array.isArray(state[cfg.key]) ? state[cfg.key] : []);
    for (const row of source) {
      if (!row || typeof row !== 'object') continue;
      const normalizedRow = cfg.key === 'histories' ? { ...row, table_name:row.table_name || row.entry_table, modified_field:row.modified_field || row.field_name, modifying_agent:row.modifying_agent || row.modifiers_name } : row;
      const entries = Object.entries(cfg.fields).filter(([column, sourceKey]) => normalizedRow[sourceKey] !== undefined);
      if (!entries.length) continue;
      const columns = entries.map(([column]) => column);
      const values = entries.map(([column, sourceKey]) => cfg.json?.includes(column) ? JSON.stringify(normalizedRow[sourceKey] ?? {}) : normalizedRow[sourceKey]);
      const placeholders = entries.map(([column], i) => `$${i+1}${cfg.json?.includes(column) ? '::jsonb' : ''}`);
      const updates = columns.filter(column => column !== cfg.pk).map(column => `${column}=EXCLUDED.${column}`);
      const sql = `INSERT INTO ${cfg.table} (${columns.join(',')}) VALUES (${placeholders.join(',')}) ON CONFLICT (${cfg.pk}) DO ${updates.length ? `UPDATE SET ${updates.join(',')}` : 'NOTHING'}`;
      await client.query(sql, values);
    }
  }
  // Remove rows deleted in the CRM, in reverse FK dependency order.
  for (const cfg of [...syncOrder].reverse()) {
    if (!Object.hasOwn(state || {}, cfg.key)) continue;
    const source = cfg.object ? (state[cfg.key] ? [state[cfg.key]] : []) : (Array.isArray(state[cfg.key]) ? state[cfg.key] : []);
    const ids = source.map(row => Number(row?.[cfg.id || cfg.pk])).filter(Number.isSafeInteger);
    await client.query(`DELETE FROM ${cfg.table} WHERE NOT (${cfg.pk} = ANY($1::bigint[]))`, [ids]);
  }
  // Serial sequences must advance past IDs supplied by the browser state.
  for (const cfg of syncOrder) {
    if (!cfg.id || cfg.object) continue;
    const seq = await client.query('SELECT pg_get_serial_sequence($1,$2) AS seq', [cfg.table,cfg.pk]);
    if (seq.rows[0]?.seq) await client.query(`SELECT setval($1::regclass, GREATEST(COALESCE((SELECT MAX(${cfg.pk}) FROM ${cfg.table}),1),1), true)`, [seq.rows[0].seq]);
  }
}

async function writeAuditEvent(user, action, entity, changedKeys = [], recordCounts = {}) {
  await pool.query('INSERT INTO crm_audit_events(actor_agent_id,actor_name,action,entity,changed_keys,record_counts) VALUES($1,$2,$3,$4,$5::jsonb,$6::jsonb)', [user?.agent_id ?? null, user?.name || 'System', action, entity, JSON.stringify(changedKeys), JSON.stringify(recordCounts)]);
}
function normalizedRole(role) { return String(role || '').trim().toLowerCase(); }
function isAdminUser(user) { return normalizedRole(user?.role) === 'admin'; }
function isPrivilegedAgentRole(role) { return ['admin','manager'].includes(normalizedRole(role)); }
function isManagerUser(user) { return normalizedRole(user?.role) === 'manager'; }
function isAssignableRole(role,state) {
  if (isPrivilegedAgentRole(role)) return false;
  const configured = configuredRoleEntry(role,state);
  return configured.found;
}
function configuredRoleEntry(role,state) {
  const permissions = state?.rolePermissions;
  if (!permissions || typeof permissions !== 'object' || Array.isArray(permissions)) return { found:false, value:undefined };
  const key = Object.keys(permissions).find(name => normalizedRole(name) === normalizedRole(role));
  return key === undefined ? { found:false, value:undefined } : { found:true, value:permissions[key] };
}
function allowedTabs(user,state) {
  if (isAdminUser(user)) return Object.keys(tabToState);
  const configured = configuredRoleEntry(user?.role,state);
  if (configured.found) return Array.isArray(configured.value) ? configured.value.filter(value => typeof value === 'string') : [];
  const legacyKey = Object.keys(defaultPermissions).find(name => normalizedRole(name) === normalizedRole(user?.role));
  return legacyKey ? [...defaultPermissions[legacyKey]] : ['dashboard'];
}
const childStatusKeys = {
  opportunityStatuses:'status_tables:opportunityStatuses', followUpStatuses:'status_tables:followUpStatuses',
  followUpMethods:'status_tables:followUpMethods', deliveryStatuses:'status_tables:deliveryStatuses',
  paymentStatuses:'status_tables:paymentStatuses', paymentMethods:'status_tables:paymentMethods',
  orderStatuses:'status_tables:orderStatuses'
};
function canAccessKey(key,tabs,state,user,{write=false}={}) {
  if (isAdminUser(user)) return true;
  if (key === 'rolePermissions') return false;
  if (key === 'branding') return !write;
  if (key === 'overviewVisibility') return true;
  // Agent-account management is reserved for Admin and Manager, and still requires the Agents tab.
  if (key === 'agents' && write) return isManagerUser(user) && tabs.includes('agents');
  if (key in childStatusKeys) {
    const roleEntry = configuredRoleEntry(user?.role,state);
    const roleAccess = roleEntry.found && Array.isArray(roleEntry.value) ? roleEntry.value : tabs;
    const granular = roleAccess.some(value => value.startsWith('status_tables:'));
    return tabs.includes('status_tables') && (!granular || roleAccess.includes(childStatusKeys[key]));
  }
  const tab = Object.entries(tabToState).find(([,value]) => value === key)?.[0];
  // Fail closed: state keys without an explicit tab mapping are never exposed to non-admins.
  return Boolean(tab && tabs.includes(tab));
}
function requireTabPermission(tab) {
  return async (req,res,next) => {
    try {
      const state = await getState();
      const tabs = allowedTabs(req.user,state);
      if (!tabs.includes(tab)) return res.status(403).json({error:'You do not have permission to access this section.'});
      next();
    } catch (error) {
      console.error(`Permission check failed for ${tab}:`,error);
      res.status(500).json({error:'Unable to verify access permissions.'});
    }
  };
}

const expenseTables = {
  weekly_attendance: { table:'employees', fields:[] }, salaries: { table:'employees', fields:[] },
  employees: { table:'employees', fields:['name','address','birthdate','tin','work_location','role','is_active','hire_date','end_date','added_by_agent','hourly_rate'] },
  attendance: { table:'attendance', fields:['employee_id','time_in','time_out','notes','added_by_agent'] },
  obligations_list: { table:'obligations_list', fields:['name','description'] },
  obligations: { table:'obligations', fields:['name','cost','date','receipt','company','notes','status','added_by_agent'] },
  farm_maintenance: { table:'farm_maintenance', fields:['name','cost','date','receipt','company','status','notes','added_by_agent'] },
  farm_maintenance_list: { table:'farm_maintenance_list', fields:['name','description'] },
  extra_expenses: { table:'extra_expenses', fields:['name','cost','date','receipt','company','status','description','added_by_agent'] },
};
async function requireExpensePermission(req,res,next) {
  try {
    if (req.user?.role === 'Admin') return next();
    const state = await getState();
    const tabs = allowedTabs(req.user, state);
    if (!tabs.includes(req.params.kind)) return res.status(403).json({error:'You do not have permission to access this expenses table.'});
    next();
  } catch (e) { res.status(500).json({error:'Unable to verify expenses permissions'}); }
}
app.get('/api/expenses/:kind', auth, requireExpensePermission, async (req,res) => {
  const cfg=expenseTables[req.params.kind]; if(!cfg) return res.status(404).json({error:'Unknown expenses table'});
  try {
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    const requestedStart = String(req.query.startDate || '');
    const requestedEnd = String(req.query.endDate || '');
    if ((requestedStart && !datePattern.test(requestedStart)) || (requestedEnd && !datePattern.test(requestedEnd))) return res.status(400).json({error:'Dates must use YYYY-MM-DD format'});
    if (requestedStart && requestedEnd && requestedStart > requestedEnd) return res.status(400).json({error:'Start date must be on or before end date'});
    if(req.params.kind==='attendance') {
      const r=await pool.query(`SELECT a.id,a.employee_id,e.name AS employee_name,a.time_in,a.time_out,a.notes,a.added_by_agent,
        CASE WHEN a.time_out IS NULL THEN 0 ELSE ROUND((EXTRACT(EPOCH FROM (a.time_out-a.time_in))/3600)::numeric,2) END AS work_hours
        FROM attendance a JOIN employees e ON e.id=a.employee_id ORDER BY a.time_in DESC`);
      return res.json({rows:r.rows});
    }
    if(req.params.kind==='employees') {
      const r=await pool.query('SELECT * FROM employees ORDER BY id DESC'); return res.json({rows:r.rows});
    }
    if(req.params.kind==='weekly_attendance' || req.params.kind==='salaries') {
      const start = requestedStart || null, end = requestedEnd || null;
      const range = `a.time_in >= COALESCE($1::date, date_trunc('week',CURRENT_DATE)::date)
        AND a.time_in < COALESCE($2::date + interval '1 day', date_trunc('week',CURRENT_DATE)::date + interval '1 week')`;
      const select = req.params.kind==='salaries'
        ? `SELECT e.id AS employee_id,e.name,e.hourly_rate AS rate,
            COALESCE(ROUND(SUM(EXTRACT(EPOCH FROM (a.time_out-a.time_in))/3600)::numeric,2),0) AS total_hours,
            COALESCE(ROUND(e.hourly_rate*SUM(EXTRACT(EPOCH FROM (a.time_out-a.time_in))/3600)::numeric,2),0) AS salary`
        : `SELECT e.id AS employee_id,e.name AS employee_name,
            COALESCE(ROUND(SUM(EXTRACT(EPOCH FROM (a.time_out-a.time_in))/3600)::numeric,2),0) AS total_work_hours`;
      const r=await pool.query(`${select}
        FROM employees e LEFT JOIN attendance a ON a.employee_id=e.id AND a.time_out IS NOT NULL AND ${range}
        GROUP BY e.id,e.name${req.params.kind==='salaries'?',e.hourly_rate':''} ORDER BY e.name`,[start,end]);
      return res.json({rows:r.rows,startDate:start,endDate:end});
    }
    const r=await pool.query(`SELECT * FROM ${cfg.table} ORDER BY id DESC`); res.json({rows:r.rows});
  } catch(e) { res.status(500).json({error:e.message}); }
});
app.post('/api/expenses/:kind', auth, requireExpensePermission, async(req,res)=>{
  const cfg=expenseTables[req.params.kind]; if(!cfg) return res.status(404).json({error:'Unknown expenses table'});
  if(['weekly_attendance','salaries'].includes(req.params.kind)) return res.status(405).json({error:'This report is calculated automatically.'});
  const body=req.body||{}; const fields=cfg.fields.filter(k=>Object.hasOwn(body,k));
  if(!fields.length) return res.status(400).json({error:'No valid fields supplied'});
  try {
    const values=fields.map(k=>body[k]=== '' ? null : body[k]);
    const sql=`INSERT INTO ${cfg.table} (${fields.join(',')}) VALUES (${fields.map((_,i)=>'$'+(i+1)).join(',')}) RETURNING *`;
    const r=await pool.query(sql,values); await writeAuditEvent(req.user,'CREATE',`expenses:${req.params.kind}`,fields); res.status(201).json({row:r.rows[0]});
  } catch(e) { res.status(400).json({error:e.message}); }
});
app.put('/api/expenses/:kind/:id', auth, requireExpensePermission, async(req,res)=>{
  const cfg=expenseTables[req.params.kind]; if(!cfg) return res.status(404).json({error:'Unknown expenses table'});
  if(['weekly_attendance','salaries'].includes(req.params.kind)) return res.status(405).json({error:'This report is calculated automatically.'});
  const fields=cfg.fields.filter(k=>Object.hasOwn(req.body||{},k)); if(!fields.length) return res.status(400).json({error:'No valid fields supplied'});
  try { const vals=fields.map(k=>req.body[k]===''?null:req.body[k]); vals.push(Number(req.params.id));
    const r=await pool.query(`UPDATE ${cfg.table} SET ${fields.map((k,i)=>k+'=$'+(i+1)).join(',')} WHERE id=$${vals.length} RETURNING *`,vals);
    if(!r.rowCount) return res.status(404).json({error:'Record not found'}); await writeAuditEvent(req.user,'UPDATE',`expenses:${req.params.kind}`,fields); res.json({row:r.rows[0]});
  } catch(e) { res.status(400).json({error:e.message}); }
});
app.delete('/api/expenses/:kind/:id', auth, requireExpensePermission, async(req,res)=>{
  const cfg=expenseTables[req.params.kind]; if(!cfg) return res.status(404).json({error:'Unknown expenses table'});
  if(['weekly_attendance','salaries'].includes(req.params.kind)) return res.status(405).json({error:'This report is calculated automatically.'});
  try { const r=await pool.query(`DELETE FROM ${cfg.table} WHERE id=$1`,[Number(req.params.id)]); if(!r.rowCount) return res.status(404).json({error:'Record not found'}); await writeAuditEvent(req.user,'DELETE',`expenses:${req.params.kind}`,['id']); res.json({success:true}); }
  catch(e) { res.status(400).json({error:e.message}); }
});
app.get('/api/health', async (_req,res) => { try { await pool.query('SELECT 1'); res.json({status:'ok',version:'2.07',database:'connected'}); } catch { res.status(503).json({status:'error',database:'unavailable'}); } });
app.get('/api/backup.sql', auth, async (req,res) => {
  if (!isAdminUser(req.user)) return res.status(403).json({error:'Administrator access required'});
  try {
    const state = await getState();
    if (!state) return res.status(404).json({error:'No CRM data is available to export'});
    const encoded = Buffer.from(JSON.stringify(state), 'utf8').toString('base64');
    const exportId = crypto.randomUUID();

    // A real PostgreSQL dump is required here: exporting only crm_state does not
    // back up the normalized tables that administrators inspect in pgAdmin.
    // Invalidate older confirmations, then create this export's confirmation row.
    await pool.query('UPDATE crm_backup_exports SET consumed_at=now() WHERE admin_agent_id=$1 AND consumed_at IS NULL',[req.user.agent_id]);
    await pool.query('INSERT INTO crm_backup_exports(export_id,admin_agent_id) VALUES($1,$2)',[exportId,req.user.agent_id]);

    const pgDumpArgs = [
      '--host', process.env.PGHOST || 'db',
      '--port', String(process.env.PGPORT || 5432),
      '--username', process.env.PGUSER || process.env.POSTGRES_USER || 'crm_user',
      '--dbname', process.env.PGDATABASE || process.env.POSTGRES_DB || 'mesina_crm',
      '--format=plain', '--encoding=UTF8', '--no-owner', '--no-privileges',
    ];
    const dump = await new Promise((resolve, reject) => {
      const child = spawn('pg_dump', pgDumpArgs, {
        env: { ...process.env, PGPASSWORD: process.env.PGPASSWORD ?? process.env.POSTGRES_PASSWORD ?? '' },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      const stdout = [];
      const stderr = [];
      child.stdout.on('data', chunk => stdout.push(chunk));
      child.stderr.on('data', chunk => stderr.push(chunk));
      child.on('error', error => reject(new Error(`PostgreSQL dump utility could not start: ${error.message}`)));
      child.on('close', code => {
        if (code !== 0) return reject(new Error(`pg_dump exited with code ${code}: ${Buffer.concat(stderr).toString('utf8').trim()}`));
        resolve(Buffer.concat(stdout).toString('utf8'));
      });
    });
    if (!dump.trim()) throw new Error('pg_dump returned an empty database backup.');

    // Keep the state marker for the CRM's in-app restore flow while including
    // the complete schema and row data for pgAdmin/psql restoration.
    const sql = `-- Mesina Farms CRM complete PostgreSQL backup\n-- Restore into an empty database with pgAdmin Query Tool or psql.\n-- MESINA_CRM_STATE_BASE64:${encoded}\n\n${dump}`;
    res.setHeader('X-CRM-Backup-Export-Id',exportId);
    res.setHeader('Access-Control-Expose-Headers','X-CRM-Backup-Export-Id');
    res.setHeader('Content-Type','application/sql; charset=utf-8');
    res.setHeader('Content-Disposition',`attachment; filename=mesina_crm_backup_${new Date().toISOString().slice(0,10)}.sql`);
    res.send(sql);
  } catch (error) {
    console.error('SQL export failed:',error);
    if (!res.headersSent) res.status(500).json({error:error?.message || 'Unable to create SQL backup'});
    else res.destroy(error);
  }
});

// Server-side pagination/search API for gradually moving large tables away from full-state downloads.
const resourceToStateKey = {
  opportunities:'opportunities', orders:'orders', follow_up_orders:'followUpOrders', invoices:'invoices',
  deliveries:'deliveries', revenues:'revenues', farm_registries:'farmRegistries', contact_people:'contactPeople',
  agents:'agents', catalog:'marketPrices', histories:'histories', online_inquiry:'onlineInquiries',
  online_inquiry_sources:'onlineInquirySources'
};
app.get('/api/records/:resource', auth, async (req,res) => {
  const key = resourceToStateKey[req.params.resource];
  if (!key) return res.status(404).json({error:'Unknown CRM resource'});
  try {
    const state = await getState();
    const tabs = allowedTabs(req.user,state);
    if (!canAccessKey(key,tabs,state,req.user)) return res.status(403).json({error:'You do not have permission to access this resource.'});
    let records = Array.isArray(state?.[key]) ? state[key] : [];
    if (key === 'agents' && !isAdminUser(req.user)) records = records.filter(row => !isPrivilegedAgentRole(row.role));
    const result = paginateRecords(records, req.query);
    if (key === 'agents') result.items = result.items.map(({password,...row}) => ({...row,password:''}));
    res.json(result);
  } catch (error) { console.error('Paginated records failed:',error); res.status(500).json({error:'Unable to retrieve records.'}); }
});

app.get('/api/reports/financial-reconciliation', auth, async (req,res) => {
  try {
    const state = await getState();
    const tabs = allowedTabs(req.user,state);
    if (!isAdminUser(req.user) && !(tabs.includes('invoices') && tabs.includes('revenues'))) return res.status(403).json({error:'Invoice and revenue permissions are required.'});
    res.json(buildFinancialReconciliation(state));
  } catch (error) { console.error('Financial reconciliation failed:',error); res.status(500).json({error:'Unable to generate financial reconciliation.'}); }
});

app.get('/api/admin/audit-events', auth, async (req,res) => {
  if (!isAdminUser(req.user)) return res.status(403).json({error:'Administrator access required.'});
  const page = Math.max(1, Math.min(1000000, Number.parseInt(req.query.page || '1',10) || 1));
  const perPage = Math.max(1, Math.min(100, Number.parseInt(req.query.perPage || '50',10) || 50));
  try {
    const count = await pool.query('SELECT COUNT(*)::int AS total FROM crm_audit_events');
    const rows = await pool.query('SELECT event_id,actor_agent_id,actor_name,action,entity,changed_keys,record_counts,created_at FROM crm_audit_events ORDER BY event_id DESC LIMIT $1 OFFSET $2',[perPage,(page-1)*perPage]);
    const total = count.rows[0].total;
    res.json({items:rows.rows,pagination:{page,perPage,total,totalPages:Math.max(1,Math.ceil(total/perPage))}});
  } catch (error) { console.error('Audit events failed:',error); res.status(500).json({error:'Unable to retrieve audit events.'}); }
});

app.post('/api/auth/login', async (req,res) => {
  const ip=String(req.ip||req.socket.remoteAddress||'unknown').slice(0,100);
  const username=String(req.body?.username||'').trim().toLowerCase().slice(0,255), password=String(req.body?.password||'');
  if (!username || !password) return res.status(400).json({error:'Username and password are required'});
  const blocked = await pool.query('SELECT blocked_until FROM auth_login_attempts WHERE ip_address=$1 AND username=$2 AND blocked_until>now()', [ip, username]);
  if (blocked.rowCount) return res.status(429).json({error:'Too many login attempts. Try again in 15 minutes.'});
  const {rows}=await pool.query('SELECT agent_id,name,role,username,status,email,phone,address,date_started,avatar_url,password FROM agents WHERE lower(username)=lower($1)',[username]);
  const a=rows[0];
  if (!a || a.status!=='Active' || !(await bcrypt.compare(password,a.password))) {
    await pool.query(`INSERT INTO auth_login_attempts(ip_address,username,attempts,window_started_at,blocked_until)
      VALUES($1,$2,1,now(),NULL)
      ON CONFLICT(ip_address,username) DO UPDATE SET
        attempts=CASE WHEN auth_login_attempts.window_started_at < now()-interval '15 minutes' THEN 1 ELSE auth_login_attempts.attempts+1 END,
        window_started_at=CASE WHEN auth_login_attempts.window_started_at < now()-interval '15 minutes' THEN now() ELSE auth_login_attempts.window_started_at END,
        blocked_until=CASE WHEN (CASE WHEN auth_login_attempts.window_started_at < now()-interval '15 minutes' THEN 1 ELSE auth_login_attempts.attempts+1 END)>=10 THEN now()+interval '15 minutes' ELSE NULL END`, [ip, username]);
    return res.status(401).json({error:'Invalid username or password'});
  }
  await pool.query('DELETE FROM auth_login_attempts WHERE ip_address=$1 AND username=$2', [ip, username]);
  const token=await signToken(a); const {password:_,...user}=a; res.json({token,user});
});
app.get('/api/me',auth,async(req,res)=>{ const {password,...user}=req.user; res.json({user}); });
app.get('/api/state',auth,async(req,res)=>{
  const state=await getState();
  if(!state) { if(!isAdminUser(req.user)) return res.status(409).json({error:'CRM has not been initialized. Ask an administrator to sign in first.'}); return res.json({state:null,allowedTabs:allowedTabs(req.user,null)}); }
  const tabs=allowedTabs(req.user,state); const filtered={};
  for(const key of tableKeys) {
    if(key==='rolePermissions') {
      if (isAdminUser(req.user)) filtered.rolePermissions = state.rolePermissions || {};
      else if (isManagerUser(req.user) && tabs.includes('agents')) {
        // Expose ordinary role names for the Manager's agent-role dropdown,
        // but never expose Admin/Manager permission definitions.
        const visibleRoleNames = Object.keys(state.rolePermissions || {}).filter(role => !isPrivilegedAgentRole(role));
        filtered.rolePermissions = Object.fromEntries(visibleRoleNames.map(role => [role, []]));
        const ownExtras = (state.rolePermissions?.[req.user.role] || []).filter(value =>
          (value.startsWith('export:') && tabs.includes(value.slice(7))) ||
          (value.startsWith('overview:') && tabs.includes('dashboard'))
        );
        filtered.rolePermissions[req.user.role] = [...tabs, ...ownExtras];
      } else {
        const ownExtras = (state.rolePermissions?.[req.user.role] || []).filter(value =>
          (value.startsWith('export:') && tabs.includes(value.slice(7))) ||
          (value.startsWith('overview:') && tabs.includes('dashboard'))
        );
        filtered.rolePermissions = { [req.user.role]: [...tabs, ...ownExtras] };
      }
      continue;
    }
    if(canAccessKey(key,tabs,state,req.user)) filtered[key]=state[key];
    else if(key==='branding') filtered[key]=state[key];
    else filtered[key]=[];
  }
  if(Array.isArray(filtered.agents)) {
    const visible = !isAdminUser(req.user) ? filtered.agents.filter(agent => !isPrivilegedAgentRole(agent.role)) : filtered.agents;
    filtered.agents=visible.map(({password,...agent})=>({...agent,password:''}));
  }
  if(!tabs.includes('agents')) filtered.agents=[];
  if (!isAdminUser(req.user)) {
    const ownVisibility = state.overviewVisibility?.[req.user.username];
    filtered.overviewVisibility = ownVisibility ? { [req.user.username]: ownVisibility } : {};
  }
  res.json({state:filtered,allowedTabs:tabs});
});
app.put('/api/state',auth,async(req,res)=>{
  const incoming=req.body?.state; if(!incoming || typeof incoming!=='object' || Array.isArray(incoming)) return res.status(400).json({error:'Invalid state payload'});
  const existing=await getState(); if(!existing && !isAdminUser(req.user)) return res.status(403).json({error:'Only an administrator can initialize the CRM data store'}); const tabs=allowedTabs(req.user,existing); const next={...(existing||{})};
  for(const key of tableKeys) {
    if (!Object.hasOwn(incoming,key)) continue;
    if (key === 'overviewVisibility' && !isAdminUser(req.user)) {
      const own = incoming.overviewVisibility?.[req.user.username];
      next.overviewVisibility = { ...(existing?.overviewVisibility || {}) };
      if (own === undefined) delete next.overviewVisibility[req.user.username];
      else next.overviewVisibility[req.user.username] = own;
      continue;
    }
    if (canAccessKey(key,tabs,existing,req.user,{write:true})) next[key]=incoming[key];
  }
  // Managers may manage ordinary agents only. Keep Admin and Manager accounts
  // out of their response and immutable in the persisted CRM state.
  if (!isAdminUser(req.user) && isManagerUser(req.user) && tabs.includes('agents') && Array.isArray(incoming.agents)) {
    const existingAgents = Array.isArray(existing?.agents) ? existing.agents : [];
    const existingById = new Map(existingAgents.map(agent => [String(agent.agent_id), agent]));
    const incomingById = new Map(incoming.agents.map(agent => [String(agent.agent_id), agent]));
    const merged = existingAgents.map(agent => {
      if (isPrivilegedAgentRole(agent.role)) return agent;
      const submitted = incomingById.get(String(agent.agent_id));
      if (!submitted || !isAssignableRole(submitted.role, existing)) return agent;
      return { ...agent, ...submitted, agent_id: agent.agent_id };
    });
    for (const agent of incoming.agents) {
      if (!existingById.has(String(agent.agent_id)) && agent?.agent_id && agent?.username && agent?.name && isAssignableRole(agent.role, existing)) merged.push(agent);
    }
    next.agents = merged;
  }
  // Keep the normalized roles master table synchronized with configured roles.
  if (isAdminUser(req.user) && incoming.rolePermissions && typeof incoming.rolePermissions === 'object') {
    const roleNames = Object.keys(incoming.rolePermissions).map((name) => String(name).trim()).filter(Boolean);
    for (const name of roleNames) {
      await pool.query('INSERT INTO roles(name) VALUES($1) ON CONFLICT(name) DO NOTHING', [name]);
    }
    // Remove any role omitted from the configured role list, except Admin or roles still assigned to an account.
    await pool.query(
      `DELETE FROM roles r WHERE lower(r.name) NOT IN ('admin','manager') AND NOT (r.name = ANY($1::text[]))
       AND NOT EXISTS (SELECT 1 FROM agents a WHERE a.role = r.name)`,
      [roleNames]
    );
  }
  // Server-authoritative financial validation. Orders are recalculated from their saved
  // unit price/discount, and newly created invoices receive immutable pricing snapshots.
  const money = value => Number(Number(value).toFixed(2));
  const marketPriceByName = new Map((next.marketPrices || []).map(item => [String(item.name), item]));
  const normalizedOrders = [];
  for (const order of (next.orders || [])) {
    const market = marketPriceByName.get(String(order.fish_category));
    const quantity = Number(order.quantity);
    const unitPrice = Number(order.price ?? market?.price ?? 0);
    const unit = order.price_unit || market?.unit || 'per piece';
    const discountEnabled = Boolean(order.discount_enabled);
    const subtotal = money(quantity * unitPrice);
    const legacyDiscountAmount = Number(order.discount || 0);
    const discountPercent = order.discount_percent !== undefined && order.discount_percent !== null
      ? Number(order.discount_percent)
      : (discountEnabled && subtotal > 0 ? (legacyDiscountAmount / subtotal) * 100 : 0);
    const discount = discountEnabled ? money(subtotal * discountPercent / 100) : 0;
    if (!Number.isFinite(quantity) || quantity <= 0 || (unit === 'per piece' && !Number.isInteger(quantity)) || !Number.isFinite(unitPrice) || unitPrice < 0 || !['per piece','per kilo'].includes(unit)) {
      return res.status(400).json({error:`Order #${order.order_id || '?'} has invalid quantity or unit pricing.`});
    }
    if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) {
      return res.status(400).json({error:`Order #${order.order_id || '?'} discount must be between 0% and 100%.`});
    }
    normalizedOrders.push({ ...order, price: unitPrice, price_unit: unit, discount, discount_percent: discountPercent, discount_enabled: discountEnabled, total_price: money(subtotal - discount) });
  }
  next.orders = normalizedOrders;
  for (const followUp of (next.followUpOrders || [])) {
    const unit = marketPriceByName.get(String(followUp.fish_category))?.unit || 'per piece';
    const quantity = Number(followUp.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0 || (unit === 'per piece' && !Number.isInteger(quantity))) {
      return res.status(400).json({error:`Follow-up #${followUp.follow_up_orders_id || '?'} has an invalid quantity for ${unit}.`});
    }
  }
  const existingInvoicesById = new Map((existing?.invoices || []).map(invoice => [String(invoice.invoice_id), invoice]));
  const normalizedInvoices = [];
  for (const invoice of (next.invoices || [])) {
    const oldInvoice = existingInvoicesById.get(String(invoice.invoice_id));
    if (oldInvoice) {
      const oldFollowUp = (existing?.followUpOrders || []).find(row => Number(row.follow_up_orders_id) === Number(oldInvoice.follow_up_orders_id));
      const wasOrderLinked = Boolean(oldInvoice.order_id ?? oldFollowUp?.order_id);
      if (wasOrderLinked) {
        const financialFields = ['quantity','item_price_per_piece','item_unit','subtotal','discount','discount_enabled','total_price'];
        const changedTerms = financialFields.some(key => Number(oldInvoice[key] ?? 0) !== Number(invoice[key] ?? 0) && oldInvoice[key] !== invoice[key]);
        if (changedTerms) return res.status(409).json({error:`Pricing terms on invoice ${oldInvoice.official_receipt_id} are locked to its originating order. Use an adjustment/credit-note workflow for corrections.`});
      }
      normalizedInvoices.push(invoice);
      continue;
    }
    const followUp = (next.followUpOrders || []).find(row => Number(row.follow_up_orders_id) === Number(invoice.follow_up_orders_id));
    const linkedOrderId = invoice.order_id ?? followUp?.order_id;
    const linkedOrder = linkedOrderId ? next.orders.find(row => Number(row.order_id) === Number(linkedOrderId)) : undefined;
    const market = marketPriceByName.get(String(invoice.fish_category));
    const quantity = Number(linkedOrder?.quantity ?? invoice.quantity);
    const unitPrice = Number(linkedOrder?.price ?? invoice.item_price_per_piece ?? market?.price ?? 0);
    const unit = linkedOrder?.price_unit ?? invoice.item_unit ?? market?.unit ?? 'per piece';
    const discountEnabled = Boolean(linkedOrder ? linkedOrder.discount_enabled : invoice.discount_enabled);
    const discount = discountEnabled ? Number(linkedOrder?.discount ?? invoice.discount ?? 0) : 0;
    const subtotal = money(quantity * unitPrice);
    if (!Number.isFinite(quantity) || quantity <= 0 || (unit === 'per piece' && !Number.isInteger(quantity)) || !Number.isFinite(unitPrice) || unitPrice < 0 || !['per piece','per kilo'].includes(unit)) {
      return res.status(400).json({error:`Invoice ${invoice.official_receipt_id || invoice.invoice_id} has invalid quantity or unit pricing.`});
    }
    if (!Number.isFinite(discount) || discount < 0 || discount > subtotal) {
      return res.status(400).json({error:`Invoice ${invoice.official_receipt_id || invoice.invoice_id} has a discount greater than its subtotal.`});
    }
    const total = money(subtotal - discount);
    const snapshot = { unit_price: unitPrice, unit, quantity, subtotal, discount, discount_enabled: discountEnabled, total, captured_at: new Date().toISOString(), source: linkedOrder ? 'order' : followUp ? 'follow_up' : 'market_price' };
    normalizedInvoices.push({ ...invoice, order_id: invoice.order_id ?? linkedOrder?.order_id, farm_name: linkedOrder?.farm_name ?? invoice.farm_name, contact_person_name: linkedOrder?.contact_person ?? invoice.contact_person_name, fish_category: linkedOrder?.fish_category ?? invoice.fish_category, quantity, item_price_per_piece: unitPrice, item_unit: unit, subtotal, discount, discount_enabled: discountEnabled, total_price: total, pricing_snapshot: snapshot });
  }
  next.invoices = normalizedInvoices;
  // Keep Admin permissions immutable to non-admins.
  if(!isAdminUser(req.user) && existing?.rolePermissions) next.rolePermissions=existing.rolePermissions;
  // Preserve farm/contact links when a farm is renamed.
  if (existing?.farmRegistries && next.farmRegistries && existing?.contactPeople && next.contactPeople) {
    const oldById = new Map(existing.farmRegistries.map(f => [String(f.farm_id), f.farm_name]));
    const renamed = new Map();
    for (const farm of next.farmRegistries) { const oldName=oldById.get(String(farm.farm_id)); if(oldName && oldName!==farm.farm_name) renamed.set(oldName.toLowerCase(),farm.farm_name); }
    if (renamed.size && !isAdminUser(req.user) && !tabs.includes('contact_people')) return res.status(403).json({error:'You also need Contact People permission to rename a farm linked to contacts.'});
    if (renamed.size) next.contactPeople=next.contactPeople.map(c=>({...c,farm_name:renamed.get(String(c.farm_name).toLowerCase())||c.farm_name}));
  }
  const farmNames = new Set((next.farmRegistries||[]).map(f=>String(f.farm_name||'').trim().toLowerCase()));
  const seenContacts = new Set();
  for (const contact of (next.contactPeople||[])) {
    const contactName=String(contact.contact_person_name||'').trim().toLowerCase();
    const farmName=String(contact.farm_name||'').trim().toLowerCase();
    if (!contactName || !farmName || !farmNames.has(farmName)) return res.status(400).json({error:`Contact ${contact.contact_person_name||'(unnamed)'} must be linked to an existing farm.`});
    if (seenContacts.has(contactName)) return res.status(400).json({error:`Contact person name '${contact.contact_person_name}' can only be associated with one farm and must be unique.`});
    seenContacts.add(contactName);
    if (!['yes','no'].includes(contact.is_point_person) || !['yes','no'].includes(contact.is_active)) return res.status(400).json({error:'Invalid contact point-person or active status.'});
  }
  const changedKeys = tableKeys.filter(key => JSON.stringify(existing?.[key] ?? null) !== JSON.stringify(next?.[key] ?? null));
  const recordCounts = Object.fromEntries(['orders','followUpOrders','invoices','deliveries','revenues','opportunities'].map(key => [key,Array.isArray(next[key]) ? next[key].length : 0]));
  const persistClient = await pool.connect();
  try {
    await persistClient.query('BEGIN');
    await persistClient.query(`INSERT INTO crm_state(id,state,updated_at) VALUES(1,$1::jsonb,now()) ON CONFLICT(id) DO UPDATE SET state=EXCLUDED.state,updated_at=now()`, [JSON.stringify(next)]);
    await refreshStateRecordMirror(persistClient, next);
    await syncRelationalCollections(persistClient, next);
    await persistClient.query(`INSERT INTO crm_audit_events(actor_agent_id,actor_name,action,entity,changed_keys,record_counts) VALUES($1,$2,'STATE_SYNC','crm_state',$3::jsonb,$4::jsonb)`, [req.user.agent_id,req.user.name,JSON.stringify(changedKeys),JSON.stringify(recordCounts)]);
    await persistClient.query('COMMIT');
  } catch (persistError) { await persistClient.query('ROLLBACK'); throw persistError; }
  finally { persistClient.release(); }
  // Keep account credentials in the dedicated PostgreSQL agents table, not only in the CRM document.
  if ((isAdminUser(req.user) || (isManagerUser(req.user) && tabs.includes('agents'))) && Array.isArray(incoming.agents)) {
    const submittedAgents = isAdminUser(req.user)
      ? incoming.agents
      : incoming.agents.filter(agent => isAssignableRole(agent?.role, existing));
    for (const a of submittedAgents) {
      if (!isAdminUser(req.user)) {
        const protectedAccount = await pool.query('SELECT role FROM agents WHERE agent_id=$1', [a.agent_id]);
        if (protectedAccount.rowCount && isPrivilegedAgentRole(protectedAccount.rows[0].role)) continue;
      }
      // Agent records returned by the API intentionally have blank passwords.
      // Do not skip role/profile updates just because the password is not present.
      if (!a.agent_id || !a.username || !a.name || !a.role) continue;
      const existingAgent = await pool.query(
        'SELECT password FROM agents WHERE agent_id=$1',
        [a.agent_id]
      );
      // A new account must have a password; existing accounts retain their
      // current password when the admin edits only profile/role information.
      if (!existingAgent.rowCount && !a.password) continue;
      const passwordHash = a.password || existingAgent.rows[0].password;
      await pool.query(`INSERT INTO agents(agent_id,name,address,phone,email,status,role,username,password,date_started,avatar_url)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT(agent_id) DO UPDATE SET
          name=EXCLUDED.name,
          address=EXCLUDED.address,
          phone=EXCLUDED.phone,
          email=EXCLUDED.email,
          status=EXCLUDED.status,
          role=EXCLUDED.role,
          username=EXCLUDED.username,
          password=CASE WHEN EXCLUDED.password IS NOT NULL AND EXCLUDED.password<>'' THEN EXCLUDED.password ELSE agents.password END,
          date_started=EXCLUDED.date_started,
          avatar_url=COALESCE(EXCLUDED.avatar_url,agents.avatar_url)`,
        [a.agent_id,a.name,a.address||null,a.phone||null,a.email||null,a.status||'Active',a.role,a.username,passwordHash,a.date_started||new Date().toISOString(),a.avatar_url||null]);
    }
    // Keep BIGSERIAL aligned with the highest sequential ID. Older CRM builds
    // stored Date.now() timestamps as agent IDs; exclude those legacy values.
    await pool.query(`SELECT setval(
      pg_get_serial_sequence('agents', 'agent_id')::regclass,
      GREATEST(COALESCE((SELECT MAX(agent_id) FROM agents WHERE agent_id < 1000000000000), 1), 1),
      true
    )`);
  }
  res.json({ok:true,updated_at:new Date().toISOString()});
});
app.put('/api/me',auth,async(req,res)=>{
  const name=String(req.body?.name||'').trim();
  const username=String(req.body?.username||'').trim().toLowerCase();
  const email=String(req.body?.email||'').trim() || null;
  const phone=String(req.body?.phone||'').trim() || null;
  const address=String(req.body?.address||'').trim() || null;
  const currentPassword=String(req.body?.currentPassword||'');
  const newPassword=String(req.body?.newPassword||'');
  const avatarUrl = req.body?.avatar_url == null ? undefined : String(req.body.avatar_url);
  if (avatarUrl !== undefined && avatarUrl && (!/^data:image\/(png|jpeg|webp|gif);base64,/.test(avatarUrl) || avatarUrl.length > 2800000)) return res.status(400).json({error:'Avatar must be a PNG, JPEG, WEBP or GIF image under 2 MB.'});
  if(!name || !username) return res.status(400).json({error:'Name and username are required.'});
  if(newPassword && newPassword.length < 10) return res.status(400).json({error:'New password must be at least 10 characters.'});
  const {rows}=await pool.query('SELECT password FROM agents WHERE agent_id=$1',[req.user.agent_id]);
  if(!rows[0]) return res.status(404).json({error:'Account not found.'});
  if(newPassword && !(await bcrypt.compare(currentPassword,rows[0].password))) return res.status(403).json({error:'Current password is incorrect.'});
  try {
    const passwordHash = newPassword ? await bcrypt.hash(newPassword,12) : rows[0].password;
    const updated=await pool.query(`UPDATE agents SET name=$1,username=$2,email=$3,phone=$4,address=$5,password=$6,avatar_url=COALESCE($7,avatar_url) WHERE agent_id=$8 RETURNING agent_id,name,address,phone,email,status,role,username,date_started,avatar_url`,[name,username,email,phone,address,passwordHash,avatarUrl,req.user.agent_id]);
    const user=updated.rows[0];
    const state=await getState();
    if(state && Array.isArray(state.agents)) {
      state.agents=state.agents.map(a=>Number(a.agent_id)===Number(user.agent_id)?{...a,...user,password:passwordHash}:a);
      await pool.query('UPDATE crm_state SET state=$1::jsonb,updated_at=now() WHERE id=1',[JSON.stringify(state)]);
    }
    res.json({user});
  } catch(error) {
    if(error.code==='23505') return res.status(409).json({error:'That username or email is already in use.'});
    throw error;
  }
});
app.get('/api/online-inquiries',auth,requireTabPermission('online_inquiry'),async(req,res)=>{ const r=await pool.query('SELECT inquiry_id,inquiry_datetime,source,customer_name,phone,email,message,status FROM online_inquiry ORDER BY inquiry_datetime DESC'); res.json({items:r.rows}); });
app.post('/api/online-inquiries',auth,requireTabPermission('online_inquiry'),async(req,res)=>{ const b=req.body||{}; if(!String(b.customer_name||'').trim() || !String(b.source||'').trim()) return res.status(400).json({error:'Customer name and source are required'}); const r=await pool.query('INSERT INTO online_inquiry(source,customer_name,phone,email,message,status) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[b.source,String(b.customer_name).trim(),b.phone||null,b.email||null,b.message||null,b.status==='processed'?'processed':'unread']); res.status(201).json({item:r.rows[0]}); });
app.patch('/api/online-inquiries/:id',auth,requireTabPermission('online_inquiry'),async(req,res)=>{ const r=await pool.query("UPDATE online_inquiry SET status=$1 WHERE inquiry_id=$2 RETURNING *",[req.body?.status==='processed'?'processed':'unread',Number(req.params.id)]); if(!r.rowCount)return res.status(404).json({error:'Inquiry not found'}); res.json({item:r.rows[0]}); });
app.get('/api/online-inquiry-sources',auth,async(req,res)=>{
  if(!isAdminUser(req.user)) return res.status(403).json({error:'Administrator access required'});
  const r=await pool.query(`SELECT s.source_id,s.source_name,COUNT(i.inquiry_id)::int AS inquiry_count
    FROM online_inquiry_sources s LEFT JOIN online_inquiry i ON i.source=s.source_name
    GROUP BY s.source_id,s.source_name ORDER BY s.source_name`);
  res.json({items:r.rows});
});
app.post('/api/online-inquiry-sources',auth,async(req,res)=>{
  if(!isAdminUser(req.user)) return res.status(403).json({error:'Administrator access required'});
  const name=String(req.body?.source_name||'').trim();
  if(!name)return res.status(400).json({error:'Source name is required'});
  if(name.length>100)return res.status(400).json({error:'Source name must be 100 characters or fewer'});
  try {
    const r=await pool.query('INSERT INTO online_inquiry_sources(source_name) VALUES($1) RETURNING source_id,source_name',[name]);
    res.status(201).json({item:{...r.rows[0],inquiry_count:0}});
  } catch(e){ if(e.code==='23505')return res.status(409).json({error:'Source already exists'}); throw e; }
});
app.patch('/api/online-inquiry-sources/:id',auth,async(req,res)=>{
  if(!isAdminUser(req.user)) return res.status(403).json({error:'Administrator access required'});
  const id=Number(req.params.id), name=String(req.body?.source_name||'').trim();
  if(!Number.isInteger(id)||id<=0)return res.status(400).json({error:'Invalid source ID'});
  if(!name)return res.status(400).json({error:'Source name is required'});
  if(name.length>100)return res.status(400).json({error:'Source name must be 100 characters or fewer'});
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const current=await client.query('SELECT source_id,source_name FROM online_inquiry_sources WHERE source_id=$1 FOR UPDATE',[id]);
    if(!current.rowCount){await client.query('ROLLBACK');return res.status(404).json({error:'Inquiry source not found'});}
    const oldName=current.rows[0].source_name;
    if(oldName===name){
      const count=await client.query('SELECT COUNT(*)::int AS inquiry_count FROM online_inquiry WHERE source=$1',[oldName]);
      await client.query('COMMIT');
      return res.json({item:{...current.rows[0],inquiry_count:count.rows[0].inquiry_count}});
    }
    // The inquiry table references source_name, so create the replacement first,
    // move existing inquiries, then remove the old lookup row in one transaction.
    const replacement=await client.query('INSERT INTO online_inquiry_sources(source_name) VALUES($1) RETURNING source_id,source_name',[name]);
    await client.query('UPDATE online_inquiry SET source=$1 WHERE source=$2',[name,oldName]);
    await client.query('DELETE FROM online_inquiry_sources WHERE source_id=$1',[id]);
    await client.query('COMMIT');
    res.json({item:{...replacement.rows[0],inquiry_count:0}});
  } catch(e){
    await client.query('ROLLBACK');
    if(e.code==='23505')return res.status(409).json({error:'Another inquiry source already uses that name'});
    throw e;
  } finally { client.release(); }
});
app.delete('/api/online-inquiry-sources/:id',auth,async(req,res)=>{
  if(!isAdminUser(req.user)) return res.status(403).json({error:'Administrator access required'});
  const id=Number(req.params.id);
  if(!Number.isInteger(id)||id<=0)return res.status(400).json({error:'Invalid source ID'});
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const source=await client.query('SELECT source_id,source_name FROM online_inquiry_sources WHERE source_id=$1 FOR UPDATE',[id]);
    if(!source.rowCount){await client.query('ROLLBACK');return res.status(404).json({error:'Inquiry source not found'});}
    const usage=await client.query('SELECT COUNT(*)::int AS inquiry_count FROM online_inquiry WHERE source=$1',[source.rows[0].source_name]);
    if(usage.rows[0].inquiry_count>0){
      await client.query('ROLLBACK');
      return res.status(409).json({error:`This source is used by ${usage.rows[0].inquiry_count} existing ${usage.rows[0].inquiry_count===1?'inquiry':'inquiries'}. Edit the source name to preserve those records, or remove/reassign the inquiries first.`,inquiry_count:usage.rows[0].inquiry_count});
    }
    await client.query('DELETE FROM online_inquiry_sources WHERE source_id=$1',[id]);
    await client.query('COMMIT');
    res.json({success:true});
  } catch(e){ await client.query('ROLLBACK'); throw e; }
  finally { client.release(); }
});
app.get('/api/admin/truncate-eligibility',auth,async(req,res)=>{
  if(!isAdminUser(req.user)) return res.status(403).json({error:'Administrator access required.'});
  const result=await pool.query(`SELECT GREATEST(0,CEIL(300-EXTRACT(EPOCH FROM (now()-MAX(downloaded_at))))::int) AS remaining_seconds FROM crm_backup_exports WHERE admin_agent_id=$1 AND downloaded_at IS NOT NULL AND consumed_at IS NULL AND downloaded_at > now()-interval '5 minutes'`,[req.user.agent_id]);
  const remainingSeconds=Number(result.rows[0]?.remaining_seconds||0);
  res.json({eligible:remainingSeconds>0,remainingSeconds});
});
app.post('/api/admin/confirm-backup-export',auth,async(req,res)=>{
  if(!isAdminUser(req.user)) return res.status(403).json({error:'Administrator access required.'});
  const exportId=String(req.body?.exportId||'');
  if(!/^[0-9a-f-]{36}$/i.test(exportId)) return res.status(400).json({error:'Invalid backup export reference.'});
  const result=await pool.query(`UPDATE crm_backup_exports SET downloaded_at=now() WHERE export_id=$1 AND admin_agent_id=$2 AND downloaded_at IS NULL AND consumed_at IS NULL RETURNING export_id`,[exportId,req.user.agent_id]);
  if(!result.rowCount) return res.status(409).json({error:'Backup export could not be confirmed. Export the CRM data again.'});
  res.json({ok:true});
});
app.post('/api/admin/clear-operational-data',auth,async(req,res)=>{
  if(!isAdminUser(req.user)) return res.status(403).json({error:'Administrator access required.'});
  if(req.body?.confirmation!=='CLEAR CRM DATA') return res.status(400).json({error:'Confirmation phrase did not match.'});
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const backup=await client.query(`SELECT export_id FROM crm_backup_exports WHERE admin_agent_id=$1 AND downloaded_at IS NOT NULL AND consumed_at IS NULL AND downloaded_at > now()-interval '5 minutes' ORDER BY downloaded_at DESC LIMIT 1 FOR UPDATE`,[req.user.agent_id]);
    if(!backup.rowCount){await client.query('ROLLBACK');return res.status(409).json({error:'Export CRM Data (.SQL) successfully before truncating operational data.'});}
    const result=await client.query('SELECT state FROM crm_state WHERE id=1 FOR UPDATE');
    const state=result.rows[0]?.state || {};
    // Keep agent accounts, role-to-table restrictions, branding and workflow lookup lists.
    // Clear operational records and market pricing master data to provide a genuinely clean workspace.
    for(const key of ['marketPrices','farmRegistries','contactPeople','opportunities','orders','followUpOrders','invoices','deliveries','revenues','histories']) state[key]=[];
    state.overviewVisibility={};
    await client.query('INSERT INTO crm_state(id,state,updated_at) VALUES(1,$1::jsonb,now()) ON CONFLICT(id) DO UPDATE SET state=EXCLUDED.state,updated_at=now()',[JSON.stringify(state)]);
    await refreshStateRecordMirror(client,state);
    await syncRelationalCollections(client,state);
    await client.query(`INSERT INTO crm_audit_events(actor_agent_id,actor_name,action,entity,changed_keys,record_counts)
      VALUES($1,$2,'CLEAR_OPERATIONAL_DATA','crm_state',$3::jsonb,$4::jsonb)`,
      [req.user.agent_id,req.user.name,JSON.stringify(['marketPrices','farmRegistries','contactPeople','opportunities','orders','followUpOrders','invoices','deliveries','revenues','histories']),JSON.stringify({orders:0,invoices:0,deliveries:0,revenues:0})]);
    await client.query('UPDATE crm_backup_exports SET consumed_at=now() WHERE export_id=$1',[backup.rows[0].export_id]);
    await client.query('COMMIT');
    res.json({ok:true,message:'CRM tables cleared. Agent accounts, role restrictions and essential application configuration were preserved.'});
  } catch(error) {
    await client.query('ROLLBACK');
    console.error('CRM data clear failed:',error);
    res.status(500).json({error:'Unable to clear CRM data.'});
  } finally { client.release(); }
});
app.post('/api/auth/logout',auth,async(req,res)=>{ const payload=JSON.parse(Buffer.from(req.token.split('.')[0],'base64url').toString()); await pool.query('DELETE FROM crm_sessions WHERE token_id=$1',[payload.jti]); res.json({ok:true}); });

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const dist=path.join(__dirname,'dist');
app.use(express.static(dist,{index:false, maxAge:'1h'}));
app.get('*',(req,res)=>{ if(req.path.startsWith('/api/')) return res.status(404).json({error:'Not found'}); res.sendFile(path.join(dist,'index.html')); });
init().then(()=>app.listen(port,'0.0.0.0',()=>console.log(`Mesina Farms CRM v2.07 listening on ${port}`))).catch(err=>{console.error('Startup failed:',err);process.exit(1)});
