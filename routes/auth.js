const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

// Login route
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    console.log('Login attempt:', { email }); // Debug log

    if (!email || !password) {
        console.log('Missing email or password');
        return res.status(400).json({
            success: false,
            message: 'Email and password are required'
        });
    }

    try {
        console.log('Querying database for user...'); // Debug log
        const user = await db.getAsync('SELECT * FROM employees WHERE email = ?', [email]);
        console.log('Database response:', user); // Debug log

        if (!user) {
            console.log('User not found');
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        console.log('Comparing passwords...'); // Debug log
        const isValidPassword = await bcrypt.compare(password, user.password);
        console.log('Password comparison result:', isValidPassword); // Debug log

        if (!isValidPassword) {
            console.log('Invalid password');
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Generate JWT token
        console.log('Generating JWT token...'); // Debug log
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                isAdmin: user.isAdmin
            },
            process.env.JWT_SECRET || 'your-secret-key-here', // Fallback secret key
            { expiresIn: '24h' }
        );

        console.log('Login successful'); // Debug log
        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                isAdmin: user.isAdmin,
                department: user.department,
                profilePicture: user.profilePicture
            }
        });
    } catch (error) {
        console.error('Login error:', error); // Detailed error log
        res.status(500).json({
            success: false,
            message: 'An error occurred during login'
        });
    }
});

// Register route
router.post('/register', async (req, res) => {
    const { fullName, email, password, department, isAdmin, adminCode } = req.body;

    if (!fullName || !email || !password) {
        return res.status(400).json({
            success: false,
            message: 'Name, email and password are required'
        });
    }

    if (isAdmin) {
        const validAdminCode = process.env.ADMIN_CODE || 'ADMIN123';
        if (adminCode !== validAdminCode) {
            return res.status(401).json({
                success: false,
                message: 'Invalid admin code'
            });
        }
    }

    try {
        const existingUser = await db.getAsync('SELECT id FROM employees WHERE email = ?', [email]);
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Email already exists'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const result = await db.runAsync(
            `INSERT INTO employees (email, password, fullName, department, isAdmin)
             VALUES (?, ?, ?, ?, ?)`,
            [email, hashedPassword, fullName, department, isAdmin ? 1 : 0]
        );

        res.json({
            success: true,
            message: 'Registration successful'
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred during registration'
        });
    }
});

// Get user info route
router.get('/user', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'No token provided'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await db.getAsync(
            'SELECT id, email, fullName, department, isAdmin, profilePicture FROM employees WHERE id = ?',
            [decoded.id]
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            user
        });
    } catch (error) {
        console.error('Get user info error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while fetching user info'
        });
    }
});

module.exports = router; 