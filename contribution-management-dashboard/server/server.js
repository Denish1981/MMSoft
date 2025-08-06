
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const { GoogleGenAI } = require('@google/genai');
const { OAuth2Client } = require('google-auth-library');
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
    { name: 'page:reports:view', description: 'Can view the reports page' },
    { name: 'page:ai-insights:view', description: 'Can view the AI insights page' },
    { name: 'page:user-management:view', description: 'Can view the user management page' },
    { name: 'action:create', description: 'Can create new items (contributions, expenses, etc.)' },
    { name: 'action:edit', description: 'Can edit existing items' },
    { name: 'action:delete', description: 'Can delete items' },
    { name: 'action:users:manage', description: 'Can create users and manage their roles' },
];

const ROLES_CONFIG = {
    'Admin': ALL_PERMISSIONS.map(p => p.name),
    'Manager': [
        'page:dashboard:view', 'page:contributions:view', 'page:bulk-add:view',
        'page:donors:view', 'page:sponsors:view', 'page:vendors:view', 'page:expenses:view',
        'page:quotations:view', 'page:budget:view', 'page:campaigns:view', 'page:reports:view', 'page:ai-insights:view',
        'action:create', 'action:edit', 'action:delete'
    ],
    'Viewer': [
        'page:dashboard:view', 'page:contributions:view', 'page:donors:view',
        'page:sponsors:view', 'page:vendors:view', 'page:expenses:view',
        'page:quotations:view', 'page:budget:view', 'page:campaigns:view', 'page:reports:view', 'page:ai-insights:view'
    ]
};

const seedDatabase = async () => {
    const client = await db.getPool().connect();
    try {
        await client.query('BEGIN');
        console.log('Seeding database with roles and permissions...');

        // Insert all permissions
        const permissionMap = new Map();
        for (const perm of ALL_PERMISSIONS) {
            const res = await client.query('INSERT INTO permissions (name, description) VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET description = $2 RETURNING id, name', [perm.name, perm.description]);
            permissionMap.set(res.rows[0].name, res.rows[0].id);
        }

        // Insert roles and associate permissions
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
        
        // Ensure the admin user from .env exists and has the Admin role
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

// --- API Routes ---

// Authentication
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await db.query('SELECT id, username FROM users WHERE username = $1 AND password = $2', [username, password]);
        if (result.rows.length > 0) {
            const user = result.rows[0];
            const permissions = await getUserPermissions(user.id);

            if (permissions.length === 0) {
                return res.status(403).json({ message: 'Login failed. Your account has not been assigned any roles.' });
            }

            await logLoginHistory(user.id, 'password', req);
            res.status(200).json({ user: { id: user.id, email: user.username, permissions } });
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

        if (!email) {
            return res.status(400).json({ message: 'Invalid Google token: email not found.' });
        }

        const userResult = await db.query('SELECT id, username FROM users WHERE username = $1', [email]);
        if (userResult.rows.length === 0) {
            return res.status(403).json({ message: 'Access denied. Your account has not been set up by an administrator.' });
        }

        const user = userResult.rows[0];
        const permissions = await getUserPermissions(user.id);
        if (permissions.length === 0) {
            return res.status(403).json({ message: 'Access denied. Your account has no assigned roles.' });
        }

        await logLoginHistory(user.id, 'google', req);
        res.status(200).json({ user: { id: user.id, email: user.username, permissions } });

    } catch (error) {
        console.error('Google Auth Error:', error);
        res.status(401).json({ message: 'Invalid Google token' });
    }
});

