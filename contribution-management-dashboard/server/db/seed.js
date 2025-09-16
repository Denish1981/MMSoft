const db = require('../db');

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
    { name: 'page:events:view', description: 'Can view the festival events page' },
    { name: 'page:participants:view', description: 'Can view the unique participants page' },
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
        'page:quotations:view', 'page:budget:view', 'page:campaigns:view', 'page:festivals:view', 'page:events:view', 'page:participants:view', 'page:tasks:view', 'page:reports:view', 'page:ai-insights:view',
        'page:archive:view',
        'action:create', 'action:edit', 'action:delete', 'action:restore'
    ],
    'Viewer': [
        'page:dashboard:view', 'page:contributions:view', 'page:donors:view',
        'page:sponsors:view', 'page:vendors:view', 'page:expenses:view',
        'page:quotations:view', 'page:budget:view', 'page:campaigns:view', 'page:festivals:view', 'page:events:view', 'page:participants:view', 'page:tasks:view', 'page:reports:view', 'page:ai-insights:view'
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
        const tablesToTimestamp = ['sponsors', 'vendors', 'expenses', 'quotations', 'budgets', 'festivals', 'campaigns', 'tasks', 'contributions', 'events', 'stall_registrations'];
        for (const table of tablesToTimestamp) {
             await client.query(`
                CREATE TABLE IF NOT EXISTS events (
                    id SERIAL PRIMARY KEY,
                    festival_id INTEGER NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
                    name VARCHAR(255) NOT NULL,
                    event_date DATE NOT NULL,
                    start_time TIME,
                    end_time TIME,
                    description TEXT,
                    image_data TEXT,
                    venue VARCHAR(255)
                );
            `);
             await client.query(`
                CREATE TABLE IF NOT EXISTS event_contact_persons (
                    id SERIAL PRIMARY KEY,
                    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
                    name VARCHAR(255) NOT NULL,
                    contact_number VARCHAR(20),
                    email VARCHAR(255)
                );
            `);
            await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
            await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
            await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;`);
        }
        await client.query(`ALTER TABLE events DROP COLUMN IF EXISTS registration_link;`);
        await client.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS registration_form_schema JSONB DEFAULT '[]'::jsonb;`);
        await client.query(`ALTER TABLE sponsors ADD COLUMN IF NOT EXISTS date_paid DATE;`);
        await client.query(`ALTER TABLE sponsors ADD COLUMN IF NOT EXISTS payment_received_by VARCHAR(255);`);
        await client.query(`ALTER TABLE sponsors ADD COLUMN IF NOT EXISTS image TEXT;`);
        
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
        await client.query(`ALTER TABLE festival_photos ADD COLUMN IF NOT EXISTS uploaded_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;`);

        // --- Event Registrations Table ---
        await client.query(`
            CREATE TABLE IF NOT EXISTS event_registrations (
                id SERIAL PRIMARY KEY,
                event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255),
                form_data JSONB,
                submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);
        await client.query(`ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS payment_proof_image TEXT;`);
        await client.query(`ALTER TABLE event_registrations DROP COLUMN IF EXISTS phone_number;`);
        await client.query(`ALTER TABLE event_registrations ALTER COLUMN email DROP NOT NULL;`);

        // --- Stall Registrations ---
        await client.query(`ALTER TABLE festivals ADD COLUMN IF NOT EXISTS stall_registration_open BOOLEAN DEFAULT FALSE;`);
        await client.query(`ALTER TABLE festivals ADD COLUMN IF NOT EXISTS stall_start_date DATE;`);
        await client.query(`ALTER TABLE festivals ADD COLUMN IF NOT EXISTS stall_end_date DATE;`);
        await client.query(`ALTER TABLE festivals ADD COLUMN IF NOT EXISTS stall_price_per_table_per_day NUMERIC(10, 2);`);
        await client.query(`ALTER TABLE festivals ADD COLUMN IF NOT EXISTS stall_electricity_cost_per_day NUMERIC(10, 2);`);

        await client.query(`
            CREATE TABLE IF NOT EXISTS stall_registrations (
                id SERIAL PRIMARY KEY,
                festival_id INTEGER NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
                registrant_name VARCHAR(255) NOT NULL,
                contact_number VARCHAR(20) NOT NULL,
                stall_dates DATE[] NOT NULL,
                products JSONB,
                needs_electricity BOOLEAN NOT NULL,
                number_of_tables INTEGER NOT NULL,
                total_payment NUMERIC(10, 2) NOT NULL,
                payment_screenshot TEXT NOT NULL,
                submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                deleted_at TIMESTAMPTZ
            );
        `);

        // --- FIX: Retroactively remove the 'email' field from all existing event registration forms.
        // This ensures all events, new and old, align with the policy of not having an email field by default.
        await client.query(`
            UPDATE events
            SET 
                registration_form_schema = COALESCE(
                    (
                        SELECT jsonb_agg(elem)
                        FROM jsonb_array_elements(registration_form_schema) AS elem
                        WHERE elem->>'name' <> 'email'
                    ),
                    '[]'::jsonb
                )
            WHERE 
                -- Only update rows that actually have an 'email' field in their schema.
                registration_form_schema @> '[{"name":"email"}]';
        `);
        
        // --- FIX: Ensure all events have tower and flat number fields for contribution check ---
        await client.query(`
            UPDATE events
            SET registration_form_schema = registration_form_schema || 
                CASE WHEN NOT registration_form_schema @> '[{"name":"tower_number"}]' THEN '[{"name": "tower_number", "label": "Tower Number", "type": "text", "required": true}]'::jsonb ELSE '[]'::jsonb END ||
                CASE WHEN NOT registration_form_schema @> '[{"name":"flat_number"}]' THEN '[{"name": "flat_number", "label": "Flat Number", "type": "text", "required": true}]'::jsonb ELSE '[]'::jsonb END
            WHERE deleted_at IS NULL;
        `);
        console.log("Ensured event registration forms include Tower and Flat Number fields.");


        // --- Expense Payment Migration ---
        const expenseColumns = await client.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'expenses' AND table_schema = 'public' AND column_name = 'cost'
        `);
        if (expenseColumns.rows.length > 0) {
            await client.query('ALTER TABLE expenses RENAME COLUMN cost TO total_cost');
            console.log("Migrated 'expenses' table: renamed 'cost' to 'total_cost'.");
        }
        await client.query(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS has_multiple_payments BOOLEAN NOT NULL DEFAULT FALSE;`);
        await client.query(`
            CREATE TABLE IF NOT EXISTS expense_payments (
                id SERIAL PRIMARY KEY,
                expense_id INTEGER NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
                amount NUMERIC(10, 2) NOT NULL,
                payment_date DATE NOT NULL,
                payment_method VARCHAR(50) NOT NULL,
                notes TEXT,
                image_data TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                deleted_at TIMESTAMPTZ
            );
        `);
        await client.query('ALTER TABLE expense_payments ADD COLUMN IF NOT EXISTS image_data TEXT;');
        // --- End Expense Payment Migration ---


        // History tables
        await createHistoryTable(client, 'contributions_history', 'contributions');
        await createHistoryTable(client, 'sponsors_history', 'sponsors');
        await createHistoryTable(client, 'vendors_history', 'vendors');
        await createHistoryTable(client, 'expenses_history', 'expenses');
        await createHistoryTable(client, 'quotations_history', 'quotations');
        await createHistoryTable(client, 'budgets_history', 'budgets');
        await createHistoryTable(client, 'festivals_history', 'festivals');
        await createHistoryTable(client, 'task_history', 'tasks', 'INTEGER');
        await createHistoryTable(client, 'events_history', 'events');
        await createHistoryTable(client, 'expense_payments_history', 'expense_payments');
        await createHistoryTable(client, 'campaigns_history', 'campaigns');
        await createHistoryTable(client, 'stall_registrations_history', 'stall_registrations');


        const permissionMap = new Map();
        for (const perm of ALL_PERMISSIONS) {
            const res = await client.query('INSERT INTO permissions (name, description) VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET description = $2 RETURNING id, name', [perm.name, perm.description]);
            permissionMap.set(res.rows[0].name, res.rows[0].id);
        }

        // FIX: Make the role permission seeding idempotent.
        // This ensures that on every start, the permissions for each role are synced with the config.
        for (const roleName in ROLES_CONFIG) {
            const roleRes = await client.query(
                'INSERT INTO roles (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id',
                [roleName]
            );
            const roleId = roleRes.rows[0].id;

            // Sync permissions: first delete existing, then add from config.
            await client.query('DELETE FROM role_permissions WHERE role_id = $1', [roleId]);

            const permissionsForRole = ROLES_CONFIG[roleName];
            for (const permName of permissionsForRole) {
                const permId = permissionMap.get(permName);
                if (permId) {
                    await client.query('INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [roleId, permId]);
                }
            }
            console.log(`Permissions for role '${roleName}' have been synced.`);
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

module.exports = { seedDatabase };