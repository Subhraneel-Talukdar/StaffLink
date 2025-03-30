const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const db = require('../db');

// Token exchange rate (example: 1 AVAX = 100 company tokens)
const EXCHANGE_RATE = 100;

// Get token balance
router.get('/balance', requireAuth, async (req, res) => {
    try {
        const balance = await db.getAsync(
            'SELECT balance FROM tokens WHERE employee_id = ?',
            [req.session.user.id]
        );
        res.json({
            success: true,
            data: { balance: balance ? balance.balance : 0 }
        });
    } catch (error) {
        console.error('Error fetching balance:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching token balance'
        });
    }
});

// Distribute tokens based on salary (automated)
router.post('/distribute', requireAdmin, (req, res) => {
    db.all(
        `SELECT e.id, e.salary, t.balance 
        FROM employees e 
        LEFT JOIN tokens t ON e.id = t.employee_id`,
        [],
        async (err, employees) => {
            if (err) {
                return res.status(500).json({ success: false, message: err.message });
            }

            try {
                const distributions = [];
                for (const emp of employees) {
                    if (!emp.salary) continue;

                    // Calculate tokens based on salary (1% of salary in tokens)
                    const tokenAmount = (emp.salary * 0.01) * EXCHANGE_RATE;
                    
                    await new Promise((resolve, reject) => {
                        db.run(`
                            INSERT INTO tokens (employee_id, balance, last_distribution)
                            VALUES (?, ?, DATETIME('now'))
                            ON CONFLICT(employee_id) 
                            DO UPDATE SET 
                                balance = balance + ?,
                                last_distribution = DATETIME('now')
                        `, [emp.id, tokenAmount, tokenAmount], (err) => {
                            if (err) reject(err);
                            else resolve();
                        });
                    });

                    await new Promise((resolve, reject) => {
                        db.run(`
                            INSERT INTO token_transactions 
                            (from_employee_id, to_employee_id, amount, type)
                            VALUES (NULL, ?, ?, 'distribution')
                        `, [emp.id, tokenAmount], (err) => {
                            if (err) reject(err);
                            else resolve();
                        });
                    });

                    distributions.push({ employee_id: emp.id, amount: tokenAmount });
                }

                res.json({ success: true, distributions });
            } catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        }
    );
});

// Transfer tokens between employees
router.post('/transfer', requireAuth, (req, res) => {
    const { recipient_id, amount } = req.body;
    
    if (!recipient_id || !amount || amount <= 0) {
        return res.status(400).json({ 
            success: false, 
            message: 'Invalid recipient or amount' 
        });
    }

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        db.get(
            'SELECT balance FROM tokens WHERE employee_id = ?',
            [req.session.user.id],
            (err, sender) => {
                if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ success: false, message: err.message });
                }

                if (!sender || sender.balance < amount) {
                    db.run('ROLLBACK');
                    return res.status(400).json({ success: false, message: 'Insufficient balance' });
                }

                db.run(
                    'UPDATE tokens SET balance = balance - ? WHERE employee_id = ?',
                    [amount, req.session.user.id],
                    (err) => {
                        if (err) {
                            db.run('ROLLBACK');
                            return res.status(500).json({ success: false, message: err.message });
                        }

                        db.run(`
                            INSERT INTO tokens (employee_id, balance)
                            VALUES (?, ?)
                            ON CONFLICT(employee_id) 
                            DO UPDATE SET balance = balance + ?
                        `, [recipient_id, amount, amount], (err) => {
                            if (err) {
                                db.run('ROLLBACK');
                                return res.status(500).json({ success: false, message: err.message });
                            }

                            db.run(`
                                INSERT INTO token_transactions 
                                (from_employee_id, to_employee_id, amount, type)
                                VALUES (?, ?, ?, 'transfer')
                            `, [req.session.user.id, recipient_id, amount], (err) => {
                                if (err) {
                                    db.run('ROLLBACK');
                                    return res.status(500).json({ success: false, message: err.message });
                                }

                                db.run('COMMIT');
                                res.json({ success: true, message: 'Transfer successful' });
                            });
                        });
                    }
                );
            }
        );
    });
});

