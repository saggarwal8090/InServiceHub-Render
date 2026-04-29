const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const jwt = require('jsonwebtoken');

const { OAuth2Client } = require('google-auth-library');
const { initializeDatabase } = require('./db/postgres');
const { supabase } = require('./utils/supabase');

// Vercel handles environment variables automatically. 
// Only load dotenv manually if not running on Vercel.
if (!process.env.VERCEL) {
    require('dotenv').config({ path: path.join(__dirname, '../.env') });
}

const app = express();
const port = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
const isProduction = process.env.NODE_ENV === 'production';
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

// SECURITY: Warn if using default JWT secret in production
if (isProduction && JWT_SECRET === 'your_jwt_secret') {
    console.error('\n⚠️  WARNING: Using default JWT_SECRET in production is INSECURE!');
    console.error('   Set a strong JWT_SECRET environment variable before deploying.\n');
}

// ========== SECURITY MIDDLEWARE ==========

// Helmet — sets secure HTTP headers
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
}));

// Compression — gzip responses
app.use(compression());

// CORS — in production the SPA and API are on the same origin, so CORS is relaxed
// In development, allow known dev server origins
if (isProduction) {
    // In production, same-origin requests don't need CORS
    // But allow the configured CLIENT_URL if set (for separate frontend deploys)
    app.use(cors({
        origin: true,
        credentials: true,
    }));
} else {
    app.use(cors({
        origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
        credentials: true,
    }));
}

// Rate Limiting — prevent abuse
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { message: 'Too many login attempts. Please try again later.' },
});

app.use('/api/providers', apiLimiter);
app.use('/api/bookings', apiLimiter);
app.use('/api/login', authLimiter);
app.use('/api/register', authLimiter);
app.use('/api/auth/google', authLimiter);

// JSON parser with size limit
app.use(express.json({ limit: '10kb' }));

// ========== DATABASE ==========

let db;

let dbInstance = null;

async function initDb() {
    if (dbInstance) return dbInstance;
    try {
        dbInstance = await initializeDatabase();
        db = dbInstance; // Keep global 'db' updated for existing routes
        return dbInstance;
    } catch (err) {

        console.error('❌ Failed to connect to database:', err);
        // On Vercel, we don't want to process.exit(1) as it kills the function completely.
        // We let the error bubble up to the route handlers.
        throw err;
    }
}

// Lazy-load DB in middleware or use a helper to get DB
const getDb = async () => {
    if (!dbInstance) await initDb();
    return dbInstance;
};

// Initial connection attempt (swallow error so server still starts)
initDb().catch(() => {});

// Middleware to ensure DB is connected before handling requests
app.use(async (req, res, next) => {
    if (req.path === '/api/health') return next(); // Skip for health check
    try {
        await initDb();
        next();
    } catch (err) {
        console.error('Database middleware error:', err);
        res.status(500).json({ message: 'Server initialization error. Please try again in a few seconds.' });
    }
});



// ========== AUTH MIDDLEWARE ==========

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// ========== AUTH ROUTES ==========

const publicUserFields = `
    id, name, email, phone, role, city, is_online, auth_provider, avatar_url, created_at
`;

function makeAuthResponse(user, extra = {}) {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        city: user.city,
        is_online: user.is_online,
        auth_provider: user.auth_provider,
        avatar_url: user.avatar_url,
        ...extra,
    };
}

async function ensureProviderProfile(userId, serviceCategory) {
    const existingDetails = await db.get('SELECT id FROM provider_details WHERE user_id = ?', [userId]);

    if (!existingDetails) {
        await db.run(
            'INSERT INTO provider_details (user_id, service_category) VALUES (?, ?)',
            [userId, serviceCategory || null]
        );
    }

    if (serviceCategory) {
        const existingService = await db.get('SELECT id FROM services WHERE provider_id = ? LIMIT 1', [userId]);

        if (!existingService) {
            await db.run(
                'INSERT INTO services (provider_id, service_name, category, price) VALUES (?, ?, ?, ?)',
                [userId, serviceCategory, 'Home Services', 0]
            );
        }
    }
}

function issueToken(user) {
    return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
}

async function verifyGoogleCredential(credential) {
    if (!googleClient || !GOOGLE_CLIENT_ID) {
        const error = new Error('Google OAuth is not configured on the server.');
        error.status = 500;
        throw error;
    }

    const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    if (!payload?.email || payload.email_verified !== true) {
        const error = new Error('Google account email is not verified.');
        error.status = 400;
        throw error;
    }

    return {
        googleId: payload.sub,
        email: payload.email.toLowerCase().trim(),
        name: payload.name || payload.email.split('@')[0],
        avatarUrl: payload.picture || null,
    };
}

