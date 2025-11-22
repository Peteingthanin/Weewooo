DROP DATABASE IF EXISTS QMedicDB;

CREATE DATABASE IF NOT EXISTS QMedicDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE QMedicDB;

-- Main table for all inventory items (Medication, Equipment, Supplies)
CREATE TABLE inventory_item (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_id VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    category ENUM('Medication', 'Equipment', 'Supplies') NOT NULL,
    quantity INT UNSIGNED NOT NULL DEFAULT 0,
    -- Threshold for Low Stock alert
    min_quantity INT UNSIGNED NOT NULL DEFAULT 5, 
    expiry_date DATE,
    location VARCHAR(100) NOT NULL,
    -- Matches the date format used in the mock data
    last_scanned DATE
);

-- Table for logging all inventory actions
CREATE TABLE inventory_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_fk INT NOT NULL,
    item_id VARCHAR(50) NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    
    -- Action details
    action ENUM('Check In', 'Use', 'Transfer', 'Remove All', 'Check Out') NOT NULL,
    quantity INT NOT NULL, 
    
    -- Contextual data (stored as a snapshot at time of action)
    action_date DATETIME NOT NULL,
    case_id VARCHAR(50), 
    user VARCHAR(100),

    category ENUM('Medication', 'Equipment', 'Supplies') NOT NULL,

    FOREIGN KEY (item_fk) 
        REFERENCES inventory_item(id) 
        ON DELETE CASCADE
);

-- Table for managing expiration and low stock alerts
CREATE TABLE notification_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Foreign Key (for database relationship management)
    item_fk INT NOT NULL,
    
    -- Alert Type (for generating the notification content)
    alert_type ENUM('Expiry Warning', 'Expired', 'Low Stock') NOT NULL,
    
    -- Fields to match front-end context (snapshots for immutability and ease of query):
    item_id_at_alert VARCHAR(50) NOT NULL,  -- MATCHES Notification.itemId
    item_name VARCHAR(255) NOT NULL,        -- MATCHES Notification.itemName
    location VARCHAR(100) NOT NULL,         -- MATCHES Notification.location
    expiry_date_at_alert DATE,              -- MATCHES Notification.expiry
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,  -- MATCHES Notification.read
    
    FOREIGN KEY (item_fk) 
        REFERENCES inventory_item(id) 
        ON DELETE CASCADE
);

-- Export Log Table
CREATE TABLE export_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    -- 'Excel' instead of 'XLSX' to be more user-friendly
    format ENUM('CSV', 'Excel', 'PDF') NOT NULL,
    status ENUM('Success', 'Failed') NOT NULL,
    
    -- Store a simple message, like an error or success note
    details VARCHAR(255),
    
    -- The user who performed the export (if known)
    user VARCHAR(100) DEFAULT 'System', 
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- -----------------------------------------------------------

-- INSERT Data to each table

-- -----------------------------------------------------------
-- 1. Inventory Items (based on mockData)
-- min_quantity is set to 5 as per logInventoryAction logic in InventoryContext
-- -----------------------------------------------------------

INSERT INTO inventory_item 
    (item_id, name, category, quantity, min_quantity, expiry_date, location, last_scanned)
VALUES
    ('MED001', 'Epinephrine Auto-Injector', 'Medication', 5, 5, '2025-9-29', 'Ambulance 1', '2025-10-21'),
    ('MED002', 'Morphine 10mg', 'Medication', 10, 5, '2027-01-07', 'Ambulance 1', '2025-10-21'),
    ('MED003', 'Aspirin 325mg', 'Medication', 20, 5, '2025-11-11', 'Ambulance 2', '2025-10-21'),
    ('EQP001', 'Defibrillator AED', 'Equipment', 2, 5, '2026-02-03', 'Ambulance Storage Room A', '2025-10-21'),
    ('EQP002', 'Blood Pressure Monitor', 'Equipment', 3, 5, '2023-04-20', 'Storage Room A', '2025-10-20'),
    ('SUP001', 'Gauze Pads 4x4', 'Supplies', 50, 5, '2026-10-21', 'Cabinet 3', '2025-10-21'),
    ('SUP002', 'Medical Gloves (Box)', 'Supplies', 1, 5, '2025-11-20', 'Cabinet 3', '2025-10-19');

-- NOTE: EQP002 and SUP002 are set up to be 'Low Stock' (quantity < 5).
-- EQP002 is also intentionally set as EXPIRED (2023-04-20) for notification testing.

