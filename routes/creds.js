const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const db = require('../config/database');

// Get employee's cred balance and transaction history
router.get('/balance', authenticateToken, async (req, res) => {
    try {
        const balance = await db.getAsync(
            'SELECT balance FROM cred_transactions WHERE employeeId = ? ORDER BY createdAt DESC LIMIT 1',
            [req.user.id]
        );
        
        const transactions = await db.allAsync(
            `SELECT * FROM cred_transactions 
             WHERE employeeId = ? 
             ORDER BY createdAt DESC 
             LIMIT 10`,
            [req.user.id]
        );

        res.json({
            balance: balance ? balance.balance : 0,
            transactions
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch cred balance' });
    }
});

// Get employee's attendance and work hours
router.get('/attendance', authenticateToken, async (req, res) => {
    try {
        const attendance = await db.allAsync(
            `SELECT * FROM attendance 
             WHERE employeeId = ? 
             ORDER BY date DESC 
             LIMIT 30`,
            [req.user.id]
        );

        const workHours = await db.allAsync(
            `SELECT * FROM work_hours 
             WHERE employeeId = ? 
             ORDER BY date DESC 
             LIMIT 30`,
            [req.user.id]
        );

        res.json({ attendance, workHours });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch attendance data' });
    }
});

// Get employee's daily salary and performance bonuses
router.get('/salary', authenticateToken, async (req, res) => {
    try {
        const dailySalary = await db.allAsync(
            `SELECT * FROM daily_salary 
             WHERE employeeId = ? 
             ORDER BY date DESC 
             LIMIT 30`,
            [req.user.id]
        );

        const performanceTasks = await db.allAsync(
            `SELECT * FROM performance_tasks 
             WHERE employeeId = ? 
             ORDER BY dueDate DESC 
             LIMIT 10`,
            [req.user.id]
        );

        res.json({ dailySalary, performanceTasks });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch salary data' });
    }
});

// Buy creds from salary
router.post('/buy-from-salary', authenticateToken, async (req, res) => {
    const { amount } = req.body;
    try {
        // Get current daily salary
        const dailySalary = await db.getAsync(
            `SELECT netAmount FROM daily_salary 
             WHERE employeeId = ? 
             ORDER BY date DESC LIMIT 1`,
            [req.user.id]
        );

        if (!dailySalary || dailySalary.netAmount < amount) {
            return res.status(400).json({ error: 'Insufficient salary balance' });
        }

        // Start transaction
        await db.runAsync('BEGIN TRANSACTION');

        // Deduct from daily salary
        await db.runAsync(
            `UPDATE daily_salary 
             SET netAmount = netAmount - ? 
             WHERE employeeId = ? 
             AND date = CURRENT_DATE`,
            [amount, req.user.id]
        );

        // Add creds
        const currentBalance = await db.getAsync(
            'SELECT balance FROM cred_transactions WHERE employeeId = ? ORDER BY createdAt DESC LIMIT 1',
            [req.user.id]
        );

        const newBalance = (currentBalance ? currentBalance.balance : 0) + amount;

        await db.runAsync(
            `INSERT INTO cred_transactions (employeeId, type, amount, balance, description)
             VALUES (?, 'buy', ?, ?, 'Bought creds from salary')`,
            [req.user.id, amount, newBalance]
        );

        await db.runAsync('COMMIT');
        res.json({ message: 'Creds purchased successfully' });
    } catch (error) {
        await db.runAsync('ROLLBACK');
        res.status(500).json({ error: 'Failed to purchase creds' });
    }
});

// List creds for sale in marketplace
router.get('/marketplace', authenticateToken, async (req, res) => {
    try {
        const listings = await db.allAsync(
            `SELECT m.*, e.fullName as sellerName 
             FROM cred_marketplace m
             JOIN employees e ON m.sellerId = e.id
             WHERE m.status = 'active'
             ORDER BY m.createdAt DESC`
        );
        res.json(listings);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch marketplace listings' });
    }
});

// Sell creds in marketplace
router.post('/sell', authenticateToken, async (req, res) => {
    const { amount, pricePerCred } = req.body;
    try {
        // Check cred balance
        const currentBalance = await db.getAsync(
            'SELECT balance FROM cred_transactions WHERE employeeId = ? ORDER BY createdAt DESC LIMIT 1',
            [req.user.id]
        );

        if (!currentBalance || currentBalance.balance < amount) {
            return res.status(400).json({ error: 'Insufficient cred balance' });
        }

        // Create marketplace listing
        await db.runAsync(
            `INSERT INTO cred_marketplace (sellerId, amount, pricePerCred, status)
             VALUES (?, ?, ?, 'active')`,
            [req.user.id, amount, pricePerCred]
        );

        res.json({ message: 'Creds listed for sale successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to list creds for sale' });
    }
});

// Buy creds from marketplace
router.post('/buy-from-marketplace', authenticateToken, async (req, res) => {
    const { listingId } = req.body;
    try {
        // Get listing details
        const listing = await db.getAsync(
            'SELECT * FROM cred_marketplace WHERE id = ? AND status = "active"',
            [listingId]
        );

        if (!listing) {
            return res.status(404).json({ error: 'Listing not found or no longer active' });
        }

        if (listing.sellerId === req.user.id) {
            return res.status(400).json({ error: 'Cannot buy your own listing' });
        }

        // Start transaction
        await db.runAsync('BEGIN TRANSACTION');

        // Update listing status
        await db.runAsync(
            'UPDATE cred_marketplace SET status = "sold" WHERE id = ?',
            [listingId]
        );

        // Transfer creds
        const sellerBalance = await db.getAsync(
            'SELECT balance FROM cred_transactions WHERE employeeId = ? ORDER BY createdAt DESC LIMIT 1',
            [listing.sellerId]
        );

        const buyerBalance = await db.getAsync(
            'SELECT balance FROM cred_transactions WHERE employeeId = ? ORDER BY createdAt DESC LIMIT 1',
            [req.user.id]
        );

        // Update seller's balance
        await db.runAsync(
            `INSERT INTO cred_transactions (employeeId, type, amount, balance, description)
             VALUES (?, 'sell', ?, ?, 'Sold creds in marketplace')`,
            [listing.sellerId, -listing.amount, sellerBalance.balance - listing.amount]
        );

        // Update buyer's balance
        await db.runAsync(
            `INSERT INTO cred_transactions (employeeId, type, amount, balance, description)
             VALUES (?, 'buy', ?, ?, 'Bought creds from marketplace')`,
            [req.user.id, listing.amount, buyerBalance.balance + listing.amount]
        );

        await db.runAsync('COMMIT');
        res.json({ message: 'Creds purchased from marketplace successfully' });
    } catch (error) {
        await db.runAsync('ROLLBACK');
        res.status(500).json({ error: 'Failed to purchase creds from marketplace' });
    }
});

module.exports = router; 