-- =================================================================
-- 1. CORE AUTHENTICATION & ROLE-BASED ACCESS CONTROL (RBAC) TABLES
-- =================================================================

-- Stores user login information.
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL, -- Typically an email address
    password VARCHAR(255), -- Hashed password for standard login
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Stores user roles (e.g., Admin, Manager, Viewer).
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT
);

-- Stores all possible granular permissions in the system.
CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT
);

-- Links users to roles in a many-to-many relationship.
CREATE TABLE user_roles (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- Links roles to permissions in a many-to-many relationship.
CREATE TABLE role_permissions (
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- Stores active user sessions for token-based authentication.
CREATE TABLE user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =================================================================
-- 2. ACTIVITY & HISTORY TRACKING TABLES
-- =================================================================

-- Tracks successful user login attempts.
CREATE TABLE login_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    login_method VARCHAR(50) NOT NULL,
    ip_address VARCHAR(50),
    user_agent TEXT,
    login_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tracks page views for user activity analysis.
CREATE TABLE page_access_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    page_path TEXT NOT NULL,
    ip_address VARCHAR(50),
    user_agent TEXT,
    accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =================================================================
-- 3. PRIMARY APPLICATION DATA TABLES
-- =================================================================

-- Campaigns Table
CREATE TABLE campaigns (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    goal NUMERIC(15, 2) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL -- For soft-delete
);

-- Festivals Table
CREATE TABLE festivals (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    campaign_id INTEGER REFERENCES campaigns(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL -- For soft-delete
);

-- Contributions Table
CREATE TABLE contributions (
    id SERIAL PRIMARY KEY,
    donor_name VARCHAR(255) NOT NULL,
    donor_email VARCHAR(255),
    mobile_number VARCHAR(20),
    tower_number VARCHAR(50) NOT NULL,
    flat_number VARCHAR(50) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    number_of_coupons INTEGER NOT NULL,
    campaign_id INTEGER REFERENCES campaigns(id) ON DELETE SET NULL,
    date TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) NOT NULL,
    type VARCHAR(50),
    image TEXT, -- Base64 encoded string
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL -- For soft-delete
);

-- Sponsors Table
CREATE TABLE sponsors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact_number VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    email VARCHAR(255),
    business_category VARCHAR(255) NOT NULL,
    business_info TEXT NOT NULL,
    sponsorship_amount NUMERIC(12, 2) NOT NULL,
    sponsorship_type VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL -- For soft-delete
);

-- Vendors Table
CREATE TABLE vendors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    business VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL -- For soft-delete
);

-- Contact Persons (linked to Vendors)
CREATE TABLE contact_persons (
    id SERIAL PRIMARY KEY,
    vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    contact_number VARCHAR(20) NOT NULL
);

-- Expenses Table
CREATE TABLE expenses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
    cost NUMERIC(10, 2) NOT NULL,
    bill_date DATE NOT NULL,
    expense_head VARCHAR(255) NOT NULL,
    expense_by VARCHAR(255) NOT NULL,
    festival_id INTEGER REFERENCES festivals(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL -- For soft-delete
);

-- Expense Images Table
CREATE TABLE expense_images (
    id SERIAL PRIMARY KEY,
    expense_id INTEGER NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    image_data TEXT NOT NULL -- Base64 encoded string
);

-- Quotations Table
CREATE TABLE quotations (
    id SERIAL PRIMARY KEY,
    quotation_for VARCHAR(255) NOT NULL,
    vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
    cost NUMERIC(10, 2) NOT NULL,
    date DATE NOT NULL,
    festival_id INTEGER REFERENCES festivals(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL -- For soft-delete
);

-- Quotation Images Table
CREATE TABLE quotation_images (
    id SERIAL PRIMARY KEY,
    quotation_id INTEGER NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    image_data TEXT NOT NULL -- Base64 encoded string
);

-- Budget Table
CREATE TABLE budgets (
    id SERIAL PRIMARY KEY,
    item_name VARCHAR(255) NOT NULL,
    budgeted_amount NUMERIC(12, 2) NOT NULL,
    expense_head VARCHAR(255) NOT NULL,
    festival_id INTEGER REFERENCES festivals(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL -- For soft-delete
);

-- Tasks Table
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL,
    due_date DATE NOT NULL,
    assignee_name VARCHAR(255) NOT NULL,
    festival_id INTEGER REFERENCES festivals(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL -- For soft-delete
);


-- =================================================================
-- 4. AUDIT TRAIL (HISTORY LOG) TABLES
-- =================================================================

CREATE TABLE festivals_history (
    id SERIAL PRIMARY KEY,
    record_id INTEGER NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
    field_changed VARCHAR(255) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE contributions_history (
    id SERIAL PRIMARY KEY,
    record_id INTEGER NOT NULL REFERENCES contributions(id) ON DELETE CASCADE,
    field_changed VARCHAR(255) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sponsors_history (
    id SERIAL PRIMARY KEY,
    record_id INTEGER NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,
    field_changed VARCHAR(255) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE vendors_history (
    id SERIAL PRIMARY KEY,
    record_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    field_changed VARCHAR(255) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE expenses_history (
    id SERIAL PRIMARY KEY,
    record_id INTEGER NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    field_changed VARCHAR(255) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE quotations_history (
    id SERIAL PRIMARY KEY,
    record_id INTEGER NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    field_changed VARCHAR(255) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE budgets_history (
    id SERIAL PRIMARY KEY,
    record_id INTEGER NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
    field_changed VARCHAR(255) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE task_history (
    id SERIAL PRIMARY KEY,
    record_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    field_changed VARCHAR(255) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

alter table Sponsors add column date_paid DATE;

CREATE TABLE festival_photos (
    id SERIAL PRIMARY KEY,
    festival_id INTEGER NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
    image_data TEXT NOT NULL,
    caption VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE festival_photos
ADD COLUMN uploaded_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

CREATE TABLE events (
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

CREATE TABLE event_contact_persons (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    contact_number VARCHAR(20),
    email VARCHAR(255)
);

ALTER TABLE sponsors ADD COLUMN IF NOT EXISTS image TEXT;