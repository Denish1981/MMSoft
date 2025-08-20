

const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const { GoogleGenAI } = require('@google/genai');
const { OAuth2Client } = require('google-auth-library');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// --- Middleware ---
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '50mb' }));
app.set('trust proxy', 1);

// --- AI & Auth Setup ---
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const googleClient = new OAuth2Client();

// --- RBAC Data and Seeding ---
const ALL_PERMISSIONS = [
    { name: 'page:dashboard:view', description: 'Can view the main dashboard' },
    { name: 'page:contributions:view', description: 'Can view the contributions page' },
    { name: 'page:bulk-add:view', description: 'Can view the bulk add page' },
    { name: 'page:donors:view', description: 'Can view the donors page' },
    { name: 'page:sponsors:view', description: 'Can view the sponsors page' },
    { name: 'page:vendors:view', description: 'Can view the vendors page' },
    { name: 'page:expenses:view', description: 'Can view the expenses page' },
    { name: 'page:quotations:view', description: 'Can view the quotations page' },
    { name: 'page:budget:view', description: 'Can view the budget page' },
    { name: 'page:campaigns:view', description: 'Can view the campaigns page' },
    { name: 'page:festivals:view', description: 'Can view the festivals page' },
    { name: 'page:tasks:view', description: 'Can view the tasks page' },
    { name: 'page:reports:view', description: 'Can view the reports page' },
    { name: 'page:ai-insights:view', description: 'Can view the AI insights page' },
    { name: 'page:user-management:view', description: 'Can view the user management page' },
    { name: 'page:archive:view', description: 'Can view and restore archived items' },
    { name: 'action:create', description: 'Can create new items (contributions, expenses, etc.)' },
    { name: 'action:edit', description: 'Can edit existing items' },
    { name: 'action:delete', description: 'Can archive items' },
    { name: 'action:restore', description: 'Can restore archived items' },
    { name: 'action:users:manage', description: 'Can create users and manage their roles' },
];

const ROLES_CONFIG = {
    'Admin': ALL_PERMISSIONS.map(p => p.name),
    'Manager': [
        'page:dashboard:view', 'page:contributions:view', 'page:bulk-add:view',
        'page:donors:view', 'page:sponsors:view', 'page:vendors:view', 'page:expenses:view',
        'page:quotations:view', 'page:budget:view', 'page:campaigns:view', 'page:festivals:view', 'page:tasks:view', 'page:reports:view', 'page:ai-insights:view',
        'page:archive:view',
        'action:create', 'action:edit', 'action:delete', 'action:restore'
    ],
    'Viewer': [
        'page:dashboard:view', 'page:contributions:view', 'page:donors:view',
        'page:sponsors:view', 'page:vendors:view', 'page:expenses:view',
        'page:quotations:view', 'page:budget:view', 'page:campaigns:view', 'page:festivals:view', 'page:tasks:view', 'page:reports:view', 'page:ai-insights:view'
    ]
};

const createHistoryTable = (client, tableName, mainTableName, mainTableIdType = 'INTEGER') => {
    return client.query(`
        CREATE TABLE IF NOT EXISTS ${tableName} (
            id SERIAL PRIMARY KEY,
            record_id ${mainTableIdType} NOT NULL REFERENCES ${mainTableName}(id) ON DELETE CASCADE,
            field_changed VARCHAR(255) NOT NULL,
            old_value TEXT,
            new_value TEXT,
            changed_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    `);
}

const seedDatabase = async () => {
    const client = await db.getPool().connect();
    try {
        await client.query('BEGIN');
        console.log('Seeding database with roles and permissions...');

        // Base table checks...
        const tablesToTimestamp = ['sponsors', 'vendors', 'expenses', 'quotations', 'budgets', 'festivals', 'campaigns', 'tasks', 'contributions'];
        for (const table of tablesToTimestamp) {
            await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
            await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
            await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;`);
        }
        await client.query(`ALTER TABLE sponsors ADD COLUMN IF NOT EXISTS date_paid DATE;`);
        
        // Ensure image tables have created_at for sorting cover images
        await client.query(`ALTER TABLE expense_images ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();`);
        await client.query(`ALTER TABLE quotation_images ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();`);
        
        // Create dedicated festival photos table
        await client.query(`
            CREATE TABLE IF NOT EXISTS festival_photos (
                id SERIAL PRIMARY KEY,
                festival_id INTEGER NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
                image_data TEXT NOT NULL,
                caption VARCHAR(255),
                uploaded_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);
        // Add the column if it doesn't exist for backward compatibility
        await client.query(`ALTER TABLE festival_photos ADD COLUMN IF NOT EXISTS uploaded_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;`);


        // History tables
        await createHistoryTable(client, 'contributions_history', 'contributions');
        await createHistoryTable(client, 'sponsors_history', 'sponsors');
        await createHistoryTable(client, 'vendors_history', 'vendors');
        await createHistoryTable(client, 'expenses_history', 'expenses');
        await createHistoryTable(client, 'quotations_history', 'quotations');
        await createHistoryTable(client, 'budgets_history', 'budgets');
        await createHistoryTable(client, 'festivals_history', 'festivals');
        await createHistoryTable(client, 'task_history', 'tasks', 'INTEGER');

        const permissionMap = new Map();
        for (const perm of ALL_PERMISSIONS) {
            const res = await client.query('INSERT INTO permissions (name, description) VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET description = $2 RETURNING id, name', [perm.name, perm.description]);
            permissionMap.set(res.rows[0].name, res.rows[0].id);
        }

        for (const roleName in ROLES_CONFIG) {
            const roleRes = await client.query('INSERT INTO roles (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING id', [roleName]);
            if (roleRes.rows.length > 0) {
                const roleId = roleRes.rows[0].id;
                const permissionsForRole = ROLES_CONFIG[roleName];
                for (const permName of permissionsForRole) {
                    const permId = permissionMap.get(permName);
                    if (permId) {
                         await client.query('INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [roleId, permId]);
                    }
                }
                 console.log(`Role '${roleName}' created or already exists.`);
            }
        }
        
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPassword = process.env.ADMIN_PASSWORD;
        if (adminEmail) {
            let adminUser = await client.query('SELECT id FROM users WHERE username = $1', [adminEmail]);
            let adminUserId;

            if (adminUser.rows.length === 0) {
                if(!adminPassword) {
                    console.warn(`Admin user ${adminEmail} does not exist and no ADMIN_PASSWORD is set. Cannot create admin.`);
                } else {
                    const newUserRes = await client.query('INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id', [adminEmail, adminPassword]);
                    adminUserId = newUserRes.rows[0].id;
                    console.log(`Created admin user: ${adminEmail}`);
                }
            } else {
                adminUserId = adminUser.rows[0].id;
            }

            if(adminUserId) {
                const adminRole = await client.query('SELECT id FROM roles WHERE name = $1', ['Admin']);
                if(adminRole.rows.length > 0) {
                    const adminRoleId = adminRole.rows[0].id;
                    await client.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [adminUserId, adminRoleId]);
                    console.log(`Ensured user ${adminEmail} has 'Admin' role.`);
                }
            }
        }

        await client.query('COMMIT');
        console.log('Database seeding completed successfully.');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Database seeding failed:', error);
    } finally {
        client.release();
    }
};

// --- Helper Functions ---
const logLoginHistory = async (userId, method, req) => {
    try {
        await db.query(
            'INSERT INTO login_history (user_id, login_method, ip_address, user_agent) VALUES ($1, $2, $3, $4)',
            [userId, method, req.ip, req.headers['user-agent']]
        );
    } catch (err) {
        console.error('Failed to log login history:', err);
    }
};

const getUserPermissions = async (userId) => {
    const { rows } = await db.query(
        `SELECT DISTINCT p.name FROM permissions p
         JOIN role_permissions rp ON p.id = rp.permission_id
         JOIN user_roles ur ON rp.role_id = ur.role_id
         WHERE ur.user_id = $1`,
        [userId]
    );
    return rows.map(r => r.name);
};

const createSession = async (userId) => {
    const token = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1); // Session valid for 1 day

    await db.query('INSERT INTO user_sessions (user_id, token, expires_at) VALUES ($1, $2, $3)', [userId, token, expiresAt]);
    return token;
};

