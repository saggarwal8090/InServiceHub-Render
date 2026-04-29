const { initializeDatabase } = require('./postgres');

async function checkDb() {
    const db = await initializeDatabase();
    const tables = await db.all(`
        SELECT table_name as name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name
    `);
    console.log('Tables:', tables.map(t => t.name));
    await db.close();
}

checkDb();
