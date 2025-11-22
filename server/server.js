const mysql = require('mysql2/promise');
const express = require('express');
const cors = require('cors');
const fs = require('fs').promises; // Node.js File System module (for writing to api.ts)
const path = require('path');     // Node.js Path module (to locate api.ts)
const cron = require('node-cron'); // For scheduled tasks
const axios = require('axios');   // For making HTTP requests (to EmailJS)

// --- NEW --- Dependencies for file export
const { Parser } = require('json2csv');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3000;

// MySQL connection pool configuration
const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: '1234',
    database: 'QMedicDB'
});

// Utility function to safely format Date objects received from MySQL
const formatDateForFrontend = (date) => {
    if (!date) return null;
    // Format to YYYY-MM-DD string, which is standard for <input type="date"> and clean storage
    return date instanceof Date ? date.toISOString().split('T')[0] : date; 
};

// Utility function to map MySQL item row to the front-end InventoryItem structure
const mapToInventoryItem = (item) => {
    let status = 'In Stock';
    if (item.quantity <= 0) {
        status = 'Out of Stock';
    } else if (item.quantity < item.min_quantity) {
        status = 'Low Stock';
    }

    // FIX: Use robust formatting helper
    const expiryDate = formatDateForFrontend(item.expiry_date);
    // lastScanned should be a simple date string for display, using toLocaleDateString() on the client is safer
    const lastScanned = item.last_scanned ? new Date(item.last_scanned).toLocaleDateString('en-US') : null; 

    return {
        id: item.item_id, // Front-end uses item_id as 'id'
        dbId: item.id,    // Internal DB ID (for item_fk)
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        lastScanned: lastScanned,
        status: status,
        expiryDate: expiryDate,
        location: item.location,
    };
};

// --- NEW ---
// HELPER FUNCTION: Get all inventory data for export
const fetchInventory = async () => {
    const query = 'SELECT item_id, name, category, quantity, min_quantity, expiry_date, location FROM inventory_item';
    
    const [rows] = await pool.query(query); 
    
    // Format dates consistently using your existing helper
    const data = rows.map(item => ({
        ...item,
        expiry_date: formatDateForFrontend(item.expiry_date)
    }));
    
    return data;
};


/**
 * GET /api/inventory
 * Fetches all inventory items and calculates their 'status'.
 */
app.get('/api/inventory', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM inventory_item');
        const items = rows.map(mapToInventoryItem);

        // Calculate checkedIn, checkedOut, and lowStockCount for the Home Screen
        const [historyRows] = await pool.query('SELECT action, quantity FROM inventory_history');
        
        const summary = historyRows.reduce((acc, record) => {
            if (record.action === "Check In") {
                acc.checkedIn += record.quantity;
            } else {
                acc.checkedOut += record.quantity;
            }
            return acc;
        }, { checkedIn: 0, checkedOut: 0, lowStockCount: items.filter(i => i.status === 'Low Stock').length });

        res.json({
            items: items,
            summary: summary
        });
    } catch (error) {
        console.error('Error fetching inventory:', error);
        res.status(500).send({ message: 'Failed to fetch inventory data.' });
    }
});

/**
 * POST /api/action/log
 * Logs an inventory action (Check In, Check Out, Use, etc.) and updates item quantity.
 */