// Set up prepaid deduction
router.post('/prepaid', requireAuth, (req, res) => {
    const { amount } = req.body;
    
    if (!amount || amount <= 0) {
        return res.status(400).json({ 
            success: false, 
            message: 'Invalid amount' 
        });
    }

    db.get(
        'SELECT salary FROM employees WHERE id = ?',
        [req.session.user.id],
        (err, employee) => {
            if (err) {
                return res.status(500).json({ success: false, message: err.message });
            }

            // Maximum prepaid amount is 20% of salary
            const maxPrepaid = employee.salary * 0.2;
            
            if (amount > maxPrepaid) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Amount exceeds maximum prepaid limit' 
                });
            }

            db.run(`
                UPDATE tokens 
                SET prepaid_balance = prepaid_balance + ?
                WHERE employee_id = ?
            `, [amount, req.session.user.id], (err) => {
                if (err) {
                    return res.status(500).json({ success: false, message: err.message });
                }

                db.run(`
                    INSERT INTO token_transactions 
                    (from_employee_id, to_employee_id, amount, type)
                    VALUES (?, ?, ?, 'prepaid')
                `, [req.session.user.id, req.session.user.id, amount], (err) => {
                    if (err) {
                        return res.status(500).json({ success: false, message: err.message });
                    }

                    res.json({ success: true, message: 'Prepaid setup successful' });
                });
            });
        }
    );
});

// Purchase with tokens
router.post('/purchase', requireAuth, (req, res) => {
    const { amount, payment_type } = req.body; // payment_type: 'prepaid' or 'postpaid'
    
    if (!amount || amount <= 0 || !payment_type) {
        return res.status(400).json({ 
            success: false, 
            message: 'Invalid amount or payment type' 
        });
    }

    db.get(
        'SELECT * FROM tokens WHERE employee_id = ?',
        [req.session.user.id],
        (err, tokens) => {
            if (err) {
                return res.status(500).json({ success: false, message: err.message });
            }

            if (!tokens) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'No token account found' 
                });
            }

            if (payment_type === 'prepaid') {
                if (tokens.prepaid_balance < amount) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Insufficient prepaid balance' 
                    });
                }

                db.run(`
                    UPDATE tokens 
                    SET prepaid_balance = prepaid_balance - ?
                    WHERE employee_id = ?
                `, [amount, req.session.user.id], (err) => {
                    if (err) {
                        return res.status(500).json({ success: false, message: err.message });
                    }

                    db.run(`
                        INSERT INTO token_transactions 
                        (from_employee_id, to_employee_id, amount, type)
                        VALUES (?, NULL, ?, 'purchase')
                    `, [req.session.user.id, amount], (err) => {
                        if (err) {
                            return res.status(500).json({ success: false, message: err.message });
                        }

                        res.json({ success: true, message: 'Purchase successful' });
                    });
                });
            } else {
                if (tokens.balance < amount) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Insufficient balance' 
                    });
                }

                db.run(`
                    UPDATE tokens 
                    SET postpaid_balance = postpaid_balance + ?
                    WHERE employee_id = ?
                `, [amount, req.session.user.id], (err) => {
                    if (err) {
                        return res.status(500).json({ success: false, message: err.message });
                    }

                    db.run(`
                        INSERT INTO token_transactions 
                        (from_employee_id, to_employee_id, amount, type)
                        VALUES (?, NULL, ?, 'purchase')
                    `, [req.session.user.id, amount], (err) => {
                        if (err) {
                            return res.status(500).json({ success: false, message: err.message });
                        }

                        res.json({ success: true, message: 'Purchase successful' });
                    });
                });
            }
        }
    );
});

// Get token statistics (admin only)
router.get('/stats', requireAdmin, (req, res) => {
    db.all(`
        SELECT 
            e.fullName,
            t.balance,
            t.prepaid_balance,
            t.postpaid_balance,
            t.last_distribution,
            e.salary
        FROM tokens t
        JOIN employees e ON t.employee_id = e.id
        ORDER BY t.balance DESC
    `, [], (err, stats) => {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
        res.json({ success: true, data: stats });
    });
});

// Get transaction history
router.get('/transactions', requireAuth, (req, res) => {
    const query = `
        SELECT 
            t.*,
            s.fullName as sender_name,
            r.fullName as receiver_name
        FROM token_transactions t
        LEFT JOIN employees s ON t.from_employee_id = s.id
        LEFT JOIN employees r ON t.to_employee_id = r.id
        WHERE t.from_employee_id = ? OR t.to_employee_id = ?
        ORDER BY t.timestamp DESC
    `;
    db.all(query, [req.session.user.id, req.session.user.id], (err, transactions) => {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
        res.json({ success: true, data: transactions });
    });
});

