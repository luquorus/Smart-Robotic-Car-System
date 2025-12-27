import dotenv from 'dotenv';
import { connectMongo, getDb, closeMongo } from './mongo.js';
import { hashPassword } from './auth.js';

dotenv.config();

const DEFAULT_ADMIN_USERNAME = process.env.DEFAULT_ADMIN_USERNAME || 'admin';
const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
const DEFAULT_ADMIN_EMAIL = process.env.DEFAULT_ADMIN_EMAIL || null;

async function initAdmin() {
  try {
    console.log('[Init Admin] Connecting to MongoDB...');
    await connectMongo();

    const db = getDb();
    const usersCollection = db.collection('users');

    // Check if admin user exists
    const existingAdmin = await usersCollection.findOne({ username: DEFAULT_ADMIN_USERNAME });
    
    if (existingAdmin) {
      console.log(`[Init Admin] Admin user '${DEFAULT_ADMIN_USERNAME}' already exists. Skipping creation.`);
      await closeMongo();
      process.exit(0);
    }

    // Create admin user
    console.log(`[Init Admin] Creating admin user '${DEFAULT_ADMIN_USERNAME}'...`);
    const hashedPassword = await hashPassword(DEFAULT_ADMIN_PASSWORD);

    const adminUser = {
      username: DEFAULT_ADMIN_USERNAME,
      password: hashedPassword,
      email: DEFAULT_ADMIN_EMAIL,
      role: 'admin',
      created_at: new Date(),
      updated_at: new Date(),
    };

    const result = await usersCollection.insertOne(adminUser);

    console.log(`[Init Admin] Admin user created successfully!`);
    console.log(`[Init Admin] Username: ${DEFAULT_ADMIN_USERNAME}`);
    console.log(`[Init Admin] Password: ${DEFAULT_ADMIN_PASSWORD}`);
    console.log(`[Init Admin] User ID: ${result.insertedId}`);
    console.log(`[Init Admin] Please change the default password after first login!`);

    await closeMongo();
    process.exit(0);
  } catch (error) {
    console.error('[Init Admin] Error:', error);
    await closeMongo();
    process.exit(1);
  }
}

initAdmin();

