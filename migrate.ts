// migrate.ts - Run once to migrate SQLite data to MySQL
// Usage: npx tsx migrate.ts

import sqlite3pkg from 'sqlite3';
import { open } from 'sqlite';
import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
  console.log('🔄 Starting migration from SQLite → MySQL...');

  // Connect SQLite
  const sqlite = await open({
    filename: path.join(__dirname, 'database.sqlite'),
    driver: sqlite3pkg.Database,
  });

  // Connect MySQL
  const mysql_conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  });

  const DB = process.env.DB_NAME || 'camprental';

  // Create DB and tables
  await mysql_conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB}\``);
  await mysql_conn.query(`USE \`${DB}\``);

  await mysql_conn.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL
    )
  `);

  await mysql_conn.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL
    )
  `);

  await mysql_conn.query(`
    CREATE TABLE IF NOT EXISTS items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      categoryId INT,
      dailyPrice DECIMAL(15,2) NOT NULL,
      weeklyPrice DECIMAL(15,2) NOT NULL,
      totalStock INT NOT NULL,
      availableStock INT NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'available'
    )
  `);

  await mysql_conn.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      userId INT,
      customerName VARCHAR(255) NOT NULL,
      customerPhone VARCHAR(100) NOT NULL,
      startDate VARCHAR(50) NOT NULL,
      endDate VARCHAR(50) NOT NULL,
      durationDays INT NOT NULL,
      totalAmount DECIMAL(15,2) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'active',
      paymentMethod VARCHAR(50) NOT NULL DEFAULT 'Cash',
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await mysql_conn.query(`
    CREATE TABLE IF NOT EXISTS transaction_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      transactionId INT,
      itemId INT,
      quantity INT NOT NULL,
      price DECIMAL(15,2) NOT NULL
    )
  `);

  await mysql_conn.query(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      description TEXT NOT NULL,
      amount DECIMAL(15,2) NOT NULL,
      date VARCHAR(50) NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('✅ Tables created in MySQL');

  // Migrate users
  const users = await sqlite.all('SELECT * FROM users');
  for (const u of users) {
    await mysql_conn.query(
      'INSERT IGNORE INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)',
      [u.id, u.name, u.email, u.password, u.role]
    );
  }
  console.log(`✅ Migrated ${users.length} users`);

  // Migrate categories
  const cats = await sqlite.all('SELECT * FROM categories');
  for (const c of cats) {
    await mysql_conn.query('INSERT IGNORE INTO categories (id, name) VALUES (?, ?)', [c.id, c.name]);
  }
  console.log(`✅ Migrated ${cats.length} categories`);

  // Migrate items
  const items = await sqlite.all('SELECT * FROM items');
  for (const i of items) {
    await mysql_conn.query(
      'INSERT IGNORE INTO items (id, name, categoryId, dailyPrice, weeklyPrice, totalStock, availableStock, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [i.id, i.name, i.categoryId, i.dailyPrice, i.weeklyPrice, i.totalStock, i.availableStock, i.status]
    );
  }
  console.log(`✅ Migrated ${items.length} items`);

  // Migrate transactions
  const txns = await sqlite.all('SELECT * FROM transactions');
  for (const t of txns) {
    await mysql_conn.query(
      'INSERT IGNORE INTO transactions (id, userId, customerName, customerPhone, startDate, endDate, durationDays, totalAmount, status, paymentMethod, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [t.id, t.userId, t.customerName, t.customerPhone, t.startDate, t.endDate, t.durationDays, t.totalAmount, t.status, t.paymentMethod || 'Cash', t.createdAt]
    );
  }
  console.log(`✅ Migrated ${txns.length} transactions`);

  // Migrate transaction_items
  const txItems = await sqlite.all('SELECT * FROM transaction_items');
  for (const ti of txItems) {
    await mysql_conn.query(
      'INSERT IGNORE INTO transaction_items (id, transactionId, itemId, quantity, price) VALUES (?, ?, ?, ?, ?)',
      [ti.id, ti.transactionId, ti.itemId, ti.quantity, ti.price]
    );
  }
  console.log(`✅ Migrated ${txItems.length} transaction items`);

  // Migrate expenses
  const expenses = await sqlite.all('SELECT * FROM expenses');
  for (const e of expenses) {
    await mysql_conn.query(
      'INSERT IGNORE INTO expenses (id, description, amount, date, createdAt) VALUES (?, ?, ?, ?, ?)',
      [e.id, e.description, e.amount, e.date, e.createdAt]
    );
  }
  console.log(`✅ Migrated ${expenses.length} expenses`);

  await mysql_conn.end();
  await sqlite.close();
  console.log('🎉 Migration complete! All data moved to MySQL camprental database.');
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
