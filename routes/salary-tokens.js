const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Middleware to verify JWT token
const requireAuth = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'No token provided'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
};

// Input validation middleware
const validateTokenAmount = (req, res, next) => {
    const { amount } = req.body;
    if (!amount || amount <= 0 || !Number.isInteger(Number(amount))) {
        return res.status(400).json({ error: 'Invalid token amount' });
    }
    next();
};

// Rate limiting middleware
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});

// Apply rate limiting to all routes
router.use(limiter);

// Get current token rate
router.get('/token-rate', authenticateToken, async (req, res) => {
    try {
        const rate = await db.get('SELECT rate FROM token_rates WHERE isActive = 1 ORDER BY effectiveDate DESC LIMIT 1');
        if (!rate) {
            return res.status(404).json({ error: 'Token rate not found' });
        }
        res.json({ rate: rate.rate });
    } catch (error) {
        console.error('Token rate error:', error);
        res.status(500).json({ error: 'Failed to fetch token rate' });
    }
});

// Get user's salary and token information
router.get('/user-info', authenticateToken, async (req, res) => {
    try {
        const user = await db.get(
            'SELECT id, fullName, salary, tokenBalance, tokenAllowance FROM users WHERE id = ?',
            [req.user.id]
        );

        // Get recent salary transactions
        const salaryTransactions = await db.all(
            `SELECT * FROM salary_transactions 
             WHERE userId = ? 
             ORDER BY transactionDate DESC 
             LIMIT 5`,
            [req.user.id]
        );

        // Get recent token transactions
        const tokenTransactions = await db.all(
            `SELECT t.*, 
                    u1.fullName as fromUserName, 
                    u2.fullName as toUserName
             FROM token_transactions t
             LEFT JOIN users u1 ON t.fromUserId = u1.id
             LEFT JOIN users u2 ON t.toUserId = u2.id
             WHERE t.fromUserId = ? OR t.toUserId = ?
             ORDER BY t.transactionDate DESC
             LIMIT 5`,
            [req.user.id, req.user.id]
        );

        res.json({
            user,
            salaryTransactions,
            tokenTransactions
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch user information' });
    }
});

// Buy tokens from company
router.post('/buy-tokens', authenticateToken, validateTokenAmount, async (req, res) => {
    const { amount } = req.body;
    try {
        // Get current token rate
        const rate = await db.get('SELECT rate FROM token_rates WHERE isActive = 1 ORDER BY effectiveDate DESC LIMIT 1');
        if (!rate) {
            return res.status(404).json({ error: 'Token rate not found' });
        }
        const tokenRate = rate.rate;
        const totalCost = amount * tokenRate;

        // Check if user has enough salary
        const user = await db.get('SELECT salary FROM users WHERE id = ?', [req.user.id]);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (user.salary < totalCost) {
            return res.status(400).json({ error: 'Insufficient salary balance' });
        }

        // Start transaction
        await db.run('BEGIN TRANSACTION');

        try {
            // Deduct salary
            await db.run(
                'UPDATE users SET salary = salary - ? WHERE id = ?',
                [totalCost, req.user.id]
            );

            // Add tokens
            await db.run(
                'UPDATE users SET tokenBalance = tokenBalance + ? WHERE id = ?',
                [amount, req.user.id]
            );

            // Record salary transaction
            await db.run(
                `INSERT INTO salary_transactions (userId, amount, type, description)
                 VALUES (?, ?, 'debit', 'Token purchase')`,
                [req.user.id, totalCost]
            );

            // Record token transaction
            await db.run(
                `INSERT INTO token_transactions (fromUserId, toUserId, amount, type, rate, status)
                 VALUES (NULL, ?, ?, 'buy', ?, 'completed')`,
                [req.user.id, amount, tokenRate]
            );

            await db.run('COMMIT');
            res.json({ message: 'Tokens purchased successfully' });
        } catch (error) {
            await db.run('ROLLBACK');
            throw error;
        }
    } catch (error) {
        console.error('Buy tokens error:', error);
        res.status(500).json({ error: 'Failed to purchase tokens' });
    }
});

// Sell tokens to company
router.post('/sell-tokens', authenticateToken, async (req, res) => {
    const { amount } = req.body;
    try {
        // Get current token rate
        const rate = await db.get('SELECT rate FROM token_rates WHERE isActive = 1 ORDER BY effectiveDate DESC LIMIT 1');
        const tokenRate = rate ? rate.rate : 10.00;
        const totalValue = amount * tokenRate;

        // Check if user has enough tokens
        const user = await db.get('SELECT tokenBalance FROM users WHERE id = ?', [req.user.id]);
        if (!user || user.tokenBalance < amount) {
            return res.status(400).json({ error: 'Insufficient token balance' });
        }

        // Start transaction
        await db.run('BEGIN TRANSACTION');

        // Deduct tokens
        await db.run(
            'UPDATE users SET tokenBalance = tokenBalance - ? WHERE id = ?',
            [amount, req.user.id]
        );

        // Add salary
        await db.run(
            'UPDATE users SET salary = salary + ? WHERE id = ?',
            [totalValue, req.user.id]
        );

        // Record salary transaction
        await db.run(
            `INSERT INTO salary_transactions (userId, amount, type, description)
             VALUES (?, ?, 'credit', 'Token sale')`,
            [req.user.id, totalValue]
        );

        // Record token transaction
        await db.run(
            `INSERT INTO token_transactions (fromUserId, toUserId, amount, type, rate, status)
             VALUES (?, NULL, ?, 'sell', ?, 'completed')`,
            [req.user.id, amount, tokenRate]
        );

        await db.run('COMMIT');
        res.json({ message: 'Tokens sold successfully' });
    } catch (error) {
        await db.run('ROLLBACK');
        res.status(500).json({ error: 'Failed to sell tokens' });
    }
});

// Transfer tokens to another employee
router.post('/transfer-tokens', authenticateToken, async (req, res) => {
    const { toUserId, amount } = req.body;
    try {
        // Check if user has enough tokens
        const user = await db.get('SELECT tokenBalance FROM users WHERE id = ?', [req.user.id]);
        if (!user || user.tokenBalance < amount) {
            return res.status(400).json({ error: 'Insufficient token balance' });
        }

        // Start transaction
        await db.run('BEGIN TRANSACTION');

        // Deduct tokens from sender
        await db.run(
            'UPDATE users SET tokenBalance = tokenBalance - ? WHERE id = ?',
            [amount, req.user.id]
        );

        // Add tokens to receiver
        await db.run(
            'UPDATE users SET tokenBalance = tokenBalance + ? WHERE id = ?',
            [amount, toUserId]
        );

        // Record token transaction
        await db.run(
            `INSERT INTO token_transactions (fromUserId, toUserId, amount, type, status)
             VALUES (?, ?, ?, 'transfer', 'completed')`,
            [req.user.id, toUserId, amount]
        );

        await db.run('COMMIT');
        res.json({ message: 'Tokens transferred successfully' });
    } catch (error) {
        await db.run('ROLLBACK');
        res.status(500).json({ error: 'Failed to transfer tokens' });
    }
});

// Get list of employees for token transfer
router.get('/employees', authenticateToken, async (req, res) => {
    try {
        const employees = await db.all(
            'SELECT id, fullName, department FROM users WHERE role = "employee" AND id != ?',
            [req.user.id]
        );
        res.json(employees);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch employees' });
    }
});

// Get user's token balance
router.get('/balance', requireAuth, async (req, res) => {
    try {
        const balance = await db.getAsync(
            'SELECT balance FROM salary_tokens WHERE employeeId = ?',
            [req.user.id]
        );

        res.json({
            success: true,
            balance: balance ? balance.balance : 0
        });
    } catch (error) {
        console.error('Get balance error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while fetching token balance'
        });
    }
});

// Get user's token transaction history
router.get('/transactions', requireAuth, async (req, res) => {
    try {
        const transactions = await db.allAsync(`
            SELECT t.*, 
                   e1.fullName as fromEmployeeName,
                   e2.fullName as toEmployeeName
            FROM token_transactions t
            JOIN employees e1 ON t.fromEmployeeId = e1.id
            JOIN employees e2 ON t.toEmployeeId = e2.id
            WHERE t.fromEmployeeId = ? OR t.toEmployeeId = ?
            ORDER BY t.createdAt DESC
        `, [req.user.id, req.user.id]);

        res.json({
            success: true,
            transactions
        });
    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while fetching transactions'
        });
    }
});

