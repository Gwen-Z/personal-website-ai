// @ts-check
import { createClient } from '@libsql/client';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// --- Enhanced Debugging Version ---

// ES Module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });

// --- Configuration ---
const TABLES_TO_SYNC = ['simple_records', 'raw_entries'];
const LOCAL_DB_PATH = path.resolve(__dirname, '../backend/records.db');

// --- Main Function ---
async function syncFromTursoToLocal() {
  console.log('🚀 [V2] Starting data sync from Turso to local...');

  // 1. Check Environment Variables
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;

  if (!tursoUrl || !tursoToken) {
    console.error('❌ FATAL: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set in CLOUD_VERSION/backend/.env');
    process.exit(1);
  }
  console.log('  ✅ Environment variables loaded.');

  let localDb;

  try {
    // 2. Connect to Databases
    console.log('\n--- Step 1: Connecting to databases ---');
    console.log(`- Local DB Path: ${LOCAL_DB_PATH}`);
    localDb = await open({ filename: LOCAL_DB_PATH, driver: sqlite3.Database });
    console.log('  ✅ Local database connected successfully.');

    console.log(`- Turso DB URL: ${tursoUrl.replace(/\.(.*)@/, '.<hidden>@')}`);
    const tursoDb = createClient({ url: tursoUrl, authToken: tursoToken });
    console.log('  ✅ Turso database client created.');

    // 3. Sync each table
    console.log('\n--- Step 2: Syncing tables ---');
    for (const tableName of TABLES_TO_SYNC) {
      console.log(`\n🔄 Processing table: ${tableName}`);

      // a. Fetch from Turso
      let tursoRows, tursoColumns;
      try {
        console.log(`  - Downloading data from Turso...`);
        const tursoResult = await tursoDb.execute(`SELECT * FROM ${tableName}`);
        tursoRows = tursoResult.rows;
        tursoColumns = tursoResult.columns;
        console.log(`    Downloaded ${tursoRows.length} rows.`);
      } catch (e) {
        console.error(`❌ FATAL: Failed to fetch data from Turso for table '${tableName}'.`);
        console.error('  - Possible causes: Table does not exist on Turso, or network issue.');
        throw e;
      }

      if (tursoRows.length === 0) {
        console.log(`  - Skipping sync as there is no data in Turso's '${tableName}' table.`);
        continue;
      }

      // b. Find common columns
      const localColumnsInfo = await localDb.all(`PRAGMA table_info(${tableName})`);
      const localColumns = localColumnsInfo.map(col => col.name);
      const commonColumns = tursoColumns.filter(col => localColumns.includes(col));
      console.log(`  - Found ${commonColumns.length} common columns to sync.`);
      if (commonColumns.length === 0) {
        console.warn(`  - WARNING: No common columns found between local and remote for table '${tableName}'. Skipping.`);
        continue;
      }

      // c. Clear local table
      console.log(`  - Clearing local table...`);
      await localDb.exec(`DELETE FROM ${tableName}`);
      await localDb.exec(`DELETE FROM sqlite_sequence WHERE name='${tableName}'`);
      console.log(`    Local table cleared.`);

      // d. Batch insert into local DB
      console.log(`  - Writing ${tursoRows.length} rows to local database...`);
      const placeholders = commonColumns.map(() => '?').join(', ');
      const insertSql = `INSERT INTO ${tableName} (${commonColumns.join(', ')}) VALUES (${placeholders})`;

      await localDb.exec('BEGIN TRANSACTION');
      try {
        const stmt = await localDb.prepare(insertSql);
        for (const row of tursoRows) {
          const values = commonColumns.map(colName => row[colName]);
          await stmt.run(values);
        }
        await stmt.finalize();
        await localDb.exec('COMMIT');
        console.log(`  ✅ Table '${tableName}' synced successfully!`);
      } catch (e) {
        console.error(`❌ FATAL: Failed to write data to local table '${tableName}'. Rolling back.`);
        await localDb.exec('ROLLBACK');
        throw e;
      }
    }

    console.log('\n🎉 Sync complete! All tables are up to date.');

  } catch (error) {
    console.error('\n--- ❌ An error occurred during synchronization ---');
    console.error('Error Message:', error.message);
    console.error('Stack Trace:', error.stack);
    process.exit(1);
  } finally {
    if (localDb) {
      await localDb.close();
      console.log('\n- Local database connection closed.');
    }
  }
}

syncFromTursoToLocal();
