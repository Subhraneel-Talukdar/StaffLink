const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const db = require('../config/database');
const { sendCompanyTokens } = require('../utils/email');

// Middleware to check if user is admin
const requireAdmin = async (req, res, next) => {
    try {
        const user = await db.getAsync('SELECT isAdmin FROM employees WHERE id = ?', [req.user.id]);
        if (!user || !user.isAdmin) {
            return res.status(403).json({ error: 'Admin access required' });
        }
        next();
    } catch (error) {
        res.status(500).json({ error: 'Error checking admin status' });
    }
};

// Get all employees
router.get('/employees', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const employees = await db.allAsync('SELECT * FROM employees WHERE id != ?', [req.user.id]);
        res.json(employees);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch employees' });
    }
});

// Get payroll information
router.get('/payroll', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const payroll = await db.allAsync(
            `SELECT e.id, e.fullName, e.email, e.salary,
             (SELECT COUNT(*) FROM token_transactions t WHERE t.from_employee_id = e.id) as transactions_count,
             (SELECT SUM(amount) FROM token_transactions t WHERE t.from_employee_id = e.id) as total_spent,
             (SELECT balance FROM tokens t WHERE t.employee_id = e.id) as token_balance
             FROM employees e
             ORDER BY e.fullName`
        );
        res.json({ success: true, data: payroll });
    } catch (error) {
        console.error('Error fetching payroll:', error);
        res.status(500).json({ success: false, message: 'Error fetching payroll records' });
    }
});

// Update employee salary
router.put('/salary/:employeeId', authenticateToken, requireAdmin, async (req, res) => {
    const { salary } = req.body;
    const { employeeId } = req.params;

    if (!salary || isNaN(salary) || salary < 0) {
        return res.status(400).json({
            success: false,
            message: 'Valid salary amount is required'
        });
    }

    try {
        await db.runAsync(
            'UPDATE employees SET salary = ? WHERE id = ?',
            [salary, employeeId]
        );

        // Record in payroll_records
        await db.runAsync(
            `INSERT INTO payroll_records (employee_id, salary, payment_date)
             VALUES (?, ?, date('now'))`,
            [employeeId, salary]
        );

        res.json({
            success: true,
            message: 'Salary updated successfully'
        });
    } catch (error) {
        console.error('Error updating salary:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating salary'
        });
    }
});

// Update employee settings
router.put('/settings/:employeeId', authenticateToken, requireAdmin, async (req, res) => {
    const { phone, address } = req.body;
    const { employeeId } = req.params;

    try {
        await db.runAsync(
            'UPDATE employees SET phone = ?, address = ? WHERE id = ?',
            [phone, address, employeeId]
        );

        // Record settings changes
        if (phone) {
            await db.runAsync(
                `INSERT INTO settings (employee_id, setting_key, setting_value)
                 VALUES (?, 'phone', ?)
                 ON CONFLICT(employee_id, setting_key) 
                 DO UPDATE SET setting_value = ?`,
                [employeeId, phone, phone]
            );
        }

        if (address) {
            await db.runAsync(
                `INSERT INTO settings (employee_id, setting_key, setting_value)
                 VALUES (?, 'address', ?)
                 ON CONFLICT(employee_id, setting_key) 
                 DO UPDATE SET setting_value = ?`,
                [employeeId, address, address]
            );
        }

        res.json({
            success: true,
            message: 'Settings updated successfully'
        });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating settings'
        });
    }
});

