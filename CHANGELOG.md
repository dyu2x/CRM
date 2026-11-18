# Changelog

## Version 2.07

- Disabled Truncate operational data by default; Admin must export CRM SQL data and the browser must confirm the download before the button becomes available.
- Enforced the backup-before-truncate requirement on the server with a single-use export confirmation consumed transactionally during truncation.
- Added `crm_backup_exports` to the single fresh-install SQL schema and runtime initialization for existing installations.
- Removed the PostgreSQL badge from the top-left CRM brand area and updated visible version labels and metadata to 2.07.

## Version 2.06

- Changed Create Order and Edit Order discounts to percentages from 0% to 100%; the CRM calculates the PHP discount amount from the subtotal and saves the discounted total.
- Added `discount_percent` to orders while retaining `discount` as the calculated PHP amount for invoice snapshots and backward compatibility with existing order records.
- Replaced the Revenues dollar icon with the Philippine peso icon in navigation, dashboard, and Revenues screens.
- Updated application, health endpoint, and fresh-install SQL version metadata to 2.06.
- Retained PostgreSQL relational synchronization in the fresh-install package.

## Verification notes

- Automated verification is recorded after packaging below.


## Version 2.04

- Moved per-table export permission checkboxes into each table row in Manage Access Restriction.
- Removed the separate Raw Data Export Permissions section and the Export restricted label.
- Kept Operations Overview visible-section controls unchanged.
- Changed JSON restore to validate the file, send the restored state to the authenticated PostgreSQL API, and wait for the database response before showing success.
- Restricted the client restore operation to Admin users and preserved existing database password hashes when imported agent records omit password values.
- Added `orderStatuses` to the persisted application-state key allowlist so the lookup list is saved and restored with the rest of the CRM state.
- Updated fresh-install metadata and database schema version comments.

## Verification notes

- `node --check server.mjs`: passed.
- `node --test tests/serverData.test.mjs`: 3 tests passed.
- Full TypeScript type-check and production build could not be run in the packaging environment because dependency installation did not complete.
- PostgreSQL schema execution and Docker integration tests could not be run because `psql` and Docker are not installed in the packaging environment.

## 2.08.1 - Post-login blank page fix
- Fixed an undefined `PhilippinePeso` React component reference in the sidebar expense navigation.
- Replaced the two sidebar currency icons with the existing Philippine peso text treatment so the sidebar can render immediately after authentication.
