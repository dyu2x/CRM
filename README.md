# Mesina Farms CRM — Fresh Installation

Complete Mesina Farms CRM application for Ubuntu Server using Docker Compose and PostgreSQL 16.

**Current release: 2.07**

## Requirements

- Ubuntu Server 22.04 or 24.04 LTS
- Docker Engine and Docker Compose plugin
- At least 2 CPU cores, 2 GB RAM, and 20 GB available storage

## Installation

1. Copy the complete project folder to the server.
2. Create the environment file:

   ```bash
   cp .env.example .env
   nano .env
   chmod 600 .env
   ```

3. Set unique values for `POSTGRES_PASSWORD`, `JWT_SECRET`, and `ADMIN_INITIAL_PASSWORD`. The administrator password must be at least 12 characters.
4. Start the application:

   ```bash
   docker compose up -d --build
   ```

5. Check service status:

   ```bash
   docker compose ps
   docker compose logs -f crm_app
   ```

The first database initialization automatically executes the single schema file at `scripts/postgresql_crm.sql`. The initial administrator username is `admin`; its password is the value configured in `ADMIN_INITIAL_PASSWORD`.

## Database

- `scripts/postgresql_crm.sql` is the only SQL file included for database initialization.
- It defines the complete schema for a new, empty PostgreSQL database.
- Docker executes it automatically when the PostgreSQL data volume is created for the first time.
- The application stores its core CRM state in `crm_state.state` (JSONB). Expense, attendance, authentication, and other dedicated server-side modules use their respective relational tables.
- Do not edit the database directly while the application is running.

**Fresh installation only:** this package initializes a new database. It is not an in-place database upgrade package. Never run the fresh-install SQL against a populated database.

To deliberately erase the existing Compose database and initialize a clean one, first make and verify a backup, then run:

```bash
docker compose down -v
docker compose up -d --build
```

`docker compose down -v` permanently deletes all data in the Compose PostgreSQL volume.

## Data exports and invoice printing

- Table export controls provide CSV, PDF, and XLSX downloads, plus JSON, TSV, and XML. Choose the format from the dropdown and use the adjacent download-icon button.
- Exports include the complete filtered result set, including rows on other pagination pages.
- Export access is controlled per table by the role's table access and Export Data permissions. Administrators have export access by default; all non-admin roles start with export disabled until an administrator enables individual tables.
- Operations Overview sections can be granted or restricted independently by role.
- Export permission checkboxes appear inline on each table row in Manage Access Restriction. Operations Overview visibility controls remain unchanged.
- The invoice Print action opens the system print dialog. Select a locally connected or network printer configured on the computer running the browser.

## Roles and access

- **Admin** has full access and manages roles, table access, and export permissions.
- **Manager** can manage permitted ordinary agent accounts but cannot access Admin or Manager accounts or assign those roles.
- Other roles can access only the pages and tables granted by Admin.
- Access rules are enforced by the application API as well as the interface.

## Backups and restore

Use the included scripts:

```bash
./scripts/backup.sh
CONFIRM_RESTORE=YES ./scripts/restore.sh ./backups/your_backup.sql
```

The restore script requires explicit confirmation and creates a pre-restore backup before applying the selected dump.

## Operations

```bash
docker compose ps
docker compose restart crm_app
docker compose logs -f crm_app
```

The application is available on the port configured by `APP_PORT` in `.env` (default `3000`).


## Version 2.07 release notes

- Create Order and Edit Order now accept a discount percentage (0–100%). The CRM calculates the discount amount from the subtotal and displays the final discounted total.
- Orders retain the calculated discount amount in PHP and also save the percentage in `discount_percent`, keeping invoice totals and historical discount amounts consistent.
- The Revenues icon now uses the Philippine peso symbol.
- The single fresh-install PostgreSQL schema includes the `discount_percent` field. Existing v2.05 databases receive the new column safely at application startup.

## Version 2.04 update notes

- Replaced separate export format buttons with a format dropdown and compact download icon.
- Added JSON, TSV, and XML export formats alongside CSV, PDF, and XLSX.
- Added per-role visibility settings for Operations Overview sections.
- Moved each table's export permission checkbox into its corresponding Manage Access Restriction row; removed the separate Raw Data Export Permissions section.
- The existing `scripts/postgresql_crm.sql` remains the complete fresh-install schema; no manual SQL migration is required for a new installation.


## JSON backup restore behavior

- JSON restore is an authenticated Admin-only workflow.
- The browser validates the backup, submits the restored state to `PUT /api/state`, and waits for the PostgreSQL API response before showing success.
- The API applies the normal server-side validations and writes the restored application state to `crm_state.state` (JSONB), with an audit event. Existing agent password hashes are retained when imported account records do not contain a password hash.
- A failed API/database write is reported as a failed restore; the UI does not report success merely because browser state changed.
- The JSON backup format covers the CRM application-state collections stored in `crm_state.state` and the agent records mirrored to `agents`. Dedicated expense, attendance, session, login-throttle, and audit-event tables are outside this JSON snapshot. For a complete PostgreSQL database image, use the SQL backup/restore scripts above; they use `pg_dump`/`psql` and include the dedicated relational tables.


## SQL backup, restore, and PostgreSQL visibility (v2.07)

The Admin > Database Backup & Restore controls now export and import `.sql` backups. The exported SQL is executable in pgAdmin 4 Query Tool against the CRM database; the WebUI importer accepts the same CRM-generated SQL file. Legacy JSON backups are still accepted by the WebUI for backward compatibility.

The application currently uses `crm_state.state` (JSONB) as its authoritative persisted application document. To make individual records easy to inspect in pgAdmin 4, v2.07 also maintains `crm_state_records`, with one row per collection record and its original object in the `data` JSONB column. Query it with, for example:

```sql
SELECT record_key, data
FROM crm_state_records
WHERE table_name = 'orders'
ORDER BY record_key;
```

This mirror is deliberately separate from the older normalized operational tables in the schema; those legacy tables are not the application's write path. The actual CRM data is persisted in `crm_state` and mirrored to `crm_state_records` transactionally. Do not expect inserts to appear in legacy tables such as `orders` until a dedicated normalized-schema migration is performed.

## Version 2.07 security update

- Truncate operational data is disabled until an Admin completes an SQL backup export. The application confirms the browser download with the server, and the server independently checks and consumes that confirmation inside the truncate transaction.
- A confirmed export is single-use for truncation; after a successful truncate, another SQL export is required.
- Removed the PostgreSQL badge from the top-left brand area and updated release labels to 2.07.
- Added `crm_backup_exports` to the single fresh-install SQL schema.

### Role synchronization (v2.08.2)

`crm_state.rolePermissions` is the canonical role registry used by Status & Lookups → Roles, Agents → Add/Edit Agent → System Role, and Settings → Manage Access Restrictions. Create, rename, or delete roles from the Roles screen; the agent role selectors and access-restrictions editor read from that same registry. Access permissions remain attached to each role in `rolePermissions`.
