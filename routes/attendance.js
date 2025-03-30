const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const db = require('../db');

// Record workday
router.post('/workday', requireAuth, (req, res) => {
    const { date, status, hours_worked, notes } = req.body;
    
    if (!date || !status) {
        return res.status(400).json({
            success: false,
            message: 'Date and status are required'
        });
    }

    db.run(
        `INSERT INTO workdays (employee_id, date, status, hours_worked, notes)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(employee_id, date) 
         DO UPDATE SET status = ?, hours_worked = ?, notes = ?`,
        [req.session.user.id, date, status, hours_worked, notes, status, hours_worked, notes],
        function(err) {
            if (err) {
                return res.status(500).json({ success: false, message: err.message });
            }
            res.json({
                success: true,
                message: 'Workday recorded successfully'
            });
        }
    );
});

// Get workdays for a date range
router.get('/workdays', requireAuth, (req, res) => {
    const { start_date, end_date } = req.query;
    
    if (!start_date || !end_date) {
        return res.status(400).json({
            success: false,
            message: 'Start date and end date are required'
        });
    }

    db.all(
        `SELECT * FROM workdays 
         WHERE employee_id = ? 
         AND date BETWEEN ? AND ?
         ORDER BY date DESC`,
        [req.session.user.id, start_date, end_date],
        (err, workdays) => {
            if (err) {
                return res.status(500).json({ success: false, message: err.message });
            }
            res.json({ success: true, data: workdays });
        }
    );
});

// Request leave
router.post('/leave', requireAuth, (req, res) => {
    const { start_date, end_date, leave_type, reason } = req.body;
    
    if (!start_date || !end_date || !leave_type) {
        return res.status(400).json({
            success: false,
            message: 'Start date, end date, and leave type are required'
        });
    }

    db.run(
        `INSERT INTO leave_requests (employee_id, start_date, end_date, leave_type, reason)
         VALUES (?, ?, ?, ?, ?)`,
        [req.session.user.id, start_date, end_date, leave_type, reason],
        function(err) {
            if (err) {
                return res.status(500).json({ success: false, message: err.message });
            }
            res.json({
                success: true,
                message: 'Leave request submitted successfully'
            });
        }
    );
});

// Get leave requests
router.get('/leave', requireAuth, (req, res) => {
    const query = req.session.user.isAdmin
        ? `SELECT l.*, e.fullName as employee_name, a.fullName as approver_name
           FROM leave_requests l
           JOIN employees e ON l.employee_id = e.id
           LEFT JOIN employees a ON l.approved_by = a.id
           ORDER BY l.created_at DESC`
        : `SELECT l.*, e.fullName as employee_name, a.fullName as approver_name
           FROM leave_requests l
           JOIN employees e ON l.employee_id = e.id
           LEFT JOIN employees a ON l.approved_by = a.id
           WHERE l.employee_id = ?
           ORDER BY l.created_at DESC`;

    const params = req.session.user.isAdmin ? [] : [req.session.user.id];

    db.all(query, params, (err, leaves) => {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
        res.json({ success: true, data: leaves });
    });
});

// Approve/reject leave request (admin only)
router.put('/leave/:id', requireAuth, requireAdmin, (req, res) => {
    const { status } = req.body;
    
    if (!status || !['approved', 'rejected'].includes(status)) {
        return res.status(400).json({
            success: false,
            message: 'Valid status is required'
        });
    }

    db.run(
        `UPDATE leave_requests 
         SET status = ?, approved_by = ?
         WHERE id = ?`,
        [status, req.session.user.id, req.params.id],
        function(err) {
            if (err) {
                return res.status(500).json({ success: false, message: err.message });
            }
            res.json({
                success: true,
                message: `Leave request ${status} successfully`
            });
        }
    );
});

// Record absence
router.post('/absence', requireAuth, (req, res) => {
    const { date, absence_type, reason } = req.body;
    
    if (!date || !absence_type) {
        return res.status(400).json({
            success: false,
            message: 'Date and absence type are required'
        });
    }

    db.run(
        `INSERT INTO absences (employee_id, date, absence_type, reason)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(employee_id, date) 
         DO UPDATE SET absence_type = ?, reason = ?`,
        [req.session.user.id, date, absence_type, reason, absence_type, reason],
        function(err) {
            if (err) {
                return res.status(500).json({ success: false, message: err.message });
            }
            res.json({
                success: true,
                message: 'Absence recorded successfully'
            });
        }
    );
});

// Get absences
router.get('/absence', requireAuth, (req, res) => {
    const query = req.session.user.isAdmin
        ? `SELECT a.*, e.fullName as employee_name, app.fullName as approver_name
           FROM absences a
           JOIN employees e ON a.employee_id = e.id
           LEFT JOIN employees app ON a.approved_by = app.id
           ORDER BY a.date DESC`
        : `SELECT a.*, e.fullName as employee_name, app.fullName as approver_name
           FROM absences a
           JOIN employees e ON a.employee_id = e.id
           LEFT JOIN employees app ON a.approved_by = app.id
           WHERE a.employee_id = ?
           ORDER BY a.date DESC`;

    const params = req.session.user.isAdmin ? [] : [req.session.user.id];

    db.all(query, params, (err, absences) => {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
        res.json({ success: true, data: absences });
    });
});

// Approve/reject absence (admin only)
router.put('/absence/:id', requireAuth, requireAdmin, (req, res) => {
    const { status } = req.body;
    
    if (!status || !['approved', 'rejected'].includes(status)) {
        return res.status(400).json({
            success: false,
            message: 'Valid status is required'
        });
    }

    db.run(
        `UPDATE absences 
         SET status = ?, approved_by = ?
         WHERE id = ?`,
        [status, req.session.user.id, req.params.id],
        function(err) {
            if (err) {
                return res.status(500).json({ success: false, message: err.message });
            }
            res.json({
                success: true,
                message: `Absence ${status} successfully`
            });
        }
    );
});

// Get attendance summary
router.get('/summary', requireAuth, (req, res) => {
    const { start_date, end_date } = req.query;
    
    if (!start_date || !end_date) {
        return res.status(400).json({
            success: false,
            message: 'Start date and end date are required'
        });
    }

    const query = `
        SELECT 
            COUNT(CASE WHEN status = 'present' THEN 1 END) as present_days,
            COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent_days,
            COUNT(CASE WHEN status = 'half_day' THEN 1 END) as half_days,
            SUM(hours_worked) as total_hours
        FROM workdays
        WHERE employee_id = ?
        AND date BETWEEN ? AND ?
    `;

    db.get(query, [req.session.user.id, start_date, end_date], (err, summary) => {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
        res.json({ success: true, data: summary });
    });
});

module.exports = router; 