const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const QRCode = require('qrcode');
const { requireAuth } = require('../middleware/auth');
const db = require('../db');
const fs = require('fs');
const bcrypt = require('bcrypt');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../public/uploads/profiles');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG and GIF are allowed.'));
        }
    }
});

// Get current employee details
router.get('/current', requireAuth, (req, res) => {
    db.get(
        'SELECT id, email, fullName, department, phone, salary, profilePicture, isAdmin FROM employees WHERE id = ?',
        [req.session.user.id],
        (err, employee) => {
            if (err) {
                return res.status(500).json({ success: false, message: err.message });
            }
            res.json({ success: true, employee });
        }
    );
});

// Get employee list (for token transfers)
router.get('/list', requireAuth, (req, res) => {
    db.all(
        'SELECT id, fullName FROM employees WHERE id != ?',
        [req.session.user.id],
        (err, employees) => {
            if (err) {
                return res.status(500).json({ success: false, message: err.message });
            }
            res.json({ success: true, employees });
        }
    );
});

// Update employee profile
router.put('/profile', requireAuth, (req, res) => {
    const { fullName, phone, department } = req.body;
    const allowedFields = ['fullName', 'phone', 'department'];
    const updates = {};
    const values = [];

    // Only allow updating specific fields
    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            updates[field] = req.body[field];
            values.push(req.body[field]);
        }
    });

    if (Object.keys(updates).length === 0) {
        return res.status(400).json({
            success: false,
            message: 'No valid fields to update'
        });
    }

    values.push(req.session.user.id);

    const query = `
        UPDATE employees 
        SET ${Object.keys(updates).map(field => `${field} = ?`).join(', ')}
        WHERE id = ?
    `;

    db.run(query, values, function(err) {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
        res.json({
            success: true,
            message: 'Profile updated successfully'
        });
    });
});

