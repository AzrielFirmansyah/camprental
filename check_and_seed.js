import mysql from 'mysql2/promise';

const DB_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'camprental'
};

async function checkAndSeed() {
  const connection = await mysql.createConnection(DB_CONFIG);
  
  try {
    // Check categories table
    const [categories] = await connection.query('SELECT * FROM categories');
    console.log('Categories:', categories.length > 0 ? categories : 'EMPTY');
    
    // Check items table
    const [items] = await connection.query('SELECT * FROM items');
    console.log('Items:', items.length > 0 ? items : 'EMPTY');
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await connection.end();
  }
}

checkAndSeed();