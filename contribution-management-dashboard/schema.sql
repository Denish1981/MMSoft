-- Creates the user table and a default user for login
-- IMPORTANT: In a real-world application, passwords must be securely hashed.
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL
);

INSERT INTO users (username, password) VALUES ('admin', 'password');


-- Table for Campaigns
CREATE TABLE campaigns (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    goal NUMERIC(12, 2) NOT NULL,
    description TEXT
);

-- Insert default campaigns to make the app usable from the start
--INSERT INTO campaigns (id, name, goal, description) VALUES
--('cam_1', 'Annual Fund 2024', 500000, 'Our main fundraising drive for the year to support ongoing operations.'),
--('cam_2', 'Community Park Beautification', 75000, 'Help us plant new trees and flowers in the local park this spring.');


-- Table for individual contributions
CREATE TABLE contributions (
    id VARCHAR(255) PRIMARY KEY,
    donor_name VARCHAR(255) NOT NULL,
    donor_email VARCHAR(255),
    mobile_number VARCHAR(20),
    tower_number VARCHAR(50) NOT NULL,
    flat_number VARCHAR(50) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    number_of_coupons INTEGER NOT NULL,
    campaign_id VARCHAR(255) REFERENCES campaigns(id),
    date TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) NOT NULL
);


-- Table for corporate or individual sponsors
CREATE TABLE sponsors (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact_number VARCHAR(20),
    address TEXT,
    email VARCHAR(255),
    business_category VARCHAR(100),
    business_info TEXT,
    sponsorship_amount NUMERIC(12, 2),
    sponsorship_type VARCHAR(100)
);


-- Table for vendors
CREATE TABLE vendors (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    business VARCHAR(255),
    address TEXT
);


-- Table for vendor contact persons, linked to the vendors table
CREATE TABLE contact_persons (
    id SERIAL PRIMARY KEY,
    vendor_id VARCHAR(255) NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    contact_number VARCHAR(20)
);


-- Table for expenses
CREATE TABLE expenses (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    vendor_id VARCHAR(255) REFERENCES vendors(id),
    cost NUMERIC(10, 2) NOT NULL,
    bill_date TIMESTAMPTZ NOT NULL,
    expense_head VARCHAR(255),
    bill_receipt TEXT, -- Stores base64 image data
    expense_by VARCHAR(255)
);


-- Table for quotations
CREATE TABLE quotations (
    id VARCHAR(255) PRIMARY KEY,
    quotation_for VARCHAR(255) NOT NULL,
    vendor_id VARCHAR(255) REFERENCES vendors(id),
    cost NUMERIC(10, 2) NOT NULL,
    date TIMESTAMPTZ NOT NULL
);


-- Table for quotation images, linked to the quotations table
CREATE TABLE quotation_images (
    id SERIAL PRIMARY KEY,
    quotation_id VARCHAR(255) NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    image_data TEXT NOT NULL -- Stores base64 image data
);

ALTER TABLE contributions
ADD COLUMN type VARCHAR(50),
ADD COLUMN image TEXT;

ALTER TABLE users ALTER COLUMN password DROP NOT NULL;

CREATE TABLE authorized_emails (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL
);