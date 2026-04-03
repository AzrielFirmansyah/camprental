import mysql from 'mysql2/promise';

async function setupNewTables() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'camprental'
  });

  try {
    console.log('--- STARTING MANUAL DATABASE REPAIR ---');
    
    // Create discounts table
    console.log('Creating/Repairing table: discounts...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS discounts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        percentage INT NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create payment_methods table
    console.log('Creating/Repairing table: payment_methods...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS payment_methods (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Seed default payment methods if empty
    console.log('Checking for default payments...');
    const [rows]: any = await connection.query('SELECT COUNT(*) as count FROM payment_methods');
    if (rows[0].count === 0) {
      console.log('Seeding default payments (Cash, Transfer, QRIS)...');
      await connection.query("INSERT INTO payment_methods (name) VALUES ('Cash'), ('Transfer'), ('QRIS')");
    }

    console.log('--- REPAIR COMPLETE ---');
    console.log('Please RESTART your npm run dev now if issues persist.');
  } catch (err) {
    console.error('Error during database repair:', err.message);
  } finally {
    await connection.end();
  }
}

setupNewTables();