// Update employee details
router.put('/employees/:id', authenticateToken, requireAdmin, async (req, res) => {
    const { email, fullName, department, phone, salary } = req.body;
    try {
        await db.runAsync(
            'UPDATE employees SET email = ?, fullName = ?, department = ?, phone = ?, salary = ? WHERE id = ?',
            [email, fullName, department, phone, salary, req.params.id]
        );
        res.json({ success: true, message: 'Employee updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Delete employee
router.delete('/employees/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await db.runAsync('DELETE FROM employees WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Employee deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get department statistics
router.get('/stats/department', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const stats = await db.allAsync(`
            SELECT 
                department,
                COUNT(*) as employeeCount,
                AVG(salary) as avgSalary,
                SUM(salary) as totalSalary
            FROM employees
            GROUP BY department
        `);
        res.json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get salary statistics
router.get('/stats/salary', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const stats = await db.getAsync(`
            SELECT 
                COUNT(*) as totalEmployees,
                AVG(salary) as avgSalary,
                MIN(salary) as minSalary,
                MAX(salary) as maxSalary,
                SUM(salary) as totalSalary
            FROM employees
        `);
        res.json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get attendance statistics
router.get('/stats/attendance', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const stats = await db.allAsync(`
            SELECT 
                e.fullName,
                COUNT(CASE WHEN a.type = 'check-in' THEN 1 END) as checkIns,
                COUNT(CASE WHEN a.type = 'check-out' THEN 1 END) as checkOuts
            FROM employees e
            LEFT JOIN attendance_logs a ON e.id = a.employeeId
            GROUP BY e.id
        `);
        res.json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get performance statistics
router.get('/stats/performance', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const stats = await db.allAsync(`
            SELECT 
                e.fullName,
                AVG(p.rating) as avgRating,
                COUNT(p.id) as reviewCount
            FROM employees e
            LEFT JOIN performance_records p ON e.id = p.employeeId
            GROUP BY e.id
        `);
        res.json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get all company purchases
router.get('/purchases', authenticateToken, requireAdmin, (req, res) => {
    const query = `
        SELECT 
            cp.*,
            e.fullName as employeeName
        FROM company_purchases cp
        JOIN employees e ON cp.employeeId = e.id
        ORDER BY cp.date DESC
    `;
    db.all(query, [], (err, purchases) => {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
        res.json({ success: true, data: purchases });
    });
});

// Update purchase status
router.put('/purchases/:id', authenticateToken, requireAdmin, (req, res) => {
    const { status } = req.body;
    db.run(
        'UPDATE company_purchases SET status = ? WHERE id = ?',
        [status, req.params.id],
        function(err) {
            if (err) {
                return res.status(500).json({ success: false, message: err.message });
            }
            res.json({ success: true, message: 'Purchase status updated successfully' });
        }
    );
});

// Get all documents
router.get('/documents', authenticateToken, requireAdmin, (req, res) => {
    const query = `
        SELECT 
            d.*,
            e.fullName as employeeName
        FROM documents d
        JOIN employees e ON d.employeeId = e.id
        ORDER BY d.uploadDate DESC
    `;
    db.all(query, [], (err, documents) => {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
        res.json({ success: true, data: documents });
    });
});

// Get all messages
router.get('/messages', authenticateToken, requireAdmin, (req, res) => {
    const query = `
        SELECT 
            m.*,
            s.fullName as senderName,
            r.fullName as receiverName
        FROM messages m
        JOIN employees s ON m.senderId = s.id
        JOIN employees r ON m.receiverId = r.id
        ORDER BY m.timestamp DESC
    `;
    db.all(query, [], (err, messages) => {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
        res.json({ success: true, data: messages });
    });
});

// Distribute company tokens
router.post('/distribute-tokens', authenticateToken, async (req, res) => {
    try {
        const { employeeId, amount } = req.body;
        
        // Check if admin has enough tokens (10 tokens)
        const adminTokens = await db.get('SELECT tokenBalance FROM users WHERE role = "admin" LIMIT 1');
        
        if (!adminTokens || adminTokens.tokenBalance < amount) {
            return res.status(400).json({ error: 'Insufficient tokens available' });
        }

        // Start transaction
        await db.run('BEGIN TRANSACTION');

        // Deduct tokens from admin
        await db.run(
            'UPDATE users SET tokenBalance = tokenBalance - ? WHERE role = "admin"',
            [amount]
        );

        // Add tokens to employee
        await db.run(
            'UPDATE users SET tokenBalance = tokenBalance + ? WHERE id = ?',
            [amount, employeeId]
        );

        // Get employee details for email
        const employee = await db.get('SELECT * FROM users WHERE id = ?', [employeeId]);

        // Send email notification
        await sendCompanyTokens(employee.email, employee.fullName, amount);

        // Commit transaction
        await db.run('COMMIT');

        res.json({ message: 'Tokens distributed successfully' });
    } catch (error) {
        // Rollback transaction on error
        await db.run('ROLLBACK');
        console.error('Token distribution error:', error);
        res.status(500).json({ error: 'Failed to distribute tokens' });
    }
});

module.exports = router; 