// Send tokens to another employee
router.post('/send', requireAuth, async (req, res) => {
    const { toEmployeeId, amount } = req.body;

    if (!toEmployeeId || !amount || amount <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Invalid token amount or recipient'
        });
    }

    if (toEmployeeId === req.user.id) {
        return res.status(400).json({
            success: false,
            message: 'Cannot send tokens to yourself'
        });
    }

    try {
        await db.runAsync('BEGIN TRANSACTION');

        // Check sender's balance
        const senderBalance = await db.getAsync(
            'SELECT balance FROM salary_tokens WHERE employeeId = ?',
            [req.user.id]
        );

        if (!senderBalance || senderBalance.balance < amount) {
            await db.runAsync('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'Insufficient token balance'
            });
        }

        // Update sender's balance
        await db.runAsync(
            'UPDATE salary_tokens SET balance = balance - ? WHERE employeeId = ?',
            [amount, req.user.id]
        );

        // Update or create recipient's balance
        await db.runAsync(
            `INSERT INTO salary_tokens (employeeId, amount, balance)
             VALUES (?, ?, ?)
             ON CONFLICT(employeeId) DO UPDATE SET
             balance = balance + ?`,
            [toEmployeeId, amount, amount, amount]
        );

        // Record the transaction
        await db.runAsync(
            `INSERT INTO token_transactions 
             (fromEmployeeId, toEmployeeId, amount, status)
             VALUES (?, ?, ?, ?)`,
            [req.user.id, toEmployeeId, amount, 'completed']
        );

        await db.runAsync('COMMIT');

        res.json({
            success: true,
            message: 'Tokens sent successfully'
        });
    } catch (error) {
        await db.runAsync('ROLLBACK');
        console.error('Send tokens error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while sending tokens'
        });
    }
});

