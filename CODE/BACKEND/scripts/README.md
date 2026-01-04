# Scripts Directory

## Production Scripts

These scripts are safe to run in production and are part of the deployment process.

### `production/init_uid_counters.js`
Initializes UID counters for all 6 regions. **Run once** before starting the application for the first time.

```bash
node scripts/production/init_uid_counters.js
```

⚠️ **WARNING:** Only run on fresh installations or during controlled migrations with full backups.

### `production/migrate_region_system.js`
Migrates the database to the new region-based UID system.

```bash
node scripts/production/migrate_region_system.js
```

### `production/promote_superadmin.js`
Promotes a user to SUPERADMIN role.

```bash
node scripts/production/promote_superadmin.js <email>
```

---

## Development Scripts

These scripts are for development and testing purposes only.

### `development/create_seed_users.js`
Creates seed users for testing.

### `development/count_users.js`
Counts users in the database.

### `development/list_user_names.js`
Lists all usernames in the database.

---

## Archive

Old scripts, one-off fixes, and debugging tools are archived in `archive/`.

These scripts are kept for reference but should not be used in production.

---

## Usage Guidelines

1. **Production scripts** - Review carefully before running
2. **Development scripts** - Safe to run in dev environment
3. **Archive scripts** - Reference only, do not use

## Adding New Scripts

- Production scripts → `production/`
- Development/testing → `development/`
- One-off fixes → `archive/`