app.post('/api/register', async (req, res) => {
    const { name, email, password, role, city, phone, service_category } = req.body;
    try {
        // Input validation
        if (!name || !email || !password || !role) {
            return res.status(400).json({ message: 'Name, email, password, and role are required.' });
        }
        if (!['customer', 'provider'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role.' });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters.' });
        }

        const userCheck = await db.get('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
        if (userCheck) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const newUser = await db.get(
            `INSERT INTO users (name, email, password, role, city, phone, is_online, auth_provider)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             RETURNING ${publicUserFields}`,
            [name, email.toLowerCase().trim(), hashedPassword, role, city, phone, role === 'provider', 'password']
        );

        if (role === 'provider') {
            await ensureProviderProfile(newUser.id, service_category);
        }

        const token = issueToken(newUser);
        res.json({ token, user: makeAuthResponse(newUser, { service_category }) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error. Please try again.' });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }

        const user = await db.get('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        if (!user.password) {
            return res.status(400).json({ message: 'This account uses Google sign-in. Sign in with Google first, then set a password from your profile.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = issueToken(user);
        res.json({ token, user: makeAuthResponse(user) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error. Please try again.' });
    }
});

app.post('/api/auth/google', async (req, res) => {
    const { credential, role = 'customer', city, phone, service_category } = req.body;

    try {
        if (!credential) {
            return res.status(400).json({ message: 'Google credential is required.' });
        }

        if (!['customer', 'provider'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role.' });
        }

        const googleProfile = await verifyGoogleCredential(credential);
        let user = await db.get(
            'SELECT * FROM users WHERE google_id = ? OR email = ? LIMIT 1',
            [googleProfile.googleId, googleProfile.email]
        );

        if (user) {
            user = await db.get(
                `UPDATE users
                 SET google_id = COALESCE(google_id, ?),
                     auth_provider = CASE WHEN password IS NULL THEN 'google' ELSE 'both' END,
                     avatar_url = COALESCE(?, avatar_url)
                 WHERE id = ?
                 RETURNING ${publicUserFields}`,
                [googleProfile.googleId, googleProfile.avatarUrl, user.id]
            );
        } else {
            user = await db.get(
                `INSERT INTO users
                    (name, email, password, role, city, phone, is_online, auth_provider, google_id, avatar_url)
                 VALUES (?, ?, NULL, ?, ?, ?, ?, 'google', ?, ?)
                 RETURNING ${publicUserFields}`,
                [
                    googleProfile.name,
                    googleProfile.email,
                    role,
                    city || null,
                    phone || null,
                    role === 'provider',
                    googleProfile.googleId,
                    googleProfile.avatarUrl,
                ]
            );

            if (role === 'provider') {
                await ensureProviderProfile(user.id, service_category);
            }
        }

        const token = issueToken(user);
        res.json({ token, user: makeAuthResponse(user, { service_category }) });
    } catch (err) {
        console.error(err);
        res.status(err.status || 500).json({ message: err.status ? err.message : 'Google sign-in failed. Please try again.' });
    }
});

// ========== PUBLIC ROUTES ==========

app.get('/api/providers', async (req, res) => {
    const { city, service, online } = req.query;
    try {
        let query = `
        SELECT u.id, u.name, u.city, u.phone, u.is_online,
               pd.experience, pd.rating, pd.verified, pd.description, pd.total_reviews,
               s.service_name, s.price, s.id as service_id
        FROM users u
        JOIN provider_details pd ON u.id = pd.user_id
        LEFT JOIN services s ON u.id = s.provider_id
        WHERE u.role = 'provider'
      `;
        const params = [];

        if (city) {
            params.push(`%${city}%`);
            query += ` AND u.city ILIKE ?`;
        }
        if (service) {
            params.push(`%${service}%`);
            query += ` AND s.service_name ILIKE ?`;
        }
        if (online === 'true') {
            query += ` AND u.is_online = true`;
        }

        const rows = await db.all(query, params);
        res.json(rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error.' });
    }
});

app.get('/api/providers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const providerQuery = `
            SELECT u.id, u.name, u.city, u.phone, u.is_online,
                   pd.experience, pd.rating, pd.verified, pd.description, pd.total_reviews
            FROM users u
            JOIN provider_details pd ON u.id = pd.user_id
            WHERE u.id = ?
        `;
        const servicesQuery = `SELECT * FROM services WHERE provider_id = ?`;
        const reviewsQuery = `
            SELECT r.rating, r.comment, u.name as reviewer_name
            FROM reviews r
            JOIN bookings b ON r.booking_id = b.id
            JOIN users u ON b.customer_id = u.id
            WHERE b.provider_id = ?
        `;

        const provider = await db.get(providerQuery, [id]);
        if (!provider) return res.status(404).json({ message: 'Provider not found' });

        const services = await db.all(servicesQuery, [id]);
        const reviews = await db.all(reviewsQuery, [id]);

        res.json({ ...provider, services, reviews });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
});

// ========== PROTECTED ROUTES ==========

// GET PROFILE
app.get('/api/profile', authenticateToken, async (req, res) => {
    try {
        const user = await db.get(
            `SELECT id, name, email, phone, role, city, is_online, auth_provider, avatar_url,
                    created_at, password IS NOT NULL as has_password
             FROM users WHERE id = ?`,
            [req.user.id]
        );
        if (!user) return res.status(404).json({ message: 'User not found' });

        let providerDetails = null;
        let service = null;

        if (user.role === 'provider') {
            providerDetails = await db.get(
                'SELECT service_category, experience, description, rating, total_reviews, verified FROM provider_details WHERE user_id = ?',
                [req.user.id]
            );
            service = await db.get(
                'SELECT id, service_name, price FROM services WHERE provider_id = ? LIMIT 1',
                [req.user.id]
            );
        }

        let bookingCount = 0;
        if (user.role === 'customer') {
            const row = await db.get('SELECT COUNT(*) as count FROM bookings WHERE customer_id = ?', [req.user.id]);
            bookingCount = row.count;
        } else if (user.role === 'provider') {
            const row = await db.get('SELECT COUNT(*) as count FROM bookings WHERE provider_id = ?', [req.user.id]);
            bookingCount = row.count;
        }

        res.json({
            ...user,
            providerDetails,
            service,
            bookingCount: Number(bookingCount)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
});

// UPDATE PROFILE
app.put('/api/profile', authenticateToken, async (req, res) => {
    const { name, phone, city, experience, price, description, service_name } = req.body;
    try {
        await db.run(
            'UPDATE users SET name = ?, phone = ?, city = ? WHERE id = ?',
            [name, phone, city, req.user.id]
        );

        if (req.user.role === 'provider') {
            await db.run(
                'UPDATE provider_details SET experience = ?, description = ? WHERE user_id = ?',
                [experience || 0, description || null, req.user.id]
            );

            const existingService = await db.get('SELECT id FROM services WHERE provider_id = ? LIMIT 1', [req.user.id]);
            if (existingService) {
                await db.run(
                    'UPDATE services SET price = ?, service_name = ? WHERE id = ?',
                    [price || 0, service_name || null, existingService.id]
                );
            }
        }

        const updatedUser = await db.get(
            `SELECT ${publicUserFields} FROM users WHERE id = ?`,
            [req.user.id]
        );

        res.json({ message: 'Profile updated successfully', user: updatedUser });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
});

// CHANGE PASSWORD
app.put('/api/change-password', authenticateToken, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    try {
        const user = await db.get('SELECT password, google_id FROM users WHERE id = ?', [req.user.id]);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters' });
        }

        if (user.password) {
            const isMatch = await bcrypt.compare(currentPassword || '', user.password);
            if (!isMatch) {
                return res.status(400).json({ message: 'Current password is incorrect' });
            }
        }

        const hashed = await bcrypt.hash(newPassword, 12);
        await db.run(
            `UPDATE users
             SET password = ?,
                 auth_provider = CASE WHEN google_id IS NULL THEN 'password' ELSE 'both' END
             WHERE id = ?`,
            [hashed, req.user.id]
        );

        res.json({ message: user.password ? 'Password changed successfully' : 'Password set successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
});

// Toggle Online Status (Provider only)
app.put('/api/toggle-online', authenticateToken, async (req, res) => {
    if (req.user.role !== 'provider') return res.status(403).json({ message: 'Access denied' });
    try {
        const row = await db.get(
            'UPDATE users SET is_online = NOT is_online WHERE id = ? RETURNING is_online',
            [req.user.id]
        );
        res.json({ is_online: row.is_online });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
});

// BROADCAST BOOKING
app.post('/api/bookings', authenticateToken, async (req, res) => {
    const { provider_id, service_id, service_type, city, date, time, address, description } = req.body;
    try {
        if (!date || !time || !address) {
            return res.status(400).json({ message: 'Date, time, and address are required.' });
        }

        if (provider_id) {
            const newBooking = await db.get(
                'INSERT INTO bookings (customer_id, provider_id, service_id, date, time, address, description, service_type, city) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *',
                [req.user.id, provider_id, service_id, date, time, address, description, service_type || null, city || null]
            );
            res.json(newBooking);
        } else {
            const newBooking = await db.get(
                'INSERT INTO bookings (customer_id, provider_id, service_id, date, time, address, description, service_type, city, status) VALUES (?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?) RETURNING *',
                [req.user.id, date, time, address, description, service_type, city, 'pending']
            );
            res.json(newBooking);
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
});

// GET BOOKING REQUESTS (provider)
app.get('/api/booking-requests', authenticateToken, async (req, res) => {
    if (req.user.role !== 'provider') return res.status(403).json({ message: 'Access denied' });
    try {
        const provider = await db.get(`
            SELECT u.city, s.service_name
            FROM users u
            LEFT JOIN services s ON u.id = s.provider_id
            WHERE u.id = ?
        `, [req.user.id]);

        if (!provider) return res.json([]);

        const requests = await db.all(`
            SELECT b.*, u.name as customer_name, u.phone as customer_phone
            FROM bookings b
            JOIN users u ON b.customer_id = u.id
            WHERE b.provider_id IS NULL
              AND b.status = 'pending'
              AND LOWER(b.city) = LOWER(?)
              AND LOWER(b.service_type) = LOWER(?)
            ORDER BY b.created_at DESC
        `, [provider.city, provider.service_name]);

        res.json(requests);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
});

// ACCEPT A BOOKING REQUEST
app.put('/api/bookings/:id/accept', authenticateToken, async (req, res) => {
    if (req.user.role !== 'provider') return res.status(403).json({ message: 'Access denied' });
    const { id } = req.params;
    try {
        const booking = await db.get('SELECT * FROM bookings WHERE id = ? AND provider_id IS NULL AND status = ?', [id, 'pending']);
        if (!booking) {
            return res.status(400).json({ message: 'This request has already been accepted by another provider.' });
        }

        const service = await db.get('SELECT id FROM services WHERE provider_id = ? LIMIT 1', [req.user.id]);

        const updated = await db.get(
            'UPDATE bookings SET provider_id = ?, service_id = ?, status = ? WHERE id = ? RETURNING *',
            [req.user.id, service ? service.id : null, 'accepted', id]
        );

        res.json(updated);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
});

// Get Bookings (For both Customer and Provider)
app.get('/api/my-bookings', authenticateToken, async (req, res) => {
    try {
        if (req.user.role === 'customer') {
            const rows = await db.all(`
                SELECT b.*,
                       u.name as provider_name,
                       u.phone as provider_phone,
                       u.city as provider_city,
                       pd.rating as provider_rating,
                       pd.experience as provider_experience,
                       s.service_name,
                       s.price
                FROM bookings b
                LEFT JOIN users u ON b.provider_id = u.id
                LEFT JOIN provider_details pd ON b.provider_id = pd.user_id
                LEFT JOIN services s ON b.service_id = s.id
                WHERE b.customer_id = ?
                ORDER BY b.created_at DESC
            `, [req.user.id]);
            return res.json(rows);
        } else if (req.user.role === 'provider') {
            const rows = await db.all(`
                SELECT b.*, u.name as customer_name, u.phone as customer_phone, s.service_name, s.price
                FROM bookings b
                JOIN users u ON b.customer_id = u.id
                LEFT JOIN services s ON b.service_id = s.id
                WHERE b.provider_id = ?
                ORDER BY b.created_at DESC
            `, [req.user.id]);
            return res.json(rows);
        } else {
            const rows = await db.all(`SELECT * FROM bookings ORDER BY created_at DESC`);
            return res.json(rows);
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
});

// Update Booking Status
app.put('/api/bookings/:id/status', authenticateToken, async (req, res) => {
    const { status } = req.body;
    const { id } = req.params;

    if (!['pending', 'accepted', 'completed', 'cancelled'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status.' });
    }

    try {
        await db.run('UPDATE bookings SET status = ? WHERE id = ?', [status, id]);
        res.json({ message: 'Status updated' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
});

// Add Review
app.post('/api/reviews', authenticateToken, async (req, res) => {
    const { booking_id, rating, comment } = req.body;
    try {
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'Rating must be between 1 and 5.' });
        }

        const booking = await db.get('SELECT * FROM bookings WHERE id = ? AND customer_id = ?', [booking_id, req.user.id]);
        if (!booking) return res.status(400).json({ message: 'Invalid booking' });

        await db.run(
            'INSERT INTO reviews (booking_id, rating, comment) VALUES (?, ?, ?)',
            [booking_id, rating, comment]
        );

        // Update provider's average rating
        if (booking.provider_id) {
            const avgResult = await db.get(`
                SELECT AVG(r.rating) as avg_rating, COUNT(r.id) as total_reviews
                FROM reviews r
                JOIN bookings b ON r.booking_id = b.id
                WHERE b.provider_id = ?
            `, [booking.provider_id]);

            if (avgResult) {
                await db.run(
                    'UPDATE provider_details SET rating = ?, total_reviews = ? WHERE user_id = ?',
                    [Math.round(avgResult.avg_rating * 100) / 100, avgResult.total_reviews, booking.provider_id]
                );
            }
        }

        res.json({ message: 'Review added' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
    let supabaseStatus = 'unknown';
    try {
        const { data, error } = await supabase.from('users').select('id').limit(1);
        supabaseStatus = error ? `error: ${error.message}` : 'ok';
    } catch (err) {
        supabaseStatus = `error: ${err.message}`;
    }

    res.json({ 
        status: 'ok', 
        version: 'supabase-v1',
        supabase: supabaseStatus,
        timestamp: new Date().toISOString() 
    });

});


// ========== STATIC FILES (PRODUCTION) ==========

if (!process.env.VERCEL) {
    const clientDistPath = path.resolve(__dirname, '../client/dist');
    const indexPath = path.join(clientDistPath, 'index.html');

    // Serve static assets with aggressive caching (JS/CSS have hashed filenames)
    app.use(express.static(clientDistPath, {
        maxAge: isProduction ? '7d' : 0,
        etag: true,
        lastModified: true,
        setHeaders: (res, filePath) => {
            // Cache hashed assets forever, but HTML files should revalidate
            if (filePath.endsWith('.html')) {
                res.setHeader('Cache-Control', 'no-cache');
            }
        },
    }));

    // SPA catch-all for client-side routing
    // Only serve index.html for navigation requests (not for API routes or static assets)
    app.use((req, res, next) => {
        // Skip if not a GET request or doesn't accept HTML
        if (req.method !== 'GET' || !req.accepts('html')) return next();
        
        // Skip API-only paths (these are never frontend routes)
        const apiOnlyPaths = ['/api/', '/providers', '/toggle-online', '/my-bookings', 
                              '/booking-requests'];
        if (apiOnlyPaths.some(p => req.path.startsWith(p))) return next();
        
        // Skip static asset files (anything with a file extension)
        if (req.path.includes('.') || req.path.startsWith('/assets/') || req.path.startsWith('/images/')) return next();
        
        // Serve index.html for all other routes (React Router handles them)
        // This includes /login, /register, /search, /profile, /bookings, etc.
        if (fs.existsSync(indexPath)) {
            return res.sendFile(indexPath);
        }
        next();
    });
}

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    if (isProduction) {
        res.status(500).json({ message: 'Something went wrong. Please try again.' });
    } else {
        res.status(500).json({ message: err.message, stack: err.stack });
    }
});

if (require.main === module) {
    const server = app.listen(port, () => {
        console.log(`\n🚀 Server running on port ${port} [${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}]`);
        console.log(`   Frontend: http://localhost:${port}`);
        if (!isProduction) {
            console.log(`   API: http://localhost:${port}/api/health`);
        }
        console.log('');
    });

    // Graceful shutdown
    const gracefulShutdown = (signal) => {
        console.log(`\n${signal} received. Shutting down gracefully...`);
        server.close(() => {
            console.log('HTTP server closed.');
            if (db) {
                db.close().then(() => {
                    console.log('Database connection closed.');
                    process.exit(0);
                }).catch(() => process.exit(1));
            } else {
                process.exit(0);
            }
        });
        // Force close after 10 seconds
        setTimeout(() => {
            console.error('Forcing shutdown...');
            process.exit(1);
        }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

module.exports = app;