app.post('/api/action/log', async (req, res) => {
    const { itemId, action, quantity, caseId = `C${Math.floor(Math.random() * 90000) + 10000}`, user = 'Current User' } = req.body;

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Get Item Data and its minimum quantity threshold
        const [items] = await connection.query('SELECT id, name, category, quantity FROM inventory_item WHERE item_id = ?', [itemId]);
        if (items.length === 0) throw new Error(`Item ID ${itemId} not found.`);
        const item = items[0];
        
        // 2. Calculate New Quantity
        let updatedQuantity = item.quantity;
        const actionsThatReduceStock = ["Use", "Check Out", "Remove All"];

        if (action === 'Check In') {
            updatedQuantity += quantity;
        } else if (actionsThatReduceStock.includes(action)) {
            updatedQuantity -= quantity;
        }
        
        updatedQuantity = Math.max(0, updatedQuantity); 

        // 3. Update inventory_item
        await connection.query('UPDATE inventory_item SET quantity = ?, last_scanned = NOW() WHERE id = ?', [updatedQuantity, item.id]);

        // 4. Insert into inventory_history
        const historyQuery = `
            INSERT INTO inventory_history 
            (item_fk, item_id, item_name, action, quantity, action_date, case_id, user, category)
            VALUES (?, ?, ?, ?, ?, NOW(), ?, ?, ?);
        `;
        await connection.query(historyQuery, [
            item.id, itemId, item.name, action, quantity, caseId, user, item.category
        ]);

        // 5. Check for Low Stock and Send Notification
        const [itemDetails] = await connection.query('SELECT quantity, min_quantity, name, location, expiry_date FROM inventory_item WHERE id = ?', [item.id]);
        const updatedItem = itemDetails[0];
        const minQty = updatedItem.min_quantity;
        const actionsThatTriggerAlert = ["Use", "Check Out", "Remove All"];

        if (updatedItem.quantity <= minQty && actionsThatTriggerAlert.includes(action)) {
            const insertNotifQuery = `
                INSERT INTO notification_log 
                    (item_fk, alert_type, item_id_at_alert, item_name, location, expiry_date_at_alert, details)
                VALUES (?, 'Low Stock', ?, ?, ?, ?, ?);
            `;
            await connection.query(insertNotifQuery, [
                item.id,
                itemId,
                updatedItem.name,
                updatedItem.location,
                updatedItem.expiry_date,
                `Quantity is ${updatedItem.quantity}, which is at or below the minimum of ${minQty}.`
            ]);

            console.log(`✅ Low stock notification logged for item ${itemId}.`);

            // Send low stock email alert
            // await sendEmailJS({
            //     service_id: 'service_o9baz0e',
            //     template_id: 'template_k05so3m',
            //     user_id: 'KetRjtX41DqNLAL84',
            //     accessToken: 'zAQUIbBQ4tu2YQdgBCbCJ',
            //     template_params: {
            //         title: `Low Stock Alert: ${updatedItem.name} (${itemId})`,
            //         name: 'Q-Medic Bot',
            //         time: new Date().toLocaleString(),
            //         item: updatedItem.name,
            //         item_id: itemId,
            //         category: updatedItem.category,
            //         location: updatedItem.location,
            //         quantity: updatedItem.quantity,
            //         expiry_date: formatDateForFrontend(updatedItem.expiry_date),
            //         daysLeft: 'N/A' 
            //     }
            // });
        }

        await connection.commit();
        res.status(200).send({ message: 'Action logged and inventory updated.', newQuantity: updatedQuantity });

    } catch (error) {
        await connection.rollback();
        console.error('Transaction failed:', error);
        res.status(500).send({ error: 'Failed to complete inventory transaction.' });
    } finally {
        connection.release();
    }
});

/**
 * GET /api/history
 * Fetches all transaction records.
 */
app.get('/api/history', async (req, res) => {
    try {
        const query = `
            SELECT id, item_id as itemId, item_name as itemName, 
                   action_date as date, case_id as caseId, user, quantity, 
                   category, action
            FROM inventory_history
            ORDER BY action_date DESC;
        `;
        const [rows] = await pool.query(query);
        
        const history = rows.map(row => ({
            ...row,
            date: row.date ? new Date(row.date).toLocaleString('en-US', {
                month: '2-digit', day: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
            }) : 'N/A'
        }));

        res.json(history);
    } catch (error) {
        console.error('Error fetching history:', error);
        res.status(500).send({ message: 'Failed to fetch history data.' });
    }
});

/**
 * GET /api/notifications
 * Fetches all notifications/alerts.
 */
app.get('/api/notifications', async (req, res) => {
    try {
        const query = `
            SELECT id, item_id_at_alert AS itemId, item_name AS itemName, 
                    expiry_date_at_alert AS expiry, location, is_read AS 'read'
            FROM notification_log
            ORDER BY created_at DESC;
        `;
        const [rows] = await pool.query(query);

        const notifications = rows.map(row => ({
            ...row,
            expiry: row.expiry ? formatDateForFrontend(row.expiry) : null,
            read: row.read === 1
        }));

        res.json(notifications);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).send({ message: 'Failed to fetch notifications.' });
    }
});

