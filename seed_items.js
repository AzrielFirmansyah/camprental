import mysql from 'mysql2/promise';

const DB_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'camprental'
};

async function seed() {
  console.log('--- SEEDING DATA ---');
  const connection = await mysql.createConnection(DB_CONFIG);

  try {
    // Check categories
    const [catRows] = await connection.query('SELECT COUNT(*) as count FROM categories');
    if (catRows[0].count === 0) {
      console.log('Seeding categories...');
      await connection.query(`
        INSERT INTO categories (name) VALUES 
        ('Tenda'),
        ('Alat Memasak'),
        ('Alat Penerangan'),
        (' Furniture'),
        ('Perlengkapan'),
        ('P3K & Safety'),
        ('Elektronik')
      `);
      console.log('Categories seeded!');
    } else {
      console.log('Categories already exist, skipping...');
    }

    // Get category IDs
    const [categories] = await connection.query('SELECT id, name FROM categories');
    const categoryMap = {};
    categories.forEach(c => { categoryMap[c.name.trim()] = c.id; });

    // Check items
    const [itemRows] = await connection.query('SELECT COUNT(*) as count FROM items');
    if (itemRows[0].count === 0) {
      console.log('Seeding items...');
      
      const items = [
        // Tenda
        { name: 'Tenda Dome 4 Orang', categoryId: categoryMap['Tenda'], dailyPrice: 75000, weeklyPrice: 450000, totalStock: 5 },
        { name: 'Tenda Dome 6 Orang', categoryId: categoryMap['Tenda'], dailyPrice: 120000, weeklyPrice: 700000, totalStock: 3 },
        { name: 'Tenda Kap hotel 8 orang', categoryId: categoryMap['Tenda'], dailyPrice: 250000, weeklyPrice: 1500000, totalStock: 2 },
        { name: 'Tenda Kerucut besar', categoryId: categoryMap['Tenda'], dailyPrice: 150000, weeklyPrice: 900000, totalStock: 3 },
        
        // Alat Memasak
        { name: 'Kompor Gas Portable', categoryId: categoryMap['Alat Memasak'], dailyPrice: 25000, weeklyPrice: 150000, totalStock: 8 },
        { name: 'Kompor Kayu', categoryId: categoryMap['Alat Memasak'], dailyPrice: 15000, weeklyPrice: 90000, totalStock: 5 },
        { name: 'Set Panci + Wajan', categoryId: categoryMap['Alat Memasak'], dailyPrice: 20000, weeklyPrice: 120000, totalStock: 6 },
        { name: 'Botol Gas 3kg', categoryId: categoryMap['Alat Memasak'], dailyPrice: 35000, weeklyPrice: 200000, totalStock: 10 },
        { name: 'Rice Cooker', categoryId: categoryMap['Alat Memasak'], dailyPrice: 30000, weeklyPrice: 180000, totalStock: 4 },
        { name: 'Termos Air', categoryId: categoryMap['Alat Memasak'], dailyPrice: 10000, weeklyPrice: 60000, totalStock: 10 },
        
        // Alat Penerangan
        { name: 'Lampu Sentel 50W', categoryId: categoryMap['Alat Penerangan'], dailyPrice: 15000, weeklyPrice: 90000, totalStock: 10 },
        { name: 'Lampu LED Room', categoryId: categoryMap['Alat Penerangan'], dailyPrice: 10000, weeklyPrice: 60000, totalStock: 15 },
        { name: 'Torus 400W', categoryId: categoryMap['Alat Penerangan'], dailyPrice: 20000, weeklyPrice: 120000, totalStock: 6 },
        { name: 'Lampu Emergency', categoryId: categoryMap['Alat Penerangan'], dailyPrice: 5000, weeklyPrice: 30000, totalStock: 8 },
        
        // Furniture
        { name: 'Meja Lipat Portable', categoryId: categoryMap['Furniture'], dailyPrice: 25000, weeklyPrice: 150000, totalStock: 10 },
        { name: 'Kursi Lipat', categoryId: categoryMap['Furniture'], dailyPrice: 10000, weeklyPrice: 60000, totalStock: 30 },
        { name: 'Kasur Minimalis', categoryId: categoryMap['Furniture'], dailyPrice: 30000, weeklyPrice: 180000, totalStock: 8 },
        { name: 'Guling', categoryId: categoryMap['Furniture'], dailyPrice: 5000, weeklyPrice: 30000, totalStock: 10 },
        { name: 'Bantal', categoryId: categoryMap['Furniture'], dailyPrice: 5000, weeklyPrice: 30000, totalStock: 15 },
        
        // Perlengkapan
        { name: 'Sleeping Bag', categoryId: categoryMap['Perlengkapan'], dailyPrice: 20000, weeklyPrice: 120000, totalStock: 12 },
        { name: 'Matras', categoryId: categoryMap['Perlengkapan'], dailyPrice: 15000, weeklyPrice: 90000, totalStock: 15 },
        { name: 'Jaket Outdoor', categoryId: categoryMap['Perlengkapan'], dailyPrice: 15000, weeklyPrice: 90000, totalStock: 10 },
        { name: 'Tas Ransel 40L', categoryId: categoryMap['Perlengkapan'], dailyPrice: 20000, weeklyPrice: 120000, totalStock: 6 },
        { name: 'Raincoat', categoryId: categoryMap['Perlengkapan'], dailyPrice: 10000, weeklyPrice: 60000, totalStock: 15 },
        { name: 'Sepatu Boots', categoryId: categoryMap['Perlengkapan'], dailyPrice: 15000, weeklyPrice: 90000, totalStock: 8 },
        { name: 'Flysheet / Tarp', categoryId: categoryMap['Perlengkapan'], dailyPrice: 25000, weeklyPrice: 150000, totalStock: 5 },
        
        // P3K & Safety
        { name: 'P3K First Aid Kit', categoryId: categoryMap['P3K & Safety'], dailyPrice: 10000, weeklyPrice: 60000, totalStock: 5 },
        { name: 'APAR', categoryId: categoryMap['P3K & Safety'], dailyPrice: 50000, weeklyPrice: 300000, totalStock: 3 },
        { name: 'Safety Vest', categoryId: categoryMap['P3K & Safety'], dailyPrice: 5000, weeklyPrice: 30000, totalStock: 20 },
        
        // Elektronik
        { name: 'Power Bank 20000mAh', categoryId: categoryMap['Elektronik'], dailyPrice: 15000, weeklyPrice: 90000, totalStock: 8 },
        { name: 'Speaker BT Portable', categoryId: categoryMap['Elektronik'], dailyPrice: 25000, weeklyPrice: 150000, totalStock: 4 },
        { name: 'Kamera Action', categoryId: categoryMap['Elektronik'], dailyPrice: 50000, weeklyPrice: 300000, totalStock: 2 },
      ];

      for (const item of items) {
        await connection.query(
          'INSERT INTO items (name, categoryId, dailyPrice, weeklyPrice, totalStock, availableStock) VALUES (?, ?, ?, ?, ?, ?)',
          [item.name, item.categoryId, item.dailyPrice, item.weeklyPrice, item.totalStock, item.totalStock]
        );
      }
      console.log(`Seeded ${items.length} items!`);
    } else {
      console.log('Items already exist, skipping...');
    }

    console.log('--- SEEDING COMPLETE ---');
  } catch (error) {
    console.error('SEED ERROR:', error.message);
  } finally {
    await connection.end();
  }
}

seed();