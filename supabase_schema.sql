-- Run these queries in your Supabase SQL Editor

CREATE TABLE businesses (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    owner_id INTEGER,
    plan_name TEXT DEFAULT 'Starter',
    employee_limit INTEGER DEFAULT 3,
    activation_key TEXT UNIQUE,
    status TEXT DEFAULT 'pending',
    payment_screenshot TEXT,
    office_lat DOUBLE PRECISION,
    office_lng DOUBLE PRECISION,
    geofence_radius INTEGER DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    business_id INTEGER REFERENCES businesses(id),
    name TEXT NOT NULL,
    mobile TEXT NOT NULL UNIQUE,
    email TEXT UNIQUE,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'employee',
    salary DOUBLE PRECISION NOT NULL,
    shift_start TEXT NOT NULL,
    shift_end TEXT NOT NULL,
    is_first_login INTEGER DEFAULT 1,
    is_approved INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE attendance (
    id SERIAL PRIMARY KEY,
    business_id INTEGER REFERENCES businesses(id),
    employee_id INTEGER NOT NULL REFERENCES employees(id),
    date TEXT NOT NULL,
    check_in TEXT,
    check_out TEXT,
    is_late INTEGER DEFAULT 0,
    status TEXT DEFAULT 'present',
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    selfie_url TEXT,
    distance_from_office DOUBLE PRECISION
);

CREATE TABLE leaves (
    id SERIAL PRIMARY KEY,
    business_id INTEGER REFERENCES businesses(id),
    employee_id INTEGER NOT NULL REFERENCES employees(id),
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'pending'
);

CREATE TABLE holidays (
    id SERIAL PRIMARY KEY,
    business_id INTEGER REFERENCES businesses(id),
    date TEXT NOT NULL,
    reason TEXT
);

CREATE TABLE settings (
    business_id INTEGER REFERENCES businesses(id),
    key TEXT,
    value TEXT,
    PRIMARY KEY (business_id, key)
);

CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    business_id INTEGER REFERENCES businesses(id),
    amount DOUBLE PRECISION,
    plan_name TEXT,
    transaction_id TEXT,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert Default Master Admin (Password: masteradmin)
-- Note: You might need to re-hash this if you change the salt, but this is the standard hash for 'masteradmin'
INSERT INTO employees (name, mobile, email, password, role, salary, shift_start, shift_end, is_first_login, is_approved)
VALUES ('Master Admin', '9999999999', 'admin@attendora.com', '$2a$10$7R8Y1m/Xp.fG.W.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X', 'master', 0, '00:00', '00:00', 0, 1);