// Request tokens from another employee
router.post('/request', requireAuth, async (req, res) => {
    const { fromEmployeeId, amount, message } = req.body;

    if (!fromEmployeeId || !amount || amount <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Invalid token amount or sender'
        });
    }

    if (fromEmployeeId === req.user.id) {
        return res.status(400).json({
            success: false,
            message: 'Cannot request tokens from yourself'
        });
    }

    try {
        await db.runAsync(
            `INSERT INTO token_transactions 
             (fromEmployeeId, toEmployeeId, amount, status, message)
             VALUES (?, ?, ?, ?, ?)`,
            [fromEmployeeId, req.user.id, amount, 'pending', message]
        );

        res.json({
            success: true,
            message: 'Token request sent successfully'
        });
    } catch (error) {
        console.error('Request tokens error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while requesting tokens'
        });
    }
});

// Respond to token request
router.post('/respond', requireAuth, async (req, res) => {
    const { transactionId, accept } = req.body;

    if (!transactionId) {
        return res.status(400).json({
            success: false,
            message: 'Transaction ID is required'
        });
    }

    try {
        const transaction = await db.getAsync(
            'SELECT * FROM token_transactions WHERE id = ? AND status = ?',
            [transactionId, 'pending']
        );

        if (!transaction) {
            return res.status(404).json({
                success: false,
                message: 'Transaction not found or already processed'
            });
        }

        if (transaction.fromEmployeeId !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to respond to this request'
            });
        }

        if (!accept) {
            await db.runAsync(
                'UPDATE token_transactions SET status = ? WHERE id = ?',
                ['rejected', transactionId]
            );

            return res.json({
                success: true,
                message: 'Token request rejected'
            });
        }

        await db.runAsync('BEGIN TRANSACTION');

        // Check sender's balance
        const senderBalance = await db.getAsync(
            'SELECT balance FROM salary_tokens WHERE employeeId = ?',
            [req.user.id]
        );

        if (!senderBalance || senderBalance.balance < transaction.amount) {
            await db.runAsync('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'Insufficient token balance'
            });
        }

        // Update sender's balance
        await db.runAsync(
            'UPDATE salary_tokens SET balance = balance - ? WHERE employeeId = ?',
            [transaction.amount, req.user.id]
        );

        // Update recipient's balance
        await db.runAsync(
            `INSERT INTO salary_tokens (employeeId, amount, balance)
             VALUES (?, ?, ?)
             ON CONFLICT(employeeId) DO UPDATE SET
             balance = balance + ?`,
            [transaction.toEmployeeId, transaction.amount, transaction.amount, transaction.amount]
        );

        // Update transaction status
        await db.runAsync(
            'UPDATE token_transactions SET status = ? WHERE id = ?',
            ['completed', transactionId]
        );

        await db.runAsync('COMMIT');

        res.json({
            success: true,
            message: 'Token request accepted'
        });
    } catch (error) {
        await db.runAsync('ROLLBACK');
        console.error('Respond to request error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while processing the request'
        });
    }
});

module.exports = router; 