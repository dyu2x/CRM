-- ====================================================================
-- Mesina Farms CRM — fresh-install PostgreSQL schema
-- Compatible with PostgreSQL 14, 15 and 16.
-- Designed for a fresh PostgreSQL database; safe to initialize on an empty database.
-- Application version: 2.07. The CRM state document is synchronized with normalized tables for direct pgAdmin access.
-- ====================================================================

BEGIN;
SET LOCAL client_min_messages = WARNING;

-- 1. APPLICATION STATE AND AUTHENTICATION
CREATE TABLE crm_backup_exports (
    export_id VARCHAR(36) PRIMARY KEY,
    admin_agent_id INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    downloaded_at TIMESTAMPTZ,
    consumed_at TIMESTAMPTZ
);

CREATE TABLE crm_state (
    id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    state JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_crm_state_updated_at ON crm_state(updated_at DESC);

-- Queryable JSONB mirror retained for compatibility and full-state recovery.
-- Operational records are also synchronized into their normalized tables below.
CREATE TABLE crm_state_records (
    table_name VARCHAR(80) NOT NULL,
    record_key TEXT NOT NULL,
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (table_name, record_key)
);
CREATE INDEX idx_crm_state_records_table ON crm_state_records(table_name);

-- Append-only application audit events. Records metadata, not full customer payloads.
CREATE TABLE crm_audit_events (
    event_id BIGSERIAL PRIMARY KEY,
    actor_agent_id BIGINT,
    actor_name VARCHAR(255) NOT NULL,
    action VARCHAR(80) NOT NULL,
    entity VARCHAR(120) NOT NULL,
    changed_keys JSONB NOT NULL DEFAULT '[]'::jsonb,
    record_counts JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_crm_audit_events_created_at ON crm_audit_events(created_at DESC);
CREATE INDEX idx_crm_audit_events_actor ON crm_audit_events(actor_agent_id, created_at DESC);

-- Shared, persistent login throttling across application instances and restarts.
CREATE TABLE auth_login_attempts (
    ip_address VARCHAR(100) NOT NULL,
    username VARCHAR(255) NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    window_started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    blocked_until TIMESTAMPTZ,
    PRIMARY KEY (ip_address, username)
);
CREATE INDEX idx_auth_login_attempts_blocked_until ON auth_login_attempts(blocked_until);


-- 2. LOOKUP / REFERENCE TABLES
CREATE TABLE crm_branding (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL DEFAULT 'Mesina Farms',
    company_logo TEXT,
    tagline VARCHAR(255) DEFAULT 'Orders, deliveries and follow-ups in one place.',
    subtitle VARCHAR(255) DEFAULT 'Track every farm from first order to collected payment.',
    login_heading VARCHAR(255),
    login_description TEXT,
    login_footer VARCHAR(255),
    login_background_image TEXT,
    table_icon_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    favicon TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Master list of assignable CRM roles. Permissions remain in crm_state.rolePermissions.
CREATE TABLE roles (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(80) NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT 'Custom CRM role',
    assigned_user_count INTEGER NOT NULL DEFAULT 0 CHECK (assigned_user_count >= 0),
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO roles (name, description, is_system) VALUES
    ('Admin', 'Full CRM superuser access', TRUE),
    ('Manager', 'Manage ordinary agent accounts; no administrative access', TRUE),
    ('Booking Agent', 'Booking and inquiry management', TRUE),
    ('Delivery Agent', 'Delivery and fulfillment operations', TRUE),
    ('Sales Agent', 'Sales and customer management', TRUE)
ON CONFLICT (name) DO NOTHING;

CREATE TABLE agents (
    agent_id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255) UNIQUE,
    status VARCHAR(50) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    role VARCHAR(80) NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password TEXT NOT NULL, -- bcrypt hash
    date_started TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    avatar_url TEXT
);

CREATE FUNCTION refresh_role_user_counts() RETURNS TRIGGER AS $$
BEGIN
    UPDATE roles r SET assigned_user_count = (
        SELECT COUNT(*)::INTEGER FROM agents a WHERE a.role = r.name
    ), updated_at = CURRENT_TIMESTAMP;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agents_refresh_role_counts
AFTER INSERT OR UPDATE OR DELETE ON agents
FOR EACH STATEMENT EXECUTE FUNCTION refresh_role_user_counts();

CREATE TABLE crm_sessions (
    token_id TEXT PRIMARY KEY,
    agent_id BIGINT NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE market_price (
    market_price_id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    price NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (price >= 0),
    unit VARCHAR(20) NOT NULL DEFAULT 'per piece' CHECK (unit IN ('per piece', 'per kilo')),
    notes TEXT
);

CREATE TABLE opportunity_statuses (
    opportunity_status_id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE fu_orders_statuses (
    fu_opportunities_status_id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE fu_orders_method (
    fu_orders_method_id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE delivery_statuses (
    delivery_status_id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE payment_statuses (
    payment_status_id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE paymemt_methods (
    payment_methods_id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
);

-- 3. CORE OPERATIONAL TABLES

CREATE TABLE farm_registries (
    farm_id SERIAL PRIMARY KEY,
    farm_name VARCHAR(255) UNIQUE NOT NULL,
    farm_address TEXT NOT NULL,
    coordinates_lat_lng VARCHAR(100),
    designated_point_person VARCHAR(255),
    farm_phone VARCHAR(50) NOT NULL,
    farm_email VARCHAR(255),
    date_created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_agent VARCHAR(255)
);

CREATE TABLE contact_people (
    contact_id SERIAL PRIMARY KEY,
    contact_person_name VARCHAR(255) NOT NULL,
    farm_name VARCHAR(255) NOT NULL,
    is_point_person VARCHAR(10) NOT NULL DEFAULT 'yes' CHECK (is_point_person IN ('yes', 'no')),
    phone_number VARCHAR(50) NOT NULL,
    email_address VARCHAR(255),
    address TEXT,
    is_active VARCHAR(10) NOT NULL DEFAULT 'yes' CHECK (is_active IN ('yes', 'no')),
    date_created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_agent VARCHAR(255)
);

CREATE TABLE opportunities (
    opportunity_id SERIAL PRIMARY KEY,
    contact_id INTEGER REFERENCES contact_people(contact_id) ON DELETE SET NULL,
    contact_person VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    fish_category VARCHAR(255) NOT NULL REFERENCES market_price(name) ON UPDATE CASCADE ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    status VARCHAR(100) NOT NULL DEFAULT 'Pending/Undecided' CHECK (status IN ('Accepted', 'Pending/Undecided', 'Negotiating', 'Cancelled')),
    contacted_by VARCHAR(255) NOT NULL,
    source VARCHAR(50) NOT NULL DEFAULT 'Phone' CHECK (source IN ('Phone', 'In-person/Walk-in')),
    date_created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);


-- Online inquiries and their configurable source lookup.
CREATE TABLE online_inquiry_sources (
    source_id SERIAL PRIMARY KEY,
    source_name VARCHAR(100) NOT NULL UNIQUE
);
INSERT INTO online_inquiry_sources (source_name) VALUES
    ('Chatwoot'), ('Online inquiry'), ('FB Messenger'), ('WhatsApp'), ('Email')
ON CONFLICT (source_name) DO NOTHING;

CREATE TABLE online_inquiry (
    inquiry_id SERIAL PRIMARY KEY,
    inquiry_datetime TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    source VARCHAR(100) NOT NULL REFERENCES online_inquiry_sources(source_name),
    customer_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    message TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'processed'))
);

CREATE TABLE order_statuses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
);

INSERT INTO order_statuses (name, description) VALUES
    ('Pending', 'Order received and awaiting processing'),
    ('Confirmed', 'Order confirmed with the farm'),
    ('Processing', 'Order is being prepared'),
    ('Order Complete', 'Automatically set when the linked delivery payment is Paid in Full'),
    ('Cancelled', 'Order cancelled');

CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    opportunity_id INTEGER REFERENCES opportunities(opportunity_id) ON DELETE SET NULL,
    farm_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255) NOT NULL,
    fish_category VARCHAR(255) NOT NULL REFERENCES market_price(name) ON UPDATE CASCADE ON DELETE RESTRICT,
    quantity NUMERIC(12,3) NOT NULL CHECK (quantity > 0),
    price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    price_unit VARCHAR(20) NOT NULL DEFAULT 'per piece' CHECK (price_unit IN ('per piece', 'per kilo')),
    discount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (discount >= 0),
    discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (discount_percent >= 0 AND discount_percent <= 100),
    discount_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    total_price NUMERIC(14,2) NOT NULL DEFAULT 0.00 CHECK (total_price >= 0),
    order_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    delivery_date DATE,
    booking_agent VARCHAR(255) NOT NULL,
    status VARCHAR(100) NOT NULL DEFAULT 'Pending' REFERENCES order_statuses(name),
    notes TEXT
);

CREATE TABLE follow_up_orders (
    follow_up_orders_id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(order_id) ON DELETE SET NULL,
    opportunity_id INTEGER REFERENCES opportunities(opportunity_id) ON DELETE SET NULL,
    farm_name VARCHAR(255) NOT NULL,
    contact_person_name VARCHAR(255) NOT NULL,
    contact_number VARCHAR(50) NOT NULL,
    contact_email VARCHAR(255),
    date_of_inquiry TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    fish_category VARCHAR(255) NOT NULL REFERENCES market_price(name) ON UPDATE CASCADE ON DELETE RESTRICT,
    quantity NUMERIC(12,3) NOT NULL CHECK (quantity > 0),
    status VARCHAR(100) NOT NULL DEFAULT 'Scheduled',
    verified_up_by VARCHAR(255) NOT NULL,
    delivery_date DATE,
    landmarks TEXT,
    notes TEXT
);

CREATE TABLE invoices (
    invoice_id SERIAL PRIMARY KEY,
    follow_up_orders_id INTEGER REFERENCES follow_up_orders(follow_up_orders_id) ON DELETE SET NULL,
    order_id INTEGER REFERENCES orders(order_id) ON DELETE SET NULL,
    official_receipt_id VARCHAR(100) UNIQUE NOT NULL CHECK (length(trim(official_receipt_id)) > 0),
    farm_name VARCHAR(255) NOT NULL,
    contact_person_name VARCHAR(255) NOT NULL,
    fish_category VARCHAR(255) NOT NULL REFERENCES market_price(name) ON UPDATE CASCADE ON DELETE RESTRICT,
    quantity NUMERIC(12,3) NOT NULL CHECK (quantity > 0),
    item_price_per_piece NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    item_unit VARCHAR(20) NOT NULL DEFAULT 'per piece' CHECK (item_unit IN ('per piece', 'per kilo')),
    subtotal NUMERIC(14,2) NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0),
    discount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (discount >= 0),
    discount_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    pricing_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    total_price NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    or_issued_by VARCHAR(255) NOT NULL,
    payment_received_by VARCHAR(255) NOT NULL DEFAULT '',
    payment_method VARCHAR(100) NOT NULL,
    payment_status VARCHAR(100) NOT NULL DEFAULT 'Pending',
    date_created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    delivery_date DATE,
    notes TEXT
);

CREATE TABLE deliveries (
    delivery_id SERIAL PRIMARY KEY,
    invoice_id INTEGER REFERENCES invoices(invoice_id) ON DELETE CASCADE,
    farm_name VARCHAR(255) NOT NULL,
    farm_address TEXT NOT NULL,
    farm_phone VARCHAR(50) NOT NULL,
    farm_gps_coordinates VARCHAR(100),
    delivered_by VARCHAR(255) NOT NULL,
    status VARCHAR(100) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Out for Delivery', 'Delivered', 'Failed', 'Rescheduled')),
    payment_collected_by VARCHAR(255),
    payment_method VARCHAR(100) NOT NULL,
    payment_status VARCHAR(100) NOT NULL DEFAULT 'Pending' REFERENCES payment_statuses(name),
    fulfillment_accepted_by VARCHAR(255),
    landmarks TEXT,
    delivery_notes TEXT,
    date_created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    delivery_date DATE,
    delivered_date TIMESTAMP WITH TIME ZONE
);

CREATE TABLE revenues (
    revenue_id SERIAL PRIMARY KEY,
    invoice_id INTEGER REFERENCES invoices(invoice_id) ON DELETE CASCADE,
    delivery_id INTEGER REFERENCES deliveries(delivery_id) ON DELETE CASCADE,
    delivery_status VARCHAR(100) NOT NULL DEFAULT 'Delivered',
    payment_collected_by VARCHAR(255) NOT NULL,
    revenue_amount NUMERIC(14, 2) NOT NULL,
    payment_method VARCHAR(100) NOT NULL,
    delivered_date TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE histories (
    history_id SERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    modified_field VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    action_type VARCHAR(50) NOT NULL,
    date_and_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    modifying_agent VARCHAR(255) NOT NULL
);


CREATE INDEX idx_crm_sessions_agent ON crm_sessions(agent_id);
CREATE INDEX idx_crm_sessions_expiry ON crm_sessions(expires_at);


-- Keep the delivery date synchronized through the order lifecycle.
CREATE OR REPLACE FUNCTION crm_propagate_delivery_date() RETURNS TRIGGER AS $$
BEGIN
    IF TG_TABLE_NAME = 'orders' THEN
        UPDATE follow_up_orders SET delivery_date = NEW.delivery_date WHERE order_id = NEW.order_id;
        UPDATE invoices i SET delivery_date = NEW.delivery_date
          WHERE i.order_id = NEW.order_id OR i.follow_up_orders_id IN
            (SELECT follow_up_orders_id FROM follow_up_orders WHERE order_id = NEW.order_id);
        UPDATE deliveries d SET delivery_date = NEW.delivery_date
          WHERE d.invoice_id IN (SELECT invoice_id FROM invoices
            WHERE order_id = NEW.order_id OR follow_up_orders_id IN
              (SELECT follow_up_orders_id FROM follow_up_orders WHERE order_id = NEW.order_id));
    ELSIF TG_TABLE_NAME = 'follow_up_orders' THEN
        UPDATE invoices SET delivery_date = NEW.delivery_date
          WHERE follow_up_orders_id = NEW.follow_up_orders_id;
        UPDATE deliveries SET delivery_date = NEW.delivery_date
          WHERE invoice_id IN (SELECT invoice_id FROM invoices
            WHERE follow_up_orders_id = NEW.follow_up_orders_id);
    ELSIF TG_TABLE_NAME = 'invoices' THEN
        UPDATE deliveries SET delivery_date = NEW.delivery_date WHERE invoice_id = NEW.invoice_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_delivery_date_sync
AFTER UPDATE OF delivery_date ON orders
FOR EACH ROW EXECUTE FUNCTION crm_propagate_delivery_date();

CREATE TRIGGER follow_up_orders_delivery_date_sync
AFTER UPDATE OF delivery_date ON follow_up_orders
FOR EACH ROW EXECUTE FUNCTION crm_propagate_delivery_date();

CREATE TRIGGER invoices_delivery_date_sync
AFTER UPDATE OF delivery_date ON invoices
FOR EACH ROW EXECUTE FUNCTION crm_propagate_delivery_date();

-- Keep delivery payment status aligned with its invoice, and complete linked orders
-- whenever a delivery is marked Paid in Full.
CREATE OR REPLACE FUNCTION crm_sync_delivery_payment_and_order() RETURNS TRIGGER AS $$
DECLARE
    linked_order_id INTEGER;
BEGIN
    IF TG_TABLE_NAME = 'invoices' THEN
        UPDATE deliveries
           SET payment_status = NEW.payment_status
         WHERE invoice_id = NEW.invoice_id;
        IF NEW.payment_status = 'Paid in Full' THEN
            linked_order_id := NEW.order_id;
            IF linked_order_id IS NULL AND NEW.follow_up_orders_id IS NOT NULL THEN
                SELECT order_id INTO linked_order_id
                  FROM follow_up_orders
                 WHERE follow_up_orders_id = NEW.follow_up_orders_id;
            END IF;
        END IF;
    ELSE
        SELECT i.order_id INTO linked_order_id
          FROM invoices i
         WHERE i.invoice_id = NEW.invoice_id;
        IF linked_order_id IS NULL THEN
            SELECT f.order_id INTO linked_order_id
              FROM invoices i
              JOIN follow_up_orders f ON f.follow_up_orders_id = i.follow_up_orders_id
             WHERE i.invoice_id = NEW.invoice_id;
        END IF;
        IF NEW.payment_status = 'Paid in Full' AND linked_order_id IS NOT NULL THEN
            UPDATE orders SET status = 'Order Complete' WHERE order_id = linked_order_id;
        END IF;
    END IF;

    IF TG_TABLE_NAME = 'invoices' AND NEW.payment_status = 'Paid in Full'
       AND linked_order_id IS NOT NULL THEN
        UPDATE orders SET status = 'Order Complete' WHERE order_id = linked_order_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invoices_sync_delivery_payment
AFTER UPDATE OF payment_status ON invoices
FOR EACH ROW EXECUTE FUNCTION crm_sync_delivery_payment_and_order();

CREATE TRIGGER deliveries_complete_linked_order_insert
AFTER INSERT ON deliveries
FOR EACH ROW EXECUTE FUNCTION crm_sync_delivery_payment_and_order();

CREATE TRIGGER deliveries_complete_linked_order_update
AFTER UPDATE OF payment_status ON deliveries
FOR EACH ROW EXECUTE FUNCTION crm_sync_delivery_payment_and_order();

-- 4. INDEXES FOR PERFORMANCE
CREATE INDEX idx_contact_people_farm ON contact_people(farm_name);
CREATE INDEX idx_orders_farm ON orders(farm_name);
CREATE INDEX idx_invoices_farm ON invoices(farm_name);
CREATE INDEX idx_deliveries_status ON deliveries(status);
CREATE INDEX idx_deliveries_invoice ON deliveries(invoice_id);
CREATE INDEX idx_revenues_delivered ON revenues(delivered_date);

-- 5. INITIAL SEED DATA
INSERT INTO crm_branding (id, company_name, tagline, subtitle)
VALUES (1, 'Mesina Farms', 'Orders, deliveries and follow-ups in one place.', 'Track every farm from first order to collected payment.')
ON CONFLICT (id) DO NOTHING;

-- The initial Admin account is provisioned securely by server.mjs using ADMIN_INITIAL_PASSWORD.
-- Seed Statuses and Methods
INSERT INTO opportunity_statuses (name, description) VALUES
('Accepted', 'Automatically creates an Order Entry'),
('Pending/Undecided', 'Potential Buy. Auto-creates a follow up inquiries entry tagged as Scheduled'),
('Negotiating', 'Under negotiation state'),
('Cancelled', 'No actions required. Close entry')
ON CONFLICT (name) DO NOTHING;

INSERT INTO fu_orders_statuses (name, description) VALUES
('Scheduled', 'Automated 24h follow-up queued in system'),
('Call Back Later', 'Client unavailable or requested a callback'),
('Inquiry Only', 'No actions required. Do not need to create a new Order Entry'),
('Cancelled', 'No actions required. Do not need to create a new Order Entry'),
('Quality Issue Reported', 'Customer complaint. Need immediate resolution'),
('Resolved', 'Complaint or issue settled'),
('Satisfied', 'Client content with explanation/remedy'),
('Continue with an Order', 'Automatically creates an Order Entry')
ON CONFLICT (name) DO NOTHING;

INSERT INTO fu_orders_method (name, description) VALUES
('Phone Call', 'Direct voice call via phone line'),
('SMS / Text', 'Mobile text notification'),
('Email', 'Formal email communication'),
('In-Person Visit', 'Farm inspection or on-site consultation')
ON CONFLICT (name) DO NOTHING;

INSERT INTO delivery_statuses (name, description) VALUES
('Pending', 'Waiting for logistics dispatch'),
('Out for Delivery', 'Truck en route to farm location'),
('Delivered', 'Shipment safely received on site'),
('Failed', 'Delivery could not be completed'),
('Rescheduled', 'Postponed for weather or logistics')
ON CONFLICT (name) DO NOTHING;

INSERT INTO payment_statuses (name, description) VALUES
('Pending', 'Awaiting payment confirmation'),
('Partially Paid', 'Initial installment or deposit received'),
('Paid in Full', 'Complete balance settled'),
('Cancelled', 'Payment voided'),
('Refunded', 'Payment credited back to farm')
ON CONFLICT (name) DO NOTHING;

INSERT INTO paymemt_methods (name, description) VALUES
('Cash on Delivery', 'Cash paid directly upon truck arrival'),
('Bank Transfer', 'Direct BDO/BPI/UnionBank wire'),
('GCash / Maya', 'Mobile wallet instant payment'),
('Check', 'Post-dated or clearing check')
ON CONFLICT (name) DO NOTHING;

-- Market prices intentionally start empty on a fresh installation; the market_price table is the sole fish pricing master.


-- Employee, attendance, obligations and expense tables
CREATE TABLE employees (
 id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, address TEXT, birthdate DATE, tin VARCHAR(80),
 work_location VARCHAR(255), role VARCHAR(120), is_active BOOLEAN NOT NULL DEFAULT true,
 hire_date DATE, end_date DATE, added_by_agent VARCHAR(255), hourly_rate NUMERIC(12,2) NOT NULL DEFAULT 0
);
CREATE TABLE attendance (
 id SERIAL PRIMARY KEY, employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
 time_in TIMESTAMPTZ NOT NULL, time_out TIMESTAMPTZ, notes TEXT, added_by_agent VARCHAR(255),
 CHECK (time_out IS NULL OR time_out >= time_in)
);
CREATE TABLE obligations_list (id SERIAL PRIMARY KEY, name VARCHAR(120) NOT NULL UNIQUE, description TEXT);
CREATE TABLE obligations (
 id SERIAL PRIMARY KEY, name VARCHAR(120) NOT NULL, cost NUMERIC(14,2) NOT NULL DEFAULT 0,
 date DATE NOT NULL DEFAULT CURRENT_DATE, receipt TEXT, company VARCHAR(255), notes TEXT,
 status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','paid')), added_by_agent VARCHAR(255)
);
CREATE TABLE farm_maintenance_list (id SERIAL PRIMARY KEY, name VARCHAR(120) NOT NULL UNIQUE, description TEXT);
CREATE TABLE farm_maintenance (
 id SERIAL PRIMARY KEY, name VARCHAR(120) NOT NULL, cost NUMERIC(14,2) NOT NULL DEFAULT 0,
 date DATE NOT NULL DEFAULT CURRENT_DATE, receipt TEXT, company VARCHAR(255),
 status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','paid')), notes TEXT, added_by_agent VARCHAR(255)
);
CREATE TABLE extra_expenses (
 id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, cost NUMERIC(14,2) NOT NULL DEFAULT 0,
 date DATE NOT NULL DEFAULT CURRENT_DATE, receipt TEXT, company VARCHAR(255),
 status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','paid')), description TEXT, added_by_agent VARCHAR(255)
);
INSERT INTO obligations_list(name) VALUES
 ('electricity'),('water'),('rent'),('vehicle insurance'),('vehicle registration'),
 ('business_registration'),('equipments'),('internet') ON CONFLICT(name) DO NOTHING;
INSERT INTO farm_maintenance_list(name) VALUES ('feeds'),('vitamins'),('rice grains') ON CONFLICT(name) DO NOTHING;
    CREATE VIEW weekly_attendance AS
      SELECT e.id AS employee_id,e.name AS employee_name,
      COALESCE(ROUND(SUM(EXTRACT(EPOCH FROM (a.time_out-a.time_in))/3600)::numeric,2),0) AS total_work_hours
      FROM employees e LEFT JOIN attendance a ON a.employee_id=e.id AND a.time_out IS NOT NULL
      AND a.time_in >= date_trunc('week',CURRENT_DATE) AND a.time_in < date_trunc('week',CURRENT_DATE)+interval '1 week'
      GROUP BY e.id,e.name;
    CREATE VIEW salaries AS
      SELECT e.id AS employee_id,e.name,e.hourly_rate AS rate,
      COALESCE(ROUND(SUM(EXTRACT(EPOCH FROM (a.time_out-a.time_in))/3600)::numeric,2),0) AS total_hours,
      COALESCE(ROUND(e.hourly_rate*SUM(EXTRACT(EPOCH FROM (a.time_out-a.time_in))/3600)::numeric,2),0) AS salary
      FROM employees e LEFT JOIN attendance a ON a.employee_id=e.id AND a.time_out IS NOT NULL
      AND a.time_in >= date_trunc('week',CURRENT_DATE) AND a.time_in < date_trunc('week',CURRENT_DATE)+interval '1 week'
      GROUP BY e.id,e.name,e.hourly_rate;
CREATE INDEX idx_attendance_employee_time ON attendance(employee_id,time_in);
CREATE INDEX idx_expenses_date ON obligations(date);
CREATE INDEX idx_maintenance_date ON farm_maintenance(date);
CREATE INDEX idx_extra_expenses_date ON extra_expenses(date);

COMMIT;
