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

const applySchema = async (client) => {
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
};

module.exports = { applySchema };
