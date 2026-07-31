const { initDatabase, getPool, seedDefaultUsers } = require('../config/database');

async function runStandaloneSeeder() {
  console.log('🌱 Starting standalone database seeder...');
  await initDatabase();
  const pool = getPool();
  await seedDefaultUsers(pool);
  console.log('✅ Seeding completed successfully!');
  process.exit(0);
}

runStandaloneSeeder();
