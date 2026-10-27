import { connectToDatabase, closeDatabaseConnection } from '../config/db.js';
import { seedIdentityDatabase } from './seed-identity.js';
import { seedCatalogueAndRules } from './seed-catalogue-rules.js';

async function runSeed() {
  console.log('🌱 Starting database seeding...');
  const { db } = await connectToDatabase();
  
  await seedIdentityDatabase(db);
  console.log('✅ Identity, tenancy & patient synthetic fixtures seeded.');

  await seedCatalogueAndRules(db);
  console.log('✅ Medicine catalogue & illustrative clinical rules seeded.');

  await closeDatabaseConnection();
  console.log('🚀 Seeding complete.');
}

runSeed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