// Page Access Tracking
app.post('/api/track-access', async (req, res) => {
    const { userEmail, pagePath } = req.body;
    if (!userEmail || !pagePath) return res.status(400).json({ error: 'userEmail and pagePath are required' });
    try {
        const userResult = await db.query('SELECT id FROM users WHERE username = $1', [userEmail]);
        if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        const userId = userResult.rows[0].id;
        await db.query('INSERT INTO page_access_history (user_id, page_path, ip_address, user_agent) VALUES ($1, $2, $3, $4)',
            [userId, pagePath, req.ip, req.headers['user-agent']]);
        res.status(200).json({ success: true });
    } catch (err) {
        console.error('Failed to track page access:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// --- User & Role Management ---
app.get('/api/users/management', async (req, res) => {
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

app.post('/api/users', async (req, res) => {
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
        if (err.code === '23505') { // unique_violation
            return res.status(409).json({ error: 'A user with this email already exists.' });
        }
        console.error('Error creating user:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

app.get('/api/roles', async (req, res) => {
    try {
        const { rows } = await db.query('SELECT id, name, description FROM roles ORDER BY name ASC');
        res.json(rows);
    } catch (err) {
        console.error('Error fetching roles:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.put('/api/users/:id/roles', async (req, res) => {
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
        res.status(200).json({ message: 'User roles updated successfully.' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error updating user roles:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});


// Generic GET all endpoint factory
const createGetAllEndpoint = (tableName) => async (req, res) => {
    try {
        const { rows } = await db.query(`SELECT * FROM ${tableName} ORDER BY id DESC`);
        res.json(rows);
    } catch (err) {
        console.error(`Error fetching ${tableName}:`, err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// GET all vendors with contacts
app.get('/api/vendors', async (req, res) => {
    try {
        const vendorsResult = await db.query('SELECT * FROM vendors ORDER BY name ASC');
        const vendors = vendorsResult.rows;
        
        for (const vendor of vendors) {
            const contactsResult = await db.query('SELECT name, contact_number as "contactNumber" FROM contact_persons WHERE vendor_id = $1', [vendor.id]);
            vendor.contacts = contactsResult.rows;
        }
        
        res.json(vendors);
    } catch (err) {
        console.error('Error fetching vendors:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET all quotations with images
app.get('/api/quotations', async (req, res) => {
    try {
        const quotationsResult = await db.query('SELECT id, quotation_for AS "quotationFor", vendor_id AS "vendorId", cost, date FROM quotations ORDER BY date DESC');
        const quotations = quotationsResult.rows;
        
        for (const quote of quotations) {
            const imagesResult = await db.query('SELECT image_data FROM quotation_images WHERE quotation_id = $1', [quote.id]);
            quote.quotationImages = imagesResult.rows.map(row => row.image_data);
        }
        
        res.json(quotations);
    } catch (err) {
        console.error('Error fetching quotations:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// GET Endpoints
app.get('/api/contributions', async (req, res) => {
    try {
        const { rows } = await db.query(
            'SELECT id, donor_name AS "donorName", donor_email AS "donorEmail", mobile_number AS "mobileNumber", tower_number AS "towerNumber", flat_number AS "flatNumber", amount, number_of_coupons AS "numberOfCoupons", campaign_id AS "campaignId", date, status, type, image FROM contributions ORDER BY date DESC'
        );
        res.json(rows);
    } catch (err) {
        console.error('Error fetching contributions:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.get('/api/campaigns', createGetAllEndpoint('campaigns'));
app.get('/api/budgets', async (req, res) => {
    try {
        const { rows } = await db.query(
            'SELECT id, item_name AS "itemName", budgeted_amount AS "budgetedAmount", expense_head AS "expenseHead" FROM budgets ORDER BY item_name ASC'
        );
        res.json(rows);
    } catch (err) {
        console.error('Error fetching budgets:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/sponsors', async (req, res) => {
    try {
        const { rows } = await db.query(
            'SELECT id, name, contact_number AS "contactNumber", address, email, business_category AS "businessCategory", business_info AS "businessInfo", sponsorship_amount AS "sponsorshipAmount", sponsorship_type AS "sponsorshipType" FROM sponsors ORDER BY name ASC'
        );
        res.json(rows);
    } catch (err) {
        console.error('Error fetching sponsors:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/expenses', async (req, res) => {
    try {
        const expensesResult = await db.query(
            'SELECT id, name, vendor_id AS "vendorId", cost, bill_date AS "billDate", expense_head AS "expenseHead", expense_by AS "expenseBy" FROM expenses ORDER BY bill_date DESC'
        );
        const expenses = expensesResult.rows;
        for (const expense of expenses) {
            const imagesResult = await db.query('SELECT image_data FROM expense_images WHERE expense_id = $1', [expense.id]);
            expense.billReceipts = imagesResult.rows.map(row => row.image_data);
        }
        res.json(expenses);
    } catch (err) {
        console.error('Error fetching expenses:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// --- POST (Create) Endpoints ---
app.post('/api/contributions', async (req, res) => {
    const { donorName, donorEmail, mobileNumber, towerNumber, flatNumber, amount, numberOfCoupons, campaignId, date, type, image } = req.body;
    const newContribution = {
        id: `con_${Date.now()}`, status: 'Completed', ...req.body, date: date || new Date().toISOString()
    };
    const dbCampaignId = campaignId || null; // Convert empty string to null
    try {
        await db.query(
            'INSERT INTO contributions (id, donor_name, donor_email, mobile_number, tower_number, flat_number, amount, number_of_coupons, campaign_id, date, status, type, image) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)',
            [newContribution.id, donorName, donorEmail, mobileNumber, towerNumber, flatNumber, amount, numberOfCoupons, dbCampaignId, newContribution.date, newContribution.status, type, image]
        );
        res.status(201).json(newContribution);
    } catch (err) {
        console.error('Error adding contribution:', err); res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/contributions/bulk', async (req, res) => {
    const { contributions } = req.body;

    if (!contributions || !Array.isArray(contributions) || contributions.length === 0) {
        return res.status(400).json({ error: 'Contributions array is required and must not be empty.' });
    }

    const client = await db.getPool().connect();
    const createdContributions = [];

    try {
        await client.query('BEGIN');
        
        for (let i = 0; i < contributions.length; i++) {
            const c = contributions[i];
            const newContribution = {
                id: `con_${Date.now()}_${i}`,
                status: 'Completed',
                ...c,
                date: c.date || new Date().toISOString(),
            };
            const dbCampaignId = newContribution.campaignId || null;

            const result = await client.query(
                'INSERT INTO contributions (id, donor_name, donor_email, mobile_number, tower_number, flat_number, amount, number_of_coupons, campaign_id, date, status, type, image) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id, donor_name AS "donorName", donor_email AS "donorEmail", mobile_number AS "mobileNumber", tower_number AS "towerNumber", flat_number AS "flatNumber", amount, number_of_coupons AS "numberOfCoupons", campaign_id AS "campaignId", date, status, type, image',
                [newContribution.id, newContribution.donorName, newContribution.donorEmail, newContribution.mobileNumber, newContribution.towerNumber, newContribution.flatNumber, newContribution.amount, newContribution.numberOfCoupons, dbCampaignId, newContribution.date, newContribution.status, newContribution.type, newContribution.image]
            );
            createdContributions.push(result.rows[0]);
        }

        await client.query('COMMIT');
        res.status(201).json(createdContributions);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error adding bulk contributions:', err);
        res.status(500).json({ error: 'Internal server error during bulk insert' });
    } finally {
        client.release();
    }
});

app.post('/api/sponsors', async (req, res) => {
    const { name, contactNumber, address, email, businessCategory, businessInfo, sponsorshipAmount, sponsorshipType } = req.body;
    const newSponsor = { id: `sp_${Date.now()}`, ...req.body };
    try {
        await db.query(
            'INSERT INTO sponsors (id, name, contact_number, address, email, business_category, business_info, sponsorship_amount, sponsorship_type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
            [newSponsor.id, name, contactNumber, address, email, businessCategory, businessInfo, sponsorshipAmount, sponsorshipType]
        );
        res.status(201).json(newSponsor);
    } catch (err) {
        console.error('Error adding sponsor:', err); res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/vendors', async (req, res) => {
    const { name, business, address, contacts } = req.body;
    const newVendor = { id: `ven_${Date.now()}`, name, business, address, contacts };
    const client = await db.getPool().connect();
    try {
        await client.query('BEGIN');
        await client.query('INSERT INTO vendors (id, name, business, address) VALUES ($1, $2, $3, $4)', [newVendor.id, name, business, address]);
        for (const contact of contacts) {
            await client.query('INSERT INTO contact_persons (vendor_id, name, contact_number) VALUES ($1, $2, $3)', [newVendor.id, contact.name, contact.contactNumber]);
        }
        await client.query('COMMIT');
        res.status(201).json(newVendor);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error adding vendor:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

app.post('/api/expenses', async (req, res) => {
    const { name, vendorId, cost, billDate, expenseHead, billReceipts, expenseBy } = req.body;
    const newExpense = { id: `exp_${Date.now()}`, name, vendorId, cost, billDate, expenseHead, billReceipts, expenseBy };
    const client = await db.getPool().connect();
    try {
        await client.query('BEGIN');
        await client.query('INSERT INTO expenses (id, name, vendor_id, cost, bill_date, expense_head, expense_by) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [newExpense.id, name, vendorId, cost, billDate, expenseHead, expenseBy]);
        if (billReceipts && billReceipts.length > 0) {
            for (const image of billReceipts) {
                await client.query('INSERT INTO expense_images (expense_id, image_data) VALUES ($1, $2)', [newExpense.id, image]);
            }
        }
        await client.query('COMMIT');
        res.status(201).json(newExpense);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error adding expense:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

app.post('/api/quotations', async (req, res) => {
    const { quotationFor, vendorId, cost, date, quotationImages } = req.body;
    const newQuotation = { id: `quo_${Date.now()}`, ...req.body };
    const client = await db.getPool().connect();
    try {
        await client.query('BEGIN');
        await client.query('INSERT INTO quotations (id, quotation_for, vendor_id, cost, date) VALUES ($1, $2, $3, $4, $5)', [newQuotation.id, quotationFor, vendorId, cost, date]);
        for (const image of quotationImages) {
            await client.query('INSERT INTO quotation_images (quotation_id, image_data) VALUES ($1, $2)', [newQuotation.id, image]);
        }
        await client.query('COMMIT');
        res.status(201).json(newQuotation);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error adding quotation:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

app.post('/api/budgets', async (req, res) => {
    const { itemName, budgetedAmount, expenseHead } = req.body;
    const newBudget = { id: `bud_${Date.now()}`, ...req.body };
    try {
        await db.query(
            'INSERT INTO budgets (id, item_name, budgeted_amount, expense_head) VALUES ($1, $2, $3, $4)',
            [newBudget.id, itemName, budgetedAmount, expenseHead]
        );
        res.status(201).json(newBudget);
    } catch (err) {
        console.error('Error adding budget:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// --- PUT (Update) Endpoints ---
app.put('/api/contributions/:id', async (req, res) => {
    const { id } = req.params;
    const { donorName, donorEmail, mobileNumber, towerNumber, flatNumber, amount, numberOfCoupons, campaignId, date, type, image, status } = req.body;
    const dbCampaignId = campaignId || null;
    try {
        const result = await db.query(
            'UPDATE contributions SET donor_name=$1, donor_email=$2, mobile_number=$3, tower_number=$4, flat_number=$5, amount=$6, number_of_coupons=$7, campaign_id=$8, date=$9, type=$10, image=$11, status=$12 WHERE id=$13 RETURNING id, donor_name AS "donorName", donor_email AS "donorEmail", mobile_number AS "mobileNumber", tower_number AS "towerNumber", flat_number AS "flatNumber", amount, number_of_coupons AS "numberOfCoupons", campaign_id AS "campaignId", date, status, type, image',
            [donorName, donorEmail, mobileNumber, towerNumber, flatNumber, amount, numberOfCoupons, dbCampaignId, date, type, image, status, id]
        );
        res.json(result.rows[0]);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to update contribution' }); }
});

app.put('/api/sponsors/:id', async (req, res) => {
    const { id } = req.params;
    const { name, contactNumber, address, email, businessCategory, businessInfo, sponsorshipAmount, sponsorshipType } = req.body;
    try {
        const result = await db.query(
            'UPDATE sponsors SET name=$1, contact_number=$2, address=$3, email=$4, business_category=$5, business_info=$6, sponsorship_amount=$7, sponsorship_type=$8 WHERE id=$9 RETURNING id, name, contact_number AS "contactNumber", address, email, business_category AS "businessCategory", business_info AS "businessInfo", sponsorship_amount AS "sponsorshipAmount", sponsorship_type AS "sponsorshipType"',
            [name, contactNumber, address, email, businessCategory, businessInfo, sponsorshipAmount, sponsorshipType, id]
        );
        res.json(result.rows[0]);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to update sponsor' }); }
});

app.put('/api/vendors/:id', async (req, res) => {
    const { id } = req.params;
    const { name, business, address, contacts } = req.body;
    const client = await db.getPool().connect();
    try {
        await client.query('BEGIN');
        await client.query('UPDATE vendors SET name=$1, business=$2, address=$3 WHERE id=$4', [name, business, address, id]);
        await client.query('DELETE FROM contact_persons WHERE vendor_id=$1', [id]);
        for (const contact of contacts) {
            await client.query('INSERT INTO contact_persons (vendor_id, name, contact_number) VALUES ($1, $2, $3)', [id, contact.name, contact.contactNumber]);
        }
        await client.query('COMMIT');
        res.json({ id, name, business, address, contacts });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Failed to update vendor' });
    } finally {
        client.release();
    }
});

app.put('/api/expenses/:id', async (req, res) => {
    const { id } = req.params;
    const { name, vendorId, cost, billDate, expenseHead, billReceipts, expenseBy } = req.body;
    const client = await db.getPool().connect();
    try {
        await client.query('BEGIN');
        await client.query('UPDATE expenses SET name=$1, vendor_id=$2, cost=$3, bill_date=$4, expense_head=$5, expense_by=$6 WHERE id=$7',
            [name, vendorId, cost, billDate, expenseHead, expenseBy, id]);
        
        await client.query('DELETE FROM expense_images WHERE expense_id=$1', [id]);
        if (billReceipts && billReceipts.length > 0) {
            for (const image of billReceipts) {
                await client.query('INSERT INTO expense_images (expense_id, image_data) VALUES ($1, $2)', [id, image]);
            }
        }
        await client.query('COMMIT');
        res.json({ id, name, vendorId, cost, billDate, expenseHead, billReceipts, expenseBy });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Failed to update expense' });
    } finally {
        client.release();
    }
});

app.put('/api/quotations/:id', async (req, res) => {
    const { id } = req.params;
    const { quotationFor, vendorId, cost, date, quotationImages } = req.body;
    const client = await db.getPool().connect();
    try {
        await client.query('BEGIN');
        await client.query('UPDATE quotations SET quotation_for=$1, vendor_id=$2, cost=$3, date=$4 WHERE id=$5', [quotationFor, vendorId, cost, date, id]);
        await client.query('DELETE FROM quotation_images WHERE quotation_id=$1', [id]);
        for (const image of quotationImages) {
            await client.query('INSERT INTO quotation_images (quotation_id, image_data) VALUES ($1, $2)', [id, image]);
        }
        await client.query('COMMIT');
        res.json({ id, quotationFor, vendorId, cost, date, quotationImages });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Failed to update quotation' });
    } finally {
        client.release();
    }
});

app.put('/api/budgets/:id', async (req, res) => {
    const { id } = req.params;
    const { itemName, budgetedAmount, expenseHead } = req.body;
    try {
        const result = await db.query(
            'UPDATE budgets SET item_name=$1, budgeted_amount=$2, expense_head=$3 WHERE id=$4 RETURNING id, item_name AS "itemName", budgeted_amount AS "budgetedAmount", expense_head AS "expenseHead"',
            [itemName, budgetedAmount, expenseHead, id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update budget' });
    }
});

// --- DELETE Endpoints ---
const createDeleteEndpoint = (tableName) => async (req, res) => {
    try {
        await db.query(`DELETE FROM ${tableName} WHERE id = $1`, [req.params.id]);
        res.status(204).send();
    } catch (err) { console.error(err); res.status(500).json({ error: `Failed to delete from ${tableName}` }); }
};

app.delete('/api/contributions/:id', createDeleteEndpoint('contributions'));
app.delete('/api/sponsors/:id', createDeleteEndpoint('sponsors'));
app.delete('/api/budgets/:id', createDeleteEndpoint('budgets'));

app.delete('/api/expenses/:id', async (req, res) => {
    const { id } = req.params;
    const client = await db.getPool().connect();
    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM expense_images WHERE expense_id = $1', [id]);
        await client.query('DELETE FROM expenses WHERE id = $1', [id]);
        await client.query('COMMIT');
        res.status(204).send();
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error deleting expense:', err);
        res.status(500).json({ error: 'Failed to delete expense' });
    } finally {
        client.release();
    }
});

app.delete('/api/quotations/:id', async (req, res) => {
    const { id } = req.params;
    const client = await db.getPool().connect();
    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM quotation_images WHERE quotation_id = $1', [id]);
        await client.query('DELETE FROM quotations WHERE id = $1', [id]);
        await client.query('COMMIT');
        res.status(204).send();
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error deleting quotation:', err);
        res.status(500).json({ error: 'Failed to delete quotation' });
    } finally {
        client.release();
    }
});


app.delete('/api/vendors/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const expenseCheck = await db.query('SELECT id FROM expenses WHERE vendor_id = $1 LIMIT 1', [id]);
        if (expenseCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Cannot delete vendor. It is associated with one or more expenses.' });
        }
        const quotationCheck = await db.query('SELECT id FROM quotations WHERE vendor_id = $1 LIMIT 1', [id]);
        if (quotationCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Cannot delete vendor. It is associated with one or more quotations.' });
        }
        await db.query('DELETE FROM vendors WHERE id = $1', [id]);
        res.status(204).send();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete vendor' });
    }
});

// --- Gemini API Proxy Routes ---
app.post('/api/ai/summary', async (req, res) => {
    const { contributions, campaigns, period } = req.body;
    const prompt = `Analyze the following contribution data for the period: ${period}. Provide a concise, insightful summary for a non-profit manager. Include total contributions, top campaign, trends, and average contribution. Data: Campaigns: ${JSON.stringify(campaigns)}, Contributions: ${JSON.stringify(contributions.slice(0, 100))}`;
    try {
        const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt, config: { temperature: 0.3 } });
        res.json({ summary: response.text });
    } catch (error) {
        console.error("Error generating summary:", error); res.status(500).json({ error: "AI analysis failed." });
    }
});

app.post('/api/ai/note', async (req, res) => {
    const { donorName, amount, campaignName } = req.body;
    const prompt = `Generate a warm, personal 3-4 sentence thank you note to ${donorName} for their contribution of ₹${amount} to the "${campaignName}" campaign.`;
    try {
        const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt, config: { temperature: 0.7 } });
        res.json({ note: response.text });
    } catch (error) {
        console.error("Error generating note:", error); res.status(500).json({ error: "AI note generation failed." });
    }
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