-- -----------------------------------------------------------
-- 2. Inventory History (based on dummyHistory)
-- NOTE: DATETIME format must be consistent (e.g., 'YYYY-MM-DD HH:MM:SS')
-- -----------------------------------------------------------

INSERT INTO inventory_history
    (item_fk, item_id, item_name, action, quantity, action_date, case_id, user, category)
VALUES
    -- Record 1: MED001 - Check Out 5 units
    ((SELECT id FROM inventory_item WHERE item_id = 'MED001'), 'MED001', 'Epinephrine Auto-Injector', 'Check Out', 5, '2023-10-26 10:30:26', 'C12345', 'Paramedic Sam', 'Medication'),
    
    -- Record 2: EQP001 - Check In 1 unit
    ((SELECT id FROM inventory_item WHERE item_id = 'EQP001'), 'EQP001', 'Defibrillator AED', 'Check In', 1, '2024-10-26 11:51:42', 'C12344', 'Dr. Hart', 'Equipment'),
    
    -- Record 3: SUP001 - Check Out 10 units
    ((SELECT id FROM inventory_item WHERE item_id = 'SUP001'), 'SUP001', 'Gauze Pads 4x4', 'Check Out', 10, '2024-10-26 10:02:22', 'C12343', 'Nurse Jackie', 'Supplies'),
    
    -- Record 4: MED002 - Check In 2 units
    ((SELECT id FROM inventory_item WHERE item_id = 'MED002'), 'MED002', 'Morphine 10mg', 'Check In', 2, '2024-10-26 14:06:05', 'C12342', 'Dr. Hart', 'Medication');

-- Add one more action (e.g., a "Use" action) not in the mock to show the 'Use' action type:
-- Test the system.
-- INSERT INTO inventory_history
--     (item_fk, item_id, item_name, action, quantity, action_date, case_id, user, category)
-- VALUES
--     ((SELECT id FROM inventory_item WHERE item_id = 'MED003'), 'MED003', 'Aspirin 325mg', 'Use', 1, '2024-11-04 09:30:00', 'C12341', 'Current User', 'Medication');
--     
-- -----------------------------------------------------------
-- 3. Notification Log (based on mockNotifications)
-- -----------------------------------------------------------

INSERT INTO notification_log
    (item_fk, alert_type, item_id_at_alert, item_name, location, expiry_date_at_alert, is_read)
VALUES
    -- Unread Notifications (1-5) - Set as Expiry Warning or Low Stock
    ((SELECT id FROM inventory_item WHERE item_id = 'MED002'), 'Expiry Warning', 'MED002', 'Morphine 10mg', 'Ambulance 1', '2025-10-25', FALSE),
    ((SELECT id FROM inventory_item WHERE item_id = 'SUP001'), 'Expiry Warning', 'SUP001', 'Gauze Pads 4x4', 'Ambulance 2', '2025-10-28', FALSE),
    ((SELECT id FROM inventory_item WHERE item_id = 'MED003'), 'Expiry Warning', 'MED003', 'Aspirin 325mg', 'Storage Room A', '2025-12-30', FALSE),
    ((SELECT id FROM inventory_item WHERE item_id = 'SUP002'), 'Low Stock', 'SUP002', 'Medical Gloves (Box)', 'Cabinet 3', '2025-10-27', FALSE),
    ((SELECT id FROM inventory_item WHERE item_id = 'EQP001'), 'Low Stock', 'EQP001', 'Defibrillator AED', 'Ambulance 1', '2025-10-26', FALSE), -- EQP001 is Low Stock based on quantity 2 < min_quantity 5
    
    -- Read Notifications (6-8)
    ((SELECT id FROM inventory_item WHERE item_id = 'MED001'), 'Expiry Warning', 'MED001', 'Epinephrine Auto-Injector', 'Ambulance 1', '2025-11-10', TRUE),
    ((SELECT id FROM inventory_item WHERE item_id = 'EQP002'), 'Expired', 'EQP002', 'Blood Pressure Monitor', 'Ambulance 2', '2025-11-15', TRUE), -- Set as Expired since item_item is expired
    ((SELECT id FROM inventory_item WHERE item_id = 'SUP001'), 'Low Stock', 'SUP001', 'Gauze Pads 4x4', 'Storage Room A', '2025-11-20', TRUE);
    
ALTER TABLE QMedicDB.notification_log
ADD COLUMN details VARCHAR(255) NULL;