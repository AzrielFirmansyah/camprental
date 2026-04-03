import sqlite3pkg from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

const __dirname = path.resolve();

async function check() {
  try {
    const db = await open({
      filename: path.join(__dirname, 'database.sqlite'),
      driver: sqlite3pkg.Database,
    });
    
    console.log('✅ Connected to database.sqlite');
    
    // Check tables
    const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table'");
    console.log('Tables:', tables.map(t => t.name).join(', '));
    
    // Check item_statuses
    if (tables.map(t => t.name).includes('item_statuses')) {
      const statuses = await db.all("SELECT * FROM item_statuses");
      console.log('Item Statuses count:', statuses.length);
      console.log('Sample:', JSON.stringify(statuses[0]));
    } else {
      console.log('❌ item_statuses table MISSING');
    }
    
    // Check categories
    const categories = await db.all("SELECT * FROM categories");
    console.log('Categories count:', categories.length);
    
    await db.close();
  } catch (err) {
    console.error('❌ DB Check failed:', err);
  }
}

check();
