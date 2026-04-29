const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const LOCAL_DB_HOSTS = new Set(['localhost', '127.0.0.1', '::1', 'postgres']);

function sslConfig(connectionString) {
    const explicit = (process.env.DB_SSL || process.env.PGSSLMODE || '').toLowerCase();

    if (['false', '0', 'disable', 'disabled', 'no'].includes(explicit)) {
        return false;
    }
    if (['true', '1', 'require', 'required', 'yes'].includes(explicit)) {
        return { rejectUnauthorized: false };
    }

    if (!connectionString) return false;

    try {
        const host = new URL(connectionString).hostname;
        return LOCAL_DB_HOSTS.has(host) ? false : { rejectUnauthorized: false };
    } catch {
        return { rejectUnauthorized: false };
    }
}

function createPool() {
    const connectionString = process.env.DATABASE_URL;

    if (connectionString) {
        return new Pool({
            connectionString,
            ssl: sslConfig(connectionString),
            max: Number(process.env.DB_POOL_MAX || 10),
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000,
        });
    }

    return new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT || 5432),
        database: process.env.DB_NAME || 'inservicehub',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
        ssl: sslConfig(),
        max: Number(process.env.DB_POOL_MAX || 10),
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
    });
}

function toPostgresQuery(sql) {
    let index = 0;
    return sql.replace(/\?/g, () => `$${++index}`);
}

function createDb(pool) {
    return {
        async get(sql, params = []) {
            const result = await pool.query(toPostgresQuery(sql), params);
            return result.rows[0];
        },

        async all(sql, params = []) {
            const result = await pool.query(toPostgresQuery(sql), params);
            return result.rows;
        },

        async run(sql, params = []) {
            return pool.query(toPostgresQuery(sql), params);
        },

        async exec(sql) {
            return pool.query(sql);
        },

        async close() {
            await pool.end();
        },
    };
}

async function initializeDatabase() {
    const pool = createPool();
    const db = createDb(pool);
    
    // Skip automatic schema migration on Vercel to avoid timeouts and multi-statement issues with poolers.
    if (!process.env.VERCEL) {
        try {
            const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
            await db.exec(schema);
        } catch (err) {
            console.error('⚠️ Schema migration skipped or failed:', err.message);
        }
    }

    await db.get('SELECT 1');
    console.log('✅ Connected to PostgreSQL database.');
    return db;
}


module.exports = {
    createDb,
    createPool,
    initializeDatabase,
};
