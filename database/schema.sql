-- ============================================================
-- SMART MILK DECISION TOOL SYSTEM - Database Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS smart_milk_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE smart_milk_db;

-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'operator', 'viewer') DEFAULT 'operator',
    full_name VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- FARMERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS farmers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    farmer_code VARCHAR(20) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    village VARCHAR(100),
    district VARCHAR(100),
    state VARCHAR(100),
    total_submissions INT DEFAULT 0,
    total_accepted INT DEFAULT 0,
    total_rejected INT DEFAULT 0,
    fraud_flag BOOLEAN DEFAULT FALSE,
    fraud_count INT DEFAULT 0,
    avg_fat DECIMAL(5,3),
    avg_snf DECIMAL(5,3),
    avg_quantity DECIMAL(10,2),
    is_active BOOLEAN DEFAULT TRUE,
    registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- UPLOAD BATCHES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS upload_batches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    batch_id VARCHAR(100) UNIQUE NOT NULL,
    file_name VARCHAR(255),
    session_name VARCHAR(255),
    upload_date DATE,
    shift ENUM('morning', 'evening'),
    total_records INT DEFAULT 0,
    accepted INT DEFAULT 0,
    rejected INT DEFAULT 0,
    manual_check INT DEFAULT 0,
    fraud_alerts INT DEFAULT 0,
    uploaded_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_batch_id (batch_id),
    INDEX idx_upload_date (upload_date)
);

-- ============================================================
-- MILK RECORDS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS milk_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    batch_id VARCHAR(50),                       -- batch upload group
    farmer_id INT,
    farmer_name VARCHAR(100) NOT NULL,
    farmer_code VARCHAR(20),
    date DATE NOT NULL,
    shift ENUM('morning', 'evening') NOT NULL,
    -- Quality Parameters
    fat DECIMAL(5,3),
    snf DECIMAL(5,3),
    ph DECIMAL(4,2),
    acidity DECIMAL(5,3),
    temperature DECIMAL(5,2),
    specific_gravity DECIMAL(6,4),
    cob_test ENUM('negative', 'positive') DEFAULT 'negative',
    alcohol_test ENUM('negative', 'positive') DEFAULT 'negative',
    organoleptic ENUM('normal', 'abnormal') DEFAULT 'normal',
    sediment_test ENUM('clean', 'dirty') DEFAULT 'clean',
    mbrt DECIMAL(4,2),
    raw_milk_temp DECIMAL(5,2),
    quantity DECIMAL(10,2),
    -- Decision Output
    decision ENUM('accept', 'reject') DEFAULT 'accept',
    reasons JSON,                               -- array of reason strings
    fraud_risk ENUM('low', 'medium', 'high') DEFAULT 'low',
    ml_prediction VARCHAR(20),
    ml_confidence DECIMAL(5,4),
    -- Meta
    entry_type ENUM('upload', 'manual') DEFAULT 'manual',
    upload_type VARCHAR(50) DEFAULT 'bulk',
    session_name VARCHAR(255),
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    entered_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (farmer_id) REFERENCES farmers(id) ON DELETE SET NULL,
    FOREIGN KEY (entered_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_date (date),
    INDEX idx_farmer_code (farmer_code),
    INDEX idx_decision (decision),
    INDEX idx_batch (batch_id),
    INDEX idx_shift (shift)
);

-- ============================================================
-- SETTINGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    description TEXT,
    updated_by INT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================
-- LOGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INT,
    details JSON,
    ip_address VARCHAR(45),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_created_at (created_at),
    INDEX idx_action (action)
);

-- ============================================================
-- DEFAULT DATA
-- ============================================================

-- Default admin user (password: Admin@123)
INSERT INTO users (username, email, password_hash, role, full_name) VALUES
('admin', 'admin@milkquality.com',
 '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
 'admin', 'System Administrator');

-- Default settings
INSERT INTO settings (setting_key, setting_value, setting_type, description) VALUES
('fat_min', '3.2', 'number', 'Minimum acceptable FAT percentage'),
('fat_max', '3.5', 'number', 'Maximum acceptable FAT percentage'),
('snf_min', '8.3', 'number', 'Minimum acceptable SNF percentage'),
('snf_max', '8.5', 'number', 'Maximum acceptable SNF percentage'),
('ph_min', '6.5', 'number', 'Minimum acceptable pH level'),
('ph_max', '6.8', 'number', 'Maximum acceptable pH level'),
('acidity_min', '0.10', 'number', 'Minimum acceptable acidity'),
('acidity_max', '0.15', 'number', 'Maximum acceptable acidity'),
('temp_ideal', '10', 'number', 'Ideal temperature threshold (<=)'),
('temp_acceptable', '15', 'number', 'Acceptable temperature threshold (<=)'),
('sg_min', '1.028', 'number', 'Minimum specific gravity'),
('sg_max', '1.032', 'number', 'Maximum specific gravity'),
('mbrt_good', '3', 'number', 'MBRT threshold for good quality (>)'),
('mbrt_check', '2', 'number', 'MBRT threshold for manual check (>=)'),
('raw_milk_temp_min', '25', 'number', 'Minimum raw milk temperature'),
('raw_milk_temp_max', '37', 'number', 'Maximum raw milk temperature'),
('company_name', 'DairyPure Quality Labs', 'string', 'Company name for reports'),
('fraud_threshold', '3', 'number', 'Number of rejections before fraud flag');
