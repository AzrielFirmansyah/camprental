// export_db.ts - Script untuk export semua data dari MySQL lokal ke SQL file
import mysql from 'mysql2/promise';
import fs from 'fs';

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

  let sql = `-- ============================================\n-- Sewa Outdoor Sameton - Database Export\n-- Exported: ${new Date().toISOString()}\n-- ============================================\n\nSET FOREIGN_KEY_CHECKS = 0;\nSET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";\nSET time_zone = "+00:00";\n\n`;

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
    console.log(`📦 Exporting: ${table}...`);
    try {
      const [createRows]: any = await conn.query(`SHOW CREATE TABLE \`${table}\``);
      const createStmt: string = createRows[0]['Create Table'];

      sql += `\n-- Table: ${table}\n`;
      sql += `DROP TABLE IF EXISTS \`${table}\`;\n`;
      sql += `${createStmt};\n\n`;

      const [rows]: any = await conn.query(`SELECT * FROM \`${table}\``);

      if (rows.length === 0) {
        sql += `-- (empty)\n\n`;
        continue;
      }

      const columns = Object.keys(rows[0]).map((c: string) => `\`${c}\``).join(', ');
      const values: string[] = rows.map((row: any) => {
        const vals = Object.values(row).map((v: any) => {
          if (v === null || v === undefined) return 'NULL';
          if (typeof v === 'number') return String(v);
          if (v instanceof Date) return `'${v.toISOString().slice(0, 19).replace('T', ' ')}'`;
          return `'${String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
        });
        return `(${vals.join(', ')})`;
      });

      for (let i = 0; i < values.length; i += 50) {
        const batch = values.slice(i, i + 50);
        sql += `INSERT INTO \`${table}\` (${columns}) VALUES\n${batch.join(',\n')};\n\n`;
      }
      console.log(`  ✅ ${rows.length} rows`);
    } catch (err: any) {
      console.warn(`  ⚠️ Skipped ${table}: ${err.message}`);
      sql += `-- Skipped: ${err.message}\n\n`;
    }
  }

  sql += `SET FOREIGN_KEY_CHECKS = 1;\n-- Export complete!\n`;

  fs.writeFileSync('camprental_export.sql', sql, 'utf8');
  console.log('\n✅ File saved: camprental_export.sql');
  console.log('\n📋 LANGKAH SELANJUTNYA:');
  console.log('   1. Buka https://railway.app, login dengan GitHub');
  console.log('   2. New Project > Add a service > Database > MySQL');
  console.log('   3. Klik MySQL service > Query tab');
  console.log('   4. Paste isi file camprental_export.sql > Run');
  console.log('   5. Klik Connect > salin connection string');
  console.log('   6. Buka Vercel > Settings > Environment Variables');
  console.log('   7. Tambahkan: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT');
  console.log('   8. Vercel > Deployments > klik Redeploy');

  await conn.end();
}

exportDatabase().catch(err => {
  console.error('❌ Export failed:', err.message);
  process.exit(1);
});