// Get company token statistics (admin only)
router.get('/company-stats', requireAuth, requireAdmin, (req, res) => {
    const query = `
        SELECT 
            SUM(balance) as total_balance,
            SUM(prepaid_balance) as total_prepaid,
            SUM(postpaid_balance) as total_postpaid,
            COUNT(*) as total_employees
        FROM tokens
    `;
    db.get(query, [], (err, stats) => {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
        res.json({ success: true, data: stats });
    });
});

// Set token exchange rate (admin only)
router.post('/exchange-rate', requireAuth, requireAdmin, (req, res) => {
    const { from_token, to_token, rate } = req.body;
    
    if (!from_token || !to_token || !rate || rate <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Invalid exchange rate parameters'
        });
    }

    db.run(
        `INSERT INTO token_exchange_rates (from_token, to_token, rate)
         VALUES (?, ?, ?)
         ON CONFLICT(from_token, to_token) 
         DO UPDATE SET rate = ?, last_updated = CURRENT_TIMESTAMP`,
        [from_token, to_token, rate, rate],
        function(err) {
            if (err) {
                return res.status(500).json({ success: false, message: err.message });
            }
            res.json({
                success: true,
                message: 'Exchange rate updated successfully'
            });
        }
    );
});

// Get token exchange rates
router.get('/exchange-rates', requireAuth, (req, res) => {
    db.all(
        'SELECT * FROM token_exchange_rates ORDER BY from_token, to_token',
        [],
        (err, rates) => {
            if (err) {
                return res.status(500).json({ success: false, message: err.message });
            }
            res.json({ success: true, data: rates });
        }
    );
});

