
const applySchema = async (client) => {
    // Enable UUID extension
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

    const queries = [
        // Users, Roles, and Permissions
        `CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255),
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS roles (
            id SERIAL PRIMARY KEY,
            name VARCHAR(50) UNIQUE NOT NULL,
            description TEXT
        )`,
        `CREATE TABLE IF NOT EXISTS permissions (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) UNIQUE NOT NULL,
            description TEXT
        )`,
        `CREATE TABLE IF NOT EXISTS user_roles (
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
            PRIMARY KEY (user_id, role_id)
        )`,
        `CREATE TABLE IF NOT EXISTS role_permissions (
            role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
            permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
            PRIMARY KEY (role_id, permission_id)
        )`,
        `CREATE TABLE IF NOT EXISTS user_sessions (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            token TEXT UNIQUE NOT NULL,
            expires_at TIMESTAMPTZ NOT NULL,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )`,

        // History and Tracking Tables
        `CREATE TABLE IF NOT EXISTS login_history (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            login_method VARCHAR(20) NOT NULL,
            ip_address VARCHAR(45),
            user_agent TEXT,
            login_timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS page_access_history (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            page_path TEXT NOT NULL,
            ip_address VARCHAR(45),
            user_agent TEXT,
            access_timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )`,
        
        // Core Data Tables
        `CREATE TABLE IF NOT EXISTS campaigns (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            goal NUMERIC(15, 2) NOT NULL,
            description TEXT,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMPTZ
        )`,
        `CREATE TABLE IF NOT EXISTS contributions (
            id SERIAL PRIMARY KEY,
            donor_name VARCHAR(255) NOT NULL,
            donor_email VARCHAR(255),
            mobile_number VARCHAR(20),
            tower_number VARCHAR(50) NOT NULL,
            flat_number VARCHAR(50) NOT NULL,
            amount NUMERIC(10, 2) NOT NULL,
            number_of_coupons INTEGER NOT NULL DEFAULT 0,
            campaign_id INTEGER REFERENCES campaigns(id),
            date DATE NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'Completed',
            type VARCHAR(20),
            image TEXT,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMPTZ
        )`,
        `CREATE TABLE IF NOT EXISTS sponsors (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            contact_number VARCHAR(20) NOT NULL,
            address TEXT NOT NULL,
            email VARCHAR(255),
            business_category VARCHAR(100) NOT NULL,
            business_info TEXT NOT NULL,
            sponsorship_amount NUMERIC(12, 2) NOT NULL,
            sponsorship_type VARCHAR(100) NOT NULL,
            date_paid DATE NOT NULL,
            payment_received_by VARCHAR(100) NOT NULL,
            image TEXT,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMPTZ
        )`,
        `CREATE TABLE IF NOT EXISTS vendors (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            business TEXT,
            address TEXT,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMPTZ
        )`,
        `CREATE TABLE IF NOT EXISTS contact_persons (
            id SERIAL PRIMARY KEY,
            vendor_id INTEGER REFERENCES vendors(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            contact_number VARCHAR(20) NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS festivals (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            campaign_id INTEGER REFERENCES campaigns(id),
            stall_price_per_table_per_day NUMERIC(10, 2),
            stall_electricity_cost_per_day NUMERIC(10, 2),
            stall_start_date DATE,
            stall_end_date DATE,
            max_stalls INTEGER,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMPTZ
        )`,
        `CREATE TABLE IF NOT EXISTS expenses (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            vendor_id INTEGER REFERENCES vendors(id),
            total_cost NUMERIC(12, 2) NOT NULL,
            bill_date DATE NOT NULL,
            expense_head VARCHAR(100) NOT NULL,
            expense_by VARCHAR(100) NOT NULL,
            festival_id INTEGER REFERENCES festivals(id),
            has_multiple_payments BOOLEAN DEFAULT false,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMPTZ
        )`,
        `CREATE TABLE IF NOT EXISTS expense_payments (
            id SERIAL PRIMARY KEY,
            expense_id INTEGER REFERENCES expenses(id) ON DELETE CASCADE,
            amount NUMERIC(12, 2) NOT NULL,
            payment_date DATE NOT NULL,
            payment_method VARCHAR(50) NOT NULL,
            notes TEXT,
            image_data TEXT,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMPTZ
        )`,
        `CREATE TABLE IF NOT EXISTS expense_images (
            id SERIAL PRIMARY KEY,
            expense_id INTEGER REFERENCES expenses(id) ON DELETE CASCADE,
            image_data TEXT NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS quotations (
            id SERIAL PRIMARY KEY,
            quotation_for VARCHAR(255) NOT NULL,
            vendor_id INTEGER REFERENCES vendors(id),
            cost NUMERIC(12, 2) NOT NULL,
            date DATE NOT NULL,
            festival_id INTEGER REFERENCES festivals(id),
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMPTZ
        )`,
        `CREATE TABLE IF NOT EXISTS quotation_images (
            id SERIAL PRIMARY KEY,
            quotation_id INTEGER REFERENCES quotations(id) ON DELETE CASCADE,
            image_data TEXT NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS budgets (
            id SERIAL PRIMARY KEY,
            item_name VARCHAR(255) NOT NULL,
            budgeted_amount NUMERIC(12, 2) NOT NULL,
            expense_head VARCHAR(100) NOT NULL,
            festival_id INTEGER REFERENCES festivals(id),
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMPTZ
        )`,
        `CREATE TABLE IF NOT EXISTS tasks (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            status VARCHAR(50) NOT NULL DEFAULT 'To Do',
            due_date DATE NOT NULL,
            festival_id INTEGER REFERENCES festivals(id),
            assignee_name VARCHAR(255) NOT NULL,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMPTZ
        )`,
        `CREATE TABLE IF NOT EXISTS events (
            id SERIAL PRIMARY KEY,
            festival_id INTEGER REFERENCES festivals(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            event_date DATE NOT NULL,
            start_time TIME,
            end_time TIME,
            venue TEXT NOT NULL,
            image_data TEXT,
            registration_form_schema JSONB,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMPTZ
        )`,
        `CREATE TABLE IF NOT EXISTS event_contact_persons (
            id SERIAL PRIMARY KEY,
            event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            contact_number VARCHAR(20) NOT NULL,
            email VARCHAR(255)
        )`,
        `CREATE TABLE IF NOT EXISTS event_registrations (
            id SERIAL PRIMARY KEY,
            event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255),
            form_data JSONB NOT NULL,
            submitted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            payment_proof_image TEXT
        )`,
        `CREATE TABLE IF NOT EXISTS festival_photos (
            id SERIAL PRIMARY KEY,
            festival_id INTEGER REFERENCES festivals(id) ON DELETE CASCADE,
            image_data TEXT NOT NULL,
            uploaded_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS stall_registrations (
            id SERIAL PRIMARY KEY,
            festival_id INTEGER REFERENCES festivals(id) ON DELETE CASCADE,
            registrant_name VARCHAR(255) NOT NULL,
            contact_number VARCHAR(20) NOT NULL,
            stall_dates DATE[] NOT NULL,
            products JSONB,
            needs_electricity BOOLEAN DEFAULT false,
            number_of_tables INTEGER NOT NULL DEFAULT 1,
            total_payment NUMERIC(10, 2) NOT NULL,
            payment_screenshot TEXT NOT NULL,
            submitted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            status VARCHAR(20) NOT NULL DEFAULT 'Pending',
            rejection_reason TEXT,
            reviewed_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            reviewed_at TIMESTAMPTZ
        )`,

        // History Tables
        ...['contributions', 'sponsors', 'vendors', 'expenses', 'quotations', 'budgets', 'festivals', 'tasks', 'events', 'campaigns'].map(table => 
        `CREATE TABLE IF NOT EXISTS ${table}_history (
            id SERIAL PRIMARY KEY,
            record_id INTEGER NOT NULL,
            field_changed VARCHAR(255) NOT NULL,
            old_value TEXT,
            new_value TEXT,
            changed_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            changed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )`)
    ];

    for (const query of queries) {
        await client.query(query);
    }
};

module.exports = { applySchema };