const logChanges = async (client, { historyTable, recordId, changedByUserId, oldData, newData, fieldMapping }) => {
    for (const key in newData) {
        const dbKey = fieldMapping[key];
        if (dbKey && String(oldData[dbKey]) !== String(newData[key])) {
             await client.query(
                `INSERT INTO ${historyTable} (record_id, field_changed, old_value, new_value, changed_by_user_id) VALUES ($1, $2, $3, $4, $5)`,
                [recordId, key, oldData[dbKey], newData[key], changedByUserId]
            );
        }
    }
};

const createHistoryEndpoint = (tableName) => async (req, res) => {
    const { id } = req.params;
    try {
        const { rows } = await db.query(`
            SELECT 
                h.id,
                h.field_changed AS "fieldChanged",
                h.old_value AS "oldValue",
                h.new_value AS "newValue",
                u.username AS "changedByUser",
                h.changed_at AS "changedAt"
            FROM ${tableName}_history h
            LEFT JOIN users u ON h.changed_by_user_id = u.id
            WHERE h.record_id = $1
            ORDER BY h.changed_at DESC
        `, [id]);
        res.json(rows);
    } catch (err) {
        console.error(`Error fetching ${tableName} history:`, err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// --- Auth Middleware ---
const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authentication required: No token provided.' });
    }
    const token = authHeader.split(' ')[1];

    const sessionRes = await db.query('SELECT user_id FROM user_sessions WHERE token = $1 AND expires_at > NOW()', [token]);
    if (sessionRes.rows.length === 0) {
        return res.status(401).json({ message: 'Authentication failed: Invalid or expired token.' });
    }
    const userId = sessionRes.rows[0].user_id;

    const userRes = await db.query('SELECT id, username FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) {
        return res.status(401).json({ message: 'Authentication failed: User not found.' });
    }
    
    const user = userRes.rows[0];
    const permissions = await getUserPermissions(userId);
    
    req.user = { id: user.id, email: user.username, permissions };
    next();
};

const permissionMiddleware = (permission) => (req, res, next) => {
    if (!req.user || !req.user.permissions) {
        return res.status(403).json({ message: 'Forbidden: No permissions found for user.' });
    }
    // Admin role (defined by 'action:users:manage' permission) has all rights.
    if (req.user.permissions.includes('action:users:manage')) {
        return next();
    }
    if (!req.user.permissions.includes(permission)) {
        return res.status(403).json({ message: `Forbidden: Lacks '${permission}' permission.` });
    }
    next();
};

// --- PUBLIC API ROUTES (NO AUTH REQUIRED) ---
app.get('/api/public/albums', async (req, res) => {
    try {
        const { rows } = await db.query(`
            WITH FestivalImages AS (
                SELECT 
                    festival_id, 
                    image_data,
                    ROW_NUMBER() OVER(PARTITION BY festival_id ORDER BY created_at DESC) as rn
                FROM festival_photos
            )
            SELECT 
                f.id, 
                f.name, 
                f.description, 
                fi.image_data as "coverImage"
            FROM festivals f
            LEFT JOIN FestivalImages fi ON f.id = fi.festival_id AND fi.rn = 1
            WHERE f.deleted_at IS NULL
            ORDER BY f.start_date DESC;
        `);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching public albums:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/public/albums/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const festivalRes = await db.query('SELECT name, description, start_date as "startDate", end_date as "endDate" FROM festivals WHERE id = $1 AND deleted_at IS NULL', [id]);
        if (festivalRes.rows.length === 0) {
            return res.status(404).json({ error: 'Album not found' });
        }
        
        const imagesRes = await db.query(`
            SELECT image_data FROM festival_photos WHERE festival_id = $1 ORDER BY created_at ASC
        `, [id]);

        res.json({
            ...festivalRes.rows[0],
            images: imagesRes.rows.map(r => r.image_data)
        });

    } catch (err) {
        console.error(`Error fetching public album ${id}:`, err);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// --- API Routes ---

// Authentication
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await db.query('SELECT id, username FROM users WHERE username = $1 AND password = $2', [username, password]);
        if (result.rows.length > 0) {
            const user = result.rows[0];
            const permissions = await getUserPermissions(user.id);
            if (permissions.length === 0) return res.status(403).json({ message: 'Login failed. Your account has not been assigned any roles.' });
            
            const token = await createSession(user.id);
            await logLoginHistory(user.id, 'password', req);
            res.status(200).json({ user: { id: user.id, email: user.username, permissions }, token });
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/auth/google', async (req, res) => {
    const { token } = req.body;
    try {
        const ticket = await googleClient.verifyIdToken({ idToken: token, audience: process.env.GOOGLE_CLIENT_ID });
        const payload = ticket.getPayload();
        const email = payload?.email;
        if (!email) return res.status(400).json({ message: 'Invalid Google token: email not found.' });

        const userResult = await db.query('SELECT id, username FROM users WHERE username = $1', [email]);
        if (userResult.rows.length === 0) return res.status(403).json({ message: 'Access denied. Your account has not been set up by an administrator.' });

        const user = userResult.rows[0];
        const permissions = await getUserPermissions(user.id);
        if (permissions.length === 0) return res.status(403).json({ message: 'Access denied. Your account has no assigned roles.' });

        const sessionToken = await createSession(user.id);
        await logLoginHistory(user.id, 'google', req);
        res.status(200).json({ user: { id: user.id, email: user.username, permissions }, token: sessionToken });
    } catch (error) {
        console.error('Google Auth Error:', error);
        res.status(401).json({ message: 'Invalid Google token' });
    }
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
    res.status(200).json({ user: req.user });
});

app.post('/api/logout', authMiddleware, async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader.split(' ')[1];
        await db.query('DELETE FROM user_sessions WHERE token = $1', [token]);
        res.status(200).json({ message: 'Logged out successfully.' });
    } catch (err) {
        console.error('Logout error:', err);
        res.status(500).json({ error: 'Internal server error during logout.' });
    }
});


// Page Access Tracking
app.post('/api/track-access', authMiddleware, async (req, res) => {
    const { pagePath } = req.body;
    if (!pagePath) return res.status(400).json({ error: 'pagePath is required' });
    try {
        await db.query('INSERT INTO page_access_history (user_id, page_path, ip_address, user_agent) VALUES ($1, $2, $3, $4)',
            [req.user.id, pagePath, req.ip, req.headers['user-agent']]);
        res.status(200).json({ success: true });
    } catch (err) {
        console.error('Failed to track page access:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// --- User & Role Management (Requires Admin Permissions) ---
app.get('/api/users/management', authMiddleware, permissionMiddleware('page:user-management:view'), async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT u.id, u.username, u.created_at AS "createdAt", 
                   COALESCE(json_agg(json_build_object('id', r.id, 'name', r.name)) FILTER (WHERE r.id IS NOT NULL), '[]') as roles
            FROM users u
            LEFT JOIN user_roles ur ON u.id = ur.user_id
            LEFT JOIN roles r ON ur.role_id = r.id
            GROUP BY u.id
            ORDER BY u.created_at DESC
        `);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching users for management:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/users', authMiddleware, permissionMiddleware('action:users:manage'), async (req, res) => {
    const { username, password, roleIds } = req.body;
    if (!username || !password || !roleIds || !Array.isArray(roleIds)) {
        return res.status(400).json({ error: 'Username, password, and an array of roleIds are required.' });
    }
    const client = await db.getPool().connect();
    try {
        await client.query('BEGIN');
        const newUserRes = await client.query('INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id', [username, password]);
        const userId = newUserRes.rows[0].id;
        for (const roleId of roleIds) {
            await client.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [userId, roleId]);
        }
        await client.query('COMMIT');
        res.status(201).json({ message: 'User created successfully', userId });
    } catch (err) {
        await client.query('ROLLBACK');
        if (err.code === '23505') return res.status(409).json({ error: 'A user with this email already exists.' });
        console.error('Error creating user:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

app.get('/api/roles', authMiddleware, permissionMiddleware('page:user-management:view'), async (req, res) => {
    try {
        const { rows } = await db.query('SELECT id, name, description FROM roles ORDER BY name ASC');
        res.json(rows);
    } catch (err) {
        console.error('Error fetching roles:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.put('/api/users/:id/roles', authMiddleware, permissionMiddleware('action:users:manage'), async (req, res) => {
    const { id } = req.params;
    const { roleIds } = req.body;
    if (!Array.isArray(roleIds)) return res.status(400).json({ error: 'roleIds must be an array.' });

    const client = await db.getPool().connect();
    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM user_roles WHERE user_id = $1', [id]);
        for (const roleId of roleIds) {
            await client.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [id, roleId]);
        }
        await client.query('COMMIT');
        // Invalidate all sessions for this user to force re-login with new permissions
        await db.query('DELETE FROM user_sessions WHERE user_id = $1', [id]);
        res.status(200).json({ message: 'User roles updated successfully. User sessions have been cleared.' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error updating user roles:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

app.get('/api/vendors', authMiddleware, permissionMiddleware('page:vendors:view'), async (req, res) => {
    try {
        const vendorsResult = await db.query('SELECT id, name, business, address, created_at AS "createdAt", updated_at AS "updatedAt" FROM vendors WHERE deleted_at IS NULL ORDER BY name ASC');
        const vendors = vendorsResult.rows;
        for (const vendor of vendors) {
            const contactsResult = await db.query('SELECT name, contact_number as "contactNumber" FROM contact_persons WHERE vendor_id = $1', [vendor.id]);
            vendor.contacts = contactsResult.rows;
        }
        res.json(vendors);
    } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

app.get('/api/quotations', authMiddleware, permissionMiddleware('page:quotations:view'), async (req, res) => {
    try {
        const quotationsResult = await db.query('SELECT id, quotation_for AS "quotationFor", vendor_id AS "vendorId", cost, date, festival_id as "festivalId", created_at AS "createdAt", updated_at AS "updatedAt" FROM quotations WHERE deleted_at IS NULL ORDER BY date DESC');
        const quotations = quotationsResult.rows;
        for (const quote of quotations) {
            const imagesResult = await db.query('SELECT image_data FROM quotation_images WHERE quotation_id = $1', [quote.id]);
            quote.quotationImages = imagesResult.rows.map(row => row.image_data);
        }
        res.json(quotations);
    } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

// GET Endpoints
app.get('/api/contributions', authMiddleware, permissionMiddleware('page:contributions:view'), async (req, res) => {
    try {
        const { rows } = await db.query('SELECT id, donor_name AS "donorName", donor_email AS "donorEmail", mobile_number AS "mobileNumber", tower_number AS "towerNumber", flat_number AS "flatNumber", amount, number_of_coupons AS "numberOfCoupons", campaign_id AS "campaignId", date, status, type, image, created_at AS "createdAt", updated_at AS "updatedAt" FROM contributions WHERE deleted_at IS NULL ORDER BY date DESC');
        res.json(rows);
    } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

app.get('/api/campaigns', authMiddleware, permissionMiddleware('page:campaigns:view'), async (req, res) => {
    try {
        const { rows } = await db.query(`SELECT id, name, goal, description, created_at AS "createdAt", updated_at AS "updatedAt" FROM campaigns WHERE deleted_at IS NULL ORDER BY id DESC`);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

app.get('/api/budgets', authMiddleware, permissionMiddleware('page:budget:view'), async (req, res) => {
    try {
        const { rows } = await db.query('SELECT id, item_name AS "itemName", budgeted_amount AS "budgetedAmount", expense_head AS "expenseHead", festival_id as "festivalId", created_at AS "createdAt", updated_at AS "updatedAt" FROM budgets WHERE deleted_at IS NULL ORDER BY item_name ASC');
        res.json(rows);
    } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

app.get('/api/sponsors', authMiddleware, permissionMiddleware('page:sponsors:view'), async (req, res) => {
    try {
        const { rows } = await db.query('SELECT id, name, contact_number AS "contactNumber", address, email, business_category AS "businessCategory", business_info AS "businessInfo", sponsorship_amount AS "sponsorshipAmount", sponsorship_type AS "sponsorshipType", date_paid as "datePaid", created_at AS "createdAt", updated_at AS "updatedAt" FROM sponsors WHERE deleted_at IS NULL ORDER BY name ASC');
        res.json(rows);
    } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

app.get('/api/expenses', authMiddleware, permissionMiddleware('page:expenses:view'), async (req, res) => {
    try {
        const expensesResult = await db.query('SELECT id, name, vendor_id AS "vendorId", cost, bill_date AS "billDate", expense_head AS "expenseHead", expense_by AS "expenseBy", festival_id as "festivalId", created_at AS "createdAt", updated_at AS "updatedAt" FROM expenses WHERE deleted_at IS NULL ORDER BY bill_date DESC');
        const expenses = expensesResult.rows;
        for (const expense of expenses) {
            const imagesResult = await db.query('SELECT image_data FROM expense_images WHERE expense_id = $1', [expense.id]);
            expense.billReceipts = imagesResult.rows.map(row => row.image_data);
        }
        res.json(expenses);
    } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

app.get('/api/festivals', authMiddleware, permissionMiddleware('page:festivals:view'), async (req, res) => {
    try {
        const { rows } = await db.query('SELECT id, name, description, start_date AS "startDate", end_date AS "endDate", campaign_id AS "campaignId", created_at AS "createdAt", updated_at AS "updatedAt" FROM festivals WHERE deleted_at IS NULL ORDER BY start_date DESC');
        res.json(rows);
    } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

// Get a single festival's details
app.get('/api/festivals/:id', authMiddleware, permissionMiddleware('page:festivals:view'), async (req, res) => {
    try {
        const { rows } = await db.query('SELECT id, name FROM festivals WHERE id = $1 AND deleted_at IS NULL', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Festival not found' });
        }
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/tasks', authMiddleware, permissionMiddleware('page:tasks:view'), async (req, res) => {
    try {
        const { rows } = await db.query('SELECT id, title, description, status, due_date as "dueDate", festival_id as "festivalId", assignee_name as "assigneeName", created_at as "createdAt", updated_at as "updatedAt" FROM tasks WHERE deleted_at IS NULL ORDER BY due_date ASC');
        res.json(rows);
    } catch (err) {
        console.error('Error fetching tasks:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// --- Festival Photo Management ---
app.get('/api/festivals/:id/photos', authMiddleware, permissionMiddleware('page:festivals:view'), async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT 
                fp.id, 
                fp.image_data as "imageData",
                u.username as "uploadedBy"
            FROM festival_photos fp
            LEFT JOIN users u ON fp.uploaded_by_user_id = u.id
            WHERE fp.festival_id = $1 
            ORDER BY fp.created_at DESC
        `, [req.params.id]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch photos' });
    }
});

app.post('/api/festivals/:id/photos', authMiddleware, permissionMiddleware('action:edit'), async (req, res) => {
    const { id } = req.params;
    const { images } = req.body; // Expect an array of base64 strings
    const userId = req.user.id; // Get user ID from middleware

    if (!Array.isArray(images) || images.length === 0) {
        return res.status(400).json({ error: 'Images array is required.' });
    }

    const client = await db.getPool().connect();
    try {
        await client.query('BEGIN');
        for (const imageData of images) {
            await client.query('INSERT INTO festival_photos (festival_id, image_data, uploaded_by_user_id) VALUES ($1, $2, $3)', [id, imageData, userId]);
        }
        await client.query('COMMIT');
        res.status(201).json({ message: 'Photos uploaded successfully.' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Failed to upload photos:', err);
        res.status(500).json({ error: 'Failed to upload photos.' });
    } finally {
        client.release();
    }
});

app.delete('/api/photos/:photoId', authMiddleware, permissionMiddleware('action:delete'), async (req, res) => {
    try {
        const result = await db.query('DELETE FROM festival_photos WHERE id = $1', [req.params.photoId]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Photo not found.' });
        }
        res.status(204).send();
    } catch (err) {
        console.error('Failed to delete photo:', err);
        res.status(500).json({ error: 'Failed to delete photo.' });
    }
});


// --- Archive & Restore Endpoints ---
app.get('/api/archive', authMiddleware, permissionMiddleware('page:archive:view'), async (req, res) => {
    try {
        const tables = ['contributions', 'sponsors', 'vendors', 'expenses', 'quotations', 'budgets', 'festivals', 'tasks'];
        const nameColumns = {
            contributions: 'donor_name', sponsors: 'name', vendors: 'name',
            expenses: 'name', quotations: 'quotation_for', budgets: 'item_name',
            festivals: 'name', tasks: 'title'
        };
        let archivedItems = [];

        for (const table of tables) {
            const query = `SELECT id, ${nameColumns[table]} AS name, deleted_at FROM ${table} WHERE deleted_at IS NOT NULL`;
            const { rows } = await db.query(query);
            rows.forEach(row => {
                archivedItems.push({
                    id: row.id,
                    name: row.name,
                    deletedAt: row.deleted_at,
                    type: table
                });
            });
        }
        archivedItems.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
        res.json(archivedItems);
    } catch (err) {
        console.error('Error fetching archive:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/:recordType/:id/restore', authMiddleware, permissionMiddleware('action:restore'), async (req, res) => {
    const { recordType, id } = req.params;
    const allowedTypes = ['contributions', 'sponsors', 'vendors', 'expenses', 'quotations', 'budgets', 'festivals', 'tasks'];
    
    if (!allowedTypes.includes(recordType)) {
        return res.status(400).json({ error: 'Invalid record type for restoration.' });
    }

    const client = await db.getPool().connect();
    try {
        await client.query('BEGIN');
        const updateRes = await client.query(`UPDATE ${recordType} SET deleted_at = NULL, updated_at = NOW() WHERE id = $1`, [id]);
        if (updateRes.rowCount === 0) {
            return res.status(404).json({ error: 'Item not found or not archived.' });
        }
        
        await client.query(
            `INSERT INTO ${recordType}_history (record_id, field_changed, old_value, new_value, changed_by_user_id) VALUES ($1, $2, $3, $4, $5)`,
            [id, 'status', 'archived', 'active', req.user.id]
        );
        
        await client.query('COMMIT');
        res.status(200).json({ message: 'Item restored successfully.' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(`Error restoring ${recordType}:`, err);
        res.status(500).json({ error: 'Failed to restore item.' });
    } finally {
        client.release();
    }
});

// --- History Endpoints ---
app.get('/api/contributions/:id/history', authMiddleware, createHistoryEndpoint('contributions'));
app.get('/api/sponsors/:id/history', authMiddleware, createHistoryEndpoint('sponsors'));
app.get('/api/vendors/:id/history', authMiddleware, createHistoryEndpoint('vendors'));
app.get('/api/expenses/:id/history', authMiddleware, createHistoryEndpoint('expenses'));
app.get('/api/quotations/:id/history', authMiddleware, createHistoryEndpoint('quotations'));
app.get('/api/budgets/:id/history', authMiddleware, createHistoryEndpoint('budgets'));
app.get('/api/festivals/:id/history', authMiddleware, createHistoryEndpoint('festivals'));
app.get('/api/tasks/:id/history', authMiddleware, createHistoryEndpoint('task'));

// --- POST (Create) Endpoints ---
app.post('/api/contributions', authMiddleware, permissionMiddleware('action:create'), async (req, res) => {
    const { donorName, donorEmail, mobileNumber, towerNumber, flatNumber, amount, numberOfCoupons, campaignId, date, type, image } = req.body;
    const contributionStatus = 'Completed'; // Default status for new contributions
    const contributionDate = date || new Date().toISOString();
    const dbCampaignId = campaignId || null;
    try {
        const result = await db.query(
            `INSERT INTO contributions (donor_name, donor_email, mobile_number, tower_number, flat_number, amount, number_of_coupons, campaign_id, date, status, type, image) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
             RETURNING id, donor_name AS "donorName", donor_email AS "donorEmail", mobile_number AS "mobileNumber", tower_number AS "towerNumber", flat_number AS "flatNumber", amount, number_of_coupons AS "numberOfCoupons", campaign_id AS "campaignId", date, status, type, image, created_at AS "createdAt", updated_at AS "updatedAt"`,
            [donorName, donorEmail, mobileNumber, towerNumber, flatNumber, amount, numberOfCoupons, dbCampaignId, contributionDate, contributionStatus, type, image]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) { 
        console.error('Error adding contribution:', err); 
        res.status(500).json({ error: 'Internal server error' }); 
    }
});

app.post('/api/contributions/bulk', authMiddleware, permissionMiddleware('action:create'), async (req, res) => {
    const { contributions } = req.body;
    if (!contributions || !Array.isArray(contributions) || contributions.length === 0) {
        return res.status(400).json({ error: 'Contributions array is required.' });
    }
    const client = await db.getPool().connect();
    const createdContributions = [];
    try {
        await client.query('BEGIN');
        for (const c of contributions) {
            const contributionStatus = 'Completed';
            const contributionDate = c.date || new Date().toISOString();
            const dbCampaignId = c.campaignId || null;
            const result = await client.query(`
                INSERT INTO contributions (donor_name, donor_email, mobile_number, tower_number, flat_number, amount, number_of_coupons, campaign_id, date, status, type, image) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
                RETURNING id, donor_name AS "donorName", donor_email AS "donorEmail", mobile_number AS "mobileNumber", tower_number AS "towerNumber", flat_number AS "flatNumber", amount, number_of_coupons AS "numberOfCoupons", campaign_id AS "campaignId", date, status, type, image, created_at AS "createdAt", updated_at AS "updatedAt"
            `, [c.donorName, c.donorEmail, c.mobileNumber, c.towerNumber, c.flatNumber, c.amount, c.numberOfCoupons, dbCampaignId, contributionDate, contributionStatus, c.type, c.image]);
            createdContributions.push(result.rows[0]);
        }
        await client.query('COMMIT');
        res.status(201).json(createdContributions);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error during bulk contribution insert:', err);
        res.status(500).json({ error: 'Internal server error during bulk insert' });
    } finally {
        client.release();
    }
});

app.post('/api/sponsors', authMiddleware, permissionMiddleware('action:create'), async (req, res) => {
    const { name, contactNumber, address, email, businessCategory, businessInfo, sponsorshipAmount, sponsorshipType, datePaid } = req.body;
    try {
        const result = await db.query('INSERT INTO sponsors (name, contact_number, address, email, business_category, business_info, sponsorship_amount, sponsorship_type, date_paid) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
            [name, contactNumber, address, email, businessCategory, businessInfo, sponsorshipAmount, sponsorshipType, datePaid]);
        const newSponsor = result.rows[0];
        res.status(201).json({
            id: newSponsor.id,
            name: newSponsor.name,
            contactNumber: newSponsor.contact_number,
            address: newSponsor.address,
            email: newSponsor.email,
            businessCategory: newSponsor.business_category,
            businessInfo: newSponsor.business_info,
            sponsorshipAmount: newSponsor.sponsorship_amount,
            sponsorshipType: newSponsor.sponsorship_type,
            datePaid: newSponsor.date_paid,
            createdAt: newSponsor.created_at,
            updatedAt: newSponsor.updated_at
        });
    } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

app.post('/api/vendors', authMiddleware, permissionMiddleware('action:create'), async (req, res) => {
    const { name, business, address, contacts } = req.body;
    const client = await db.getPool().connect();
    try {
        await client.query('BEGIN');
        const vendorRes = await client.query('INSERT INTO vendors (name, business, address) VALUES ($1, $2, $3) RETURNING id, created_at, updated_at', [name, business, address]);
        const newVendor = vendorRes.rows[0];
        
        const insertedContacts = [];
        for (const contact of contacts) {
            const contactRes = await client.query('INSERT INTO contact_persons (vendor_id, name, contact_number) VALUES ($1, $2, $3) RETURNING name, contact_number', [newVendor.id, contact.name, contact.contactNumber]);
            insertedContacts.push({name: contactRes.rows[0].name, contactNumber: contactRes.rows[0].contact_number});
        }
        await client.query('COMMIT');
        res.status(201).json({ id: newVendor.id, name, business, address, contacts: insertedContacts, createdAt: newVendor.created_at, updatedAt: newVendor.updated_at });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'Internal server error' });
    } finally { client.release(); }
});

app.post('/api/expenses', authMiddleware, permissionMiddleware('action:create'), async (req, res) => {
    const { name, vendorId, cost, billDate, expenseHead, billReceipts, expenseBy, festivalId } = req.body;
    const client = await db.getPool().connect();
    try {
        await client.query('BEGIN');
        const expenseRes = await client.query('INSERT INTO expenses (name, vendor_id, cost, bill_date, expense_head, expense_by, festival_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [name, vendorId, cost, billDate, expenseHead, expenseBy, festivalId || null]);
        const newExpense = expenseRes.rows[0];
        
        const insertedImages = [];
        if (billReceipts && billReceipts.length > 0) {
            for (const image of billReceipts) {
                await client.query('INSERT INTO expense_images (expense_id, image_data) VALUES ($1, $2)', [newExpense.id, image]);
                insertedImages.push(image);
            }
        }
        await client.query('COMMIT');
        res.status(201).json({
            id: newExpense.id,
            name: newExpense.name,
            vendorId: newExpense.vendor_id,
            cost: newExpense.cost,
            billDate: newExpense.bill_date,
            expenseHead: newExpense.expense_head,
            expenseBy: newExpense.expense_by,
            festivalId: newExpense.festival_id,
            billReceipts: insertedImages,
            createdAt: newExpense.created_at,
            updatedAt: newExpense.updated_at
        });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'Internal server error' });
    } finally { client.release(); }
});

app.post('/api/quotations', authMiddleware, permissionMiddleware('action:create'), async (req, res) => {
    const { quotationFor, vendorId, cost, date, quotationImages, festivalId } = req.body;
    const client = await db.getPool().connect();
    try {
        await client.query('BEGIN');
        const quoteRes = await client.query('INSERT INTO quotations (quotation_for, vendor_id, cost, date, festival_id) VALUES ($1, $2, $3, $4, $5) RETURNING *', [quotationFor, vendorId, cost, date, festivalId || null]);
        const newQuotation = quoteRes.rows[0];

        const insertedImages = [];
        for (const image of quotationImages) {
            await client.query('INSERT INTO quotation_images (quotation_id, image_data) VALUES ($1, $2)', [newQuotation.id, image]);
            insertedImages.push(image);
        }
        await client.query('COMMIT');
        res.status(201).json({
            id: newQuotation.id,
            quotationFor: newQuotation.quotation_for,
            vendorId: newQuotation.vendor_id,
            cost: newQuotation.cost,
            date: newQuotation.date,
            festivalId: newQuotation.festival_id,
            quotationImages: insertedImages,
            createdAt: newQuotation.created_at,
            updatedAt: newQuotation.updated_at
        });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'Internal server error' });
    } finally { client.release(); }
});

app.post('/api/budgets', authMiddleware, permissionMiddleware('action:create'), async (req, res) => {
    const { itemName, budgetedAmount, expenseHead, festivalId } = req.body;
    try {
        const result = await db.query('INSERT INTO budgets (item_name, budgeted_amount, expense_head, festival_id) VALUES ($1, $2, $3, $4) RETURNING id, item_name AS "itemName", budgeted_amount AS "budgetedAmount", expense_head AS "expenseHead", festival_id AS "festivalId", created_at as "createdAt", updated_at as "updatedAt"', 
            [itemName, budgetedAmount, expenseHead, festivalId || null]);
        res.status(201).json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

app.post('/api/festivals', authMiddleware, permissionMiddleware('action:create'), async (req, res) => {
    const { name, description, startDate, endDate, campaignId } = req.body;
    const dbCampaignId = campaignId || null;
    try {
        const result = await db.query('INSERT INTO festivals (name, description, start_date, end_date, campaign_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, description, start_date AS "startDate", end_date AS "endDate", campaign_id AS "campaignId", created_at as "createdAt", updated_at as "updatedAt"',
            [name, description, startDate, endDate, dbCampaignId]);
        res.status(201).json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

app.post('/api/tasks', authMiddleware, permissionMiddleware('action:create'), async (req, res) => {
    const { title, description, status, dueDate, festivalId, assigneeName } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO tasks (title, description, status, due_date, festival_id, assignee_name) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, title, description, status, due_date as "dueDate", festival_id as "festivalId", assignee_name as "assigneeName", created_at as "createdAt", updated_at as "updatedAt"',
            [title, description, status, dueDate, festivalId || null, assigneeName]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error adding task:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// --- PUT (Update) Endpoints ---
app.put('/api/contributions/:id', authMiddleware, permissionMiddleware('action:edit'), async (req, res) => {
    const { id } = req.params;
    const { donorName, donorEmail, mobileNumber, towerNumber, flatNumber, amount, numberOfCoupons, campaignId, date, type, image, status } = req.body;
    const client = await db.getPool().connect();
    try {
        await client.query('BEGIN');
        const oldDataRes = await client.query('SELECT * FROM contributions WHERE id=$1 FOR UPDATE', [id]);
        if (oldDataRes.rows.length === 0) throw new Error('Contribution not found');

        const result = await client.query('UPDATE contributions SET donor_name=$1, donor_email=$2, mobile_number=$3, tower_number=$4, flat_number=$5, amount=$6, number_of_coupons=$7, campaign_id=$8, date=$9, type=$10, image=$11, status=$12, updated_at=NOW() WHERE id=$13 RETURNING id, donor_name AS "donorName", donor_email AS "donorEmail", mobile_number AS "mobileNumber", tower_number AS "towerNumber", flat_number AS "flatNumber", amount, number_of_coupons AS "numberOfCoupons", campaign_id AS "campaignId", date, status, type, image, created_at AS "createdAt", updated_at AS "updatedAt"',
            [donorName, donorEmail, mobileNumber, towerNumber, flatNumber, amount, numberOfCoupons, campaignId || null, date, type, image, status, id]);
        
        await logChanges(client, {
            historyTable: 'contributions_history', recordId: id, changedByUserId: req.user.id,
            oldData: oldDataRes.rows[0], newData: req.body,
            fieldMapping: { donorName: 'donor_name', donorEmail: 'donor_email', mobileNumber: 'mobile_number', towerNumber: 'tower_number', flatNumber: 'flat_number', amount: 'amount', numberOfCoupons: 'number_of_coupons', campaignId: 'campaign_id', date: 'date', type: 'type', status: 'status' }
        });

        await client.query('COMMIT');
        res.json(result.rows[0]);
    } catch (err) { 
        await client.query('ROLLBACK');
        console.error("Update contribution error:", err)
        res.status(500).json({ error: 'Failed to update contribution' }); 
    } finally { client.release(); }
});

app.put('/api/sponsors/:id', authMiddleware, permissionMiddleware('action:edit'), async (req, res) => {
    const { id } = req.params;
    const { name, contactNumber, address, email, businessCategory, businessInfo, sponsorshipAmount, sponsorshipType, datePaid } = req.body;
    const client = await db.getPool().connect();
    try {
        await client.query('BEGIN');
        const oldDataRes = await client.query('SELECT * FROM sponsors WHERE id=$1 FOR UPDATE', [id]);
        if (oldDataRes.rows.length === 0) throw new Error('Sponsor not found');

        const result = await client.query('UPDATE sponsors SET name=$1, contact_number=$2, address=$3, email=$4, business_category=$5, business_info=$6, sponsorship_amount=$7, sponsorship_type=$8, date_paid=$9, updated_at=NOW() WHERE id=$10 RETURNING *',
            [name, contactNumber, address, email, businessCategory, businessInfo, sponsorshipAmount, sponsorshipType, datePaid, id]);
        
        await logChanges(client, {
            historyTable: 'sponsors_history', recordId: id, changedByUserId: req.user.id,
            oldData: oldDataRes.rows[0], newData: req.body,
            fieldMapping: { name: 'name', contactNumber: 'contact_number', address: 'address', email: 'email', businessCategory: 'business_category', businessInfo: 'business_info', sponsorshipAmount: 'sponsorship_amount', sponsorshipType: 'sponsorship_type', datePaid: 'date_paid' }
        });

        await client.query('COMMIT');
        const updatedSponsor = result.rows[0];
        res.json({
            id: updatedSponsor.id, name: updatedSponsor.name, contactNumber: updatedSponsor.contact_number, address: updatedSponsor.address, email: updatedSponsor.email,
            businessCategory: updatedSponsor.business_category, businessInfo: updatedSponsor.business_info, sponsorshipAmount: updatedSponsor.sponsorship_amount,
            sponsorshipType: updatedSponsor.sponsorship_type, datePaid: updatedSponsor.date_paid, createdAt: updatedSponsor.created_at, updatedAt: updatedSponsor.updated_at
        });
    } catch (err) { 
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'Failed to update sponsor' }); 
    } finally { client.release(); }
});

app.put('/api/vendors/:id', authMiddleware, permissionMiddleware('action:edit'), async (req, res) => {
    const { id } = req.params;
    const { name, business, address, contacts } = req.body;
    const client = await db.getPool().connect();
    try {
        await client.query('BEGIN');
        const oldDataRes = await client.query('SELECT * FROM vendors WHERE id=$1 FOR UPDATE', [id]);
        if (oldDataRes.rows.length === 0) throw new Error('Vendor not found');
        
        const result = await client.query('UPDATE vendors SET name=$1, business=$2, address=$3, updated_at=NOW() WHERE id=$4 RETURNING created_at, updated_at', [name, business, address, id]);
        
        // Log basic field changes
        await logChanges(client, {
            historyTable: 'vendors_history', recordId: id, changedByUserId: req.user.id,
            oldData: oldDataRes.rows[0], newData: { name, business, address },
            fieldMapping: { name: 'name', business: 'business', address: 'address' }
        });
        
        // Handle contacts separately
        const oldContactsRes = await client.query('SELECT name, contact_number FROM contact_persons WHERE vendor_id=$1', [id]);
        const oldContactsStr = oldContactsRes.rows.map(c => `${c.name}:${c.contact_number}`).sort().join(';');
        const newContactsStr = contacts.map(c => `${c.name}:${c.contactNumber}`).sort().join(';');
        
        if (oldContactsStr !== newContactsStr) {
            await logChanges(client, {
                historyTable: 'vendors_history', recordId: id, changedByUserId: req.user.id,
                oldData: { 'contacts': oldContactsStr }, newData: { 'contacts': newContactsStr },
                fieldMapping: { contacts: 'contacts' }
            });
            await client.query('DELETE FROM contact_persons WHERE vendor_id=$1', [id]);
            for (const contact of contacts) {
                await client.query('INSERT INTO contact_persons (vendor_id, name, contact_number) VALUES ($1, $2, $3)', [id, contact.name, contact.contactNumber]);
            }
        }

        await client.query('COMMIT');
        res.json({ id, name, business, address, contacts, createdAt: result.rows[0].created_at, updatedAt: result.rows[0].updated_at });
    } catch (err) { await client.query('ROLLBACK'); res.status(500).json({ error: 'Failed to update vendor' }); }
    finally { client.release(); }
});

app.put('/api/expenses/:id', authMiddleware, permissionMiddleware('action:edit'), async (req, res) => {
    const { id } = req.params;
    const { name, vendorId, cost, billDate, expenseHead, billReceipts, expenseBy, festivalId } = req.body;
    const client = await db.getPool().connect();
    try {
        await client.query('BEGIN');
        const oldDataRes = await client.query('SELECT * FROM expenses WHERE id=$1 FOR UPDATE', [id]);
        if (oldDataRes.rows.length === 0) throw new Error('Expense not found');

        const result = await client.query('UPDATE expenses SET name=$1, vendor_id=$2, cost=$3, bill_date=$4, expense_head=$5, expense_by=$6, festival_id=$7, updated_at=NOW() WHERE id=$8 RETURNING *',
            [name, vendorId, cost, billDate, expenseHead, expenseBy, festivalId || null, id]);
        
        await logChanges(client, {
            historyTable: 'expenses_history', recordId: id, changedByUserId: req.user.id,
            oldData: oldDataRes.rows[0], newData: req.body,
            fieldMapping: { name: 'name', vendorId: 'vendor_id', cost: 'cost', billDate: 'bill_date', expenseHead: 'expense_head', expenseBy: 'expense_by', festivalId: 'festival_id' }
        });

        // Handle images
        await client.query('DELETE FROM expense_images WHERE expense_id=$1', [id]);
        if (billReceipts && billReceipts.length > 0) {
            for (const image of billReceipts) {
                await client.query('INSERT INTO expense_images (expense_id, image_data) VALUES ($1, $2)', [id, image]);
            }
        }
        await client.query('COMMIT');
        const updatedExpense = result.rows[0];
        res.json({
            id: updatedExpense.id, name: updatedExpense.name, vendorId: updatedExpense.vendor_id, cost: updatedExpense.cost, billDate: updatedExpense.bill_date,
            expenseHead: updatedExpense.expense_head, billReceipts, expenseBy: updatedExpense.expense_by, festivalId: updatedExpense.festival_id,
            createdAt: updatedExpense.created_at, updatedAt: updatedExpense.updated_at
        });
    } catch (err) { await client.query('ROLLBACK'); res.status(500).json({ error: 'Failed to update expense' }); }
    finally { client.release(); }
});

app.put('/api/quotations/:id', authMiddleware, permissionMiddleware('action:edit'), async (req, res) => {
    const { id } = req.params;
    const { quotationFor, vendorId, cost, date, quotationImages, festivalId } = req.body;
    const client = await db.getPool().connect();
    try {
        await client.query('BEGIN');
        const oldDataRes = await client.query('SELECT * FROM quotations WHERE id=$1 FOR UPDATE', [id]);
        if (oldDataRes.rows.length === 0) throw new Error('Quotation not found');

        const result = await client.query('UPDATE quotations SET quotation_for=$1, vendor_id=$2, cost=$3, date=$4, festival_id=$5, updated_at=NOW() WHERE id=$6 RETURNING *', [quotationFor, vendorId, cost, date, festivalId || null, id]);
        
        await logChanges(client, {
            historyTable: 'quotations_history', recordId: id, changedByUserId: req.user.id,
            oldData: oldDataRes.rows[0], newData: req.body,
            fieldMapping: { quotationFor: 'quotation_for', vendorId: 'vendor_id', cost: 'cost', date: 'date', festivalId: 'festival_id' }
        });

        await client.query('DELETE FROM quotation_images WHERE quotation_id=$1', [id]);
        for (const image of quotationImages) {
            await client.query('INSERT INTO quotation_images (quotation_id, image_data) VALUES ($1, $2)', [id, image]);
        }
        await client.query('COMMIT');
        const updatedQuotation = result.rows[0];
        res.json({
            id: updatedQuotation.id, quotationFor: updatedQuotation.quotation_for, vendorId: updatedQuotation.vendor_id, cost: updatedQuotation.cost,
            date: updatedQuotation.date, quotationImages, festivalId: updatedQuotation.festival_id,
            createdAt: updatedQuotation.created_at, updatedAt: updatedQuotation.updated_at
        });
    } catch (err) { await client.query('ROLLBACK'); res.status(500).json({ error: 'Failed to update quotation' }); }
    finally { client.release(); }
});

app.put('/api/budgets/:id', authMiddleware, permissionMiddleware('action:edit'), async (req, res) => {
    const { id } = req.params;
    const { itemName, budgetedAmount, expenseHead, festivalId } = req.body;
    const client = await db.getPool().connect();
    try {
        await client.query('BEGIN');
        const oldDataRes = await client.query('SELECT * FROM budgets WHERE id=$1 FOR UPDATE', [id]);
        if (oldDataRes.rows.length === 0) throw new Error('Budget item not found');

        const result = await client.query('UPDATE budgets SET item_name=$1, budgeted_amount=$2, expense_head=$3, festival_id=$4, updated_at=NOW() WHERE id=$5 RETURNING id, item_name AS "itemName", budgeted_amount AS "budgetedAmount", expense_head AS "expenseHead", festival_id AS "festivalId", created_at as "createdAt", updated_at as "updatedAt"',
            [itemName, budgetedAmount, expenseHead, festivalId || null, id]);

        await logChanges(client, {
            historyTable: 'budgets_history', recordId: id, changedByUserId: req.user.id,
            oldData: oldDataRes.rows[0], newData: req.body,
            fieldMapping: { itemName: 'item_name', budgetedAmount: 'budgeted_amount', expenseHead: 'expense_head', festivalId: 'festival_id' }
        });

        await client.query('COMMIT');
        res.json(result.rows[0]);
    } catch (err) { 
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'Failed to update budget' }); 
    } finally { client.release(); }
});

app.put('/api/festivals/:id', authMiddleware, permissionMiddleware('action:edit'), async (req, res) => {
    const { id } = req.params;
    const { name, description, startDate, endDate, campaignId } = req.body;
    const client = await db.getPool().connect();
    try {
        await client.query('BEGIN');
        const oldDataRes = await client.query('SELECT * FROM festivals WHERE id=$1 FOR UPDATE', [id]);
        if (oldDataRes.rows.length === 0) throw new Error('Festival not found');
        
        const result = await client.query('UPDATE festivals SET name=$1, description=$2, start_date=$3, end_date=$4, campaign_id=$5, updated_at=NOW() WHERE id=$6 RETURNING id, name, description, start_date AS "startDate", end_date AS "endDate", campaign_id AS "campaignId", created_at as "createdAt", updated_at as "updatedAt"',
            [name, description, startDate, endDate, campaignId || null, id]);
        
        await logChanges(client, {
            historyTable: 'festivals_history', recordId: id, changedByUserId: req.user.id,
            oldData: oldDataRes.rows[0], newData: req.body,
            fieldMapping: { name: 'name', description: 'description', startDate: 'start_date', endDate: 'end_date', campaignId: 'campaign_id' }
        });

        await client.query('COMMIT');
        res.json(result.rows[0]);
    } catch (err) { 
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'Failed to update festival' }); 
    } finally { client.release(); }
});

app.put('/api/tasks/:id', authMiddleware, permissionMiddleware('action:edit'), async (req, res) => {
    const { id } = req.params;
    const { title, description, status, dueDate, festivalId, assigneeName } = req.body;
    const client = await db.getPool().connect();
    try {
        await client.query('BEGIN');
        const oldTaskRes = await client.query('SELECT * FROM tasks WHERE id = $1 FOR UPDATE', [id]);
        if (oldTaskRes.rows.length === 0) throw new Error('Task not found');
        
        const result = await client.query(
            'UPDATE tasks SET title=$1, description=$2, status=$3, due_date=$4, festival_id=$5, assignee_name=$6, updated_at=NOW() WHERE id=$7 RETURNING id, title, description, status, due_date as "dueDate", festival_id as "festivalId", assignee_name as "assigneeName", created_at as "createdAt", updated_at as "updatedAt"',
            [title, description, status, dueDate, festivalId || null, assigneeName, id]
        );

        await logChanges(client, {
            historyTable: 'task_history', recordId: id, changedByUserId: req.user.id,
            oldData: oldTaskRes.rows[0], newData: req.body,
            fieldMapping: { title: 'title', description: 'description', status: 'status', dueDate: 'due_date', festivalId: 'festival_id', assigneeName: 'assignee_name' }
        });
        
        await client.query('COMMIT');
        res.json(result.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        if (err.message === 'Task not found') return res.status(404).json({ error: 'Task not found' });
        console.error('Error updating task:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});



// --- DELETE (Archive) Endpoints ---
const createSoftDeleteEndpoint = (tableName) => async (req, res) => {
    const { id } = req.params;
    const client = await db.getPool().connect();
    try {
        await client.query('BEGIN');
        const updateRes = await client.query(`UPDATE ${tableName} SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *`, [id]);
        if (updateRes.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Item not found' });
        }
        
        // Log the archival action to the item's history
        await client.query(
            `INSERT INTO ${tableName}_history (record_id, field_changed, old_value, new_value, changed_by_user_id) VALUES ($1, $2, $3, $4, $5)`,
            [id, 'status', 'active', 'archived', req.user.id]
        );

        await client.query('COMMIT');
        res.status(204).send();
    } catch (err) { 
        await client.query('ROLLBACK');
        console.error(`Failed to archive from ${tableName}:`, err);
        res.status(500).json({ error: `Failed to archive from ${tableName}` }); 
    } finally {
        client.release();
    }
};

app.delete('/api/contributions/:id', authMiddleware, permissionMiddleware('action:delete'), createSoftDeleteEndpoint('contributions'));
app.delete('/api/sponsors/:id', authMiddleware, permissionMiddleware('action:delete'), createSoftDeleteEndpoint('sponsors'));
app.delete('/api/budgets/:id', authMiddleware, permissionMiddleware('action:delete'), createSoftDeleteEndpoint('budgets'));
app.delete('/api/festivals/:id', authMiddleware, permissionMiddleware('action:delete'), createSoftDeleteEndpoint('festivals'));
app.delete('/api/tasks/:id', authMiddleware, permissionMiddleware('action:delete'), createSoftDeleteEndpoint('tasks'));
app.delete('/api/expenses/:id', authMiddleware, permissionMiddleware('action:delete'), createSoftDeleteEndpoint('expenses'));
app.delete('/api/quotations/:id', authMiddleware, permissionMiddleware('action:delete'), createSoftDeleteEndpoint('quotations'));


app.delete('/api/vendors/:id', authMiddleware, permissionMiddleware('action:delete'), async (req, res) => {
    const { id } = req.params;
    try {
        const expenseCheck = await db.query('SELECT id FROM expenses WHERE vendor_id = $1 AND deleted_at IS NULL LIMIT 1', [id]);
        if (expenseCheck.rows.length > 0) return res.status(400).json({ error: 'Cannot archive vendor. It is associated with one or more active expenses.' });
        
        const quotationCheck = await db.query('SELECT id FROM quotations WHERE vendor_id = $1 AND deleted_at IS NULL LIMIT 1', [id]);
        if (quotationCheck.rows.length > 0) return res.status(400).json({ error: 'Cannot archive vendor. It is associated with one or more active quotations.' });
        
        // If checks pass, use the generic soft delete logic
        return createSoftDeleteEndpoint('vendors')(req, res);
    } catch (err) {
        console.error('Failed to archive vendor:', err);
        res.status(500).json({ error: 'Failed to archive vendor' });
    }
});

// --- Gemini API Proxy Routes ---
app.post('/api/ai/summary', authMiddleware, permissionMiddleware('page:ai-insights:view'), async (req, res) => {
    const { contributions, campaigns, period } = req.body;
    const prompt = `Analyze the following contribution data for the period: ${period}. Provide a concise, insightful summary for a non-profit manager. Include total contributions, top campaign, trends, and average contribution. Data: Campaigns: ${JSON.stringify(campaigns)}, Contributions: ${JSON.stringify(contributions.slice(0, 100))}`;
    try {
        const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt, config: { temperature: 0.3 } });
        res.json({ summary: response.text });
    } catch (error) { res.status(500).json({ error: "AI analysis failed." }); }
});

app.post('/api/ai/note', authMiddleware, permissionMiddleware('page:contributions:view'), async (req, res) => {
    const { donorName, amount, campaignName } = req.body;
    const prompt = `Generate a warm, personal 3-4 sentence thank you note to ${donorName} for their contribution of ₹${amount} to the "${campaignName}" campaign.`;
    try {
        const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt, config: { temperature: 0.7 } });
        res.json({ note: response.text });
    } catch (error) { res.status(500).json({ error: "AI note generation failed." }); }
});


// --- Server Start ---
const startServer = async () => {
    await seedDatabase();
    if (isProduction) {
        app.use(express.static(path.join(__dirname, '../dist')));
        app.get('*', (req, res) => {
            res.sendFile(path.join(__dirname, '../dist/index.html'));
        });
    }
    app.listen(port, () => {
        console.log(`Server is running on http://localhost:${port}`);
    });
};

startServer();