// Exchange tokens
router.post('/exchange', requireAuth, (req, res) => {
    const { from_token, to_token, amount } = req.body;
    
    if (!from_token || !to_token || !amount || amount <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Invalid exchange parameters'
        });
    }

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // Get exchange rate
        db.get(
            'SELECT rate FROM token_exchange_rates WHERE from_token = ? AND to_token = ?',
            [from_token, to_token],
            (err, rate) => {
                if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ success: false, message: err.message });
                }

                if (!rate) {
                    db.run('ROLLBACK');
                    return res.status(400).json({
                        success: false,
                        message: 'Exchange rate not found'
                    });
                }

                const to_amount = amount * rate.rate;

                // Check if user has enough tokens
                db.get(
                    `SELECT balance FROM tokens WHERE employee_id = ? AND token_type = ?`,
                    [req.session.user.id, from_token],
                    (err, balance) => {
                        if (err) {
                            db.run('ROLLBACK');
                            return res.status(500).json({ success: false, message: err.message });
                        }

                        if (!balance || balance.balance < amount) {
                            db.run('ROLLBACK');
                            return res.status(400).json({
                                success: false,
                                message: 'Insufficient balance'
                            });
                        }

                        // Deduct from source token
                        db.run(
                            `UPDATE tokens 
                             SET balance = balance - ?
                             WHERE employee_id = ? AND token_type = ?`,
                            [amount, req.session.user.id, from_token],
                            (err) => {
                                if (err) {
                                    db.run('ROLLBACK');
                                    return res.status(500).json({ success: false, message: err.message });
                                }

                                // Add to target token
                                db.run(
                                    `INSERT INTO tokens (employee_id, token_type, balance)
                                     VALUES (?, ?, ?)
                                     ON CONFLICT(employee_id, token_type) 
                                     DO UPDATE SET balance = balance + ?`,
                                    [req.session.user.id, to_token, to_amount, to_amount],
                                    (err) => {
                                        if (err) {
                                            db.run('ROLLBACK');
                                            return res.status(500).json({ success: false, message: err.message });
                                        }

                                        // Record exchange transaction
                                        db.run(
                                            `INSERT INTO token_exchanges 
                                             (employee_id, from_token, to_token, from_amount, to_amount, rate_used)
                                             VALUES (?, ?, ?, ?, ?, ?)`,
                                            [req.session.user.id, from_token, to_token, amount, to_amount, rate.rate],
                                            (err) => {
                                                if (err) {
                                                    db.run('ROLLBACK');
                                                    return res.status(500).json({ success: false, message: err.message });
                                                }

                                                db.run('COMMIT');
                                                res.json({
                                                    success: true,
                                                    message: 'Token exchange successful',
                                                    data: {
                                                        from_amount: amount,
                                                        to_amount: to_amount,
                                                        rate: rate.rate
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
});

// Get exchange history
router.get('/exchange-history', requireAuth, (req, res) => {
    db.all(
        `SELECT * FROM token_exchanges 
         WHERE employee_id = ?
         ORDER BY timestamp DESC`,
        [req.session.user.id],
        (err, history) => {
            if (err) {
                return res.status(500).json({ success: false, message: err.message });
            }
            res.json({ success: true, data: history });
        }
    );
});

// Request tokens from another employee
router.post('/request', requireAuth, async (req, res) => {
    const { toEmail, amount, reason } = req.body;

    if (!toEmail || !amount || amount <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Valid email and amount are required'
        });
    }

    try {
        // Get recipient's details
        const recipient = await db.getAsync(
            'SELECT id, email FROM employees WHERE email = ?',
            [toEmail]
        );

        if (!recipient) {
            return res.status(404).json({
                success: false,
                message: 'Recipient not found'
            });
        }

        // Create token request
        await db.runAsync(
            `INSERT INTO token_requests 
             (from_employee_id, to_employee_id, amount, reason, status)
             VALUES (?, ?, ?, ?, 'pending')`,
            [req.session.user.id, recipient.id, amount, reason]
        );

        res.json({
            success: true,
            message: 'Token request sent successfully'
        });
    } catch (error) {
        console.error('Error requesting tokens:', error);
        res.status(500).json({
            success: false,
            message: 'Error sending token request'
        });
    }
});

// Send tokens to another employee
router.post('/send', requireAuth, async (req, res) => {
    const { toEmail, amount, message } = req.body;

    if (!toEmail || !amount || amount <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Valid email and amount are required'
        });
    }

    try {
        // Get sender's balance
        const senderBalance = await db.getAsync(
            'SELECT balance FROM tokens WHERE employee_id = ?',
            [req.session.user.id]
        );

        if (!senderBalance || senderBalance.balance < amount) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient token balance'
            });
        }

        // Get recipient's details
        const recipient = await db.getAsync(
            'SELECT id FROM employees WHERE email = ?',
            [toEmail]
        );

        if (!recipient) {
            return res.status(404).json({
                success: false,
                message: 'Recipient not found'
            });
        }

        // Start transaction
        await db.runAsync('BEGIN TRANSACTION');

        // Deduct from sender
        await db.runAsync(
            'UPDATE tokens SET balance = balance - ? WHERE employee_id = ?',
            [amount, req.session.user.id]
        );

        // Add to recipient
        await db.runAsync(
            `INSERT INTO tokens (employee_id, balance)
             VALUES (?, ?)
             ON CONFLICT(employee_id) 
             DO UPDATE SET balance = balance + ?`,
            [recipient.id, amount, amount]
        );

        // Record transaction
        await db.runAsync(
            `INSERT INTO token_transactions 
             (from_employee_id, to_employee_id, amount, message)
             VALUES (?, ?, ?, ?)`,
            [req.session.user.id, recipient.id, amount, message]
        );

        await db.runAsync('COMMIT');

        res.json({
            success: true,
            message: 'Tokens sent successfully'
        });
    } catch (error) {
        await db.runAsync('ROLLBACK');
        console.error('Error sending tokens:', error);
        res.status(500).json({
            success: false,
            message: 'Error sending tokens'
        });
    }
});

// Get token transaction history
router.get('/history', requireAuth, async (req, res) => {
    try {
        const transactions = await db.allAsync(
            `SELECT t.*, 
             e1.fullName as from_name, e1.email as from_email,
             e2.fullName as to_name, e2.email as to_email
             FROM token_transactions t
             JOIN employees e1 ON t.from_employee_id = e1.id
             JOIN employees e2 ON t.to_employee_id = e2.id
             WHERE t.from_employee_id = ? OR t.to_employee_id = ?
             ORDER BY t.created_at DESC`,
            [req.session.user.id, req.session.user.id]
        );
        res.json({ success: true, data: transactions });
    } catch (error) {
        console.error('Error fetching history:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching transaction history'
        });
    }
});

// Get pending token requests (for admin)
router.get('/requests', requireAuth, requireAdmin, async (req, res) => {
    try {
        const requests = await db.allAsync(
            `SELECT r.*, 
             e1.fullName as from_name, e1.email as from_email,
             e2.fullName as to_name, e2.email as to_email
             FROM token_requests r
             JOIN employees e1 ON r.from_employee_id = e1.id
             JOIN employees e2 ON r.to_employee_id = e2.id
             WHERE r.status = 'pending'
             ORDER BY r.created_at DESC`
        );
        res.json({ success: true, data: requests });
    } catch (error) {
        console.error('Error fetching requests:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching token requests'
        });
    }
});

module.exports = router; 