/**
 * POST /api/notifications/read/:id
 * Marks a specific notification as read.
 */
app.post('/api/notifications/read/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('UPDATE notification_log SET is_read = TRUE WHERE id = ?', [id]);
        res.status(200).send({ message: `Notification ${id} marked as read.` });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).send({ message: 'Failed to update notification status.' });
    }
});


// --- NEW --- Export Routes (with Logging)
// =============================================

/**
 * GET /api/export/csv
 * Generates and sends a CSV file of the inventory.
 */
app.get('/api/export/csv', async (req, res) => {
  try {
    const inventoryData = await fetchInventory();
    
    const fields = ['item_id', 'name', 'category', 'quantity', 'min_quantity', 'expiry_date', 'location'];
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(inventoryData);

    // Get user from query parameter, fallback to 'System' if not provided
    const user = req.query.user || 'System';

    // --- Log success before sending response ---
    await pool.query(
      'INSERT INTO export_log (format, status, details, user) VALUES (?, ?, ?, ?)',
      ['CSV', 'Success', `Exported ${inventoryData.length} items.`, user]
    );

    res.header('Content-Type', 'text/csv');
    res.attachment('inventory.csv');
    res.send(csv);

  } catch (error) {
    console.error('CSV Export Error:', error);
    // Get user from query parameter, fallback to 'System' if not provided
    const user = req.query.user || 'System';
    // --- Log failure ---
    await pool.query(
      'INSERT INTO export_log (format, status, details, user) VALUES (?, ?, ?, ?)',
      ['CSV', 'Failed', error.message, user]
    );
    res.status(500).send('Error generating CSV file');
  }
});

/**
 * GET /api/export/excel
 * Generates and sends an Excel (.xlsx) file of the inventory.
 */
