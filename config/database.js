const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');
const { promisify } = require('util');

// Database path
const dbPath = path.join(__dirname, '..', 'data', 'ems.db');

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to database:', err);
    } else {
        console.log('Connected to SQLite database at:', dbPath);
        initializeDatabase();
    }
});

// Promisify database methods
db.runAsync = promisify(db.run.bind(db));
db.getAsync = promisify(db.get.bind(db));
db.allAsync = promisify(db.all.bind(db));

// Initialize database tables
async function initializeDatabase() {
    try {
        console.log('Initializing database...');

        // Create employees table
        await db.runAsync(`
            CREATE TABLE IF NOT EXISTS employees (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                fullName TEXT NOT NULL,
                department TEXT,
                phone TEXT,
                salary REAL DEFAULT 0,
                isAdmin BOOLEAN DEFAULT 0,
                tokenBalance INTEGER DEFAULT 0,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create token_transactions table
        await db.runAsync(`
            CREATE TABLE IF NOT EXISTS token_transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                fromEmployeeId INTEGER,
                toEmployeeId INTEGER,
                amount INTEGER NOT NULL,
                type TEXT NOT NULL,
                status TEXT NOT NULL,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (fromEmployeeId) REFERENCES employees (id),
                FOREIGN KEY (toEmployeeId) REFERENCES employees (id)
            )
        `);

        // Create attendance table
        await db.runAsync(`
            CREATE TABLE IF NOT EXISTS attendance (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                employeeId INTEGER NOT NULL,
                date DATE NOT NULL,
                checkIn DATETIME,
                checkOut DATETIME,
                FOREIGN KEY (employeeId) REFERENCES employees (id)
            )
        `);

        // Check if admin exists
        const admin = await db.getAsync('SELECT * FROM employees WHERE email = ?', ['admin@example.com']);
        
        if (!admin) {
            console.log('Creating default admin account...');
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await db.runAsync(`
                INSERT INTO employees (email, password, fullName, isAdmin, department)
                VALUES (?, ?, ?, ?, ?)
            `, ['admin@example.com', hashedPassword, 'System Admin', 1, 'Administration']);
            console.log('Default admin account created');
        }

        console.log('Database initialization completed');
    } catch (error) {
        console.error('Database initialization error:', error);
    }
}

module.exports = db; 