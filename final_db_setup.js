import mysql from 'mysql2/promise';

const DB_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'camprental'
};

async function setup() {
  console.log('Starting Final Database Setup...');
  const connection = await mysql.createConnection(DB_CONFIG);

  try {
    // 1. Categories
    console.log('Checking categories table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL
      )
    `);

    // 2. Item Statuses
    console.log('Checking item_statuses table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS item_statuses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        color VARCHAR(50) DEFAULT 'stone',
        description TEXT
      )
    `);

    // Seed item statuses if empty
    const [statusRows] = await connection.query('SELECT COUNT(*) as count FROM item_statuses');
    if (statusRows[0].count === 0) {
      console.log('Seeding item statuses...');
      await connection.query(`
        INSERT INTO item_statuses (name, color, description) VALUES 
        ('Available', 'emerald', 'Unit ready for rental'),
        ('Maintenance', 'orange', 'Unit being repaired'),
        ('Out of Stock', 'red', 'No more units left'),
        ('Low Stock', 'amber', 'Few units remaining')
      `);
    }

    // 3. Discounts
    console.log('Checking discounts table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS discounts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        percentage INT NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 4. Payment Methods
    console.log('Checking payment_methods table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS payment_methods (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Seed payment methods if empty
    const [payRows] = await connection.query('SELECT COUNT(*) as count FROM payment_methods');
    if (payRows[0].count === 0) {
      console.log('Seeding payment methods...');
      await connection.query("INSERT INTO payment_methods (name) VALUES ('Cash'), ('Transfer'), ('QRIS')");
    }

    // 5. Transactions Table (ensure columns)
    console.log('Ensuring transactions table columns...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT,
        customerName VARCHAR(255) NOT NULL,
        customerPhone VARCHAR(50) NOT NULL,
        startDate DATE NOT NULL,
        endDate DATE NOT NULL,
        durationDays INT NOT NULL,
        subtotal DECIMAL(15,2) DEFAULT 0,
        discount INT DEFAULT 0,
        discountAmount DECIMAL(15,2) DEFAULT 0,
        totalAmount DECIMAL(15,2) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        paymentMethod VARCHAR(50) DEFAULT 'Cash',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Database Setup Completed Successfully!');
  } catch (error) {
    console.error('Setup Failed:', error.message);
  } finally {
    await connection.end();
  }
}

setup();
