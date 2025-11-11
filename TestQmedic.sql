USE QMedicDB;
SELECT id, item_id_at_alert AS itemId, item_name AS itemName, 
                    expiry_date_at_alert AS expiry, location, is_read AS 'read'
            FROM notification_log
            ORDER BY created_at DESC;

SELECT id, item_id as itemId, item_name as itemName, 
                   action_date as date, case_id as caseId, user, quantity, 
                   category, action
            FROM inventory_history
            ORDER BY action_date DESC;
            
UPDATE QMedicDB.inventory_item
SET expiry_date = DATE_ADD(CURDATE(), INTERVAL 15 DAY)
WHERE item_id = 'EQP001';

SELECT * FROM QMedicDB.notification_log WHERE item_id_at_alert = 'EQP001';

ALTER TABLE QMedicDB.notification_log
ADD COLUMN details VARCHAR(255) NULL;

SHOW COLUMNS FROM QMedicDB.notification_log;

SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'QMedicDB'
  AND TABLE_NAME = 'notification_log';

