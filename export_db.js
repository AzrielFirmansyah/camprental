// export_db.js - Script untuk export semua data dari MySQL lokal ke SQL file
const mysql = require('mysql2/promise');
const fs = require('fs');

const DB_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'camprental',
};

async function exportDatabase() {
  console.log('🔌 Connecting to local MySQL (Laragon)...');
  const conn = await mysql.createConnection(DB_CONFIG);
  console.log('✅ Connected!');

  let sql = `-- ============================================
-- Sewa Outdoor Sameton - Database Export
-- Exported: ${new Date().toISOString()}
-- Source: localhost (Laragon)
-- ============================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

`;

  const tables = [
    'users',
    'categories',
    'items',
    'item_statuses',
    'discounts',
    'payment_methods',
    'transactions',
    'transaction_items',
    'expenses',
  ];

  for (const table of tables) {
    console.log(`📦 Exporting table: ${table}...`);
    try {
      const [createRows] = await conn.query(`SHOW CREATE TABLE \`${table}\``);
      const createStmt = createRows[0]['Create Table'];

      sql += `\n-- ==============================\n`;
      sql += `-- Table: \`${table}\`\n`;
      sql += `-- ==============================\n`;
      sql += `DROP TABLE IF EXISTS \`${table}\`;\n`;
      sql += `${createStmt};\n\n`;

      const [rows] = await conn.query(`SELECT * FROM \`${table}\``);

      if (rows.length === 0) {
        sql += `-- (no data in ${table})\n\n`;
        continue;
      }

      const columns = Object.keys(rows[0]).map(c => `\`${c}\``).join(', ');
      const values = rows.map(row => {
        const vals = Object.values(row).map(v => {
          if (v === null || v === undefined) return 'NULL';
          if (typeof v === 'number') return v;
          if (v instanceof Date) return `'${v.toISOString().slice(0, 19).replace('T', ' ')}'`;
          return `'${String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
        });
        return `(${vals.join(', ')})`;
      });

      // Insert in batches of 50
      for (let i = 0; i < values.length; i += 50) {
        const batch = values.slice(i, i + 50);
        sql += `INSERT INTO \`${table}\` (${columns}) VALUES\n${batch.join(',\n')};\n\n`;
      }
      console.log(`  ✅ ${rows.length} rows exported`);
    } catch (err) {
      console.warn(`  ⚠️ Skipped ${table}: ${err.message}`);
      sql += `-- Skipped ${table}: ${err.message}\n\n`;
    }
  }

  sql += `\nSET FOREIGN_KEY_CHECKS = 1;\n`;
  sql += `-- ============================================\n`;
  sql += `-- Export complete!\n`;
  sql += `-- ============================================\n`;

  const filename = `camprental_export.sql`;
  fs.writeFileSync(filename, sql, 'utf8');
  console.log(`\n✅ Export complete! File saved: ${filename}`);
  console.log(`\n📋 NEXT STEPS:`);
  console.log(`   1. Go to https://railway.app and login with GitHub`);
  console.log(`   2. Create new project > Add a service > Database > MySQL`);
  console.log(`   3. In Railway MySQL, click "Query" tab`);
  console.log(`   4. Paste the entire contents of camprental_export.sql and run`);
  console.log(`   5. In Railway MySQL, copy the connection info (Public URL tab)`);
  console.log(`   6. In Vercel > Settings > Environment Variables, add:`);
  console.log(`      DB_HOST = <railway host>`);
  console.log(`      DB_USER = <railway user>`);
  console.log(`      DB_PASSWORD = <railway password>`);
  console.log(`      DB_NAME = railway`);
  console.log(`      DB_PORT = <railway port>`);
  console.log(`   7. In Vercel, go to Deployments > Redeploy`);

  await conn.end();
}

exportDatabase().catch(err => {
  console.error('❌ Export failed:', err.message);
  process.exit(1);
});
