const db = require('../db');
const { applySchema } = require('./seed/schema');
const { seedRBAC } = require('./seed/rbac');
const { createAdminUser } = require('./seed/admin');

const seedDatabase = async () => {
    const client = await db.getPool().connect();
    try {
        await client.query('BEGIN');
        
        console.log('Applying database schema...');
        await applySchema(client);
        
        console.log('Seeding roles and permissions...');
        await seedRBAC(client);
        
        console.log('Ensuring admin user exists...');
        await createAdminUser(client);
        
        await client.query('COMMIT');
        console.log('Database seeding completed successfully.');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Database seeding failed:', error);
    } finally {
        client.release();
    }
};

module.exports = { seedDatabase };