// Update password
router.put('/password', requireAuth, async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({
            success: false,
            message: 'Current password and new password are required'
        });
    }

    try {
        // Verify current password
        const user = await db.get('SELECT password FROM employees WHERE id = ?', [req.session.user.id]);
        const isValidPassword = await bcrypt.compare(currentPassword, user.password);

        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // Update password
        await db.run('UPDATE employees SET password = ? WHERE id = ?', [hashedPassword, req.session.user.id]);

        res.json({
            success: true,
            message: 'Password updated successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Upload profile picture
router.post('/profile-picture', requireAuth, upload.single('profilePicture'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const filePath = `/uploads/profiles/${req.file.filename}`;
    db.run(
        'UPDATE employees SET profilePicture = ? WHERE id = ?',
        [filePath, req.session.user.id],
        function(err) {
            if (err) {
                return res.status(500).json({ success: false, message: err.message });
            }
            res.json({ 
                success: true, 
                filePath,
                message: 'Profile picture updated successfully'
            });
        }
    );
});

// Get expenditure logs
router.get('/expenditure', requireAuth, (req, res) => {
    const query = `SELECT * FROM expenditure_logs WHERE employeeId = ? ORDER BY date DESC`;
    db.all(query, [req.session.user.id], (err, logs) => {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
        res.json({ success: true, data: logs });
    });
});

// Get attendance logs
router.get('/attendance', requireAuth, (req, res) => {
    const query = `SELECT * FROM attendance_logs WHERE employeeId = ? ORDER BY timestamp DESC`;
    db.all(query, [req.session.user.id], (err, logs) => {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
        res.json({ success: true, data: logs });
    });
});

// Record attendance
router.post('/attendance', requireAuth, (req, res) => {
    const { type } = req.body;
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Check if already logged in/out today
    db.get(
        `SELECT * FROM attendance_logs 
         WHERE employeeId = ? 
         AND DATE(timestamp) = ? 
         AND type = ?`,
        [req.session.user.id, today, type],
        (err, existing) => {
            if (err) {
                return res.status(500).json({ success: false, message: err.message });
            }
            if (existing) {
                return res.status(400).json({
                    success: false,
                    message: `Already ${type === 'check-in' ? 'checked in' : 'checked out'} today`
                });
            }

            // Record attendance
            db.run(
                'INSERT INTO attendance_logs (employeeId, type, timestamp) VALUES (?, ?, ?)',
                [req.session.user.id, type, now.toISOString()],
                function(err) {
                    if (err) {
                        return res.status(500).json({ success: false, message: err.message });
                    }
                    res.json({
                        success: true,
                        message: `${type === 'check-in' ? 'Check-in' : 'Check-out'} recorded successfully`
                    });
                }
            );
        }
    );
});

// Get daily attendance
router.get('/attendance/daily', requireAuth, (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const query = `
        SELECT 
            type,
            timestamp,
            strftime('%H:%M', timestamp) as time
        FROM attendance_logs
        WHERE employeeId = ?
        AND DATE(timestamp) = ?
        ORDER BY timestamp ASC
    `;
    db.all(query, [req.session.user.id, today], (err, logs) => {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
        res.json({ success: true, data: logs });
    });
});

// Get attendance history
router.get('/attendance/history', requireAuth, (req, res) => {
    const { startDate, endDate } = req.query;
    const query = `
        SELECT 
            DATE(timestamp) as date,
            GROUP_CONCAT(
                type || ' at ' || strftime('%H:%M', timestamp)
                ORDER BY timestamp
            ) as activities
        FROM attendance_logs
        WHERE employeeId = ?
        AND DATE(timestamp) BETWEEN ? AND ?
        GROUP BY DATE(timestamp)
        ORDER BY date DESC
    `;
    db.all(query, [req.session.user.id, startDate, endDate], (err, history) => {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
        res.json({ success: true, data: history });
    });
});

// Get work hours
router.get('/work-hours', requireAuth, (req, res) => {
    const query = `SELECT * FROM work_hours WHERE employeeId = ? ORDER BY date DESC`;
    db.all(query, [req.session.user.id], (err, hours) => {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
        res.json({ success: true, data: hours });
    });
});

// Get performance records
router.get('/performance', requireAuth, (req, res) => {
    const query = `SELECT * FROM performance_records WHERE employeeId = ? ORDER BY date DESC`;
    db.all(query, [req.session.user.id], (err, records) => {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
        res.json({ success: true, data: records });
    });
});

// Get salary information
router.get('/salary', requireAuth, (req, res) => {
    const query = `SELECT * FROM salary_records WHERE employeeId = ? ORDER BY paymentDate DESC`;
    db.all(query, [req.session.user.id], (err, records) => {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
        res.json({ success: true, data: records });
    });
});

// Todo list operations
router.get('/todos', requireAuth, (req, res) => {
    const query = `SELECT * FROM todo_items WHERE employeeId = ? ORDER BY dueDate ASC`;
    db.all(query, [req.session.user.id], (err, todos) => {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
        res.json({ success: true, data: todos });
    });
});

router.post('/todos', requireAuth, (req, res) => {
    const { title, description, dueDate } = req.body;
    const query = `INSERT INTO todo_items (employeeId, title, description, dueDate, status) 
                  VALUES (?, ?, ?, ?, 'pending')`;
    db.run(query, [req.session.user.id, title, description, dueDate], function(err) {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
        res.json({ success: true, id: this.lastID, message: 'Todo added successfully' });
    });
});

router.put('/todos/:id', requireAuth, (req, res) => {
    const { title, description, dueDate, status } = req.body;
    const query = `UPDATE todo_items SET 
                  title = COALESCE(?, title),
                  description = COALESCE(?, description),
                  dueDate = COALESCE(?, dueDate),
                  status = COALESCE(?, status)
                  WHERE id = ? AND employeeId = ?`;
    db.run(query, [title, description, dueDate, status, req.params.id, req.session.user.id], function(err) {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
        res.json({ success: true, message: 'Todo updated successfully' });
    });
});

// Planner operations
router.get('/planner', requireAuth, (req, res) => {
    const query = `SELECT * FROM planner_events WHERE employeeId = ? ORDER BY startDate ASC`;
    db.all(query, [req.session.user.id], (err, events) => {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
        res.json({ success: true, data: events });
    });
});

router.post('/planner', requireAuth, (req, res) => {
    const { title, description, startDate, endDate } = req.body;
    const query = `INSERT INTO planner_events (employeeId, title, description, startDate, endDate) 
                  VALUES (?, ?, ?, ?, ?)`;
    db.run(query, [req.session.user.id, title, description, startDate, endDate], function(err) {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
        res.json({ success: true, id: this.lastID, message: 'Event added successfully' });
    });
});

// Company purchases
router.post('/purchases', requireAuth, (req, res) => {
    const { amount, type, description } = req.body;
    const query = `INSERT INTO company_purchases (employeeId, amount, type, description, status) 
                  VALUES (?, ?, ?, ?, 'pending')`;
    db.run(query, [req.session.user.id, amount, type, description], function(err) {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
        res.json({ success: true, id: this.lastID, message: 'Purchase request submitted' });
    });
});

// Document management
router.post('/documents', requireAuth, upload.single('document'), (req, res) => {
    const { description } = req.body;
    const fileUrl = `/uploads/documents/${req.file.filename}`;
    const query = `INSERT INTO documents (employeeId, fileName, fileUrl, fileType, description) 
                  VALUES (?, ?, ?, ?, ?)`;
    db.run(query, [
        req.session.user.id,
        req.file.originalname,
        fileUrl,
        req.file.mimetype,
        description
    ], function(err) {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
        res.json({ success: true, id: this.lastID, message: 'Document uploaded successfully' });
    });
});

// Messaging system
router.post('/messages', requireAuth, (req, res) => {
    const { receiverId, content } = req.body;
    const query = `INSERT INTO messages (senderId, receiverId, content, status) 
                  VALUES (?, ?, ?, 'unread')`;
    db.run(query, [req.session.user.id, receiverId, content], function(err) {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
        res.json({ success: true, id: this.lastID, message: 'Message sent successfully' });
    });
});

router.get('/messages', requireAuth, (req, res) => {
    const query = `SELECT m.*, e.fullName as senderName 
                  FROM messages m 
                  JOIN employees e ON m.senderId = e.id 
                  WHERE m.receiverId = ? 
                  ORDER BY m.timestamp DESC`;
    db.all(query, [req.session.user.id], (err, messages) => {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
        res.json({ success: true, data: messages });
    });
});

// Generate QR Code
router.get('/qr-code', requireAuth, async (req, res) => {
    try {
        const employeeData = {
            id: req.session.user.id,
            name: req.session.user.fullName,
            timestamp: new Date().toISOString()
        };
        
        const qrCode = await QRCode.toDataURL(JSON.stringify(employeeData));
        res.json({ success: true, qrCode });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get dashboard overview
router.get('/dashboard', requireAuth, (req, res) => {
    const userId = req.session.user.id;
    const today = new Date().toISOString().split('T')[0];

    // Get employee details
    db.get(
        `SELECT e.*, t.balance, t.prepaid_balance, t.postpaid_balance
         FROM employees e
         LEFT JOIN tokens t ON e.id = t.employee_id
         WHERE e.id = ?`,
        [userId],
        (err, employee) => {
            if (err) {
                return res.status(500).json({ success: false, message: err.message });
            }

            // Get today's attendance
            db.get(
                `SELECT 
                    COUNT(CASE WHEN type = 'check-in' THEN 1 END) as check_ins,
                    COUNT(CASE WHEN type = 'check-out' THEN 1 END) as check_outs
                FROM attendance_logs
                WHERE employeeId = ? AND DATE(timestamp) = ?`,
                [userId, today],
                (err, attendance) => {
                    if (err) {
                        return res.status(500).json({ success: false, message: err.message });
                    }

                    // Get recent transactions
                    db.all(
                        `SELECT t.*, 
                            s.fullName as sender_name,
                            r.fullName as receiver_name
                        FROM token_transactions t
                        LEFT JOIN employees s ON t.from_employee_id = s.id
                        LEFT JOIN employees r ON t.to_employee_id = r.id
                        WHERE t.from_employee_id = ? OR t.to_employee_id = ?
                        ORDER BY t.timestamp DESC
                        LIMIT 5`,
                        [userId, userId],
                        (err, recentTransactions) => {
                            if (err) {
                                return res.status(500).json({ success: false, message: err.message });
                            }

                            // Get pending tasks
                            db.all(
                                `SELECT * FROM todo_items
                                WHERE employeeId = ?
                                AND status = 'pending'
                                ORDER BY dueDate ASC
                                LIMIT 5`,
                                [userId],
                                (err, pendingTasks) => {
                                    if (err) {
                                        return res.status(500).json({ success: false, message: err.message });
                                    }

                                    // Get upcoming events
                                    db.all(
                                        `SELECT * FROM planner_events
                                        WHERE employeeId = ?
                                        AND startDate >= ?
                                        ORDER BY startDate ASC
                                        LIMIT 5`,
                                        [userId, today],
                                        (err, upcomingEvents) => {
                                            if (err) {
                                                return res.status(500).json({ success: false, message: err.message });
                                            }

                                            res.json({
                                                success: true,
                                                data: {
                                                    employee: {
                                                        id: employee.id,
                                                        fullName: employee.fullName,
                                                        department: employee.department,
                                                        profilePicture: employee.profilePicture
                                                    },
                                                    tokens: {
                                                        balance: employee.balance || 0,
                                                        prepaid: employee.prepaid_balance || 0,
                                                        postpaid: employee.postpaid_balance || 0
                                                    },
                                                    attendance: {
                                                        checkIns: attendance.check_ins || 0,
                                                        checkOuts: attendance.check_outs || 0
                                                    },
                                                    recentTransactions,
                                                    pendingTasks,
                                                    upcomingEvents
                                                }
                                            });
                                        }
                                    );
                                }
                            );
                        }
                    );
                }
            );
        }
    );
});

module.exports = router; 