app.get('/api/export/excel', async (req, res) => {
  try {
    const inventoryData = await fetchInventory();
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Inventory');

    worksheet.columns = [
      { header: 'Item ID', key: 'item_id', width: 15 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Category', key: 'category', width: 15 },
      { header: 'Quantity', key: 'quantity', width: 10 },
      { header: 'Min. Quantity', key: 'min_quantity', width: 15 },
      { header: 'Expiry Date', key: 'expiry_date', width: 15 },
      { header: 'Location', key: 'location', width: 30 }
    ];
    worksheet.addRows(inventoryData);

    // Get user from query parameter, fallback to 'System' if not provided
    const user = req.query.user || 'System';

    // --- Log success before streaming response ---
    await pool.query(
      'INSERT INTO export_log (format, status, details, user) VALUES (?, ?, ?, ?)',
      ['Excel', 'Success', `Exported ${inventoryData.length} items.`, user]
    );

    res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.attachment('inventory.xlsx');
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Excel Export Error:', error);
    // Get user from query parameter, fallback to 'System' if not provided
    const user = req.query.user || 'System';
    // --- Log failure ---
    await pool.query(
      'INSERT INTO export_log (format, status, details, user) VALUES (?, ?, ?, ?)',
      ['Excel', 'Failed', error.message, user]
    );
    res.status(500).send('Error generating Excel file');
  }
});

/**
 * GET /api/export/pdf
 * Generates and sends a PDF file of the inventory.
 */
app.get('/api/export/pdf', async (req, res) => {
  try {
    const inventoryData = await fetchInventory();
    const doc = new PDFDocument({ margin: 30, size: 'A4' });

    res.header('Content-Type', 'application/pdf');
    res.attachment('inventory.pdf');
    doc.pipe(res); // Connect PDF stream to response

    // --- PDF Content ---
    doc.fontSize(18).text('QMedic Inventory Report', { align: 'center' });
    doc.moveDown();
    const tableTop = doc.y;
    const itemX = 30, nameX = 100, categoryX = 250, qtyX = 350, expiryX = 420;
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Item ID', itemX, tableTop);
    doc.text('Name', nameX, tableTop);
    doc.text('Category', categoryX, tableTop);
    doc.text('Quantity', qtyX, tableTop);
    doc.text('Expiry Date', expiryX, tableTop, { width: 100 });
    doc.moveDown();
    doc.font('Helvetica');
    for (const item of inventoryData) {
      const rowY = doc.y;
      doc.text(item.item_id, itemX, rowY);
      doc.text(item.name, nameX, rowY, { width: 140 });
      doc.text(item.category, categoryX, rowY);
      doc.text(item.quantity.toString(), qtyX, rowY, { width: 60 });
      doc.text(item.expiry_date || 'N/A', expiryX, rowY, { width: 100 });
      doc.moveDown(0.5);
    }
    // --- End PDF Content ---

    doc.end(); // Finalize the PDF

    // Get user from query parameter, fallback to 'System' if not provided
    const user = req.query.user || 'System';

    // --- Log success after doc is finalized ---
    await pool.query(
      'INSERT INTO export_log (format, status, details, user) VALUES (?, ?, ?, ?)',
      ['PDF', 'Success', `Exported ${inventoryData.length} items.`, user]
    );

  } catch (error) {
    console.error('PDF Export Error:', error);
    // Get user from query parameter, fallback to 'System' if not provided
    const user = req.query.user || 'System';
    // --- Log failure ---
    await pool.query(
      'INSERT INTO export_log (format, status, details, user) VALUES (?, ?, ?, ?)',
      ['PDF', 'Failed', error.message, user]
    );
    res.status(500).send('Error generating PDF file');
  }
});

/**
 * GET /api/export/history
 * Fetches all export log records.
 */
app.get('/api/export/history', async (req, res) => {
    try {
        const query = `
            SELECT id, format, status, details, user, created_at
            FROM export_log
            ORDER BY created_at DESC;
        `;
        const [rows] = await pool.query(query);
        
        const history = rows.map(row => ({
            ...row,
            // Format the date for client display
            date: new Date(row.created_at).toLocaleString('en-US', {
                month: '2-digit', day: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', hour12: true
            })
        }));

        res.json(history);
    } catch (error) {
        console.error('Error fetching export history:', error);
        res.status(500).send({ message: 'Failed to fetch export history data.' });
    }
});

// =============================================
// --- End of NEW Sections ---


/**
 * Scheduled task to check for expiring items daily.
 */
 cron.schedule('0 8 * * *', async () => {
        try {
            console.log('⏰ Running daily expiry check...');
            const [items] = await pool.query(`
                SELECT 
                    i.id, i.item_id, i.name, i.category, i.location, i.expiry_date, i.quantity,
                    GROUP_CONCAT(nl.alert_type) AS sent_alerts
                FROM 
                    inventory_item i
                LEFT JOIN 
                    notification_log nl ON i.id = nl.item_fk AND nl.alert_type LIKE 'Expiry%'
                WHERE 
                    i.expiry_date IS NOT NULL
                GROUP BY
                    i.id
            `);

            const today = new Date();

            for (const item of items) {
                const expiry = new Date(item.expiry_date);
                const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
                const sentAlerts = item.sent_alerts ? item.sent_alerts.split(',') : [];

            if (daysLeft === 15 && !sentAlerts.includes('15-Day Expiry Warning')) {
                console.log(`Item ${item.item_id} is expiring in 15 days. Sending email.`);
                const ok = await sendEmailJS({
                    service_id: 'service_o9baz0e',
                    template_id: 'template_rydjjvb',
                    user_id: 'KetRjtX41DqNLAL84',
                    accessToken: 'zAQUIbBQ4tu2YQdgBCbCJ',
                    template_params: {
                        title: `15-Day Expiry Warning: ${item.name} (${item.item_id})`,
                        name: 'Q-Medic Bot',
                        time: new Date().toLocaleString(),
                        item: item.name,
                        item_id: item.item_id,
                        category: item.category,
                        location: item.location,
                        quantity: item.quantity,
                        expiry_date: formatDateForFrontend(item.expiry_date),
                        daysLeft: daysLeft
                    }
                });

                if (ok) {
                    console.log(`✅ 15-day expiry email sent for ${item.item_id}`);
                    await pool.query(`
                        INSERT IGNORE INTO notification_log
                        (item_fk, alert_type, item_id_at_alert, item_name, location, expiry_date_at_alert, details)
                        VALUES (?, '15-Day Expiry Warning', ?, ?, ?, ?, ?)`,
                        [item.id, item.item_id, item.name, item.location, item.expiry_date, `Expires in ${daysLeft} days`]
                    );
                }
            }

            if (daysLeft > 0 && daysLeft <= 7 && !sentAlerts.includes('7-Day Expiry Warning')) {
                console.log(`Item ${item.item_id} is expiring in ${daysLeft} days. Sending email.`);
                const ok = await sendEmailJS({
                    service_id: 'service_o9baz0e',
                    template_id: 'template_rydjjvb',
                    user_id: 'KetRjtX41DqNLAL84',
                    accessToken: 'zAQUIbBQ4tu2YQdgBCbCJ',
                    template_params: {
                        title: `Expiry Warning: ${item.name} (${item.item_id})`,
                        name: 'Q-Medic Bot',
                        time: new Date().toLocaleString(),
                        item: item.name,
                        item_id: item.item_id,
                        category: item.category,
                        location: item.location,
                        quantity: item.quantity,
                        expiry_date: formatDateForFrontend(item.expiry_date),
                        daysLeft: daysLeft
                    }
                });

                if (ok) {
                    console.log(`✅ Expiry email sent for ${item.item_id}`);
                    await pool.query(`
                        INSERT IGNORE INTO notification_log
                        (item_fk, alert_type, item_id_at_alert, item_name, location, expiry_date_at_alert, details)
                        VALUES (?, '7-Day Expiry Warning', ?, ?, ?, ?, ?)`,
                        [item.id, item.item_id, item.name, item.location, item.expiry_date, `Expires in ${daysLeft} days`]
                    );
                } else {
                    console.error(`❌ Failed to send expiry email for ${item.item_id}`);
                }
            }
            }
        } catch (err) {
            console.error('⚠️ Cron job error:', err.message);
        }
    }, { timezone: 'Asia/Bangkok' });

    async function sendEmailJS({ service_id, template_id, user_id, accessToken, template_params }) {
        try {
            const response = await axios.post('https://api.emailjs.com/api/v1.0/email/send', {
                service_id,
                template_id,
                user_id,
                accessToken,
                template_params,
            }, {
                headers: { 'Content-Type': 'application/json' }
            });
    
            if (response.status === 200) {
                console.log('✅ EmailJS ok:', response.data);
                return true;
            }
        } catch (error) {
            console.error('❌ EmailJS error:', error.response ? error.response.data : error.message);
        }
        return false;
        }


// --- Start Server ---
app.listen(PORT, '0.0.0.0', async () => {
    console.log(`\n🚀 Server running on port ${PORT}`);

    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    let localIp = 'localhost';

    const preferredInterfaces = ['Wi-Fi', 'Ethernet', 'en0', 'wlan0'];
    for (const name of preferredInterfaces) {
        if (nets[name]) {
            const interfaceDetails = nets[name].find(
                net => net.family === 'IPv4' && !net.internal
            );
            if (interfaceDetails) {
                localIp = interfaceDetails.address;
                break;
            }
        }
    }

    console.log(`\n✅ Server is accessible on your network at: http://${localIp}:${PORT}`);

    try {
        const apiTsPath = path.join(__dirname, '..', 'contexts', 'api.ts');
        const newApiUrlLine = `export const API_BASE_URL = 'http://${localIp}:${PORT}/api'; // <-- 🛑 This is auto-updated by server.js`;

        let fileContent = await fs.readFile(apiTsPath, 'utf-8');
        
        const updatedContent = fileContent.replace(
            /export const API_BASE_URL = '.*';/, 
            newApiUrlLine
        );

        await fs.writeFile(apiTsPath, updatedContent, 'utf-8');
        console.log('✅ Automatically updated contexts/api.ts with the correct IP address.');
    } catch (error) {
        console.error('❌ Failed to auto-update contexts/api.ts. Please update it manually.', error);
    }
});